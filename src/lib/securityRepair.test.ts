import { describe, expect, it, vi } from 'vitest'
import { resolveRepairStatus, runProtectionRepair } from './securityRepair'
import type { ProtectionStatus } from './tauri'

const status: ProtectionStatus = {
  elevated: false,
  adminTasks: true,
  guardTasks: false,
  programMarker: true,
  adminPrepareFailed: true,
  serviceInstalled: true,
  serviceRunning: true,
}

describe('resolveRepairStatus', () => {
  it('loads protection status when it has not been checked', async () => {
    const load = vi.fn().mockResolvedValue(status)

    await expect(resolveRepairStatus(null, load)).resolves.toBe(status)
    expect(load).toHaveBeenCalledOnce()
  })

  it('reuses an already checked status', async () => {
    const load = vi.fn()

    await expect(resolveRepairStatus(status, load)).resolves.toBe(status)
    expect(load).not.toHaveBeenCalled()
  })

  it('falls back to null when the status query fails', async () => {
    const load = vi.fn().mockRejectedValue('admin')

    await expect(resolveRepairStatus(null, load)).resolves.toBeNull()
  })
})

describe('runProtectionRepair', () => {
  it('loads an unchecked status and elevates for a failed admin copy', async () => {
    const loadStatus = vi.fn().mockResolvedValue(status)
    const elevate = vi.fn().mockResolvedValue(undefined)
    const repair = vi.fn().mockResolvedValue(undefined)

    await expect(
      runProtectionRepair(null, { loadStatus, elevate, repair }),
    ).resolves.toBe(status)
    expect(loadStatus).toHaveBeenCalledOnce()
    expect(elevate).toHaveBeenCalledOnce()
    expect(repair).not.toHaveBeenCalled()
  })

  it('repairs normally when the admin copy is not failed', async () => {
    const normal = { ...status, adminPrepareFailed: false }
    const loadStatus = vi.fn()
    const elevate = vi.fn().mockResolvedValue(undefined)
    const repair = vi.fn().mockResolvedValue(undefined)

    await runProtectionRepair(normal, { loadStatus, elevate, repair })

    expect(loadStatus).not.toHaveBeenCalled()
    expect(elevate).not.toHaveBeenCalled()
    expect(repair).toHaveBeenCalledOnce()
  })
})
