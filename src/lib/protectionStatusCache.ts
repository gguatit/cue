import type { ProtectionStatus } from './tauri'

export const PROTECTION_STATUS_TTL_MS = 10_000

interface CachedProtectionStatus {
  status: ProtectionStatus
  at: number
}

let cache: CachedProtectionStatus | null = null

export function setProtectionStatusCache(status: ProtectionStatus, now = Date.now()): void {
  cache = { status, at: now }
}

export function cachedProtectionStatus(now = Date.now()): CachedProtectionStatus | null {
  if (!cache || now - cache.at >= PROTECTION_STATUS_TTL_MS) return null
  return cache
}

export function clearProtectionStatusCache(): void {
  cache = null
}
