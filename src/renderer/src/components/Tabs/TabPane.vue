<script setup lang="ts" name="TabPane">
interface Props {}
const props = defineProps<Props>()
defineOptions({
  name: 'TabPane'
})
</script>

<template>
  <!--  <v-tab v-bind="$attrs">-->
  <!--    <slot></slot>-->
  <!--  </v-tab>-->
  <el-tab-pane v-bind="$attrs">
    <slot></slot>
  </el-tab-pane>
</template>

<style lang="less"></style>
