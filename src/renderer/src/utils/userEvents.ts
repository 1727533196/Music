import type { UserEvent } from '@/api/events'

interface SharedResource {
  id?: number | string
  vid?: string
  name?: string
  title?: string
  picUrl?: string
  coverImgUrl?: string
  coverUrl?: string
  album?: { picUrl?: string }
  artists?: { name: string }[]
}
export interface EventShare {
  kind: 'song' | 'playlist' | 'album' | 'program' | 'mv' | 'video'
  id: string
  label: string
  name: string
  cover?: string
}
interface EventPayload {
  msg?: string
  song?: SharedResource
  playlist?: SharedResource
  album?: SharedResource
  program?: SharedResource
  mv?: SharedResource
  video?: SharedResource
  event?: { json?: string; user?: { nickname?: string } }
}
function parsePayload(json?: string): EventPayload {
  try {
    const value = JSON.parse(json || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}
export function eventPresentation(event: UserEvent) {
  const payload = parsePayload(event.json)
  const forwarded = payload.event ? parsePayload(payload.event.json) : null
  const content = forwarded || payload
  const choices = [
    ['song', '歌曲'],
    ['playlist', '歌单'],
    ['album', '专辑'],
    ['program', '电台节目'],
    ['mv', 'MV'],
    ['video', '视频']
  ] as const
  const choice = choices.find(([key]) => content[key] && typeof content[key] === 'object')
  const entity = choice ? content[choice[0]] : null
  const id = entity?.id ?? entity?.vid
  const share: EventShare | null =
    choice && entity && id != null && /^[\w-]+$/.test(String(id))
      ? {
          kind: choice[0],
          id: String(id),
          label: choice[1],
          name:
            typeof entity.name === 'string'
              ? entity.name
              : typeof entity.title === 'string'
                ? entity.title
                : choice[1],
          cover: entity.picUrl || entity.coverImgUrl || entity.coverUrl || entity.album?.picUrl
        }
      : null
  return {
    text: typeof payload.msg === 'string' ? payload.msg : '',
    forwarded: forwarded
      ? {
          nickname: payload.event?.user?.nickname || '用户',
          text: typeof forwarded.msg === 'string' ? forwarded.msg : '原动态暂时无法查看'
        }
      : null,
    share,
    pictures: (Array.isArray(event.pics) ? event.pics : [])
      .map((pic) => pic?.originUrl || pic?.squareUrl || '')
      .filter((url) => /^https?:\/\//i.test(url))
      .slice(0, 9)
  }
}
