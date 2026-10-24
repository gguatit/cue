import { mergeSettings, type Settings } from '../stores/settings'

export const PROFILES_KEY = 'cue-profiles'
export const BACKUP_APP = 'cue'
export const BACKUP_VERSION = 1

export interface ExportPayload {
  app: string
  version: number
  exportedAt: number
  settings: Settings
}

export interface Profile {
  id: string
  name: string
  settings: Settings
}

export function buildExportPayload(settings: Settings, now: number = Date.now()): ExportPayload {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now, settings }
}

export function parseImport(text: string): Settings {
  const parsed: unknown = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid')
  }
  const record = parsed as Record<string, unknown>
  if (record.app !== undefined && record.app !== BACKUP_APP) throw new Error('invalid')
  if (record.version !== undefined && record.version !== BACKUP_VERSION) throw new Error('invalid')
  const raw =
    record.settings && typeof record.settings === 'object' && !Array.isArray(record.settings)
      ? record.settings
      : record
  return mergeSettings(raw)
}

function isProfile(v: unknown): v is Profile {
  const p = v as Profile
  return (
    !!p &&
    typeof p === 'object' &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    !!p.settings &&
    typeof p.settings === 'object'
  )
}

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function loadProfiles(): Profile[] {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(PROFILES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isProfile) : []
  } catch {
    return []
  }
}

export function saveProfiles(profiles: Profile[]): void {
  const store = storage()
  if (!store) return
  try {
    if (profiles.length === 0) store.removeItem(PROFILES_KEY)
    else store.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch {
    // Ignore quota or privacy-mode write failures.
  }
}

export function addProfile(name: string, settings: Settings, now: number = Date.now()): Profile[] {
  const profile: Profile = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    settings,
  }
  const profiles = [...loadProfiles(), profile]
  saveProfiles(profiles)
  return profiles
}

export function deleteProfile(id: string): Profile[] {
  const profiles = loadProfiles().filter((p) => p.id !== id)
  saveProfiles(profiles)
  return profiles
}
