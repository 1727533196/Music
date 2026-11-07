import request from '@/utils/request'

export type CommentResource = { type: 0; id: number } | { type: 6; threadId: string }
export interface CommentUser {
  userId: number
  nickname: string
  avatarUrl?: string
}
export interface CommentItem {
  commentId: number
  content: string
  time?: number
  timeStr?: string
  likedCount: number
  liked?: boolean
  replyCount?: number
  showFloorComment?: { replyCount?: number }
  user: CommentUser
  beReplied?: { content?: string; user?: CommentUser; beRepliedCommentId?: number }[]
}
export interface CommentResponse {
  code: number
  data: { comments: CommentItem[]; totalCount: number; hasMore?: boolean }
}
interface FloorResponse extends CommentResponse {
  data: CommentResponse['data'] & { time?: number | string }
}
interface CommentActionResponse {
  code: number
  comment?: CommentItem
}

export const commentResourceKey = (resource: CommentResource) =>
  resource.type === 0 ? `song:${resource.id}` : resource.threadId

export async function getResourceComments(
  resource: CommentResource,
  page: number
): Promise<CommentResponse> {
  if (resource.type === 0)
    return request<unknown, CommentResponse>('/comment/new', 'get', {
      handleAccessRestriction: true,
      params: { id: resource.id, type: 0, pageNo: page, pageSize: 20, sortType: 2 }
    })
  const result = await request<
    unknown,
    {
      code: number
      comments: CommentItem[]
      total: number
      more?: boolean
    }
  >('/comment/event', 'get', {
    handleAccessRestriction: true,
    params: { threadId: resource.threadId, limit: 20, offset: (page - 1) * 20 }
  })
  return {
    code: result.code,
    data: { comments: result.comments, totalCount: result.total, hasMore: result.more }
  }
}

export const getCommentReplies = (resource: CommentResource, parentCommentId: number, time = -1) =>
  request<unknown, FloorResponse>('/comment/floor', 'get', {
    handleAccessRestriction: true,
    params: {
      type: resource.type,
      // 此接口直接拼接资源前缀，动态需要传入去掉 A_EV_2_ 的部分。
      id: resource.type === 0 ? resource.id : resource.threadId.slice('A_EV_2_'.length),
      parentCommentId,
      limit: 20,
      time
    }
  })

export const setCommentLike = (resource: CommentResource, commentId: number, liked: boolean) =>
  request<unknown, CommentActionResponse>('/comment/like', 'post', {
    data: { ...resource, cid: commentId, t: liked ? 1 : 0 }
  })

export const replyToComment = (resource: CommentResource, commentId: number, content: string) =>
  request<unknown, CommentActionResponse>('/comment', 'post', {
    data: { ...resource, commentId, content, t: 2 }
  })
