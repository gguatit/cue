import { useEffect } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import OverlayView from './overlay/OverlayView'
import { isTauri } from './lib/tauri'
import { useSettings } from './stores/settings'
import Onboarding from './views/onboarding/Onboarding'
import SettingsHome from './views/settings/SettingsHome'

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
  if (isTauri() && getCurrentWebviewWindow().label === 'overlay') return <OverlayView />
  return onboarded ? <SettingsHome /> : <Onboarding />
}
