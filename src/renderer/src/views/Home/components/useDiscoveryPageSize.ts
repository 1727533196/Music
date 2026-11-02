import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export const useDiscoveryPageSize = (sectionRef: Ref<HTMLElement | null>): Ref<number> => {
  const pageSize = ref(6)
  let observer: ResizeObserver | undefined
  let resizeFrame = 0

  const updatePageSize = () => {
    if (!sectionRef.value) return
    const columns = Number(
      getComputedStyle(sectionRef.value).getPropertyValue('--discovery-columns').trim()
    )
    if (Number.isInteger(columns) && columns >= 1 && columns <= 6) {
      pageSize.value = columns
    }
  }

  onMounted(() => {
    updatePageSize()
    if (!sectionRef.value) return
    // 分页会改变区域高度，延后一帧更新，避免在观察回调中再次触发布局。
    observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(updatePageSize)
    })
    observer.observe(sectionRef.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(resizeFrame)
  })

  return pageSize
}
