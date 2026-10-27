import { create } from 'zustand'
import {
  checkUpdate,
  installUpdate,
  isTauri,
  onUpdateProgress,
  type UpdateInfo,
} from '../lib/tauri'
import {
  progressPercent,
  shouldAutoCheck,
  UPDATE_CHECK_KEY,
} from '../lib/updates'
import { useSettings } from './settings'

interface UpdateState {
  checking: boolean
  installing: boolean
  available: UpdateInfo | null
  progress: number | null
  error: string
  checked: boolean
  check: (silent?: boolean) => Promise<void>
  install: () => Promise<void>
}

export const useUpdates = create<UpdateState>((set, get) => ({
  checking: false,
  installing: false,
  available: null,
  progress: null,
  error: '',
  checked: false,
  check: async (silent = false) => {
    if (get().installing) return
    if (!isTauri()) {
      if (!silent) set({ error: 'network' })
      return
    }
    set({ checking: true, error: '' })
    try {
      const available = await checkUpdate()
      set({ available, checked: true })
      localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now()))
    } catch (error) {
      if (!silent) set({ error: String(error) })
    } finally {
      set({ checking: false })
    }
  },
  install: async () => {
    if (!get().available || get().installing) return
    if (!isTauri()) {
      set({ error: 'network' })
      return
    }
    set({ installing: true, error: '', progress: null })
    let unlisten: (() => void) | undefined
    try {
      unlisten = await onUpdateProgress((progress) =>
        set({ progress: progressPercent(progress.downloaded, progress.total) }),
      )
      await installUpdate()
      set({ installing: false, available: null, progress: null })
    } catch (error) {
      set({ installing: false, error: String(error), progress: null })
    } finally {
      unlisten?.()
    }
  },
}))

export async function maybeCheckForUpdates(): Promise<void> {
  if (!isTauri()) return
  const raw = localStorage.getItem(UPDATE_CHECK_KEY)
  const lastCheck = raw === null ? null : Number(raw)
  const autoCheck = useSettings.getState().updates.autoCheck
  if (!shouldAutoCheck(autoCheck, Number.isFinite(lastCheck) ? lastCheck : null)) return
  await useUpdates.getState().check(true)
}
