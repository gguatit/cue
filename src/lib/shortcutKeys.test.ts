import { describe, expect, it } from 'vitest'
import {
  buildAccel,
  commitsOnBlur,
  isModifierOnly,
  keyName,
  modifierName,
  shortcutConflicts,
} from './shortcutKeys'

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
  it('detects modifier-only shortcuts', () => {
    expect(isModifierOnly('Control+Alt')).toBe(true)
    expect(isModifierOnly('Control+Alt+Super')).toBe(true)
    expect(isModifierOnly('Control+Alt+Q')).toBe(false)
    expect(isModifierOnly('Control')).toBe(false)
    expect(isModifierOnly('A')).toBe(false)
  })
  it('detects conflicts with and without a required click', () => {
    const answer = { accelerator: 'Control+Alt', click: false }
    expect(shortcutConflicts(answer, { accelerator: 'Control+Alt+X' })).toBe(true)
    expect(shortcutConflicts({ ...answer, click: true }, { accelerator: 'Control+Alt+X' })).toBe(false)
    expect(shortcutConflicts({ ...answer, click: true }, { accelerator: 'Control+Alt' })).toBe(true)
    expect(shortcutConflicts({ ...answer, click: true }, { accelerator: 'Control+Alt+Shift' })).toBe(false)
    expect(shortcutConflicts({ accelerator: 'Control+Alt+Shift', click: true }, { accelerator: 'Control+Alt' })).toBe(true)
    expect(shortcutConflicts({ accelerator: 'Control+Alt+Q', click: false }, { accelerator: 'Control+Alt' })).toBe(true)
    expect(shortcutConflicts({ ...answer, click: false }, { accelerator: 'Alt+Shift' })).toBe(false)
    expect(shortcutConflicts({ accelerator: 'Control+Alt+Q' }, { accelerator: 'Control+Alt+Q' })).toBe(true)
  })
})
