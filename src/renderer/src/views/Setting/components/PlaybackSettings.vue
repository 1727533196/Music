<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettings } from '@/store/settings'
import { useMusicAction } from '@/store/music'
import {
  audioQualities,
  isAudioQuality,
  type AudioCacheStats
} from '../../../../../shared/audioCache'

const settings = useSettings()
const music = useMusicAction()
const stats = ref<AudioCacheStats | null>(null)
const available = Boolean(window.audioCache)
const busy = ref(false)
const feedback = ref('')
const size = (bytes: number) =>
  bytes >= 1024 ** 3
    ? (bytes / 1024 ** 3).toFixed(2) + ' GB'
    : (bytes / 1024 ** 2).toFixed(1) + ' MB'
async function refresh() {
  if (!window.audioCache || busy.value) return
  busy.value = true
  try {
    stats.value = await window.audioCache.stats()
  } catch {
    feedback.value = '暂时无法读取缓存，请重试。'
  } finally {
    busy.value = false
  }
}
async function clear() {
  if (!window.audioCache || busy.value) return
  busy.value = true
  try {
    stats.value = await window.audioCache.clear(music.state.musicUrl)
    feedback.value = stats.value.count
      ? '其他音频缓存已清理，当前播放的文件已保留。'
      : '音频缓存已清理。'
  } catch {
    feedback.value = '缓存清理失败，请重试。'
  } finally {
    busy.value = false
  }
}
function change(event: Event) {
  const quality = (event.target as HTMLSelectElement).value
  if (isAudioQuality(quality)) settings.setState({ audioQuality: quality })
}
onMounted(() => void refresh())
</script>
<template>
  <section class="settings-section playback-settings">
    <h2 class="section-title">音质与音频缓存</h2>
    <div class="playback-setting-row">
      <label for="preferred-quality">播放音质</label
      ><select id="preferred-quality" :value="settings.state.audioQuality" @change="change">
        <option v-for="quality in audioQualities" :key="quality.value" :value="quality.value">
          {{ quality.label }} · {{ quality.description }}
        </option>
      </select>
    </div>
    <p>
      切换音质会保留当前进度和播放／暂停状态；可用音质由歌曲资源与账号权限决定，播放器会显示实际返回的音质。
    </p>
    <div class="cache-summary">
      <span
        >{{
          stats
            ? `已缓存 ${stats.count} 份音频 · ${size(stats.bytes)} / ${size(stats.limit)}`
            : available
              ? '暂未获取缓存用量'
              : '音频缓存仅在桌面应用中可用'
        }}<span v-if="stats?.pending"> · {{ stats.pending }} 份正在缓存</span></span
      >
      <div>
        <button type="button" :disabled="busy || !available" @click="refresh">刷新用量</button
        ><button type="button" :disabled="busy || !stats" @click="clear">清理音频缓存</button>
      </div>
    </div>
    <p>
      播放时自动缓存完整音频，相同音质下再次播放优先读取本地文件，重启后仍可复用。最多保留 2
      GB，自动清理较久未使用的文件；试听片段不作为完整歌曲缓存。清理缓存保留当前播放文件、登录信息和设置。
    </p>
    <p v-if="feedback" role="status">{{ feedback }}</p>
  </section>
</template>
<style scoped lang="less">
@import '../index.less';
.playback-setting-row,
.cache-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 16px 0 10px;
  flex-wrap: wrap;
  color: var(--app-text);
  font-size: 13px;
}
.cache-summary > div {
  display: flex;
  gap: 8px;
}
select,
button {
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-bg);
  color: var(--app-text);
  font: inherit;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
select:focus-visible,
button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
p {
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.8;
}
</style>
