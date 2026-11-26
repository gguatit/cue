import { beforeEach, describe, expect, it } from 'vitest'
import {
  PROTECTION_STATUS_TTL_MS,
  cachedProtectionStatus,
  clearProtectionStatusCache,
  setProtectionStatusCache,
} from './protectionStatusCache'
import type { ProtectionStatus } from './tauri'

const status: ProtectionStatus = {
  elevated: true,
  adminPath: true,
  adminCopy: true,
  programDirLocked: null,
  guardRunning: true,
  adminTasks: true,
  guardTasks: false,
  programMarker: true,
  adminPrepareFailed: false,
  serviceInstalled: true,
  serviceRunning: true,
}

describe('protection status cache', () => {
  beforeEach(() => clearProtectionStatusCache())

  it('returns a fresh cached status', () => {
    setProtectionStatusCache(status, 1_000)
    expect(cachedProtectionStatus(1_000 + PROTECTION_STATUS_TTL_MS - 1)?.status).toBe(status)
  })

  it('drops a stale status', () => {
    setProtectionStatusCache(status, 1_000)
    expect(cachedProtectionStatus(1_000 + PROTECTION_STATUS_TTL_MS)).toBeNull()
  })
})
