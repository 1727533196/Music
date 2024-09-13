<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import '@lrc-player/core/dist/style.css'
import Player from '@lrc-player/core'
import {getLyric, getMusicUrl} from "@/api/musicList";
import {parseLrc} from "@lrc-player/parse";

const ids = [
  186005,
  1859245776,
  512621132,
  1367900235,
  17793611,
  26499472,
  1382576173,
  1382781549,
  491294478,
  2131317056,
  5249178,
  1297498908,
  2130074493,
  33340727,
  1913874332,
  38019092,
  1819100221,
  1887439185,
  565825902,
  19567986,
  1958557540,
  1407187587,
  28461933,
  1446828061,
  863046037,
  1334248867,
  35847559,
  34228719,
  1494752189,
  1497588709,
  434974661,
  1394847947,
  511364880,
  27583305,
  434656606,
  1451998397,
  1876395183,
  28814030,
  4173190
]

const audio = ref<HTMLAudioElement>()
let oldTime = 0
let time = 0
const index = ref(0)

function isPlaying(audioElement: HTMLAudioElement | null): boolean {
  if (!audioElement) return false;
  return !audioElement.paused && audioElement.currentTime > 0 && !audioElement.ended;
}
const click = (time: number, i: number) => {
  if(!isPlaying(audio.value)) {
    audio.value?.play()
  }
  index.value = i
  audio.value!.currentTime = time
}
let player = new Player({
  click
})
const url = ref()
let timer = 0

console.log(123)
onMounted(() => {
  console.log('audio.value', audio.value, document.querySelector('.test123'))

  audio.value!.volume = 0.2
  player.mount(document.querySelector('.test123'), audio.value)

  init()
})

onUnmounted(() => {
  player.uninstall()
  player = null
  console.log('Unmounted')
})

const init = async () => {
  const id = ids[timer]
  timer += 1

  const res = await getMusicUrl(id)
  url.value = res.data[0].url
  const res2 = await getLyric(id)
  const lrc = parseLrc(res2.yrc.lyric)
  audio.value?.play()

  player.updateAudioLrc(lrc, 'lrc')
}
const play = () => {
  player.play()
}
const pause = () => {
  player.pause()
}

const seeked = () => {
  audio.value?.play()
  player.syncIndex()
}


</script>

<template>
  <div class="test123"></div>
  <audio @seeked="seeked"  ref="audio" @play="play" @pause="pause" controls :src="url"></audio>
  <BaseButton @click="init()">下一首</BaseButton>
</template>

<style lang="less">
.test123 {
  height: 80%;
  width: 100%;
}
</style>
