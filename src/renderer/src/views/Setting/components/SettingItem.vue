<script setup lang="ts">
interface Props {
  label: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="item-label">
    <span class="label-text">{{ label }}</span>
    <span v-if="description" class="item-desc">{{ description }}</span>
  </div>
</template>

<style lang="less" scoped>
.item-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;

  .label-text {
    font-size: 13px;
    font-weight: 500;
    color: var(--app-text);
    line-height: 1.4;
  }

  .item-desc {
    font-size: 12px;
    color: var(--app-muted);
    font-weight: 400;
    line-height: 1.5;
  }
}
</style>
