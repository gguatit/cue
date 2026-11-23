import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Presence } from '../../components/Presence'
import { Button, Group, GroupHeader, Toggle } from '../../components/ui'
import { errorMessage, useT } from '../../i18n'
import {
  cueAirStatus,
  isTauri,
  setCueAir,
  showOverlay,
  type CueAirInfo,
} from '../../lib/tauri'
import { useSettings } from '../../stores/settings'

export default function ExperimentalTab() {
  const t = useT()
  const experimental = useSettings((s) => s.experimental)
  const setExperimental = useSettings((s) => s.setExperimental)
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState('')
  const [air, setAir] = useState<CueAirInfo | null>(null)
  const [airBusy, setAirBusy] = useState(false)
  const [airError, setAirError] = useState('')

  useEffect(() => {
    if (!isTauri() || !experimental.enabled || !experimental.cueAir) {
      setAir(null)
      return
    }
    let alive = true
    void cueAirStatus()
      .then(async (info) => {
        if (!alive) return
        if (info.enabled) {
          setAir(info)
          return
        }
        const started = await setCueAir(true)
        if (alive) setAir(started.enabled ? started : null)
      })
      .catch((error) => {
        if (alive) setAirError(errorMessage(String(error)))
      })
    return () => {
      alive = false
    }
  }, [experimental.enabled, experimental.cueAir])

  const changeMaster = (enabled: boolean) => {
    if (!enabled) {
      setExperimental({ enabled: false, cueAir: false })
      if (isTauri()) void setCueAir(false).catch(() => {})
      setAir(null)
      return
    }
    if (experimental.showWarnings) setConfirming(true)
    else setExperimental({ enabled: true })
  }

  const changeAir = async (enabled: boolean) => {
    if (!isTauri()) {
      setNotice(t('Run Cue Air inside the Cue app.', 'Cue 앱에서 Cue Air를 실행하세요.'))
      return
    }
    setAirBusy(true)
    setAirError('')
    try {
      const info = await setCueAir(enabled)
      setExperimental({ cueAir: enabled })
      setAir(info.enabled ? info : null)
    } catch (error) {
      setExperimental({ cueAir: false })
      setAir(null)
      setAirError(errorMessage(String(error)))
    } finally {
      setAirBusy(false)
    }
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
              'Draws only a box over the answer option when the model returns coordinates. It does not dim the screen or show answer text.',
              '모델이 좌표를 반환하면 정답 선택지 위에 박스만 그립니다. 화면을 어둡게 하거나 정답 텍스트를 표시하지 않습니다.',
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
        <GroupHeader>{t('Cue Air', 'Cue Air')}</GroupHeader>
        <div className="px-2 pb-1">
          <Toggle
            checked={experimental.cueAir}
            onChange={(next) => void changeAir(next)}
            disabled={!experimental.enabled || airBusy}
            label={t('Show answers on your phone', '휴대폰에 답변 표시')}
            hint={t(
              'Starts a temporary local server and shows a QR code. The phone must be on the same Wi-Fi. Only the latest answer is shared; no account, cloud, or history.',
              '임시 로컬 서버를 열고 QR 코드를 표시합니다. 휴대폰은 같은 Wi-Fi에 있어야 합니다. 최신 답변 하나만 공유하며 계정·클라우드·기록은 없습니다.',
            )}
          />
          <Presence show={Boolean(airError)} className="px-1 pb-2 text-[11px] text-danger">
            {airError}
          </Presence>
          {air?.enabled && (
            <div className="mt-2 flex flex-wrap items-start gap-3 rounded-[10px] border border-separator/70 bg-surface-2/50 p-3">
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(air.qrSvg)}`}
                alt={t('Cue Air QR code', 'Cue Air QR 코드')}
                className="h-[132px] w-[132px] shrink-0 rounded-md bg-white p-1.5"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[12px] font-medium text-ink">
                  {t('Scan with your phone camera', '휴대폰 카메라로 스캔하세요')}
                </p>
                <p className="break-all font-mono text-[10.5px] leading-relaxed text-ink-2">
                  {air.url}
                </p>
                <p className={`text-[10.5px] ${air.lan ? 'text-ink-3' : 'text-warning'}`}>
                  {air.lan
                    ? t(
                        'Local HTTP only. Do not share this QR code.',
                        '로컬 HTTP 전용입니다. 이 QR 코드를 공유하지 마세요.',
                      )
                    : t(
                        'No LAN address found. Connect this PC and phone to the same Wi-Fi.',
                        'LAN 주소를 찾지 못했습니다. PC와 휴대폰을 같은 Wi-Fi에 연결하세요.',
                      )}
                </p>
              </div>
            </div>
          )}
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
