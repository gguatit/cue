import { useEffect, useRef, useState } from 'react'
import { Button, Card, Input, SectionTitle, Select } from './ui'
import { useT } from '../i18n'
import {
  isTauri,
  onGestureTest,
  setGestureTest,
  setMouseTrigger,
  type GestureTestEvent,
} from '../lib/tauri'
import { useAnswer } from '../stores/answer'
import {
  defaults,
  useSettings,
  type MouseTrigger,
  type MouseTriggerMode,
} from '../stores/settings'

const HOLD_PRESETS = [500, 800, 1200]
const TOLERANCE_PRESETS = [4, 8, 12]
const SHAKE_PRESETS = [
  { label: ['Light', '가볍게'], reversals: 3, windowMs: 1200, minDelta: 10 },
  { label: ['Normal', '보통'], reversals: 4, windowMs: 900, minDelta: 12 },
  { label: ['Firm', '확실하게'], reversals: 5, windowMs: 700, minDelta: 14 },
] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const n = Number(draft)
    if (Number.isFinite(n)) onCommit(clamp(n, min, max))
    else setDraft(String(value))
  }
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <Input
        className="mt-1"
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

function MouseTriggerTest({ mouse }: { mouse: MouseTrigger }) {
  const t = useT()
  const supported = isTauri()
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'down' | 'success' | 'cancel'>('idle')
  const [progress, setProgress] = useState(0)
  const [reversals, setReversals] = useState(0)
  const [expired, setExpired] = useState(false)
  const mouseRef = useRef(mouse)
  mouseRef.current = mouse

  useEffect(() => {
    if (!active || !supported) return
    let cancelled = false
    let stop: (() => void) | undefined
    void (async () => {
      try {
        stop = await onGestureTest((event: GestureTestEvent) => {
          const cfg = mouseRef.current
          if (event.kind === 'hold') {
            if (event.phase === 'down') {
              setPhase('down')
              setProgress(0)
              setReversals(0)
            } else if (event.phase === 'trigger') {
              setPhase('success')
              setProgress(100)
              setActive(false)
            } else if (event.phase === 'cancel') {
              setPhase('cancel')
              setProgress(0)
            }
            return
          }
          if (event.phase === 'reversal') {
            setPhase('down')
            setReversals(event.reversals ?? 0)
          } else if (event.phase === 'trigger') {
            setPhase('success')
            setReversals(cfg.shakeReversals)
            setActive(false)
          }
        })
        if (cancelled) {
          stop?.()
          return
        }
        await setGestureTest(true)
      } catch {
        if (!cancelled) {
          setActive(false)
          void useAnswer.getState().logError('gesture')
        }
      }
    })()
    const timer = setTimeout(() => {
      if (cancelled) return
      setActive(false)
      setExpired(true)
      setPhase('idle')
    }, 15000)
    return () => {
      cancelled = true
      clearTimeout(timer)
      stop?.()
      void setGestureTest(false)
    }
  }, [active, supported])

  useEffect(() => {
    if (!active || phase !== 'down' || mouse.mode !== 'hold') return
    const started = performance.now()
    const id = setInterval(() => {
      setProgress(Math.min(100, ((performance.now() - started) / mouse.holdMs) * 100))
    }, 40)
    return () => clearInterval(id)
  }, [active, phase, mouse.mode, mouse.holdMs])

  const start = () => {
    setExpired(false)
    setPhase('idle')
    setProgress(0)
    setReversals(0)
    setActive(true)
  }

  return (
    <div className="mt-4 border-t border-zinc-800 pt-3">
      <div className="flex items-center gap-3">
        <Button
          variant={active ? 'danger' : 'primary'}
          disabled={!supported || mouse.mode === 'off'}
          onClick={() => (active ? setActive(false) : start())}
        >
          {active ? t('Stop test', '테스트 중지') : t('Test trigger', '트리거 테스트')}
        </Button>
        {active && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            {t('Test mode', '테스트 중')}
          </span>
        )}
      </div>
      {!supported && (
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'Run the test inside the Tauri app; this preview has no global mouse hook.',
            'Tauri 앱에서 테스트할 수 있습니다. 이 미리보기에는 전역 마우스 훅이 없습니다.',
          )}
        </p>
      )}
      {expired && (
        <p className="mt-2 text-xs text-amber-400">
          {t('Test time expired.', '테스트 시간이 끝났습니다.')}
        </p>
      )}
      {active && (
        <div className="mt-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-4 text-center">
          <p className="text-sm text-zinc-300">
            {mouse.mode === 'hold'
              ? t('Press and hold here.', '여기를 길게 눌러 보세요.')
              : t('Shake left and right here.', '여기서 좌우로 흔들어 보세요.')}
          </p>
          {mouse.mode === 'hold' && (
            <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {mouse.mode === 'shake' && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: mouse.shakeReversals }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < reversals ? 'bg-accent' : 'bg-zinc-700'
                  }`}
                />
              ))}
              <span className="ml-2 text-xs text-zinc-500">
                {reversals}/{mouse.shakeReversals}
              </span>
            </div>
          )}
          {phase === 'cancel' && (
            <p className="mt-2 text-xs text-amber-400">
              {t(
                'Cancelled by movement or a short press. Try again.',
                '움직임이나 짧은 입력으로 취소되었습니다. 다시 시도하세요.',
              )}
            </p>
          )}
        </div>
      )}
      {phase === 'success' && (
        <p className="mt-2 text-sm font-medium text-emerald-400">
          {t('Trigger detected.', '트리거를 감지했습니다.')}
        </p>
      )}
    </div>
  )
}

export default function MouseTriggerCard() {
  const t = useT()
  const mouse = useSettings((s) => s.mouse)
  const setMouse = useSettings((s) => s.setMouse)

  useEffect(() => {
    if (!isTauri()) return
    void setMouseTrigger(mouse).catch(() => useAnswer.getState().logError('gesture'))
  }, [mouse])

  const change = (patch: Partial<MouseTrigger>) => setMouse(patch)
  const mode = mouse.mode

  return (
    <Card className="space-y-4">
      <div>
        <SectionTitle>{t('Mouse-only trigger', '마우스 전용 트리거')}</SectionTitle>
        <p className="mb-3 text-xs text-zinc-500">
          {t(
            'Use a left-click gesture when keyboard shortcuts are blocked. The mouse-only trigger does not block clicks.',
            '키보드 단축키가 막힌 환경에서 왼쪽 클릭 제스처를 사용합니다. 마우스 전용 트리거는 클릭을 차단하지 않습니다.',
          )}
        </p>
        <Select
          aria-label={t('Mouse-only trigger', '마우스 전용 트리거')}
          value={mode}
          onChange={(e) => change({ mode: e.target.value as MouseTriggerMode })}
        >
          <option value="off">{t('Off', '사용 안 함')}</option>
          <option value="hold">{t('Press and hold', '길게 누르기')}</option>
          <option value="shake">{t('Shake', '흔들기')}</option>
        </Select>
      </div>

      {mode === 'hold' && (
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-300">{t('Hold duration', '길게 누르는 시간')}</span>
              <span className="font-mono text-xs text-accent">{mouse.holdMs}ms</span>
            </div>
            <input
              aria-label={t('Hold duration', '길게 누르는 시간')}
              type="range"
              className="w-full accent-amber-400"
              min={200}
              max={3000}
              step={50}
              value={mouse.holdMs}
              onChange={(e) => change({ holdMs: Number(e.target.value) })}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {HOLD_PRESETS.map((value) => (
                <Button
                  key={value}
                  variant={mouse.holdMs === value ? 'primary' : 'secondary'}
                  onClick={() => change({ holdMs: value })}
                >
                  {value === 500
                    ? t('Fast', '빠르게')
                    : value === 800
                      ? t('Normal', '보통')
                      : t('Slow', '느리게')}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-300">{t('Allowed movement', '허용 움직임')}</span>
              <span className="font-mono text-xs text-accent">{mouse.moveTolerance}px</span>
            </div>
            <input
              aria-label={t('Allowed movement', '허용 움직임')}
              type="range"
              className="w-full accent-amber-400"
              min={1}
              max={50}
              step={1}
              value={mouse.moveTolerance}
              onChange={(e) => change({ moveTolerance: Number(e.target.value) })}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOLERANCE_PRESETS.map((value) => (
                <Button
                  key={value}
                  variant={mouse.moveTolerance === value ? 'primary' : 'secondary'}
                  onClick={() => change({ moveTolerance: value })}
                >
                  {value === 4
                    ? t('Strict', '엄격')
                    : value === 8
                      ? t('Normal', '보통')
                      : t('Loose', '여유')}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'shake' && (
        <div>
          <p className="mb-2 text-sm text-zinc-300">{t('Shake strength', '흔들기 강도')}</p>
          <div className="flex flex-wrap gap-1.5">
            {SHAKE_PRESETS.map((preset) => {
              const selected =
                mouse.shakeReversals === preset.reversals &&
                mouse.shakeWindowMs === preset.windowMs &&
                mouse.shakeMinDelta === preset.minDelta
              return (
                <Button
                  key={preset.reversals}
                  variant={selected ? 'primary' : 'secondary'}
                  onClick={() =>
                    change({
                      shakeReversals: preset.reversals,
                      shakeWindowMs: preset.windowMs,
                      shakeMinDelta: preset.minDelta,
                    })
                  }
                >
                  {t(preset.label[0], preset.label[1])}
                </Button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {t(
              `Direction changes: ${mouse.shakeReversals} / ${(mouse.shakeWindowMs / 1000).toFixed(1)}s`,
              `방향 전환 ${mouse.shakeReversals}회 / ${(mouse.shakeWindowMs / 1000).toFixed(1)}초`,
            )}
          </p>
        </div>
      )}

      {mode !== 'off' && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <summary className="cursor-pointer text-sm text-zinc-300">
            {t('Advanced values', '고급 값')}
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {mode === 'hold' ? (
              <>
                <NumberField
                  label={t('Hold duration (ms)', '길게 누르는 시간 (ms)')}
                  value={mouse.holdMs}
                  min={200}
                  max={3000}
                  step={50}
                  onCommit={(holdMs) => change({ holdMs })}
                />
                <NumberField
                  label={t('Allowed movement (px)', '허용 움직임 (px)')}
                  value={mouse.moveTolerance}
                  min={1}
                  max={50}
                  step={1}
                  onCommit={(moveTolerance) => change({ moveTolerance })}
                />
                <NumberField
                  label={t('Cooldown after trigger (ms)', '발동 후 대기 (ms)')}
                  value={mouse.holdCooldownMs}
                  min={0}
                  max={5000}
                  step={50}
                  onCommit={(holdCooldownMs) => change({ holdCooldownMs })}
                />
              </>
            ) : (
              <>
                <NumberField
                  label={t('Direction changes', '방향 전환 횟수')}
                  value={mouse.shakeReversals}
                  min={2}
                  max={10}
                  step={1}
                  onCommit={(shakeReversals) => change({ shakeReversals })}
                />
                <NumberField
                  label={t('Recognition window (ms)', '판정 시간 (ms)')}
                  value={mouse.shakeWindowMs}
                  min={200}
                  max={3000}
                  step={50}
                  onCommit={(shakeWindowMs) => change({ shakeWindowMs })}
                />
                <NumberField
                  label={t('Minimum movement (px)', '최소 이동 (px)')}
                  value={mouse.shakeMinDelta}
                  min={2}
                  max={50}
                  step={1}
                  onCommit={(shakeMinDelta) => change({ shakeMinDelta })}
                />
                <NumberField
                  label={t('Cooldown after trigger (ms)', '발동 후 대기 (ms)')}
                  value={mouse.shakeCooldownMs}
                  min={0}
                  max={5000}
                  step={50}
                  onCommit={(shakeCooldownMs) => change({ shakeCooldownMs })}
                />
              </>
            )}
          </div>
          <Button
            className="mt-3"
            onClick={() => setMouse({ ...defaults.mouse, mode: mouse.mode })}
          >
            {t('Reset values', '기본값 복원')}
          </Button>
        </details>
      )}

      {mode !== 'off' && <MouseTriggerTest mouse={mouse} />}

      <div className="rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
        <p>
          {t(
            'Press and hold sends the click to the target app. Use it over the question text or an empty area, not over buttons.',
            '길게 누르기는 클릭이 대상 앱에 전달됩니다. 버튼 위가 아니라 문제 텍스트나 빈 영역에서 사용하세요.',
          )}
        </p>
        <p className="mt-1.5">
          {t(
            'A program that only blocks keyboard shortcuts may still allow this. A security driver that blocks global hooks can block it; no bypass is guaranteed.',
            '키보드 단축키만 막는 프로그램에는 동작할 수 있습니다. 전역 훅을 막는 보안 드라이버는 차단할 수 있으며 우회를 보장하지 않습니다.',
          )}
        </p>
      </div>
    </Card>
  )
}
