export function isLoopbackUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host === '::1' || host === '[::1]') return true
    if (!/^127(?:\.\d{1,3}){3}$/.test(host)) return false
    return host.split('.').every((part) => Number(part) <= 255)
  } catch {
    return false
  }
}
