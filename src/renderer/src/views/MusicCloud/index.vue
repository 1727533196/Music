<script setup lang="ts">
import { useMusicAction } from '@/store/music'
import { getUserCloud, GetUserCloudRes, GetUserCloudSong, PlayList } from '@/api/musicList'
import { columns } from './config'
import SongList from '@/components/SongList/index.vue'
import { reactive, ref } from 'vue'

const music = useMusicAction()
// GetUserCloudRes['data']
interface State {
  loading: boolean
  ids: number[]
  list: Omit<GetUserCloudSong, 'simpleSong'>[]
  listInfo: PlayList | object
  total: number
  page: number
  limit: number
}
type test = keyof GetUserCloudRes['data'][0]
const state: State = reactive({
  loading: true,
  ids: [],
  list: [],
  listInfo: {},
  total: 0,
  page: 1,
  limit: 100
})

getUserCloudFn()

async function getUserCloudFn() {
  state.loading = true
  const { data, count } = await getUserCloud(state.limit, (state.page - 1) * state.limit).finally(
    () => {
      state.loading = false
    }
  )
  state.total = count
  state.list = data.map((item) => {
    state.ids.push(item.id)
    return {
      ...item.simpleSong,
      ...item,
      simpleSong: {}
    }
  })
  music.updateCurrentItem({ id: 'cloud-songs' })
}

const currentChange = (val: number) => {
  state.page = val
  getUserCloudFn()
}
</script>

<template>
  <SongList
    @play="music.getMusicUrlHandler"
    @current-change="currentChange"
    is-loading-endflyback
    is-paging
    :songs="music.state.songs"
    :columns="columns"
    :loading="state.loading"
    :ids="state.ids"
    :list="state.list"
    :list-info="state.listInfo"
    :page-size="state.limit"
    :total="state.total"
    :current-page="state.page"
  ></SongList>
</template>

<style scoped></style>
