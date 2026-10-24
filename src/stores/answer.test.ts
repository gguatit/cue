import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tauri', () => ({
  captureAndAnswer: vi.fn(),
  showOverlay: vi.fn().mockResolvedValue(undefined),
  hideOverlay: vi.fn().mockResolvedValue(undefined),
  blinkAnswer: vi.fn().mockResolvedValue(undefined),
  blinkBrightness: vi.fn().mockResolvedValue(undefined),
  copyText: vi.fn().mockResolvedValue(undefined),
  meetingActive: vi.fn().mockResolvedValue(false),
  cancelAnswer: vi.fn().mockResolvedValue(undefined),
  clearClipboard: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../lib/trayDisplay', () => ({
  setTrayIdle: vi.fn().mockResolvedValue(undefined),
  setTrayLoading: vi.fn().mockResolvedValue(undefined),
  setTrayAnswer: vi.fn().mockResolvedValue(undefined),
  setTrayError: vi.fn().mockResolvedValue(undefined),
}))

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
} from '../lib/tauri'
import { setTrayAnswer, setTrayIdle, setTrayLoading } from '../lib/trayDisplay'
import { useAnswer } from './answer'
import { defaults, useSettings } from './settings'

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllTimers()
  vi.clearAllMocks()
  vi.mocked(meetingActive).mockResolvedValue(false)
  localStorage.clear()
  useSettings.setState({
    display: { tray: true, overlay: false, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
    provider: structuredClone(defaults.provider),
    answer: structuredClone(defaults.answer),
    privacy: structuredClone(defaults.privacy),
    storage: structuredClone(defaults.storage),
    stealth: structuredClone(defaults.stealth),
  })
  useAnswer.setState({ mode: { kind: 'idle' }, running: false, log: [], history: [] })
})

describe('answer store', () => {
  it('sample flow: loading -> answer B -> idle after 8s', async () => {
    const p = useAnswer.getState().run(true)
    expect(useAnswer.getState().mode.kind).toBe('loading')
    await vi.advanceTimersByTimeAsync(4000)
    await p
    expect(useAnswer.getState().mode).toEqual({ kind: 'answer', answers: ['B'] })
    expect(setTrayAnswer).toHaveBeenCalledWith('B', 'B')
    await vi.advanceTimersByTimeAsync(8000)
    expect(useAnswer.getState().mode.kind).toBe('idle')
  })

  it('sends provider settings on a real run', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['C'] })
    useSettings.setState({
      provider: {
        preset: 'custom',
        baseUrl: 'https://x/v1',
        model: 'm',
        extraJson: '',
        answerType: 'choice',
        paraphrase: false,
      },
    })
    await useAnswer.getState().run(false)
    expect(captureAndAnswer).toHaveBeenCalledWith(
      'custom',
      'https://x/v1',
      'm',
      '',
      'choice',
      false,
      false,
      'auto',
      'normal',
    )
    expect(useAnswer.getState().mode).toEqual({ kind: 'answer', answers: ['C'] })
  })

  it('sends cursor crop and answer language/level settings', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'text', text: 'Answer' })
    useSettings.setState({
      provider: { ...defaults.provider, answerType: 'text' },
      privacy: { crop: true },
      answer: { language: 'en', level: 'detailed' },
    })
    await useAnswer.getState().run(false)
    expect(captureAndAnswer).toHaveBeenCalledWith(
      defaults.provider.preset,
      defaults.provider.baseUrl,
      defaults.provider.model,
      '',
      'text',
      false,
      true,
      'en',
      'detailed',
    )
  })

  it('ignores a second trigger while running', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['C'] })
    const p1 = useAnswer.getState().run(false)
    await useAnswer.getState().run(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(captureAndAnswer).toHaveBeenCalledTimes(1)
    await p1
  })

  it('error path logs and auto-clears after 3s', async () => {
    vi.mocked(captureAndAnswer).mockRejectedValueOnce('http_401')
    await useAnswer.getState().run(false)
    expect(useAnswer.getState().mode).toEqual({ kind: 'error', code: 'http_401' })
    expect(useAnswer.getState().log[0].code).toBe('http_401')
    await vi.advanceTimersByTimeAsync(3000)
    expect(useAnswer.getState().mode.kind).toBe('idle')
  })

  it('logs a tray loading failure and still answers', async () => {
    vi.mocked(setTrayLoading).mockRejectedValueOnce('tray')
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    await useAnswer.getState().run(false)
    expect(useAnswer.getState().running).toBe(false)
    expect(useAnswer.getState().mode).toEqual({ kind: 'answer', answers: ['B'] })
    expect(useAnswer.getState().log[0].code).toBe('tray')
  })

  it('both display modes: flash first, badge after flashMs', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({ display: { tray: true, overlay: true, flash: true, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenCalledTimes(1)
    expect(showOverlay).toHaveBeenNthCalledWith(1, 'B', 'flash', 800)
    await vi.advanceTimersByTimeAsync(799)
    expect(showOverlay).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(showOverlay).toHaveBeenNthCalledWith(2, 'B', 'badge', 8000)
  })

  it('tray display off: leaves the tray icon alone during the run', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({ display: { tray: false, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await useAnswer.getState().run(false)
    expect(setTrayLoading).not.toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
    expect(showOverlay).toHaveBeenCalledWith('B', 'badge', 8000)
  })

  it('overlay only: badge immediately', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({ display: { tray: true, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenCalledTimes(1)
    expect(showOverlay).toHaveBeenCalledWith('B', 'badge', 8000)
  })

  it('uses the configured badge duration for the badge and tray reset', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true, badgeMs: 5000 },
    })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenCalledWith('B', 'badge', 5000)
    await vi.advanceTimersByTimeAsync(4999)
    expect(useAnswer.getState().mode.kind).toBe('answer')
    await vi.advanceTimersByTimeAsync(1)
    expect(useAnswer.getState().mode.kind).toBe('idle')
  })

  it('uses the configured text duration for descriptive answers', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'text', text: '설명' })
    useSettings.setState({
      display: { ...defaults.display, overlay: true, textMs: 20000 },
      provider: { ...defaults.provider, answerType: 'text' },
    })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenCalledWith('설명', 'text', 20000)
    await vi.advanceTimersByTimeAsync(20000)
    expect(hideOverlay).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(hideOverlay).toHaveBeenCalled()
  })

  it('copyLast joins the newest answers with a comma', async () => {
    useAnswer.setState({
      history: [
        { ts: 2, answers: ['A', 'C'] },
        { ts: 1, answers: ['B'] },
      ],
    })
    await useAnswer.getState().copyLast()
    expect(copyText).toHaveBeenCalledWith('A, C')
  })

  it('copyLast copies descriptive text', async () => {
    useAnswer.setState({ history: [{ ts: 1, answers: [], text: '설명 답변' }] })
    await useAnswer.getState().copyLast()
    expect(copyText).toHaveBeenCalledWith('설명 답변')
  })

  it('copyLast does nothing without history', async () => {
    await useAnswer.getState().copyLast()
    expect(copyText).not.toHaveBeenCalled()
  })

  it('flash only: flash immediately', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({ display: { tray: true, overlay: false, flash: true, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenCalledTimes(1)
    expect(showOverlay).toHaveBeenCalledWith('B', 'flash', 800)
  })

  it('a new run cancels the pending badge', async () => {
    vi.mocked(captureAndAnswer)
      .mockResolvedValueOnce({ kind: 'choice', answers: ['B'] })
      .mockResolvedValueOnce({ kind: 'choice', answers: ['C'] })
    useSettings.setState({ display: { tray: true, overlay: true, flash: true, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenNthCalledWith(1, 'B', 'flash', 800)
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenNthCalledWith(2, 'C', 'flash', 800)
    await vi.advanceTimersByTimeAsync(800)
    const badges = vi.mocked(showOverlay).mock.calls.filter((c) => c[1] === 'badge')
    expect(badges).toEqual([['C', 'badge', 8000]])
  })

  it('clearTray cancels the pending badge', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({ display: { tray: true, overlay: true, flash: true, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    await useAnswer.getState().run(false)
    useAnswer.getState().clearTray()
    await vi.advanceTimersByTimeAsync(800)
    expect(vi.mocked(showOverlay).mock.calls.filter((c) => c[1] === 'badge')).toEqual([])
  })

  it('blinks the keyboard LED when the LED mode is on', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['C'] })
    useSettings.setState({
      display: { tray: true, overlay: false, flash: false, led: true, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
      led: { key: 'caps' },
    })
    await useAnswer.getState().run(false)
    expect(blinkAnswer).toHaveBeenCalledWith('C', 'caps')
  })

  it('dims the screen when the brightness mode is on', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['D'] })
    useSettings.setState({
      display: { tray: true, overlay: false, flash: false, led: false, brightness: true, flashMs: 800, badgeMs: 8000, textMs: 12000 },
    })
    await useAnswer.getState().run(false)
    expect(blinkBrightness).toHaveBeenCalledWith('D')
  })

  it('shows every answer in the overlay and tooltip but the first on LED/brightness', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['A', 'C'] })
    useSettings.setState({
      display: { tray: true, overlay: true, flash: false, led: true, brightness: true, flashMs: 800, badgeMs: 8000, textMs: 12000 },
      led: { key: 'scroll' },
    })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenCalledWith('A, C', 'badge', 8000)
    expect(setTrayAnswer).toHaveBeenCalledWith('A', 'A, C')
    expect(blinkAnswer).toHaveBeenCalledWith('A', 'scroll')
    expect(blinkBrightness).toHaveBeenCalledWith('A')
  })

  it('descriptive run uses the text panel only and records text history', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'text', text: '광합성입니다.' })
    useSettings.setState({
      display: { tray: true, overlay: true, flash: true, led: true, brightness: true, flashMs: 800, badgeMs: 8000, textMs: 12000 },
      provider: {
        preset: 'custom',
        baseUrl: 'https://x/v1',
        model: 'm',
        extraJson: '',
        answerType: 'text',
        paraphrase: true,
      },
    })
    await useAnswer.getState().run(false)
    expect(captureAndAnswer).toHaveBeenCalledWith(
      'custom',
      'https://x/v1',
      'm',
      '',
      'text',
      true,
      false,
      'auto',
      'normal',
    )
    expect(useAnswer.getState().mode).toEqual({ kind: 'text', text: '광합성입니다.' })
    expect(setTrayLoading).not.toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
    expect(blinkAnswer).not.toHaveBeenCalled()
    expect(blinkBrightness).not.toHaveBeenCalled()
    expect(showOverlay).toHaveBeenCalledWith('광합성입니다.', 'text', 12000)
    expect(useAnswer.getState().history[0]).toMatchObject({
      answers: [],
      text: '광합성입니다.',
    })
    await vi.advanceTimersByTimeAsync(30000)
    expect(useAnswer.getState().mode).toEqual({ kind: 'text', text: '광합성입니다.' })
    expect(hideOverlay).toHaveBeenCalled()
  })

  it('showLast redisplays a text history entry in the text panel', async () => {
    useAnswer.setState({ history: [{ ts: 1, answers: [], text: '저장된 설명' }] })
    await useAnswer.getState().showLast()
    expect(captureAndAnswer).not.toHaveBeenCalled()
    expect(useAnswer.getState().mode).toEqual({ kind: 'text', text: '저장된 설명' })
    expect(showOverlay).toHaveBeenCalledWith('저장된 설명', 'text', 12000)
    expect(setTrayAnswer).not.toHaveBeenCalled()
  })

  it('descriptive run skips tray loading and error presentation', async () => {
    vi.mocked(captureAndAnswer).mockRejectedValueOnce('http_401')
    useSettings.setState({
      display: { tray: true, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
      provider: { ...defaults.provider, answerType: 'text' },
    })
    await useAnswer.getState().run(false)
    expect(setTrayLoading).not.toHaveBeenCalled()
    expect(useAnswer.getState().mode).toEqual({ kind: 'error', code: 'http_401' })
  })

  it('keeps the ten newest answers, newest first', async () => {
    for (let i = 0; i < 11; i++) {
      vi.mocked(captureAndAnswer).mockResolvedValueOnce({ kind: 'choice', answers: [String(i)] })
    }
    for (let i = 0; i < 11; i++) await useAnswer.getState().run(false)
    const history = useAnswer.getState().history
    expect(history.map((h) => h.answers)).toEqual(
      Array.from({ length: 10 }, (_, i) => [String(10 - i)]),
    )
    expect(history.every((h) => typeof h.ts === 'number')).toBe(true)
  })

  it('showLast redisplays the newest answer without capture or AI', async () => {
    useSettings.setState({
      display: { tray: true, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
    })
    useAnswer.setState({ history: [{ ts: 1, answers: ['A', 'C'] }] })
    await useAnswer.getState().showLast()
    expect(captureAndAnswer).not.toHaveBeenCalled()
    expect(setTrayLoading).not.toHaveBeenCalled()
    expect(useAnswer.getState().mode).toEqual({ kind: 'answer', answers: ['A', 'C'] })
    expect(showOverlay).toHaveBeenCalledWith('A, C', 'badge', 8000)
    expect(setTrayAnswer).toHaveBeenCalledWith('A', 'A, C')
  })

  it('showLast does nothing without history', async () => {
    await useAnswer.getState().showLast()
    expect(useAnswer.getState().mode.kind).toBe('idle')
    expect(showOverlay).not.toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
  })

  it('meeting safe mode hides tray and overlay but keeps LED and brightness', async () => {
    vi.mocked(meetingActive).mockResolvedValue(true)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['C'] })
    useSettings.setState({
      display: { tray: true, overlay: true, flash: true, led: true, brightness: true, flashMs: 800, badgeMs: 8000, textMs: 12000 },
      stealth: { ...defaults.stealth, meetingSafe: true },
    })
    await useAnswer.getState().run(false)
    expect(setTrayLoading).not.toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
    expect(showOverlay).not.toHaveBeenCalled()
    expect(blinkAnswer).toHaveBeenCalledWith('C', 'scroll')
    expect(blinkBrightness).toHaveBeenCalledWith('C')
    expect(useAnswer.getState().mode).toEqual({ kind: 'answer', answers: ['C'] })
    expect(useAnswer.getState().history[0].answers).toEqual(['C'])
  })

  it('meeting safe mode shows nothing when LED and brightness are off', async () => {
    vi.mocked(meetingActive).mockResolvedValue(true)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({
      display: { tray: true, overlay: true, flash: true, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 },
      stealth: { ...defaults.stealth, meetingSafe: true },
    })
    await useAnswer.getState().run(false)
    expect(setTrayLoading).not.toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
    expect(showOverlay).not.toHaveBeenCalled()
    expect(blinkAnswer).not.toHaveBeenCalled()
    expect(blinkBrightness).not.toHaveBeenCalled()
    expect(useAnswer.getState().history[0].answers).toEqual(['B'])
  })

  it('meeting safe mode hides the descriptive overlay but records history', async () => {
    vi.mocked(meetingActive).mockResolvedValue(true)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'text', text: '설명' })
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true },
      provider: { ...defaults.provider, answerType: 'text' },
      stealth: { ...defaults.stealth, meetingSafe: true },
    })
    await useAnswer.getState().run(false)
    expect(showOverlay).not.toHaveBeenCalled()
    expect(useAnswer.getState().mode).toEqual({ kind: 'text', text: '설명' })
    expect(useAnswer.getState().history[0]).toMatchObject({ answers: [], text: '설명' })
  })

  it('meeting safe mode off shows the normal tray and overlay answer', async () => {
    vi.mocked(meetingActive).mockResolvedValue(true)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['D'] })
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true },
      stealth: { ...defaults.stealth, meetingSafe: false },
    })
    await useAnswer.getState().run(false)
    expect(setTrayLoading).toHaveBeenCalled()
    expect(setTrayAnswer).toHaveBeenCalledWith('D', 'D')
    expect(showOverlay).toHaveBeenCalledWith('D', 'badge', 8000)
  })

  it('shows the normal answer when no meeting is detected', async () => {
    vi.mocked(meetingActive).mockResolvedValue(false)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['A'] })
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true },
      stealth: { ...defaults.stealth, meetingSafe: true },
    })
    await useAnswer.getState().run(false)
    expect(setTrayAnswer).toHaveBeenCalledWith('A', 'A')
    expect(showOverlay).toHaveBeenCalledWith('A', 'badge', 8000)
  })

  it('showLast follows meeting safe mode', async () => {
    vi.mocked(meetingActive).mockResolvedValue(true)
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true, led: true },
      stealth: { ...defaults.stealth, meetingSafe: true },
    })
    useAnswer.setState({ history: [{ ts: 1, answers: ['A', 'C'] }] })
    await useAnswer.getState().showLast()
    expect(setTrayAnswer).not.toHaveBeenCalled()
    expect(showOverlay).not.toHaveBeenCalled()
    expect(blinkAnswer).toHaveBeenCalledWith('A', 'scroll')
    expect(useAnswer.getState().mode).toEqual({ kind: 'answer', answers: ['A', 'C'] })
  })

  it('panic during tray render does not show the stale overlay', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    let resolveTray: () => void = () => {}
    vi.mocked(setTrayAnswer).mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveTray = resolve }),
    )
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true },
    })
    const p = useAnswer.getState().run(false)
    await vi.advanceTimersByTimeAsync(0)
    useAnswer.getState().panicClear()
    resolveTray()
    await p
    expect(showOverlay).not.toHaveBeenCalled()
    expect(setTrayIdle).toHaveBeenCalled()
  })

  it('panic during showLast meeting check does not replay cleared history', async () => {
    let resolveMeeting: (value: boolean) => void = () => {}
    vi.mocked(meetingActive).mockImplementationOnce(
      () => new Promise<boolean>((resolve) => { resolveMeeting = resolve }),
    )
    useAnswer.setState({ history: [{ ts: 1, answers: ['A'] }] })
    const p = useAnswer.getState().showLast()
    useAnswer.getState().panicClear()
    resolveMeeting(true)
    await p
    expect(showOverlay).not.toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
  })

  it('a stale overlay continuation does not hide a newer answer', async () => {
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true, flash: false },
    })
    let resolveShow: () => void = () => {}
    vi.mocked(showOverlay).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveShow = resolve
        }),
    )
    vi.mocked(captureAndAnswer).mockResolvedValueOnce({ kind: 'choice', answers: ['B'] })
    const first = useAnswer.getState().run(false)
    await vi.advanceTimersByTimeAsync(0)

    useAnswer.getState().panicClear()
    vi.mocked(showOverlay).mockResolvedValue(undefined)
    vi.mocked(captureAndAnswer).mockResolvedValueOnce({ kind: 'choice', answers: ['C'] })
    const second = useAnswer.getState().run(false)
    await second

    vi.mocked(hideOverlay).mockClear()
    resolveShow()
    await first
    expect(hideOverlay).not.toHaveBeenCalled()
  })

  it('rechecks meeting safe mode after the AI request', async () => {
    vi.mocked(meetingActive).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['C'] })
    useSettings.setState({
      display: { ...defaults.display, tray: true, overlay: true },
      stealth: { ...defaults.stealth, meetingSafe: true },
    })
    await useAnswer.getState().run(false)
    expect(setTrayLoading).toHaveBeenCalled()
    expect(setTrayAnswer).not.toHaveBeenCalled()
    expect(showOverlay).not.toHaveBeenCalled()
    expect(setTrayIdle).toHaveBeenCalled()
    expect(useAnswer.getState().history[0].answers).toEqual(['C'])
  })

  it('keeps the flash duration and the badge duration separate', async () => {
    vi.mocked(meetingActive).mockResolvedValue(false)
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({
      display: { ...defaults.display, tray: false, overlay: true, flash: true, flashMs: 3000, badgeMs: 1000 },
    })
    await useAnswer.getState().run(false)
    expect(showOverlay).toHaveBeenNthCalledWith(1, 'B', 'flash', 3000)
    await vi.advanceTimersByTimeAsync(2999)
    expect(showOverlay).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(showOverlay).toHaveBeenNthCalledWith(2, 'B', 'badge', 1000)
    await vi.advanceTimersByTimeAsync(999)
    expect(useAnswer.getState().mode.kind).toBe('answer')
    await vi.advanceTimersByTimeAsync(1)
    expect(useAnswer.getState().mode.kind).toBe('idle')
  })

  it('a superseded run does not clear the running flag of the new run', async () => {
    let resolveCapture: (value: { kind: 'choice'; answers: string[] }) => void = () => {}
    vi.mocked(captureAndAnswer).mockImplementationOnce(
      () => new Promise((resolve) => { resolveCapture = resolve }),
    )
    const first = useAnswer.getState().run(true)
    await vi.advanceTimersByTimeAsync(1000)
    useAnswer.getState().panicClear()
    const second = useAnswer.getState().run(false)
    await vi.advanceTimersByTimeAsync(3000)
    await first
    expect(useAnswer.getState().running).toBe(true)
    resolveCapture({ kind: 'choice', answers: ['D'] })
    await second
    expect(useAnswer.getState().running).toBe(false)
  })

  it('does not record or persist history while storage is off', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    useSettings.setState({ storage: { history: false, errors: false } })
    await useAnswer.getState().run(false)
    expect(useAnswer.getState().history).toEqual([])
    expect(localStorage.getItem('cue-history')).toBeNull()
  })

  it('logs a clipboard failure instead of rejecting', async () => {
    vi.mocked(copyText).mockRejectedValueOnce('clipboard')
    useAnswer.setState({ history: [{ ts: 1, answers: ['B'] }] })
    await expect(useAnswer.getState().copyLast()).resolves.toBeUndefined()
    expect(useAnswer.getState().log[0]?.code).toBe('clipboard')
  })

  it('panicClear clears answer, history, log, stored keys and hides overlay', () => {
    useAnswer.setState({
      mode: { kind: 'answer', answers: ['B'] },
      running: true,
      history: [{ ts: 1, answers: ['B'] }],
      log: [{ ts: 1, code: 'parse' }],
    })
    expect(localStorage.getItem('cue-history')).not.toBeNull()
    expect(localStorage.getItem('cue-errors')).not.toBeNull()
    useAnswer.getState().panicClear()
    expect(useAnswer.getState().mode).toEqual({ kind: 'idle' })
    expect(useAnswer.getState().running).toBe(false)
    expect(useAnswer.getState().history).toEqual([])
    expect(useAnswer.getState().log).toEqual([])
    expect(localStorage.getItem('cue-history')).toBeNull()
    expect(localStorage.getItem('cue-errors')).toBeNull()
      expect(setTrayIdle).toHaveBeenCalled()
      expect(hideOverlay).toHaveBeenCalled()
      expect(cancelAnswer).toHaveBeenCalled()
      expect(clearClipboard).toHaveBeenCalled()
    })

    it('persists history and errors while storage is enabled', async () => {
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    await useAnswer.getState().run(false)
    await useAnswer.getState().logError('parse')
    expect(JSON.parse(localStorage.getItem('cue-history') ?? '[]')).toEqual([
      expect.objectContaining({ answers: ['B'] }),
    ])
    expect(JSON.parse(localStorage.getItem('cue-errors') ?? '[]')).toEqual([
      expect.objectContaining({ code: 'parse' }),
    ])
  })

  it('clears the stored key when storage is turned off', () => {
    useAnswer.setState({ history: [{ ts: 1, answers: ['B'] }], log: [{ ts: 1, code: 'parse' }] })
    expect(localStorage.getItem('cue-history')).not.toBeNull()
    useSettings.getState().setStorage({ history: false, errors: false })
    expect(localStorage.getItem('cue-history')).toBeNull()
    expect(localStorage.getItem('cue-errors')).toBeNull()
  })

  it('does not write while storage is off', async () => {
    useSettings.getState().setStorage({ history: false, errors: false })
    vi.mocked(captureAndAnswer).mockResolvedValue({ kind: 'choice', answers: ['B'] })
    await useAnswer.getState().run(false)
    await useAnswer.getState().logError('parse')
    expect(localStorage.getItem('cue-history')).toBeNull()
    expect(localStorage.getItem('cue-errors')).toBeNull()
  })

  it('clearHistory and clearErrors empty the arrays and stored keys', () => {
    useAnswer.setState({ history: [{ ts: 1, answers: ['B'] }], log: [{ ts: 1, code: 'parse' }] })
    useAnswer.getState().clearHistory()
    expect(useAnswer.getState().history).toEqual([])
    expect(localStorage.getItem('cue-history')).toBeNull()
    useAnswer.getState().clearErrors()
    expect(useAnswer.getState().log).toEqual([])
    expect(localStorage.getItem('cue-errors')).toBeNull()
  })

  it('keeps the twenty newest errors', async () => {
    for (let i = 0; i < 21; i++) await useAnswer.getState().logError(`e${i}`)
    const log = useAnswer.getState().log
    expect(log).toHaveLength(20)
    expect(log[0].code).toBe('e20')
    expect(log[19].code).toBe('e1')
  })
})
