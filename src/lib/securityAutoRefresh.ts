export async function autoRefreshSecurity(
  protection: () => Promise<void>,
  defender: () => Promise<void>,
): Promise<void> {
  await Promise.allSettled([protection(), defender()])
}
