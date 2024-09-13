<script setup lang="ts">
import {useRoute} from "vue-router"
import {useMusicAction} from "@/store/music"
import usePlayList, {playListState} from "@/layout/BaseAside/usePlayList"
import {varDayim} from '@/utils'
import BaseButton from "@/components/BaseButton/index.vue";
import SongInfo from '@/components/SongInfo/index.vue'
import SongList from '@/components/SongList/index.vue'
import {columns} from "@/views/PlayList/config"

const { getPlayListDetailFn, getRecommendSongs } = usePlayList()
const route = useRoute()
const music = useMusicAction()

const init = () => {
  const { id } = route.query as { id: number | 'recommendSongs' | null}
  // 是否是每日推荐歌曲
  if (id === 'recommendSongs') {
    getRecommendSongs()
  } else {
    id && getPlayListDetailFn(+id)
  }
}
init()
</script>

<template>
  <SongInfo v-if="route.query.id !== 'recommendSongs'"></SongInfo>
  <div class="padding-container" v-else>
    <div class="top">
      <div class="day">
        <div class="row-left row"></div>
        <div class="row-right row"></div>
        <div class="line"></div>
        <div class="text">{{ varDayim() }}</div>
      </div>
      <div class="text-info">
        <div class="text-info-title">每日歌曲推荐</div>
        <div class="text-info-desc">根据您的音乐口味生成, 每天6:00更新</div>
      </div>
    </div>
    <div class="bottom">
      <BaseButton type="subject">播放全部</BaseButton>
      <BaseButton>收藏全部</BaseButton>
    </div>
  </div>
  <SongList
    @play="music.getMusicUrlHandler"
    :columns="columns"
    :loading="playListState.loading"
    :songs="music.state.songs"
    :ids="playListState.ids"
    :list="playListState.playList"
    :list-info="playListState.listInfo"
  />
</template>

<style lang="less" scoped>
.padding-container {
  display: flex;
  flex-direction: column;
  align-items: start;
  .top {
    display: flex;
    align-items: center;
    .day {
      border: 3px solid @subject;
      width: 80px;
      height: 70px;
      border-radius: 15px;
      padding: 0 8px;
      position: relative;
      .row-left {
        left: 20px;
      }
      .row-right {
        right: 20px;
      }
      .row {
        position: absolute;
        top: -8px;
        height: 13px;
        width: 3px;
        background-color: @subject;
        border-radius: 2px;
      }
      .line {
        position: relative;
        top: 10px;
        border-radius: 2px;
        height: 3px;
        width: 100%;
        background-color: @subject;
        margin-bottom: 5px;
      }
      .text {
        font-size: 40px;
        font-weight: 800;
        color: @subject;
        text-align: center;
      }
    }
    .text-info {
      margin-left: 30px;
      text-align: left;
      .text-info-title {
        font-size: 25px;
      }
      .text-info-desc {
        margin-top: 5px;
        font-size: 12px;
        color: @darkText;
      }
    }
  }
}

</style>