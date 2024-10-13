<script setup lang="ts" name="Home">
import { ref } from 'vue'
import type { TabsPaneContext } from 'element-plus'
import { tabsConfig } from './config'
import List from '@/components/List/index.vue'
import Individual from './components/individual.vue'

const activeName = ref(tabsConfig[0].name)

const handleClick = (tab: TabsPaneContext, event: Event) => {}
</script>

<template>
  <div class="padding-container">
    <Individual></Individual>
  </div>
</template>

<style lang="less" scoped></style>
