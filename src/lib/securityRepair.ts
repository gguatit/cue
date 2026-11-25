import type { ProtectionStatus } from './tauri'

export type ProtectionCheckKey =
  | 'elevated'
  | 'adminPath'
  | 'adminCopy'
  | 'programDirLocked'
  | 'guardRunning'
  | 'adminTasks'
  | 'guardTasks'
  | 'programMarker'
  | 'serviceInstalled'
  | 'serviceRunning'

export interface ProtectionCheck {
  key: ProtectionCheckKey
  ok: boolean
}

export type ProtectionVerdict = 'ready' | 'off' | 'reinstall' | 'elevate' | 'repair'

export function protectionChecks(status: ProtectionStatus): ProtectionCheck[] {
  return [
    { key: 'elevated', ok: status.elevated },
    { key: 'adminPath', ok: status.adminPath },
    { key: 'adminCopy', ok: status.adminCopy },
    { key: 'programDirLocked', ok: status.programDirLocked },
    { key: 'guardRunning', ok: status.guardRunning },
    { key: 'adminTasks', ok: status.adminTasks },
    { key: 'guardTasks', ok: status.guardTasks },
    { key: 'programMarker', ok: status.programMarker },
    { key: 'serviceInstalled', ok: status.serviceInstalled },
    { key: 'serviceRunning', ok: status.serviceRunning },
  ]
}

export function protectionVerdict(status: ProtectionStatus): ProtectionVerdict {
  const adminConfigured =
    status.elevated ||
    status.adminTasks ||
    status.programMarker ||
    status.serviceInstalled ||
    status.adminCopy
  if (!adminConfigured) return 'off'
  if (!status.adminPath && !status.adminCopy) return 'reinstall'
  if (!status.elevated) return 'elevate'
  if (
    status.adminPath &&
    status.adminCopy &&
    status.programDirLocked &&
    status.adminTasks &&
    status.programMarker &&
    status.serviceInstalled &&
    status.serviceRunning &&
    !status.adminPrepareFailed
  ) {
    return 'ready'
  }
  return 'repair'
}

export async function resolveRepairStatus(
  current: ProtectionStatus | null,
  load: () => Promise<ProtectionStatus>,
): Promise<ProtectionStatus | null> {
  if (current) return current
  try {
    return await load()
  } catch {
    return null
  }
}

export async function runProtectionRepair(
  current: ProtectionStatus | null,
  actions: {
    loadStatus: () => Promise<ProtectionStatus>
    elevate: () => Promise<void>
    repair: () => Promise<void>
  },
): Promise<ProtectionStatus | null> {
  const status = await resolveRepairStatus(current, actions.loadStatus)
  if (status?.adminPrepareFailed) {
    await actions.elevate()
    return status
  }
  await actions.repair()
  return status
}
