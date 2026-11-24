import {
  hideMain,
  isTauri,
  listenEvent,
  setContentProtection,
  setCueAir,
  setFreeShortcut,
  setGuard,
  setHideFromTaskbar,
  setMouseTrigger,
  setOverlayPrewarm,
  setPanicShortcut,
  setPredictive,
  setShortcut,
  setTrayMenuLabels,
  quitApp,
  shortcutInstalled,
} from './tauri'
import { trayMenuLabels } from '../i18n'
import { setTrayIdle } from './trayDisplay'
import { isBlurGuarded } from './blurGuard'
import { useAnswer } from '../stores/answer'
import { useSettings } from '../stores/settings'
import { useUi } from '../stores/ui'

export async function applyTrayMenuLabels(): Promise<void> {
  const l = trayMenuLabels()
  await setTrayMenuLabels(l.open, l.help, l.last, l.copy, l.clear, l.quit).catch(() => {})
}

function wantsOverlayPrewarm(s: ReturnType<typeof useSettings.getState>): boolean {
  return s.display.overlay || s.display.flash || s.provider.answerType === 'text' || s.free.enabled
}

export async function runStartup(): Promise<void> {
  if (!isTauri()) return
  // Listeners first: a later settings failure must not leave the hotkey dead.
  await listenEvent('panic', () => {
    useAnswer.getState().panicClear()
    void hideMain().catch(() => {})
  }).catch(() => {})
  await Promise.all([
    listenEvent<{ sample: boolean; mode?: 'exam' | 'free' }>('trigger-answer', (e) => {
      void useAnswer.getState().run(e.payload.sample, e.payload.mode)
    }).catch(() => {}),
    listenEvent('show-last', () => {
      void useAnswer.getState().showLast()
    }).catch(() => {}),
    listenEvent('copy-last', () => {
      void useAnswer.getState().copyLast()
    }).catch(() => {}),
    listenEvent('tray-clear', () => {
      useAnswer.getState().clearTray()
    }).catch(() => {}),
    listenEvent('open-help', () => {
      useUi.getState().setTab('info')
    }).catch(() => {}),
    listenEvent('main-shown', () => {
      useAnswer.setState({ panicHidden: false })
    }).catch(() => {}),
    listenEvent('main-blurred', () => {
      if (isBlurGuarded() || !useSettings.getState().stealth.hideOnBlur) return
      void hideMain().catch(() => {})
    }).catch(() => {}),
    listenEvent('quit-requested', () => {
      void useAnswer
        .getState()
        .clearForQuit()
        .catch(() => {})
        .then(() => quitApp().catch(() => {}))
    }).catch(() => {}),
  ])

  const s = useSettings.getState()
  const peripheral = (async () => {
    await applyTrayMenuLabels()
    await setTrayIdle().catch(() => useAnswer.getState().logError('tray'))
    await setContentProtection(s.stealth.contentProtection).catch(() =>
      useAnswer.getState().logError('stealth'),
    )
    await setHideFromTaskbar(s.stealth.skipTaskbar).catch(() =>
      useAnswer.getState().logError('stealth'),
    )
    if (s.stealth.guard) {
      // Guard repair spawns `sc`/`schtasks`; let the window paint first.
      setTimeout(() => {
        void setGuard(true).catch(() => useAnswer.getState().logError('guard'))
      }, 2000)
    }
  })()
  // Shortcut registration stays ordered: each call validates against the others.
  await setShortcut(s.shortcut.accelerator, s.shortcut.click, s.shortcut.button).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  await setFreeShortcut(s.free.enabled, s.free.button).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  await setMouseTrigger(s.mouse).catch(() => useAnswer.getState().logError('gesture'))
  await setPredictive(s.experimental.enabled && s.experimental.predictive).catch(() =>
    useAnswer.getState().logError('gesture'),
  )
  await setCueAir(s.experimental.enabled && s.experimental.cueAir).catch(() =>
    useAnswer.getState().logError('air'),
  )
  await setOverlayPrewarm(wantsOverlayPrewarm(s)).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  await setPanicShortcut(s.panic.accelerator).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  await peripheral
  const installed = await shortcutInstalled().catch(() => true)
  if (!installed) await useAnswer.getState().logError('shortcut')
}

useSettings.subscribe((state, prev) => {
  if (!isTauri()) return
  const next = wantsOverlayPrewarm(state)
  if (next !== wantsOverlayPrewarm(prev)) {
    void setOverlayPrewarm(next).catch(() => {})
  }
  const predictive = state.experimental.enabled && state.experimental.predictive
  const prevPredictive = prev.experimental.enabled && prev.experimental.predictive
  if (predictive !== prevPredictive) void setPredictive(predictive).catch(() => {})
  const cueAir = state.experimental.enabled && state.experimental.cueAir
  const prevCueAir = prev.experimental.enabled && prev.experimental.cueAir
  if (cueAir !== prevCueAir) void setCueAir(cueAir).catch(() => {})
})
