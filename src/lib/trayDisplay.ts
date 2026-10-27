import { renderTrayIcon, answerGlyph, type TrayIconSpec } from '../components/trayIcon'
import { isTauri, setTrayIcons, setTrayVisible as setTrayVisibleCommand } from './tauri'
import { useSettings } from '../stores/settings'
import { t } from '../i18n'
import type { AnswerMode } from '../stores/answer'

const tooltip = () => t('System', '시스템')

async function apply(spec: TrayIconSpec): Promise<void> {
  if (!isTauri()) return
  await setTrayIcons([spec])
}

export async function setTrayVisible(visible: boolean): Promise<void> {
  if (!isTauri()) return
  await setTrayVisibleCommand(visible)
}

export async function setTrayIdle(): Promise<void> {
  const icons = useSettings.getState().trayIcons
  const glyph = icons.idle === 'char' ? 'battery-medium' : icons.idle
  await apply(await renderTrayIcon(null, glyph, tooltip()))
}

export async function setTrayLoading(): Promise<void> {
  await apply(await renderTrayIcon('…', null, tooltip()))
  await setTrayVisible(true)
}

export async function setTrayAnswer(label: string): Promise<void> {
  const g = answerGlyph(label, useSettings.getState().trayIcons)
  await apply(await renderTrayIcon(g.choice, g.glyph, tooltip()))
  await setTrayVisible(true)
}

export async function setTrayError(): Promise<void> {
  await apply(await renderTrayIcon('⚠', null, tooltip()))
  await setTrayVisible(true)
}

export async function setTrayForMode(mode: AnswerMode): Promise<void> {
  if (mode.kind === 'answer') {
    if (useSettings.getState().display.tray) {
      await setTrayAnswer(mode.answers[0] ?? '')
    }
  } else if (mode.kind === 'idle') {
    await setTrayIdle()
  }
}
