import {getUserAccount} from "@/api/user";
import {useUserInfo} from "@/store";
import {getUserPlayList} from "@/api/musicList";

// 获取用户信息
export const getUserAccountFn = async () => {
  const data = await getUserAccount();
  const store = useUserInfo()
  store.updateProfile(data.profile)
  getUserPlayListFn()
}

// 获取当前用户歌单(包括已收藏)
export const getUserPlayListFn = async () => {
  const store = useUserInfo()
  let uid: number | null = null
  uid = store.profile.userId && Number(localStorage.getItem('userId'))

  if(uid) {
    const data = await getUserPlayList(uid)
    store.updateUserPlayList(data.playlist)
  }
}