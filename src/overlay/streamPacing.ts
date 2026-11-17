export const BASE_CHARS_PER_SEC = 45
export const MAX_CHARS_PER_SEC = 500
export const FINAL_DRAIN_MS = 600
export const PUNCTUATION_PAUSE_MS: Record<string, number> = {
  '.': 80,
  '!': 80,
  '?': 80,
  ',': 40,
  '\n': 100,
}

export interface PaceState {
  visible: number
  carry: number
  pauseLeftMs: number
}

export const initialPace: PaceState = { visible: 0, carry: 0, pauseLeftMs: 0 }

export function advanceStream(
  state: PaceState,
  target: string,
  dtMs: number,
  final: boolean,
): PaceState {
  const length = target.length
  if (state.visible >= length) {
    return { visible: length, carry: 0, pauseLeftMs: 0 }
  }
  if (dtMs <= 0) return state

  let remaining = dtMs
  let pauseLeftMs = Math.max(0, state.pauseLeftMs)
  if (pauseLeftMs > 0) {
    const used = Math.min(remaining, pauseLeftMs)
    remaining -= used
    pauseLeftMs -= used
    if (remaining <= 0) {
      return { ...state, pauseLeftMs }
    }
  }

  const backlog = length - state.visible
  const rate = final
    ? Math.max(BASE_CHARS_PER_SEC, Math.min(MAX_CHARS_PER_SEC, (backlog * 1000) / FINAL_DRAIN_MS))
    : Math.max(
        BASE_CHARS_PER_SEC,
        Math.min(MAX_CHARS_PER_SEC, backlog / 0.8),
      )
  const advance = state.carry + (rate * remaining) / 1000
  const whole = Math.floor(advance)
  const visible = Math.min(length, state.visible + whole)
  let carry = advance - whole

  if (visible > state.visible && visible < length && !final && backlog < 60) {
    const pause = PUNCTUATION_PAUSE_MS[target[visible - 1]]
    if (pause) {
      pauseLeftMs = pause
      carry = 0
    }
  }
  if (visible >= length) {
    carry = 0
    pauseLeftMs = 0
  }
  return { visible, carry, pauseLeftMs }
}
