import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderTrayIcon: vi.fn(async (_choice: string | null, _glyph: string | null, tooltip: string) => ({
    rgba: [],
    width: 32,
    height: 32,
    tooltip,
  })),
  setTrayIcons: vi.fn(async () => {}),
}))

vi.mock('../components/trayIcon', () => ({
  renderTrayIcon: mocks.renderTrayIcon,
  answerGlyph: () => ({ choice: 'B', glyph: null }),
}))
vi.mock('./tauri', () => ({ setTrayIcons: mocks.setTrayIcons, isTauri: () => true }))

import { useSettings } from '../stores/settings'
import { setTrayError, setTrayForMode, setTrayLoading } from './trayDisplay'

describe('trayDisplay tooltips', () => {
  beforeEach(() => {
    mocks.renderTrayIcon.mockClear()
    useSettings.setState({ language: 'ko' })
  })

  it('localizes the loading tooltip', async () => {
    await setTrayLoading()
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('Cue — 생각 중…')
  })

  it('localizes the error tooltip', async () => {
    await setTrayError()
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('Cue — 활동 내역을 확인하세요')
  })

  it('uses English when the language is en', async () => {
    useSettings.setState({ language: 'en' })
    await setTrayLoading()
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('Cue — Thinking…')
  })

  it('propagates tray failures in Tauri', async () => {
    mocks.setTrayIcons.mockRejectedValueOnce(new Error('x'))
    await expect(setTrayLoading()).rejects.toThrow('x')
  })
})

describe('setTrayForMode', () => {
  beforeEach(() => {
    mocks.renderTrayIcon.mockClear()
    useSettings.setState({
      language: 'ko',
      trayIcons: { idle: 'battery-medium', byAnswer: { '2': 'wifi' } },
      display: { tray: true, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
    })
  })

  it('redraws the current answer with the new mapping', async () => {
    await setTrayForMode({ kind: 'answer', answers: ['B'] })
    expect(mocks.renderTrayIcon).toHaveBeenCalledTimes(1)
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('Cue — B')
  })

  it('shows every answer in the tooltip', async () => {
    await setTrayForMode({ kind: 'answer', answers: ['A', 'C'] })
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('Cue — A, C')
  })

  it('redraws the idle icon', async () => {
    await setTrayForMode({ kind: 'idle' })
    expect(mocks.renderTrayIcon).toHaveBeenCalledTimes(1)
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('Cue')
  })

  it('does not show an answer when the tray mode is off', async () => {
    useSettings.setState({ display: { tray: false, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await setTrayForMode({ kind: 'answer', answers: ['B'] })
    expect(mocks.renderTrayIcon).not.toHaveBeenCalled()
  })
})
