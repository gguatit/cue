const MODIFIERS: Record<string, string> = {
  Control: 'Control',
  Alt: 'Alt',
  Shift: 'Shift',
  Meta: 'Super',
}
const DISPLAY: Record<string, string> = { Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Super: 'Win' }
const ORDER = ['Control', 'Alt', 'Shift', 'Super']

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
