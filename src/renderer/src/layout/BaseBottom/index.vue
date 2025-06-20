<script setup lang="ts" name="Bottom">
defineSlots<{
  default?: (props: {}) => any
}>()
</script>

<template>
  <div class="bottom-container container">
    <slot></slot>
  </div>
</template>

<style lang="less" scoped>
.container {
  height: 75px;
  //background-color: rgb(26,26,35);
  border-top: rgb(59, 59, 62) 1px solid;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 1999;
  width: 100%;
}
.bottom-container {
  transition: 0.5s;
}
</style>
