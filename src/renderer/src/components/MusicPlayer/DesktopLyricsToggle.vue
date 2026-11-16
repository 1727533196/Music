<script setup lang="ts">
import { useDesktopLyrics } from '@/store/desktopLyrics'
defineProps<{ light?: boolean }>()
const desktop = useDesktopLyrics()
</script>
<template>
  <button
    v-if="desktop.available"
    type="button"
    class="desktop-lyrics-toggle"
    :class="{ light, active: desktop.state.enabled }"
    aria-label="桌面歌词"
    title="显示／隐藏桌面歌词"
    :aria-pressed="desktop.state.enabled"
    @click.stop="desktop.configure({ enabled: !desktop.state.enabled })"
  >
    词
  </button>
</template>
<style scoped>
.desktop-lyrics-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 28px;
  width: 28px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.desktop-lyrics-toggle:hover {
  background: var(--app-hover);
  color: var(--app-text);
}
.desktop-lyrics-toggle.active {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}
.desktop-lyrics-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.desktop-lyrics-toggle.light {
  color: #ffffffb3;
}
.desktop-lyrics-toggle.light:hover,
.desktop-lyrics-toggle.light.active {
  background: #ffffff1a;
  color: white;
}
</style>
