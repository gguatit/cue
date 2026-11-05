import { useEffect, useState } from 'react'
import { Button, Group, GroupHeader, Row } from '../../components/ui'
import { useT } from '../../i18n'
import {
  captureProtectionStatus,
  guardEnabled,
  hasApiKey,
  isTauri,
  refreshInput,
  runtimeStatus,
  setContentProtection,
  setTrayVisible,
  testConnection,
} from '../../lib/tauri'
import { isLoopbackUrl } from '../../lib/localEndpoint'
import { useSettings } from '../../stores/settings'

type Check = 'ok' | 'warn' | 'fail' | 'unknown' | 'off'

function Status({ state }: { state: Check }) {
  const t = useT()
  const label =
    state === 'ok'
      ? t('Ready', '준비됨')
      : state === 'warn'
        ? t('Check', '확인 필요')
        : state === 'fail'
          ? t('Not ready', '준비 안 됨')
          : state === 'off'
            ? t('Off', '꺼짐')
            : t('Not checked', '확인 안 됨')
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
        state === 'ok'
          ? 'bg-success/10 text-success'
          : state === 'warn'
            ? 'bg-warning/10 text-warning'
            : state === 'fail'
              ? 'bg-danger/10 text-danger'
              : 'bg-surface-3 text-ink-3'
      }`}
    >
      {label}
    </span>
  )
}

function Detail({
  title,
  description,
  state,
}: {
  title: string
  description: string
  state: Check
}) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-ink-3">{description}</p>
      </div>
      <Status state={state} />
    </Row>
  )
}

export default function ExamReadiness() {
  const t = useT()
  const provider = useSettings((s) => s.provider)
  const stealth = useSettings((s) => s.stealth)
  const [key, setKey] = useState<Check>('unknown')
  const [model, setModel] = useState<Check>('unknown')
  const [capture, setCapture] = useState<Check>('unknown')
  const [input, setInput] = useState<Check>('unknown')
  const [tray, setTray] = useState<Check>('unknown')
  const [guard, setGuard] = useState<Check>('unknown')
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  const run = async (withConnection = false) => {
    if (!isTauri()) {
      setMessage(t('Run this check inside the Cue app.', 'Cue 앱에서 점검을 실행하세요.'))
      return
    }
    setChecking(true)
    setMessage('')
    const current = useSettings.getState()
    const loopback = current.provider.preset === 'custom' && isLoopbackUrl(current.provider.baseUrl)
    const modelReady = current.provider.model.trim().length > 0
    setModel(modelReady ? 'ok' : 'fail')
    try {
      const [savedKey, captureStatus, runtime, guardStatus] = await Promise.all([
        hasApiKey(current.provider.preset).catch(() => null),
        captureProtectionStatus().catch(() => null),
        runtimeStatus().catch(() => null),
        guardEnabled().catch(() => null),
      ])
      setKey(savedKey === true || loopback ? 'ok' : savedKey === null ? 'unknown' : 'fail')
      setCapture(
        !current.stealth.contentProtection
          ? 'warn'
          : !captureStatus
            ? 'unknown'
            : captureStatus.main === 0x11
              ? captureStatus.overlay === null || captureStatus.overlay === 0x11
                ? 'ok'
                : 'fail'
              : 'fail',
      )
      setInput(
        !runtime ? 'unknown' : runtime.keyboardHook && runtime.mouseHook ? 'ok' : 'fail',
      )
      setTray(!runtime ? 'unknown' : runtime.trayVisible ? 'ok' : 'warn')
      setGuard(
        !current.stealth.guard
          ? 'off'
          : guardStatus === true
            ? 'ok'
            : guardStatus === null
              ? 'unknown'
              : 'fail',
      )

      if (withConnection && modelReady) {
        try {
          const ok = await testConnection(
            current.provider.preset,
            current.provider.baseUrl,
            current.provider.model,
            current.provider.extraJson,
          )
          setMessage(
            ok
              ? t('Model connection works.', '모델 연결이 정상입니다.')
              : t('The model replied unexpectedly.', '모델 응답이 예상과 다릅니다.'),
          )
        } catch (error) {
          setMessage(t(`Connection failed: ${String(error)}`, `연결 실패: ${String(error)}`))
        }
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    void run(false)
    // Run once when the tab opens; every later check is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Group>
      <GroupHeader>{t('Before the exam', '시험 전 점검')}</GroupHeader>
      <Detail
        title={t('API key', 'API 키')}
        description={
          provider.preset === 'custom' && isLoopbackUrl(provider.baseUrl)
            ? t('Loopback endpoint · key optional', '루프백 주소 · 키 선택 사항')
            : t('Saved in Windows Credential Manager', 'Windows 자격증명 관리자에 저장됨')
        }
        state={key}
      />
      <Detail
        title={t('Model', '모델')}
        description={model === 'ok' ? provider.model : t('Enter a model first', '모델을 먼저 입력하세요')}
        state={model}
      />
      <Detail
        title={t('Capture protection', '캡처 보호')}
        description={
          !stealth.contentProtection
            ? t('Content protection is off', '콘텐츠 보호가 꺼져 있습니다')
            : capture === 'ok'
              ? t('Windows excludes Cue windows from capture', 'Windows가 Cue 창을 캡처에서 제외합니다')
              : t('Cue will hide the answer if protection fails', '보호가 실패하면 답변을 표시하지 않습니다')
        }
        state={capture}
      />
      <Detail
        title={t('Input hooks', '입력 훅')}
        description={t('Keyboard shortcut and mouse trigger', '키보드 단축키와 마우스 트리거')}
        state={input}
      />
      <Detail
        title={t('Tray', '트레이')}
        description={t('Needed to reopen the app quietly', '앱을 조용히 다시 열 때 필요합니다')}
        state={tray}
      />
      <Detail
        title={t('Survival guard', '생존 가드')}
        description={stealth.guard ? t('Enabled', '켜짐') : t('Optional and currently off', '선택 사항, 현재 꺼짐')}
        state={guard}
      />
      <div className="flex flex-wrap items-center gap-2 border-t border-separator/60 p-4">
        <Button disabled={checking} onClick={() => void run(false)}>
          {checking ? t('Checking…', '확인 중…') : t('Check all', '전체 점검')}
        </Button>
        <Button disabled={checking} onClick={() => void run(true)}>
          {t('Test model', '모델 연결 테스트')}
        </Button>
        {input === 'fail' && (
          <Button
            onClick={() => {
              void refreshInput()
                .then(() => run(false))
                .catch(() => setMessage(t('Could not reconnect input', '입력을 다시 연결하지 못했습니다')))
            }}
          >
            {t('Reconnect input', '입력 다시 연결')}
          </Button>
        )}
        {tray === 'warn' && (
          <Button
            onClick={() => {
              void setTrayVisible(true)
                .then(() => run(false))
                .catch(() => setMessage(t('Could not show the tray', '트레이를 표시하지 못했습니다')))
            }}
          >
            {t('Show tray', '트레이 표시')}
          </Button>
        )}
        {capture === 'fail' && stealth.contentProtection && (
          <Button
            onClick={() => {
              void setContentProtection(true)
                .then(() => run(false))
                .catch(() => setMessage(t('Could not reapply protection', '보호를 다시 적용하지 못했습니다')))
            }}
          >
            {t('Reapply protection', '보호 다시 적용')}
          </Button>
        )}
      </div>
      <p className="px-4 pb-3 text-[11px] leading-4 text-ink-3">
        {t(
          'Model test sends one built-in test image to the configured provider, not your screen.',
          '모델 연결 테스트는 화면이 아니라 내장 테스트 이미지 1장만 설정한 공급자로 전송합니다.',
        )}
      </p>
      {message && (
        <p role="status" aria-live="polite" className="px-4 pb-4 text-[11px] text-ink-3">
          {message}
        </p>
      )}
    </Group>
  )
}
