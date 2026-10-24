import {
  hideMain,
  isTauri,
  listenEvent,
  setContentProtection,
  setGuard,
  setHideFromTaskbar,
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

export async function runStartup(): Promise<void> {
  if (!isTauri()) return
  // Listeners first: a later settings failure must not leave the hotkey dead.
  await listenEvent('panic', () => {
    useAnswer.getState().panicClear()
    void hideMain().catch(() => {})
  }).catch(() => {})
  await listenEvent<{ sample: boolean }>('trigger-answer', (e) => {
    void useAnswer.getState().run(e.payload.sample)
  }).catch(() => {})
  await listenEvent('show-last', () => {
    void useAnswer.getState().showLast()
  }).catch(() => {})
  await listenEvent('copy-last', () => {
    void useAnswer.getState().copyLast()
  }).catch(() => {})
  await listenEvent('tray-clear', () => {
    useAnswer.getState().clearTray()
  }).catch(() => {})
  await listenEvent('open-help', () => {
    useUi.getState().setTab('help')
  }).catch(() => {})

  const s = useSettings.getState()
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
  await setShortcut(s.shortcut.accelerator).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  await setPanicShortcut(s.panic.accelerator).catch(() =>
    useAnswer.getState().logError('shortcut'),
  )
  const installed = await shortcutInstalled().catch(() => true)
  if (!installed) await useAnswer.getState().logError('shortcut')
}
