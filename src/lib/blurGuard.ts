const DEFAULT_GUARD_MS = 5000

let guardedUntil = 0

export function beginBlurGuard(ms = DEFAULT_GUARD_MS): void {
  guardedUntil = Date.now() + Math.max(0, ms)
}

export function isBlurGuarded(now = Date.now()): boolean {
  return now < guardedUntil
}
