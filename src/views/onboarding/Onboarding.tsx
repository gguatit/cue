import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import ShortcutRecorder from '../../components/ShortcutRecorder'
import { Button, Field, Group, Input, SectionTitle, Select } from '../../components/ui'
import { useT } from '../../i18n'
import { hasApiKey, openTaskbarSettings, setApiKey, trayIconShown } from '../../lib/tauri'
import { isLoopbackUrl } from '../../lib/localEndpoint'
import { PRESETS, useSettings } from '../../stores/settings'
import { useAnswer } from '../../stores/answer'
import { layoutSpring } from '../../lib/motion'

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
      <ol className="list-decimal space-y-2 pl-5 text-ink-2">
        <li>{t('Click the button below to open Taskbar settings.', '아래 버튼을 눌러 작업 표시줄 설정을 엽니다.')}</li>
        <li>{t('Open "Other system tray icons" and find Cue.', '"기타 시스템 트레이 아이콘"에서 Cue를 찾습니다.')}</li>
        <li>{t('Turn it on so the icon stays visible.', '아이콘이 항상 보이도록 켭니다.')}</li>
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void openTaskbarSettings().catch(() => {})}>
          {t('Open taskbar settings', '작업 표시줄 설정 열기')}
        </Button>
        <span className={shown ? 'text-success' : 'text-ink-3'}>
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
  const provider = useSettings((s) => s.provider)
  const setProvider = useSettings((s) => s.setProvider)
  const [step, setStep] = useState(0)
  const [keyWarn, setKeyWarn] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyState, setKeyState] = useState<'saved' | 'none' | 'unknown'>('none')
  const [keyStatus, setKeyStatus] = useState('')
  const keyId = useRef(0)

  const refreshKey = async (preset: string) => {
    const id = ++keyId.current
    try {
      const has = await hasApiKey(preset)
      if (id === keyId.current) setKeyState(has ? 'saved' : 'none')
    } catch {
      if (id === keyId.current) setKeyState('unknown')
    }
  }

  useEffect(() => {
    void refreshKey(provider.preset)
  }, [provider.preset])

  const done = () => setOnboarded(true)
  const next = async () => {
    if (step === 2) {
      const local = provider.preset === 'custom' && isLoopbackUrl(provider.baseUrl)
      const has =
        keyState === 'saved' ||
        (await hasApiKey(provider.preset).catch(() => true)) ||
        local
      if (!has) {
        setKeyWarn(true)
        return
      }
    }
    setKeyWarn(false)
    setStep((s) => s + 1)
  }

  const saveKey = async () => {
    if (!keyInput.trim()) return
    try {
      await setApiKey(provider.preset, keyInput.trim())
      setKeyInput('')
      setKeyState('saved')
      setKeyStatus(t('Saved', '저장됨'))
    } catch (error) {
      setKeyStatus(String(error))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-ink">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">Cue</span>
            <span className="text-xs text-ink-3">
              {step + 1} / {STEPS}
            </span>
          </div>
          <button
            className="text-xs text-ink-3 transition-colors hover:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={done}
          >
            {t('Skip', '건너뛰기')}
          </button>
        </div>
        <div className="flex gap-1.5 px-1">
          <LayoutGroup>
            {Array.from({ length: STEPS }, (_, i) => (
              <motion.span
                key={i}
                layout
                transition={layoutSpring}
                className={`h-1.5 rounded-full ${
                  i === step ? 'w-6 bg-accent' : i < step ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-surface-3'
                }`}
              />
            ))}
          </LayoutGroup>
        </div>
        <Group className="p-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6, transition: { duration: 0.12, ease: 'easeIn' } }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="space-y-4"
            >
          {step === 0 && (
            <>
              <SectionTitle>{t('Keep the tray icon visible', '트레이 아이콘을 항상 보이게')}</SectionTitle>
              <p className="text-sm text-ink-2">
                {t(
                  'Cue shows answers through a disguised tray icon by default. Keep it visible during setup.',
                  'Cue는 기본적으로 위장 트레이 아이콘으로 답을 표시합니다. 설정 중에는 아이콘이 보이게 유지하세요.',
                )}
              </p>
              <TrayGuide />
            </>
          )}
          {step === 1 && (
            <>
              <SectionTitle>{t('Choose your shortcut', '단축키 설정')}</SectionTitle>
              <p className="text-sm text-ink-2">
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
              <SectionTitle>{t('Connect an AI provider', 'AI 연결')}</SectionTitle>
              <Field label={t('Provider', '프로바이더')}>
                <Select
                  value={provider.preset}
                  onChange={(e) => {
                    const id = e.target.value
                    const preset = PRESETS[id]
                    setProvider({ preset: id, baseUrl: preset.baseUrl, model: preset.placeholder })
                    setKeyStatus('')
                  }}
                >
                  {Object.entries(PRESETS).map(([id, p]) => (
                    <option key={id} value={id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {provider.preset === 'custom' && (
                <Field label={t('Base URL', 'API 주소')}>
                  <Input
                    value={provider.baseUrl}
                    onChange={(e) => setProvider({ baseUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
              )}
              <Field label={t('Model', '모델')}>
                <Input
                  value={provider.model}
                  onChange={(e) => setProvider({ model: e.target.value })}
                  placeholder={PRESETS[provider.preset]?.placeholder}
                />
              </Field>
              <Field label={t('API key', 'API 키')}>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    className="flex-1"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={keyState === 'saved' ? t('Saved', '저장됨') : ''}
                  />
                  <Button variant="primary" disabled={!keyInput.trim()} onClick={() => void saveKey()}>
                    {t('Save', '저장')}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-ink-3">
                  {keyState === 'saved'
                    ? t('A key is saved for this provider.', '이 프로바이더의 키가 저장되어 있습니다.')
                    : keyState === 'none'
                      ? t(
                          'Leave the key empty only for a local loopback endpoint.',
                          '로컬 루프백 주소에서만 키를 비워 둘 수 있습니다.',
                        )
                      : t('Could not read the credential store.', '자격증명 저장소를 확인할 수 없습니다.')}
                </p>
              </Field>
              {keyStatus && <p className="text-sm text-ink-2">{keyStatus}</p>}
              {keyWarn && (
                <p className="text-sm text-amber-400">
                  {t('Save an API key before continuing.', '계속하려면 API 키를 저장하세요.')}
                </p>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <SectionTitle>{t('Ready', '준비 완료')}</SectionTitle>
              <div className="space-y-3 text-sm text-ink-2">
                <p>
                  {t(
                    'Hold the shortcut and click while pointing at any question. You can test with the sample question in Settings → Mode.',
                    '아무 문제 위에서 단축키를 누른 채 클릭하세요. 설정 → 모드의 예시 문제로 테스트할 수 있습니다.',
                  )}
                </p>
                <Button onClick={() => void useAnswer.getState().run(true)}>
                  {t('Show a test answer', '테스트 답 표시')}
                </Button>
              </div>
            </>
          )}
            </motion.div>
          </AnimatePresence>
        </Group>
        <div className="flex justify-between px-1">
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
