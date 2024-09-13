<script setup lang="ts">
import {useFlags} from "@/store/flags";
import useMusic from "@/components/MusicPlayer/useMusic";
import {computed} from "vue";
import {useUserInfo} from "@/store";
import {useRouter} from "vue-router";
import {GetMusicDetailData} from "@/api/musicList";

interface Props {
  songs: GetMusicDetailData
}

const props = defineProps<Props>()
const flags = useFlags()
const {likeMusic} = useMusic()
const store = useUserInfo()
const router = useRouter()
const isLike = computed(() => {
  return store.userLikeIds.includes(props.songs.id)
})
const id = computed(() => {
  return props.songs.id
})

const openMusicDetail = () => {
  flags.isOpenDetail = !flags.isOpenDetail
}

const closeMusicDetail = () => {
  flags.isOpenDetail = false
}
const gotoComment = () => {
  router.push({
    path: '/comment',
    query: {
      id: props.songs.id,
    }
  })
  flags.isOpenDetail = false
}
</script>

<template>
  <div v-show="!flags.isOpenDetail" class="left">
    <div
        @click="openMusicDetail"
        class="picture-box"
    >
      <div
          :style="{backgroundImage: `url(${props.songs.al?.picUrl+'?param=150y150'})`}"
          class="picture"
      ></div>
      <div class="shade-box"></div>
      <el-icon :size="25" @click="closeMusicDetail" class="close np-drag"><ArrowDown /></el-icon>
    </div>

    <div class="name-info">
      <span class="song-name">{{ props.songs.name }}</span>
      <div class="name-container">
        <template v-for="(item, i) in props.songs.ar">
          <span class="name">{{ item.name }}</span>
          <span v-if="i === 0 && i !== props.songs.ar.length-1">/</span>
        </template>
      </div>
    </div>
    <i v-if="isLike" @click="likeMusic(id, false)"  class="iconfont icon-xihuan1"></i>
    <i v-else  @click="likeMusic(id)"  class="iconfont icon-xihuan"></i>
  </div>
  <div v-show="flags.isOpenDetail" class="left detail-left">
    <el-icon :size="25" @click="closeMusicDetail" class="close np-drag"><ArrowDown /></el-icon>
    <i v-if="isLike" @click="likeMusic(id, false)"  class="iconfont icon-xihuan1"></i>
    <i v-else  @click="likeMusic(id)"  class="iconfont icon-xihuan"></i>
    <el-icon style="cursor: pointer;" @click="gotoComment" :size="20"><ChatDotSquare /></el-icon>
    <div class="more">
      <el-icon :size="10"><MoreFilled /></el-icon>
    </div>
  </div>
</template>

<style scoped lang="less">
.left {
  display: flex;
  align-items: center;
  color: @text;
  width: 25%;

  .iconfont {
    cursor: pointer;
    position: relative;
    top: -8px;
  }
  .icon-xihuan {
    color: @darkText;
    font-size: 22px;
  }
  .icon-xihuan1 {
    font-size: 21px;
    color: rgb(235, 65, 65);
  }

  .picture-box {
    position: relative;
    cursor: pointer;
    width: 50px;
    height: 50px;
    border-radius: 5px;
    overflow: hidden;
    .picture {
      .bgSetting();
      width: 100%;
      height: 100%;
      transition: 0.5s;
    }
    .shade-box {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0);
      transition: 0.5s;
    }
    .close {
      visibility: hidden;
      position: absolute;
      top: 50%;
      left: 50%;
      transition: 0.5s;
      opacity: 0;
      transform: rotateX(-180deg) translateY(50%) translateX(-50%);
    }
    &:hover {
      .picture {
        filter:blur(1.5px);
      }
      .shade-box {
        background-color: rgba(0,0,0,.3);
      }
      .close {
        visibility: visible;
        opacity: 1;
      }
    }

  }


  .name-info {
    font-size: 14px;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: flex-start;

    .song-name {
      font-size: 15px;
      max-width: 140px;
      .textOverflow();
    }

    .name-container {
      max-width: 140px;
      .textOverflow();
    }
  }
}
.detail-left {
  .icon-xihuan1,.icon-xihuan {
    position: relative;
    top: 0px;
  }
  > * + * {
    margin-left: 20px;
  }
  .close {
    cursor: pointer;
  }
  .more {
    border: 0.5px solid rgba(255, 255, 255, .9);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    > i{
      position: relative;
      top: 0px;
    }
  }
}
</style>
