import request from '../utils/request'

// 创建歌单
export const createPlay = (
  name: number,
  privacy: '10' | '' = '',
  type: 'NORMAL' | 'VIDEO' | 'SHARED' = 'NORMAL'
) => request(`/playlist/create?name=${name}&type=${type}&privacy=${privacy}`, 'get')

// 删除歌单
export const deletePlay = (ids: string[]) => request(`/playlist/delete?id=${ids.join()}`)

export interface PlaylistTracksResponse {
  code: number
  message?: string
  msg?: string
  count?: number
}

// tracks 按接口约定传逗号分隔的字符串，后端会直接调用 split(',')。
export const deleteSong = (op: 'add' | 'del', pid: number, tracks: number | string) =>
  request<{ op: 'add' | 'del'; pid: number; tracks: string }, PlaylistTracksResponse>(
    '/playlist/tracks',
    { op, pid, tracks: String(tracks) }
  )

export const checkMusic = (id: number) => request(`/check/music?id=${id}`)

// 云盘歌曲信息匹配纠正
// uid: 用户 id, sid: 云盘的歌曲 id, asid: 要匹配的歌曲 id (取消匹配传 0)
export const matchCloudSong = (uid: number, sid: number, asid: number) =>
  request('/cloud/match', 'get', {
    params: {
      uid,
      sid,
      asid,
    }
  })
