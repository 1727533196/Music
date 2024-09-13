<script setup lang="ts">
import LyricDisplay from "@/components/MusicDetail/LyricDisplay.vue";
import {parseLrc} from "@lrc-player/parse";
import {animation, Yrc} from "@/utils";
import {lyric} from "@/views/Test/mock";
import {onUnmounted, ref} from "vue";
import {getMusicUrl} from "@/api/musicList";

// 选择使用定时器实现

const lyr = ref<Yrc[]>([])
const currentLyrLine = ref({time: 0, line: 1, text: '0'})
const audio = ref<HTMLAudioElement>()
const url = ref('')

let stepIndex = 0
const time = ref()
const currentYrc = ref({})
const arrive = ref({})
function isPlaying(audioElement: HTMLAudioElement | null): boolean {
  if (!audioElement) return false;
  return !audioElement.paused && audioElement.currentTime > 0 && !audioElement.ended;
}
const init = () => {
  lyr.value = parseLrc(lyric)
  getMusicUrl('186004').then(res => {
    url.value = res.data[0].url
  })
  console.log(lyr.value)
}
init()
let id: NodeJS.Timer
const step = () => {
  if(!isPlaying(audio.value)) {
    return
  }
  const currentTime = parseFloat(audio.value.currentTime.toFixed(2));
  time.value = currentTime
  currentYrc.value = stepIndex !== 0 ? lyr.value[stepIndex - 1] : {}
  if(currentTime >= lyr.value[stepIndex].time) {
    currentLyrLine.value = lyr.value[stepIndex]
    stepIndex++
    arrive.value = currentTime
    alone(stepIndex-1)
    // cancelAnimationFrame(id)
    // return
  }
}
id = setInterval(step, 1)

function alone(i: number) {
  let itemIndex = 0
  let index = i
  let debug = false

  console.log('=======达到下一行=======')
  start()
  function start() {
    if(itemIndex > lyr.value[index].yrc.length - 1) {
      itemIndex = 0
      index++
      // id = requestAnimationFrame(step)
      return
    }

    const current = lyr.value[index].yrc[itemIndex]
    let delayTime = 0
    if(parseFloat(audio.value.currentTime.toFixed(2)) - (current.cursor) <= 0) {

    } else {
      delayTime = (parseFloat(audio.value.currentTime.toFixed(2)) - current.cursor) * 1000
    }
    const transition = lyr.value[index].yrc[itemIndex].transition * 1000 - delayTime
    // console.log(` 还未执行动画流时
    //           '歌曲时间:', ${parseFloat(audio.value.currentTime.toFixed(2))},
    //           '字的到达时间:', ${current.cursor }
    //           '延迟时间:', ${parseFloat(audio.value.currentTime.toFixed(2)) - (current.cursor)}
    //       `)
    const pause = animation(transition, (elapsed, done) => {
      current.width = elapsed / transition * 100 + '%'

      if(!debug) {
        debug = true
        // console.log(` 已进入动画流时
        //       '歌曲时间:', ${parseFloat(audio.value.currentTime.toFixed(2))},
        //       '字的到达时间:', ${current.cursor }
        //       '延迟时间:', ${parseFloat(audio.value.currentTime.toFixed(2)) - (current.cursor)}
        //   `)
      }
      if(done) {
        debug = false
        console.log(`
              '歌曲时间:', ${parseFloat(audio.value.currentTime.toFixed(2))},
              '字的到达时间:', ${current.cursor }
              '字的结束时间:', ${current.cursor + current.transition}
              '延迟时间:', ${parseFloat(audio.value.currentTime.toFixed(2)) - (current.cursor + current.transition)}
          `)
        // console.log('-----------------------------------')
        pause(true)
        itemIndex++
        start()
      }
    })
  }
}


onUnmounted(() => {
  clearInterval(id); // 清理动画帧请求
});
</script>

<template>
  <div style="position: absolute; z-index: 999;">
    <audio ref="audio" controls :src="url"></audio>
    <h2>当前时间：{{time}}</h2>
    <h2>下一个时间：{{currentYrc.time || '0'}}</h2>
    <h2>达到时的时间：{{arrive}}</h2>
    <h2>延迟时间：{{arrive - currentYrc.time}}s</h2>
    <base-button @click="() => audio.currentTime = 30">111</base-button>
  </div>
  <LyricDisplay
      :lrcMode="1"
      :lyric="lyr"
      :currentLyrLine="currentLyrLine"
      :is-blur="false"
  />
</template>

<style lang="less">

</style>
