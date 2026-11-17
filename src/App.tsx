import { lazy, Suspense, useEffect } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isTauri } from './lib/tauri'
import { useSettings } from './stores/settings'

const OverlayView = lazy(() => import('./overlay/OverlayView'))
const Onboarding = lazy(() => import('./views/onboarding/Onboarding'))
const SettingsHome = lazy(() => import('./views/settings/SettingsHome'))

export default function App() {
  const onboarded = useSettings((s) => s.onboarded)
  const language = useSettings((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useEffect(() => {
    // The WebView context menu exposes browser actions and breaks the native feel.
    const blockContextMenu = (event: MouseEvent) => event.preventDefault()
    window.addEventListener('contextmenu', blockContextMenu)
    return () => window.removeEventListener('contextmenu', blockContextMenu)
  }, [])
  return isTauri() && getCurrentWebviewWindow().label === 'overlay' ? (
    <Suspense fallback={null}>
      <OverlayView />
    </Suspense>
  ) : (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg p-8" aria-hidden="true">
          <div className="h-6 w-32 rounded bg-surface-3/60" />
          <div className="mt-6 space-y-3">
            <div className="h-20 rounded-xl bg-surface" />
            <div className="h-20 rounded-xl bg-surface" />
          </div>
        </div>
      }
    >
      {onboarded ? <SettingsHome /> : <Onboarding />}
    </Suspense>
  )
}
