import { useEffect, useRef, useState } from 'react'
import ShortcutRecorder from '../../components/ShortcutRecorder'
import { Button, Card, Input, SectionTitle, Select, Toggle } from '../../components/ui'
import { useT } from '../../i18n'
import {
  addProfile,
  buildExportPayload,
  deleteProfile,
  loadProfiles,
  parseImport,
  type Profile,
} from '../../lib/settingsBackup'
import { applyTrayMenuLabels } from '../../lib/startup'
import { getAutostart, setAutostart, setContentProtection, setGuard, setHideFromTaskbar, setPanicShortcut, setShortcut } from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import { mergeSettings, useSettings } from '../../stores/settings'

export default function GeneralTab() {
  const t = useT()
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)
  const storage = useSettings((s) => s.storage)
  const setStorage = useSettings((s) => s.setStorage)
  const [auto, setAuto] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles())
  const [profileName, setProfileName] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const applySettings = async (next: ReturnType<typeof mergeSettings>) => {
    const log = (code: string) => void useAnswer.getState().logError(code)
    await Promise.all([
      setShortcut(next.shortcut.accelerator).catch(() => log('shortcut')),
      setPanicShortcut(next.panic.accelerator).catch(() => log('shortcut')),
      setContentProtection(next.stealth.contentProtection).catch(() => log('stealth')),
      setHideFromTaskbar(next.stealth.skipTaskbar).catch(() => log('stealth')),
      setGuard(next.stealth.guard).catch(() => log('guard')),
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
        const ok = window.confirm(
          t(
            'This backup changes the AI endpoint, deletes stored history, or enables the guard. Apply it?',
            '이 백업은 AI 주소를 바꾸거나 저장된 기록을 삭제하거나 보호 기능을 켭니다. 적용할까요?',
          ),
        )
        if (!ok) return
      }
      await applySettings(next)
      setBackupMessage(t('Settings imported.', '설정을 가져왔습니다.'))
    } catch {
      setBackupMessage(t('This file is not a valid Cue settings backup.', '올바른 Cue 설정 백업 파일이 아닙니다.'))
    }
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
      <Card className="space-y-4">
        <div>
          <SectionTitle>{t('Answer shortcut', '답변 단축키')}</SectionTitle>
          <ShortcutRecorder />
        </div>
        <div>
          <SectionTitle>{t('Panic clear', '패닉 클리어')}</SectionTitle>
          <ShortcutRecorder panic />
          <p className="mt-2 text-xs text-zinc-500">
            {t(
              'Clears the answer, history and error log, then hides the Cue window.',
              '답변·기록·오류 로그를 지우고 Cue 창을 숨깁니다.',
            )}
          </p>
        </div>
      </Card>
      <Card>
        <SectionTitle>{t('Language', '언어')}</SectionTitle>
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
      </Card>
      <Card>
        <SectionTitle>{t('Startup', '시작')}</SectionTitle>
        <Toggle
          checked={auto}
          onChange={(v) => void toggleAuto(v)}
          label={t('Start automatically at login (background)', '로그인 시 자동 실행 (백그라운드)')}
        />
      </Card>
      <Card className="space-y-3">
        <SectionTitle>{t('Privacy', '개인정보')}</SectionTitle>
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
        <p className="text-xs text-zinc-500">
          {t(
            'Turning a log off clears its saved entries. Nothing is sent anywhere.',
            '로그를 끄면 저장된 항목이 지워집니다. 어디에도 전송되지 않습니다.',
          )}
        </p>
      </Card>
      <Card className="space-y-3">
        <SectionTitle>{t('Settings backup', '설정 백업')}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJson}>{t('Export JSON', 'JSON 내보내기')}</Button>
          <Button onClick={() => fileRef.current?.click()}>{t('Import JSON', 'JSON 가져오기')}</Button>
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
        <p className="text-xs text-zinc-500">
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
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
              >
                <span className="min-w-0 truncate">{profile.name}</span>
                <span className="flex shrink-0 gap-1">
                  <button
                    className="text-xs text-zinc-400 transition-colors hover:text-zinc-100"
                    onClick={() => void applyProfile(profile)}
                  >
                    {t('Apply', '적용')}
                  </button>
                  <button
                    className="text-xs text-zinc-500 transition-colors hover:text-red-400"
                    onClick={() => removeProfile(profile)}
                  >
                    {t('Delete', '삭제')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {backupMessage && <p className="text-xs text-zinc-400">{backupMessage}</p>}
      </Card>
    </div>
  )
}
