<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PlayList } from '@/api/musicList'
import { useUserInfo } from '@/store'

type List = { label: string; name: string }[]
interface Props {
  list: List
  modelValue: string
  playList: PlayList[]
  userId: number
  loading: boolean
}
const emit = defineEmits(['tabChange', 'update:modelValue'])
const props = defineProps<Props>()
const router = useRouter()
const store = useUserInfo()
const failedCovers = ref(new Set<string>())
const activeLabel = computed(
  () => props.list.find((item) => item.name === props.modelValue)?.label || '歌单'
)
const showRanking = computed(
  () => store.profile.userId === props.userId && props.modelValue === 'createSongList'
)
const changeTab = (name: string) => {
  if (name === props.modelValue) return
  emit('tabChange', name)
  emit('update:modelValue', name)
}
const openPlaylist = (item: PlayList) => router.push({ path: '/play-list', query: { id: item.id } })
const openRanking = () => router.push({ path: '/user-cover', query: { uid: props.userId } })
</script>

<template>
  <section class="user-collection" aria-label="用户音乐收藏" :aria-busy="loading">
    <div class="collection-toolbar">
      <div class="collection-tabs" role="group" aria-label="收藏分类">
        <button
          v-for="item in list"
          :key="item.name"
          type="button"
          :aria-pressed="modelValue === item.name"
          @click="changeTab(item.name)"
        >
          {{ item.label }}
        </button>
      </div>
      <span v-if="!loading" class="collection-count"
        >{{ playList.length }} {{ modelValue === 'createSpecial' ? '篇专栏' : '张歌单' }}</span
      >
    </div>
    <div v-if="loading" class="collection-grid" aria-label="正在加载歌单">
      <div v-for="i in 6" :key="i" class="collection-skeleton">
        <div></div>
        <span></span>
      </div>
    </div>
    <div v-else-if="playList.length || showRanking" class="collection-grid">
      <button
        v-if="showRanking"
        class="playlist-card ranking-card"
        type="button"
        @click="openRanking"
      >
        <span class="playlist-cover ranking-cover"><v-icon icon="mdi-chart-bar" size="48" /></span>
        <strong>我的听歌排行</strong>
        <span class="playlist-caption">最近一周 · 所有时间</span>
      </button>
      <button
        v-for="item in playList"
        :key="item.id"
        class="playlist-card"
        type="button"
        :aria-label="`打开歌单：${item.name}`"
        @click="openPlaylist(item)"
      >
        <span class="playlist-cover">
          <v-icon icon="mdi-playlist-music" size="42" aria-hidden="true" />
          <img
            v-if="item.coverImgUrl && !failedCovers.has(item.coverImgUrl)"
            :src="item.coverImgUrl"
            alt=""
            loading="lazy"
            @error="failedCovers.add(item.coverImgUrl)"
          />
          <span class="cover-open"><v-icon icon="mdi-arrow-top-right" size="22" /></span>
        </span>
        <strong :title="item.name">{{ item.name }}</strong>
        <span v-if="item.trackCount != null" class="playlist-caption"
          >{{ item.trackCount }} 首歌曲</span
        >
      </button>
    </div>
    <div v-else class="collection-empty" role="status">
      <v-icon
        :icon="
          modelValue === 'createSpecial' ? 'mdi-text-box-outline' : 'mdi-playlist-music-outline'
        "
        size="34"
      />
      <h2>暂无{{ activeLabel }}</h2>
      <p>
        {{
          modelValue === 'collectSongList'
            ? '收藏的歌单会显示在这里。'
            : modelValue === 'createSpecial'
              ? '这里还没有发布的音乐专栏。'
              : '创建的歌单会显示在这里。'
        }}
      </p>
    </div>
  </section>
</template>

<style lang="less" scoped>
.user-collection {
  padding: 0 var(--app-gutter) 12px;
}
.collection-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 24px;
  padding-top: 22px;
  border-top: 1px solid var(--app-border);
}
.collection-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  button {
    min-height: 30px;
    padding: 0 14px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--app-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    &:hover {
      color: var(--app-text);
    }
    &[aria-pressed='true'] {
      background: var(--app-accent-soft);
      color: var(--app-accent);
      font-weight: 600;
    }
  }
}
.collection-count {
  color: var(--app-muted);
  font-size: 12px;
}
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  align-items: start;
  gap: 24px 22px;
}
.playlist-card {
  width: 100%;
  max-width: 210px;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  strong {
    display: -webkit-box;
    margin-top: 10px;
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.5;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  &:hover .cover-open,
  &:focus-visible .cover-open {
    opacity: 1;
  }
  &:hover .playlist-cover {
    border-color: var(--app-accent-border);
  }
}
button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 4px;
}
.playlist-cover {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  background: var(--app-surface);
  color: var(--app-muted);
  transition: border-color 0.18s;
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.ranking-cover {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}
.cover-open {
  position: absolute;
  right: 9px;
  bottom: 9px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #ffffff19;
  border-radius: 50%;
  background: #16131ae6;
  color: white;
  opacity: 0;
  transition: opacity 0.18s;
}
.playlist-caption {
  display: block;
  margin-top: 4px;
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.6;
}
.collection-empty {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--app-muted);
  text-align: center;
  h2 {
    color: var(--app-text);
    font-size: 16px;
    font-weight: 550;
  }
  p {
    font-size: 13px;
  }
}
.collection-skeleton {
  max-width: 210px;
  div,
  span {
    display: block;
    border-radius: 10px;
    background: var(--app-surface);
  }
  div {
    aspect-ratio: 1;
  }
  span {
    width: 75%;
    height: 12px;
    margin-top: 12px;
    border-radius: 4px;
  }
}
@media (max-width: 650px) {
  .collection-grid {
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 22px 16px;
  }
  .collection-toolbar {
    gap: 12px;
  }
  .collection-tabs button {
    padding: 0 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .playlist-cover,
  .cover-open {
    transition: none;
  }
}
</style>
