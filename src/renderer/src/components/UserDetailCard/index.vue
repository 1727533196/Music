<script setup lang="ts">
import { Profile } from '@/api/user'

interface Props {
  userInfo: Profile
  identify: {
    actionUrl?: string // 请求网易云音乐的链接
    imageDesc?: string // 标签
    imageUrl?: string // 标签图片
    level: number
  }
  location: string
}
const props = defineProps<Props>()
</script>

<template>
  <div class="user-card-container">
    <div :style="{ backgroundImage: `url(${userInfo.avatarUrl})` }" class="avatar" />
    <div class="detail">
      <div class="top-container">
        <div class="vip-info">
          <h2 class="top">{{ userInfo.nickname }}</h2>
          <div class="vip">
            <div>陆.</div>
            <div class="tag-info">
              <div class="tag">
                <img :src="identify.imageUrl" />
                {{ identify.imageDesc }}
              </div>
              <div class="rank">Lv{{ identify.level }}</div>
            </div>
          </div>
        </div>
        <div class="btn-container">
          <v-btn variant="tonal" rounded="lg">歌手页</v-btn>
          <v-btn variant="tonal" rounded="lg">发私信</v-btn>
          <v-btn variant="tonal" rounded="lg">已关注</v-btn>
          <!--          <BaseButton>歌手页</BaseButton>-->
          <!--          <BaseButton>发私信</BaseButton>-->
          <!--          <BaseButton>已关注</BaseButton>-->
        </div>
        <div class="line"></div>
      </div>
      <div class="bottom-container">
        <div class="info-count">
          <div>
            <div>
              <div class="count">{{ userInfo.eventCount }}</div>
              <div class="text">动态</div>
            </div>
            <div class="line" />
          </div>
          <div>
            <div>
              <div class="count">{{ userInfo.newFollows }}</div>
              <div class="text">关注</div>
            </div>
            <div class="line" />
          </div>
          <div>
            <div>
              <div class="count">{{ userInfo.followeds }}</div>
              <div class="text">粉丝</div>
            </div>
          </div>
        </div>
        <div class="region personal-details">
          <span class="title">所在地区: </span>
          <span class="content">{{ location }}</span>
        </div>
        <div class="social personal-details">
          <span class="title">社交网络: </span>
          <span class="content">未绑定</span>
        </div>
        <div class="hi personal-details">
          <span class="title">个人介绍: </span>
          <span class="content">{{ userInfo.signature || '暂无介绍' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.user-card-container {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 20px;
  width: calc(87vw - 180px);
  //width: 87%;
  margin: 0 auto;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1);
  transition: 0.4s;
  .btn-container {
    display: flex;
    gap: 10px;
  }
  .bgSetting();

  .avatar {
    height: 200px;
    width: 200px;
    border-radius: 50%;
    background-image: url('https://p1.music.126.net/9GAbSb_hlXPu66HWInJOww==/109951162846052486.jpg');
    .bgSetting();
    margin-right: 30px;
  }
  .detail {
    flex: 1;
    .top-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 15px;
      position: relative;
      margin-bottom: 20px;
      .line {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 1px;
        border-radius: 1px;
        background-color: rgba(255, 255, 255, 0.12);
      }
      .vip-info {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        .vip {
          display: flex;
          .icon {
          }
          .tag-info {
            display: flex;
            align-items: center;
            .tag {
              background-color: rgb(253, 228, 226);
              border-radius: 10px;
              position: relative;
              display: flex;
              align-items: center;
              font-size: 12px;
              color: @subject;
              padding-right: 10px;
              img {
                width: 16px;
                margin-right: 3px;
              }
            }
            .rank {
              margin-left: 5px;
              background-color: rgb(240, 240, 240);
              color: @bgColor;
              font-size: 12px;
              padding: 1px 7px;
              border-radius: 10px;
            }
          }
        }
      }
    }
    .bottom-container {
      display: flex;
      flex-direction: column;
      .info-count {
        display: flex;
        margin-bottom: 10px;
        > div {
          margin-right: 20px;
          display: flex;
          > div:first-child {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
        .count {
          font-size: 20px;
        }
        .text {
          font-size: 13px;
          color: @darkText;
        }
        .line {
          width: 1px;
          margin-left: 20px;
          height: 100%;
          border-radius: 1px;
          background-color: rgba(255, 255, 255, 0.12);
        }
      }
      .personal-details {
        .title {
          font-size: 13px;
        }
        .content {
          font-size: 13px;
          color: @darkText;
        }
      }
      .personal-details + .personal-details {
        margin-top: 5px;
      }
    }
  }
}
</style>
