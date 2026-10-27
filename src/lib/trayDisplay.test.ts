import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderTrayIcon: vi.fn(async (_choice: string | null, _glyph: string | null, tooltip: string) => ({
    rgba: [],
    width: 32,
    height: 32,
    tooltip,
  })),
  setTrayIcons: vi.fn(async () => {}),
  setTrayVisible: vi.fn(async () => {}),
}))

vi.mock('../components/trayIcon', () => ({
  renderTrayIcon: mocks.renderTrayIcon,
  answerGlyph: () => ({ choice: 'B', glyph: null }),
}))
vi.mock('./tauri', () => ({
  setTrayIcons: mocks.setTrayIcons,
  setTrayVisible: mocks.setTrayVisible,
  isTauri: () => true,
}))

import { useSettings } from '../stores/settings'
import {
  setTrayAnswer,
  setTrayError,
  setTrayForMode,
  setTrayIdle,
  setTrayLoading,
  setTrayVisible,
} from './trayDisplay'

describe('trayDisplay tooltips', () => {
  beforeEach(() => {
    mocks.renderTrayIcon.mockClear()
    mocks.setTrayVisible.mockClear()
    useSettings.setState({ language: 'ko' })
  })

  it('uses a neutral Korean tooltip while loading', async () => {
    await setTrayLoading()
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('시스템')
  })

  it('uses a neutral Korean tooltip for errors', async () => {
    await setTrayError()
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('시스템')
  })

  it('uses English when the language is en', async () => {
    useSettings.setState({ language: 'en' })
    await setTrayLoading()
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('System')
  })

  it('never puts the answer in the tooltip', async () => {
    await setTrayAnswer('B')
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('시스템')
  })

  it('shows the tray when an answer is drawn', async () => {
    await setTrayAnswer('B')
    expect(mocks.setTrayVisible).toHaveBeenCalledWith(true)
  })

  it('does not force the tray visible for an idle redraw', async () => {
    await setTrayIdle()
    expect(mocks.setTrayVisible).not.toHaveBeenCalled()
  })

  it('hides and shows the tray on request', async () => {
    await setTrayVisible(false)
    expect(mocks.setTrayVisible).toHaveBeenCalledWith(false)
    await setTrayVisible(true)
    expect(mocks.setTrayVisible).toHaveBeenCalledWith(true)
  })

  it('propagates tray failures in Tauri', async () => {
    mocks.setTrayIcons.mockRejectedValueOnce(new Error('x'))
    await expect(setTrayLoading()).rejects.toThrow('x')
  })
})

describe('setTrayForMode', () => {
  beforeEach(() => {
    mocks.renderTrayIcon.mockClear()
    mocks.setTrayVisible.mockClear()
    useSettings.setState({
      language: 'ko',
      trayIcons: { idle: 'battery-medium', byAnswer: { '2': 'wifi' } },
      display: { tray: true, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
    })
  })

  it('redraws the current answer with the new mapping', async () => {
    await setTrayForMode({ kind: 'answer', answers: ['B'] })
    expect(mocks.renderTrayIcon).toHaveBeenCalledTimes(1)
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('시스템')
  })

  it('does not put every answer in the tooltip', async () => {
    await setTrayForMode({ kind: 'answer', answers: ['A', 'C'] })
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('시스템')
  })

  it('redraws the idle icon', async () => {
    await setTrayForMode({ kind: 'idle' })
    expect(mocks.renderTrayIcon).toHaveBeenCalledTimes(1)
    expect(mocks.renderTrayIcon.mock.calls[0][2]).toBe('시스템')
  })

  it('does not show an answer when the tray mode is off', async () => {
    useSettings.setState({ display: { tray: false, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await setTrayForMode({ kind: 'answer', answers: ['B'] })
    expect(mocks.renderTrayIcon).not.toHaveBeenCalled()
  })
})
