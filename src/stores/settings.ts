import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  isModifierOnly,
  shortcutConflicts,
  type MouseButton,
} from '../lib/shortcutKeys'

export const CAMOUFLAGE_ICONS = [
  'alyac', 'battery-medium', 'volume-2', 'wifi', 'clock', 'shield',
  'download', 'cloud', 'lock', 'refresh-cw', 'bell',
]
const TRAY_GLYPHS = ['char', ...CAMOUFLAGE_ICONS]

export const PRESETS: Record<string, { label: string; baseUrl: string; placeholder: string }> = {
  opencode: { label: 'OpenCode Zen', baseUrl: 'https://opencode.ai/inference/openai/v1', placeholder: 'qwen3.8-max' },
  'opencode-go': { label: 'OpenCode Go', baseUrl: 'https://opencode.ai/inference/go/openai/v1', placeholder: 'qwen3.8-max' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', placeholder: 'gpt-4o' },
  google: { label: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', placeholder: 'gemini-2.5-flash' },
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', placeholder: 'claude-sonnet-4-5' },
  custom: { label: 'Custom', baseUrl: '', placeholder: '' },
}

export type DisplayMode = 'tray' | 'overlay' | 'flash' | 'led' | 'brightness'
export type LedKey = 'scroll' | 'caps' | 'num'
export type AnswerLanguage = 'auto' | 'ko' | 'en'
export type AnswerLevel = 'concise' | 'normal' | 'detailed'

export interface Settings {
  shortcut: { accelerator: string; display: string; click: boolean; button: MouseButton }
  free: { enabled: boolean; button: MouseButton; instruction: string }
  panic: { accelerator: string; display: string }
  language: 'ko' | 'en'
  display: {
    tray: boolean
    overlay: boolean
    flash: boolean
    led: boolean
    brightness: boolean
    flashMs: number
    badgeMs: number
    textMs: number
  }
  led: { key: LedKey }
  trayIcons: { idle: string; byAnswer: Record<string, string> }
  provider: {
    preset: string
    baseUrl: string
    model: string
    extraJson: string
    answerType: 'choice' | 'text'
    paraphrase: boolean
    consensus: boolean
    verifyModel: string
  }
  answer: { language: AnswerLanguage; level: AnswerLevel }
  privacy: { crop: boolean }
  stealth: {
    contentProtection: boolean
    skipTaskbar: boolean
    guard: boolean
    meetingSafe: boolean
    admin: boolean
  }
  storage: { history: boolean; errors: boolean }
  updates: { autoCheck: boolean }
  onboarded: boolean
}

interface Actions {
  setShortcut: (accelerator: string, display: string) => void
  setShortcutClick: (click: boolean) => void
  setShortcutButton: (button: MouseButton) => void
  setFree: (patch: Partial<Settings['free']>) => void
  setPanicShortcut: (accelerator: string, display: string) => void
  setLanguage: (language: 'ko' | 'en') => void
  setDisplayMode: (mode: DisplayMode, on: boolean) => boolean
  setFlashMs: (ms: number) => void
  setBadgeMs: (ms: number) => void
  setTextMs: (ms: number) => void
  setLedKey: (key: LedKey) => void
  setTrayIcon: (slot: string, value: string) => void
  resetTrayIcons: () => void
  setProvider: (patch: Partial<Settings['provider']>) => void
  setAnswer: (patch: Partial<Settings['answer']>) => void
  setPrivacy: (patch: Partial<Settings['privacy']>) => void
  setStealth: (patch: Partial<Settings['stealth']>) => void
  setStorage: (patch: Partial<Settings['storage']>) => void
  setUpdates: (patch: Partial<Settings['updates']>) => void
  setOnboarded: (v: boolean) => void
}

export const defaults: Settings = {
  shortcut: {
    accelerator: 'Control+Alt+Super',
    display: 'Ctrl + Alt + Win',
    click: true,
    button: 'left',
  },
  free: { enabled: false, button: 'right', instruction: '' },
  panic: { accelerator: 'Control+Alt+Shift+X', display: 'Ctrl + Alt + Shift + X' },
  language: 'ko',
  display: {
    tray: true,
    overlay: false,
    flash: false,
    led: false,
    brightness: false,
    flashMs: 800,
    badgeMs: 8000,
    textMs: 12000,
  },
  led: { key: 'caps' },
  trayIcons: { idle: 'battery-medium', byAnswer: { '1': 'char', '2': 'char', '3': 'char', '4': 'char', '5': 'char' } },
  provider: {
    preset: 'opencode',
    baseUrl: PRESETS.opencode.baseUrl,
    model: PRESETS.opencode.placeholder,
    extraJson: '',
    answerType: 'choice',
    paraphrase: false,
    consensus: false,
    verifyModel: '',
  },
  answer: { language: 'auto', level: 'normal' },
  privacy: { crop: false },
  stealth: { contentProtection: true, skipTaskbar: true, guard: false, meetingSafe: true, admin: false },
  storage: { history: true, errors: true },
  updates: { autoCheck: true },
  onboarded: false,
}

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

export function mergeSettings(persisted: unknown): Settings {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<Settings>
  const providerRaw = (p.provider ?? {}) as Partial<Settings['provider']>
  const preset = oneOf(providerRaw.preset, Object.keys(PRESETS), 'opencode')
  const provider = {
    preset,
    baseUrl: preset === 'custom' ? str(providerRaw.baseUrl, '') : PRESETS[preset].baseUrl,
    model: str(providerRaw.model, PRESETS[preset].placeholder),
    extraJson: str(providerRaw.extraJson, ''),
    answerType: oneOf(providerRaw.answerType, ['choice', 'text'] as const, 'choice'),
    paraphrase: bool(providerRaw.paraphrase, false),
    consensus: bool(providerRaw.consensus, false),
    verifyModel: str(providerRaw.verifyModel, ''),
  }
  const shortcutAccel = str(p.shortcut?.accelerator, defaults.shortcut.accelerator)
  const shortcut = {
    accelerator: shortcutAccel,
    display: str(p.shortcut?.display, defaults.shortcut.display),
    click:
      bool(p.shortcut?.click, defaults.shortcut.click) && isModifierOnly(shortcutAccel),
    button: oneOf(p.shortcut?.button, ['left', 'right', 'middle'] as const, 'left'),
  }
  const free = {
    enabled: bool(p.free?.enabled, defaults.free.enabled),
    button: oneOf(p.free?.button, ['left', 'right', 'middle'] as const, defaults.free.button),
    instruction: str(p.free?.instruction, defaults.free.instruction),
  }
  const merged: Settings = {
    shortcut,
    free,
    panic: {
      accelerator: str(p.panic?.accelerator, defaults.panic.accelerator),
      display: str(p.panic?.display, defaults.panic.display),
    },
    language: oneOf(p.language, ['ko', 'en'] as const, 'ko'),
    display: {
      tray: bool(p.display?.tray, defaults.display.tray),
      overlay: bool(p.display?.overlay, defaults.display.overlay),
      flash: bool(p.display?.flash, defaults.display.flash),
      led: bool(p.display?.led, defaults.display.led),
      brightness: bool(p.display?.brightness, defaults.display.brightness),
      flashMs: num(p.display?.flashMs, 300, 3000, defaults.display.flashMs),
      badgeMs: num(p.display?.badgeMs, 1000, 15000, defaults.display.badgeMs),
      textMs: num(p.display?.textMs, 2000, 30000, defaults.display.textMs),
    },
    led: { key: oneOf(p.led?.key, ['scroll', 'caps', 'num'] as const, 'caps') },
    trayIcons: {
      idle: oneOf(p.trayIcons?.idle, TRAY_GLYPHS, defaults.trayIcons.idle),
      byAnswer: Object.fromEntries(
        Object.entries({ ...defaults.trayIcons.byAnswer, ...(p.trayIcons?.byAnswer ?? {}) })
          .filter(([k, v]) => /^[1-5]$/.test(k) && TRAY_GLYPHS.includes(v))
          .slice(0, 5),
      ) as Record<string, string>,
    },
    provider,
    answer: {
      language: oneOf(p.answer?.language, ['auto', 'ko', 'en'] as const, 'auto'),
      level: oneOf(p.answer?.level, ['concise', 'normal', 'detailed'] as const, 'normal'),
    },
    privacy: { crop: bool(p.privacy?.crop, defaults.privacy.crop) },
    stealth: {
      contentProtection: bool(p.stealth?.contentProtection, defaults.stealth.contentProtection),
      skipTaskbar: bool(p.stealth?.skipTaskbar, defaults.stealth.skipTaskbar),
      guard: bool(p.stealth?.guard, defaults.stealth.guard),
      meetingSafe: bool(p.stealth?.meetingSafe, defaults.stealth.meetingSafe),
      admin: bool(p.stealth?.admin, defaults.stealth.admin),
    },
    storage: {
      history: bool(p.storage?.history, defaults.storage.history),
      errors: bool(p.storage?.errors, defaults.storage.errors),
    },
    updates: { autoCheck: bool(p.updates?.autoCheck, defaults.updates.autoCheck) },
    onboarded: bool(p.onboarded, defaults.onboarded),
  }
  const anyDisplay = (['tray', 'overlay', 'flash', 'led', 'brightness'] as const).some(
    (mode) => merged.display[mode],
  )
  if (!anyDisplay) merged.display = { ...merged.display, tray: true }
  if (
    !merged.free.enabled ||
    !merged.shortcut.click ||
    !isModifierOnly(merged.shortcut.accelerator) ||
    merged.free.button === merged.shortcut.button
  ) {
    merged.free = { ...merged.free, enabled: false }
  }
  if (
    !merged.provider.verifyModel.trim() ||
    merged.provider.verifyModel.trim() === merged.provider.model
  ) {
    merged.provider = { ...merged.provider, consensus: false }
  }
  if (shortcutConflicts(merged.shortcut, merged.panic)) {
    if (isModifierOnly(merged.shortcut.accelerator) && !merged.shortcut.click) {
      merged.shortcut = { ...merged.shortcut, click: true }
    }
    if (shortcutConflicts(merged.shortcut, merged.panic)) {
      merged.panic = { ...defaults.panic }
      if (shortcutConflicts(merged.shortcut, merged.panic)) {
        merged.shortcut = { ...defaults.shortcut }
      }
    }
  }
  return merged
}

export function mergePersisted(
  persisted: unknown,
  current: Settings & Actions,
): Settings & Actions {
  return { ...current, ...mergeSettings(persisted) }
}

export const useSettings = create<Settings & Actions>()(
  persist(
    (set, get) => ({
      ...defaults,
      setShortcut: (accelerator, display) =>
        set((s) => ({
          shortcut: {
            ...s.shortcut,
            accelerator,
            display,
            click: isModifierOnly(accelerator) ? s.shortcut.click : false,
          },
        })),
      setShortcutClick: (click) =>
        set((s) => ({
          shortcut: { ...s.shortcut, click: click && isModifierOnly(s.shortcut.accelerator) },
        })),
      setShortcutButton: (button) => set((s) => ({ shortcut: { ...s.shortcut, button } })),
      setFree: (patch) => set((s) => ({ free: { ...s.free, ...patch } })),
      setPanicShortcut: (accelerator, display) => set({ panic: { accelerator, display } }),
      setLanguage: (language) => set({ language }),
      setDisplayMode: (mode, on) => {
        if (!on) {
          const othersOn = (['tray', 'overlay', 'flash', 'led', 'brightness'] as const).some(
            (k) => k !== mode && get().display[k],
          )
          if (!othersOn) return false
        }
        set((s) => ({ display: { ...s.display, [mode]: on } }))
        return true
      },
      setFlashMs: (ms) => set((s) => ({ display: { ...s.display, flashMs: ms } })),
      setBadgeMs: (ms) => set((s) => ({ display: { ...s.display, badgeMs: ms } })),
      setTextMs: (ms) => set((s) => ({ display: { ...s.display, textMs: ms } })),
      setLedKey: (key) => set({ led: { key } }),
      setTrayIcon: (slot, value) =>
        set((s) => ({
          trayIcons:
            slot === 'idle'
              ? { ...s.trayIcons, idle: value }
              : { ...s.trayIcons, byAnswer: { ...s.trayIcons.byAnswer, [slot]: value } },
        })),
      resetTrayIcons: () => set({ trayIcons: structuredClone(defaults.trayIcons) }),
      setProvider: (patch) =>
        set((s) => {
          const provider = { ...s.provider, ...patch }
          const preset = PRESETS[provider.preset]
          if (provider.preset !== 'custom' && preset) provider.baseUrl = preset.baseUrl
          return { provider }
        }),
      setAnswer: (patch) => set((s) => ({ answer: { ...s.answer, ...patch } })),
      setPrivacy: (patch) => set((s) => ({ privacy: { ...s.privacy, ...patch } })),
      setStealth: (patch) => set((s) => ({ stealth: { ...s.stealth, ...patch } })),
      setStorage: (patch) => set((s) => ({ storage: { ...s.storage, ...patch } })),
      setUpdates: (patch) => set((s) => ({ updates: { ...s.updates, ...patch } })),
      setOnboarded: (v) => set({ onboarded: v }),
    }),
    {
      name: 'cue-settings',
      version: 15,
      migrate: (persisted) => mergeSettings(persisted),
      merge: mergePersisted,
    },
  ),
)
