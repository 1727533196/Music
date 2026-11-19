<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { useMusicAction } from '@/store/music'
import { currentAudioOutput, forgetAudioOutput, rememberedAudioOutputs } from '@/utils/deviceVolume'
import AppSelect from '@/components/AppSelect/index.vue'
import type { SelectValue } from '@/components/AppSelect/types'
import {
  audioQualities,
  isAudioQuality,
  type AudioCacheStats
} from '../../../../../shared/audioCache'

const settings = useSettings()
const music = useMusicAction()
const user = useUserInfo()
const outputName = computed(() => {
  const output = currentAudioOutput.value
  if (output === undefined) return '正在识别输出设备…'
  if (output === null) return '暂未识别到独立输出设备'
  return output.label.trim() || '系统默认输出（名称不可用）'
})
const outputVolume = computed(() => Math.round(user.volume * 100))

function changeOutputVolume(event: Event) {
  const value = (event.currentTarget as HTMLInputElement).valueAsNumber
  if (Number.isFinite(value)) user.volume = Math.min(100, Math.max(0, value)) / 100
}

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
function change(quality: SelectValue) {
  if (isAudioQuality(quality)) settings.setState({ audioQuality: quality })
}
onMounted(() => void refresh())
</script>
<template>
  <section class="settings-section playback-settings">
    <h2 class="section-title">音质与音频缓存</h2>
    <div class="playback-setting-row">
      <label for="preferred-quality">播放音质</label>
      <AppSelect
        id="preferred-quality"
        class="quality-select"
        :model-value="settings.state.audioQuality"
        :options="audioQualities"
        @change="change"
      />
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

    <section class="output-settings" aria-labelledby="output-settings-title">
      <h3 id="output-settings-title" class="section-title">音频输出</h3>
      <div class="output-device">
        <span>当前设备</span>
        <div class="output-device-info" aria-live="polite">
          <strong class="output-device-name">{{ outputName }}</strong>
          <span class="output-device-hint">跟随系统默认输出</span>
        </div>
      </div>
      <div class="playback-setting-row output-volume-row">
        <label for="output-device-volume">Tinglan 音量</label>
        <div class="output-volume-control">
          <input
            id="output-device-volume"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="outputVolume"
            :aria-valuetext="`${outputVolume}%`"
            aria-describedby="output-volume-hint"
            @input="changeOutputVolume"
          />
          <output class="output-volume-value" for="output-device-volume">{{
            `${outputVolume}%`
          }}</output>
        </div>
      </div>
      <p id="output-volume-hint">
        {{
          currentAudioOutput
            ? '当前设备的音量会单独记忆，切回时自动恢复，不影响系统音量。'
            : '未识别设备时沿用 Tinglan 的音量，不影响系统音量。'
        }}
      </p>
      <details class="remembered-outputs">
        <summary>已记忆设备（{{ rememberedAudioOutputs.length }}）</summary>
        <p v-if="!rememberedAudioOutputs.length">暂无设备音量记录。</p>
        <template v-else>
          <p>忘记记录不会改变现在的音量；下次接入时按新设备处理。</p>
          <ul class="remembered-output-list">
            <li v-for="device in rememberedAudioOutputs" :key="device.id" class="remembered-output">
              <div class="remembered-output-info">
                <span class="remembered-output-name">{{ device.label || '未命名设备' }}</span>
                <span v-if="currentAudioOutput?.id === device.id" class="output-device-hint">
                  当前设备
                </span>
              </div>
              <span class="remembered-output-volume">{{ Math.round(device.volume * 100) }}%</span>
              <button
                type="button"
                class="forget-output"
                :aria-label="`忘记 ${device.label || '未命名设备'} 的音量记录`"
                @click="forgetAudioOutput(device.id)"
              >
                忘记
              </button>
            </li>
          </ul>
        </template>
      </details>
    </section>
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
.quality-select {
  width: 210px;
  max-width: 100%;
}
.output-settings {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--app-border);
}
.output-device {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  flex-wrap: wrap;
  font-size: 13px;
}
.output-device-info {
  display: grid;
  min-width: 0;
  gap: 4px;
  overflow-wrap: anywhere;
}
.output-device-name {
  font-weight: 550;
}
.output-device-hint {
  color: var(--app-muted);
  font-size: 12px;
}
.output-volume-control {
  display: flex;
  align-items: center;
  flex: 0 1 260px;
  gap: 12px;
  max-width: 100%;
  input {
    flex: 1;
    min-width: 0;
    margin: 0;
    accent-color: var(--app-accent);
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.output-volume-value {
  min-width: 4ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.remembered-outputs {
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  font-size: 13px;
  summary {
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.remembered-output-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.remembered-output {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4ch auto;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--app-border);
}
.remembered-output-info {
  display: grid;
  gap: 4px;
  overflow-wrap: anywhere;
}
.remembered-output-volume {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
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
