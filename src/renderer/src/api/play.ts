import request from '../utils/request'

// 创建歌单
export const createPlay = (
  name: number,
  privacy: '10' | '' = '',
  type: 'NORMAL' | 'VIDEO' | 'SHARED' = 'NORMAL'
) => request(`/playlist/create?name=${name}&type=${type}&privacy=${privacy}`, 'get')

// 删除歌单
export const deletePlay = (ids: string[]) => request(`/playlist/delete?id=${ids.join()}`)

// 对歌单添加或删除歌曲  op=add&pid=24381616&tracks=347231
export const deleteSong = (op: 'add' | 'del', pid: number, tracks: number) =>
  request('/playlist/tracks', 'get', {
    params: {
      op,
      pid,
      tracks,
    }
  })

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
