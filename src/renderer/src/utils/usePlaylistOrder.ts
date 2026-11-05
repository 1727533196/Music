import { computed, onScopeDispose, reactive, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { updateSongOrder } from '@/api/musicList'
import { playListState } from '@/layout/BaseAside/usePlayList'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import { playListMock } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { message } from '@/utils/message'

// 跨页面实例保留保存状态，切换页面后返回也不能重复提交同一歌单。
const pendingPlaylistIds = reactive(new Set<number>())
const pendingReconciliation = shallowRef<{ pid: number; ids: number[] } | null>(null)

const sameOrder = (left: number[], right: number[]) =>
  left.length === right.length && left.every((id, index) => id === right[index])

export function usePlaylistOrder() {
  const route = useRoute()
  const user = useUserInfo()
  const music = useMusicAction()
  const playlistId = computed(() => Number(route.query.id))
  const saving = computed(() => pendingPlaylistIds.has(playlistId.value))

  const canReorder = computed(() => {
    const info = playListState.listInfo
    const tracks = playListState.playList
    if (
      route.path !== '/play-list' ||
      route.query.type === 'album' ||
      info.albumArtist ||
      !user.isLogin ||
      !user.profile.userId ||
      playListState.loading ||
      !Number.isFinite(playlistId.value) ||
      playlistId.value <= 0 ||
      playlistId.value !== Number(info.id) ||
      info.id === playListMock.id ||
      Number(info.creator?.userId || info.userId) !== Number(user.profile.userId) ||
      !Array.isArray(info.trackIds) ||
      tracks.length < 2
    ) {
      return false
    }

    const fullIds = info.trackIds.map(({ id }) => id)
    const canonicalIds = new Set(fullIds)
    const displayedIds = tracks.map(({ id }) => id)
    return (
      canonicalIds.size === fullIds.length &&
      fullIds.every((id) => Number.isSafeInteger(id) && id > 0) &&
      new Set(displayedIds).size === tracks.length &&
      displayedIds.every((id) => canonicalIds.has(id)) &&
      sameOrder(playListState.ids, displayedIds)
    )
  })

  function clearDepartedReconciliation(): void {
    const pending = pendingReconciliation.value
    if (pending && (route.path !== '/play-list' || playlistId.value !== pending.pid)) {
      pendingReconciliation.value = null
    }
  }

  watch(
    [
      () => route.fullPath,
      () => playListState.loading,
      () => playListState.playList,
      () => playListState.listInfo,
      canReorder,
      pendingReconciliation
    ],
    () => {
      clearDepartedReconciliation()
      const pending = pendingReconciliation.value
      if (!pending || playListState.loading) return

      // 保存期间可能重新加载了旧顺序；只消费当前页面的一次确认结果。
      pendingReconciliation.value = null
      if (!canReorder.value) return
      const tracksById = new Map(playListState.playList.map((track) => [track.id, track]))
      const metadataById = new Map(
        playListState.listInfo.trackIds.map((track) => [track.id, track])
      )
      if (
        pending.ids.length !== metadataById.size ||
        pending.ids.some((id) => !metadataById.has(id))
      ) {
        return
      }
      const visibleIds = pending.ids.filter((id) => tracksById.has(id))
      if (
        sameOrder(playListState.ids, visibleIds) &&
        sameOrder(
          playListState.listInfo.trackIds.map(({ id }) => id),
          pending.ids
        )
      )
        return
      playListState.playList = visibleIds.map((id) => tracksById.get(id)!)
      playListState.ids = visibleIds
      playListState.listInfo = {
        ...playListState.listInfo,
        trackIds: pending.ids.map((id) => metadataById.get(id)!)
      }
      // 迟到的详情响应也可能覆盖当前歌单元数据，一并恢复确认后的顺序。
      music.reorderPlaylistTracks(pending.pid, pending.ids)
    },
    { immediate: true, flush: 'post' }
  )
  onScopeDispose(clearDepartedReconciliation)

  async function saveOrder(orderedIds: number[]): Promise<void> {
    if (!canReorder.value || saving.value) return
    const pid = playlistId.value
    const nextIds = [...orderedIds]
    const previousTracks = playListState.playList
    const previousIds = playListState.ids
    const previousInfo = playListState.listInfo
    const tracksById = new Map(previousTracks.map((track) => [track.id, track]))
    if (
      nextIds.length !== previousTracks.length ||
      new Set(nextIds).size !== nextIds.length ||
      nextIds.some((id) => !tracksById.has(id)) ||
      sameOrder(
        nextIds,
        previousTracks.map(({ id }) => id)
      )
    ) {
      return
    }

    const metadataById = new Map(previousInfo.trackIds.map((track) => [track.id, track]))
    // 详情接口可能省略已下架、云盘等歌曲；保留这些 ID 的位置，始终提交完整歌单。
    let visibleIndex = 0
    const fullIds = previousInfo.trackIds.map(({ id }) =>
      tracksById.has(id) ? nextIds[visibleIndex++] : id
    )
    pendingPlaylistIds.add(pid)
    playListState.playList = nextIds.map((id) => tracksById.get(id)!)
    playListState.ids = nextIds
    playListState.listInfo = {
      ...previousInfo,
      trackIds: fullIds.map((id) => metadataById.get(id)!)
    }
    const optimisticTracks = playListState.playList
    const optimisticInfo = playListState.listInfo

    try {
      await updateSongOrder(pid, fullIds)
      // 服务端保存完成后再改队列，失败时不干扰期间发生的播放操作。
      music.reorderPlaylistTracks(pid, fullIds)
      if (route.path === '/play-list' && playlistId.value === pid) {
        pendingReconciliation.value = { pid, ids: fullIds }
      }
      message.success('歌曲顺序已保存')
    } catch {
      // 仅恢复这次操作仍在展示的版本，不能覆盖导航或刷新后加载的新列表。
      if (
        route.path === '/play-list' &&
        playlistId.value === pid &&
        !playListState.loading &&
        playListState.playList === optimisticTracks &&
        playListState.listInfo === optimisticInfo &&
        sameOrder(
          playListState.playList.map(({ id }) => id),
          nextIds
        )
      ) {
        playListState.playList = previousTracks
        playListState.ids = previousIds
        playListState.listInfo = previousInfo
      }
      // 具体错误由请求层通过统一消息组件展示。
    } finally {
      pendingPlaylistIds.delete(pid)
    }
  }

  return { canReorder, saving, saveOrder }
}
