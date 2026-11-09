import { useState } from 'react'
import { CAMOUFLAGE_ICONS, useSettings, type DisplayMode, type LedKey } from '../../stores/settings'
import { useAnswer } from '../../stores/answer'
import { CAMOUFLAGE_COMPONENTS } from '../../components/camouflage'
import alyacIconUrl from '../../assets/alyac-icon.ico'
import { Button, Group, GroupHeader, Row, Select, Switch } from '../../components/ui'
import { blinkAnswer, blinkBrightness, showOverlay } from '../../lib/tauri'
import { setTrayForMode } from '../../lib/trayDisplay'
import { t, useT } from '../../i18n'

function Preview({ name, size = 16 }: { name: string; size?: number }) {
  if (name === 'char') return <span className="text-xs font-bold">{t('A', 'A')}</span>
  if (name === 'alyac') return <img src={alyacIconUrl} alt="" width={size} height={size} />
  const Icon = CAMOUFLAGE_COMPONENTS[name]
  return Icon ? <Icon size={size} /> : <span className="text-xs">?</span>
}

function IconPicker({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          title={o}
          aria-label={o}
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            value === o ? 'bg-accent text-black' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
          }`}
        >
          <Preview name={o} />
        </button>
      ))}
    </div>
  )
}

export default function ModeTab() {
  const t = useT()
  const display = useSettings((s) => s.display)
  const answerType = useSettings((s) => s.provider.answerType)
  const freeEnabled = useSettings((s) => s.free.enabled)
  const setDisplayMode = useSettings((s) => s.setDisplayMode)
  const setFlashMs = useSettings((s) => s.setFlashMs)
  const setBadgeMs = useSettings((s) => s.setBadgeMs)
  const setTextMs = useSettings((s) => s.setTextMs)
  const led = useSettings((s) => s.led)
  const setLedKey = useSettings((s) => s.setLedKey)
  const trayIcons = useSettings((s) => s.trayIcons)
  const setTrayIcon = useSettings((s) => s.setTrayIcon)
  const resetTrayIcons = useSettings((s) => s.resetTrayIcons)
  const [rejected, setRejected] = useState(false)

  const toggle = (mode: DisplayMode, next: boolean) => {
    const ok = setDisplayMode(mode, next)
    setRejected(!ok)
  }

  const refreshTray = () => {
    if (useAnswer.getState().meetingHidden) return
    void setTrayForMode(useAnswer.getState().mode).catch(() => {
      void useAnswer.getState().logError('tray')
    })
  }
  const testOverlay = (style: 'badge' | 'flash', ms: number) =>
    void showOverlay('B', style, ms).catch(
      (e) => void useAnswer.getState().logError(typeof e === 'string' && e ? e : 'parse'),
    )
  const pick = (slot: string, value: string) => {
    setTrayIcon(slot, value)
    refreshTray()
  }

  return (
    <div className="space-y-4">
      <Group>
        <GroupHeader>{t('Answer display', '답 표시')}</GroupHeader>
        {(
          [
            ['tray', t('Tray icon', '트레이 아이콘')],
            ['overlay', t('Overlay near cursor', '커서 옆 오버레이')],
            ['flash', t('Screen flash', '화면 플래시')],
            ['led', t('Keyboard LED', '키보드 LED')],
            ['brightness', t('Screen brightness', '화면 밝기')],
          ] as [DisplayMode, string][]
        ).map(([mode, label]) => (
          <Row key={mode}>
            <p className="min-w-0 flex-1 text-[13px] font-medium text-ink">{label}</p>
            <Switch
              checked={display[mode]}
              onChange={(v) => toggle(mode, v)}
              label={label}
            />
          </Row>
        ))}
        {rejected && (
          <p className="px-4 pb-3 text-sm text-warning">
            {t('At least one display mode must stay on.', '표시 방식은 최소 한 개가 켜져 있어야 합니다.')}
          </p>
        )}
        {display.flash && (
          <Row>
            <label htmlFor="flash-ms" className="w-full text-[13px] text-ink">
              <span className="flex items-center justify-between">
                <span>{t('Flash duration', '플래시 지속 시간')}</span>
                <span className="text-[12px] text-ink-3">{display.flashMs}ms</span>
              </span>
              <input
                id="flash-ms"
                type="range"
                className="mt-2 w-full accent-accent"
                min={300}
                max={3000}
                step={100}
                value={display.flashMs}
                onChange={(e) => setFlashMs(Number(e.target.value))}
              />
            </label>
          </Row>
        )}
        {display.overlay && (
          <Row>
            <label htmlFor="badge-ms" className="w-full text-[13px] text-ink">
              <span className="flex items-center justify-between">
                <span>{t('Badge duration', '배지 지속 시간')}</span>
                <span className="text-[12px] text-ink-3">{display.badgeMs}ms</span>
              </span>
              <input
                id="badge-ms"
                type="range"
                className="mt-2 w-full accent-accent"
                min={1000}
                max={15000}
                step={500}
                value={display.badgeMs}
                onChange={(e) => setBadgeMs(Number(e.target.value))}
              />
            </label>
          </Row>
        )}
        {(answerType === 'text' || freeEnabled) && (
          <Row>
            <label htmlFor="text-ms" className="w-full text-[13px] text-ink">
              <span className="flex items-center justify-between">
                <span>{t('Text duration', '텍스트 지속 시간')}</span>
                <span className="text-[12px] text-ink-3">{display.textMs}ms</span>
              </span>
              <input
                id="text-ms"
                type="range"
                className="mt-2 w-full accent-accent"
                min={2000}
                max={30000}
                step={1000}
                value={display.textMs}
                onChange={(e) => setTextMs(Number(e.target.value))}
              />
            </label>
          </Row>
        )}
        {display.led && (
          <Row>
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="led-key" className="text-[13px] text-ink">
                  {t('Keyboard LED', '키보드 LED')}
                </label>
                <Select
                  id="led-key"
                  className="w-32"
                  value={led.key}
                  onChange={(e) => setLedKey(e.target.value as LedKey)}
                >
                  <option value="scroll">{t('Scroll Lock', 'Scroll Lock')}</option>
                  <option value="caps">{t('Caps Lock', 'Caps Lock')}</option>
                  <option value="num">{t('Num Lock', 'Num Lock')}</option>
                </Select>
                <Button onClick={() => void blinkAnswer('C', led.key).catch(() => {})}>
                  {t('Test blink', '깜빡임 테스트')}
                </Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-3">
                {t(
                  'A–E blinks 1–5 times. Invisible to screen capture; pick a key your keyboard has an LED for.',
                  'A~E는 1~5회 깜빡입니다. 화면 캡처에 잡히지 않습니다. 키보드에 실제 LED가 있는 키를 고르세요.',
                )}
              </p>
            </div>
          </Row>
        )}
        {display.brightness && (
          <Row>
            <div className="w-full">
              <Button onClick={() => void blinkBrightness('C').catch(() => {})}>
                {t('Test brightness', '밝기 테스트')}
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-ink-3">
                {t(
                  'A–E dims the screen 1–5 times. Uses the monitor backlight when available, otherwise gamma dimming. Not captured by most screen recorders.',
                  'A~E는 화면을 1~5회 어둡게 했다가 밝힙니다. 모니터 밝기 제어를 우선 사용하고, 지원하지 않으면 감마 디밍을 씁니다. 대부분의 화면 녹화에 잡히지 않습니다.',
                )}
              </p>
            </div>
          </Row>
        )}
      </Group>
      <Group>
        <GroupHeader>{t('Tray camouflage icons', '트레이 위장 아이콘')}</GroupHeader>
        <div className="p-4">
        <p className="mb-3 text-xs text-ink-3">
          {t(
            'Pick an icon per answer, or show the answer letter.',
            '답마다 아이콘을 지정하거나 답 문자를 그대로 표시할 수 있습니다.',
          )}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-ink-2">
            <span className="w-24">{t('Idle', '평소')}</span>
            <IconPicker
              value={trayIcons.idle}
              options={CAMOUFLAGE_ICONS}
              onChange={(v) => pick('idle', v)}
            />
          </div>
          {['1', '2', '3', '4', '5'].map((slot, i) => (
            <div key={slot} className="flex items-center gap-2 text-xs text-ink-2">
              <span className="w-24">
                {t('Option', '보기')} {String.fromCharCode(65 + i)} ({i + 1})
              </span>
              <IconPicker
                value={trayIcons.byAnswer[slot] ?? 'char'}
                options={['char', ...CAMOUFLAGE_ICONS]}
                onChange={(v) => pick(slot, v)}
              />
            </div>
          ))}
        </div>
        <Button
          className="mt-3"
          onClick={() => {
            resetTrayIcons()
            refreshTray()
          }}
        >
          {t('Reset icons', '아이콘 초기화')}
        </Button>
        </div>
      </Group>
      <Group>
        <GroupHeader>{t('Test', '테스트')}</GroupHeader>
        <div className="space-y-2 p-4 text-sm">
          <p className="text-ink">
            {t(
              'Which built-in Python function prints text to the console?',
              '파이썬에서 콘솔에 텍스트를 출력하는 내장 함수는 무엇인가?',
            )}
          </p>
          <p className="text-ink-3">{t('A. echo  B. print', 'A. echo  B. print')}</p>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" onClick={() => void useAnswer.getState().run(true)}>
              {t('Run test answer', '테스트 답 표시')}
            </Button>
            <Button onClick={() => testOverlay('badge', display.badgeMs)}>
              {t('Test overlay', '오버레이 테스트')}
            </Button>
            <Button onClick={() => testOverlay('flash', display.flashMs)}>
              {t('Test flash', '플래시 테스트')}
            </Button>
          </div>
        </div>
      </Group>
    </div>
  )
}
