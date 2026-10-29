<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { GetMusicDetailData } from '@/api/musicList'
import { useMusicAction } from '@/store/music'
import { useUserInfo } from '@/store'
import { useFlags } from '@/store/flags'
import useMusic from './useMusic'
import { getSongCommentLabel, loadSongCommentCount } from '@/utils/songComments'

const props = defineProps<{ songs: GetMusicDetailData; isPlay: boolean }>()
const emit = defineEmits<{
  play: []
  pause: []
  cutSong: [next: boolean]
  setOrderHandler: []
}>()

const music = useMusicAction()
const user = useUserInfo()
const flags = useFlags()
const router = useRouter()
const { likeMusic } = useMusic()
const liking = ref(false)
const lastVolume = ref(user.volume > 0 ? user.volume : 1)
const hasSong = computed(() => Boolean(props.songs?.id))
const canPlay = computed(() => hasSong.value && Boolean(music.state.musicUrl))
const canSkip = computed(() => canPlay.value && music.state.runtimeIds.length > 0)
const artist = computed(() => props.songs?.ar?.map((item) => item.name).join(' / ') || '未知艺术家')
const isLiked = computed(() => user.userLikeIds.includes(props.songs?.id))
const modeNames = ['心动模式', '列表循环', '随机播放', '单曲循环']
const modeIcons = ['mdi-heart-multiple-outline', 'mdi-repeat', 'mdi-shuffle', 'mdi-repeat-once']
const modeName = computed(() => modeNames[music.state.orderStatusVal])
const modeIcon = computed(() => modeIcons[music.state.orderStatusVal])
const duration = computed(() => {
  const seconds = Number(props.songs?.dt) / 1000
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0
})
const elapsed = computed(() =>
  Math.min(duration.value, Math.max(0, Number(music.state.currentTime) || 0))
)
const progress = computed(() => (duration.value ? (elapsed.value / duration.value) * 100 : 0))
const volume = computed(() => Math.min(1, Math.max(0, Number(user.volume) || 0)))
const commentLabel = computed(() => getSongCommentLabel(props.songs?.id))
watch(volume, (value) => {
  if (value > 0) lastVolume.value = value
})
const timeLabel = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

watch(
  () => [props.songs?.id, flags.isOpenDetail] as const,
  ([id, open]) => {
    if (id && open) void loadSongCommentCount(id)
  },
  { immediate: true }
)

const seek = (event: Event) => {
  if (!canPlay.value || !duration.value || !window.$audio) return
  const seconds = Math.min(
    duration.value,
    Math.max(0, Number((event.target as HTMLInputElement).value))
  )
  if (!Number.isFinite(seconds)) return
  window.$audio.time = seconds
  music.state.currentTime = seconds
}

const setVolume = (value: number) => {
  const next = Math.min(1, Math.max(0, value))
  if (next > 0) lastVolume.value = next
  user.volume = next
  localStorage.setItem('volume', String(next))
  if (window.$audio?.el) window.$audio.el.volume = next
}
const changeVolume = (event: Event) => setVolume(Number((event.target as HTMLInputElement).value))
const toggleMute = () => setVolume(volume.value > 0 ? 0 : lastVolume.value)
const toggleLike = async () => {
  if (!hasSong.value || !user.isLogin || liking.value) return
  liking.value = true
  try {
    await likeMusic(props.songs.id, !isLiked.value)
  } finally {
    liking.value = false
  }
}
const openComments = () => {
  if (!hasSong.value) return
  void router.push({ path: '/comment', query: { id: props.songs.id } })
  flags.isOpenDetail = false
}
</script>

<template>
  <div class="detail-controls">
    <div class="track-heading">
      <div class="track-meta">
        <h1 :title="songs?.name || '暂无播放歌曲'">{{ songs?.name || '暂无播放歌曲' }}</h1>
        <p :title="artist">{{ hasSong ? artist : '选择一首喜欢的音乐' }}</p>
      </div>
      <button
        type="button"
        class="icon-button favorite-button"
        :class="{ active: isLiked }"
        :disabled="!hasSong || !user.isLogin || liking"
        :aria-label="isLiked ? '取消喜欢' : '喜欢这首歌'"
        :title="!user.isLogin ? '登录后收藏歌曲' : isLiked ? '取消喜欢' : '喜欢这首歌'"
        :aria-pressed="isLiked"
        @click="toggleLike"
      >
        <v-icon :icon="isLiked ? 'mdi-star' : 'mdi-star-outline'" size="23" />
      </button>
    </div>

    <div class="seek-control">
      <input
        class="range seek-range"
        type="range"
        min="0"
        :max="duration || 1"
        step="0.1"
        :value="elapsed"
        :style="{ '--range-progress': `${progress}%` }"
        :disabled="!canPlay || !duration"
        aria-label="播放进度"
        :aria-valuetext="`${timeLabel(elapsed)}，共 ${timeLabel(duration)}`"
        @input="seek"
      />
      <div class="time-labels">
        <span>{{ timeLabel(elapsed) }}</span
        ><span>−{{ timeLabel(duration - elapsed) }}</span>
      </div>
    </div>

    <div class="transport-controls">
      <button
        type="button"
        class="icon-button skip-button"
        :disabled="!canSkip"
        title="上一首"
        aria-label="上一首"
        @click="emit('cutSong', false)"
      >
        <v-icon icon="mdi-skip-previous" size="36" />
      </button>
      <button
        type="button"
        class="icon-button play-button"
        :disabled="!canPlay"
        :title="isPlay ? '暂停' : '播放'"
        :aria-label="isPlay ? '暂停' : '播放'"
        @click="isPlay ? emit('pause') : emit('play')"
      >
        <v-icon :icon="isPlay ? 'mdi-pause' : 'mdi-play'" size="49" />
      </button>
      <button
        type="button"
        class="icon-button skip-button"
        :disabled="!canSkip"
        title="下一首"
        aria-label="下一首"
        @click="emit('cutSong', true)"
      >
        <v-icon icon="mdi-skip-next" size="36" />
      </button>
    </div>

    <div class="volume-control">
      <button
        type="button"
        class="icon-button volume-button"
        :title="volume ? '静音' : '取消静音'"
        :aria-label="volume ? '静音' : '取消静音'"
        @click="toggleMute"
      >
        <v-icon :icon="volume ? 'mdi-volume-low' : 'mdi-volume-off'" size="21" />
      </button>
      <input
        class="range volume-range"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        :style="{ '--range-progress': `${volume * 100}%` }"
        aria-label="音量"
        :aria-valuetext="`${Math.round(volume * 100)}%`"
        @input="changeVolume"
      />
      <v-icon class="volume-high" icon="mdi-volume-high" size="21" />
    </div>

    <div class="secondary-controls">
      <button
        type="button"
        class="text-button"
        :disabled="!hasSong"
        :title="commentLabel"
        @click="openComments"
      >
        <v-icon icon="mdi-comment-text-outline" size="17" /><span>{{ commentLabel }}</span>
      </button>
      <button
        type="button"
        class="icon-button mode-button"
        :disabled="!canPlay"
        :title="`${modeName}，点击切换`"
        :aria-label="`${modeName}，切换播放模式`"
        @click="emit('setOrderHandler')"
      >
        <v-icon :icon="modeIcon" size="20" />
      </button>
      <button
        type="button"
        class="text-button"
        :class="{ active: flags.isOpenDrawer }"
        title="播放队列"
        :aria-pressed="flags.isOpenDrawer"
        @click.stop="flags.isOpenDrawer = !flags.isOpenDrawer"
      >
        <v-icon icon="mdi-playlist-music" size="21" /><span>待播列表</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-controls {
  width: 100%;
  min-width: 0;
  color: rgba(255, 255, 255, 0.92);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-app-region: no-drag;
}
.track-heading {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}
.track-meta {
  flex: 1;
  min-width: 0;
  h1,
  p {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin: 0;
  }
  h1 {
    font-size: 23px;
    line-height: 1.4;
    font-weight: 650;
    letter-spacing: -0.035em;
  }
  p {
    margin-top: 3px;
    font-size: 16px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.56);
  }
}
.icon-button,
.text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 8px;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}
.icon-button {
  width: 32px;
  height: 32px;
}
.favorite-button {
  color: rgba(255, 255, 255, 0.7);
}
.active {
  color: white;
}
.range {
  display: block;
  width: 100%;
  height: 4px;
  border-radius: 20px;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.65) var(--range-progress, 0%),
    rgba(255, 255, 255, 0.19) var(--range-progress, 0%)
  );
  cursor: pointer;
  &::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: white;
    opacity: 0;
  }
  &:hover::-webkit-slider-thumb,
  &:focus-visible::-webkit-slider-thumb {
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 5px;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
.seek-range {
  margin: 7px 0 0;
}
.time-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.4);
}
.transport-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(24px, 4vw, 52px);
  margin-top: 8px;
}
.mode-button {
  color: rgba(255, 255, 255, 0.56);
}
.skip-button {
  width: 44px;
  height: 48px;
}
.play-button {
  width: 58px;
  height: 58px;
}
.volume-control {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.5);
}
.volume-button {
  width: 24px;
  height: 28px;
}
.volume-range {
  flex: 1;
  min-width: 0;
  margin: 0;
  height: 3px;
}
.volume-high {
  flex-shrink: 0;
}
.secondary-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.55);
}
.text-button {
  gap: 5px;
  min-height: 30px;
  padding: 3px 2px;
  font-size: 11px;
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .icon-button,
  .text-button {
    transition: none;
  }
}
</style>
