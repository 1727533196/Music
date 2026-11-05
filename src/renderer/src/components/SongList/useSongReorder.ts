import { computed, onUnmounted, ref, watch } from 'vue'

interface Options {
  getIds: () => number[]
  enabled: () => boolean
  getContainer: () => HTMLElement | null
  onReorder: (ids: number[]) => void
}

export function useSongReorder(options: Options) {
  const draggingId = ref<number | null>(null)
  const insertionIndex = ref<number | null>(null)
  const sourceIndex = computed(() =>
    draggingId.value === null ? -1 : options.getIds().indexOf(draggingId.value)
  )
  let frame = 0
  let previousFrame = 0
  let pointer: { x: number; y: number } | null = null
  let scrollElement: HTMLElement | null = null
  let dragStartBlocked = false
  const interactiveSelector =
    'button, a, input, select, textarea, [role="button"], [contenteditable="true"], [data-no-reorder]'

  function onPointerDown(event: PointerEvent): void {
    dragStartBlocked =
      event.button !== 0 ||
      (event.target instanceof Element && !!event.target.closest(interactiveSelector))
  }

  function cancelDrag(): void {
    cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
    pointer = null
    scrollElement = null
    draggingId.value = null
    insertionIndex.value = null
    dragStartBlocked = false
  }

  function findScroller(): HTMLElement | null {
    let element = options.getContainer()?.parentElement ?? null
    while (element) {
      if (
        /(auto|scroll)/.test(getComputedStyle(element).overflowY) &&
        element.scrollHeight > element.clientHeight
      )
        return element
      element = element.parentElement
    }
    return document.scrollingElement as HTMLElement | null
  }

  function updateInsertion(row: HTMLElement, clientY: number): void {
    const index = options.getIds().indexOf(Number(row.dataset.songId))
    if (index < 0) return
    const bounds = row.getBoundingClientRect()
    insertionIndex.value = index + (clientY >= bounds.top + bounds.height / 2 ? 1 : 0)
  }

  function autoScroll(time: number): void {
    if (!pointer || !scrollElement || draggingId.value === null) return
    const bounds = scrollElement.getBoundingClientRect()
    const top = Math.max(0, bounds.top)
    const bottom = Math.min(window.innerHeight, bounds.bottom)
    const edge = Math.min(56, (bottom - top) / 3)
    const elapsed = previousFrame ? Math.min(time - previousFrame, 32) : 16
    previousFrame = time
    if (
      pointer.x >= bounds.left &&
      pointer.x <= bounds.right &&
      pointer.y >= top &&
      pointer.y <= bottom
    ) {
      const speed =
        pointer.y < top + edge
          ? -Math.min(1, (top + edge - pointer.y) / edge)
          : pointer.y > bottom - edge
            ? Math.min(1, (pointer.y - bottom + edge) / edge)
            : 0
      if (speed) {
        scrollElement.scrollTop += speed * elapsed * 0.75
        const row = document
          .elementFromPoint(pointer.x, pointer.y)
          ?.closest<HTMLElement>('.song-sort-row')
        if (row && options.getContainer()?.contains(row)) updateInsertion(row, pointer.y)
      }
    }
    frame = requestAnimationFrame(autoScroll)
  }

  function onDragStart(event: DragEvent, songId: number): void {
    if (
      !options.enabled() ||
      !event.dataTransfer ||
      dragStartBlocked ||
      (event.target instanceof Element && !!event.target.closest(interactiveSelector))
    ) {
      event.preventDefault()
      return
    }
    draggingId.value = songId
    insertionIndex.value = null
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-music-track-id', String(songId))
    const row = (event.currentTarget as HTMLElement).closest<HTMLElement>('.list')
    if (row) {
      const bounds = row.getBoundingClientRect()
      event.dataTransfer.setDragImage(row, event.clientX - bounds.left, event.clientY - bounds.top)
    }
    scrollElement = findScroller()
  }

  function onDragOver(event: DragEvent): void {
    if (draggingId.value === null || !options.enabled()) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    pointer = { x: event.clientX, y: event.clientY }
    if (!frame) frame = requestAnimationFrame(autoScroll)
    const row = (event.target as HTMLElement).closest<HTMLElement>('.song-sort-row')
    if (row && options.getContainer()?.contains(row)) updateInsertion(row, event.clientY)
  }

  function onDragLeave(event: DragEvent): void {
    const container = options.getContainer()
    if (container?.contains(event.relatedTarget as Node | null)) return
    const bounds = container?.getBoundingClientRect()
    if (
      bounds &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    )
      return
    pointer = null
    insertionIndex.value = null
    cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
  }

  function dropPosition(index: number): 'before' | 'after' | null {
    if (draggingId.value === null || insertionIndex.value === null) return null
    const source = sourceIndex.value
    if (insertionIndex.value === source || insertionIndex.value === source + 1) return null
    if (insertionIndex.value === index) return 'before'
    if (index === options.getIds().length - 1 && insertionIndex.value === index + 1) return 'after'
    return null
  }

  function onDrop(event: DragEvent): void {
    if (draggingId.value === null) return
    event.preventDefault()
    event.stopPropagation()
    if (!options.enabled() || insertionIndex.value === null) return cancelDrag()
    const ids = [...options.getIds()]
    const from = ids.indexOf(draggingId.value)
    const to = insertionIndex.value - (from < insertionIndex.value ? 1 : 0)
    cancelDrag()
    if (from < 0 || to === from) return
    const [id] = ids.splice(from, 1)
    ids.splice(to, 0, id)
    options.onReorder(ids)
  }

  function moveBy(songId: number, direction: -1 | 1): boolean {
    if (!options.enabled()) return false
    const ids = [...options.getIds()]
    const from = ids.indexOf(songId)
    const to = from + direction
    if (from < 0 || to < 0 || to >= ids.length) return false
    ids.splice(from, 1)
    ids.splice(to, 0, songId)
    options.onReorder(ids)
    return true
  }

  watch(options.enabled, (enabled) => {
    if (!enabled) cancelDrag()
  })
  onUnmounted(cancelDrag)

  return {
    draggingId,
    dropPosition,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    cancelDrag,
    moveBy,
    onPointerDown
  }
}
