const DEFAULT_URL_LIFETIME_SECONDS = 10 * 60

export function getMusicUrlExpiresAt(expi?: number, requestedAt = Date.now()): number {
  const lifetime =
    typeof expi === 'number' && Number.isFinite(expi) && expi > 0
      ? expi
      : DEFAULT_URL_LIFETIME_SECONDS
  // 在签名失效前刷新，给网络请求和音频加载留出余量。
  return requestedAt + lifetime * 1000 - Math.min(30_000, lifetime * 100)
}

export function reloadAudioSource(
  audio: HTMLMediaElement,
  getTime: () => number,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      audio.removeEventListener('loadedmetadata', onMetadata)
      audio.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const fail = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onAbort = () => fail(new DOMException('播放已取消', 'AbortError'))
    const onError = () => fail(new Error('音频链接加载失败'))
    const onMetadata = () => {
      try {
        const duration = audio.duration
        const time = getTime()
        audio.currentTime = Math.max(0, Number.isFinite(duration) ? Math.min(time, duration) : time)
        cleanup()
        resolve()
      } catch (error) {
        fail(error as Error)
      }
    }
    const timer = setTimeout(() => fail(new Error('音频链接加载超时')), 30_000)
    audio.addEventListener('loadedmetadata', onMetadata)
    audio.addEventListener('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }
    // 即使接口返回相同地址，也要清除媒体元素的旧错误并重新加载。
    try {
      audio.load()
    } catch (error) {
      fail(error as Error)
    }
  })
}
