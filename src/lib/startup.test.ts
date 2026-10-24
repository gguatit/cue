import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  listenEvent: vi.fn(async (_event: string, _cb?: (...args: unknown[]) => void) => () => {}),
  setShortcut: vi.fn(async () => {}),
  setPanicShortcut: vi.fn(async () => {}),
  hideMain: vi.fn(async () => {}),
  shortcutInstalled: vi.fn(async () => true),
  setTrayMenuLabels: vi.fn(async () => {}),
  setContentProtection: vi.fn(async () => {}),
  setHideFromTaskbar: vi.fn(async () => {}),
  setTrayIdle: vi.fn(async () => {}),
  setTrayError: vi.fn(async () => {}),
}))

vi.mock('./tauri', () => ({
  isTauri: mocks.isTauri,
  listenEvent: mocks.listenEvent,
  setShortcut: mocks.setShortcut,
  setPanicShortcut: mocks.setPanicShortcut,
  hideMain: mocks.hideMain,
  shortcutInstalled: mocks.shortcutInstalled,
  setTrayMenuLabels: mocks.setTrayMenuLabels,
  setContentProtection: mocks.setContentProtection,
  setHideFromTaskbar: mocks.setHideFromTaskbar,
  captureAndAnswer: vi.fn(),
  showOverlay: vi.fn(),
  hideOverlay: vi.fn(async () => {}),
  copyText: vi.fn(async () => {}),
  cancelAnswer: vi.fn(async () => {}),
  clearClipboard: vi.fn(async () => {}),
}))
vi.mock('./trayDisplay', () => ({
  setTrayIdle: mocks.setTrayIdle,
  setTrayError: mocks.setTrayError,
  setTrayLoading: vi.fn(),
  setTrayAnswer: vi.fn(),
}))

import { runStartup } from './startup'
import { useAnswer } from '../stores/answer'
import { useSettings } from '../stores/settings'

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllTimers()
  vi.clearAllMocks()
  mocks.listenEvent.mockImplementation(async (_event: string, _cb?: (...args: unknown[]) => void) => () => {})
  useAnswer.setState({ mode: { kind: 'idle' }, running: false, log: [], history: [] })
  useSettings.setState({ display: { tray: true, overlay: false, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
})

describe('runStartup shortcut check', () => {
  it('logs "shortcut" when the hook did not install', async () => {
    mocks.shortcutInstalled.mockResolvedValue(false)
    await runStartup()
    expect(useAnswer.getState().log[0].code).toBe('shortcut')
    expect(mocks.setTrayError).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3000)
    expect(mocks.setTrayIdle).toHaveBeenCalledTimes(2)
  })

  it('does not log when the hook installed', async () => {
    mocks.shortcutInstalled.mockResolvedValue(true)
    await runStartup()
    expect(useAnswer.getState().log).toEqual([])
    expect(mocks.setTrayError).not.toHaveBeenCalled()
  })

  it('treats a rejected check as unknown', async () => {
    mocks.shortcutInstalled.mockRejectedValue('network')
    await runStartup()
    expect(useAnswer.getState().log).toEqual([])
  })

  it('logs but leaves the tray alone when tray display is off', async () => {
    useSettings.setState({ display: { tray: false, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    mocks.shortcutInstalled.mockResolvedValue(false)
    await runStartup()
    expect(useAnswer.getState().log[0].code).toBe('shortcut')
    expect(mocks.setTrayError).not.toHaveBeenCalled()
  })

  it('registers panic first and clears state, history and log on the event', async () => {
    const events: string[] = []
    let panicHandler: ((...args: unknown[]) => void) | undefined
    mocks.listenEvent.mockImplementation(async (event: string, cb?: (...args: unknown[]) => void) => {
      events.push(event)
      if (event === 'panic') panicHandler = cb
      return () => {}
    })
    await runStartup()
    expect(events[0]).toBe('panic')
    expect(mocks.setPanicShortcut).toHaveBeenCalledWith('Control+Alt+Shift+X')
    useAnswer.setState({
      mode: { kind: 'answer', answers: ['B'] },
      history: [{ ts: 1, answers: ['B'] }],
      log: [{ ts: 1, code: 'parse' }],
    })
    panicHandler!()
    expect(useAnswer.getState().mode.kind).toBe('idle')
    expect(useAnswer.getState().history).toEqual([])
    expect(useAnswer.getState().log).toEqual([])
    expect(mocks.hideMain).toHaveBeenCalledTimes(1)
  })
})

describe('runStartup tray menu', () => {
  it('applies six localized labels', async () => {
    useSettings.setState({ language: 'en' })
    await runStartup()
    expect(mocks.setTrayMenuLabels).toHaveBeenCalledWith(
      'Open Cue…',
      'Help',
      'Last answer',
      'Copy last answer',
      'Clear',
      'Quit',
    )
  })

  it('copies the last answer on copy-last', async () => {
    let copyHandler: ((...args: unknown[]) => void) | undefined
    mocks.listenEvent.mockImplementation(async (event: string, cb?: (...args: unknown[]) => void) => {
      if (event === 'copy-last') copyHandler = cb
      return () => {}
    })
    await runStartup()
    const copyLast = vi.spyOn(useAnswer.getState(), 'copyLast').mockResolvedValue(undefined)
    copyHandler!()
    expect(copyLast).toHaveBeenCalledTimes(1)
  })
})
