import { watch } from 'vue'
import { useMusicAction } from '@/store/music'
import type { DesktopLyricLine } from '../../../shared/desktopLyrics'

// 解析库的普通歌词和逐字歌词都以秒为单位，只在同步边界转为毫秒。
export function desktopLyricLines(input: unknown, durationMs: number): DesktopLyricLine[] {
  if (!Array.isArray(input)) return []
  if ('notSupportedScroll' in input && input.notSupportedScroll) return []
  const lines: DesktopLyricLine[] = input
    .filter((line) => Number.isFinite(line.time))
    .map((line) => {
      const startMs = Math.max(0, Number(line.time) * 1000)
      const words = Array.isArray(line.yrc)
        ? line.yrc
            .filter((word) => Number.isFinite(word.cursor) && Number.isFinite(word.transition))
            .map((word) => ({
              text: String(word.text ?? ''),
              startMs: word.cursor * 1000,
              endMs: (word.cursor + Math.max(0, word.transition)) * 1000
            }))
        : []
      return {
        startMs,
        endMs: startMs + Math.max(0, Number(line.duration) || 0) * 1000,
        text: words.length ? words.map((word) => word.text).join('') : String(line.text ?? ''),
        words
      }
    })
    .sort((a, b) => a.startMs - b.startMs)
  lines.forEach((line, i) => {
    if (line.endMs <= line.startMs)
      line.endMs = lines[i + 1]?.startMs ?? Math.max(durationMs, line.startMs + 5000)
  })
  return lines
}

export function connectDesktopLyrics(element: HTMLAudioElement): () => void {
  const api = window.desktopLyrics,
    publisher = window.lyricPublisher
  if (!api || !publisher) return () => {}
  const music = useMusicAction()
  let revision = 0,
    sequence = 0,
    enabled = false,
    connected = false,
    stopped = false,
    buffering = false
  let timer: ReturnType<typeof setInterval> | undefined
  const publishClock = () => {
    if (!connected || !enabled || stopped) return
    // 切歌期间音频元素可能仍指向上一首，不能把旧歌曲的进度发给新歌词。
    const current = !!music.state.musicUrl && element.getAttribute('src') === music.state.musicUrl
    publisher.clock({
      revision,
      sequence: ++sequence,
      positionMs: current ? (element.currentTime || 0) * 1000 : 0,
      sampledAt: Date.now(),
      rate: element.playbackRate || 1,
      playing: current && !element.paused && !element.ended,
      buffering: !current || buffering || element.seeking || element.readyState < 3
    })
  }
  const publishTrack = () => {
    if (!connected || !enabled || stopped) return
    revision++
    publisher.track({
      revision,
      id: String(music.state.songs.id || ''),
      title: music.state.songs.name || '',
      artist: music.state.songs.ar?.map((artist) => artist.name).join(' / ') || '',
      loading: music.lyricLoading,
      trial: music.state.sourceTrial,
      lines: desktopLyricLines(music.state.lyric, Number(music.state.songs.dt) || 0)
    })
    publishClock()
  }
  const applyEnabled = (value: boolean) => {
    if (value === enabled && timer && connected) return
    clearInterval(timer)
    enabled = value
    if (!enabled || !connected || stopped) return
    publishTrack()
    timer = setInterval(publishClock, 250)
  }
  const stopState = api.onState((state) => applyEnabled(state.enabled))
  const stopWatch = watch(
    [
      () => music.state.songs.id,
      () => music.state.lyric,
      () => music.lyricLoading,
      () => music.state.sourceTrial
    ],
    publishTrack,
    { flush: 'post' }
  )
  const eventNames = [
    'playing',
    'play',
    'pause',
    'waiting',
    'seeking',
    'seeked',
    'ratechange',
    'ended',
    'emptied',
    'loadedmetadata'
  ]
  const onEvent = (event: Event) => {
    if (event.type === 'waiting' || event.type === 'emptied') buffering = true
    if (event.type === 'playing' || event.type === 'seeked' || event.type === 'loadedmetadata')
      buffering = false
    publishClock()
  }
  eventNames.forEach((name) => element.addEventListener(name, onEvent))
  const stopCommand = publisher.onCommand((command) => {
    if (command === 'play-pause' && music.state.musicUrl) {
      if (window.$audio.isPlay) void window.$audio.pause()
      else void window.$audio.play()
    } else if (command === 'next') music.cutSongHandler(true)
    else if (command === 'previous') music.cutSongHandler(false)
  })
  void publisher
    .connect()
    .then(() => api.getSnapshot())
    .then((snapshot) => {
      if (stopped) return
      connected = true
      applyEnabled(snapshot.settings.enabled)
    })
    .catch((error) => console.error('桌面歌词连接失败', error))
  return () => {
    stopped = true
    clearInterval(timer)
    stopState()
    stopWatch()
    stopCommand()
    eventNames.forEach((name) => element.removeEventListener(name, onEvent))
  }
}
