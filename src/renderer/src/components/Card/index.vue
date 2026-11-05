<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  picUrl?: string
  name?: string
  caption?: string
  isClick?: boolean
  isStartIcon?: boolean
}
defineOptions({ name: 'Card' })
const emit = defineEmits(['click'])
const props = defineProps<Props>()
const imageFailed = ref(false)
const coverUrl = computed(() => {
  if (!props.picUrl) return ''
  if (!/^https?:\/\//i.test(props.picUrl)) return props.picUrl
  try {
    const url = new URL(props.picUrl)
    url.searchParams.set('param', '400y400')
    return url.toString()
  } catch {
    return props.picUrl
  }
})
watch(coverUrl, () => {
  imageFailed.value = false
})
const clickHandler = () => {
  if (props.isClick) emit('click')
}
</script>

<template>
  <div class="card-box">
    <component
      :is="isClick ? 'button' : 'div'"
      class="card-content"
      :class="{ 'card-click': isClick }"
      :type="isClick ? 'button' : undefined"
      @click="clickHandler"
    >
      <span class="card">
        <span class="cover-placeholder" aria-hidden="true">
          <v-icon icon="mdi-playlist-music-outline" size="32" />
        </span>
        <img
          v-if="coverUrl && !imageFailed"
          :src="coverUrl"
          alt=""
          loading="lazy"
          @error="imageFailed = true"
        />
        <slot></slot>
        <span v-if="isStartIcon" class="start-icon-box" aria-hidden="true">
          <v-icon icon="mdi-play" size="25" />
        </span>
      </span>
      <span class="text" :title="props.name">{{ props.name }}</span>
      <span v-if="props.caption" class="caption" :title="props.caption">{{ props.caption }}</span>
    </component>
  </div>
</template>

<style lang="less" scoped>
.card-box {
  flex: 0 0 var(--card-width, 184px);
  width: var(--card-width, 184px);
  max-width: 100%;
  min-width: 0;
}
.card-content {
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
}
.card {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-muted);
  opacity: 0.6;
}
.start-icon-box {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  background: #f2eff5;
  color: #271e25;
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 0.18s,
    transform 0.18s;
}
.card-click {
  cursor: pointer;
  &:hover .text {
    color: var(--app-accent);
  }
  &:hover .start-icon-box,
  &:focus-visible .start-icon-box {
    opacity: 1;
    transform: translateY(0);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.text {
  display: -webkit-box;
  width: 100%;
  min-height: 3em;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  overflow-wrap: anywhere;
  transition: color 0.16s;
}
.caption {
  display: block;
  width: 100%;
  overflow: hidden;
  margin-top: 3px;
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (hover: none) {
  .start-icon-box {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .text,
  .start-icon-box {
    transition: none;
  }
}
</style>
