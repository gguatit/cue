import { describe, expect, it, vi } from 'vitest'
import {
  protectionChecks,
  protectionVerdict,
  resolveRepairStatus,
  runProtectionRepair,
} from './securityRepair'
import type { ProtectionStatus } from './tauri'

const status: ProtectionStatus = {
  elevated: false,
  adminPath: true,
  adminCopy: true,
  programDirLocked: true,
  guardRunning: true,
  adminTasks: true,
  guardTasks: false,
  programMarker: true,
  adminPrepareFailed: true,
  serviceInstalled: true,
  serviceRunning: true,
}

describe('protection diagnostics', () => {
  it('requires elevation before repairing a protected install', () => {
    expect(protectionVerdict(status)).toBe('elevate')
    expect(protectionChecks(status).find((check) => check.key === 'adminPath')?.ok).toBe(true)
  })

  it('reports a normal install with protection disabled as off', () => {
    const off = {
      ...status,
      elevated: false,
      adminPath: false,
      adminCopy: false,
      programDirLocked: false,
      guardRunning: false,
      adminTasks: false,
      guardTasks: false,
      programMarker: false,
      adminPrepareFailed: false,
      serviceInstalled: false,
      serviceRunning: false,
    }
    expect(protectionVerdict(off)).toBe('off')
  })

  it('reports a missing protected copy as a reinstall problem', () => {
    expect(
      protectionVerdict({
        ...status,
        adminPath: false,
        adminCopy: false,
        adminTasks: true,
        programMarker: true,
      }),
    ).toBe('reinstall')
  })

  it('reports a complete protected install as ready', () => {
    const ready = { ...status, elevated: true, adminPrepareFailed: false }
    expect(protectionVerdict(ready)).toBe('ready')
  })

  it('asks for repair when a protection component is missing', () => {
    expect(protectionVerdict({ ...status, elevated: true, serviceRunning: false })).toBe('repair')
  })
})

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
