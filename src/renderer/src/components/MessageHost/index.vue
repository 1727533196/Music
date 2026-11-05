<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import {
  closeMessage,
  messageItems,
  mountMessageHost,
  pauseMessage,
  resumeMessage
} from '@/utils/message'

let unmountHost: (() => void) | undefined
const stackRef = ref<{ $el: HTMLElement }>()
const positions = new WeakMap<Element, { top: number; left: number; width: number }>()

// 在移除任何提示前记录位置，防止 flex 重排让离场中的提示跳到最上方。
watch(
  () => messageItems.map((item) => item.id),
  () => {
    for (const child of stackRef.value?.$el.children ?? []) {
      const element = child as HTMLElement
      positions.set(element, {
        top: element.offsetTop,
        left: element.offsetLeft,
        width: element.offsetWidth
      })
    }
  },
  { flush: 'pre' }
)

function onBeforeLeave(element: Element): void {
  const position = positions.get(element)
  if (!position) return
  Object.assign((element as HTMLElement).style, {
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: `${position.width}px`
  })
}

onMounted(() => {
  unmountHost = mountMessageHost()
})
onUnmounted(() => unmountHost?.())

function onFocusOut(id: number, event: FocusEvent): void {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
    resumeMessage(id, 'focus')
  }
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      ref="stackRef"
      name="app-message"
      tag="div"
      class="app-message-stack"
      @before-leave="onBeforeLeave"
    >
      <div
        v-for="item in messageItems"
        :key="item.id"
        class="app-message"
        :class="`app-message--${item.type}`"
        :role="item.type === 'error' ? 'alert' : 'status'"
        aria-atomic="true"
        @pointerenter="pauseMessage(item.id, 'pointer')"
        @pointerleave="resumeMessage(item.id, 'pointer')"
        @focusin="pauseMessage(item.id, 'focus')"
        @focusout="onFocusOut(item.id, $event)"
        @keydown.esc.stop="closeMessage(item.id)"
      >
        <span class="app-message-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <template v-if="item.type === 'success'">
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.7 2.7L16 9.4" />
            </template>
            <template v-else-if="item.type === 'warning'">
              <path
                d="M10.3 4.6 2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
              />
              <path d="M12 9v4m0 3.5h.01" />
            </template>
            <template v-else-if="item.type === 'error'">
              <circle cx="12" cy="12" r="9" />
              <path d="m9 9 6 6m0-6-6 6" />
            </template>
            <template v-else>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5m0-8h.01" />
            </template>
          </svg>
        </span>
        <p class="app-message-content">{{ item.message }}</p>
        <button
          class="app-message-close"
          type="button"
          aria-label="关闭提示"
          @click="closeMessage(item.id)"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m4 4 8 8m0-8-8 8" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped lang="less">
.app-message-stack {
  position: fixed;
  z-index: 100010;
  top: ~'max(calc(var(--app-header-height, 76px) + 12px), env(safe-area-inset-top))';
  left: 50%;
  display: flex;
  width: 420px;
  max-width: calc(100vw - 32px);
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
  pointer-events: none;
  -webkit-app-region: no-drag;
}

.app-message {
  --message-status: var(--app-secondary);
  display: flex;
  width: max-content;
  min-width: 210px;
  max-width: ~'min(420px, calc(100vw - 32px))';
  min-height: 52px;
  box-sizing: border-box;
  align-items: center;
  gap: 11px;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  box-shadow: var(--app-shadow);
  color: var(--app-text);
  pointer-events: auto;

  &--success {
    --message-status: var(--app-success);
  }
  &--error {
    --message-status: var(--app-danger-text);
  }
  &--warning {
    --message-status: var(--app-warning-text);
  }
}

.app-message-icon {
  display: flex;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--message-status);

  svg {
    width: 22px;
    height: 22px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.app-message-content {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.app-message-close {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  margin-left: 7px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  svg {
    width: 12px;
    height: 12px;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  &:hover {
    background: var(--app-hover);
    color: var(--app-text);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 2px;
  }
}

.app-message-enter-active,
.app-message-leave-active,
.app-message-move {
  transition:
    opacity 0.2s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.app-message-enter-from,
.app-message-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.97);
}
.app-message-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .app-message-enter-active,
  .app-message-leave-active,
  .app-message-move,
  .app-message-close {
    transition: none;
  }
}
</style>
