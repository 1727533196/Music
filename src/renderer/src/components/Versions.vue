<script setup lang="ts">
import logoPng from '@/assets/logo.png'
import { version } from '../../../../package.json'

const versions = window.electron?.process?.versions
const runtimeVersions = [
  { label: 'Electron', value: versions?.electron },
  { label: 'Chromium', value: versions?.chrome },
  { label: 'Node.js', value: versions?.node }
].filter((entry) => entry.value)
</script>

<template>
  <section class="settings-section version-section" aria-labelledby="about-title">
    <h2 id="about-title" class="section-title">关于</h2>
    <div class="app-identity">
      <img :src="logoPng" alt="" class="app-logo" />
      <div>
        <h3>Tinglan</h3>
        <p>版本 {{ version }}</p>
        <p class="app-description">让音乐陪伴每一天。</p>
      </div>
    </div>
    <details v-if="runtimeVersions.length" class="runtime-details">
      <summary>运行环境</summary>
      <dl>
        <div v-for="entry in runtimeVersions" :key="entry.label" class="runtime-row">
          <dt>{{ entry.label }}</dt>
          <dd>{{ entry.value }}</dd>
        </div>
      </dl>
    </details>
  </section>
</template>

<style lang="less" scoped>
@import '../views/Setting/index.less';
.app-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 0 20px;
  > div {
    display: grid;
    grid-template-columns: auto auto;
    align-items: baseline;
    column-gap: 12px;
    row-gap: 5px;
    min-width: 0;
  }
}
.app-logo {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 11px;
  object-fit: contain;
}
.app-identity h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 16px;
  font-weight: 600;
}
.app-identity p {
  margin: 0;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.5;
}
.app-description {
  grid-column: 1 / -1;
  color: var(--app-muted);
  font-size: 13px;
}
.runtime-details {
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 13px;
}
.runtime-details summary {
  padding: 13px 0;
  cursor: pointer;
  color: var(--app-text);
  font-size: 12px;
}
.runtime-details summary:hover {
  color: var(--app-accent);
}
.runtime-details summary:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.runtime-details dl {
  margin: 0 0 4px;
}
.runtime-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 9px 0;
  border-bottom: 1px solid var(--app-border);
  &:last-child {
    border-bottom: 0;
  }
}
.runtime-row dd {
  margin: 0;
  font:
    12px ui-monospace,
    'SFMono-Regular',
    monospace;
  font-variant-numeric: tabular-nums;
  text-align: right;
  overflow-wrap: anywhere;
}
@media (max-width: 480px) {
  .app-identity > div {
    column-gap: 8px;
  }
}
</style>
