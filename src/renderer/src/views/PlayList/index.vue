<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import SongInfo from '@/components/SongInfo/index.vue'
import usePlayList, { playListState } from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { columns } from '@/views/PlayList/config'
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const music = useMusicAction()
const { getPlayListDetailFn } = usePlayList()
watch(
  () => route.fullPath,
  () => {
    if (route.query.id && route.path === '/play-list') {
      getPlayListDetailFn(+route.query.id!, route.query.type! as 'album')
      document.querySelector('.main')!.scrollTop = 0
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <SongInfo></SongInfo>
  <SongList
    @play="music.getMusicUrlHandler"
    :key="route.query.id"
    :columns="columns"
    :loading="playListState.loading"
    :songs="music.state.songs"
    :ids="playListState.ids"
    :list="playListState.playList"
    :list-info="playListState.listInfo"
    lazy
  />
</template>

<style lang="less" scoped></style>
