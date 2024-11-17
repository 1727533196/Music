<script setup lang="ts">
import { reactive } from 'vue'
import { Recommend, recommendSongList } from '@/api/home'
import { useRouter } from 'vue-router'
import recommendImage from '@/assets/recommend.png'
import AreaBox from '@/components/AreaBox/index.vue'
import Card from '@/components/Card/index.vue'
import SkeletonCard from '@/components/SkeletonCard/index.vue'

const recommendSongs = 'recommendSongs'
interface State {
  recommend: Recommend[]
  loading: boolean
}
const state = reactive<State>({
  recommend: [],
  loading: false
})
const router = useRouter()
async function init() {
  state.loading = true
  const { recommend } = await recommendSongList()
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
    <SkeletonCard :loading="state.loading">
      <AreaBox>
        <template v-slot:title>歌单</template>
        <Card
          :is-click="true"
          @click="playDetailList(recommendSongs)"
          name="每日歌曲推荐"
          :pic-url="recommendImage"
        ></Card>
        <Card
          v-for="item in state.recommend"
          :is-click="true"
          @click="playDetailList(item)"
          :name="item.name"
          :pic-url="item.picUrl"
        ></Card>
      </AreaBox>
    </SkeletonCard>
  </div>
</template>

<style lang="less" scoped>
.container {
}
</style>
