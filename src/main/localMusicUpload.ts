import { randomBytes } from 'node:crypto'
import type { FileHandle } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { normalizeMusicCookie } from '../shared/musicCookie'
import type {
  LocalMusicUploadProgress,
  LocalMusicUploadRequest,
  LocalMusicUploadResult,
  LocalTrackId
} from '../shared/localMusic'

export interface LocalUploadSource {
  file: FileHandle
  name: string
  size: number
  contentType: string
}

const MAX_BYTES = 500 * 1024 * 1024
const requestIdPattern = /^[a-zA-Z0-9_-]{1,100}$/

function uploadURL(value: unknown): URL {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('云盘服务地址无效')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('云盘服务地址无效，请检查服务器设置')
  }
  const loopback =
    ['localhost', '[::1]'].includes(url.hostname) ||
    (isIP(url.hostname) === 4 && url.hostname.startsWith('127.'))
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    (url.protocol === 'http:' && !loopback) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('上传地址须为本机 HTTP 服务或 HTTPS 服务，且不能包含账号或查询参数')
  url.pathname = url.pathname.replace(/\/+$/, '') + '/cloud'
  url.searchParams.set('timestamp', String(Date.now()))
  return url
}

// 此控制器仅接收资料库 ID；文件句柄由主进程资料库提供，渲染进程不能指定路径。
export function createLocalMusicUploader(
  openSource: (id: LocalTrackId) => Promise<LocalUploadSource>,
  onProgress: (progress: LocalMusicUploadProgress) => void
) {
  let active: { requestId: string; abort: AbortController } | undefined
  const cancel = (requestId: unknown) => {
    if (typeof requestId !== 'string' || !requestIdPattern.test(requestId))
      throw new Error('上传任务标识无效')
    if (active?.requestId === requestId) active.abort.abort(new Error('已取消上传'))
  }

  const upload = async (value: unknown): Promise<LocalMusicUploadResult> => {
    if (!value || typeof value !== 'object') throw new Error('上传参数无效')
    const input = value as LocalMusicUploadRequest
    if (typeof input.requestId !== 'string' || !requestIdPattern.test(input.requestId))
      throw new Error('上传任务标识无效')
    const cookie = normalizeMusicCookie(input.cookie)
    if (!cookie) throw new Error('请先登录后再上传到云盘')
    const url = uploadURL(input.baseURL)
    if (active) throw new Error('已有歌曲正在上传，请等待完成或取消')
    const task = { requestId: input.requestId, abort: new AbortController() }
    active = task
    let source: LocalUploadSource | undefined
    const timeout = setTimeout(
      () => task.abort.abort(new Error('上传超时，请稍后重试')),
      10 * 60_000
    )
    try {
      source = await openSource(input.id)
      task.abort.signal.throwIfAborted()
      if (!Number.isSafeInteger(source.size) || source.size <= 0 || source.size > MAX_BYTES)
        throw new Error('仅支持上传非空且不超过 500 MB 的音频文件')
      const boundary = '----Tinglan' + randomBytes(18).toString('hex')
      const filename = source.name.replace(/["\r\n\\]/g, '_')
      const prefix = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="cookie"\r\n\r\n${cookie}\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="songFile"; filename="${filename}"\r\n` +
          `Content-Type: ${source.contentType}\r\n\r\n`,
        'utf8'
      )
      const suffix = Buffer.from(`\r\n--${boundary}--\r\n`)
      let loaded = 0
      let lastProgress = 0
      const progress = (phase: LocalMusicUploadProgress['phase']) =>
        onProgress({
          id: input.id,
          requestId: input.requestId,
          phase,
          loaded,
          total: source!.size
        })
      const fileStream = source.file.createReadStream({ autoClose: false })
      // 中断可能发生于生成器开始读取文件之前，仍须消费流的错误事件。
      fileStream.on('error', () => {})
      const body = Readable.from(
        (async function* () {
          yield prefix
          for await (const chunk of fileStream) {
            loaded += chunk.length
            if (loaded > source!.size) throw new Error('文件在上传期间已变化，请重新上传')
            yield chunk
            if (Date.now() - lastProgress > 150) {
              lastProgress = Date.now()
              progress('uploading')
            }
          }
          if (loaded !== source!.size) throw new Error('文件在上传期间已变化，请重新上传')
          yield suffix
        })()
      )
      const abortStream = () => {
        fileStream.destroy(task.abort.signal.reason)
        body.destroy(task.abort.signal.reason)
      }
      task.abort.signal.addEventListener('abort', abortStream, { once: true })
      progress('uploading')
      try {
        return await new Promise<LocalMusicUploadResult>((resolve, reject) => {
          const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
            url,
            {
              method: 'POST',
              headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': prefix.length + source!.size + suffix.length
              },
              signal: task.abort.signal
            },
            (response) => {
              let size = 0
              const chunks: Buffer[] = []
              response.on('data', (chunk: Buffer) => {
                size += chunk.length
                if (size > 1024 * 1024) {
                  response.destroy(new Error('云盘服务返回的数据过大'))
                  return
                }
                chunks.push(chunk)
              })
              response.once('error', reject)
              response.once('end', () => {
                try {
                  if (response.statusCode === 401 || response.statusCode === 403)
                    throw new Error('登录已失效或没有云盘上传权限，请重新登录')
                  if (response.statusCode === 413) throw new Error('文件超过云盘服务的上传限制')
                  let data: { code?: number; msg?: string; message?: string; songId?: number }
                  try {
                    data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
                    if (!data || typeof data !== 'object') throw new Error('Invalid response')
                  } catch {
                    throw new Error(`云盘服务响应无效（HTTP ${response.statusCode}）`)
                  }
                  if (response.statusCode !== 200 || data.code !== 200) {
                    const message =
                      data.msg ||
                      data.message ||
                      `云盘上传失败（${data.code || response.statusCode}）`
                    // 服务器错误文本中也不回传登录凭据。
                    const token = cookie.replace(/^MUSIC_U=/, '').replace(/;$/, '')
                    throw new Error(String(message).split(token).join('[已隐藏]').slice(0, 300))
                  }
                  if (loaded !== source!.size) throw new Error('文件未完整发送，未确认上传成功')
                  resolve(Number.isSafeInteger(data.songId) ? { songId: data.songId } : {})
                } catch (cause) {
                  reject(cause)
                }
              })
            }
          )
          request.setTimeout(90_000, () =>
            task.abort.abort(new Error('云盘服务长时间未响应，请稍后重试'))
          )
          request.once('error', reject)
          request.once('finish', () => progress('processing'))
          void pipeline(body, request).catch(reject)
        })
      } finally {
        task.abort.signal.removeEventListener('abort', abortStream)
        body.destroy()
        fileStream.destroy()
      }
    } catch (cause) {
      if (task.abort.signal.aborted) throw task.abort.signal.reason
      if (cause instanceof Error && 'code' in cause)
        throw new Error('无法连接云盘服务或读取文件失败，请检查服务状态后重试')
      throw cause
    } finally {
      clearTimeout(timeout)
      await source?.file.close().catch(() => {})
      if (active === task) active = undefined
    }
  }
  return { upload, cancel, dispose: () => active?.abort.abort(new Error('上传已停止')) }
}
