// 兼容扫码保存的完整 Cookie，以及旧版/手机登录保存的单独 MUSIC_U 值。
// 只转发登录凭据，不把其他 Cookie 或 Set-Cookie 属性当作令牌。
export function normalizeMusicCookie(value: unknown): string {
  if (typeof value !== 'string' || value.length > 16384 || /[\r\n]/.test(value)) return ''
  const raw = value.trim()
  const match = /(?:^|;)\s*MUSIC_U\s*=\s*([^;]*)/.exec(raw)
  const token = (match ? match[1] : raw).trim()
  if (!token || token === 'undefined' || token === 'null') return ''
  if (!match && /[;=]/.test(token.replace(/={1,2}$/, ''))) return ''
  // RFC 6265 cookie-octet：禁止控制字符、空白、引号、逗号、分号及反斜杠。
  if (!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(token)) return ''
  return `MUSIC_U=${token};`
}
