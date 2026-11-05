<script setup lang="ts">
import { formatDate, formatNumberToMillion, toggleImg } from '@/utils'
import { useMusicAction } from '@/store/music'
import { computed, ref, watch } from 'vue'
import { useTheme } from '@/store/theme'
import { useRoute, useRouter } from 'vue-router'

const music = useMusicAction()
const theme = useTheme()
const router = useRouter()
const route = useRoute()
const cover = ref('')
const item = computed(() => music.state.currentItem)
const creator = computed(() => item.value?.creator)
const creatorId = computed(() => creator.value?.userId || item.value?.userId)
const kind = computed(() => (route.query.type === 'album' ? '专辑' : '歌单'))
const isAlbum = computed(() => route.query.type === 'album')

watch(
  () => item.value?.coverImgUrl,
  (val, _oldVal, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    cover.value = val || ''
    if (!val) return

    toggleImg(val, '400y400').then((img) => {
      if (!cancelled) cover.value = img.src
    })
    theme.change(val)
  },
  { immediate: true }
)

const gotoUserDetail = () => {
  if (!creatorId.value) return
  router.push({ path: '/detail', query: { uid: creatorId.value } })
}
const gotoArtist = () => {
  if (item.value?.albumArtist?.id) {
    router.push({ path: '/singer-page', query: { id: item.value.albumArtist.id } })
  }
}
</script>

<template>
  <section v-if="item?.name" class="list-info" :aria-label="`${kind}信息`">
    <div
      class="cover"
      :style="{ backgroundImage: `url(${cover})` }"
      role="img"
      :aria-label="item.name"
    >
      <v-icon v-if="!cover" icon="mdi-music-box-outline" size="48" />
    </div>
    <div class="info">
      <span class="kind">{{ kind }}</span>
      <h1 class="name" :title="item.name">{{ item.name }}</h1>
      <div v-if="isAlbum && (item.albumArtist || item.publishTime)" class="creator-row">
        <button
          v-if="item.albumArtist"
          class="creator"
          type="button"
          :disabled="!item.albumArtist.id"
          @click="gotoArtist"
        >
          {{ item.albumArtist.name }}
        </button>
        <span v-if="item.publishTime">{{ formatDate(item.publishTime, 'YY-MM-DD') }} 发行</span>
      </div>
      <div v-else-if="!isAlbum && (creator?.nickname || item.createTime)" class="creator-row">
        <button
          v-if="creator?.nickname"
          class="creator"
          type="button"
          :disabled="!creatorId"
          @click="gotoUserDetail"
        >
          <img v-if="creator.avatarUrl" :src="creator.avatarUrl" alt="" class="avatar" />
          <span class="nickname">{{ creator.nickname }}</span>
        </button>
        <span v-if="item.createTime" class="create-time">
          {{ formatDate(item.createTime, 'YY-MM-DD') }} 创建
        </span>
      </div>
      <div v-if="item.trackCount != null || item.playCount != null" class="stats">
        <span v-if="item.trackCount != null">{{ item.trackCount }} 首歌曲</span>
        <span v-if="!isAlbum && item.playCount != null"
          >{{ formatNumberToMillion(item.playCount) }} 次播放</span
        >
      </div>
      <p v-if="item.description" class="description" :title="item.description">
        {{ item.description }}
      </p>
    </div>
  </section>
</template>

<style lang="less" scoped>
.list-info {
  display: flex;
  align-items: center;
  gap: 28px;
  min-width: 0;
  padding: 24px var(--app-gutter) 24px;
  color: var(--app-text);
}

.cover {
  display: grid;
  place-items: center;
  color: var(--app-muted);
  flex: 0 0 192px;
  width: 192px;
  height: 192px;
  border-radius: 14px;
  background-color: var(--app-surface);
  background-position: center;
  background-size: cover;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
}

.info {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.kind {
  color: var(--app-muted);
  font-size: 12px;
  font-weight: 550;
  letter-spacing: 1.5px;
}

.name {
  display: -webkit-box;
  overflow: hidden;
  max-width: 100%;
  margin: 0 0 2px;
  font-size: var(--app-title-size, clamp(26px, 2.3vw, 32px));
  font-weight: 650;
  line-height: 1.3;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.creator-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  max-width: 100%;
  color: var(--app-muted);
  font-size: 13px;
}

.creator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-accent);
  font: inherit;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--app-text);
  }

  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 4px;
    border-radius: 4px;
  }

  &:disabled {
    color: var(--app-muted);
    cursor: default;
  }
}

.avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.nickname {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.create-time {
  white-space: nowrap;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.5;

  span + span::before {
    content: '·';
    margin: 0 9px;
  }
}

.description {
  display: -webkit-box;
  overflow: hidden;
  max-width: 680px;
  margin: 0;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 1050px), (max-height: 760px) {
  .list-info {
    gap: 24px;
  }

  .cover {
    flex-basis: 160px;
    width: 160px;
    height: 160px;
  }
}

@media (max-width: 600px) {
  .list-info {
    align-items: flex-start;
    gap: 18px;
  }

  .cover {
    flex-basis: 112px;
    width: 112px;
    height: 112px;
    border-radius: 10px;
  }
}
</style>
