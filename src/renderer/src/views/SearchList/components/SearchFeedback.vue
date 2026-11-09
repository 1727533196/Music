<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean
    error?: boolean
    label: string
    kind?: 'artist'
    skeletonCount?: number
  }>(),
  { skeletonCount: 6 }
)
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    v-if="loading"
    class="loading-grid"
    :class="{ 'artist-loading': kind === 'artist' }"
    role="status"
    :aria-label="`正在搜索${label}`"
  >
    <div v-for="i in skeletonCount" :key="i" class="loading-card" aria-hidden="true">
      <span class="loading-artwork"></span><span class="loading-name"></span
      ><span class="loading-caption"></span>
    </div>
  </div>
  <div v-else class="search-feedback" role="status">
    <v-icon :icon="error ? 'mdi-wifi-off' : 'mdi-magnify'" size="30" aria-hidden="true" />
    <h3>{{ error ? `${label}搜索失败` : `没有找到相关${label}` }}</h3>
    <p>{{ error ? '请检查网络连接后重试。' : '换个关键词，或试试歌名、歌手的其他写法。' }}</p>
    <button v-if="error" type="button" @click="emit('retry')">重新加载</button>
  </div>
</template>

<style scoped lang="less">
.search-feedback {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px 16px;
  color: var(--app-muted);
  text-align: center;
  h3 {
    margin: 0;
    color: var(--app-text);
    font-size: 16px;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
  }
  button {
    margin-top: 6px;
    padding: 7px 16px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: var(--app-surface);
    color: var(--app-text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    &:hover {
      background: var(--app-hover);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.loading-grid {
  display: grid;
  grid-template-columns: repeat(var(--search-columns, 6), minmax(0, 1fr));
  gap: 24px 20px;
}
.loading-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  span {
    display: block;
    border-radius: 4px;
    background: var(--app-surface-strong);
  }
}
.loading-artwork {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px !important;
}
.loading-name {
  width: 75%;
  height: 15px;
  margin-top: 2px;
}
.loading-caption {
  width: 55%;
  height: 12px;
  margin-bottom: 18px;
}
.artist-loading {
  .loading-card {
    align-items: center;
  }
  .loading-artwork {
    border-radius: 50% !important;
  }
}
@media (max-width: 800px) {
  .loading-grid {
    gap: 20px 16px;
  }
}
</style>
