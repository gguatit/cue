import type { ProtectionStatus } from './tauri'

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
