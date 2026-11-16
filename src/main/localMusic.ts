import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { mkdir, open, opendir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { createLocalMusicUploader, type LocalUploadSource } from './localMusicUpload'
import type {
  LocalLibrarySnapshot,
  LocalMusicSource,
  LocalTrack,
  LocalTrackId
} from '../shared/localMusic'

const extensions = ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'webm']
const validId = (value: unknown): value is LocalTrackId =>
  typeof value === 'string' && /^local:[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
const pathKey = (value: string) => (process.platform === 'win32' ? value.toLowerCase() : value)
const isAudio = (value: string) => extensions.includes(extname(value).slice(1).toLowerCase())
const metadataText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  // 部分 RIFF INFO 标签的错误编码会被解析成控制字符，回退比显示乱码更可靠。
  for (const character of value) {
    const code = character.charCodeAt(0)
    if ((code < 32 && ![9, 10, 13].includes(code)) || (code >= 127 && code <= 159)) return undefined
  }
  return value.replace(/\s+/g, ' ').trim() || undefined
}
const metadataArtists = (values: unknown[]): string[] =>
  values.map(metadataText).filter((value): value is string => Boolean(value))
const cors = { 'Access-Control-Allow-Origin': '*' }
const audioTypes: Record<string, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  webm: 'audio/webm'
}

interface RecordEntry {
  track: LocalTrack
  size: number
  modified: number
  lyric?: string
}
interface Cover {
  stamp: string
  bytes: Uint8Array
  type: string
}

function decodeText(bytes: Buffer): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString('utf16le')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    return new TextDecoder('gb18030').decode(bytes)
  }
}

// 文件路径只由主进程选框和已授权目录提供；渲染进程只通过稳定 ID 操作资料库。
export async function createLocalLibrary(
  directory: string,
  onChange: (snapshot: LocalLibrarySnapshot) => void = () => {}
) {
  await mkdir(directory, { recursive: true })
  const indexPath = join(directory, 'index.json')
  const records = new Map<LocalTrackId, RecordEntry>()
  const folders = new Set<string>()
  const excluded = new Set<string>()
  const coverCache = new Map<LocalTrackId, Cover>()
  let scanning = false
  let processed = 0
  let error: string | undefined
  let lastNotification = 0
  let operations: Promise<unknown> = Promise.resolve()
  let writes: Promise<unknown> = Promise.resolve()

  const snapshot = (): LocalLibrarySnapshot => ({
    tracks: [...records.values()].map((entry) => entry.track),
    folders: [...folders],
    scanning,
    processed,
    ...(error ? { error } : {})
  })
  const notify = (force = false) => {
    if (!force && Date.now() - lastNotification < 500) return
    lastNotification = Date.now()
    onChange(snapshot())
  }
  const persist = () => {
    const contents = JSON.stringify({
      version: 1,
      records: [...records.values()],
      folders: [...folders],
      excluded: [...excluded]
    })
    writes = writes
      .catch(() => {})
      .then(async () => {
        await writeFile(indexPath + '.tmp', contents, 'utf8')
        await rename(indexPath + '.tmp', indexPath)
      })
    return writes
  }
  const exclusive = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operations.catch(() => {}).then(operation)
    operations = result
    return result
  }

  try {
    const saved = JSON.parse(await readFile(indexPath, 'utf8'))
    if (saved.version !== 1 || !Array.isArray(saved.records)) throw new Error('Invalid index')
    for (const record of saved.records) {
      const track = record?.track as LocalTrack | undefined
      if (
        !track ||
        !validId(track.id) ||
        track.source !== 'local' ||
        !isAbsolute(track.local?.filePath || '') ||
        !isAudio(track.local.filePath) ||
        typeof track.name !== 'string' ||
        !Array.isArray(track.ar) ||
        !track.al ||
        !Number.isFinite(record.size) ||
        !Number.isFinite(record.modified)
      )
        continue
      track.name =
        metadataText(track.name) || basename(track.local.filePath, extname(track.local.filePath))
      const artists = metadataArtists(track.ar.map((artist) => artist?.name))
      track.ar = (artists.length ? artists : ['未知歌手']).map((name) => ({ id: 0, name }))
      track.al.name = metadataText(track.al.name) || '未知专辑'
      records.set(track.id, record)
    }
    for (const folder of saved.folders || [])
      if (typeof folder === 'string' && isAbsolute(folder)) folders.add(folder)
    for (const file of saved.excluded || [])
      if (typeof file === 'string' && isAbsolute(file)) excluded.add(pathKey(file))
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== 'ENOENT')
      error = '本地资料库索引读取失败，可以重新导入音乐'
  }

  const readMetadata = async (filePath: string, previous?: RecordEntry): Promise<RecordEntry> => {
    const info = await stat(filePath)
    if (!info.isFile() || !isAudio(filePath)) throw new Error('不支持的音频文件')
    if (previous && info.size === previous.size && info.mtimeMs === previous.modified) {
      previous.track.local.missing = false
      return previous
    }
    const id: LocalTrackId = previous?.track.id || `local:${randomUUID()}`
    let name = basename(filePath, extname(filePath))
    let artists = ['未知歌手']
    let album = '未知专辑'
    let duration = 0
    let bitrate: number | undefined
    let sampleRate: number | undefined
    let bitsPerSample: number | undefined
    let lyric = ''
    try {
      const { parseFile } = await import('music-metadata')
      const metadata = await parseFile(filePath, { skipCovers: true, duration: true })
      name = metadataText(metadata.common.title) || name
      const taggedArtists = metadataArtists(metadata.common.artists || [])
      artists = taggedArtists.length
        ? taggedArtists
        : [metadataText(metadata.common.artist) || '未知歌手']
      album = metadataText(metadata.common.album) || album
      duration = Math.max(0, Math.round((metadata.format.duration || 0) * 1000))
      bitrate = metadata.format.bitrate
      sampleRate = metadata.format.sampleRate
      bitsPerSample = metadata.format.bitsPerSample
      lyric = metadata.common.lyrics?.find((item) => item.text)?.text?.slice(0, 512 * 1024) || ''
    } catch {
      // 元数据损坏时仍保留文件名，音频是否可解码由播放器判断。
    }
    coverCache.delete(id)
    return {
      track: {
        id,
        source: 'local',
        name,
        ar: artists.map((artist) => ({ id: 0, name: artist })),
        al: {
          id: 0,
          name: album,
          picUrl: `tinglan-local://cover/${id.slice(6)}?v=${Math.round(info.mtimeMs)}`
        },
        dt: duration,
        local: {
          filePath,
          format: extname(filePath).slice(1).toLowerCase(),
          bitrate,
          sampleRate,
          bitsPerSample,
          missing: false
        }
      },
      size: info.size,
      modified: info.mtimeMs,
      lyric
    }
  }

  const scan = async (files: string[], directories: string[], refreshExisting = false) => {
    scanning = true
    processed = 0
    error = undefined
    coverCache.clear()
    notify(true)
    let failures = 0
    const paths = new Set<string>()
    const byPath = new Map(
      [...records.values()].map((record) => [pathKey(record.track.local.filePath), record])
    )
    const visit = async (folder: string) => {
      try {
        const children = await opendir(folder)
        for await (const child of children) {
          const file = join(folder, child.name)
          if (child.isDirectory()) await visit(file)
          else if (child.isFile() && isAudio(file) && !excluded.has(pathKey(file))) paths.add(file)
        }
      } catch {
        failures++
      }
    }
    try {
      for (const file of files) {
        try {
          const canonical = await realpath(file)
          if (isAudio(canonical)) paths.add(canonical)
        } catch {
          if (refreshExisting) {
            const record = byPath.get(pathKey(file))
            if (record) record.track.local.missing = true
          }
        }
      }
      for (const folder of directories) await visit(folder)
      const pending = [...paths]
      let index = 0
      const worker = async () => {
        while (index < pending.length) {
          const file = pending[index++]
          const previous = byPath.get(pathKey(file))
          try {
            const record = await readMetadata(file, previous)
            records.set(record.track.id, record)
            byPath.set(pathKey(file), record)
          } catch {
            if (previous) previous.track.local.missing = true
            failures++
          }
          processed++
          notify()
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker))
      if (failures) error = `有 ${failures} 个文件或目录无法读取，其余音乐已更新`
      await persist()
    } catch {
      error = '本地资料库保存失败，请检查磁盘空间和目录权限'
    } finally {
      scanning = false
      notify(true)
    }
    return snapshot()
  }

  const getRecord = (id: unknown) => {
    if (!validId(id) || !records.has(id)) throw new Error('本地歌曲不存在，请重新导入')
    return records.get(id)!
  }
  const markMissing = async (record: RecordEntry) => {
    record.track.local.missing = true
    await persist().catch(() => {})
    notify(true)
  }

  const resolve = async (id: LocalTrackId): Promise<LocalMusicSource> => {
    let record = getRecord(id)
    try {
      record = await readMetadata(record.track.local.filePath, record)
      if (!records.has(id)) throw new Error('Removed')
      records.set(id, record)
    } catch {
      await markMissing(record)
      throw new Error('本地音乐文件不存在或无法读取，请在本地音乐中重新定位')
    }
    let lyric = record.lyric || ''
    const stem = record.track.local.filePath.slice(0, -extname(record.track.local.filePath).length)
    for (const candidate of [stem + '.lrc', stem + '.LRC']) {
      try {
        const info = await stat(candidate)
        if (info.isFile() && info.size <= 1024 * 1024) {
          lyric = decodeText(await readFile(candidate))
          break
        }
      } catch {
        // 没有伴随歌词时使用文件内嵌歌词。
      }
    }
    await persist().catch(() => {})
    notify(true)
    return { track: record.track, url: `tinglan-local://track/${id.slice(6)}`, lyric }
  }

  const cover = async (record: RecordEntry): Promise<Cover | undefined> => {
    const info = await stat(record.track.local.filePath)
    const stamp = `${info.size}:${info.mtimeMs}`
    const hit = coverCache.get(record.track.id)
    if (hit?.stamp === stamp) {
      coverCache.delete(record.track.id)
      coverCache.set(record.track.id, hit)
      return hit
    }
    let picture: { data: Uint8Array; format: string } | undefined
    try {
      const { parseFile, selectCover } = await import('music-metadata')
      const metadata = await parseFile(record.track.local.filePath, { skipCovers: false })
      picture = selectCover(metadata.common.picture) || undefined
    } catch {
      // 封面不可读时尝试同目录图片。
    }
    if (!picture) {
      const stem = record.track.local.filePath.slice(
        0,
        -extname(record.track.local.filePath).length
      )
      for (const file of [stem + '.jpg', stem + '.png', join(dirname(stem), 'cover.jpg')]) {
        try {
          const imageInfo = await stat(file)
          if (imageInfo.isFile() && imageInfo.size <= 8 * 1024 * 1024) {
            picture = {
              data: await readFile(file),
              format: file.endsWith('.png') ? 'image/png' : 'image/jpeg'
            }
            break
          }
        } catch {
          // 使用下一张候选图片。
        }
      }
    }
    if (!picture || picture.data.byteLength > 8 * 1024 * 1024) return undefined
    const type = picture.format === 'image/jpg' ? 'image/jpeg' : picture.format
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) return undefined
    const result = { stamp, bytes: picture.data, type }
    coverCache.set(record.track.id, result)
    let bytes = [...coverCache.values()].reduce((sum, item) => sum + item.bytes.byteLength, 0)
    while (bytes > 16 * 1024 * 1024 && coverCache.size > 1) {
      const oldest = coverCache.keys().next().value!
      bytes -= coverCache.get(oldest)!.bytes.byteLength
      coverCache.delete(oldest)
    }
    return result
  }

  const handle = async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range'
        }
      })
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 405, headers: cors })
    try {
      const url = new URL(request.url)
      if (url.protocol !== 'tinglan-local:' || !['track', 'cover'].includes(url.hostname))
        return new Response(null, { status: 404, headers: cors })
      const id = `local:${url.pathname.slice(1)}` as LocalTrackId
      const record = getRecord(id)
      if (url.hostname === 'cover') {
        const image = await cover(record)
        return image
          ? new Response(request.method === 'HEAD' ? null : image.bytes, {
              headers: { ...cors, 'Content-Type': image.type, 'Cache-Control': 'no-cache' }
            })
          : new Response(null, { status: 404, headers: cors })
      }
      const info = await stat(record.track.local.filePath)
      if (!info.isFile()) return new Response(null, { status: 404, headers: cors })
      let start = 0
      let end = info.size - 1
      const range = request.headers.get('range')
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range)
        if (match && (match[1] || match[2])) {
          if (match[1]) {
            start = Number(match[1])
            if (match[2]) end = Math.min(end, Number(match[2]))
          } else start = Math.max(0, info.size - Number(match[2]))
        } else start = -1
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end)
          return new Response(null, {
            status: 416,
            headers: { ...cors, 'Content-Range': `bytes */${info.size}` }
          })
      }
      if (!info.size)
        return new Response(null, {
          status: 416,
          headers: { ...cors, 'Content-Range': 'bytes */0' }
        })
      const headers = {
        ...cors,
        'Accept-Ranges': 'bytes',
        'Content-Type': audioTypes[record.track.local.format] || 'application/octet-stream',
        'Content-Length': String(end - start + 1),
        'Cache-Control': 'no-store',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {})
      }
      if (request.method === 'HEAD')
        return new Response(null, { status: range ? 206 : 200, headers })
      const stream = createReadStream(record.track.local.filePath, { start, end })
      const abort = () => stream.destroy()
      request.signal.addEventListener('abort', abort, { once: true })
      stream.once('close', () => request.signal.removeEventListener('abort', abort))
      if (request.signal.aborted) stream.destroy()
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
        status: range ? 206 : 200,
        headers
      })
    } catch {
      return new Response(null, { status: 404, headers: cors })
    }
  }

  return {
    snapshot,
    handle,
    resolve,
    uploadSource: async (id: LocalTrackId): Promise<LocalUploadSource> => {
      const record = getRecord(id)
      let file: Awaited<ReturnType<typeof open>>
      try {
        file = await open(record.track.local.filePath, 'r')
      } catch {
        await markMissing(record)
        throw new Error('本地音乐文件不存在或无法读取，请重新定位后上传')
      }
      try {
        const info = await file.stat()
        if (!info.isFile() || !isAudio(record.track.local.filePath))
          throw new Error('不支持的音频文件')
        return {
          file,
          name: basename(record.track.local.filePath),
          size: info.size,
          contentType: audioTypes[extname(record.track.local.filePath).slice(1).toLowerCase()]
        }
      } catch (cause) {
        await file.close()
        throw cause
      }
    },
    importPaths: (files: string[], directories: string[] = []) =>
      exclusive(async () => {
        const canonicalFolders: string[] = []
        for (const folder of directories) {
          const canonical = await realpath(folder)
          folders.add(canonical)
          canonicalFolders.push(canonical)
        }
        for (const file of files) excluded.delete(pathKey(await realpath(file)))
        return scan(files, canonicalFolders)
      }),
    refresh: () =>
      exclusive(() =>
        scan(
          [...records.values()].map((entry) => entry.track.local.filePath),
          [...folders],
          true
        )
      ),
    remove: (id: LocalTrackId) =>
      exclusive(async () => {
        const record = getRecord(id)
        excluded.add(pathKey(record.track.local.filePath))
        records.delete(id)
        coverCache.delete(id)
        await persist()
        notify(true)
        return snapshot()
      }),
    relocate: (id: LocalTrackId, filePath: string) =>
      exclusive(async () => {
        const previous = getRecord(id)
        const canonical = await realpath(filePath)
        const duplicate = [...records.values()].find(
          (record) =>
            record.track.id !== id && pathKey(record.track.local.filePath) === pathKey(canonical)
        )
        if (duplicate) throw new Error('这个文件已在本地资料库中，请选择其他文件')
        const record = await readMetadata(canonical)
        excluded.add(pathKey(previous.track.local.filePath))
        excluded.delete(pathKey(canonical))
        record.track.id = id
        record.track.al.picUrl = `tinglan-local://cover/${id.slice(6)}?v=${Math.round(record.modified)}`
        records.set(id, record)
        coverCache.delete(id)
        await persist()
        notify(true)
        return snapshot()
      })
  }
}

export async function setupLocalMusic(owner: () => BrowserWindow | undefined): Promise<void> {
  const library = await createLocalLibrary(
    join(app.getPath('userData'), 'local-library'),
    (snapshot) => {
      const window = owner()
      if (window && !window.isDestroyed()) window.webContents.send('local-music:change', snapshot)
    }
  )
  protocol.handle('tinglan-local', library.handle)
  const uploader = createLocalMusicUploader(library.uploadSource, (progress) => {
    const window = owner()
    if (window && !window.isDestroyed())
      window.webContents.send('local-music:upload-progress', progress)
  })
  app.once('before-quit', () => uploader.dispose())
  const handlers: Record<string, (...args: unknown[]) => unknown> = {
    list: library.snapshot,
    refresh: library.refresh,
    upload: uploader.upload,
    cancelUpload: uploader.cancel,
    remove: (id) => {
      if (!validId(id)) throw new Error('本地歌曲标识无效')
      return library.remove(id)
    },
    resolve: (id) => {
      if (!validId(id)) throw new Error('本地歌曲标识无效')
      return library.resolve(id)
    },
    importFiles: async () => {
      const window = owner()!
      const result = await dialog.showOpenDialog(window, {
        title: '添加本地音乐',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: '音频文件', extensions }]
      })
      return result.canceled ? library.snapshot() : library.importPaths(result.filePaths)
    },
    importFolder: async () => {
      const result = await dialog.showOpenDialog(owner()!, {
        title: '添加音乐文件夹',
        properties: ['openDirectory']
      })
      return result.canceled ? library.snapshot() : library.importPaths([], result.filePaths)
    },
    relocate: async (id) => {
      if (!validId(id)) throw new Error('本地歌曲标识无效')
      const result = await dialog.showOpenDialog(owner()!, {
        title: '重新定位音乐文件',
        properties: ['openFile'],
        filters: [{ name: '音频文件', extensions }]
      })
      return result.canceled ? library.snapshot() : library.relocate(id, result.filePaths[0])
    }
  }
  for (const [name, handler] of Object.entries(handlers)) {
    ipcMain.handle('local-music:' + name, (event, ...args) => {
      const window = owner()
      if (
        !window ||
        window.isDestroyed() ||
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame
      )
        throw new Error('不允许访问本地资料库')
      return handler(...args)
    })
  }
}
