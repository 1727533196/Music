<script setup lang="ts">
import { useFlags } from '@/store/flags'
import useMusic from '@/components/MusicPlayer/useMusic'
import { computed, ref, useTemplateRef } from 'vue'
import PlayerGlyph from './PlayerGlyph.vue'
import { useUserInfo } from '@/store'
import { useRouter } from 'vue-router'
import { GetMusicDetailData } from '@/api/musicList'

interface Props {
  songs: GetMusicDetailData
}

const props = defineProps<Props>()
const flags = useFlags()
const { likeMusic } = useMusic()
const store = useUserInfo()
const router = useRouter()
const isLike = computed(() => {
  return store.userLikeIds.includes(props.songs.id)
})
const id = computed(() => {
  return props.songs.id
})

const liking = ref(false)
const favoriteGlyph = useTemplateRef<InstanceType<typeof PlayerGlyph>>('favoriteGlyph')
const toggleLike = async () => {
  if (!props.songs.id || !store.isLogin || liking.value) return
  favoriteGlyph.value?.animateFavorite(!isLike.value)
  liking.value = true
  try {
    await likeMusic(props.songs.id, !isLike.value)
  } finally {
    liking.value = false
  }
}

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
      id: props.songs.id
    }
  })
  flags.isOpenDetail = false
}
</script>

<template>
  <div v-show="!flags.isOpenDetail" class="left">
    <div @click="openMusicDetail" class="picture-box">
      <div
        :style="{ backgroundImage: `url(${props.songs.al?.picUrl + '?param=150y150'})` }"
        class="picture"
      ></div>
      <div class="shade-box"></div>
      <el-icon :size="25" @click="closeMusicDetail" class="close np-drag"><ArrowDown /></el-icon>
    </div>

    <div class="name-info">
      <div class="song-name-box">
        <span class="song-name">{{ props.songs.name }}</span>
        <button
          type="button"
          class="favorite-button"
          :class="{ active: isLike }"
          :disabled="!songs.id || !store.isLogin || liking"
          :title="!store.isLogin ? '登录后收藏歌曲' : isLike ? '取消喜欢' : '喜欢这首歌'"
          :aria-label="isLike ? '取消喜欢' : '喜欢这首歌'"
          :aria-pressed="isLike"
          :aria-busy="liking"
          @click="toggleLike"
        >
          <PlayerGlyph :key="songs.id" ref="favoriteGlyph" name="star" :filled="isLike" />
        </button>
      </div>
      <div class="name-container">
        <template v-for="(item, i) in props.songs.ar">
          <span class="name">{{ item.name }}</span>
          <span v-if="i === 0 && i !== props.songs.ar.length - 1">/</span>
        </template>
      </div>
    </div>
  </div>
  <div v-show="flags.isOpenDetail" class="left detail-left">
    <el-icon :size="25" @click="closeMusicDetail" class="close np-drag"><ArrowDown /></el-icon>
    <i v-if="isLike" @click="likeMusic(id, false)" class="iconfont icon-xihuan1"></i>
    <i v-else @click="likeMusic(id)" class="iconfont icon-xihuan"></i>
    <el-icon style="cursor: pointer" @click="gotoComment" :size="20"><ChatDotSquare /></el-icon>
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
  }
  .icon-xihuan {
    color: @darkText;
    font-size: 22px;
  }
  .icon-xihuan1 {
    font-size: 21px;
    color: rgb(235, 65, 65);
  }

  .favorite-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 29px;
    height: 29px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition:
      opacity 150ms ease,
      background-color 150ms ease;
    svg {
      width: 18px;
      height: 18px;
    }
    &.active {
      color: white;
    }
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }
    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.8);
      outline-offset: 3px;
    }
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
    &:disabled[aria-busy='true'] {
      opacity: 1;
      cursor: progress;
    }
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
      background-color: rgba(0, 0, 0, 0);
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
        filter: blur(1.5px);
      }
      .shade-box {
        background-color: rgba(0, 0, 0, 0.3);
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

    .song-name-box {
      display: flex;
      align-items: center;
      gap: 5px;
      .song-name {
        font-size: 15px;
        max-width: 140px;
        .textOverflow();
      }
    }

    .name-container {
      max-width: 140px;
      .textOverflow();
    }
  }
}
.detail-left {
  .icon-xihuan1,
  .icon-xihuan {
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
    border: 0.5px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    > i {
      position: relative;
      top: 0px;
    }
  }
}
</style>
