const CACHE_TTL_MS = 5 * 60 * 1000
let lastRun = 0

export function resetSecurityAutoRefresh() {
  lastRun = 0
}

export async function autoRefreshSecurity(
  protection: () => Promise<void>,
  defender: () => Promise<void>,
  force = false,
): Promise<void> {
  const now = Date.now()
  if (!force && now - lastRun < CACHE_TTL_MS) return
  lastRun = now
  await Promise.allSettled([protection(), defender()])
}
