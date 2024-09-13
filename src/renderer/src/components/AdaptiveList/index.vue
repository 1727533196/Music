<script setup lang="ts">
interface Props {
  AdaptiveStyle?: object
  loading: boolean
}
const props = defineProps<Props>()

</script>

<template>
  <div v-loading="loading" :style="AdaptiveStyle" class="play-list">
    <slot></slot>
  </div>
</template>

<style lang="less" scoped>
.play-list {
  padding-top: 15px;
  display: grid;
  //第一个属性：行与行间隔，第二个属性列与列间隔
  grid-gap: 20px 20px;
  //内容整体平均分布
  justify-content: space-between;
  //单元格的大小是固定的，但是容器的大小不确定。如果希望每一行（或每一列）容纳尽可能多的单元格，这时可以使用auto-fill关键字表示自动填充
  grid-template-columns: repeat(auto-fill, calc(15vw - 20px));
  :deep(.el-loading-mask) {
    background: transparent;
  }
}
</style>