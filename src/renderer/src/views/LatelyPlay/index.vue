<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { columns, playListMock } from './config'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { getRecordSong } from '@/api/musicList'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'

const music = useMusicAction()
const loading = ref(false)
const recordSongList = ref([])
const { getLikeMusicIds } = usePlayList()
const ids = ref<number[]>([])

const getRecordSongHandler = async () => {
  try {
    loading.value = true
    await getLikeMusicIds()
    const { data } = await getRecordSong()

    // 格式化成songList组件能够接受的数据格式
    recordSongList.value = data.list.map((item) => {
      ids.value.push(item.data.id)
      return {
        ...item,
        ...item.data
      }
    })
    music.updateCurrentItem(playListMock)
  } catch (e) {
    ElMessage.error('获取最近歌曲失败: ', e)
  } finally {
    loading.value = false
  }
}

const init = async () => {
  getRecordSongHandler()
}

init()
</script>

<template>
  <div class="record-song">
    <h2>保存了近300首的播放记录</h2>
  </div>
  <SongList
    @play="music.getMusicUrlHandler"
    :columns="columns"
    :loading="loading"
    :songs="music.state.songs"
    :list="recordSongList"
    :listInfo="{}"
    :ids="ids"
  />
</template>

<style lang="less" scoped>
.record-song {
  padding: 0 35px;
}
</style>
