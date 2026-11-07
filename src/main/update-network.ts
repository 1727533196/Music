import { net } from 'electron'
import { createHash } from 'node:crypto'
import { mkdir, open, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { UpdateRelease } from '../shared/update'

const DEFAULT_MIRRORS = ['https://gh-proxy.org/']
const CONNECT_TIMEOUT = 12000
const STALL_TIMEOUT = 15000
const PROGRESS_WINDOW = 30000
const MIN_PROGRESS = 1024 * 1024

export function httpsUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('更新地址必须使用 HTTPS')
  return url.href
}

function urlList(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined) return fallback
  const parsed: unknown = JSON.parse(value)
  if (
    !Array.isArray(parsed) ||
    parsed.length > 8 ||
    parsed.some((item) => typeof item !== 'string')
  )
    throw new Error('更新源配置必须是最多包含 8 个 HTTPS 地址的 JSON 数组')
  return [...new Set(parsed.map(httpsUrl))]
}

export function manifestSources(defaultUrl: string): string[] {
  // Only explicitly configured trusted feeds supply version numbers and hashes.
  if (process.env.MUSIC_UPDATE_URLS !== undefined)
    return urlList(process.env.MUSIC_UPDATE_URLS, [])
  return [httpsUrl(process.env.MUSIC_UPDATE_URL || defaultUrl)]
}

export interface DownloadSource {
  url: string
  label: string
}
export function downloadSources(release: UpdateRelease): DownloadSource[] {
  const mirrors = urlList(process.env.MUSIC_UPDATE_MIRRORS, DEFAULT_MIRRORS).map((value) => {
    const url = new URL(httpsUrl(value))
    if (url.search || url.hash) throw new Error('加速源前缀不能包含查询参数或片段')
    return url.href.endsWith('/') ? url.href : `${url.href}/`
  })
  const primary = httpsUrl(release.url)
  const wrappedBy = [...new Set([...mirrors, ...DEFAULT_MIRRORS])].find((prefix) =>
    primary.startsWith(`${prefix}https://github.com/`)
  )
  const origin = wrappedBy ? primary.slice(wrappedBy.length) : primary
  const isGitHub = new URL(origin).hostname === 'github.com'
  const sources: DownloadSource[] = []
  const add = (url: string, label: string) => {
    url = httpsUrl(url)
    if (!sources.some((source) => source.url === url)) sources.push({ url, label })
  }
  if (!isGitHub || wrappedBy) add(primary, wrappedBy ? '首选加速源' : '下载服务器')
  for (const [index, url] of (release.mirrors || []).entries()) add(url, `备用源 ${index + 1}`)
  if (isGitHub) {
    mirrors.forEach((prefix, index) => add(`${prefix}${origin}`, `加速源 ${index + 1}`))
    add(origin, 'GitHub 直连')
  }
  return sources
}

// Electron 31 does not expose manual redirects through fetch. Resolve the chain
// using ClientRequest, checking HTTPS at each hop, then stream the final resource.
export async function fetchUpdate(url: string, signal: AbortSignal) {
  const finalUrl = await new Promise<string>((resolve, reject) => {
    let current = httpsUrl(url)
    let redirects = 0
    const request = net.request({
      url: current,
      method: 'HEAD',
      redirect: 'manual',
      useSessionCookies: false,
      credentials: 'omit'
    })
    const abort = () => {
      signal.removeEventListener('abort', abort)
      reject(signal.reason || new Error('更新连接已取消或超时，请重试'))
      request.abort()
    }
    request.on('redirect', (_status, _method, destination) => {
      try {
        if (++redirects > 10) throw new Error('更新地址重定向次数过多')
        current = httpsUrl(destination)
        request.followRedirect()
      } catch (error) {
        request.abort()
        reject(error)
      }
    })
    request.once('response', () => {
      signal.removeEventListener('abort', abort)
      resolve(current)
    })
    request.once('error', (error) => {
      signal.removeEventListener('abort', abort)
      reject(error)
    })
    request.setHeader('Cache-Control', 'no-cache')
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    else request.end()
  })
  return net.fetch(finalUrl, { signal, redirect: 'error', cache: 'no-store', credentials: 'omit' })
}

export interface DownloadProgress {
  progress: number
  bytesPerSecond: number
  downloadSource: string
  message: string
}

class SourceError extends Error {
  constructor(
    message: string,
    readonly slow = false,
    readonly speed = 0
  ) {
    super(message)
  }
}

export async function downloadInstaller(
  release: UpdateRelease,
  file: string,
  signal: AbortSignal,
  report: (progress: DownloadProgress) => void
): Promise<void> {
  const sources = downloadSources(release)
  if (!sources.length) throw new Error('没有可用的安装包下载地址')
  const partial = `${file}.part`
  await mkdir(dirname(file), { recursive: true })
  const slowSources: { source: DownloadSource; speed: number }[] = []
  let lastError: unknown
  let switchReason = ''

  const attempt = async (source: DownloadSource, relaxed: boolean) => {
    signal.throwIfAborted()
    const controller = new AbortController()
    const abort = () => controller.abort(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    let timeout: ReturnType<typeof setTimeout> | undefined
    let ticker: ReturnType<typeof setInterval> | undefined
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    let output: Awaited<ReturnType<typeof open>> | undefined
    let received = 0
    let windowBytes = 0
    let windowStart = Date.now()
    let lastBytes = 0
    let lastTick = windowStart
    let speed = 0
    const noticeUntil = Date.now() + 5000
    const notice = switchReason ? `${switchReason}，已切换至${source.label}。` : ''
    const progress = (message = '') =>
      report({
        progress: Math.min(99, Math.floor((received / release.size) * 100)),
        bytesPerSecond: speed,
        downloadSource: source.label,
        message: notice && Date.now() < noticeUntil ? notice : message
      })
    const armTimeout = (milliseconds: number, message: string) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => controller.abort(new SourceError(message)), milliseconds)
    }
    progress(relaxed ? '当前可用来源速度较慢，将继续下载，可随时取消。' : '')
    armTimeout(CONNECT_TIMEOUT, '下载源连接超时')
    try {
      const response = await fetchUpdate(source.url, controller.signal)
      controller.signal.throwIfAborted()
      if (!response.ok || !response.body)
        throw new SourceError(`下载源返回 HTTP ${response.status}`)
      if ((response.headers.get('content-type') || '').includes('text/html'))
        throw new SourceError('下载源未返回安装包')
      reader = response.body.getReader()
      output = await open(partial, 'w')
      const hash = createHash('sha256')
      windowStart = lastTick = Date.now()
      armTimeout(STALL_TIMEOUT, '下载源长时间没有传输数据')
      ticker = setInterval(() => {
        const now = Date.now()
        speed = Math.max(0, Math.round(((received - lastBytes) * 1000) / (now - lastTick)))
        lastBytes = received
        lastTick = now
        progress(relaxed ? '当前可用来源速度较慢，将继续下载，可随时取消。' : '')
        if (now - windowStart >= PROGRESS_WINDOW) {
          const delta = received - windowBytes
          if (!relaxed && delta < MIN_PROGRESS) {
            controller.abort(
              new SourceError('下载源传输速度较慢', true, (delta * 1000) / (now - windowStart))
            )
          }
          windowStart = now
          windowBytes = received
        }
      }, 500)
      while (true) {
        const { done, value } = await reader.read()
        controller.signal.throwIfAborted()
        if (done) break
        received += value.byteLength
        if (received > release.size) throw new SourceError('文件大小与更新清单不符')
        armTimeout(STALL_TIMEOUT, '下载源长时间没有传输数据')
        await output.writeFile(value)
        hash.update(value)
      }
      if (received !== release.size || hash.digest('hex') !== release.sha256)
        throw new SourceError('安装包校验失败，已放弃该下载源')
      await output.close()
      output = undefined
      signal.throwIfAborted()
      await rm(file, { force: true })
      signal.throwIfAborted()
      await rename(partial, file)
    } catch (error) {
      if (signal.aborted) throw signal.reason
      throw controller.signal.aborted ? controller.signal.reason : error
    } finally {
      clearTimeout(timeout)
      clearInterval(ticker)
      signal.removeEventListener('abort', abort)
      controller.abort()
      await reader?.cancel().catch(() => {})
      await output?.close().catch(() => {})
    }
  }

  const trySource = async (source: DownloadSource, relaxed: boolean) => {
    try {
      await attempt(source, relaxed)
      return true
    } catch (error) {
      if (signal.aborted) throw signal.reason
      const code = (error as NodeJS.ErrnoException | null)?.code
      if (code && ['ENOSPC', 'EACCES', 'EPERM', 'EIO', 'EROFS', 'EMFILE'].includes(code)) {
        throw new Error(
          code === 'ENOSPC' ? '磁盘空间不足，请清理后重试' : '无法写入安装包，请检查磁盘和目录权限'
        )
      }
      lastError = error
      switchReason = error instanceof Error ? error.message : '下载源不可用'
      if (error instanceof SourceError && error.slow && !relaxed)
        slowSources.push({ source, speed: error.speed })
      report({
        progress: 0,
        bytesPerSecond: 0,
        downloadSource: source.label,
        message: `${switchReason}，正在尝试其他来源…`
      })
      return false
    }
  }
  try {
    for (const source of sources) if (await trySource(source, false)) return
    // When every usable route is slow, allow the fastest one to finish instead
    // of rejecting all connections forever. Stalled transfers still time out.
    for (const { source } of slowSources.sort((a, b) => b.speed - a.speed)) {
      if (await trySource(source, true)) return
    }
    throw new Error(
      `所有下载源均未成功，请稍后重试。${lastError instanceof Error ? `（${lastError.message}）` : ''}`
    )
  } finally {
    await rm(partial, { force: true }).catch(() => {})
  }
}
