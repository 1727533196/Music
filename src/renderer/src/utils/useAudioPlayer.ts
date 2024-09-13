function useAudioPlayer() {
  let audioContext: AudioContext
  let musicSource: AudioBufferSourceNode

  const init = () => {
    audioContext = new window.AudioContext()
    // 创建音乐源节点
    musicSource = audioContext.createBufferSource();
  }
  init()

  const setMusicSource = (src: string) => {
    // 通过XHR或Fetch API获取音频数据
    fetch(src)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        if(musicSource) {
          musicSource.buffer = audioBuffer;
          musicSource.connect(audioContext.destination);
          play()
        }
      })
      .catch(error => console.error('Error with decoding audio data', error));
  }

  // 开始播放音乐
  const play = () => {
    musicSource.start(0);
  }

  // 停止播放音乐
  const stop = () => {
    musicSource.stop();
  }

  return {
    setMusicSource,
    play,
    stop,
  }
}

export default useAudioPlayer



