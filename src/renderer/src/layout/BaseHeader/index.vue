<script setup lang="ts" name="Header">
import { useUserInfo } from '@/store'
import Search from '@/components/Search/index.vue'
import { handle } from '@/layout/BaseHeader/handle'
import { useFlags } from '@/store/flags'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { isElectron } from '@/utils'

const flags = useFlags()
const store = useUserInfo()
const router = useRouter()
const route = useRoute()
const { maximize, unmaximize, minimize, restore, close } = handle()

const maximizeOrUnmaximize = () => {
  flags.isMaximize ? unmaximize() : maximize()
}

const back = () => {
  if (backIsDisable.value) {
    return
  }
  router.back()
}
const go = () => {
  if (goIsDisable.value) {
    return
  }
  router.go(1)
}
const backIsDisable = computed(() => {
  return +route.query.count! === 1
})
const goIsDisable = computed(() => {
  return +route.query.count! === flags.maxCount
})
const gotoSetting = () => {
  flags.isOpenDetail = false
  router.push('/setting')
}
</script>

<template>
  <div :class="['window-container', { 'no-drag': flags.isOpenSearch }]">
    <div class="left no-drag">
      <div class="flip">
        <el-icon :class="{ disable: backIsDisable }" @click="back"><ArrowLeft /></el-icon>
        <el-icon :class="{ disable: goIsDisable }" @click="go"><ArrowRight /></el-icon>
      </div>
      <Search />
    </div>
    <div class="center no-drag"></div>
    <div class="right no-drag">
      <div class="operator">
        <div class="handler" @click="gotoSetting">
          <el-icon size="20"><Setting /></el-icon>
        </div>
        <template v-if="isElectron()">
          <div class="handler" @click="minimize">
            <i class="iconfont icon-weibiaoti-"></i>
          </div>
          <div class="handler" @click="maximizeOrUnmaximize">
            <i
              :class="['iconfont', flags.isMaximize ? 'icon-3zuidahua-3' : 'icon-3zuidahua-1']"
            ></i>
          </div>
          <div style="margin-right: 13px" class="handler" @click="close">
            <i class="iconfont icon-guanbi"></i>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.window-container {
  height: 90px;
  width: 100%;
  padding-top: 30px;
  padding-bottom: 20px;
  position: relative; // 子元素 的 z-index 小于父元素时，仍然显示在 父元素 上面: 父元素position:relative;z-index:1,子元素position:开启定位;z-index:10，就可以做到子元素在父元素之上了
  top: 0;
  z-index: auto;
  //background-color: @bgColor;
  //border-bottom: 2px rgb(176,34,34) solid;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .left {
    margin-right: 20%;
    display: flex;
    align-items: center;
    //width: 0px;
    //height: 30px;
    //.bgSetting();
    //cursor: pointer;
    margin-left: 35px;
    .flip {
      display: flex;
      align-items: center;
      margin-right: 15px;
      justify-content: space-between;
      width: 65px;
      .el-icon {
        cursor: pointer;
        //background-color: rgba(255,255,255,0.01);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        width: 27px;
        height: 37px;
        font-weight: 800;
      }
      .disable.el-icon {
        cursor: default;
        color: @moreDark;
      }
    }
  }
  .center {
  }
  .right {
    margin-right: 15px;
    display: flex;
    align-items: center;

    .operator {
      display: flex;
      align-items: center;
      position: relative;
      z-index: 2001;
      .handler {
        display: flex;
        margin-right: 20px;
        cursor: pointer;
        color: @text;
        &:hover {
          color: rgb(30, 204, 148);
        }
      }
      .iconfont.icon-weibiaoti- {
        font-size: 25px;
      }
      .iconfont.icon-guanbi {
        font-size: 14px;
      }
      .iconfont.icon-3zuidahua-1 {
        font-size: 14px;
      }
    }
  }
}
</style>
