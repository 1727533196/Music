<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import { usePunchCard } from '@/store/punchCard'

const punchCard = usePunchCard()
const visible = ref(false)
const selectedMinutes = ref(15)
const snoozeOptions = [5, 10, 15, 30, 60]
const radioName = useId()
const snoozeField = ref<HTMLFieldSetElement | null>(null)
const shownAt = ref(new Date())
let opener: HTMLElement | null = null

const todayText = computed(() => {
  const date = shownAt.value
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`
})
const isWorkDayText = computed(() => (visible.value && punchCard.isWorkDay() ? '工作日' : '休息日'))

function show(): void {
  if (!visible.value) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    shownAt.value = new Date()
  }
  visible.value = true
}
function hide(): void {
  visible.value = false
}
function handleCheckIn(): void {
  punchCard.checkIn()
  hide()
}
function handleSnooze(): void {
  punchCard.snooze(selectedMinutes.value)
  hide()
}
function handleSkipToday(): void {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0)
  const minutes = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 60000))
  punchCard.snooze(minutes)
  hide()
}
async function focusSelection(): Promise<void> {
  await nextTick()
  snoozeField.value?.querySelector<HTMLInputElement>('input:checked')?.focus()
}
function restoreFocus(): void {
  if (!visible.value && opener?.isConnected && !opener.closest('[inert]')) {
    opener.focus({ preventScroll: true })
  }
}
defineExpose({ show, hide })
</script>

<template>
  <v-dialog
    v-model="visible"
    max-width="400"
    persistent
    scrim="#09090e"
    :opacity="0.72"
    class="punch-reminder-dialog"
    aria-label="打卡提醒"
    @after-enter="focusSelection"
    @after-leave="restoreFocus"
  >
    <section class="punch-card">
      <header class="punch-head">
        <span class="punch-badge"
          ><v-icon icon="mdi-bell-outline" size="23" aria-hidden="true"
        /></span>
        <div class="punch-heading">
          <h2>打卡提醒</h2>
          <p>{{ todayText }}<span>·</span>{{ isWorkDayText }}</p>
        </div>
      </header>
      <div class="punch-body">
        <p class="punch-copy">今天还未打卡。完成后，点击“已打卡”结束今天的提醒。</p>
        <fieldset ref="snoozeField" class="snooze-panel">
          <legend>暂时不方便？选择稍后提醒的时间</legend>
          <div class="snooze-options">
            <label
              v-for="minutes in snoozeOptions"
              :key="minutes"
              class="snooze-option"
              :class="{ selected: selectedMinutes === minutes }"
            >
              <input v-model="selectedMinutes" type="radio" :name="radioName" :value="minutes" />
              <span>{{ minutes }} 分钟</span>
            </label>
          </div>
        </fieldset>
      </div>
      <footer class="punch-actions">
        <div class="action-buttons">
          <button type="button" class="btn-snooze" @click="handleSnooze">
            {{ selectedMinutes }} 分钟后提醒
          </button>
          <button type="button" class="btn-checkin" @click="handleCheckIn">
            <v-icon icon="mdi-check" size="16" aria-hidden="true" />已打卡
          </button>
        </div>
        <button type="button" class="skip-today" @click="handleSkipToday">今天不再提醒</button>
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped lang="less">
.punch-card {
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
  button {
    font: inherit;
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.punch-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 24px 24px 0;
}
.punch-badge {
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  background: var(--app-surface);
  color: var(--app-muted);
}
.punch-heading {
  min-width: 0;
  h2 {
    margin: 0 0 6px;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.3;
  }
  p {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 0;
    color: var(--app-muted);
    font-size: 11px;
    line-height: 1.5;
  }
}
.punch-body {
  padding: 18px 24px 22px;
}
.punch-copy {
  margin: 0 0 22px;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.8;
}
.snooze-panel {
  min-width: 0;
  padding: 0;
  border: 0;
  legend {
    width: 100%;
    margin-bottom: 10px;
    color: var(--app-muted);
    font-size: 11px;
    line-height: 1.6;
  }
}
.snooze-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.snooze-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: transparent;
  color: var(--app-muted);
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    color: var(--app-text);
    background: var(--app-surface);
  }
  &.selected {
    border-color: var(--app-accent-border);
    background: var(--app-accent-soft);
    color: var(--app-accent);
  }
  &:has(input:focus-visible) {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
}
.punch-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-top: 1px solid var(--app-border);
}
.action-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}
.btn-snooze,
.btn-checkin {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  min-height: 36px;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 12px !important;
  line-height: 1.5;
  &:hover {
    background: var(--app-surface);
  }
}
.btn-checkin {
  border-color: transparent;
  background: var(--app-accent);
  color: var(--app-on-accent);
  font-weight: 600 !important;
  &:hover {
    background: var(--app-accent-hover);
  }
}
.skip-today {
  padding: 4px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--app-muted);
  font-size: 11px !important;
  &:hover {
    color: var(--app-text);
    background: var(--app-surface);
  }
}
@media (max-width: 480px) {
  .punch-head {
    padding: 20px 18px 0;
  }
  .punch-body {
    padding: 16px 18px 20px;
  }
  .punch-actions {
    padding: 16px 18px;
  }
}
@media (max-height: 480px) {
  .punch-card {
    max-height: calc(100dvh - 24px);
  }
  .punch-head {
    padding-top: 16px;
  }
  .punch-body {
    padding-block: 12px 16px;
  }
  .punch-copy {
    margin-bottom: 14px;
  }
  .punch-actions {
    padding-block: 12px;
    gap: 8px;
  }
}
</style>
