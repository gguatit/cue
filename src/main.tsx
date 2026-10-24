import React from 'react'
import ReactDOM from 'react-dom/client'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { runStartup } from './lib/startup'
import { isTauri, showOverlay } from './lib/tauri'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

if (!isTauri() || getCurrentWebviewWindow().label !== 'overlay') void runStartup()

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
