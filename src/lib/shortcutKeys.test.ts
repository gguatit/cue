import { describe, expect, it } from 'vitest'
import { buildAccel, commitsOnBlur, keyName, modifierName } from './shortcutKeys'

describe('shortcutKeys', () => {
  it('maps modifier keys', () => {
    expect(modifierName('Control')).toBe('Control')
    expect(modifierName('Meta')).toBe('Super')
    expect(modifierName('a')).toBeNull()
  })
  it('maps plain keys', () => {
    expect(keyName('a')).toBe('A')
    expect(keyName('F4')).toBe('F4')
    expect(keyName('Enter')).toBeNull()
  })
  it('builds accelerator-only combo', () => {
    expect(buildAccel(['Control', 'Alt', 'Super'])).toEqual({
      accelerator: 'Control+Alt+Super',
      display: 'Ctrl + Alt + Win',
    })
  })
  it('builds keyed combo', () => {
    expect(buildAccel(['Shift', 'A'])).toEqual({ accelerator: 'Shift+A', display: 'Shift + A' })
  })
  it('rejects single modifier and bare key', () => {
    expect(buildAccel(['Control'])).toBeNull()
    expect(buildAccel(['A'])).toBeNull()
  })
  it('commits a complete modifier chord when the window blurs first', () => {
    expect(commitsOnBlur(['Control', 'Alt', 'Super'])).toBe(true)
    expect(commitsOnBlur(['Control', 'Alt'])).toBe(true)
    expect(commitsOnBlur(['Control'])).toBe(false)
    expect(commitsOnBlur([])).toBe(false)
  })
})
