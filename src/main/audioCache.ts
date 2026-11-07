import { app, ipcMain, net, protocol } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { join } from 'node:path'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { open, type FileHandle } from 'node:fs/promises'
import { isAudioQuality, type AudioCacheKey, type AudioSource } from '../shared/audioCache'

const LIMIT = 2 * 1024 ** 3
const MAX_FILE = 512 * 1024 ** 2
interface Entry {
  key: AudioCacheKey
  bytes: number
  duration: number
  type: string
  used: number
  details?: string
}
interface Resource {
  hash: string
  entry: Entry
  remote?: string
  expected?: number
}
interface Download {
  resource: Resource
  received: number
  total: number
  type: string
  done: boolean
  error?: Error
  readers: number
  generation: number
  controller: AbortController
  changed: Set<() => void>
  headers: Promise<void>
  finished: Promise<void>
}

// 本地协议只接收随机令牌，不把任意磁盘路径暴露给渲染进程。
export function createAudioCache(
  directory: string,
  fetchAudio: typeof net.fetch = net.fetch.bind(net),
  limit = LIMIT
) {
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > LIMIT) throw new Error('缓存容量无效')
  mkdirSync(directory, { recursive: true })
  const manifest = join(directory, 'index.json')
  const entries = new Map<string, Entry>()
  const resources = new Map<string, Resource>()
  const downloads = new Map<string, Download>()
  const leases = new Map<string, number>()
  const discarded = new Set<string>()
  let generation = 0
  const file = (hash: string, partial = false) =>
    join(directory, hash + (partial ? '.part' : '.audio'))
  const removeFile = (path: string) => {
    try {
      rmSync(path, { force: true })
    } catch {
      /* 下次启动重试清理被占用的文件。 */
    }
  }
  const valid = (key: AudioCacheKey) =>
    key &&
    typeof key.scope === 'string' &&
    key.scope.length <= 2048 &&
    Number.isSafeInteger(key.songId) &&
    key.songId > 0 &&
    isAudioQuality(key.quality)
  const hashKey = (key: AudioCacheKey) => {
    if (!valid(key)) throw new Error('缓存参数无效')
    return createHash('sha256')
      .update(JSON.stringify([key.scope, key.songId, key.quality]))
      .digest('hex')
  }
  const persist = () => {
    // scope 仅在摘要中参与匹配，索引不保存账户、服务地址或远程签名链接。
    const data = [...entries].map(([hash, entry]) => {
      const { details: _details, ...metadata } = entry
      return [hash, { ...metadata, key: { ...entry.key, scope: '' } }]
    })
    try {
      writeFileSync(manifest + '.tmp', JSON.stringify(data))
      renameSync(manifest + '.tmp', manifest)
    } catch {
      /* 索引写入失败不打断音频流，下次启动会清理未登记文件。 */
    }
  }
  const writeDetails = (hash: string, details: string) => {
    try {
      writeFileSync(file(hash) + '.json.tmp', details)
      renameSync(file(hash) + '.json.tmp', file(hash) + '.json')
    } catch {
      /* 歌词快照不可用时不影响音频缓存。 */
    }
  }
  const remove = (hash: string) => {
    entries.delete(hash)
    for (const [token, resource] of resources) if (resource.hash === hash) resources.delete(token)
    if ((leases.get(hash) || 0) > 0 || downloads.has(hash)) discarded.add(hash)
    else {
      removeFile(file(hash))
      removeFile(file(hash, true))
      removeFile(file(hash) + '.json')
      removeFile(file(hash) + '.json.tmp')
    }
  }
  const cleanup = (hash: string) => {
    if (discarded.has(hash) && !leases.get(hash) && !downloads.has(hash)) {
      removeFile(file(hash))
      removeFile(file(hash, true))
      removeFile(file(hash) + '.json')
      removeFile(file(hash) + '.json.tmp')
      discarded.delete(hash)
    }
  }
  try {
    if (existsSync(manifest) && statSync(manifest).size < 8 * 1024 ** 2) {
      for (const [hash, entry] of JSON.parse(readFileSync(manifest, 'utf8')) as [string, Entry][]) {
        if (
          /^[a-f0-9]{64}$/.test(hash) &&
          valid(entry.key) &&
          Number.isSafeInteger(entry.bytes) &&
          entry.bytes > 0 &&
          entry.bytes <= MAX_FILE &&
          existsSync(file(hash)) &&
          lstatSync(file(hash)).isFile() &&
          !lstatSync(file(hash)).isSymbolicLink() &&
          statSync(file(hash)).size === entry.bytes
        )
          entries.set(hash, entry)
      }
    }
  } catch {
    entries.clear()
  }
  // 仅清理此缓存目录中符合本模块命名规则的残片或无索引文件。
  for (const name of readdirSync(directory)) {
    if (
      /^[a-f0-9]{64}\.(part|audio(?:\.json(?:\.tmp)?)?)$/.test(name) &&
      (name.endsWith('.part') || name.endsWith('.tmp') || !entries.has(name.slice(0, 64)))
    )
      removeFile(join(directory, name))
  }
  const stats = () => ({
    bytes: [...entries.values()].reduce((sum, entry) => sum + entry.bytes, 0),
    count: entries.size,
    pending: downloads.size,
    limit
  })
  const trim = () => {
    let size = stats().bytes
    for (const [hash, entry] of [...entries].sort((a, b) => a[1].used - b[1].used)) {
      if (size <= limit) break
      if (!leases.get(hash) && !downloads.has(hash)) {
        remove(hash)
        size -= entry.bytes
      }
    }
  }
  trim()
  const source = (resource: Resource, cached: boolean): AudioSource => {
    const token = randomBytes(24).toString('hex')
    resources.set(token, resource)
    // 只保留最近的令牌，已开始的响应持有资源引用，不受淘汰影响。
    if (resources.size > 256) resources.delete(resources.keys().next().value!)
    return {
      url: `tinglan-audio://track/${token}`,
      quality: resource.entry.key.quality,
      duration: resource.entry.duration,
      details: resource.entry.details,
      cached
    }
  }
  const find = (key: AudioCacheKey): AudioSource | null => {
    const hash = hashKey(key),
      entry = entries.get(hash)
    if (!entry) return null
    if (!existsSync(file(hash)) || statSync(file(hash)).size !== entry.bytes) {
      remove(hash)
      persist()
      return null
    }
    entry.used = Date.now()
    if (
      !entry.details &&
      existsSync(file(hash) + '.json') &&
      statSync(file(hash) + '.json').size <= 512 * 1024
    )
      entry.details = readFileSync(file(hash) + '.json', 'utf8')
    persist()
    return source({ hash, entry }, true)
  }
  const prepare = (
    value: AudioCacheKey & { url: string; size?: number; duration: number }
  ): AudioSource => {
    const hit = find(value)
    if (hit) return hit
    const url = new URL(value.url)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !['music.126.net', 'music.163.com'].some(
        (domain) => url.hostname === domain || url.hostname.endsWith('.' + domain)
      )
    )
      return { url: value.url, quality: value.quality, duration: value.duration, cached: false }
    if ((value.size || 0) > MAX_FILE)
      return { url: value.url, quality: value.quality, duration: value.duration, cached: false }
    const hash = hashKey(value)
    const pending = downloads.get(hash)
    if (pending && !pending.error && !pending.controller.signal.aborted)
      return source(pending.resource, false)
    const resource: Resource = {
      hash,
      remote: url.href,
      expected: value.size,
      entry: {
        key: { scope: '', songId: value.songId, quality: value.quality },
        bytes: 0,
        duration: Number(value.duration) || 0,
        type: 'application/octet-stream',
        used: Date.now()
      }
    }
    return source(resource, false)
  }
  function start(resource: Resource): Download {
    const existing = downloads.get(resource.hash)
    if (existing) return existing
    if (downloads.size >= 2) {
      const idle = [...downloads.values()].find(
        (task) => !task.readers && !task.controller.signal.aborted
      )
      if (idle) idle.controller.abort()
      else throw new Error('音频缓存繁忙')
    }
    let ready!: () => void, rejectHeaders!: (error: Error) => void
    const task: Download = {
      resource,
      received: 0,
      total: 0,
      type: '',
      done: false,
      readers: 0,
      generation,
      controller: new AbortController(),
      changed: new Set(),
      headers: new Promise<void>((resolve, reject) => {
        ready = resolve
        rejectHeaders = reject
      }),
      finished: Promise.resolve()
    }
    const notify = () => {
      for (const wake of task.changed) wake()
      task.changed.clear()
    }
    downloads.set(resource.hash, task)
    task.finished = (async () => {
      let output: FileHandle | undefined
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        timeout = setTimeout(() => task.controller.abort(), 30_000)
        const response = await fetchAudio(resource.remote!, { signal: task.controller.signal })
        if (response.status !== 200 || !response.body) throw new Error('未获取完整音频')
        task.total = Number(response.headers.get('content-length')) || resource.expected || 0
        task.type = response.headers.get('content-type') || 'application/octet-stream'
        if (task.total > MAX_FILE || /text\/|json|html/i.test(task.type))
          throw new Error('音频响应无效')
        output = await open(file(resource.hash, true), 'w')
        ready()
        const reader = response.body.getReader()
        while (true) {
          clearTimeout(timeout)
          timeout = setTimeout(() => task.controller.abort(), 30_000)
          const { value, done } = await reader.read()
          if (done) break
          if (task.received + value.length > MAX_FILE) throw new Error('音频超过缓存上限')
          let written = 0
          while (written < value.length)
            written += (await output.write(value, written, value.length - written)).bytesWritten
          task.received += value.length
          notify()
        }
        if (
          !task.received ||
          (task.total && task.received !== task.total) ||
          (resource.expected && resource.expected !== task.received)
        )
          throw new Error('音频缓存不完整')
        await output.close()
        output = undefined
        renameSync(file(resource.hash, true), file(resource.hash))
        resource.entry.bytes = task.received
        resource.entry.type = task.type
        if (task.generation === generation && !discarded.has(resource.hash)) {
          entries.set(resource.hash, resource.entry)
          if (resource.entry.details) writeDetails(resource.hash, resource.entry.details)
          trim()
          persist()
        } else discarded.add(resource.hash)
        task.done = true
      } catch (error) {
        task.error = error instanceof Error ? error : new Error(String(error))
        rejectHeaders(task.error)
        discarded.add(resource.hash)
      } finally {
        clearTimeout(timeout)
        await output?.close().catch(() => {})
        downloads.delete(resource.hash)
        notify()
        cleanup(resource.hash)
      }
    })()
    return task
  }
  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const resource = url.hostname === 'track' ? resources.get(url.pathname.slice(1)) : undefined
    if (!resource || (request.method !== 'GET' && request.method !== 'HEAD'))
      return new Response(null, { status: 404 })
    const stored = entries.get(resource.hash)
    if (stored) resource.entry = stored
    resource.entry.used = Date.now()
    let task: Download | undefined
    try {
      if (!entries.has(resource.hash)) {
        if (!resource.remote || discarded.has(resource.hash))
          return new Response(null, { status: 404 })
        task = start(resource)
        await task.headers
        resource.entry = task.resource.entry
      }
      const total = task ? task.total : resource.entry.bytes
      const requestedRange = request.headers.get('range')
      const range = !total && requestedRange === 'bytes=0-' ? null : requestedRange
      const match = range?.match(/^bytes=(\d*)-(\d*)$/)
      let from = 0,
        to = total ? total - 1 : Infinity
      if (range) {
        if (!match || !total || (!match[1] && !match[2]))
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` }
          })
        from = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]))
        to = match[1] && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1
        if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from > to || from >= total)
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` }
          })
      }
      const headers = new Headers({
        'Content-Type': task?.type || resource.entry.type,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      })
      if (Number.isFinite(to)) headers.set('Content-Length', String(to - from + 1))
      if (range) headers.set('Content-Range', `bytes ${from}-${to}/${total}`)
      if (request.method === 'HEAD')
        return new Response(null, { status: range ? 206 : 200, headers })
      const hash = resource.hash
      leases.set(hash, (leases.get(hash) || 0) + 1)
      if (task) task.readers++
      let opening: Promise<FileHandle> | undefined,
        position = from,
        closed = false
      let releasing: Promise<void> | undefined
      const release = () => {
        if (releasing) return releasing
        closed = true
        request.signal.removeEventListener('abort', aborted)
        releasing = (async () => {
          await opening?.then((handle) => handle.close()).catch(() => {})
          leases.set(hash, Math.max(0, (leases.get(hash) || 1) - 1))
          if (task) task.readers--
          cleanup(hash)
          if (stats().bytes > limit) {
            trim()
            persist()
          }
        })()
        return releasing
      }
      const aborted = () => {
        void release()
        if (task) {
          for (const wake of task.changed) wake()
          task.changed.clear()
        }
      }
      request.signal.addEventListener('abort', aborted, { once: true })
      if (request.signal.aborted) aborted()
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            if (closed) {
              controller.close()
              return
            }
            while (!closed) {
              if (task?.error) throw task.error
              const available = task ? task.received : resource.entry.bytes
              if (position > to || (position >= available && (!task || task.done))) {
                await release()
                controller.close()
                return
              }
              if (position < available) {
                opening ??= open(file(hash, !!task && !task.done), 'r').catch(() =>
                  open(file(hash), 'r')
                )
                const input = await opening
                if (closed) return
                const buffer = Buffer.alloc(
                  Math.min(128 * 1024, available - position, to - position + 1)
                )
                const { bytesRead } = await input.read(buffer, 0, buffer.length, position)
                if (!bytesRead) throw new Error('缓存文件读取失败')
                position += bytesRead
                controller.enqueue(buffer.subarray(0, bytesRead))
                return
              }
              await new Promise<void>((resolve) => {
                task!.changed.add(resolve)
                if (closed) resolve()
              })
            }
          } catch (error) {
            await release()
            controller.error(error)
          }
        },
        async cancel() {
          await release()
          if (task) {
            for (const wake of task.changed) wake()
            task.changed.clear()
          }
        }
      })
      return new Response(stream, { status: range ? 206 : 200, headers })
    } catch {
      return new Response(null, { status: 502 })
    }
  }
  return {
    find,
    prepare,
    handle,
    stats,
    details(key: AudioCacheKey, details: string) {
      if (typeof details !== 'string' || Buffer.byteLength(details) > 512 * 1024) return
      const hash = hashKey(key),
        entry = entries.get(hash) || downloads.get(hash)?.resource.entry
      if (entry) {
        entry.details = details
        if (entries.has(hash)) writeDetails(hash, details)
      } else
        for (const resource of resources.values())
          if (resource.hash === hash) resource.entry.details = details
    },
    invalidate(key: AudioCacheKey) {
      const hash = hashKey(key)
      remove(hash)
      downloads.get(hash)?.controller.abort()
      persist()
    },
    clear(keepUrl?: string) {
      let keep: string | undefined
      try {
        const url = new URL(keepUrl || '')
        if (url.protocol === 'tinglan-audio:' && url.hostname === 'track')
          keep = resources.get(url.pathname.slice(1))?.hash
      } catch {
        /* 当前没有本地音频。 */
      }
      generation++
      for (const [token, resource] of resources) if (resource.hash !== keep) resources.delete(token)
      for (const task of downloads.values()) {
        if (task.resource.hash === keep) {
          task.generation = generation
          continue
        }
        discarded.add(task.resource.hash)
        if (!task.readers) task.controller.abort()
      }
      for (const hash of entries.keys()) if (hash !== keep) remove(hash)
      persist()
      return stats()
    }
  }
}

export function setupAudioCache() {
  const cache = createAudioCache(join(app.getPath('userData'), 'audio-cache'))
  protocol.handle('tinglan-audio', (request) => cache.handle(request))
  ipcMain.handle('audio-cache:find', (_event, key) => cache.find(key))
  ipcMain.handle('audio-cache:prepare', (_event, value) => cache.prepare(value))
  ipcMain.handle('audio-cache:details', (_event, key, details) => cache.details(key, details))
  ipcMain.handle('audio-cache:invalidate', (_event, key) => cache.invalidate(key))
  ipcMain.handle('audio-cache:stats', () => cache.stats())
  ipcMain.handle('audio-cache:clear', (_event, keepUrl) => cache.clear(keepUrl))
}
