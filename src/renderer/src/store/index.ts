import { defineStore } from 'pinia'
import { Profile } from '@/api/user'
import { getMusicUrl, PlayList } from '@/api/musicList'
import {
  asideFontSize,
  ListItem,
  MenuConfig,
  originAsideMenuConfig
} from '@/layout/BaseAside/config'
import { useAnonimousLogin } from '@/utils/useLogin'
import { useMusicAction } from './music'
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
      },
      asideMenuConfig: [...originAsideMenuConfig] as MenuConfig[]
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
      localStorage.setItem('IS_LOGIN', JSON.stringify(true))
      localStorage.setItem('PROFILE', JSON.stringify(this.profile))
    },
    updateUserPlayList(val: PlayList[]) {
      this.userPlayListInfo = val

      const copyVal = JSON.parse(JSON.stringify(val)) as PlayList[]
      const myList: ListItem[] = []
      const subscribedList: ListItem[] = []
      const asideMenuConfig = this.asideMenuConfig
      const myListItem = asideMenuConfig.find((item) => item.mark === 'my')!
      copyVal.forEach((item) => {
        if (item.subscribed) {
          subscribedList.push({ ...item, asideFontSize, icon: '', path: '/play-list' })
        } else {
          if (item.specialType === 5) {
            asideMenuConfig.find((item) => item.mark === 'my')
            const loveListIndex = myListItem.list.findIndex((item) => item.name === '我喜欢的音乐')
            if (loveListIndex !== -1) {
              myListItem.list.splice(loveListIndex, 1)
            }
            myListItem.list = [
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
      asideMenuConfig.forEach((item) => {
        if (typeof item.mark !== 'boolean') {
          item.show = this.isLogin
        }
      })
      let playItem = asideMenuConfig.find((item) => item.mark === 'play')
      let subscribedListItem = asideMenuConfig.find((item) => item.mark === 'subscribedList')
      myList.length && (playItem!.list = myList)
      subscribedList.length && (subscribedListItem!.list = subscribedList)

      localStorage.setItem('MENU_CONFIG', JSON.stringify(asideMenuConfig))
    },
    updateUserLikeIds(ids: number[]) {
      this.userLikeIds = ids
    },
    addEvent(key, cb) {
      this.events[key] = cb
    },
    loginCallBack() {
      this.events.login()
    },
    loadCache() {
      const isLogin = JSON.parse(localStorage.getItem('IS_LOGIN') || 'false')
      if (!isLogin) {
        return
      }
      this.isLogin = true
      const menuConfig = localStorage.getItem('MENU_CONFIG')
      if (menuConfig) {
        this.asideMenuConfig = JSON.parse(menuConfig)
      }
      const profile = localStorage.getItem('PROFILE')
      if (profile) {
        this.profile = JSON.parse(profile)
      }
      const music = useMusicAction()
      const musicConfig = localStorage.getItem('MUSIC_CONFIG')
      if (musicConfig) {
        music.updateState(JSON.parse(musicConfig))
        // getMusicUrl(music.state.songs.id).then(({ data }) => {
        //   music.state.musicUrl = data[0].url || ''
        // })
      }
    }
  }
})
