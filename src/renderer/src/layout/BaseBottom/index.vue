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
  height: var(--app-player-height, 75px);
  background: var(--app-background);
  border-top: 1px solid var(--app-border);
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 1999;
  width: 100%;
}
.bottom-container {
  transition:
    opacity 0.5s ease,
    visibility 0.5s;
}
</style>
