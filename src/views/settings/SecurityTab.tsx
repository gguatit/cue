import { useEffect, useState } from 'react'
import { Button, Card, SectionTitle, Toggle } from '../../components/ui'
import { useT } from '../../i18n'
import {
  addDefenderExclusion,
  captureProtectionStatus,
  defenderExclusionStatus,
  guardEnabled,
  openTaskbarSettings,
  protectionStatus,
  repairGuard,
  repairProtection,
  setAdminMode,
  setContentProtection,
  setGuard,
  setHideFromTaskbar,
  type CaptureProtectionStatus,
  type DefenderExclusionStatus,
  type ProtectionStatus,
} from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import { useSettings } from '../../stores/settings'

export default function SecurityTab() {
  const t = useT()
  const meetingHidden = useAnswer((s) => s.meetingHidden)
  const stealth = useSettings((s) => s.stealth)
  const setStealth = useSettings((s) => s.setStealth)
  const privacy = useSettings((s) => s.privacy)
  const setPrivacy = useSettings((s) => s.setPrivacy)
  const [guardStatus, setGuardStatus] = useState<boolean | null>(null)
  const [protection, setProtection] = useState<ProtectionStatus | null>(null)
  const [capture, setCapture] = useState<CaptureProtectionStatus | null>(null)
  const [defenderBusy, setDefenderBusy] = useState(false)
  const [defenderMessage, setDefenderMessage] = useState('')
  const [defenderStatus, setDefenderStatus] = useState<DefenderExclusionStatus | null>(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [restartNeeded, setRestartNeeded] = useState(false)

  const refreshGuard = async () => {
    try {
      const on = await guardEnabled()
      setGuardStatus(on)
      if (on !== useSettings.getState().stealth.guard) setStealth({ guard: on })
    } catch {
      setGuardStatus(null)
    }
  }

  const refreshProtection = async () => {
    try {
      const s = await protectionStatus()
      setProtection(s)
      if (s.elevated !== useSettings.getState().stealth.admin) setStealth({ admin: s.elevated })
    } catch {
      setProtection(null)
    }
  }

  const refreshCapture = async () => {
    try {
      setCapture(await captureProtectionStatus())
    } catch {
      setCapture(null)
    }
  }

  const refreshDefender = async () => {
    try {
      setDefenderStatus(await defenderExclusionStatus())
    } catch {
      setDefenderStatus({
        available: false,
        complete: false,
        pathsPresent: 0,
        pathsTotal: 0,
        processesPresent: 0,
        processesTotal: 0,
      })
    }
  }

  useEffect(() => {
    void refreshGuard()
    void refreshProtection()
    void refreshDefender()
  }, [])

  useEffect(() => {
    void refreshCapture()
  }, [stealth.contentProtection])

  const toggleAdmin = async (on: boolean) => {
    if (on) {
      setRestartNeeded(false)
      setAdminMessage('')
      setStealth({ admin: true })
      try {
        await setAdminMode(true)
      } catch (e) {
        setStealth({ admin: false })
        const code = String(e)
        void useAnswer.getState().logError(code === 'admin_copy' ? 'admin_copy' : 'admin')
        setAdminMessage(
          code === 'admin_copy'
            ? t(
                'The protected administrator copy is missing. Run the Cue installer again.',
                '관리자 모드용 보호 복사본이 없습니다. Cue 설치 프로그램을 다시 실행하세요.',
              )
            : t('Could not change administrator mode.', '관리자 모드를 변경하지 못했습니다.'),
        )
      }
      return
    }
    setAdminMessage('')
    await apply({ admin: false }, () => setAdminMode(false), 'admin')
    if (!useSettings.getState().stealth.admin) setRestartNeeded(true)
  }

  const addDefender = async () => {
    if (defenderStatus?.complete) {
      setDefenderMessage(
        t(
          'Already added to Windows Defender.',
          '이미 Windows Defender 예외에 추가되어 있습니다.',
        ),
      )
      return
    }
    setDefenderBusy(true)
    try {
      const result = await addDefenderExclusion()
      if (result === 'cancelled') {
        setDefenderMessage(
          t(
            'Defender exclusion was not added.',
            'Defender 예외가 추가되지 않았습니다.',
          ),
        )
      } else {
        setDefenderStatus((current) => ({
          available: true,
          complete: true,
          pathsPresent: current?.pathsTotal ?? 0,
          pathsTotal: current?.pathsTotal ?? 0,
          processesPresent: current?.processesTotal ?? 0,
          processesTotal: current?.processesTotal ?? 0,
        }))
        setDefenderMessage(
          result === 'alreadyAdded'
            ? t(
                'Already added to Windows Defender.',
                '이미 Windows Defender 예외에 추가되어 있습니다.',
              )
            : t('Defender exclusion added.', 'Defender 예외를 추가했습니다.'),
        )
      }
    } catch {
      void useAnswer.getState().logError('defender')
      setDefenderMessage(
        t(
          'Could not add the Defender exclusion.',
          'Defender 예외를 추가하지 못했습니다.',
        ),
      )
      await refreshDefender()
    } finally {
      setDefenderBusy(false)
    }
  }

  let adminLabel = t('Checking…', '확인 중…')
  let adminTone = 'bg-zinc-800 text-zinc-500'
  if (protection) {
    if (protection.elevated) {
      adminLabel = t('Configured', '설정됨')
      adminTone = 'bg-emerald-500/15 text-emerald-400'
    } else if (stealth.admin) {
      adminLabel = t('Restart required', '재시작 필요')
      adminTone = 'bg-amber-500/15 text-amber-400'
    } else {
      adminLabel = t('Not configured', '설정 안 됨')
      adminTone = 'bg-zinc-800 text-zinc-400'
    }
  }

  let defenderLabel = t('Checking…', '확인 중…')
  let defenderTone = 'bg-zinc-800 text-zinc-500'
  if (defenderStatus) {
    if (!defenderStatus.available) {
      defenderLabel = t('Admin permission required', '확인하려면 관리자 권한 필요')
    } else if (defenderStatus.complete) {
      defenderLabel = t('Added', '추가됨')
      defenderTone = 'bg-emerald-500/10 text-emerald-400'
    } else if (defenderStatus.pathsPresent > 0 || defenderStatus.processesPresent > 0) {
      defenderLabel = t('Partially added', '일부 추가됨')
      defenderTone = 'bg-amber-500/10 text-amber-400'
    } else {
      defenderLabel = t('Not added', '추가되지 않음')
    }
  }

  const repairAll = async () => {
    if (protection?.adminPrepareFailed) {
      await toggleAdmin(true)
      return
    }
    try {
      await repairProtection()
    } catch {
      void useAnswer.getState().logError('guard')
    }
    await refreshProtection()
    await refreshGuard()
  }

  const chip = (on: boolean | null, onText: string) => (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        on === null
          ? 'bg-zinc-800 text-zinc-400'
          : on
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-zinc-800 text-zinc-400'
      }`}
    >
      {on === null ? t('Unknown', '알 수 없음') : on ? onText : t('Off', '꺼짐')}
    </span>
  )

  const repair = async () => {
    try {
      await repairGuard()
    } catch {
      void useAnswer.getState().logError('guard')
    }
    await refreshGuard()
  }

  const apply = async (
    patch: Partial<typeof stealth>,
    call: () => Promise<void>,
    code = 'stealth',
  ) => {
    try {
      await call()
      setStealth(patch)
    } catch {
      void useAnswer.getState().logError(code)
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <Card>
        <SectionTitle>{t('Window', '창')}</SectionTitle>
        <Toggle
          checked={stealth.skipTaskbar}
          onChange={(v) => void apply({ skipTaskbar: v }, () => setHideFromTaskbar(v))}
          label={t('Hide from taskbar', '작업표시줄에서 숨기기')}
        />
      </Card>
      <Card>
        <SectionTitle>{t('Screen capture protection', '화면 캡처 보호')}</SectionTitle>
        <Toggle
          checked={stealth.contentProtection}
          onChange={(v) => void apply({ contentProtection: v }, () => setContentProtection(v))}
          label={t('Exclude Cue windows from screen capture', 'Cue 창을 화면 캡처에서 제외')}
        />
        <p
          className={`mt-2 text-xs ${
            capture && capture.main === 0 && stealth.contentProtection
              ? 'text-amber-400'
              : 'text-zinc-500'
          }`}
        >
          {capture
            ? capture.main === 0x11 && capture.overlay === 0x11
              ? t(
                  'Both Cue windows are excluded from screen capture.',
                  'Cue 창 두 개가 화면 캡처에서 제외됩니다.',
                )
              : capture.main === 0x01 && capture.overlay === 0x01
                ? t(
                    'Windows 10 before 2004: Cue windows appear blank in captures.',
                    'Windows 10 2004 이전: 캡처에서 Cue 창이 빈 창으로 보입니다.',
                  )
                : capture.main === 0 && capture.overlay === 0
                  ? t('Screen capture protection is off.', '화면 캡처 보호가 꺼져 있습니다.')
                  : t(
                      'Screen capture protection is only partially applied.',
                      '화면 캡처 보호가 일부만 적용되었습니다.',
                    )
            : t('Status unavailable', '상태를 확인할 수 없습니다')}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {t(
            'Windows 10 2004 and later remove the windows from captures. Older versions show them as blank, and a photograph of the screen is never blocked.',
            'Windows 10 2004 이상은 창이 캡처에서 완전히 사라집니다. 이전 버전은 빈 창으로 보이며, 화면을 카메라로 촬영하는 것은 막지 못합니다.',
          )}
        </p>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>{t('Meeting safe mode', '회의 안전 모드')}</SectionTitle>
          {meetingHidden && (
            <span className="mb-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
              {t('Meeting detected', '회의 감지됨')}
            </span>
          )}
        </div>
        <Toggle
          checked={stealth.meetingSafe}
          onChange={(v) => setStealth({ meetingSafe: v })}
          label={t('Meeting safe mode', '회의 안전 모드')}
        />
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'When a meeting or screen-share app is detected, Cue hides the tray icon, overlay and flash, and uses only the keyboard LED and screen brightness. Detection checks running meeting/screen-share processes and window titles, so it is a heuristic and may miss some meetings or hide answers during unrelated activity. If LED and brightness are off, no answer is shown. Answer history is still recorded.',
            '회의나 화면 공유 앱이 감지되면 Cue는 트레이 아이콘, 오버레이, 플래시를 숨기고 키보드 LED와 화면 밝기만 사용합니다. 실행 중인 회의·화면 공유 프로세스와 창 제목을 확인하는 휴리스틱이므로 일부 회의를 놓치거나 무관한 작업 중 답변을 숨길 수 있습니다. LED와 밝기가 모두 꺼져 있으면 답변이 표시되지 않습니다. 답변 기록은 그대로 저장됩니다.',
          )}
        </p>
      </Card>
      <Card>
        <SectionTitle>{t('Cursor crop', '커서 영역 자르기')}</SectionTitle>
        <Toggle
          checked={privacy.crop}
          onChange={(v) => setPrivacy({ crop: v })}
          label={t('Send only the area around the cursor', '커서 주변 영역만 전송')}
        />
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'Cue sends a 1600×1000 pixel region centered on the pointer instead of the whole display. The crop happens before the image leaves your device.',
            'Cue는 화면 전체 대신 포인터를 중심으로 한 1600×1000 픽셀 영역만 전송합니다. 이미지가 기기를 떠나기 전에 잘립니다.',
          )}
        </p>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>{t('Maximum protection', '최대 보호')}</SectionTitle>
          <span className={`mb-3 rounded-full px-2 py-0.5 text-xs font-medium ${adminTone}`}>
            {adminLabel}
          </span>
        </div>
        <Toggle
          checked={stealth.admin}
          onChange={(v) => void toggleAdmin(v)}
          label={t('Run as administrator', '관리자 권한으로 실행')}
        />
        {restartNeeded && (
          <p className="mt-2 text-xs text-amber-400">
            {t(
              'Restart Cue to finish leaving administrator mode.',
              '관리자 모드를 완전히 종료하려면 Cue를 다시 시작하세요.',
            )}
          </p>
        )}
        {adminMessage && <p className="mt-2 text-xs text-amber-400">{adminMessage}</p>}
        {protection?.adminPrepareFailed && (
          <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
            {t(
              'The installer could not refresh administrator protection. Press Repair protection. If it still fails, reinstall Cue.',
              '설치 프로그램이 관리자 보호를 갱신하지 못했습니다. 보호 복구를 누르세요. 계속 실패하면 Cue를 다시 설치하세요.',
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {chip(protection?.elevated ?? null, t('Elevated', '관리자'))}
          {chip(protection?.adminTasks ?? null, t('Autostart task', '자동 시작 작업'))}
          {!protection?.serviceInstalled && chip(protection?.guardTasks ?? null, t('Guard tasks', '보호 작업'))}
          {chip(protection?.programMarker ?? null, t('Shared marker', '공용 마커'))}
          {chip(protection?.serviceInstalled ?? null, t('Watchdog service', '워치독 서비스'))}
          {chip(protection?.serviceRunning ?? null, t('Service running', '서비스 실행 중'))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'Works from any install folder. Cue keeps a protected copy for administrator mode. Asks for UAC once, then restarts Cue elevated and registers a highest-privilege logon task so it starts without another prompt. A normal Task Manager kill is denied, and a killed Cue is restarted within seconds. The CueWatchdog service runs as SYSTEM, so even an administrator killing the watchdog only delays it by about five seconds.',
            '설치 폴더와 관계없이 사용할 수 있습니다. Cue는 관리자 모드용 보호 복사본을 따로 유지합니다. UAC를 한 번만 확인한 뒤 Cue를 관리자 권한으로 다시 실행하고, 최고 권한 로그온 작업을 등록해 다음부터는 확인 없이 시작합니다. 일반 작업 관리자에서는 종료가 거부되고, 강제 종료되어도 몇 초 안에 다시 실행됩니다. CueWatchdog 서비스는 SYSTEM으로 실행되므로 관리자가 워치독을 종료해도 약 5초 뒤 다시 살아납니다.',
          )}
        </p>
        <Button className="mt-3" onClick={() => void repairAll()}>
          {t('Repair protection', '보호 복구')}
        </Button>
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'Repair recreates the guard copy, service, scheduled tasks and markers. An administrator can still stop or delete the service, and Group Policy, Windows shutdown and kernel-level tools cannot be blocked; protection is best effort.',
            '복구는 가드 복사본, 서비스, 예약 작업, 마커를 다시 만듭니다. 관리자가 서비스를 중지·삭제하면 막을 수 없고, 그룹 정책, Windows 종료, 커널 수준 도구도 막을 수 없습니다. 보호는 최선의 노력입니다.',
          )}
        </p>
      </Card>
      <Card>
        <SectionTitle>{t('Windows Defender', 'Windows Defender')}</SectionTitle>
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'If Defender quarantines Cue as a false positive, add the app folder and its processes to the exclusion list. This lowers protection for those paths and needs administrator approval. If Cue was already quarantined, restore it in Windows Security > Protection history first.',
            'Defender가 Cue를 오탐으로 격리할 때 앱 폴더와 프로세스를 예외 목록에 추가합니다. 해당 경로의 보호 수준이 낮아지며 관리자 승인이 필요합니다. 이미 격리되었다면 Windows 보안 > 보호 기록에서 먼저 복원하세요.',
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${defenderTone}`}>
            {defenderLabel}
          </span>
          <Button disabled={defenderBusy} onClick={() => void addDefender()}>
            {defenderBusy ? t('Adding…', '추가 중…') : t('Add Defender exclusion', 'Defender 예외 추가')}
          </Button>
        </div>
        {defenderStatus?.available &&
          (defenderStatus.pathsTotal > 0 || defenderStatus.processesTotal > 0) && (
            <p className="mt-2 text-xs text-zinc-500">
              {t(
                `Paths ${defenderStatus.pathsPresent}/${defenderStatus.pathsTotal} · Processes ${defenderStatus.processesPresent}/${defenderStatus.processesTotal}`,
                `경로 ${defenderStatus.pathsPresent}/${defenderStatus.pathsTotal} · 프로세스 ${defenderStatus.processesPresent}/${defenderStatus.processesTotal}`,
              )}
            </p>
          )}
        {defenderMessage && <p className="mt-2 text-xs text-zinc-400">{defenderMessage}</p>}
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>{t('Survival guard', '생존 보호')}</SectionTitle>
          <span
            className={`mb-3 rounded-full px-2 py-0.5 text-xs font-medium ${
              guardStatus === null
                ? 'bg-zinc-800 text-zinc-400'
                : guardStatus
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {guardStatus === null
              ? t('Unknown', '알 수 없음')
              : guardStatus
                ? t('Configured', '설정됨')
                : t('Not configured', '설정 안 됨')}
          </span>
        </div>
        <Toggle
          checked={stealth.guard}
          onChange={(v) => void apply({ guard: v }, () => setGuard(v), 'guard').then(refreshGuard)}
          label={t('Restart Cue if it is killed', 'Cue가 강제 종료되면 다시 실행')}
        />
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'Creates a per-user scheduled task that runs every minute and keeps Cue running in the background. Normal Quit stops the guard; it re-arms automatically the next time Cue starts.',
            '사용자별 예약 작업을 만들어 1분마다 실행하며 Cue를 백그라운드에서 계속 실행합니다. 정상 종료하면 보호가 멈추지만, Cue를 다시 실행하면 자동으로 다시 켜집니다.',
          )}
        </p>
        <Button className="mt-3" onClick={() => void repair()}>
          {t('Repair guard', '보호 복구')}
        </Button>
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'The guard is best effort. Administrator-level kills and group-policy restrictions cannot be defeated. Repair recreates the scheduled task and marker if they were removed.',
            '보호는 최선의 노력입니다. 관리자 권한 강제 종료와 그룹 정책 제한은 막을 수 없습니다. 복구는 삭제된 예약 작업과 마커를 다시 만듭니다.',
          )}
        </p>
      </Card>
      <Card>
        <SectionTitle>{t('Tray guide', '트레이 안내')}</SectionTitle>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
          <li>{t('Open "Other system tray icons" in Taskbar settings.', '작업 표시줄 설정에서 "기타 시스템 트레이 아이콘"을 엽니다.')}</li>
          <li>{t('Find Cue in the list.', '목록에서 Cue를 찾습니다.')}</li>
          <li>{t('Turn it on so the icon stays visible.', '아이콘이 항상 보이도록 켭니다.')}</li>
        </ol>
        <Button
          className="mt-3"
          onClick={() => void openTaskbarSettings().catch(() => {})}
        >
          {t('Open taskbar settings', '작업 표시줄 설정 열기')}
        </Button>
      </Card>
      <p className="text-xs text-zinc-500">
        {t(
          'When searching, Cue captures only the display under the pointer.',
          '검색할 때 Cue는 포인터가 있는 디스플레이의 화면만 캡처합니다.',
        )}
      </p>
    </div>
  )
}
