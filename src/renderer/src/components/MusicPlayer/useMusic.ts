import { likeMusicApi } from '@/api/musicList'
import { ElMessage } from 'element-plus'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { deleteSong } from '@/api/play'
import { getUserPlayListFn } from '@/utils/userInfo'

export default () => {
  const music = useMusicAction()
  const likeMusic = async (id: number, isLike: boolean = true) => {
    try {
      const data = await likeMusicApi(id, isLike)
      const msg = isLike ? '添加喜欢成功' : '取消喜欢成功'
      const { getPlayListDetailFn } = usePlayList()
      const playId = music.state.currentItem?.id
      if (playId) {
        getPlayListDetailFn(playId)
      }
      ElMessage.success(msg)
    } catch (e: any) {
      console.log('e', e.message || e)
    }
  }
  const deleteSongHandler = async (id: number, playId: number, index) => {
    const { code, message } = await deleteSong({
      op: 'del',
      pid: playId,
      tracks: id
    })
    if (code && code !== 200) {
      ElMessage.error(message)
      return
    }
    const { getPlayListDetailFn } = usePlayList()
    await getPlayListDetailFn(playId)
    getUserPlayListFn()
  }

  return {
    likeMusic,
    deleteSongHandler
  }
}
