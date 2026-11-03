import { describe, expect, it } from 'vitest'
import { accentVars, fromHex } from './appearance'

describe('appearance accent', () => {
  it('keeps bright accents and derives strong/soft variants', () => {
    const vars = fromHex('#fbbf24')
    expect(vars.accent).toBe('#fbbf24')
    expect(vars.strong).toBe('#dda820')
    expect(vars.soft).toBe('#fbbf2420')
  })

  it('lightens dark accents for black button text', () => {
    const vars = fromHex('#000000')
    expect(vars.accent).not.toBe('#000000')
    expect(Number.parseInt(vars.accent.slice(1, 3), 16)).toBeGreaterThan(100)
  })

  it('falls back to amber for invalid input', () => {
    expect(fromHex('not-a-color').accent).toBe('#fbbf24')
  })

  it('uses the system accent when selected', () => {
    expect(accentVars('system', '#0a84ff').accent).toBe(fromHex('#0a84ff').accent)
    expect(accentVars('system', null).accent).toBe('#fbbf24')
  })
})
