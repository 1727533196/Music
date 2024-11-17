import { defineStore } from 'pinia'
import { Profile } from '@/api/user'
import { PlayList } from '@/api/musicList'
import { asideFontSize, asideMenuConfig, ListItem } from '@/layout/BaseAside/config'
import { useAnonimousLogin } from '@/utils/useLogin'

export const useUserInfo = defineStore('userInfoId', {
  state: () => {
    return {
      profile: {
        avatarUrl: '', // 用户头像
        backgroundUrl: '', // 用户背景图片
        nickname: '', // 用户昵称
        createTime: null as null | number,
        vipType: null as null | number,
        userId: null as null | number // 用户id
      },
      isLogin: false, // 是否登录
      userPlayListInfo: [] as PlayList[], // 用户歌单列表信息
      userLikeIds: [] as number[], // 用户喜欢列表ids
      volume: Number(localStorage.getItem('volume')) || 1, // 用户当前播放器音量
      events: {
        login: () => {}
      }
    }
  },
  actions: {
    updateProfile(val: Profile) {
      if (!val || !val.userId) {
        window.$login.show()
        this.$reset()
        useAnonimousLogin()
        return
      }
      type key = keyof typeof val
      for (const valKey in this.profile) {
        // @ts-ignore
        this.profile[valKey as key] = val[valKey as key]
      }
      localStorage.setItem('userId', String(this.profile.userId))
      this.isLogin = true
      console.log('12312')
    },
    updateUserPlayList(val: PlayList[]) {
      this.userPlayListInfo = val

      console.log('this.userPlayListInfo', this.userPlayListInfo)
      const copyVal = JSON.parse(JSON.stringify(val)) as PlayList[]
      const myList: ListItem[] = []
      const subscribedList: ListItem[] = []
      const myListItem = asideMenuConfig.find((item) => item.mark === 'my')
      copyVal.forEach((item) => {
        if (item.subscribed) {
          subscribedList.push({ ...item, asideFontSize, icon: '', path: '/play-list' })
        } else {
          if (item.specialType === 5) {
            asideMenuConfig.find((item) => item.mark === 'my')
            myListItem!.list = [
              {
                ...item,
                name: '我喜欢的音乐',
                asideFontSize,
                path: '/play-list',
                icon: 'icon-aixin'
              },
              ...myListItem!.list
            ]
          } else {
            myList.push({
              ...item,
              name: item.name,
              icon: '',
              asideFontSize,
              path: '/play-list'
            })
          }
        }
      })
      let playItem = asideMenuConfig.find((item) => item.mark === 'play')
      let subscribedListItem = asideMenuConfig.find((item) => item.mark === 'subscribedList')
      myList.length && (playItem!.list = myList)
      subscribedList.length && (subscribedListItem!.list = subscribedList)
    },
    updateUserLikeIds(ids: number[]) {
      this.userLikeIds = ids
    },
    addEvent(key, cb) {
      this.events[key] = cb
    },
    loginCallBack() {
      this.events.login()
    }
  }
})
