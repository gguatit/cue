import { systemAccent } from './tauri'
import { useSettings, type AccentChoice } from '../stores/settings'

export interface AccentVars {
  accent: string
  strong: string
  soft: string
}

const MIN_LUMINANCE = 0.45

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function ensureLight(r: number, g: number, b: number): [number, number, number] {
  const lum = luminance(r, g, b)
  if (lum >= MIN_LUMINANCE) return [r, g, b]
  const t = (MIN_LUMINANCE - lum) / (1 - lum)
  const mix = (c: number) => Math.round(c + (255 - c) * t)
  return [mix(r), mix(g), mix(b)]
}

function hex(value: number): string {
  return value.toString(16).padStart(2, '0')
}

export function fromHex(input: string): AccentVars {
  const match = /^#?([0-9a-f]{6})$/i.exec(input.trim())
  if (!match) return fromHex('#fbbf24')
  const value = Number.parseInt(match[1], 16)
  const [r, g, b] = ensureLight(
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  )
  const accent = `#${hex(r)}${hex(g)}${hex(b)}`
  const strong = `#${hex(Math.round(r * 0.88))}${hex(Math.round(g * 0.88))}${hex(Math.round(b * 0.88))}`
  return { accent, strong, soft: `${accent}20` }
}

const PRESETS: Record<Exclude<AccentChoice, 'system'>, AccentVars> = {
  amber: fromHex('#fbbf24'),
  blue: fromHex('#0a84ff'),
  violet: fromHex('#bf5af2'),
}

export function accentVars(choice: AccentChoice, systemHex: string | null): AccentVars {
  if (choice !== 'system') return PRESETS[choice]
  return fromHex(systemHex ?? PRESETS.amber.accent)
}

export function applyAccentVars(vars: AccentVars): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-accent', vars.accent)
  root.style.setProperty('--color-accent-strong', vars.strong)
  root.style.setProperty('--color-accent-soft', vars.soft)
}

export async function applyAccentChoice(choice: AccentChoice): Promise<void> {
  if (choice !== 'system') {
    applyAccentVars(PRESETS[choice])
    return
  }
  const hex = await systemAccent().catch(() => null)
  applyAccentVars(accentVars(choice, hex))
}

export function startAppearanceSync(): () => void {
  const apply = () =>
    void applyAccentChoice(useSettings.getState().appearance.accent)
  apply()
  const unsubscribe = useSettings.subscribe((state, previous) => {
    if (state.appearance.accent !== previous.appearance.accent) apply()
  })
  const onFocus = () => {
    if (useSettings.getState().appearance.accent === 'system') apply()
  }
  if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)
  return () => {
    unsubscribe()
    if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus)
  }
}
