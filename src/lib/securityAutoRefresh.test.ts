import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { autoRefreshSecurity, resetSecurityAutoRefresh } from './securityAutoRefresh'

describe('autoRefreshSecurity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-09T00:00:00Z'))
    resetSecurityAutoRefresh()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs both checks even when one fails', async () => {
    const protection = vi.fn().mockRejectedValue('admin')
    const defender = vi.fn().mockResolvedValue(undefined)

    await autoRefreshSecurity(protection, defender)

    expect(protection).toHaveBeenCalledOnce()
    expect(defender).toHaveBeenCalledOnce()
  })

  it('reuses a recent result and refreshes after five minutes', async () => {
    const protection = vi.fn().mockResolvedValue(undefined)
    const defender = vi.fn().mockResolvedValue(undefined)

    await autoRefreshSecurity(protection, defender)
    await autoRefreshSecurity(protection, defender)
    expect(protection).toHaveBeenCalledOnce()
    expect(defender).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    await autoRefreshSecurity(protection, defender)
    expect(protection).toHaveBeenCalledTimes(2)
    expect(defender).toHaveBeenCalledTimes(2)
  })

  it('can be forced', async () => {
    const protection = vi.fn().mockResolvedValue(undefined)
    const defender = vi.fn().mockResolvedValue(undefined)

    await autoRefreshSecurity(protection, defender)
    await autoRefreshSecurity(protection, defender, true)
    expect(protection).toHaveBeenCalledTimes(2)
    expect(defender).toHaveBeenCalledTimes(2)
  })
})
