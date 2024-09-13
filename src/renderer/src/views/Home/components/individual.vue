<script setup lang="ts">
import {reactive} from "vue";
import {Recommend, recommendSongList} from "@/api/home";
import CardChunk from '@/components/CardChunk/index.vue'
import {useRouter} from "vue-router";
import recommendImage from '@/assets/recommend.png'

const recommendSongs = 'recommendSongs'
interface State {
  recommend: Recommend[]
  loading: boolean
}
const state = reactive<State>({
  recommend: [],
  loading: false,
})
const router = useRouter()
async function init() {
  state.loading = true
  const {recommend} = await recommendSongList()
  state.loading = false
  state.recommend = recommend
}
init()

const playDetailList = (item: Recommend | typeof recommendSongs) => {
  // 类型保护
  const id = (<Recommend>item).id || item
  router.push(`/daily-recommend?id=${id}`)
}
</script>

<template>
  <div v-loading="state.loading" class="container">
    <CardChunk @click="playDetailList" :recommend="state.recommend" title="推荐歌单">
      <Card :is-click="true" @click="playDetailList(recommendSongs)" name="每日歌曲推荐" :pic-url="recommendImage"></Card>
    </CardChunk>
  </div>
</template>

<style lang="less" scoped>
.container {

}
</style>
