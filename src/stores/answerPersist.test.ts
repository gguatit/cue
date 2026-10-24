import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tauri', () => ({
  captureAndAnswer: vi.fn(),
  showOverlay: vi.fn().mockResolvedValue(undefined),
  hideOverlay: vi.fn().mockResolvedValue(undefined),
  blinkAnswer: vi.fn().mockResolvedValue(undefined),
  blinkBrightness: vi.fn().mockResolvedValue(undefined),
  copyText: vi.fn().mockResolvedValue(undefined),
  cancelAnswer: vi.fn().mockResolvedValue(undefined),
  clearClipboard: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../lib/trayDisplay', () => ({
  setTrayIdle: vi.fn().mockResolvedValue(undefined),
  setTrayLoading: vi.fn().mockResolvedValue(undefined),
  setTrayAnswer: vi.fn().mockResolvedValue(undefined),
  setTrayError: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe('answer store hydration', () => {
  it('restores history and errors from storage', async () => {
    const history = [
      { ts: 2, answers: [], text: '설명' },
      { ts: 1, answers: ['B'] },
    ]
    localStorage.setItem('cue-history', JSON.stringify(history))
    localStorage.setItem('cue-errors', JSON.stringify([{ ts: 3, code: 'parse' }]))
    const { useAnswer } = await import('./answer')
    expect(useAnswer.getState().history).toEqual(history)
    expect(useAnswer.getState().log).toEqual([{ ts: 3, code: 'parse' }])
  })

  it('ignores corrupt data and caps restored entries', async () => {
    localStorage.setItem('cue-history', '{not json')
    localStorage.setItem(
      'cue-errors',
      JSON.stringify(Array.from({ length: 25 }, (_, i) => ({ ts: i, code: `e${i}` }))),
    )
    const { useAnswer } = await import('./answer')
    expect(useAnswer.getState().history).toEqual([])
    expect(useAnswer.getState().log).toHaveLength(20)
    expect(useAnswer.getState().log[0].code).toBe('e0')
  })

  it('drops stale keys when storage is disabled in settings', async () => {
    const { useSettings } = await import('./settings')
    useSettings.setState({ storage: { history: false, errors: false } })
    localStorage.setItem('cue-history', JSON.stringify([{ ts: 1, answers: ['B'] }]))
    localStorage.setItem('cue-errors', JSON.stringify([{ ts: 1, code: 'parse' }]))
    const { useAnswer } = await import('./answer')
    expect(useAnswer.getState().history).toEqual([])
    expect(useAnswer.getState().log).toEqual([])
    expect(localStorage.getItem('cue-history')).toBeNull()
    expect(localStorage.getItem('cue-errors')).toBeNull()
  })
})
