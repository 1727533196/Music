<script setup lang="ts">
interface Props {
  total: number
  pageSize: number
  currentPage: number
  background?: boolean
  layout?: string
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'prev, pager, next',
  background: false
})
const emit = defineEmits(['size-change', 'current-change'])
</script>

<template>
  <div class="box">
    <el-pagination
      @size-change="emit('size-change', $event)"
      @current-change="emit('current-change', $event)"
      :current-page="currentPage"
      :page-size="pageSize"
      :background="background"
      :layout="layout"
      :total="total"
    />
  </div>
</template>

<style lang="less" scoped>
.box {
  display: flex;
  justify-content: center;
  padding: 30px 0;
}
.el-pagination {
  :deep(button) {
    background-color: rgba(255, 255, 255, 0.12) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    transition: 0.3s;
    color: white !important;
    &:hover:not(button:disabled) {
      background-color: rgba(255, 255, 255, 0.08) !important;
    }
  }
  :deep(button:disabled) {
    cursor: auto !important;
  }
}

:deep(.el-pager) {
  .is-active.number {
    background-color: @subject !important;
    color: white;
  }
  .more {
    background-color: transparent !important;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: @text !important;
  }
  .number {
    background-color: transparent !important;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: @text !important;
    transition: 0.3s;
    &:hover:not(.is-active) {
      background-color: rgba(220, 55, 55, 0.5) !important;
      color: white;
    }
  }
}
</style>
