import { create } from 'zustand'
import {
  blinkAnswer,
  blinkBrightness,
  cancelAnswer,
  captureAndAnswer,
  clearClipboard,
  copyText,
  hideOverlay,
  meetingActive,
  showOverlay,
  type CaptureResult,
} from '../lib/tauri'
import {
  setTrayAnswer,
  setTrayError,
  setTrayIdle,
  setTrayLoading,
  setTrayVisible,
} from '../lib/trayDisplay'
import { t } from '../i18n'
import { useSettings } from './settings'

export type AnswerMode =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'answer'; answers: string[] }
  | { kind: 'text'; text: string }
  | { kind: 'error'; code: string }

export interface LogEntry {
  ts: number
  code: string
}

export interface AnswerHistoryEntry {
  ts: number
  answers: string[]
  text?: string
}

export const HISTORY_KEY = 'cue-history'
export const ERRORS_KEY = 'cue-errors'
export const MAX_HISTORY = 10
export const MAX_ERRORS = 20

interface AnswerState {
  mode: AnswerMode
  running: boolean
  meetingHidden: boolean
  panicHidden: boolean
  log: LogEntry[]
  history: AnswerHistoryEntry[]
  run: (sample: boolean) => Promise<void>
  showLast: () => Promise<void>
  copyLast: () => Promise<void>
  panicClear: () => void
  clearTray: () => void
  clearHistory: () => void
  clearErrors: () => void
  logError: (code: string) => Promise<void>
}

function isLogEntry(v: unknown): v is LogEntry {
  const e = v as LogEntry
  return !!e && typeof e === 'object' && typeof e.ts === 'number' && typeof e.code === 'string'
}

function isHistoryEntry(v: unknown): v is AnswerHistoryEntry {
  const e = v as AnswerHistoryEntry
  return (
    !!e &&
    typeof e === 'object' &&
    typeof e.ts === 'number' &&
    Array.isArray(e.answers) &&
    e.answers.every((a) => typeof a === 'string') &&
    (e.text === undefined || typeof e.text === 'string')
  )
}

function loadStored<T>(key: string, valid: (v: unknown) => v is T): T[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(valid) : []
  } catch {
    return []
  }
}

function removeStored(key: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage can be unavailable in private mode.
  }
}

function saveStored(key: string, value: unknown[], enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (!enabled || value.length === 0) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // Ignore quota or privacy-mode write failures.
  }
}

let seq = 0
let runSeq = 0
let traySeq = 0

async function hiddenByMeeting(): Promise<boolean> {
  if (!useSettings.getState().stealth.meetingSafe) return false
  if (useAnswer.getState().meetingHidden) return true
  try {
    if (await meetingActive()) {
      useAnswer.setState({ meetingHidden: true })
      return true
    }
  } catch {
    // Detection is best effort.
  }
  return false
}

const MEETING_POLL_MS = 1500
let meetingTimer: ReturnType<typeof setInterval> | null = null
let meetingPolling = false

function hideForMeeting(): void {
  useAnswer.setState({ meetingHidden: true })
  void hideOverlay().catch(() => {})
  void setTrayVisible(false).catch(() => {})
}

function meetingBlocked(): boolean {
  return useSettings.getState().stealth.meetingSafe && useAnswer.getState().meetingHidden
}

async function restoreMeetingDisplay(): Promise<void> {
  if (useAnswer.getState().panicHidden) {
    useAnswer.setState({ meetingHidden: false })
    return
  }
  await setTrayIdle().catch(() => {})
  try {
    await setTrayVisible(true)
  } catch {
    return
  }
  useAnswer.setState({ meetingHidden: false })
}

async function pollMeeting(): Promise<void> {
  if (meetingPolling) return
  if (!useSettings.getState().stealth.meetingSafe) {
    if (useAnswer.getState().meetingHidden) await restoreMeetingDisplay()
    return
  }
  meetingPolling = true
  try {
    const active = await meetingActive()
    if (!useSettings.getState().stealth.meetingSafe) {
      if (useAnswer.getState().meetingHidden) await restoreMeetingDisplay()
      return
    }
    if (active) {
      if (useAnswer.getState().meetingHidden) {
        void hideOverlay().catch(() => {})
        void setTrayVisible(false).catch(() => {})
      } else {
        hideForMeeting()
      }
    } else if (useAnswer.getState().meetingHidden) {
      await restoreMeetingDisplay()
    }
  } catch {
    // Detection is best effort; keep the current display state.
  } finally {
    meetingPolling = false
  }
}

export function startMeetingWatch(): () => void {
  const stop = () => {
    if (meetingTimer) {
      clearInterval(meetingTimer)
      meetingTimer = null
    }
    meetingPolling = false
  }
  if (meetingTimer) return stop
  meetingTimer = setInterval(() => { void pollMeeting() }, MEETING_POLL_MS)
  void pollMeeting()
  return stop
}

const initialStorage = useSettings.getState().storage
const initialHistory = initialStorage.history
  ? loadStored(HISTORY_KEY, isHistoryEntry).slice(0, MAX_HISTORY)
  : []
const initialLog = initialStorage.errors ? loadStored(ERRORS_KEY, isLogEntry).slice(0, MAX_ERRORS) : []
if (!initialStorage.history) removeStored(HISTORY_KEY)
if (!initialStorage.errors) removeStored(ERRORS_KEY)

export const useAnswer = create<AnswerState>()((set, get) => {
  const display = async (answers: string[], my: number, hidden: boolean): Promise<void> => {
    const first = answers[0] ?? ''
    const joined = answers.join(', ')
    const d = useSettings.getState().display
    traySeq++
    set({ mode: { kind: 'answer', answers } })
    if (d.led) void blinkAnswer(first, useSettings.getState().led.key).catch(() => {})
    if (d.brightness) void blinkBrightness(first).catch(() => {})
    if (hidden || meetingBlocked()) {
      hideForMeeting()
      return
    }
    if (d.tray) {
      try {
        await setTrayAnswer(first)
      } catch {
        void get().logError('tray')
      }
      if (seq !== my) return
      if (meetingBlocked()) {
        hideForMeeting()
        return
      }
    }
    const showGuarded = async (style: 'badge' | 'flash', ms: number): Promise<boolean> => {
      await showOverlay(joined, style, ms)
      if (seq !== my) return false
      if (meetingBlocked()) {
        void hideOverlay().catch(() => {})
        return false
      }
      return true
    }
    if (d.overlay && d.flash) {
      if (!(await showGuarded('flash', d.flashMs))) return
      setTimeout(() => {
        if (seq === my && !meetingBlocked()) {
          void showOverlay(joined, 'badge', d.badgeMs).catch(() => {})
        }
      }, d.flashMs)
      setTimeout(() => {
        if (seq === my) get().clearTray()
      }, d.flashMs + d.badgeMs)
    } else if (d.overlay) {
      if (!(await showGuarded('badge', d.badgeMs))) return
      setTimeout(() => {
        if (seq === my) get().clearTray()
      }, d.badgeMs)
    } else if (d.flash) {
      if (!(await showGuarded('flash', d.flashMs))) return
      setTimeout(() => {
        if (seq === my) get().clearTray()
      }, d.flashMs)
    } else {
      setTimeout(() => {
        if (seq === my) get().clearTray()
      }, d.badgeMs)
    }
  }

  const displayText = async (text: string, my: number, hidden: boolean): Promise<void> => {
    traySeq++
    set({ mode: { kind: 'text', text } })
    await setTrayIdle().catch(() => {})
    if (hidden || meetingBlocked()) {
      hideForMeeting()
      return
    }
    const ms = useSettings.getState().display.textMs
    await showOverlay(text, 'text', ms)
    if (seq !== my) return
    if (meetingBlocked()) {
      void hideOverlay().catch(() => {})
      return
    }
    setTimeout(() => {
      const m = get().mode
      if (seq === my && m.kind === 'text' && m.text === text) {
        void hideOverlay().catch(() => {})
      }
    }, ms + 500)
  }

  return {
    mode: { kind: 'idle' },
    running: false,
    meetingHidden: false,
    panicHidden: false,
    log: initialLog,
    history: initialHistory,
    panicClear: () => {
      seq++
      runSeq++
      traySeq++
      set({ mode: { kind: 'idle' }, running: false, history: [], log: [], panicHidden: true })
      removeStored(HISTORY_KEY)
      removeStored(ERRORS_KEY)
      void cancelAnswer().catch(() => {})
      void clearClipboard().catch(() => {})
      void setTrayIdle().catch(() => {})
      void setTrayVisible(false).catch(() => {})
      void hideOverlay().catch(() => {})
    },
    clearHistory: () => {
      set({ history: [] })
      removeStored(HISTORY_KEY)
    },
    clearErrors: () => {
      set({ log: [] })
      removeStored(ERRORS_KEY)
    },
    clearTray: () => {
      seq++
        traySeq++
        set({ mode: { kind: 'idle' } })
        void setTrayIdle().catch(() => {})
        void hideOverlay().catch(() => {})
    },
    logError: async (code) => {
      if (useSettings.getState().storage.errors) {
        set((s) => ({ log: [{ ts: Date.now(), code }, ...s.log].slice(0, MAX_ERRORS) }))
      }
      if (!useSettings.getState().display.tray) return
      const my = ++traySeq
      try {
        if (await hiddenByMeeting()) return
        if (traySeq !== my) return
        await setTrayError()
      } catch {
        return
      }
      if (traySeq !== my) {
        return
      }
      setTimeout(() => {
        if (traySeq === my) get().clearTray()
      }, 3000)
    },
    showLast: async () => {
      const hidden = await hiddenByMeeting()
      const entry = get().history[0]
      if (!entry) return
      const my = ++seq
      if (entry.text !== undefined) {
        await displayText(entry.text, my, hidden)
      } else {
        await display(entry.answers, my, hidden)
      }
    },
    copyLast: async () => {
      const entry = get().history[0]
      if (!entry) return
      try {
        await copyText(entry.text ?? entry.answers.join(', '))
      } catch {
        void get().logError('clipboard')
      }
    },
    run: async (sample) => {
      if (get().running) return
      const myRun = ++runSeq
      const my = ++seq
      set({ running: true, mode: { kind: 'loading' } })
      const { provider, answer, privacy } = useSettings.getState()
      const textMode = provider.answerType === 'text'
      try {
        const hiddenAtStart = await hiddenByMeeting()
        if (seq !== my) return
        if (hiddenAtStart) {
          hideForMeeting()
        } else {
          set({ panicHidden: false })
          await setTrayIdle().catch(() => {})
          await setTrayVisible(true).catch(() => {})
          if (seq !== my) return
        }
        if (!textMode && useSettings.getState().display.tray && !hiddenAtStart) {
          try {
            await setTrayLoading()
          } catch {
            void get().logError('tray')
          }
          if (seq !== my) return
          if (meetingBlocked()) {
            hideForMeeting()
            return
          }
        }
        let result: CaptureResult
        if (sample) {
          await new Promise((r) => setTimeout(r, 4000))
          result = textMode
            ? {
                kind: 'text',
                text: t(
                  'This is a sample descriptive answer. The real answer appears here.',
                  '설명형 답변 예시입니다. 실제 답변이 이곳에 표시됩니다.',
                ),
              }
            : { kind: 'choice', answers: ['B'] }
        } else {
          result = await captureAndAnswer(
            provider.preset,
            provider.baseUrl,
            provider.model,
            provider.extraJson,
            provider.answerType,
            provider.paraphrase,
            privacy.crop,
            answer.language,
            answer.level,
          )
        }
        if (seq !== my) return
        const hidden = await hiddenByMeeting()
        if (seq !== my) return
        if (result.kind === 'text') {
          const text = result.text
          if (useSettings.getState().storage.history) {
            set((s) => ({
              history: [{ ts: Date.now(), answers: [], text }, ...s.history].slice(0, MAX_HISTORY),
            }))
          }
          await displayText(text, my, hidden)
        } else {
          const answers = result.answers
          if (useSettings.getState().storage.history) {
            set((s) => ({
              history: [{ ts: Date.now(), answers }, ...s.history].slice(0, MAX_HISTORY),
            }))
          }
          await display(answers, my, hidden)
        }
      } catch (e) {
        if (seq !== my) return
        const code = typeof e === 'string' && e ? e : 'parse'
        set((s) => ({
          mode: { kind: 'error', code },
          log: useSettings.getState().storage.errors
            ? [{ ts: Date.now(), code }, ...s.log].slice(0, MAX_ERRORS)
            : s.log,
        }))
        const hidden = await hiddenByMeeting()
        if (seq !== my) return
        if (!textMode && useSettings.getState().display.tray && !hidden) {
          try {
            await setTrayError()
          } catch {
            return
          }
          if (seq !== my) return
          setTimeout(() => {
            if (seq === my) get().clearTray()
          }, 3000)
        }
      } finally {
        if (runSeq === myRun) set({ running: false })
      }
    },
  }
})

useAnswer.subscribe((state, prev) => {
  const storage = useSettings.getState().storage
  if (state.history !== prev.history) saveStored(HISTORY_KEY, state.history, storage.history)
  if (state.log !== prev.log) saveStored(ERRORS_KEY, state.log, storage.errors)
})

useSettings.subscribe((state, prev) => {
  if (prev.stealth.meetingSafe && !state.stealth.meetingSafe && useAnswer.getState().meetingHidden) {
    void restoreMeetingDisplay()
  }
})

useSettings.subscribe((state, prev) => {
  if (state.storage.history === prev.storage.history && state.storage.errors === prev.storage.errors) {
    return
  }
  if (state.storage.history !== prev.storage.history) {
    if (state.storage.history) {
      saveStored(HISTORY_KEY, useAnswer.getState().history, true)
    } else {
      useAnswer.setState({ history: [] })
      removeStored(HISTORY_KEY)
    }
  }
  if (state.storage.errors !== prev.storage.errors) {
    if (state.storage.errors) {
      saveStored(ERRORS_KEY, useAnswer.getState().log, true)
    } else {
      useAnswer.setState({ log: [] })
      removeStored(ERRORS_KEY)
    }
  }
})
