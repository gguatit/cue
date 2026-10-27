import { describe, expect, it } from 'vitest'
import { formatBytes, progressPercent, shouldAutoCheck, UPDATE_CHECK_INTERVAL_MS } from './updates'

describe('shouldAutoCheck', () => {
  const now = 1_800_000_000_000

  it('never checks when auto check is off', () => {
    expect(shouldAutoCheck(false, null, now)).toBe(false)
  })

  it('checks when no previous check was recorded', () => {
    expect(shouldAutoCheck(true, null, now)).toBe(true)
  })

  it('skips a check inside the interval', () => {
    expect(shouldAutoCheck(true, now - UPDATE_CHECK_INTERVAL_MS + 1, now)).toBe(false)
  })

  it('checks after the interval', () => {
    expect(shouldAutoCheck(true, now - UPDATE_CHECK_INTERVAL_MS, now)).toBe(true)
  })

  it('checks when the stored timestamp is in the future', () => {
    expect(shouldAutoCheck(true, now + 1, now)).toBe(true)
  })
})

describe('progressPercent', () => {
  it('reports a bounded percentage', () => {
    expect(progressPercent(50, 100)).toBe(50)
    expect(progressPercent(150, 100)).toBe(100)
    expect(progressPercent(-1, 100)).toBe(0)
  })

  it('returns null without a usable total', () => {
    expect(progressPercent(50, null)).toBeNull()
    expect(progressPercent(50, 0)).toBeNull()
  })
})

describe('formatBytes', () => {
  it('formats kilobytes and megabytes', () => {
    expect(formatBytes(0)).toBe('0 KB')
    expect(formatBytes(1536)).toBe('2 KB')
    expect(formatBytes(221 * 1024 * 1024)).toBe('221.0 MB')
  })
})
