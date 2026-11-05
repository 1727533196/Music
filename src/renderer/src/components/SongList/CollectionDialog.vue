<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'

interface PlayList {
  id: number
  name: string
  coverImgUrl: string
  trackCount?: number
  specialType?: number
}
interface Props {
  modelValue: boolean
  playlist: PlayList[]
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), { playlist: () => [], loading: false })
const emit = defineEmits(['update:modelValue', 'confirm'])
const radioName = useId()
const query = ref('')
const selectedId = ref<number | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const failedCovers = ref(new Set<string>())
let opener: HTMLElement | null = null
const restoreFocus = () => {
  if (!props.modelValue && opener?.isConnected && !opener.closest('[inert]')) {
    opener.focus({ preventScroll: true })
  }
}
const selectedPlaylist = computed(() => props.playlist.find((item) => item.id === selectedId.value))
const filteredPlaylists = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase()
  return props.playlist.filter((item) => item.name.toLocaleLowerCase().includes(keyword))
})
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!props.loading) emit('update:modelValue', value)
  }
})
const handleConfirm = () => {
  if (!props.loading && selectedPlaylist.value) emit('confirm', selectedPlaylist.value)
}
const focusSearch = async () => {
  await nextTick()
  searchInput.value?.focus()
}
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    selectedId.value = null
    query.value = ''
  }
)
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="460"
    :persistent="loading"
    scrim="#09090e"
    :opacity="0.72"
    class="collection-dialog"
    aria-label="添加到歌单"
    @after-enter="focusSearch"
    @after-leave="restoreFocus"
  >
    <div class="collection-card" :aria-busy="loading">
      <header class="dialog-heading">
        <div class="heading-copy">
          <h2>添加到歌单</h2>
          <p>选择歌曲的收录歌单</p>
        </div>
        <button
          type="button"
          class="close-button"
          aria-label="关闭添加到歌单"
          :disabled="loading"
          @click="dialogVisible = false"
        >
          <v-icon icon="mdi-close" size="20" />
        </button>
      </header>
      <div v-if="playlist.length > 5" class="playlist-search">
        <v-icon icon="mdi-magnify" size="18" aria-hidden="true" />
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="搜索歌单"
          aria-label="搜索可添加的歌单"
          :disabled="loading"
        />
      </div>
      <div
        v-if="filteredPlaylists.length"
        class="playlist-options"
        role="radiogroup"
        aria-label="选择歌单"
      >
        <label
          v-for="item in filteredPlaylists"
          :key="item.id"
          class="playlist-option"
          :class="{ selected: selectedId === item.id, busy: loading }"
        >
          <input
            v-model="selectedId"
            type="radio"
            :name="radioName"
            :value="item.id"
            :disabled="loading"
          />
          <span class="playlist-cover">
            <v-icon icon="mdi-playlist-music" size="22" aria-hidden="true" />
            <img
              v-if="item.coverImgUrl && !failedCovers.has(item.coverImgUrl)"
              :src="item.coverImgUrl"
              alt=""
              loading="lazy"
              @error="failedCovers.add(item.coverImgUrl)"
            />
          </span>
          <span class="playlist-copy"
            ><strong :title="item.name">{{ item.name }}</strong
            ><span v-if="item.trackCount != null">{{ item.trackCount }} 首歌曲</span></span
          >
          <v-icon
            class="selection-mark"
            :icon="selectedId === item.id ? 'mdi-check-circle' : 'mdi-radiobox-blank'"
            size="21"
            aria-hidden="true"
          />
        </label>
      </div>
      <div v-else class="empty-state" role="status">
        <v-icon :icon="query.trim() ? 'mdi-magnify' : 'mdi-playlist-music-outline'" size="32" />
        <h3>{{ query.trim() ? '未找到相关歌单' : '暂无可用歌单' }}</h3>
        <p>{{ query.trim() ? '换个关键词再试试。' : '先在资料库创建一个歌单。' }}</p>
        <button v-if="query.trim()" type="button" class="text-button" @click="query = ''">
          清空搜索
        </button>
      </div>
      <footer class="dialog-footer">
        <span class="selected-caption" :title="selectedPlaylist?.name">{{
          selectedPlaylist ? `已选：${selectedPlaylist.name}` : `${playlist.length} 张可用歌单`
        }}</span>
        <button
          type="button"
          class="cancel-button"
          :disabled="loading"
          @click="dialogVisible = false"
        >
          取消
        </button>
        <button
          type="button"
          class="confirm-button"
          :disabled="!selectedPlaylist || loading"
          @click="handleConfirm"
        >
          <v-icon v-if="loading" class="spinning" icon="mdi-loading" size="16" />{{
            loading ? '添加中…' : '添加'
          }}
        </button>
      </footer>
    </div>
  </v-dialog>
</template>

<style lang="less" scoped>
.collection-card {
  display: flex;
  flex-direction: column;
  max-height: ~"min(620px, calc(100dvh - 48px))";
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.dialog-heading {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 18px;
}
.heading-copy {
  flex: 1;
  min-width: 0;
  h2 {
    margin: 0 0 6px;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.4;
  }
  p {
    margin: 0;
    color: var(--app-muted);
    font-size: 12px;
  }
}
.close-button {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  &:hover:not(:disabled) {
    color: var(--app-text);
    background: var(--app-surface);
  }
}
.playlist-search {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  margin: 0 24px 12px;
  padding: 0 10px;
  min-height: 36px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-muted);
  &:focus-within {
    border-color: var(--app-accent-border);
  }
  input {
    flex: 1;
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--app-text);
    font-size: 13px;
    &::placeholder {
      color: var(--app-muted);
    }
  }
}
.playlist-options {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 14px 14px;
}
.playlist-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  &:hover:not(.busy) {
    background: var(--app-surface);
  }
  &.selected {
    border-color: var(--app-accent-border);
    background: var(--app-accent-soft);
    .selection-mark {
      color: var(--app-accent);
    }
  }
  &.busy {
    cursor: default;
  }
  &:has(input:focus-visible) {
    outline: 2px solid var(--app-accent);
    outline-offset: -2px;
  }
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
}
.playlist-cover {
  position: relative;
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface);
  color: var(--app-muted);
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.playlist-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
  }
  > span {
    color: var(--app-muted);
    font-size: 11px;
  }
}
.selection-mark {
  flex-shrink: 0;
  color: var(--app-muted);
}
.empty-state {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--app-muted);
  text-align: center;
  h3 {
    color: var(--app-text);
    font-size: 15px;
    font-weight: 550;
  }
  p {
    font-size: 12px;
  }
}
.text-button {
  padding: 4px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--app-accent);
  font-size: 12px !important;
}
.dialog-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--app-border);
}
.selected-caption {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--app-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cancel-button,
.confirm-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  min-width: 64px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 12px !important;
}
.confirm-button {
  border-color: transparent;
  background: var(--app-accent);
  color: var(--app-on-accent);
  font-weight: 600 !important;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 480px) {
  .dialog-heading {
    padding: 20px 18px 16px;
  }
  .playlist-search {
    margin-inline: 18px;
  }
  .playlist-options {
    padding-inline: 8px;
  }
  .dialog-footer {
    padding: 14px 18px;
    gap: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
