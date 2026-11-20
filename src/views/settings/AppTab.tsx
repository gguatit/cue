import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Presence } from '../../components/Presence'
import { exit, fade, layoutSpring } from '../../lib/motion'
import { Button, Group, GroupHeader, Input, Row, SegmentedControl, Select, Toggle } from '../../components/ui'
import { useT } from '../../i18n'
import {
  addProfile,
  buildExportPayload,
  deleteProfile,
  loadProfiles,
  parseImport,
  type Profile,
} from '../../lib/settingsBackup'
import { beginBlurGuard } from '../../lib/blurGuard'
import { applyTrayMenuLabels } from '../../lib/startup'
import {
  getAutostart,
  setAutostart,
  setContentProtection,
  setFreeShortcut,
  setGuard,
  setHideFromTaskbar,
  setMouseTrigger,
  setPanicShortcut,
  setShortcut,
} from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import {
  mergeSettings,
  useSettings,
  type AccentChoice,
  type ThemeChoice,
} from '../../stores/settings'

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

export default function AppTab() {
  const t = useT()
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)
  const appearance = useSettings((s) => s.appearance)
  const setAppearance = useSettings((s) => s.setAppearance)
  const storage = useSettings((s) => s.storage)
  const setStorage = useSettings((s) => s.setStorage)
  const showUsage = useSettings((s) => s.answer.showUsage)
  const log = useAnswer((s) => s.log)
  const history = useAnswer((s) => s.history)
  const clearHistory = useAnswer((s) => s.clearHistory)
  const clearErrors = useAnswer((s) => s.clearErrors)
  const copyHistory = useAnswer((s) => s.copyHistory)
  const removeHistory = useAnswer((s) => s.removeHistory)
  const toggleHistoryPin = useAnswer((s) => s.toggleHistoryPin)
  const [auto, setAuto] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles())
  const [profileName, setProfileName] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof mergeSettings> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const usageText = (usage: { input?: number; output?: number; total?: number }) =>
    t(
      `Tokens ${usage.input ?? '—'} in / ${usage.output ?? '—'} out / ${usage.total ?? '—'} total`,
      `토큰 입력 ${usage.input ?? '—'} / 출력 ${usage.output ?? '—'} / 합계 ${usage.total ?? '—'}`,
    )

  const applySettings = async (next: ReturnType<typeof mergeSettings>) => {
    const logError = (code: string) => void useAnswer.getState().logError(code)
    await setShortcut(next.shortcut.accelerator, next.shortcut.click, next.shortcut.button).catch(
      () => logError('shortcut'),
    )
    await setFreeShortcut(next.free.enabled, next.free.button).catch(() => logError('shortcut'))
    await setMouseTrigger(next.mouse).catch(() => logError('gesture'))
    await Promise.all([
      setPanicShortcut(next.panic.accelerator).catch(() => logError('shortcut')),
      setContentProtection(next.stealth.contentProtection).catch(() => logError('stealth')),
      setHideFromTaskbar(next.stealth.skipTaskbar).catch(() => logError('stealth')),
      setGuard(next.stealth.guard).catch(() => logError('guard')),
    ])
    useSettings.setState(next)
    void applyTrayMenuLabels()
  }

  const exportJson = () => {
    try {
      const payload = buildExportPayload(useSettings.getState())
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'cue-settings.json'
      link.click()
      URL.revokeObjectURL(url)
      setBackupMessage(t('Settings exported.', '설정을 내보냈습니다.'))
    } catch {
      setBackupMessage(t('Could not export settings.', '설정을 내보내지 못했습니다.'))
    }
  }

  const importJson = async (file: File) => {
    try {
      const next = parseImport(await file.text())
      const current = useSettings.getState()
      const changesProvider =
        next.provider.preset !== current.provider.preset ||
        next.provider.baseUrl !== current.provider.baseUrl
      const clearsHistory = current.storage.history && !next.storage.history
      const enablesGuard = !current.stealth.guard && next.stealth.guard
      if (changesProvider || clearsHistory || enablesGuard) {
        setPendingImport(next)
        return
      }
      await applySettings(next)
      setBackupMessage(t('Settings imported.', '설정을 가져왔습니다.'))
    } catch {
      setBackupMessage(t('This file is not a valid Cue settings backup.', '올바른 Cue 설정 백업 파일이 아닙니다.'))
    }
  }

  const confirmImport = async () => {
    const next = pendingImport
    setPendingImport(null)
    if (!next) return
    await applySettings(next)
    setBackupMessage(t('Settings imported.', '설정을 가져왔습니다.'))
  }

  const saveProfile = () => {
    const name = profileName.trim()
    if (!name) {
      setBackupMessage(t('Enter a profile name first.', '프로필 이름을 먼저 입력하세요.'))
      return
    }
    setProfiles(addProfile(name, mergeSettings(useSettings.getState())))
    setProfileName('')
    setBackupMessage(t('Profile saved.', '프로필을 저장했습니다.'))
  }

  const applyProfile = async (profile: Profile) => {
    await applySettings(mergeSettings(profile.settings))
    setBackupMessage(t('Profile applied.', '프로필을 적용했습니다.'))
  }

  const removeProfile = (profile: Profile) => {
    setProfiles(deleteProfile(profile.id))
    setBackupMessage(t('Profile deleted.', '프로필을 삭제했습니다.'))
  }

  useEffect(() => {
    void getAutostart().then(setAuto).catch(() => {})
  }, [])

  const toggleAuto = async (next: boolean) => {
    try {
      await setAutostart(next)
      setAuto(next)
    } catch {
      void useAnswer.getState().logError('autostart')
    }
  }

  return (
    <div className="space-y-4">
      <SettingsGroup title={t('Language', '언어')}>
        <Select
          className="w-40"
          aria-label={t('Language', '언어')}
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value as 'ko' | 'en')
            void applyTrayMenuLabels()
          }}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </Select>
      </SettingsGroup>
      <Group>
        <GroupHeader>{t('Appearance', '모양')}</GroupHeader>
        <Row>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">{t('Theme', '테마')}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
              {t(
                'Follow Windows or keep a fixed theme. The overlay stays dark.',
                'Windows 설정을 따르거나 고정 테마를 사용합니다. 오버레이는 항상 어둡게 유지됩니다.',
              )}
            </p>
          </div>
          <SegmentedControl<ThemeChoice>
            value={appearance.theme}
            label={t('Theme', '테마')}
            onChange={(theme) => setAppearance({ theme })}
            options={[
              { value: 'dark', label: t('Dark', '어둡게') },
              { value: 'light', label: t('Light', '밝게') },
              { value: 'system', label: t('System', '시스템') },
            ]}
          />
        </Row>
        <Row>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">{t('Accent color', '강조 색')}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
              {t(
                'Follow the Windows accent or pick a fixed color.',
                'Windows 강조 색을 따르거나 고정 색을 선택합니다.',
              )}
            </p>
          </div>
          <SegmentedControl<AccentChoice>
            value={appearance.accent}
            label={t('Accent color', '강조 색')}
            onChange={(accent) => setAppearance({ accent })}
            options={[
              { value: 'system', label: t('System', '시스템') },
              { value: 'amber', label: t('Amber', '호박') },
              { value: 'blue', label: t('Blue', '파랑') },
              { value: 'violet', label: t('Violet', '보라') },
            ]}
          />
        </Row>
      </Group>
      <SettingsGroup title={t('Startup', '시작')}>
        <Toggle
          checked={auto}
          onChange={(v) => void toggleAuto(v)}
          label={t('Start automatically at login (background)', '로그인 시 자동 실행 (백그라운드)')}
        />
      </SettingsGroup>
      <SettingsGroup title={t('Privacy', '개인정보')} className="space-y-3">
        <Toggle
          checked={storage.history}
          onChange={(v) => setStorage({ history: v })}
          label={t('Keep answer history', '답변 기록 보관')}
          hint={t('Up to 10 answers, stored only on this device.', '최대 10개의 답변을 이 기기에만 저장합니다.')}
        />
        <Toggle
          checked={storage.errors}
          onChange={(v) => setStorage({ errors: v })}
          label={t('Keep error log', '오류 로그 보관')}
          hint={t('Up to 20 errors, stored only on this device.', '최대 20개의 오류를 이 기기에만 저장합니다.')}
        />
        <p className="text-xs text-ink-3">
          {t(
            'Turning a log off clears its saved entries. Nothing is sent anywhere.',
            '로그를 끄면 저장된 항목이 지워집니다. 어디에도 전송되지 않습니다.',
          )}
        </p>
        <div className="mt-3 space-y-2 border-t border-separator pt-3">
          <p className="text-[12px] font-medium text-ink-2">
            {t('Quit cleanup', '종료 시 정리')}
          </p>
          <Toggle
            checked={storage.clearOnQuit.history}
            onChange={(history) =>
              setStorage({ clearOnQuit: { ...storage.clearOnQuit, history } })
            }
            label={t('Clear answer history on quit', '종료 시 답변 기록 지우기')}
          />
          <Toggle
            checked={storage.clearOnQuit.errors}
            onChange={(errors) =>
              setStorage({ clearOnQuit: { ...storage.clearOnQuit, errors } })
            }
            label={t('Clear error log on quit', '종료 시 오류 로그 지우기')}
          />
          <Toggle
            checked={storage.clearOnQuit.clipboard}
            onChange={(clipboard) =>
              setStorage({ clearOnQuit: { ...storage.clearOnQuit, clipboard } })
            }
            label={t('Clear clipboard on quit', '종료 시 클립보드 지우기')}
          />
          <p className="text-xs text-ink-3">
            {t(
              'Runs when Cue is quit from the app or tray. Forced termination may skip cleanup.',
              'Cue를 앱이나 트레이에서 종료할 때 실행됩니다. 강제 종료는 정리를 건너뛸 수 있습니다.',
            )}
          </p>
        </div>
      </SettingsGroup>
      <SettingsGroup title={t('Settings backup', '설정 백업')} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJson}>{t('Export JSON', 'JSON 내보내기')}</Button>
          <Button
            onClick={() => {
              beginBlurGuard()
              fileRef.current?.click()
            }}
          >
            {t('Import JSON', 'JSON 가져오기')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void importJson(file)
            }}
          />
        </div>
        <p className="text-xs text-ink-3">
          {t(
            'API keys are stored in the Windows Credential Manager and are never exported.',
            'API 키는 Windows 자격증명 관리자에 저장되며 내보내지 않습니다.',
          )}
        </p>
        <div className="flex gap-2">
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder={t('Profile name', '프로필 이름')}
            aria-label={t('Profile name', '프로필 이름')}
          />
          <Button className="shrink-0" onClick={saveProfile}>
            {t('Save current profile', '현재 프로필 저장')}
          </Button>
        </div>
        {profiles.length > 0 && (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {profiles.map((profile) => (
                <motion.li
                  key={profile.id}
                  layout="position"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4, transition: exit }}
                  transition={{ layout: layoutSpring, opacity: fade, x: layoutSpring }}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-ink"
                >
                  <span className="min-w-0 truncate">{profile.name}</span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      className="text-xs text-ink-2 transition-colors hover:text-ink"
                      onClick={() => void applyProfile(profile)}
                    >
                      {t('Apply', '적용')}
                    </button>
                    <button
                      className="text-xs text-ink-3 transition-colors hover:text-danger"
                      onClick={() => removeProfile(profile)}
                    >
                      {t('Delete', '삭제')}
                    </button>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        <Presence show={Boolean(backupMessage)} className="text-xs text-ink-2">
          {backupMessage}
        </Presence>
      </SettingsGroup>
      <Group className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-ink-3">
            {t('Answer history', '답변 기록')}
          </h2>
          {storage.history && (
            <button className="text-xs text-ink-3 transition-colors hover:text-ink" onClick={clearHistory}>
              {t('Clear history', '기록 지우기')}
            </button>
          )}
        </div>
        {!storage.history ? (
          <p className="text-ink-3">{t('History is off in the App tab.', '앱 탭에서 기록 보관이 꺼져 있습니다.')}</p>
        ) : history.length === 0 ? (
          <p className="text-ink-3">{t('None', '없음')}</p>
        ) : (
          <ul className="space-y-1 select-text">
            {history.map((h, i) => (
              <li
                key={`${h.ts}-${i}`}
                className="flex items-start justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-ink-2"
              >
                <span className="min-w-0 break-words">
                  {new Date(h.ts).toLocaleTimeString()} · {h.text ?? h.answers.join(', ')}
                  {h.pinned && (
                    <span className="ml-1 text-accent">{t('Pinned', '고정됨')}</span>
                  )}
                  {showUsage && h.usage && (
                    <span className="mt-0.5 block text-[11px] text-ink-3">
                      {usageText(h.usage)}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    className="text-xs text-ink-3 transition-colors hover:text-ink"
                    aria-label={t('Copy answer', '답변 복사')}
                    onClick={() => void copyHistory(i)}
                  >
                    {t('Copy', '복사')}
                  </button>
                  <button
                    className="text-xs text-ink-3 transition-colors hover:text-ink"
                    aria-label={h.pinned ? t('Unpin answer', '답변 고정 해제') : t('Pin answer', '답변 고정')}
                    onClick={() => toggleHistoryPin(i)}
                  >
                    {h.pinned ? t('Unpin', '해제') : t('Pin', '고정')}
                  </button>
                  <button
                    className="text-xs text-ink-3 transition-colors hover:text-danger"
                    aria-label={t('Delete answer', '답변 삭제')}
                    onClick={() => removeHistory(i)}
                  >
                    {t('Delete', '삭제')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Group>
      <Group className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-ink-3">
            {t('Recent errors', '최근 오류')}
          </h2>
          {storage.errors && (
            <button className="text-xs text-ink-3 transition-colors hover:text-ink" onClick={clearErrors}>
              {t('Clear errors', '오류 지우기')}
            </button>
          )}
        </div>
        {!storage.errors ? (
          <p className="text-ink-3">{t('Error log is off in the App tab.', '앱 탭에서 오류 로그 보관이 꺼져 있습니다.')}</p>
        ) : log.length === 0 ? (
          <p className="text-ink-3">{t('None', '없음')}</p>
        ) : (
          <ul className="space-y-1 select-text">
            {log.map((e, i) => (
              <li key={`${e.ts}-${i}`} className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-ink-2">
                {new Date(e.ts).toLocaleTimeString()} · <span className="font-mono">{e.code}</span>
              </li>
            ))}
          </ul>
        )}
      </Group>
      <AnimatePresence>
        {pendingImport && (
          <ConfirmDialog
            title={t('Apply imported settings?', '가져온 설정을 적용할까요?')}
            description={t(
              'This backup changes the AI endpoint, deletes stored history, or enables the guard. Apply it?',
              '이 백업은 AI 주소를 바꾸거나 저장된 기록을 삭제하거나 보호 기능을 켭니다. 적용할까요?',
            )}
            confirmLabel={t('Apply', '적용')}
            onCancel={() => setPendingImport(null)}
            onConfirm={() => void confirmImport()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
