import { describe, expect, it } from 'vitest'
import { slotFor } from './answer'

describe('slotFor', () => {
  it('maps letters A-E case-insensitively', () => {
    expect(slotFor('A')).toBe(1)
    expect(slotFor('b')).toBe(2)
    expect(slotFor('E')).toBe(5)
    expect(slotFor('F')).toBeNull()
  })
  it('maps digits and circled digits', () => {
    expect(slotFor('3')).toBe(3)
    expect(slotFor('③')).toBe(3)
    expect(slotFor('6')).toBeNull()
  })
  it('rejects junk', () => {
    expect(slotFor('')).toBeNull()
    expect(slotFor('?')).toBeNull()
  })
})
