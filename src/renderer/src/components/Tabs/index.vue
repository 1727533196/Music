<script setup lang="ts" name="Tabs">
import { computed } from 'vue'

interface Props {
  modelValue: string
}
defineOptions({
  name: 'Tabs'
})
const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const activeName = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})
</script>

<template>
  <el-tabs class="bass-tabs" v-model="activeName" v-bind="$attrs">
    <slot></slot>
  </el-tabs>
</template>

<style lang="less">
.bass-tabs.el-tabs {
  .el-tabs__active-bar {
    background-color: @subject;
    transition: 0.3s ease !important;
  }
  .el-tabs__item.is-active {
    font-size: 18px !important;
    color: white !important;
    font-weight: 800;
  }
  .el-tabs__content {
    overflow: inherit;
  }
  .el-tabs__item {
    color: @darkText;
    font-size: 16px;
    transition: font-size 0.1s;
  }
  .el-tabs__nav-wrap::after {
    content: none;
  }

  .el-tabs__content {
    padding-top: 20px;
    text-align: left;
  }
}
</style>
