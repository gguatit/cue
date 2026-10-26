import { useEffect, useState } from 'react'
import ShortcutRecorder from '../../components/ShortcutRecorder'
import { Button } from '../../components/ui'
import { useT } from '../../i18n'
import { hasApiKey, openTaskbarSettings, trayIconShown } from '../../lib/tauri'
import { useSettings } from '../../stores/settings'
import { useAnswer } from '../../stores/answer'
import AiTab from '../settings/AiTab'

const STEPS = 4

function TrayGuide() {
  const t = useT()
  const [shown, setShown] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    const tick = () => {
      void trayIconShown()
        .then((v) => {
          if (!alive) return
          setShown(v)
          if (v) window.clearInterval(un)
        })
        .catch(() => alive && setShown(null))
    }
    const un = window.setInterval(tick, 1500)
    tick()
    return () => {
      alive = false
      window.clearInterval(un)
    }
  }, [])
  return (
    <div className="space-y-3 text-sm">
      <ol className="list-decimal space-y-2 pl-5 text-zinc-300">
        <li>{t('Click the button below to open Taskbar settings.', '아래 버튼을 눌러 작업 표시줄 설정을 엽니다.')}</li>
        <li>{t('Open "Other system tray icons" and find Cue.', '"기타 시스템 트레이 아이콘"에서 Cue를 찾습니다.')}</li>
        <li>{t('Turn it on so the icon stays visible.', '아이콘이 항상 보이도록 켭니다.')}</li>
      </ol>
      <div className="flex items-center gap-3">
        <Button onClick={() => void openTaskbarSettings().catch(() => {})}>
          {t('Open taskbar settings', '작업 표시줄 설정 열기')}
        </Button>
        <span className={shown ? 'text-emerald-400' : 'text-zinc-500'}>
          {shown === true
            ? `✓ ${t('Tray icon is visible', '트레이 아이콘이 보입니다')}`
            : shown === false
              ? `… ${t('Waiting for the tray icon', '트레이 아이콘 확인 중')}`
              : `? ${t('Cannot check the tray icon', '트레이 아이콘을 확인할 수 없습니다')}`}
        </span>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const t = useT()
  const setOnboarded = useSettings((s) => s.setOnboarded)
  const [step, setStep] = useState(0)
  const [keyWarn, setKeyWarn] = useState(false)

  const done = () => setOnboarded(true)
  const next = async () => {
    if (step === 2) {
      const has = await hasApiKey(useSettings.getState().provider.preset).catch(() => true)
      if (!has) {
        setKeyWarn(true)
        return
      }
    }
    setKeyWarn(false)
    setStep((s) => s + 1)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111113] p-6 text-zinc-100">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-surface p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            Cue{' '}
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {step + 1} / {STEPS}
            </span>
          </h1>
          <button
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            onClick={done}
          >
            {t('Skip', '건너뛰기')}
          </button>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-accent' : i < step ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>
        {step === 0 && (
          <>
            <h2 className="text-sm font-semibold">{t('Keep the tray icon visible', '트레이 아이콘을 항상 보이게')}</h2>
            <TrayGuide />
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold">{t('Choose your shortcut', '단축키 설정')}</h2>
            <p className="text-sm text-zinc-400">
              {t(
                'Point at a question, hold the shortcut and click the selected mouse button. The answer appears on the tray icon.',
                '문제 위에 포인터를 두고 단축키를 누른 채 선택한 마우스 버튼을 클릭하면 트레이 아이콘에 답이 나타납니다.',
              )}
            </p>
            <ShortcutRecorder />
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold">{t('Connect an AI provider', 'AI 연결')}</h2>
            <AiTab />
            {keyWarn && (
              <p className="text-sm text-amber-400">
                {t('Save an API key before continuing.', '계속하려면 API 키를 저장하세요.')}
              </p>
            )}
          </>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm text-zinc-300">
            <p>
              {t(
                'Ready. Hold the shortcut and click while pointing at any question. You can test with the sample question in Settings → Mode.',
                '준비됐습니다. 아무 문제 위에서 단축키를 누른 채 클릭하세요. 설정 → 모드의 예시 문제로 테스트할 수 있습니다.',
              )}
            </p>
            <Button onClick={() => void useAnswer.getState().run(true)}>
              {t('Show a test answer', '테스트 답 표시')}
            </Button>
          </div>
        )}
        <div className="flex justify-between">
          <Button
            disabled={step === 0}
            onClick={() => {
              setKeyWarn(false)
              setStep((s) => s - 1)
            }}
          >
            {t('Back', '이전')}
          </Button>
          {step < STEPS - 1 ? (
            <Button variant="primary" onClick={() => void next()}>
              {t('Next', '다음')}
            </Button>
          ) : (
            <Button variant="primary" onClick={done}>
              {t('Start', '시작')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
