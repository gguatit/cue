import React from 'react'
import ReactDOM from 'react-dom/client'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { startAppearanceSync } from './lib/appearance'
import { runStartup } from './lib/startup'
import { isTauri, showOverlay } from './lib/tauri'
import { startMeetingWatch } from './stores/answer'
import { maybeCheckForUpdates } from './stores/updates'

const overlayView = isTauri() && getCurrentWebviewWindow().label === 'overlay'
if (overlayView) document.documentElement.dataset.view = 'overlay'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

if (!overlayView) {
  startAppearanceSync()
  void runStartup()
  if (isTauri()) {
    startMeetingWatch()
    setTimeout(() => void maybeCheckForUpdates(), 5000)
  }
}

if (import.meta.env.DEV) {
  void import('./lib/trayDisplay').then((m) => {
    ;(window as unknown as Record<string, unknown>).__cueTest = {
      loading: m.setTrayLoading,
      answer: m.setTrayAnswer,
      error: m.setTrayError,
      idle: m.setTrayIdle,
      overlay: (a: string) => showOverlay(a, 'badge', 8000),
      flash: (a: string) => showOverlay(a, 'flash', 800),
    }
  })
}
