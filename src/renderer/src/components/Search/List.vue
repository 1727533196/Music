<script setup lang="ts">
import { computed } from 'vue'
import type { HotSearch, RecordContent, SuggestionKey, Suggestions } from './type'

const props = defineProps<{
  list: HotSearch[]
  keywordsList: Suggestions
  model: 'hot' | 'keywords'
  recordContent: RecordContent[]
  keywords: string
  loading: boolean
  error: string
}>()
const emit = defineEmits(['click', 'clear', 'recordTagClick', 'deleteTag', 'retry'])
const labels: Record<SuggestionKey, string> = {
  allMatch: '猜你想搜',
  songs: '单曲',
  artists: '歌手',
  albums: '专辑',
  playlists: '歌单'
}
const sections = computed(() =>
  (props.keywordsList.order || []).filter((key) => labels[key] && props.keywordsList[key]?.length)
)
const highlight = (text = '') => {
  const term = props.keywords.trim()
  const index = term ? text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1
  return index < 0
    ? { before: text, match: '', after: '' }
    : {
        before: text.slice(0, index),
        match: text.slice(index, index + term.length),
        after: text.slice(index + term.length)
      }
}
</script>

<template>
  <div class="search-list">
    <template v-if="model === 'hot'">
      <section v-if="recordContent.length" class="history-section" aria-label="搜索历史">
        <div class="section-heading">
          <span>搜索历史</span>
          <button
            type="button"
            class="clear-history"
            aria-label="清空搜索历史"
            title="清空搜索历史"
            @click="emit('clear')"
          >
            <v-icon icon="mdi-trash-can-outline" size="16" />
          </button>
        </div>
        <div class="history-list">
          <div v-for="(item, index) in recordContent" :key="item.term" class="history-item">
            <button
              type="button"
              class="history-term"
              data-search-option
              :title="item.term"
              @click="emit('recordTagClick', item, index)"
            >
              {{ item.term }}
            </button>
            <button
              type="button"
              class="delete-history"
              :aria-label="`删除搜索记录：${item.term}`"
              @click="emit('deleteTag', index)"
            >
              <v-icon icon="mdi-close" size="13" />
            </button>
          </div>
        </div>
      </section>
      <section class="hot-section" aria-label="热门搜索">
        <div class="section-heading">
          <span>热门搜索</span><span class="heading-caption">此刻大家都在听</span>
        </div>
        <template v-if="!loading && !error">
          <button
            v-for="(item, index) in list"
            :key="item.searchWord"
            type="button"
            data-search-option
            class="hot-item"
            @click="emit('click', item, 'hot')"
          >
            <span class="rank" :class="{ leading: index < 3 }">{{ index + 1 }}</span>
            <span class="hot-content"
              ><span class="result-name">{{ item.searchWord }}</span
              ><span v-if="item.content" class="result-description">{{ item.content }}</span></span
            >
            <v-icon icon="mdi-arrow-top-right" class="result-arrow" size="15" />
          </button>
          <p v-if="!list.length" class="search-state">暂无热门搜索，输入关键词开始搜索</p>
        </template>
      </section>
    </template>
    <template v-else-if="!loading && !error">
      <section v-for="key in sections" :key="key" class="suggest-section" :aria-label="labels[key]">
        <div class="section-heading">
          <span>{{ labels[key] }}</span>
        </div>
        <button
          v-for="(target, index) in keywordsList[key]"
          :key="target.id || `${target.keyword}-${index}`"
          type="button"
          data-search-option
          class="suggest-item"
          @click="emit('click', target, key)"
        >
          <v-icon
            :icon="
              key === 'songs'
                ? 'mdi-music-note-outline'
                : key === 'artists'
                  ? 'mdi-account-music-outline'
                  : key === 'albums'
                    ? 'mdi-album'
                    : key === 'playlists'
                      ? 'mdi-playlist-music-outline'
                      : 'mdi-magnify'
            "
            size="17"
          />
          <span class="suggest-content">
            <span class="result-name"
              ><template v-for="part in [highlight(target.keyword || target.name)]" :key="index"
                >{{ part.before }}<mark v-if="part.match">{{ part.match }}</mark
                >{{ part.after }}</template
              ></span
            >
            <span
              v-if="key === 'songs' && (target.ar || target.artists)?.length"
              class="result-description"
              >{{ (target.ar || target.artists)?.map((artist) => artist.name).join(' / ') }}</span
            >
          </span>
          <v-icon v-if="key === 'songs'" icon="mdi-play" class="result-arrow" size="17" />
        </button>
      </section>
      <p v-if="!sections.length" class="search-state">暂无搜索建议，按 Enter 搜索全部结果</p>
    </template>
    <div v-if="loading" class="search-state" role="status">
      <v-progress-circular indeterminate size="18" width="2" />正在加载{{
        model === 'hot' ? '热门搜索' : '搜索建议'
      }}
    </div>
    <div v-else-if="error" class="search-state search-error" role="status">
      <span>{{ error }}</span
      ><button type="button" @click="emit('retry')">重试</button>
    </div>
    <div class="keyboard-hint" aria-hidden="true">
      <span>↑ ↓ 选择</span><span>Enter 确认</span><span>Esc 收起</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.search-list {
  padding: 8px;
  color: var(--app-text, #f2f3f5);
  button {
    font: inherit;
    color: inherit;
    border: 0;
    cursor: pointer;
    text-align: left;
    -webkit-app-region: no-drag;
    &:focus-visible {
      outline: 2px solid var(--app-accent, #fff);
      outline-offset: -2px;
    }
  }
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  padding: 4px 10px;
  color: var(--app-muted, #aaa2b1);
  font-size: 11px;
  font-weight: 500;
}
.heading-caption {
  font-size: 10px;
  opacity: 0.7;
}
.clear-history,
.delete-history {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--app-muted) !important;
  background: transparent;
  border-radius: 5px;
}
.clear-history {
  width: 26px;
  height: 26px;
  &:hover {
    background: var(--app-surface);
    color: var(--app-text) !important;
  }
}
.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 2px 10px 12px;
}
.history-item {
  display: flex;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  border-radius: 7px;
  background: var(--app-surface);
}
.history-term {
  min-width: 0;
  max-width: 190px;
  padding: 6px 4px 6px 10px;
  background: transparent;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px !important;
}
.delete-history {
  width: 24px;
  height: 27px;
  flex-shrink: 0;
  opacity: 0.65;
  &:hover {
    color: var(--app-text) !important;
    opacity: 1;
  }
}
.hot-item,
.suggest-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 47px;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  &:hover,
  &:focus-visible {
    background: var(--app-hover);
  }
}
.rank {
  width: 19px;
  flex: 0 0 19px;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--app-muted);
  &.leading {
    color: var(--app-accent);
  }
}
.hot-content,
.suggest-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}
.result-name,
.result-description {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-name {
  font-size: 13px;
  line-height: 1.5;
  font-weight: 450;
  mark {
    background: transparent;
    color: var(--app-accent, #fff);
  }
}
.result-description {
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.4;
}
.result-arrow {
  color: var(--app-muted);
  opacity: 0.5;
  flex-shrink: 0;
}
.suggest-item > .v-icon:first-child {
  color: var(--app-muted);
}
.suggest-section + .suggest-section {
  margin-top: 5px;
}
.search-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 92px;
  margin: 0;
  padding: 20px 12px;
  color: var(--app-muted);
  text-align: center;
  font-size: 12px;
  line-height: 1.7;
}
.search-error {
  flex-direction: column;
  gap: 6px;
  button {
    padding: 4px 12px;
    border-radius: 5px;
    background: transparent;
    color: var(--app-accent);
  }
}
.keyboard-hint {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin: 7px 3px 0;
  padding: 11px 7px 4px;
  border-top: 1px solid var(--app-border, rgba(255, 255, 255, 0.07));
  font-size: 10px;
  color: var(--app-muted);
  opacity: 0.65;
}
@media (max-width: 480px) {
  .history-term {
    max-width: 165px;
  }
  .keyboard-hint {
    display: none;
  }
}
</style>
