import { ref } from 'vue'
import { getMusicCommentCount } from '@/api/musicList'

const commentCounts = ref(new Map<number, { count: number; expiresAt: number }>())
const pendingCommentCounts = new Set<number>()

export const getSongCommentLabel = (id: number) => {
  const count = commentCounts.value.get(id)?.count
  return count === undefined ? '评论' : `评论（${count > 9999 ? '9999+' : count}）`
}

export const loadSongCommentCount = async (id: number) => {
  const cached = commentCounts.value.get(id)
  if ((cached && cached.expiresAt > Date.now()) || pendingCommentCounts.has(id)) return
  pendingCommentCounts.add(id)
  try {
    const count = await getMusicCommentCount(id)
    if (Number.isFinite(count) && count >= 0) {
      commentCounts.value.set(id, { count, expiresAt: Date.now() + 5 * 60 * 1000 })
    }
  } catch {
    // 数量获取失败时保留评论入口，下次打开菜单可重试。
  } finally {
    pendingCommentCounts.delete(id)
  }
}
