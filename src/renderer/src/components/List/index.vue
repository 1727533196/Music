<script setup lang="ts">
interface Props {
  count: number
}
const props = defineProps<Props>()
</script>

<template>
  <div>
    <slot></slot>
  </div>
</template>

<style scoped lang="less">

</style>