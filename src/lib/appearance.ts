import { setTitlebarTheme, systemAccent } from './tauri'
import { useSettings, type AccentChoice, type ThemeChoice } from '../stores/settings'

export type ResolvedTheme = 'dark' | 'light'

export interface AccentVars {
  accent: string
  strong: string
  soft: string
  contrast: string
}

const MIN_DARK_LUMINANCE = 0.45
const MAX_LIGHT_LUMINANCE = 0.38

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function ensureLight(r: number, g: number, b: number): [number, number, number] {
  const lum = luminance(r, g, b)
  if (lum >= MIN_DARK_LUMINANCE) return [r, g, b]
  const t = (MIN_DARK_LUMINANCE - lum) / (1 - lum)
  const mix = (c: number) => Math.round(c + (255 - c) * t)
  return [mix(r), mix(g), mix(b)]
}

function ensureDark(r: number, g: number, b: number): [number, number, number] {
  const lum = luminance(r, g, b)
  if (lum <= MAX_LIGHT_LUMINANCE) return [r, g, b]
  const t = (lum - MAX_LIGHT_LUMINANCE) / lum
  const mix = (c: number) => Math.round(c * (1 - t))
  return [mix(r), mix(g), mix(b)]
}

function hex(value: number): string {
  return value.toString(16).padStart(2, '0')
}

/** Keeps the accent readable on the app background and returns the matching button text color. */
export function fromHex(input: string, theme: ResolvedTheme = 'dark'): AccentVars {
  const match = /^#?([0-9a-f]{6})$/i.exec(input.trim())
  if (!match) return fromHex('#fbbf24', theme)
  const value = Number.parseInt(match[1], 16)
  const [r, g, b] =
    theme === 'light'
      ? ensureDark((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff)
      : ensureLight((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff)
  const accent = `#${hex(r)}${hex(g)}${hex(b)}`
  const scale = theme === 'light' ? 0.78 : 0.88
  const strong = `#${hex(Math.round(r * scale))}${hex(Math.round(g * scale))}${hex(Math.round(b * scale))}`
  return {
    accent,
    strong,
    soft: `${accent}20`,
    contrast: theme === 'light' ? '#ffffff' : '#0b0b0e',
  }
}

const PRESET_HEX: Record<Exclude<AccentChoice, 'system'>, string> = {
  amber: '#fbbf24',
  blue: '#0a84ff',
  violet: '#bf5af2',
}

export function accentVars(
  choice: AccentChoice,
  systemHex: string | null,
  theme: ResolvedTheme = 'dark',
): AccentVars {
  if (choice !== 'system') return fromHex(PRESET_HEX[choice], theme)
  return fromHex(systemHex ?? PRESET_HEX.amber, theme)
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'light') return 'light'
  if (choice === 'dark') return 'dark'
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  void setTitlebarTheme(theme === 'dark').catch(() => {})
}

export function applyAccentVars(vars: AccentVars): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-accent', vars.accent)
  root.style.setProperty('--color-accent-strong', vars.strong)
  root.style.setProperty('--color-accent-soft', vars.soft)
  root.style.setProperty('--color-accent-contrast', vars.contrast)
}

export async function applyAccentChoice(
  choice: AccentChoice,
  theme: ResolvedTheme = 'dark',
): Promise<void> {
  if (choice !== 'system') {
    applyAccentVars(fromHex(PRESET_HEX[choice], theme))
    return
  }
  const hex = await systemAccent().catch(() => null)
  applyAccentVars(accentVars(choice, hex, theme))
}

export function startAppearanceSync(): () => void {
  const apply = () => {
    const { accent, theme } = useSettings.getState().appearance
    const resolved = resolveTheme(theme)
    applyTheme(resolved)
    void applyAccentChoice(accent, resolved)
  }
  apply()
  const unsubscribe = useSettings.subscribe((state, previous) => {
    if (
      state.appearance.accent !== previous.appearance.accent ||
      state.appearance.theme !== previous.appearance.theme
    ) {
      apply()
    }
  })
  const onFocus = () => {
    const { accent, theme } = useSettings.getState().appearance
    if (accent === 'system' || theme === 'system') apply()
  }
  let media: MediaQueryList | null = null
  const onMedia = () => {
    if (useSettings.getState().appearance.theme === 'system') apply()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus)
    if (typeof window.matchMedia === 'function') {
      media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', onMedia)
    }
  }
  return () => {
    unsubscribe()
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus)
      media?.removeEventListener('change', onMedia)
    }
  }
}
