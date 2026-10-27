export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
export const UPDATE_CHECK_KEY = 'cue-update-check'

export function shouldAutoCheck(
  enabled: boolean,
  lastCheck: number | null,
  now = Date.now(),
): boolean {
  if (!enabled) return false
  if (lastCheck === null || !Number.isFinite(lastCheck)) return true
  if (lastCheck > now) return true
  return now - lastCheck >= UPDATE_CHECK_INTERVAL_MS
}

export function progressPercent(downloaded: number, total: number | null): number | null {
  if (total === null || total <= 0) return null
  return Math.min(100, Math.max(0, Math.round((downloaded / total) * 100)))
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
