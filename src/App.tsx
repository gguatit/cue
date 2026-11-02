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
  if (isTauri() && getCurrentWebviewWindow().label === 'overlay') {
    return (
      <Suspense fallback={null}>
        <OverlayView />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111113]" />}>
      {onboarded ? <SettingsHome /> : <Onboarding />}
    </Suspense>
  )
}
