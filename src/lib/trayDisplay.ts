import { renderTrayIcon, answerGlyph, type TrayIconSpec } from '../components/trayIcon'
import { isTauri, setTrayIcons } from './tauri'
import { useSettings } from '../stores/settings'
import { t } from '../i18n'
import type { AnswerMode } from '../stores/answer'

async function apply(spec: TrayIconSpec): Promise<void> {
  if (!isTauri()) return
  await setTrayIcons([spec])
}

export async function setTrayIdle(): Promise<void> {
  const icons = useSettings.getState().trayIcons
  const glyph = icons.idle === 'char' ? 'battery-medium' : icons.idle
  await apply(await renderTrayIcon(null, glyph, 'Cue'))
}

export async function setTrayLoading(): Promise<void> {
  await apply(await renderTrayIcon('…', null, t('Cue — Thinking…', 'Cue — 생각 중…')))
}

export async function setTrayAnswer(label: string, tooltip = label): Promise<void> {
  const g = answerGlyph(label, useSettings.getState().trayIcons)
  await apply(await renderTrayIcon(g.choice, g.glyph, `Cue — ${tooltip}`))
}

export async function setTrayError(): Promise<void> {
  await apply(await renderTrayIcon('⚠', null, t('Cue — Check activity for details', 'Cue — 활동 내역을 확인하세요')))
}

export async function setTrayForMode(mode: AnswerMode): Promise<void> {
  if (mode.kind === 'answer') {
    if (useSettings.getState().display.tray) {
      await setTrayAnswer(mode.answers[0] ?? '', mode.answers.join(', '))
    }
  } else if (mode.kind === 'idle') {
    await setTrayIdle()
  }
}
