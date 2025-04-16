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
export const deleteSong = (data) =>
  request('/playlist/tracks', 'get', {
    params: data
  })

export const checkMusic = (id: number) => request(`/check/music?id=${id}`)
