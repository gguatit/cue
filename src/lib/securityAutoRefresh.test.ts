import { describe, expect, it, vi } from 'vitest'
import { autoRefreshSecurity } from './securityAutoRefresh'

describe('autoRefreshSecurity', () => {
  it('runs both checks even when one fails', async () => {
    const protection = vi.fn().mockRejectedValue('admin')
    const defender = vi.fn().mockResolvedValue(undefined)

    await autoRefreshSecurity(protection, defender)

    expect(protection).toHaveBeenCalledOnce()
    expect(defender).toHaveBeenCalledOnce()
  })
})
