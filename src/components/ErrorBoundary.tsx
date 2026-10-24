import { Component, type ReactNode } from 'react'
import { t } from '../i18n'

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="p-6 text-sm text-zinc-300">
          {t(
            'Cue hit an unexpected error. Restart the app.',
            'Cue에 예상치 못한 오류가 발생했습니다. 앱을 다시 시작하세요.',
          )}
        </div>
      )
    }
    return this.props.children
  }
}
