import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Presence } from '../../components/Presence'
import { Button, Group, GroupHeader, Toggle } from '../../components/ui'
import { useT } from '../../i18n'
import { isTauri, showOverlay } from '../../lib/tauri'
import { useSettings } from '../../stores/settings'

export default function ExperimentalTab() {
  const t = useT()
  const experimental = useSettings((s) => s.experimental)
  const setExperimental = useSettings((s) => s.setExperimental)
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState('')

  const changeMaster = (enabled: boolean) => {
    if (!enabled) {
      setExperimental({ enabled: false })
      return
    }
    if (experimental.showWarnings) setConfirming(true)
    else setExperimental({ enabled: true })
  }

  const preview = async () => {
    if (!isTauri()) {
      setNotice(t('Run this preview inside the Cue app.', 'Cue 앱에서 미리보기를 실행하세요.'))
      return
    }
    setNotice('')
    try {
      await showOverlay('B', 'badge', 4000, undefined, undefined, false, {
        x: 0.18,
        y: 0.32,
        w: 0.64,
        h: 0.1,
      })
    } catch {
      setNotice(t('Could not show the preview.', '미리보기를 표시할 수 없습니다.'))
    }
  }

  return (
    <div className="space-y-4">
      {experimental.showWarnings ? (
        <div className="flex gap-2.5 rounded-[12px] border border-warning/20 bg-warning/10 p-3.5">
          <AlertTriangle
            size={17}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-warning"
          />
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-warning">
              {t('Experimental feature', '실험 기능입니다')}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
              {t(
                'These features are still being validated. They may change or disappear without notice, and answer display or capture protection may behave unexpectedly. Turn them off immediately if something goes wrong.',
                '아직 검증 중인 기능입니다. 예고 없이 변경되거나 제거될 수 있고, 답변 표시·캡처 보호가 예상과 다르게 동작할 수 있습니다. 문제가 생기면 즉시 끄세요.',
              )}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-[12px] border border-separator/70 bg-surface-2/60 p-3 text-[11.5px] leading-relaxed text-ink-3">
          {t(
            'Experimental warnings are off. Enable them below if you want a confirmation before turning features on.',
            '실험 경고가 꺼져 있습니다. 기능을 켜기 전 확인이 필요하면 아래에서 경고를 다시 켜세요.',
          )}
        </p>
      )}

      <Group>
        <GroupHeader>{t('Experimental features', '실험 기능')}</GroupHeader>
        <div className="px-2 pb-1">
          <Toggle
            checked={experimental.enabled}
            onChange={changeMaster}
            label={t('Enable experimental features', '실험 기능 사용')}
            hint={t(
              'Features here are being tested in real use before moving to the normal tabs.',
              '실사용으로 검증한 뒤 정식 탭으로 옮기는 기능입니다.',
            )}
          />
          <Toggle
            checked={experimental.predictive}
            onChange={(predictive) => setExperimental({ predictive })}
            disabled={!experimental.enabled}
            label={t('Pre-capture while resting', '정지 시 미리 캡처')}
            hint={t(
              'Captures the screen before you click to reduce capture delay. It does not send the image to AI until you trigger an answer.',
              '클릭 전에 화면을 미리 캡처해 캡처 지연을 줄입니다. 답변을 실행하기 전에는 AI로 이미지를 보내지 않습니다.',
            )}
          />
          <Toggle
            checked={experimental.highlight}
            onChange={(highlight) => setExperimental({ highlight })}
            disabled={!experimental.enabled}
            label={t('Highlight the answer option', '정답 위치 하이라이트')}
            hint={t(
              'Draws a box over the answer option when the model returns coordinates. Results vary by model; no box is shown when coordinates are missing.',
              '모델이 좌표를 반환하면 정답 선택지 위에 박스를 그립니다. 모델에 따라 표시되지 않을 수 있습니다.',
            )}
          />
          <div className="flex flex-wrap items-center gap-2 px-2 pb-2 pt-1">
            <Button
              variant="secondary"
              disabled={!experimental.enabled || !experimental.highlight}
              onClick={() => void preview()}
            >
              {t('Preview highlight', '하이라이트 미리보기')}
            </Button>
            <Presence show={Boolean(notice)} className="text-[11px] text-ink-3">
              {notice}
            </Presence>
          </div>
        </div>
      </Group>

      <Group>
        <GroupHeader>{t('Warnings', '경고')}</GroupHeader>
        <div className="px-2 pb-1">
          <Toggle
            checked={experimental.showWarnings}
            onChange={(showWarnings) => setExperimental({ showWarnings })}
            label={t('Show experimental warnings', '실험 경고 표시')}
            hint={t(
              'When off, turning on experimental features no longer asks for confirmation.',
              '끄면 실험 기능을 켤 때 확인 창을 표시하지 않습니다.',
            )}
          />
        </div>
      </Group>

      <AnimatePresence>
        {confirming && (
          <ConfirmDialog
            title={t('Enable experimental features?', '실험 기능을 켤까요?')}
            description={t(
              'These features are still being validated. They may change or disappear without notice, and answer display or capture protection may behave unexpectedly. Turn them off immediately if something goes wrong.',
              '아직 검증 중인 기능입니다. 예고 없이 변경되거나 제거될 수 있고, 답변 표시·캡처 보호가 예상과 다르게 동작할 수 있습니다. 문제가 생기면 즉시 끄세요.',
            )}
            confirmLabel={t('Enable', '켜기')}
            cancelLabel={t('Cancel', '취소')}
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false)
              setExperimental({ enabled: true })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
