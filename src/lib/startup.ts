import {
  hideMain,
  isTauri,
  listenEvent,
  setContentProtection,
  setFreeShortcut,
  setGuard,
  setHideFromTaskbar,
  setOverlayPrewarm,
  setPanicShortcut,
  setShortcut,
  setTrayMenuLabels,
  shortcutInstalled,
} from './tauri'
import { trayMenuLabels } from '../i18n'
import { setTrayIdle } from './trayDisplay'
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
      useUi.getState().setTab('help')
    }).catch(() => {}),
    listenEvent('main-shown', () => {
      useAnswer.setState({ panicHidden: false })
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
      await setGuard(true).catch(() => useAnswer.getState().logError('guard'))
    }
  })()
  // Shortcut registration stays ordered: each call validates against the others.
  await setShortcut(s.shortcut.accelerator, s.shortcut.click, s.shortcut.button).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  await setFreeShortcut(s.free.enabled, s.free.button).catch(() =>
    useAnswer.getState().logError('shortcut'),
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
  if (next === wantsOverlayPrewarm(prev)) return
  void setOverlayPrewarm(next).catch(() => {})
})
