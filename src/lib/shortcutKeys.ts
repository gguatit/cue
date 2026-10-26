const MODIFIERS: Record<string, string> = {
  Control: 'Control',
  Alt: 'Alt',
  Shift: 'Shift',
  Meta: 'Super',
}
const DISPLAY: Record<string, string> = { Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Super: 'Win' }
const ORDER = ['Control', 'Alt', 'Shift', 'Super']
const MOD_BITS: Record<string, number> = { Control: 1, Alt: 2, Shift: 4, Super: 8 }
const MOD_ALIASES: Record<string, string> = {
  control: 'Control',
  ctrl: 'Control',
  alt: 'Alt',
  shift: 'Shift',
  super: 'Super',
  meta: 'Super',
  win: 'Super',
}

export type MouseButton = 'left' | 'right' | 'middle'

export interface ParsedAccelerator {
  mods: number
  key: string | null
}

export function parseAccelerator(accel: string): ParsedAccelerator | null {
  let mods = 0
  let key: string | null = null
  for (const raw of accel.split('+')) {
    const part = raw.trim()
    if (!part) return null
    const modifier = MOD_ALIASES[part.toLowerCase()]
    if (modifier) {
      mods |= MOD_BITS[modifier]
      continue
    }
    if (key !== null) return null
    const parsed = keyName(part)
    if (!parsed) return null
    key = parsed
  }
  const count = (mods & 1 ? 1 : 0) + (mods & 2 ? 1 : 0) + (mods & 4 ? 1 : 0) + (mods & 8 ? 1 : 0)
  if (key === null && count < 2) return null
  if (key !== null && mods === 0) return null
  return { mods, key }
}

export function isModifierOnly(accel: string): boolean {
  const parsed = parseAccelerator(accel)
  return parsed !== null && parsed.key === null
}

export function shortcutConflicts(
  answer: { accelerator: string; click?: boolean },
  panic: { accelerator: string },
): boolean {
  const a = parseAccelerator(answer.accelerator)
  const p = parseAccelerator(panic.accelerator)
  if (!a || !p) return false
  if (a.mods === p.mods && a.key === p.key) return true
  if (answer.click) {
    return a.key === null && p.key === null && (p.mods & a.mods) === p.mods
  }
  if (a.key === null && p.key === null) {
    return (a.mods & p.mods) === a.mods || (p.mods & a.mods) === p.mods
  }
  if (a.key === null) return (a.mods & p.mods) === a.mods
  if (p.key === null) return (p.mods & a.mods) === p.mods
  return false
}

export function modifierName(key: string): string | null {
  return MODIFIERS[key] ?? null
}

export function keyName(key: string): string | null {
  if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) return key.toUpperCase()
  if (/^F([1-9]|1[0-2])$/.test(key)) return key
  return null
}

export function commitsOnBlur(held: string[]): boolean {
  return held.length >= 2
}

export function buildAccel(keys: string[]): { accelerator: string; display: string } | null {
  const mods = ORDER.filter((m) => keys.includes(m))
  const rest = keys.filter((k) => !ORDER.includes(k))
  if (rest.length > 1) return null
  const key = rest[0]
  if (!key && mods.length < 2) return null
  if (key && mods.length === 0) return null
  const accelerator = [...mods, ...(key ? [key] : [])].join('+')
  const display = [...mods.map((m) => DISPLAY[m]), ...(key ? [key] : [])].join(' + ')
  return { accelerator, display }
}
