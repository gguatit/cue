import { useT } from '../i18n'
import { Button } from './ui'

export default function UpdateConfirmDialog({
  version,
  busy,
  onCancel,
  onConfirm,
}: {
  version: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useT()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-surface p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-confirm-title"
        aria-describedby="update-confirm-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="update-confirm-title" className="text-sm font-semibold text-zinc-100">
          {t('Install Cue update?', 'Cue 업데이트를 설치할까요?')}
        </h2>
        <p id="update-confirm-desc" className="mt-2 text-xs leading-relaxed text-zinc-400">
          {t(
            `Cue v${version} will be installed. The app closes and Windows may ask for administrator permission. Settings and history are kept.`,
            `Cue v${version} 버전을 설치합니다. 앱이 종료되고 Windows가 관리자 권한을 요청할 수 있습니다. 설정과 기록은 유지됩니다.`,
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" disabled={busy} onClick={onCancel}>
            {t('Cancel', '취소')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={onConfirm}
            autoFocus
          >
            {t('Install', '설치')}
          </Button>
        </div>
      </div>
    </div>
  )
}
