import { describe, expect, it } from 'vitest'
import { defaults, mergePersisted, mergeSettings, PRESETS, useSettings } from './settings'

describe('mergeSettings', () => {
  it('fills missing fields from defaults', () => {
    const merged = mergeSettings({ display: { tray: false, overlay: true } })
    expect(merged.display.tray).toBe(false)
    expect(merged.display.overlay).toBe(true)
    expect(merged.display.flashMs).toBe(defaults.display.flashMs)
    expect(merged.display.badgeMs).toBe(8000)
    expect(merged.display.textMs).toBe(12000)
    expect(merged.display.led).toBe(false)
    expect(merged.led.key).toBe('caps')
    expect(merged.stealth.skipTaskbar).toBe(true)
    expect(merged.stealth.guard).toBe(false)
    expect(merged.stealth.meetingSafe).toBe(true)
    expect(merged.trayIcons.byAnswer['1']).toBe('char')
    expect(merged.panic).toEqual(defaults.panic)
    expect(merged.provider.answerType).toBe('choice')
    expect(merged.provider.paraphrase).toBe(false)
    expect(merged.answer.language).toBe('auto')
    expect(merged.answer.level).toBe('normal')
    expect(merged.privacy.crop).toBe(false)
    expect(merged.storage).toEqual({ history: true, errors: true })
    expect(merged.updates.autoCheck).toBe(true)
  })

  it('repairs an all-off display and duplicate shortcuts', () => {
    expect(mergeSettings({ display: { tray: false } }).display.tray).toBe(true)
    const duplicate = mergeSettings({
      shortcut: { accelerator: 'Control+Alt+Shift+X', display: 'Ctrl + Alt + Shift + X' },
      panic: { accelerator: 'Control+Alt+Shift+X', display: 'Ctrl + Alt + Shift + X' },
    })
    expect(duplicate.shortcut.accelerator).not.toBe(duplicate.panic.accelerator)
  })

  it('defaults answer shortcuts to a left mouse click', () => {
    const merged = mergeSettings({})
    expect(merged.shortcut.click).toBe(true)
    expect(merged.shortcut.button).toBe('left')
  })

  it('turns click off for keyed answer shortcuts', () => {
    const merged = mergeSettings({
      shortcut: { accelerator: 'Control+Alt+Q', display: 'Ctrl + Alt + Q' },
    })
    expect(merged.shortcut.click).toBe(false)
  })

  it('keeps an explicit mouse button', () => {
    const merged = mergeSettings({
      shortcut: { accelerator: 'Control+Alt', display: 'Ctrl + Alt', click: false, button: 'right' },
      panic: { accelerator: 'Control+Shift+P', display: 'Ctrl + Shift + P' },
    })
    expect(merged.shortcut.click).toBe(false)
    expect(merged.shortcut.button).toBe('right')
  })

  it('auto-enables click for a modifier-only answer conflict', () => {
    const merged = mergeSettings({
      shortcut: { accelerator: 'Control+Alt', display: 'Ctrl + Alt', click: false },
      panic: { accelerator: 'Control+Alt+X', display: 'Ctrl + Alt + X' },
    })
    expect(merged.shortcut.click).toBe(true)
    expect(merged.panic.accelerator).toBe('Control+Alt+X')
  })

  it('defaults a missing click setting to the conflict-safe mode', () => {
    const merged = mergeSettings({
      shortcut: { accelerator: 'Control+Alt', display: 'Ctrl + Alt' },
      panic: { accelerator: 'Control+Alt+X', display: 'Ctrl + Alt + X' },
    })
    expect(merged.shortcut.click).toBe(true)
    expect(merged.panic.accelerator).toBe('Control+Alt+X')
  })

  it('merges stored storage preferences', () => {
    expect(defaults.storage).toEqual({ history: true, errors: true })
    const merged = mergeSettings({ storage: { history: false } })
    expect(merged.storage).toEqual({ history: false, errors: true })
    expect(mergeSettings({ storage: { errors: false } }).storage).toEqual({
      history: true,
      errors: false,
    })
  })

  it('merges stored display durations', () => {
    const merged = mergeSettings({ display: { badgeMs: 5000, textMs: 15000 } })
    expect(merged.display.badgeMs).toBe(5000)
    expect(merged.display.textMs).toBe(15000)
    expect(merged.display.flashMs).toBe(800)
  })

  it('merges stored descriptive answer settings', () => {
    const merged = mergeSettings({ provider: { answerType: 'text', paraphrase: true } })
    expect(merged.provider.answerType).toBe('text')
    expect(merged.provider.paraphrase).toBe(true)
    expect(merged.provider.preset).toBe(defaults.provider.preset)
    expect(merged.provider.baseUrl).toBe(defaults.provider.baseUrl)
  })

  it('pins known preset endpoints and keeps custom endpoints', () => {
    expect(
      mergeSettings({ provider: { preset: 'openai', baseUrl: 'https://evil.example/v1' } })
        .provider.baseUrl,
    ).toBe(PRESETS.openai.baseUrl)
    expect(
      mergeSettings({ provider: { preset: 'custom', baseUrl: 'http://localhost:8000/v1' } })
        .provider.baseUrl,
    ).toBe('http://localhost:8000/v1')
  })

  it('merges stored answer language and level', () => {
    const merged = mergeSettings({ answer: { language: 'en', level: 'detailed' } })
    expect(merged.answer.language).toBe('en')
    expect(merged.answer.level).toBe('detailed')
  })

  it('merges a stored cursor crop setting', () => {
    const merged = mergeSettings({ privacy: { crop: true } })
    expect(merged.privacy.crop).toBe(true)
    expect(mergeSettings({}).privacy.crop).toBe(false)
  })

  it('merges a stored survival guard setting', () => {
    const merged = mergeSettings({ stealth: { guard: true } })
    expect(merged.stealth.guard).toBe(true)
    expect(merged.stealth.contentProtection).toBe(true)
    expect(merged.stealth.skipTaskbar).toBe(true)
    expect(merged.stealth.meetingSafe).toBe(true)
  })

  it('merges a stored administrator mode setting', () => {
    expect(defaults.stealth.admin).toBe(false)
    const merged = mergeSettings({ stealth: { admin: true } })
    expect(merged.stealth.admin).toBe(true)
    expect(merged.stealth.guard).toBe(false)
    expect(merged.stealth.contentProtection).toBe(true)
  })

  it('merges a stored meeting safe mode setting', () => {
    expect(defaults.stealth.meetingSafe).toBe(true)
    const merged = mergeSettings({ stealth: { meetingSafe: false } })
    expect(merged.stealth.meetingSafe).toBe(false)
    expect(merged.stealth.contentProtection).toBe(true)
  })

  it('merges a stored panic shortcut', () => {
    const merged = mergeSettings({
      panic: { accelerator: 'Control+Alt+P', display: 'Ctrl + Alt + P' },
    })
    expect(merged.panic.accelerator).toBe('Control+Alt+P')
    expect(merged.panic.display).toBe('Ctrl + Alt + P')
  })

  it('merges the update auto-check setting', () => {
    expect(defaults.updates.autoCheck).toBe(true)
    expect(mergeSettings({ updates: { autoCheck: false } }).updates.autoCheck).toBe(false)
    expect(mergeSettings({ updates: { autoCheck: 'x' } }).updates.autoCheck).toBe(true)
  })

  it('drops unknown keys instead of persisting them', () => {
    const merged = mergeSettings({ apiKey: 'secret', setProvider: 'boom', extra: 1 })
    expect('apiKey' in merged).toBe(false)
    expect('setProvider' in merged).toBe(false)
    expect('extra' in merged).toBe(false)
  })

  it('clamps and validates imported values', () => {
    const merged = mergeSettings({
      display: { flashMs: 999999, badgeMs: -1, textMs: 'x' },
      provider: { preset: 'nope', answerType: 'weird' },
      language: 'fr',
      led: { key: 'bad' },
    })
    expect(merged.display.flashMs).toBe(3000)
    expect(merged.display.badgeMs).toBe(1000)
    expect(merged.display.textMs).toBe(12000)
    expect(merged.provider.preset).toBe('opencode')
    expect(merged.provider.baseUrl).toBe(PRESETS.opencode.baseUrl)
    expect(merged.provider.answerType).toBe('choice')
    expect(merged.language).toBe('ko')
    expect(merged.led.key).toBe('caps')
  })

  it('keeps an explicit Scroll Lock LED choice', () => {
    expect(mergeSettings({ led: { key: 'scroll' } }).led.key).toBe('scroll')
  })

  it('keeps actions when persisting state', () => {
    const current = useSettings.getState()
    const next = mergePersisted({ display: { tray: true } }, current)
    expect(typeof next.setProvider).toBe('function')
    expect(next.display.flashMs).toBe(800)
  })
})

describe('setShortcut options', () => {
  it('clears the click requirement for keyed shortcuts', () => {
    useSettings.setState({ shortcut: { ...defaults.shortcut, click: true } })
    useSettings.getState().setShortcut('Control+Alt+Q', 'Ctrl + Alt + Q')
    expect(useSettings.getState().shortcut.click).toBe(false)
  })

  it('stores the click requirement and mouse button', () => {
    useSettings.setState({ shortcut: { ...defaults.shortcut, click: true, button: 'left' } })
    useSettings.getState().setShortcutButton('right')
    useSettings.getState().setShortcutClick(false)
    expect(useSettings.getState().shortcut.button).toBe('right')
    expect(useSettings.getState().shortcut.click).toBe(false)
  })
})

describe('setPanicShortcut', () => {
  it('stores the accelerator and display text', () => {
    useSettings.getState().setPanicShortcut('Control+Shift+P', 'Ctrl + Shift + P')
    expect(useSettings.getState().panic).toEqual({
      accelerator: 'Control+Shift+P',
      display: 'Ctrl + Shift + P',
    })
  })
})

describe('answer and privacy setters', () => {
  it('stores answer options and the cursor crop flag', () => {
    useSettings.setState({
      answer: structuredClone(defaults.answer),
      privacy: structuredClone(defaults.privacy),
    })
    useSettings.getState().setAnswer({ language: 'ko', level: 'concise' })
    useSettings.getState().setPrivacy({ crop: true })
    expect(useSettings.getState().answer).toEqual({ language: 'ko', level: 'concise' })
    expect(useSettings.getState().privacy).toEqual({ crop: true })
  })
})

describe('setUpdates', () => {
  it('stores the auto-check preference', () => {
    useSettings.setState({ updates: { autoCheck: true } })
    useSettings.getState().setUpdates({ autoCheck: false })
    expect(useSettings.getState().updates).toEqual({ autoCheck: false })
  })
})

describe('setStorage', () => {
  it('stores history and error log preferences', () => {
    useSettings.setState({ storage: structuredClone(defaults.storage) })
    useSettings.getState().setStorage({ history: false })
    expect(useSettings.getState().storage).toEqual({ history: false, errors: true })
    useSettings.getState().setStorage({ errors: false })
    expect(useSettings.getState().storage).toEqual({ history: false, errors: false })
  })
})

describe('display duration setters', () => {
  it('stores badge and text durations without touching flash', () => {
    useSettings.setState({ display: structuredClone(defaults.display) })
    useSettings.getState().setBadgeMs(6000)
    useSettings.getState().setTextMs(20000)
    expect(useSettings.getState().display.badgeMs).toBe(6000)
    expect(useSettings.getState().display.textMs).toBe(20000)
    expect(useSettings.getState().display.flashMs).toBe(800)
  })
})

describe('setTrayIcon', () => {
  it('updates the idle icon without touching answer slots', () => {
    useSettings.setState({ trayIcons: { idle: 'battery-medium', byAnswer: { '1': 'char' } } })
    useSettings.getState().setTrayIcon('idle', 'wifi')
    expect(useSettings.getState().trayIcons).toEqual({ idle: 'wifi', byAnswer: { '1': 'char' } })
  })
  it('updates an answer slot', () => {
    useSettings.setState({ trayIcons: { idle: 'battery-medium', byAnswer: { '1': 'char' } } })
    useSettings.getState().setTrayIcon('1', 'clock')
    expect(useSettings.getState().trayIcons).toEqual({ idle: 'battery-medium', byAnswer: { '1': 'clock' } })
  })
})

describe('setDisplayMode', () => {
  it('rejects turning off the last enabled mode', () => {
    useSettings.setState({ display: { tray: true, overlay: false, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    expect(useSettings.getState().setDisplayMode('tray', false)).toBe(false)
    expect(useSettings.getState().display.tray).toBe(true)
  })
  it('allows turning off when another mode is still on', () => {
    useSettings.setState({ display: { tray: true, overlay: true, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    expect(useSettings.getState().setDisplayMode('tray', false)).toBe(true)
    expect(useSettings.getState().display.tray).toBe(false)
  })
  it('allows turning a mode on', () => {
    useSettings.setState({ display: { tray: true, overlay: false, flash: false, led: false, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    expect(useSettings.getState().setDisplayMode('flash', true)).toBe(true)
    expect(useSettings.getState().display.flash).toBe(true)
  })
  it('counts the LED mode as a display mode', () => {
    useSettings.setState({ display: { tray: false, overlay: false, flash: false, led: true, brightness: false, flashMs: 800, badgeMs: 8000, textMs: 12000 } })
    expect(useSettings.getState().setDisplayMode('led', false)).toBe(false)
    expect(useSettings.getState().display.led).toBe(true)
  })
})

describe('consensus and free mode settings', () => {
  it('defaults consensus off and free mode off', () => {
    const merged = mergeSettings({})
    expect(merged.provider.consensus).toBe(false)
    expect(merged.provider.verifyModel).toBe('')
    expect(merged.free).toEqual({ enabled: false, button: 'right', instruction: '' })
  })

  it('merges consensus and free mode settings', () => {
    const merged = mergeSettings({
      provider: { consensus: true, verifyModel: 'verify-model' },
      free: { enabled: true, button: 'middle', instruction: 'Explain this code' },
    })
    expect(merged.provider.consensus).toBe(true)
    expect(merged.provider.verifyModel).toBe('verify-model')
    expect(merged.free).toEqual({
      enabled: true,
      button: 'middle',
      instruction: 'Explain this code',
    })
  })

  it('disables free mode when its button matches the answer button', () => {
    const merged = mergeSettings({
      shortcut: { accelerator: 'Control+Alt', display: 'Ctrl + Alt', click: true, button: 'right' },
      free: { enabled: true, button: 'right' },
    })
    expect(merged.free.enabled).toBe(false)
  })

  it('disables free mode for keyed shortcuts', () => {
    const merged = mergeSettings({
      shortcut: { accelerator: 'Control+Alt+Q', display: 'Ctrl + Alt + Q', click: true, button: 'left' },
      free: { enabled: true, button: 'right' },
    })
    expect(merged.free.enabled).toBe(false)
  })
})
