<script setup lang="ts" name="BaseAside">
import { ref, watch } from 'vue'
import { useUserInfo } from '@/store'
import { useRoute, useRouter } from 'vue-router'
import { asideMenuConfig, ListItem, needUseComparisonPaths, paths } from '@/layout/BaseAside/config'
import {
  afterEnter,
  afterLeave,
  beforeEnter,
  beforeLeave,
  enter,
  leave
} from '@/layout/BaseAside/animation'

const store = useUserInfo()
const current = ref<ListItem>()

const router = useRouter()
const route = useRoute()
const init = () => {
  // 这里需要特殊处理的有 【创建的歌单】 和 【收藏的歌单】两个列表
  if (route.query.id && route.path === '/play-list') {
    current.value = {
      id: +route.query.id,
      path: '/play-list'
    } as ListItem
    // console.log('current-->', current)
  }
}
watch(
  () => store.userPlayListInfo,
  () => {
    const path = route.path
    if (needUseComparisonPaths.includes(path)) {
      current.value = {
        path
      } as ListItem
      return
    }
    if (route.query.id) {
      const id = +route.query.id
      current.value = store.userPlayListInfo.find((item) => item.id === id) as ListItem
    }
    paths.includes(path) || (current.value = undefined)
  }
)
const itemClick = (item: ListItem) => {
  // current在这里为上一次
  // 有id说明获取的是歌单
  if (item.id && item.id !== current.value?.id) {
    // 不在使用左侧菜单点击获取，仅传参
    // getPlayListDetailFn(item.id)
    // 防止上一次current没有id导致下面判断path出问题
    current.value?.id && (current.value = item)
  }
  // if(item.path === current.value?.path) {
  //   return
  // }
  router.push({
    path: item.path,
    query: {
      id: item.id
    }
  })
  current.value = item
}
watch(
  () => route.fullPath,
  () => {
    if (route.path === '/play-list') {
      init()
    }
  }
)
watch(current, (value) => {
  if (value && value.coverImgUrl) {
  }
})
// 列表选中条件，有id优先id，没有id用path
const isCurrent = (path: string, id: number) => {
  if (!current.value) {
    return false
  }
  if (needUseComparisonPaths.includes(path)) {
    return current.value.path === path
  }
  return current.value.id === id
}

const gotoDetail = () => {
  router.push({
    path: '/detail',
    query: {
      uid: store.profile.userId
    }
  })
}

const login = () => {
  window.$login.show()
}
const collapsedHandler = (item) => {
  item.isCollapsed = !item.isCollapsed
}
</script>

<template>
  <div class="aside">
    <div class="avatar-box">
      <template v-if="store.isLogin">
        <div
          @click="gotoDetail"
          :style="{ backgroundImage: `url(${store.profile.avatarUrl})` }"
          class="head-portraits"
        ></div>
        <div class="nickname">{{ store.profile.nickname }}</div>
      </template>
      <div v-else @click="login" class="not-login">
        <el-icon :size="22"><User /></el-icon>
        <span>未登录</span>
      </div>
    </div>
    <div class="play-container">
      <template :key="i" v-for="(menuItem, i) in asideMenuConfig">
        <div :class="['lump', { 'collapsed-lump': menuItem.type === 'collapsed' }]">
          <div
            @click="menuItem.type === 'collapsed' && collapsedHandler(menuItem)"
            v-if="menuItem.title && menuItem.list.length"
            class="title"
          >
            {{ menuItem.title }}
          </div>
          <template v-if="menuItem.type === 'collapsed'">
            <transition
              name="height-fade"
              @before-enter="beforeEnter"
              @enter="enter"
              @after-enter="afterEnter"
              @before-leave="beforeLeave"
              @leave="leave"
              @after-leave="afterLeave"
            >
              <div
                v-show="menuItem.isCollapsed"
                :class="[
                  {
                    collapsed: menuItem.type === 'collapsed',
                    'tree-open': menuItem.isCollapsed === true,
                    'tree-close': menuItem.isCollapsed === false
                  }
                ]"
              >
                  <div
                    v-for="item in menuItem.list"
                    @click="itemClick(item)"
                    :style="{ fontSize: item.asideFontSize + 'px' || '' }"
                    :class="['play-list-item', { current: isCurrent(item.path, item.id) }]"
                  >
                    <i v-if="item.icon" :class="['iconfont', item.icon || '']"></i>
                    <img
                      v-else-if="item.coverImgUrl"
                      :src="item.coverImgUrl + '?param=150y150'"
                      alt=""
                    />
                    <span class="name">{{ item.name }}</span>
                  </div>
              </div>
            </transition>
          </template>
          <template v-else>
            <div
              @click="itemClick(item)"
              v-for="item in menuItem.list"
              :style="{ fontSize: item.asideFontSize + 'px' || '' }"
              :class="['play-list-item', { current: isCurrent(item.path, item.id) }]"
            >
              <i v-if="item.icon" :class="['iconfont', item.icon || '']"></i>
              <img v-else-if="item.coverImgUrl" :src="item.coverImgUrl" alt="" />
              <span class="name">{{ item.name }}</span>
            </div>
          </template>
        </div>
        <div v-if="i < asideMenuConfig.length - 1" class="line"></div>
      </template>
    </div>
  </div>
</template>

<style lang="less" scoped>
.height-fade-enter-active,
.height-fade-leave-active {
  overflow: hidden;
  transition: height 0.3s ease;
}
.height-fade-enter, .height-fade-leave-to /* .height-fade-leave-active in <2.1.8 */ {
  height: 0;
}
.aside {
  width: 235px;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.03);
  padding: 10px 0;
  box-sizing: border-box;
  position: relative;
  z-index: 100;
  overflow: hidden;
  .avatar-box {
    height: 80px;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0 25px;
    //justify-content: center;
    .head-portraits {
      border-radius: 50%;
      width: 40px;
      height: 40px;
      background: url('https://p1.music.126.net/siSjcSLr8ybRZ3VUpC-9hg==/109951165504329717.jpg');
      .bgSetting();
      margin-right: 6px;
      cursor: pointer;
    }
    .not-login {
      display: flex;
      align-items: center;
      margin-right: 20px;
      cursor: pointer;
      .el-icon {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        width: 27px;
        height: 27px;
        margin-right: 7px;
      }
      > span {
        font-size: 12px;
        position: relative;
        top: -0.5px;
      }
    }
    .nickname {
      max-width: 140px;
      .textOverflow();
      font-size: 14px;
    }
  }
  .play-container {
    overflow-y: auto;
    height: calc(100% - 70px);
    padding: 0 20px;
    padding-bottom: 100px;
    .collapsed-lump {
      .title {
        cursor: pointer;
      }
      .collapsed {
        overflow: hidden;
      }
      .tree-close {
        //height: 0;
      }
      .tree-open {
        //height: 100%;
      }
    }
    .lump {
      .title {
        font-size: 14px;
        color: @darkText;
        text-align: left;
        padding: 0 10px;
        margin-bottom: 5px;
      }
      .play-list-item {
        cursor: pointer;
        color: @text;
        font-size: 13px;
        text-align: left;
        line-height: 40px;
        .textOverflow();
        padding: 0 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        margin: 7px 0;
        > img {
          width: 34px;
          height: 34px;
          border-radius: 6px;
        }
        .name {
          margin-left: 10px;
          .textOverflow();
        }
      }
      .play-list-item:hover {
        background-image: linear-gradient(#ff1168, #fc3d49);
      }
      .current.play-list-item {
        background-image: linear-gradient(#ff1168, #fc3d49);
      }
    }
    .line {
      height: 1px;
      background-color: rgba(255, 255, 255, 0.1);
      margin: 15px 10px;
    }
  }
}
</style>
