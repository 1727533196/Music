<script setup lang="ts">
import { formatDate, formatNumberToMillion, toggleImg } from '@/utils'
import { useMusicAction } from '@/store/music'
import { useUserInfo } from '@/store'
import { ref, watch } from 'vue'
import { useTheme } from '@/store/theme'
import { useRoute, useRouter } from 'vue-router'

const music = useMusicAction()
const store = useUserInfo()
const left = ref<HTMLDivElement>()
const theme = useTheme()
const router = useRouter()
const route = useRoute()

watch(
  () => music.state.currentItem?.coverImgUrl,
  (val) => {
    if (val) {
      toggleImg(val, '350y350').then((img) => {
        if (left.value) {
          left.value!.style.backgroundImage = `url(${img.src})`
        }
      })
      // const src = music.state.currentItem.specialType === 5 ? '' : val
      theme.change(val)
    }
  },
  {
    immediate: true
  }
)

const gotoUserDetail = () => {
  router.push({
    path: '/detail',
    query: {
      uid: music.state.currentItem.userId
    }
  })
}
// playCount
</script>

<template>
  <div v-if="music.state.currentItem?.coverImgUrl" class="list-info">
    <div>
      <div ref="left" class="left">
        <span class="count">{{ formatNumberToMillion(music.state.currentItem?.playCount) }}</span>
      </div>
    </div>

    <div class="right">
      <div class="song-name">
        <div class="tag">歌单</div>
        <div class="name">{{ music.state.currentItem?.name }}</div>
      </div>
      <div class="song-info">
        <div
          :style="{ backgroundImage: `url(${music.state.currentItem.creator.avatarUrl})` }"
          class="avatar"
        ></div>
        <div @click="gotoUserDetail" class="nickname">
          {{ music.state.currentItem?.creator.nickname }}
        </div>
        <div class="create-timer">
          {{ formatDate(music.state.currentItem?.createTime, 'YY-MM-DD hh:mm:ss') }}创建
        </div>
      </div>
      <span v-if="music.state.currentItem?.description" class="text-info-desc">
        {{ music.state.currentItem?.description }}
      </span>

      <div class="song-handle">
        <v-btn variant="tonal" rounded="lg">播放全部</v-btn>
        <v-btn variant="tonal" rounded="lg">收藏</v-btn>
        <v-btn variant="tonal" rounded="lg">下载全部</v-btn>
        <!--        <BaseButton type="subject">播放全部</BaseButton>-->
        <!--        <BaseButton>收藏</BaseButton>-->
        <!--        <BaseButton>分享</BaseButton>-->
        <!--        <BaseButton>下载全部</BaseButton>-->
      </div>
      <!--      <div class="song-count">-->
      <!--        <div class="p1">-->
      <!--          <span>歌曲 : </span>-->
      <!--          <span class="total">{{ music.currentItem.trackCount }}</span>-->
      <!--        </div>-->
      <!--        <div class="p2">-->
      <!--          <span>播放 : </span>-->
      <!--          <span class="count">{{ music.currentItem.playCount }}</span>-->
      <!--        </div>-->
      <!--      </div>-->
    </div>
  </div>
</template>

<style lang="less" scoped>
.list-info {
  display: flex;
  padding: 0 35px;

  .left {
    //background-image: url("https://p1.music.126.net/9GAbSb_hlXPu66HWInJOww==/109951162846052486.jpg");
    .bgSetting();
    width: 220px;
    height: 220px;
    border-radius: 10px;
    position: relative;
    .count {
      color: white;
      position: absolute;
      right: 10px;
      top: 8px;
      font-size: 15px;
    }
  }
  .text-info-desc {
    font-size: 12px;
    margin-bottom: 5px;
    .textOverflow(2);
  }
  .right {
    margin-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    > div {
      display: flex;
      align-items: center;
      color: @text;
    }

    .song-name {
      .name {
        color: white;
        font-size: 25px;
        margin-left: 10px;
      }
      .tag {
        font-size: 13px;
        border-radius: 3px;
        padding: 0 5px;
        color: @subject;
        border: 1px solid @subject;
        & + & {
          margin-left: 5px;
        }
      }
    }
    .song-info {
      font-size: 12px;
      * + * {
        margin-left: 8px;
      }
      .avatar {
        border-radius: 50%;
        width: 25px;
        height: 25px;
        .bgSetting();
        cursor: pointer;
      }
      .nickname {
        color: rgb(133, 185, 230);
        cursor: pointer;
        &:hover {
          color: rgb(150, 200, 230);
        }
      }
      .create-timer {
        color: @darkText;
      }
    }
    .song-handle {
      display: flex;
      gap: 10px;
      font-size: 14px;
    }
    .song-count {
      font-size: 13px;
      .p1 {
        margin-right: 13px;
      }
      > div {
        > span {
          color: @darkText;
        }
        > :first-child {
          color: @text;
        }
      }
    }
  }
}
</style>
