<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isElectron } from '@/utils'
import Versions from '@/components/Versions.vue'
import AppearanceSettings from './components/AppearanceSettings.vue'
import NetworkSettings from './components/NetworkSettings.vue'
import FontSettings from './components/FontSettings.vue'
import SystemSettings from './components/SystemSettings.vue'
import ShortcutSettings from './components/ShortcutSettings.vue'
import ServerSettings from './components/ServerSettings.vue'

const route = useRoute()
const router = useRouter()
const desktop = isElectron()
const tabs = [
  { id: 'appearance', label: '外观与歌词', icon: 'mdi-palette-outline' },
  { id: 'network', label: '网络与服务', icon: 'mdi-wifi' },
  { id: 'shortcuts', label: '快捷键', icon: 'mdi-keyboard-outline' },
  { id: 'general', label: '通用与关于', icon: 'mdi-tune-variant' }
]
const activeTab = computed(() =>
  tabs.some((tab) => tab.id === route.query.tab) ? String(route.query.tab) : 'appearance'
)
const tabButtons = ref<HTMLButtonElement[]>([])
const page = ref<HTMLElement | null>(null)
watch(activeTab, async () => {
  await nextTick()
  const container = page.value?.closest<HTMLElement>('.body')
  if (container) container.scrollTop = 0
})
const selectTab = (id: string) => {
  if (activeTab.value === id) return
  void router.replace({ query: { ...route.query, tab: id } })
}
const navigateTabs = async (event: KeyboardEvent, index: number) => {
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = tabs.length - 1
  else return
  event.preventDefault()
  selectTab(tabs[next].id)
  await nextTick()
  tabButtons.value[next]?.focus()
}
</script>

<template>
  <div ref="page" class="settings-page">
    <header class="settings-heading">
      <div>
        <h1>设置</h1>
        <p>管理外观、连接和快捷键。</p>
      </div>
      <span class="settings-save-hint"><v-icon icon="mdi-laptop" size="15" />偏好保存在此设备</span>
    </header>

    <nav class="settings-tabs" role="tablist" aria-label="设置分类">
      <button
        v-for="(tab, index) in tabs"
        :id="`settings-tab-${tab.id}`"
        :key="tab.id"
        :ref="(el) => (tabButtons[index] = el as HTMLButtonElement)"
        type="button"
        role="tab"
        :aria-controls="`settings-panel-${tab.id}`"
        :aria-selected="activeTab === tab.id"
        :tabindex="activeTab === tab.id ? 0 : -1"
        :class="{ selected: activeTab === tab.id }"
        @click="selectTab(tab.id)"
        @keydown="navigateTabs($event, index)"
      >
        <v-icon :icon="tab.icon" size="18" />{{ tab.label }}
      </button>
    </nav>

    <section
      id="settings-panel-appearance"
      v-show="activeTab === 'appearance'"
      role="tabpanel"
      aria-labelledby="settings-tab-appearance"
      class="settings-panel"
    >
      <AppearanceSettings />
      <FontSettings />
    </section>
    <section
      id="settings-panel-network"
      v-show="activeTab === 'network'"
      role="tabpanel"
      aria-labelledby="settings-tab-network"
      class="settings-panel"
    >
      <NetworkSettings />
      <ServerSettings v-if="desktop" />
    </section>
    <section
      id="settings-panel-shortcuts"
      v-show="activeTab === 'shortcuts'"
      role="tabpanel"
      aria-labelledby="settings-tab-shortcuts"
      class="settings-panel"
    >
      <ShortcutSettings :active="activeTab === 'shortcuts'" />
    </section>
    <section
      id="settings-panel-general"
      v-show="activeTab === 'general'"
      role="tabpanel"
      aria-labelledby="settings-tab-general"
      class="settings-panel"
    >
      <SystemSettings :active="activeTab === 'general'" />
      <Versions />
    </section>
  </div>
</template>

<style lang="less" scoped>
.settings-page {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px var(--app-gutter) 28px;
  color: var(--app-text);
}
.settings-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  > div {
    display: flex;
    align-items: baseline;
    gap: 14px;
  }
  h1 {
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
    font-weight: 650;
  }
  p {
    margin: 0;
    color: var(--app-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}
.settings-save-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  color: var(--app-muted);
  font-size: 12px;
}
.settings-tabs {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  gap: 4px;
  padding: 4px;
  overflow-x: auto;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-panel);
  scrollbar-width: none;
  button {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex: 1 0 auto;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    color: var(--app-muted);
    background: transparent;
    font-size: 13px;
    font-weight: 550;
    cursor: pointer;
    transition:
      color 140ms ease,
      background-color 140ms ease;
    &:hover {
      color: var(--app-text);
    }
    &.selected {
      color: var(--app-accent);
      background: var(--app-accent-soft);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: -2px;
      border-radius: 4px;
    }
  }
}
.settings-panel {
  padding-top: 22px;
  :deep(.settings-section + .settings-section) {
    padding-top: 16px;
    border-top: 1px solid var(--app-border);
  }
}
@media (max-width: 700px) {
  .settings-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    > div {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
    }
  }
  .settings-save-hint {
    display: none;
  }
  .settings-tabs {
    button {
      gap: 6px;
      padding: 10px;
      font-size: 12px;
    }
  }
}
@media (max-width: 480px) {
  .settings-tabs button {
    flex: 1 0 0;
    gap: 5px;
    padding: 9px 6px;
    font-size: 11px;
    :deep(.v-icon) {
      display: none;
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .settings-tabs button {
    transition: none;
  }
}
</style>
