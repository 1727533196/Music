import request from '@/utils/request'
import type { ConnectionUser } from './user'

export interface UserEvent {
  id: number | string
  type: number
  json: string
  user: ConnectionUser
  showTime?: number
  eventTime?: number
  pics?: { originUrl?: string; squareUrl?: string }[]
  threadId?: string
  info?: { threadId?: string; commentCount?: number; likedCount?: number }
}
interface UserEventsResponse {
  code: number
  events: UserEvent[]
  more: boolean
  lasttime: number
}
export const getUserEvents = (uid: number, lasttime = -1) =>
  request<unknown, UserEventsResponse>('/user/event', 'get', {
    handleAccessRestriction: true,
    params: { uid, lasttime, limit: 20 }
  })

export async function getEventProgramSong(id: string): Promise<number> {
  const result = await request<unknown, { program?: { mainSong?: { id?: number } } }>(
    '/dj/program/detail',
    'get',
    { params: { id } }
  )
  const songId = result.program?.mainSong?.id
  if (!songId || !Number.isSafeInteger(songId)) throw new Error('节目暂时无法播放')
  return songId
}

export async function getEventVideoUrl(kind: 'mv' | 'video', id: string): Promise<string> {
  let url: string | undefined
  if (kind === 'mv') {
    const result = await request<unknown, { data?: { url?: string } }>('/mv/url', 'get', {
      params: { id }
    })
    url = result.data?.url
  } else {
    const result = await request<unknown, { urls?: { url?: string }[] }>('/video/url', 'get', {
      params: { id }
    })
    url = result.urls?.find((item) => item.url)?.url
  }
  if (!url || !/^https?:\/\//i.test(url)) throw new Error('视频暂时无法播放')
  return url
}
