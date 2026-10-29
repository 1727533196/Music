const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '../..')
process.chdir(root)
const { test } = require('node:test')
const Vue = require(path.join(root, 'node_modules/vue'))
const { parse, compileScript } = require(path.join(root, 'node_modules/@vue/compiler-sfc'))
const { transformSync } = require(path.join(root, 'node_modules/esbuild'))
const flush = async () => {
  await Vue.nextTick()
  await new Promise(setImmediate)
  await Vue.nextTick()
}
function deferred() {
  let resolve, reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}
function fixture() {
  const calls = {
    url: [],
    scrobble: 0,
    lyric: 0,
    cover: 0,
    play: 0,
    pause: 0,
    load: 0,
    sync: 0,
    errors: []
  }
  const pending = []
  const contexts = []
  const mediaHandlers = new Map()
  const mounted = [],
    unmounted = []
  let now = 1_800_000_000_000,
    handle = 0
  const timers = new Map()
  const schedule = (fn, ms, repeat) => {
    const id = ++handle
    timers.set(id, { fn, at: now + ms, ms, repeat })
    return id
  }
  const clock = {
    Date: class extends Date {
      static now() {
        return now
      }
    },
    setTimeout: (fn, ms) => schedule(fn, ms, false),
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, true),
    clearInterval: (id) => timers.delete(id),
    async advance(ms) {
      const end = now + ms
      await flush()
      while (true) {
        let target
        for (const [id, timer] of timers)
          if (timer.at <= end && (!target || timer.at < target[1].at)) target = [id, timer]
        if (!target) break
        const [id, timer] = target
        now = timer.at
        if (timer.repeat) timer.at += timer.ms
        else timers.delete(id)
        timer.fn()
        await flush()
      }
      now = end
      await flush()
    }
  }
  class Audio extends EventTarget {
    get [Symbol.toStringTag]() {
      return 'HTMLAudioElement'
    }
    currentTime = 83.25
    duration = 240
    volume = 0.5
    paused = true
    oncanplay = null
    autoMetadata = true
    nativeFailure = false
    play() {
      calls.play++
      if (this.nativeFailure) return Promise.reject(new Error('native play rejected'))
      this.paused = false
      return Promise.resolve()
    }
    pause() {
      calls.pause++
      this.paused = true
    }
    load() {
      calls.load++
      this.currentTime = 0
      if (this.autoMetadata) queueMicrotask(() => this.metadata())
    }
    metadata() {
      this.dispatchEvent(new Event('loadedmetadata'))
      this.oncanplay?.()
    }
  }
  const audio = new Audio()
  const profile = { volume: 0.5, profile: { userId: 1 } }
  const api = {
    getMusicUrl: (id) => {
      calls.url.push(id)
      const task = pending.shift()
      return (
        task?.promise ??
        Promise.resolve({ data: [{ url: 'fresh-' + id, expi: 600, time: 240000 }] })
      )
    },
    getMusicDetail: async () => ({ songs: [] }),
    getLyric: async () => {
      calls.lyric++
      return { lrc: { lyric: '' } }
    },
    getDynamicCover: async () => {
      calls.cover++
      return { data: {} }
    },
    updateScrobble: () => {
      calls.scrobble++
    },
    getIntelliganceList: async () => ({ data: [] })
  }
  const globals = {
    ...clock,
    console: {
      log() {},
      error(...args) {
        calls.errors.push(args)
      }
    },
    AbortController,
    AbortSignal,
    DOMException,
    EventTarget,
    Event,
    queueMicrotask,
    navigator: {
      mediaSession: { setActionHandler: (name, handler) => mediaHandlers.set(name, handler) }
    },
    MediaMetadata: class {
      constructor(data) {
        Object.assign(this, data)
      }
    },
    document: { querySelector: () => ({}) },
    localStorage: { setItem() {} },
    window: {}
  }
  let music, instance
  const vueMock = {
    ...Vue,
    onMounted: (cb) => mounted.push(cb),
    onUnmounted: (cb) => unmounted.push(cb)
  }
  class Player {
    mount() {}
    play() {}
    pause() {}
    uninstall() {}
    syncIndex() {
      calls.sync++
    }
    updateAudioLrc() {}
  }
  const evaluate = (source, mocks, filename) => {
    const code = transformSync(source, { loader: 'ts', format: 'cjs', target: 'es2022' }).code
    const exports = {}
    const context = {
      ...globals,
      module: { exports },
      exports,
      require(name) {
        if (name in mocks) return mocks[name]
        if (name.endsWith('.vue') || name.endsWith('.css')) return {}
        throw Error('Unexpected module ' + name)
      }
    }
    const sandbox = vm.createContext(context)
    contexts.push(sandbox)
    vm.runInContext(code, sandbox, { filename })
    return { exports: sandbox.module.exports, sandbox }
  }
  const helper = evaluate(
    fs.readFileSync('src/renderer/src/utils/musicSource.ts', 'utf8'),
    {},
    'musicSource.ts'
  ).exports
  music = evaluate(
    fs.readFileSync('src/renderer/src/store/music.ts', 'utf8'),
    {
      vue: vueMock,
      pinia: { defineStore: (_, setup) => () => (instance ??= setup()) },
      '@/api/musicList': api,
      '@lrc-player/parse': { parseLrc: () => [], parseYrc: () => [] },
      '@/utils': { randomNum: () => 0 },
      '@/store/index': { useUserInfo: () => profile },
      '@/utils/musicSource': helper
    },
    'store/music.ts'
  ).exports.useMusicAction()
  const song = (id) => ({
    id,
    name: 'Song ' + id,
    ar: [{ name: 'Artist' }],
    al: { name: 'Album', picUrl: '' }
  })
  Object.assign(music.state, {
    songs: song(1),
    musicUrl: 'old-1',
    musicUrlExpiresAt: clock.Date.now() + 570000,
    currentTime: 83.25,
    load: false,
    lyric: [{ time: 0, text: 'lyric', line: 0 }]
  })
  const props = Vue.reactive({
    get songs() {
      return music.state.songs
    },
    get src() {
      return music.state.musicUrl
    }
  })
  const { descriptor } = parse(
    fs.readFileSync('src/renderer/src/components/MusicPlayer/index.vue', 'utf8')
  )
  const compiled = compileScript(descriptor, { id: 'resume-check' })
  const component = evaluate(
    compiled.content,
    {
      vue: vueMock,
      '@/store': { useUserInfo: () => profile },
      '@/store/music': { useMusicAction: () => music },
      '@/components/MusicPlayer/listener': {
        useListener: () => ({ addListener() {}, executeListener() {} })
      },
      '@/layout/BaseAside/usePlayList': {
        __esModule: true,
        default: () => ({ getPlayListDetailFn() {} }),
        playListState: {}
      },
      '@lrc-player/core': { __esModule: true, default: Player },
      '@/store/flags': { useFlags: () => ({}) },
      '@/utils/musicSource': helper,
      'element-plus': { ElMessage: { error: (message) => calls.errors.push(message) } }
    },
    'MusicPlayer.vue'
  )
  let exposed
  const bindings = component.exports.default.setup(props, {
    expose: (value) => (exposed = value),
    emit() {}
  })
  exposed.el.value = audio
  const facade = Vue.proxyRefs(exposed)
  globals.$audio = facade
  globals.window.$audio = facade
  component.sandbox.$audio = facade
  contexts.forEach((context) => {
    context.$audio = facade
  })
  mounted.forEach((cb) => cb())
  return {
    audio,
    music,
    facade,
    bindings,
    calls,
    pending,
    clock,
    helper,
    song,
    mediaHandlers,
    async cleanup() {
      unmounted.forEach((cb) => cb())
      await flush()
    }
  }
}
const make = fixture
function check(name, run) {
  test(name, run)
}
check('URL lifetime uses expi, safety margin, and 10-minute fallback', async () => {
  const f = make()
  assert.equal(f.helper.getMusicUrlExpiresAt(1200, 1000), 1171000)
  assert.equal(f.helper.getMusicUrlExpiresAt(undefined, 1000), 571000)
  assert.equal(f.helper.getMusicUrlExpiresAt(0, 1000), 571000)
  await f.cleanup()
})
check('Short pause keeps source and current playback position', async () => {
  const f = make()
  const task = f.facade.play()
  await f.clock.advance(1000)
  await task
  assert.equal(f.calls.url.length, 0)
  assert.equal(f.calls.load, 0)
  assert.equal(f.audio.currentTime, 83.25)
  assert.equal(f.facade.isPlay, true)
  await f.cleanup()
})
check(
  '20-minute pause refreshes once and resumes original position without song side effects',
  async () => {
    const f = make()
    await f.clock.advance(20 * 60000)
    const task = f.facade.play()
    assert.equal(f.facade.play(), task)
    await f.clock.advance(1000)
    await task
    assert.deepEqual(f.calls.url, [1])
    assert.equal(f.calls.load, 1)
    assert.equal(f.calls.play, 1)
    assert.equal(f.audio.currentTime, 83.25)
    assert.equal(f.music.state.currentTime, 83.25)
    assert.equal(f.calls.scrobble, 0)
    assert.equal(f.calls.lyric, 0)
    assert.equal(f.calls.cover, 0)
    assert.equal(f.calls.sync, 1)
    assert.equal(f.facade.isPlay, true)
    await f.cleanup()
  }
)
check('Old cached URL without expiry is refreshed on explicit play', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  const task = f.facade.play()
  await f.clock.advance(1000)
  await task
  assert.equal(f.calls.url.length, 1)
  await f.cleanup()
})
check('Pause while URL request is pending cancels automatic resume and source update', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  const network = deferred()
  f.pending.push(network)
  const play = f.facade.play()
  const pause = f.facade.pause()
  network.resolve({ data: [{ url: 'late', expi: 600 }] })
  await f.clock.advance(1000)
  await Promise.all([play, pause])
  assert.equal(f.music.state.musicUrl, 'old-1')
  assert.equal(f.calls.play, 0)
  assert.equal(f.facade.isPlay, false)
  assert.equal(f.audio.currentTime, 83.25)
  await f.cleanup()
})
check('Switching songs during refresh cannot overwrite the new song URL', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  const network = deferred()
  f.pending.push(network)
  const play = f.facade.play()
  f.music.state.songs = f.song(2)
  f.music.state.musicUrl = 'new-song-url'
  network.resolve({ data: [{ url: 'late-old-song', expi: 600 }] })
  await flush()
  await play
  assert.equal(f.music.state.musicUrl, 'new-song-url')
  assert.equal(f.calls.play, 0)
  await f.cleanup()
})
check('Failed refresh keeps progress paused and retry can recover', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  const network = deferred()
  f.pending.push(network)
  const failed = f.facade.play()
  network.reject(new Error('network offline'))
  await failed
  assert.equal(f.facade.isPlay, false)
  assert.equal(f.music.state.currentTime, 83.25)
  assert.equal(f.audio.currentTime, 83.25)
  const retry = f.facade.play()
  await f.clock.advance(1000)
  await retry
  assert.equal(f.calls.url.length, 2)
  assert.equal(f.audio.currentTime, 83.25)
  assert.equal(f.facade.isPlay, true)
  await f.cleanup()
})
check('Pause during metadata load preserves progress and next play restores it', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.audio.autoMetadata = false
  const play = f.facade.play()
  await flush()
  assert.equal(f.calls.load, 1)
  f.bindings.timeupdate()
  assert.equal(f.music.state.currentTime, 83.25)
  const pause = f.facade.pause()
  await f.clock.advance(1000)
  await Promise.all([play, pause])
  assert.equal(f.calls.play, 0)
  f.audio.autoMetadata = true
  const retry = f.facade.play()
  await f.clock.advance(1000)
  await retry
  assert.equal(f.calls.url.length, 1)
  assert.equal(f.audio.currentTime, 83.25)
  assert.equal(f.facade.isPlay, true)
  await f.cleanup()
})
check('Metadata timeout resets playing state and allows URL retry', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.audio.autoMetadata = false
  const play = f.facade.play()
  await f.clock.advance(31000)
  await play
  assert.equal(f.facade.isPlay, false)
  assert.equal(f.music.state.currentTime, 83.25)
  assert.equal(f.music.state.musicUrlExpiresAt, 0)
  f.audio.autoMetadata = true
  const retry = f.facade.play()
  await f.clock.advance(1000)
  await retry
  assert.equal(f.calls.url.length, 2)
  assert.equal(f.audio.currentTime, 83.25)
  await f.cleanup()
})
check('Native play rejection resets state without animating lyrics', async () => {
  const f = make()
  f.audio.nativeFailure = true
  await f.facade.play()
  assert.equal(f.facade.isPlay, false)
  assert.equal(f.facade.transitionIsPlay, false)
  assert.equal(f.calls.sync, 0)
  await f.cleanup()
})
check('Immediate play after pause cancels stale volume fade and lyric pause', async () => {
  const f = make()
  const first = f.facade.play()
  await f.clock.advance(1000)
  await first
  const pause = f.facade.pause()
  const resume = f.facade.play()
  await f.clock.advance(1000)
  await Promise.all([pause, resume])
  assert.equal(f.audio.paused, false)
  assert.equal(f.facade.isPlay, true)
  assert.equal(f.facade.transitionIsPlay, true)
  await f.cleanup()
})
check('Refreshing a source forces reload even when API returns identical URL', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.pending.push({ promise: Promise.resolve({ data: [{ url: 'old-1', expi: 600 }] }) })
  const play = f.facade.play()
  await f.clock.advance(1000)
  await play
  assert.equal(f.calls.load, 1)
  assert.equal(f.audio.currentTime, 83.25)
  await f.cleanup()
})
check('Fresh shorter audio clamps playback position to new duration', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.audio.duration = 30
  const play = f.facade.play()
  await f.clock.advance(1000)
  await play
  assert.equal(f.audio.currentTime, 30)
  assert.equal(f.music.state.currentTime, 30)
  await f.cleanup()
})
check('Song load canplay callback is single use and pause removes it', async () => {
  const f = make()
  const loading = f.music.getMusicUrlHandler(f.song(2))
  await f.clock.advance(1000)
  await loading
  assert.equal(typeof f.audio.oncanplay, 'function')
  const auto = f.audio.oncanplay()
  assert.equal(f.audio.oncanplay, null)
  await f.clock.advance(1000)
  await auto
  const again = f.music.getMusicUrlHandler(f.song(3))
  await f.clock.advance(1000)
  await again
  assert.equal(typeof f.audio.oncanplay, 'function')
  const paused = f.facade.pause()
  assert.equal(f.audio.oncanplay, null)
  await f.clock.advance(1000)
  await paused
  assert.equal(f.facade.isPlay, false)
  await f.cleanup()
})
check('Instrumental song resumes without asking the lyric player for a missing line', async () => {
  const f = make()
  f.music.state.lyric = []
  f.music.state.musicUrlExpiresAt = 0
  const play = f.facade.play()
  await f.clock.advance(1000)
  await play
  assert.equal(f.facade.isPlay, true)
  assert.equal(f.calls.sync, 0)
  assert.equal(f.calls.errors.length, 0)
  await f.cleanup()
})
check('Manual seek after cancelling reload replaces the saved resume position', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.audio.autoMetadata = false
  const play = f.facade.play()
  await flush()
  const pause = f.facade.pause()
  await f.clock.advance(1000)
  await Promise.all([play, pause])
  f.facade.time = 120
  f.audio.autoMetadata = true
  const retry = f.facade.play()
  await f.clock.advance(1000)
  await retry
  assert.equal(f.audio.currentTime, 120)
  assert.equal(f.music.state.currentTime, 120)
  await f.cleanup()
})
check(
  'MediaSession fast seek during pending refresh preserves the latest requested position',
  async () => {
    const f = make()
    f.music.state.musicUrlExpiresAt = 0
    const network = deferred()
    f.pending.push(network)
    const play = f.facade.play()
    f.mediaHandlers.get('seekto')({ seekTime: 150, fastSeek: true })
    network.resolve({ data: [{ url: 'fresh-1', expi: 600 }] })
    await f.clock.advance(1000)
    await play
    assert.equal(f.audio.currentTime, 150)
    await f.cleanup()
  }
)
check('Missing playback URL leaves the original song paused and retryable', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.pending.push({ promise: Promise.resolve({ data: [{ url: null, expi: 600 }] }) })
  await f.facade.play()
  assert.equal(f.facade.isPlay, false)
  assert.equal(f.music.state.musicUrl, 'old-1')
  assert.equal(f.music.state.currentTime, 83.25)
  assert.equal(f.calls.play, 0)
  await f.cleanup()
})
check('Seeking while metadata is loading uses the latest requested playback position', async () => {
  const f = make()
  f.music.state.musicUrlExpiresAt = 0
  f.audio.autoMetadata = false
  const play = f.facade.play()
  await flush()
  assert.equal(f.calls.load, 1)
  f.facade.time = 170
  f.audio.metadata()
  await f.clock.advance(1000)
  await play
  assert.equal(f.audio.currentTime, 170)
  assert.equal(f.music.state.currentTime, 170)
  await f.cleanup()
})
