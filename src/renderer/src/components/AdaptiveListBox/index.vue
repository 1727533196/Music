<script setup lang="ts">
import {withDefaults} from 'vue'
// 适配过空间大小的固定列表组件
interface Props {
  isShowBg: boolean
  listStyle?: object
}
const props = withDefaults(defineProps<Props>(), {
  isShowBg: true
})
</script>

<template>
  <div :style="listStyle" :class="['list-container', {bg: isShowBg}]">
    <slot></slot>
  </div>
</template>

<style lang="less" scoped>
.list-container {
  padding: 20px;
  border-radius: 20px;
  width: calc(93vw - 180px);
  //width: 95%;
  margin: 30px auto;
  //min-height: 500px;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1);
  transition: 0.3s;
  &.bg {
    background-color: rgba(255,255,255,.05);
  }
}
</style>