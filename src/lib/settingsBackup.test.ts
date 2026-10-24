import { beforeEach, describe, expect, it } from 'vitest'
import { mergeSettings, defaults } from '../stores/settings'
import {
  PROFILES_KEY,
  addProfile,
  buildExportPayload,
  deleteProfile,
  loadProfiles,
  parseImport,
} from './settingsBackup'

beforeEach(() => {
  localStorage.clear()
})

describe('settings backup', () => {
  it('builds an export payload from settings without API keys', () => {
    const payload = buildExportPayload(defaults, 123)
    expect(payload.app).toBe('cue')
    expect(payload.version).toBe(1)
    expect(payload.exportedAt).toBe(123)
    expect(payload.settings).toEqual(defaults)
    expect(JSON.stringify(payload)).not.toMatch(/api[_-]?key/i)
  })

  it('parses a payload and fills missing settings from defaults', () => {
    const text = JSON.stringify({
      app: 'cue',
      version: 1,
      settings: { language: 'en', display: { tray: false, overlay: true } },
    })
    const merged = parseImport(text)
    expect(merged.language).toBe('en')
    expect(merged.display.tray).toBe(false)
    expect(merged.display.overlay).toBe(true)
    expect(merged.display.badgeMs).toBe(defaults.display.badgeMs)
    expect(merged.storage).toEqual(defaults.storage)
  })

  it('repairs an all-off display in an imported backup', () => {
    const merged = parseImport(JSON.stringify({ display: { tray: false, overlay: false } }))
    expect(merged.display.tray).toBe(true)
  })

  it('accepts a bare settings object', () => {
    const merged = parseImport(JSON.stringify({ language: 'ko' }))
    expect(merged.language).toBe('ko')
  })

  it('rejects invalid JSON and non-object payloads', () => {
    expect(() => parseImport('not json')).toThrow()
    expect(() => parseImport('[]')).toThrow()
    expect(() => parseImport('null')).toThrow()
    expect(() => parseImport('"text"')).toThrow()
  })

  it('rejects a backup from another app or a future version', () => {
    expect(() => parseImport(JSON.stringify({ app: 'other', version: 1, settings: {} }))).toThrow()
    expect(() => parseImport(JSON.stringify({ app: 'cue', version: 99, settings: {} }))).toThrow()
  })

  it('sanitizes a bare settings object', () => {
    const parsed = parseImport(JSON.stringify({ apiKey: 'x', display: { badgeMs: 999999 } }))
    expect('apiKey' in parsed).toBe(false)
    expect(parsed.display.badgeMs).toBe(15000)
  })
})

describe('profiles', () => {
  it('adds, loads and applies a profile', () => {
    const added = addProfile('Study', defaults, 100)
    expect(added).toHaveLength(1)
    expect(added[0].name).toBe('Study')
    expect(added[0].id).toBeTruthy()
    expect(loadProfiles()).toEqual(added)
    expect(mergeSettings(added[0].settings)).toEqual(defaults)
  })

  it('deletes a profile and removes the stored key when empty', () => {
    const added = addProfile('Study', defaults, 100)
    const remaining = deleteProfile(added[0].id)
    expect(remaining).toEqual([])
    expect(loadProfiles()).toEqual([])
    expect(localStorage.getItem(PROFILES_KEY)).toBeNull()
  })

  it('ignores corrupt or malformed profile data', () => {
    localStorage.setItem(PROFILES_KEY, '{bad')
    expect(loadProfiles()).toEqual([])
    localStorage.setItem(PROFILES_KEY, JSON.stringify([{ id: 1, name: null }]))
    expect(loadProfiles()).toEqual([])
  })
})
