export function slotFor(label: string): number | null {
  const s = label.trim()
  if (!s) return null
  const c = s[0]
  const up = c.toUpperCase()
  if (up >= 'A' && up <= 'E') return up.charCodeAt(0) - 64
  if (c >= '1' && c <= '5') return Number(c)
  const cc = c.codePointAt(0)!
  if (cc >= 0x2460 && cc <= 0x2464) return cc - 0x245f
  return null
}
