import type { ReactNode } from 'react'
import ShortcutRecorder from '../../components/ShortcutRecorder'
import MouseTriggerCard from '../../components/MouseTriggerCard'
import { Button, Group, GroupHeader, Select, Toggle } from '../../components/ui'
import { useT } from '../../i18n'
import { isModifierOnly, shortcutConflicts, type MouseButton } from '../../lib/shortcutKeys'
import { setFreeShortcut, setShortcut } from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import { useSettings } from '../../stores/settings'

function SettingsGroup({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Group>
      <GroupHeader>{title}</GroupHeader>
      <div className={`space-y-4 px-4 pb-4 ${className}`}>{children}</div>
    </Group>
  )
}

export default function InputTab() {
  const t = useT()
  const shortcut = useSettings((s) => s.shortcut)
  const free = useSettings((s) => s.free)
  const setFree = useSettings((s) => s.setFree)
  const panic = useSettings((s) => s.panic)
  const setShortcutClick = useSettings((s) => s.setShortcutClick)
  const setShortcutButton = useSettings((s) => s.setShortcutButton)

  const toggleClick = async (next: boolean) => {
    try {
      await setShortcut(shortcut.accelerator, next, shortcut.button)
      if (!next && free.enabled) {
        await setFreeShortcut(false, free.button)
        setFree({ enabled: false })
      }
      setShortcutClick(next)
    } catch {
      void useAnswer.getState().logError('shortcut')
    }
  }

  const changeButton = async (next: MouseButton) => {
    const nextFree =
      free.enabled && free.button === next
        ? next === 'right'
          ? 'left'
          : 'right'
        : free.button
    try {
      await setShortcut(shortcut.accelerator, shortcut.click, next)
      if (free.enabled && nextFree !== free.button) {
        await setFreeShortcut(true, nextFree)
      }
      setShortcutButton(next)
      if (nextFree !== free.button) setFree({ button: nextFree })
    } catch {
      setFree({ enabled: false })
      void useAnswer.getState().logError('shortcut')
    }
  }

  const toggleFree = async (next: boolean) => {
    const nextButton =
      free.button === shortcut.button
        ? shortcut.button === 'right'
          ? 'left'
          : 'right'
        : free.button
    try {
      await setFreeShortcut(next, nextButton)
      setFree({ enabled: next, button: nextButton })
    } catch {
      void useAnswer.getState().logError('shortcut')
    }
  }

  const changeFreeButton = async (next: MouseButton) => {
    if (next === shortcut.button) return
    try {
      await setFreeShortcut(free.enabled, next)
      setFree({ button: next })
    } catch {
      void useAnswer.getState().logError('shortcut')
    }
  }

  return (
    <div className="space-y-4">
      <SettingsGroup title={t('Answer shortcut', '답변 단축키')}>
        <div>
          <ShortcutRecorder />
          <div className="mt-3 space-y-2 border-t border-separator pt-3">
            <Toggle
              checked={shortcut.click}
              onChange={(v) => void toggleClick(v)}
              disabled={!isModifierOnly(shortcut.accelerator)}
              label={t('Require mouse click', '마우스 클릭 필요')}
              hint={
                isModifierOnly(shortcut.accelerator)
                  ? t(
                      'Hold the shortcut and click the selected button. The keys alone do nothing.',
                      '단축키를 누른 채 선택한 버튼을 클릭해야 발동합니다. 키만 누르면 아무 일도 일어나지 않습니다.',
                    )
                  : t(
                      'Only modifier-only shortcuts can require a click.',
                      '보조키만 쓰는 단축키에서만 클릭을 요구할 수 있습니다.',
                    )
              }
            />
            {shortcut.click && (
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="shrink-0 whitespace-nowrap text-sm text-ink">{t('Mouse button', '마우스 버튼')}</span>
                <Select
                  className="w-36"
                  aria-label={t('Mouse button', '마우스 버튼')}
                  value={shortcut.button}
                  onChange={(e) => void changeButton(e.target.value as MouseButton)}
                >
                  <option value="left">{t('Left', '좌클릭')}</option>
                  <option value="right">{t('Right', '우클릭')}</option>
                  <option value="middle">{t('Middle', '휠클릭')}</option>
                </Select>
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-medium text-ink">{t('Panic clear', '패닉 클리어')}</p>
          <ShortcutRecorder panic />
          <p className="mt-2 text-xs text-ink-3">
            {t(
              'Clears the answer, history and error log, then hides the Cue window.',
              '답변·기록·오류 로그를 지우고 Cue 창을 숨깁니다.',
            )}
          </p>
        </div>
        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <p className="font-medium">{t('Shortcut conflicts', '단축키 충돌')}</p>
          <p className="mt-1">
            {t(
              'Global shortcuts can conflict with other apps or Windows. Modifier-only combinations may be captured by another program first. The answer requires a click while the modifiers are held. Avoid sharing modifiers with the panic shortcut. If the target app runs as administrator, run Cue in administrator mode too.',
              '전역 단축키는 다른 앱이나 Windows 단축키와 충돌할 수 있습니다. 보조키만 쓰는 조합은 다른 프로그램이 먼저 가로챌 수 있습니다. 답변은 보조키를 누른 채 클릭해야 발동합니다. 패닉 단축키와 같은 보조키를 공유하지 마세요. 대상 앱이 관리자 권한이면 Cue도 관리자 모드로 실행하세요.',
            )}
          </p>
          {shortcutConflicts(shortcut, panic) && (
            <p className="mt-2 text-danger">
              {t(
                'The answer and panic shortcuts share modifiers. Turn on Require mouse click or choose a different panic shortcut.',
                '답변과 패닉 단축키가 같은 보조키를 공유합니다. 마우스 클릭 필요를 켜거나 패닉 단축키를 바꾸세요.',
              )}
            </p>
          )}
        </div>
      </SettingsGroup>
      <MouseTriggerCard />
      <SettingsGroup title={t('Free mode', '자유 모드')}>
        <div>
          <p className="mb-3 text-xs text-ink-3">
            {t(
              'Hold the answer shortcut and click this button to explain or help with whatever is under the cursor. It uses the same provider, model, and key.',
              '답변 단축키를 누른 채 이 버튼을 클릭하면 커서 아래의 내용을 설명하거나 도와줍니다. 같은 프로바이더·모델·키를 사용합니다.',
            )}
          </p>
          <Toggle
            checked={free.enabled}
            onChange={(v) => void toggleFree(v)}
            disabled={!shortcut.click || !isModifierOnly(shortcut.accelerator)}
            label={t('Enable free mode', '자유 모드 사용')}
            hint={
              !shortcut.click || !isModifierOnly(shortcut.accelerator)
                ? t(
                    'Free mode needs a modifier-only answer shortcut with mouse click enabled.',
                    '자유 모드는 보조키 전용 단축키와 마우스 클릭 필요 설정에서만 사용할 수 있습니다.',
                  )
                : t(
                    'Exam mode uses the answer button; free mode uses a different button.',
                    '시험 모드는 답변 버튼을, 자유 모드는 다른 버튼을 사용합니다.',
                  )
            }
          />
        </div>
        {free.enabled && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 whitespace-nowrap text-sm text-ink">{t('Free mode button', '자유 모드 버튼')}</span>
              <Select
                className="w-36"
                aria-label={t('Free mode button', '자유 모드 버튼')}
                value={free.button}
                onChange={(e) => void changeFreeButton(e.target.value as MouseButton)}
              >
                {(['left', 'right', 'middle'] as MouseButton[])
                  .filter((button) => button !== shortcut.button)
                  .map((button) => (
                    <option key={button} value={button}>
                      {button === 'left'
                        ? t('Left', '좌클릭')
                        : button === 'right'
                          ? t('Right', '우클릭')
                          : t('Middle', '휠클릭')}
                    </option>
                  ))}
              </Select>
            </div>
            <label className="block text-sm text-ink">
              {t('Instruction (optional)', '지시문 (선택)')}
              <textarea
                className="mt-2 w-full rounded-lg border border-separator bg-surface-2 px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:outline-none"
                rows={3}
                value={free.instruction}
                onChange={(e) => setFree({ instruction: e.target.value })}
                placeholder={t(
                  'Explain the content near the cursor. If it is code, explain what it does.',
                  '커서 근처의 내용을 설명하세요. 코드라면 하는 일을 설명하세요.',
                )}
              />
            </label>
            <Button onClick={() => void useAnswer.getState().run(true, 'free')}>
              {t('Test free mode', '자유 모드 테스트')}
            </Button>
          </>
        )}
      </SettingsGroup>
    </div>
  )
}
