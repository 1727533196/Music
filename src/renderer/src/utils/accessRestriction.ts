export type AccessRestriction = 'privacy' | 'permission'

export class AccessRestrictionError extends Error {
  constructor(
    readonly restriction: AccessRestriction,
    readonly details: unknown
  ) {
    super('当前内容存在访问限制')
    this.name = 'AccessRestrictionError'
  }
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined

export function getAccessRestriction(error: unknown): AccessRestriction | null {
  if (error instanceof AccessRestrictionError) return error.restriction
  const outer = record(error)
  const response = record(outer?.response)
  const payload = response?.data ?? error
  const data = record(payload)
  const body = record(data?.body) ?? data
  const text = [
    body?.message,
    body?.msg,
    data?.message,
    data?.msg,
    outer?.message,
    typeof payload === 'string' ? payload : ''
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
  if (/隐私|私密|不公开|未公开|仅自己|仅本人|仅好友|仅关注|\bprivate\b|privacy/i.test(text))
    return 'privacy'
  // 登录失效不是用户隐私，保留原来的登录错误处理。
  if (/登录|登陆|log\s?in|sign\s?in|not authenticated/i.test(text)) return null
  if (
    /无权|没有权限|无权限|权限不足|不允许查看|禁止访问|permission denied|access denied|forbidden/i.test(
      text
    )
  )
    return 'permission'
  return [body?.code, data?.code, response?.status, outer?.status].some(
    (value) => Number(value) === 403
  )
    ? 'permission'
    : null
}
