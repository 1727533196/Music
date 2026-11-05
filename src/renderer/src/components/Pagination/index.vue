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
  padding: 24px 0;
}
.el-pagination {
  --el-pagination-button-width: var(--app-control-height);
  --el-pagination-button-height: var(--app-control-height);
  --el-pagination-button-disabled-bg-color: transparent;
  --el-pagination-hover-color: var(--app-accent);

  :deep(button),
  :deep(.el-pager li) {
    border: 1px solid var(--app-border);
    border-radius: var(--app-control-radius);
    background: var(--app-surface) !important;
    color: var(--app-muted) !important;
    font-variant-numeric: tabular-nums;
    transition:
      background 0.18s,
      color 0.18s;
    &:hover:not(:disabled):not(.is-active) {
      background: var(--app-hover) !important;
      color: var(--app-text) !important;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
  :deep(.el-pager .is-active) {
    border-color: transparent;
    background: var(--app-accent) !important;
    color: var(--app-on-accent) !important;
  }
  :deep(button:disabled) {
    opacity: 0.35;
  }
}
@media (prefers-reduced-motion: reduce) {
  .el-pagination :deep(button),
  .el-pagination :deep(.el-pager li) {
    transition: none;
  }
}
</style>
