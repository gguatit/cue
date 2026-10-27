import { Button, Card, SectionTitle, Toggle } from '../../components/ui'
import { useT, errorMessage } from '../../i18n'
import { openExternal } from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import { useSettings } from '../../stores/settings'
import { useUpdates } from '../../stores/updates'

export default function AboutTab() {
  const t = useT()
  const log = useAnswer((s) => s.log)
  const history = useAnswer((s) => s.history)
  const clearHistory = useAnswer((s) => s.clearHistory)
  const clearErrors = useAnswer((s) => s.clearErrors)
  const storage = useSettings((s) => s.storage)
  const updatePrefs = useSettings((s) => s.updates)
  const setUpdates = useSettings((s) => s.setUpdates)
  const checking = useUpdates((s) => s.checking)
  const installing = useUpdates((s) => s.installing)
  const available = useUpdates((s) => s.available)
  const progress = useUpdates((s) => s.progress)
  const updateError = useUpdates((s) => s.error)
  const checked = useUpdates((s) => s.checked)
  const check = useUpdates((s) => s.check)
  const install = useUpdates((s) => s.install)

  const confirmInstall = () => {
    if (
      window.confirm(
        t(
          'Cue will close and Windows may ask for administrator permission. Settings and history are kept. Install the update?',
          'Cue가 종료되고 Windows가 관리자 권한을 요청할 수 있습니다. 설정과 기록은 유지됩니다. 업데이트를 설치할까요?',
        ),
      )
    ) {
      void install()
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <Card className="space-y-2">
        <p className="font-medium text-zinc-100">Cue v{__APP_VERSION__}</p>
        <p className="text-zinc-400">
          {t('Made by kalpha (Choi Jaeyoung)', '만든 사람: kalpha (최재영)')}
        </p>
        <p className="text-zinc-500">MIT License</p>
        <Button
          className="mt-1"
          onClick={() => void openExternal('https://github.com/gguatit/cue').catch(() => {})}
        >
          GitHub
        </Button>
        <p className="pt-1 text-xs text-zinc-500">
          {t(
            'No account, subscription or telemetry. Your API key is stored in Windows Credential Manager, and screenshots are sent only to the AI provider you configure.',
            '계정·구독·텔레메트리가 없습니다. API 키는 Windows 자격증명 관리자에 저장되며, 화면은 사용자가 설정한 AI 공급자에게만 전송됩니다.',
          )}
        </p>
        <p className="text-xs text-zinc-500">
          {t(
            'Built with Tauri, React and Rust open-source libraries.',
            'Tauri, React 및 Rust 오픈소스 라이브러리로 만들었습니다.',
          )}
        </p>
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
          {t(
            'Use Cue only where it is allowed. You are responsible for complying with exam and institutional rules; misuse can void results and lead to disciplinary action.',
            'Cue는 허용된 곳에서만 사용하세요. 시험·기관 규정 준수 책임은 사용자에게 있으며, 위반 시 결과 무효·징계 등의 제재를 받을 수 있습니다.',
          )}
        </p>
        <p className="pt-1 text-xs text-zinc-500">
          {t(
            'The overlay and flash tests need one real capture first. Press the shortcut once, then test.',
            '오버레이와 플래시 테스트는 실제 캡처가 한 번 필요합니다. 단축키를 한 번 누른 뒤 테스트하세요.',
          )}
        </p>
      </Card>
      <Card className="space-y-3">
        <SectionTitle>{t('Updates', '업데이트')}</SectionTitle>
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-zinc-200">Cue v{__APP_VERSION__}</p>
          <Button disabled={checking || installing} onClick={() => void check(false)}>
            {checking
              ? t('Checking…', '확인 중…')
              : t('Check for updates', '업데이트 확인')}
          </Button>
        </div>
        {available && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
            <p className="font-medium text-zinc-100">
              {t(`v${available.version} is available`, `v${available.version} 사용 가능`)}
            </p>
            {available.notes && (
              <p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">
                {available.notes}
              </p>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              {t(
                'The app closes while the signed installer runs. Windows may ask for administrator permission.',
                '서명된 설치 프로그램이 실행되는 동안 앱이 종료됩니다. Windows가 관리자 권한을 요청할 수 있습니다.',
              )}
            </p>
            <Button
              className="mt-2"
              variant="primary"
              disabled={installing}
              onClick={confirmInstall}
            >
              {installing ? t('Installing…', '설치 중…') : t('Install update', '업데이트 설치')}
            </Button>
            {installing && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${progress ?? 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {progress === null
                    ? t('Downloading…', '다운로드 중…')
                    : t(`${progress}% downloaded`, `${progress}% 다운로드됨`)}
                </p>
              </div>
            )}
          </div>
        )}
        {checked && !available && !checking && !updateError && (
          <p className="text-xs text-zinc-500">
            {t('You are on the latest version.', '최신 버전입니다.')}
          </p>
        )}
        {updateError && (
          <p className="text-xs text-amber-400">{errorMessage(updateError)}</p>
        )}
        <Toggle
          checked={updatePrefs.autoCheck}
          onChange={(autoCheck) => setUpdates({ autoCheck })}
          label={t('Check for updates automatically', '자동으로 업데이트 확인')}
          hint={t(
            'Checks GitHub Releases at most once a day. No account or telemetry.',
            '하루에 한 번 GitHub Releases를 확인합니다. 계정·텔레메트리는 없습니다.',
          )}
        />
        <p className="text-xs text-zinc-500">
          {t(
            'Updates are signed. Cue will not run an installer whose signature does not match.',
            '업데이트는 서명으로 검증됩니다. 서명이 맞지 않는 설치 프로그램은 실행하지 않습니다.',
          )}
        </p>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            {t('Answer history', '답변 기록')}
          </h2>
          {storage.history && (
            <button className="text-xs text-zinc-500 transition-colors hover:text-zinc-300" onClick={clearHistory}>
              {t('Clear history', '기록 지우기')}
            </button>
          )}
        </div>
        {!storage.history ? (
          <p className="text-zinc-500">{t('History is off in General.', '일반 탭에서 기록 보관이 꺼져 있습니다.')}</p>
        ) : history.length === 0 ? (
          <p className="text-zinc-500">{t('None', '없음')}</p>
        ) : (
          <ul className="space-y-1 select-text">
            {history.map((h, i) => (
              <li key={i} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                {new Date(h.ts).toLocaleTimeString()} · {h.text ?? h.answers.join(', ')}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            {t('Recent errors', '최근 오류')}
          </h2>
          {storage.errors && (
            <button className="text-xs text-zinc-500 transition-colors hover:text-zinc-300" onClick={clearErrors}>
              {t('Clear errors', '오류 지우기')}
            </button>
          )}
        </div>
        {!storage.errors ? (
          <p className="text-zinc-500">{t('Error log is off in General.', '일반 탭에서 오류 로그 보관이 꺼져 있습니다.')}</p>
        ) : log.length === 0 ? (
          <p className="text-zinc-500">{t('None', '없음')}</p>
        ) : (
          <ul className="space-y-1 select-text">
            {log.map((e, i) => (
              <li key={i} className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-400">
                {new Date(e.ts).toLocaleTimeString()} · {errorMessage(e.code)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
