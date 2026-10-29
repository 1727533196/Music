<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, reactive, UnwrapRef, watch } from 'vue'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import ProgressBar from '@/components/MusicPlayer/ProgressBar.vue'
import { GetMusicDetailData } from '@/api/musicList'
import DetailLeft from '@/components/MusicPlayer/DetailLeft.vue'
import DetailCenter from '@/components/MusicPlayer/DetailCenter.vue'
import DetailRight from '@/components/MusicPlayer/DetailRight.vue'
import DetailControls from '@/components/MusicPlayer/DetailControls.vue'
import { ListenerName, useListener } from '@/components/MusicPlayer/listener'
import usePlayList, { playListState } from '@/layout/BaseAside/usePlayList'
import '@lrc-player/core/dist/style.css'
import Player from '@lrc-player/core'
import { useFlags } from '@/store/flags'
import { reloadAudioSource } from '@/utils/musicSource'
import { ElMessage } from 'element-plus'

const orderStatus = ['icon-xihuan5', 'icon-xunhuan', 'icon-suijibofang', 'icon-danquxunhuan']
type userAudio = {
  play: (lengthen?: boolean) => Promise<undefined>
  pause: (isNeed?: boolean, lengthen?: boolean) => Promise<undefined>
} & Omit<HTMLAudioElement, 'pause' | 'play'>

export interface MusicPlayerInstanceType {
  el: UnwrapRef<userAudio>
  isPlay: UnwrapRef<boolean>
  reset: (val: boolean) => void
  pause: typeof pause
  play: typeof play
  time: number
  oldTime: number
  transitionIsPlay: UnwrapRef<boolean>
  addListener: (listener: ListenerName) => void
  cutSongHandler: () => void
}
interface Props {
  src: string
  ids?: number[]
  songs: GetMusicDetailData
}
const store = useUserInfo()
const props = defineProps<Props>()
const emit = defineEmits(['playEnd', 'cutSong'])
const isPlay = ref(false)
const audio = ref<userAudio>()
const music = useMusicAction()
const flags = useFlags()
const transitionIsPlay = ref(false)
const { addListener, executeListener, pauseSomethingListener } = useListener(audio)
const { getPlayListDetailFn } = usePlayList()
const player = new Player({
  click
})
function click(time: number, index: number) {
  setPlaybackTime(time)
}
function seeked() {
  if (timeState.stop || !isPlay.value || !music.state.lyric?.length) return
  player.syncIndex()
}
let originPlay: HTMLMediaElement['play']
let originPause: HTMLMediaElement['pause']
let pendingPlay: Promise<undefined> | null = null
let playController: AbortController | null = null
let resumeTime: number | null = null
let playbackRevision = 0

function cancelPendingPlay() {
  playbackRevision++
  playController?.abort()
  playController = null
  pendingPlay = null
}

watch(
  () => props.songs.id,
  () => {
    cancelPendingPlay()
    resumeTime = null
  }
)

function setPlaybackTime(time: number) {
  if (resumeTime !== null) {
    resumeTime = time
    music.state.currentTime = time
  }
  try {
    audio.value!.currentTime = time
  } catch (error) {
    console.error('设置time时出现了错误: ', error, ',time: ', time)
  }
}

onMounted(() => {
  player.mount(document.querySelector('.lyric-container') as HTMLDivElement, audio.value)
  originPlay = audio.value!.play as HTMLMediaElement['play']
  originPause = audio.value!.pause as HTMLMediaElement['pause']
  // 播放，音量过渡提高
  audio.value!.play = play
  // 音量过渡减少为0，然后暂停
  audio.value!.pause = pause

  audio.value?.addEventListener('error', (event: any) => {
    // console.log('event.target.error', event.target.error)
    if (event.target.error.code === 4) {
    }
  })
})
onUnmounted(() => {
  cancelPendingPlay()
  clearInterval(timer)
  player.uninstall()
})

function play(lengthen: boolean = false): Promise<undefined> {
  if (pendingPlay) return pendingPlay
  playbackRevision++
  clearInterval(timer)
  finishTransition?.()
  const controller = new AbortController()
  playController = controller
  isPlay.value = true
  const task = startPlayback(lengthen, controller.signal).finally(() => {
    if (playController === controller) {
      pendingPlay = null
      playController = null
    }
  })
  pendingPlay = task
  return task
}

async function startPlayback(lengthen: boolean, signal: AbortSignal): Promise<undefined> {
  const element = audio.value!
  const songId = music.state.songs.id
  const isCurrent = () => !signal.aborted && music.state.songs.id === songId
  try {
    const expired = music.isMusicUrlExpired()
    const restoring = expired || resumeTime !== null
    if (restoring) {
      resumeTime ??= element.currentTime
      timeState.stop = true
      element.oncanplay = null
      if (expired && !(await music.refreshMusicUrl(signal))) return
      if (!isCurrent()) return
      await nextTick()
      if (!isCurrent()) return
      await reloadAudioSource(element, () => resumeTime ?? element.currentTime, signal)
      if (!isCurrent()) return
    }
    if (music.state.load) {
      cutSongHandler()
      music.state.load = false
    }
    element.volume = 0
    await originPlay.call(element)
    if (!isCurrent()) return
    resumeTime = null
    timeState.stop = false
    music.state.currentTime = element.currentTime
    if (music.state.lyric?.length) {
      // 暂停期间也可能调整进度，恢复时统一按当前音频时间校准歌词。
      player.syncIndex()
    }
    transitionIsPlay.value = true
    await transitionVolume(store.volume, true, lengthen)
  } catch (error) {
    if (!isCurrent()) return
    isPlay.value = false
    transitionIsPlay.value = false
    player.pause()
    originPause.call(element)
    if (resumeTime !== null) music.state.musicUrlExpiresAt = 0
    console.error('恢复播放失败:', error)
    ElMessage.error('播放失败，请稍后重试')
  }
  return undefined
}

function pause(isNeed: boolean = true, lengthen: boolean = false) {
  cancelPendingPlay()
  const revision = playbackRevision
  audio.value!.oncanplay = null
  let volume = store.volume
  // 是否需要更新暂停标识， 什么时候不需要，就比如切换下一首歌的时候:
  // 这个时候会先调用pause暂停上一首进行过渡，然后在调用play播放，这个时候就不需要更新暂停标识
  isNeed && (isPlay.value = false)
  return transitionVolume(volume, false, lengthen).then(() => {
    if (revision !== playbackRevision) return undefined
    player.pause()
    // 暂停时应该等待音量过渡完成在改变，让逐字歌词也有一个暂停过渡效果
    transitionIsPlay.value = false
    return undefined
  })
}
let timer: ReturnType<typeof setInterval>
let finishTransition: (() => void) | undefined
// 当过渡完成时会返回Promise
function transitionVolume(
  volume: number,
  target: boolean = true,
  lengthen: boolean = false
): Promise<undefined> {
  clearInterval(timer)
  finishTransition?.()
  const playVolume = lengthen ? 40 : 15
  const pauseVolume = lengthen ? 20 : 10
  return new Promise((resolve) => {
    finishTransition = () => resolve(undefined)
    if (target) {
      timer = setInterval(() => {
        audio.value!.volume = Math.min(audio.value!.volume + volume / playVolume, volume)
        if (audio.value!.volume >= volume) {
          resolve(undefined)
          clearInterval(timer)
        }
      }, 50)
      return
    }
    timer = setInterval(() => {
      audio.value!.volume = Math.max(audio.value!.volume - volume / pauseVolume, 0)
      if (audio.value!.volume <= 0) {
        clearInterval(timer)
        originPause.call(audio.value)
        audio.value!.volume = volume
        resolve(undefined)
      }
    }, 50)
  })
}

const timeState = reactive({
  stop: false,
  previousTime: 0 // 新增属性来保存旧的 currentTime
})

const timeupdate = () => {
  if (timeState.stop || isNaN($audio.el.duration)) {
    return
  }
  // 在更新 currentTime 之前，保存旧的值
  timeState.previousTime = music.state.currentTime
  music.state.currentTime = $audio.time
}

const reset = (val: boolean) => {
  cancelPendingPlay()
  resumeTime = null
  music.state.currentTime = 0
  isPlay.value = val
  transitionIsPlay.value = val
  // 这里需要停止timeupdate的事件监视，因为在暂停音乐时会过渡结束（就相当于还是在播放一段时间），
  //  这样会导致进度条进度重置不及时
  timeState.stop = true // 在每次play方法时都会重置stop值
}
const end = () => {
  emit('playEnd')
}
const setOrderHandler = () => {
  const runtimeList = music.state.runtimeList

  let newValue = (music.state.orderStatusVal + 1) % orderStatus.length

  // 如果上一次是心动模式并且当前播放的列表是”我喜欢的“，这次切换为其他，则重新获取”我喜欢的“列表,并更新进行时列表
  if (runtimeList?.specialType === 5 && music.state.orderStatusVal === 0 && newValue !== 0) {
    getPlayListDetailFn(runtimeList.id, '', false)
    music.updateTracks(
      playListState.playList,
      playListState.playList.map((item) => item.id)
    )
  }

  // 如果当前播放歌单不是”我喜欢的“列表，则心动模式不可用
  music.state.orderStatusVal =
    newValue === 0 && runtimeList?.specialType !== 5
      ? 1
      : (newValue as typeof music.state.orderStatusVal)

  music.getIntelliganceListHandler()
}

// 执行切换事件，随后暂停time监听器，等待歌曲加载完成后会打开
const cutSongHandler = () => {
  const type = music.state.lrcMode === 1 ? 'lrc' : 'yrc'
  if (music.state.lyric?.length) {
    player.updateAudioLrc(music.state.lyric, type)
  }
  executeListener('cutSong')
}

const exposeObj = {
  el: audio,
  isPlay,
  reset,
  play,
  pause,
  transitionIsPlay,
  addListener,
  cutSongHandler
}
Object.defineProperty(exposeObj, 'time', {
  get(): number {
    return audio.value!.currentTime
  },
  set(time: number) {
    setPlaybackTime(time)
  }
})
Object.defineProperty(exposeObj, 'oldTime', {
  get(): number {
    return timeState.previousTime
  }
})
defineExpose(exposeObj)
</script>

<template>
  <div class="bottom-container" :class="{ 'detail-player': flags.isOpenDetail }">
    <audio
      @timeupdate="timeupdate"
      @ended="end"
      @seeked="seeked"
      ref="audio"
      class="plyr-audio"
      :src="props.src"
      preload="auto"
    />
    <DetailControls
      v-show="flags.isOpenDetail"
      :songs="props.songs"
      :isPlay="isPlay"
      @play="play"
      @pause="pause"
      @cutSong="(val) => emit('cutSong', val)"
      @setOrderHandler="setOrderHandler"
    />
    <div v-show="!flags.isOpenDetail" class="compact-player">
      <DetailLeft :songs="props.songs" />
      <DetailCenter
        :orderStatus="orderStatus"
        :isPlay="isPlay"
        :orderStatusVal="music.state.orderStatusVal"
        @play="play"
        @pause="pause"
        @cutSong="(val) => emit('cutSong', val)"
        @setOrderHandler="setOrderHandler"
      />
      <DetailRight :currentTime="music.state.currentTime" :songs="props.songs" :audio="audio" />
    </div>
  </div>
  <div v-if="!flags.isOpenDetail" class="plan-container">
    <ProgressBar :songs="props.songs" />
  </div>
</template>

<style lang="less">
.plan-container {
  display: flex;
  align-items: center;
  height: 15px;
  position: absolute;
  top: -8.5px;
  width: 100%;
}
.el-overlay {
  .music-drawer {
    background-image: url('../../assets/defaultBg.png');
    .bgSetting();
  }
}
</style>
<style lang="less" scoped>
:deep(.el-drawer) {
  height: 100%;
}
.bottom-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 15px;
  backdrop-filter: blur(60px) saturate(210%);
}
.bottom-container.detail-player {
  display: block;
  height: auto;
  padding: 0;
  backdrop-filter: none;
}
.compact-player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}
</style>
