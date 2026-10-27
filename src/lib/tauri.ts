import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { AnswerLanguage, AnswerLevel } from '../stores/settings'
import type { MouseButton } from './shortcutKeys'

export const isTauri = (): boolean => '__TAURI_INTERNALS__' in window

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return Promise.reject('network')
  return tauriInvoke<T>(cmd, args)
}

export const listenEvent = listen

export interface TrayIconPayload {
  rgba: number[]
  width: number
  height: number
  tooltip: string
}

export const setTrayIcons = (icons: TrayIconPayload[]) => invoke<void>('set_tray_icons', { icons })
export const setTrayVisible = (visible: boolean) => invoke<void>('set_tray_visible', { visible })
export const setTrayMenuLabels = (
  openText: string,
  helpText: string,
  lastText: string,
  copyText: string,
  clearText: string,
  quitText: string,
) =>
  invoke<void>('set_tray_menu_labels', {
    openText,
    helpText,
    lastText,
    copyText,
    clearText,
    quitText,
  })
export const copyText = (text: string) => invoke<void>('copy_text', { text })
export const cancelAnswer = () => invoke<void>('cancel_answer')
export const clearClipboard = () => invoke<void>('clear_clipboard')
export const setShortcut = (accelerator: string, click: boolean, button: MouseButton) =>
  invoke<void>('set_shortcut', { accelerator, click, button })
export const setPanicShortcut = (accelerator: string) =>
  invoke<void>('set_panic_shortcut', { accelerator })
export const setShortcutRecording = (recording: boolean) => invoke<void>('set_shortcut_recording', { recording })
export const shortcutInstalled = () => invoke<boolean>('shortcut_installed')
export const trayIconShown = () => invoke<boolean>('tray_icon_shown')
export const setHideFromTaskbar = (hidden: boolean) => invoke<void>('set_hide_from_taskbar', { hidden })
export const setContentProtection = (enabled: boolean) => invoke<void>('set_content_protection', { enabled })
export interface CaptureProtectionStatus {
  main: number
  overlay: number
}
export const captureProtectionStatus = () =>
  invoke<CaptureProtectionStatus>('capture_protection_status')
export const openTaskbarSettings = () => invoke<void>('open_taskbar_settings')
export const openExternal = (url: string) => invoke<void>('open_external', { url })
export const setApiKey = (preset: string, key: string) => invoke<void>('set_api_key', { preset, key })
export const hasApiKey = (preset: string) => invoke<boolean>('has_api_key', { preset })
export const clearApiKey = (preset: string) => invoke<void>('clear_api_key', { preset })
export const testConnection = (preset: string, baseUrl: string, model: string, extraJson: string) =>
  invoke<boolean>('test_connection', { preset, baseUrl, model, extraJson })
export const listModels = (preset: string, baseUrl: string) =>
  invoke<string[]>('list_models', { preset, baseUrl })
export type CaptureResult =
  | { kind: 'choice'; answers: string[] }
  | { kind: 'text'; text: string }

export const captureAndAnswer = (
  preset: string,
  baseUrl: string,
  model: string,
  extraJson: string,
  answerType: 'choice' | 'text' = 'choice',
  paraphrase = false,
  crop = false,
  language: AnswerLanguage = 'auto',
  level: AnswerLevel = 'normal',
) =>
  invoke<CaptureResult>('capture_and_answer', {
    preset,
    baseUrl,
    model,
    extraJson,
    answerType,
    paraphrase,
    crop,
    language,
    level,
  })
export const showOverlay = (answer: string, style: 'badge' | 'flash' | 'text', durationMs: number) =>
  invoke<void>('show_overlay', { answer, style, durationMs })
export const hideOverlay = () => invoke<void>('hide_overlay')
export const hideMain = () => invoke<void>('hide_main')
export const meetingActive = () => invoke<boolean>('meeting_active')
export const blinkAnswer = (answer: string, key: string) => invoke<void>('blink_answer', { answer, key })
export const blinkBrightness = (answer: string) => invoke<void>('blink_brightness', { answer })
export const setAutostart = (enabled: boolean) => invoke<void>('set_autostart', { enabled })
export const getAutostart = () => invoke<boolean>('get_autostart')
export const setGuard = (enabled: boolean) => invoke<void>('set_guard', { enabled })
export const repairGuard = () => invoke<void>('repair_guard')
export const guardEnabled = () => invoke<boolean>('guard_enabled')

export interface UpdateInfo {
  version: string
  notes: string | null
}

export interface UpdateProgress {
  downloaded: number
  total: number | null
}

export const checkUpdate = () => invoke<UpdateInfo | null>('check_update')
export const installUpdate = () => invoke<void>('install_update')
export const onUpdateProgress = (handler: (progress: UpdateProgress) => void) =>
  listenEvent<UpdateProgress>('update-progress', (event) => handler(event.payload))

export interface ProtectionStatus {
  elevated: boolean
  adminTasks: boolean
  guardTasks: boolean
  programMarker: boolean
  adminPrepareFailed: boolean
  serviceInstalled: boolean
  serviceRunning: boolean
}

export const protectionStatus = () => invoke<ProtectionStatus>('protection_status')
export const addDefenderExclusion = () => invoke<boolean>('add_defender_exclusion')
export const setAdminMode = (enabled: boolean) => invoke<void>('set_admin_mode', { enabled })
export const repairProtection = () => invoke<void>('repair_protection')
