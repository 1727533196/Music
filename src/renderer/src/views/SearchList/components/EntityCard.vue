<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatNumberToMillion } from '@/utils'

interface Props {
  kind: 'artist' | 'album' | 'playlist'
  id: number
  name: string
  image?: string
  caption?: string
  playCount?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ open: [] }>()
const imageFailed = ref(false)
const labels = { artist: '歌手', album: '专辑', playlist: '歌单' }
const icons = {
  artist: 'mdi-account-music-outline',
  album: 'mdi-album',
  playlist: 'mdi-playlist-music-outline'
}
const imageUrl = computed(() => {
  if (!props.image) return ''
  if (!/^https?:\/\//i.test(props.image)) return props.image
  try {
    const url = new URL(props.image)
    url.searchParams.set('param', '400y400')
    return url.toString()
  } catch {
    return props.image
  }
})

watch(imageUrl, () => {
  imageFailed.value = false
})
</script>

<template>
  <button
    type="button"
    class="entity-card"
    :class="{ 'entity-card--artist': kind === 'artist' }"
    :data-entity-id="id"
    :aria-label="`查看${labels[kind]}：${name}${caption ? `，${caption}` : ''}`"
    @click="emit('open')"
  >
    <span class="entity-artwork">
      <span class="artwork-placeholder" aria-hidden="true">
        <v-icon :icon="icons[kind]" size="36" />
      </span>
      <img
        v-if="imageUrl && !imageFailed"
        :src="imageUrl"
        alt=""
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      />
      <span v-if="kind === 'playlist' && playCount" class="play-count">
        <v-icon icon="mdi-play-outline" size="13" aria-hidden="true" />
        <span>{{ formatNumberToMillion(playCount) }}</span>
      </span>
    </span>
    <span class="entity-name" :title="name">{{ name }}</span>
    <span v-if="caption" class="entity-caption" :title="caption">{{ caption }}</span>
  </button>
</template>

<style scoped lang="less">
.entity-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 5px;
  }
}
.entity-artwork {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  transition: background 0.18s;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }
}
.artwork-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-muted);
  opacity: 0.6;
}
.play-count {
  position: absolute;
  right: 7px;
  bottom: 7px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: calc(100% - 14px);
  padding: 3px 6px;
  border: 1px solid var(--app-border);
  border-radius: 5px;
  background: var(--app-panel);
  color: var(--app-text);
  font-size: 10px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
.entity-name {
  display: -webkit-box;
  width: 100%;
  min-width: 0;
  min-height: 3em;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  overflow-wrap: anywhere;
  transition: color 0.18s;
}
.entity-caption {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  margin-top: 3px;
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entity-card--artist {
  text-align: center;

  .entity-artwork {
    border-radius: 50%;
  }
}
@media (hover: hover) {
  .entity-card:hover {
    .entity-artwork {
      background: var(--app-hover);

      img {
        transform: scale(1.025);
      }
    }
    .entity-name {
      color: var(--app-accent);
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .entity-artwork,
  .entity-artwork img,
  .entity-name {
    transition: none;
  }
}
</style>
