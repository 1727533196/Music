import {onMounted} from 'vue';

export type ListenerName = 'changeSong' | 'handleFirstLoad' | 'cutSong'

export const useListener = (audio: any) => {
  onMounted(() => {
    // 歌曲资源切换完成时
    audio.value?.addEventListener('loadeddata', () => {
      console.log('歌曲切换')
      executeListener('changeSong')
    })
    // 事件处理函数
    function onFirstLoad() {
      console.log('首次设置src，进行初始化操作...');
      executeListener('handleFirstLoad')
      audio.value?.removeEventListener('loadedmetadata', onFirstLoad)
    }

    // 监听loadedmetadata事件
    audio.value.addEventListener('loadedmetadata', onFirstLoad);
  })

  const listenerObj = {
    changeSong: [], // 歌曲切换
    handleFirstLoad: [], //  首次设置src，进行初始化操作
    cutSong: [],
  }
  const tempListener = {
    changeSong: [], // 歌曲切换
    handleFirstLoad: [], //  首次设置src，进行初始化操作
    cutSong: [],
  }

  const addListener = (listener: ListenerName, cb) => {
    listenerObj[listener].push(cb)
    tempListener[listener].push(cb)
  }
  const executeListener = (listener: ListenerName) => {
    const len = listenerObj[listener].length
    if(len < 1) {
      return
    }
    for(let i = 0; i < len; i++) {
      listenerObj[listener][i]()
    }
  }
  const pauseSomethingListener = (listener: ListenerName) => {
    // 为防止多次清除数据导致的temp没有数据
    if(listenerObj[listener].length > 0) {
      tempListener[listener] = listenerObj[listener]
      listenerObj[listener] = []
    }
  }
  const playSomethingListener = (listener: ListenerName) => {
    listenerObj[listener] = tempListener[listener] || []
  }

  return {
    addListener,
    executeListener,
    pauseSomethingListener,
    playSomethingListener,
  }
}
