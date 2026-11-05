import { readonly, shallowReactive } from 'vue'

export type MessageType = 'success' | 'error' | 'warning' | 'info'

export interface MessageOptions {
  message: string
  /** 自动关闭时间，单位为毫秒；0 表示保留到手动关闭。 */
  duration?: number
}

interface MessageItem {
  id: number
  type: MessageType
  message: string
}

type PauseReason = 'pointer' | 'focus'
interface MessageTimer {
  timer?: ReturnType<typeof setTimeout>
  remaining: number
  startedAt: number
  paused: Set<PauseReason>
}

const items = shallowReactive<MessageItem[]>([])
const timers = new Map<number, MessageTimer>()
const maxMessages = 3
let nextId = 0
let hostCount = 0

export const messageItems = readonly(items)

function stopTimer(id: number): void {
  const state = timers.get(id)
  if (!state?.timer) return
  clearTimeout(state.timer)
  state.timer = undefined
  state.remaining = Math.max(0, state.remaining - (Date.now() - state.startedAt))
}

function startTimer(id: number): void {
  const state = timers.get(id)
  if (!state || state.timer || state.paused.size || !hostCount || state.remaining === Infinity) {
    return
  }
  state.startedAt = Date.now()
  state.timer = setTimeout(() => closeMessage(id), state.remaining)
}

export function closeMessage(id: number): void {
  stopTimer(id)
  timers.delete(id)
  const index = items.findIndex((item) => item.id === id)
  if (index !== -1) items.splice(index, 1)
}

export function pauseMessage(id: number, reason: PauseReason): void {
  const state = timers.get(id)
  if (!state) return
  stopTimer(id)
  state.paused.add(reason)
}

export function resumeMessage(id: number, reason: PauseReason): void {
  timers.get(id)?.paused.delete(reason)
  startTimer(id)
}

// 请求拦截器可以在 App 挂载前发消息，计时从提示真正显示后开始。
export function mountMessageHost(): () => void {
  hostCount += 1
  items.forEach(({ id }) => startTimer(id))
  return () => {
    hostCount -= 1
    if (!hostCount) items.forEach(({ id }) => stopTimer(id))
  }
}

function showMessage(type: MessageType, input: string | MessageOptions) {
  const options = typeof input === 'string' ? { message: input } : input
  const content = options.message.trim()
  if (!content) return { close: () => {} }

  const duplicate = items.find((item) => item.type === type && item.message === content)
  const id = duplicate?.id ?? ++nextId
  const duration = options.duration ?? (type === 'error' ? 5000 : 3200)
  if (duplicate) {
    stopTimer(id)
  } else {
    if (items.length >= maxMessages) closeMessage(items[0].id)
    items.push({ id, type, message: content })
  }
  timers.set(id, {
    remaining: duration <= 0 ? Infinity : duration,
    startedAt: 0,
    paused: timers.get(id)?.paused ?? new Set()
  })
  startTimer(id)
  return { close: () => closeMessage(id) }
}

export const message = {
  success: (input: string | MessageOptions) => showMessage('success', input),
  error: (input: string | MessageOptions) => showMessage('error', input),
  warning: (input: string | MessageOptions) => showMessage('warning', input),
  info: (input: string | MessageOptions) => showMessage('info', input),
  closeAll: () => [...items].forEach(({ id }) => closeMessage(id))
}

if (import.meta.hot) import.meta.hot.dispose(message.closeAll)
