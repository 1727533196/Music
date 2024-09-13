import {likeMusicApi} from "@/api/musicList";
import {ElMessage} from "element-plus";
import usePlayList from "@/layout/BaseAside/usePlayList";
import {useMusicAction} from "@/store/music";

export default () => {
  const store = useMusicAction()
  const likeMusic = async (id: number, isLike: boolean = true) => {
    try {
      const data = await likeMusicApi(id, isLike)
      const msg = isLike ? '添加喜欢成功' : '取消喜欢成功'
      const {getPlayListDetailFn} = usePlayList()
      const playId = store.state.currentItem?.id
      if(playId) {
        getPlayListDetailFn(playId)
      }
      ElMessage.success(msg)
    } catch (e: any) {
      ElMessage.error(e.msg)
    }
  }
  return {
    likeMusic
  }
}
