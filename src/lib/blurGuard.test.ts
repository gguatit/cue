import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginBlurGuard, isBlurGuarded } from './blurGuard'

describe('blur guard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('suppresses blur handling until the guard expires', () => {
    beginBlurGuard(2_000)
    expect(isBlurGuarded()).toBe(true)
    vi.setSystemTime(2_999)
    expect(isBlurGuarded()).toBe(true)
    vi.setSystemTime(3_001)
    expect(isBlurGuarded()).toBe(false)
  })

  it('uses a five second default', () => {
    beginBlurGuard()
    vi.setSystemTime(5_999)
    expect(isBlurGuarded()).toBe(true)
    vi.setSystemTime(6_001)
    expect(isBlurGuarded()).toBe(false)
  })
})
