import { lazy, Suspense } from 'react'
import { BookOpen, Crosshair, Info, Settings, Shield, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '../../i18n'
import { useUi } from '../../stores/ui'

const AboutTab = lazy(() => import('./AboutTab'))
const AiTab = lazy(() => import('./AiTab'))
const GeneralTab = lazy(() => import('./GeneralTab'))
const HelpTab = lazy(() => import('./HelpTab'))
const ModeTab = lazy(() => import('./ModeTab'))
const SecurityTab = lazy(() => import('./SecurityTab'))

const TABS = ['general', 'mode', 'ai', 'security', 'help', 'about'] as const
type Tab = (typeof TABS)[number]

const LABELS: Record<Tab, [string, string]> = {
  general: ['General', '일반'],
  mode: ['Mode', '모드'],
  ai: ['AI', 'AI'],
  security: ['Security', '보안'],
  help: ['Help', '사용법'],
  about: ['About', '정보'],
}

const DESCRIPTIONS: Record<Tab, [string, string]> = {
  general: [
    'Shortcuts, mouse trigger, language, startup, and local data.',
    '단축키, 마우스 트리거, 언어, 시작 및 로컬 데이터를 설정합니다.',
  ],
  mode: [
    'Choose how answers appear and tune the display.',
    '답 표시 방식과 표시 시간을 조정합니다.',
  ],
  ai: [
    'Connect a vision model and tune how answers are generated.',
    '비전 모델을 연결하고 답변 생성 방식을 조정합니다.',
  ],
  security: [
    'Protection, meeting detection, capture exclusion, and updates.',
    '보호, 회의 감지, 캡처 제외, 업데이트를 설정합니다.',
  ],
  help: [
    'Shortcuts, setup, and troubleshooting.',
    '단축키, 설정 방법, 문제 해결을 확인합니다.',
  ],
  about: [
    'Version, updates, license, and local data.',
    '버전, 업데이트, 라이선스, 로컬 데이터를 확인합니다.',
  ],
}

const ICONS: Record<Tab, LucideIcon> = {
  general: Settings,
  mode: Crosshair,
  ai: Sparkles,
  security: Shield,
  help: BookOpen,
  about: Info,
}

export default function SettingsHome() {
  const t = useT()
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const activeTab: Tab = (TABS as readonly string[]).includes(tab) ? (tab as Tab) : 'general'

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-separator/70 bg-surface/40 px-2.5 py-4 max-[760px]:w-[64px] max-[760px]:px-2">
        <div className="mb-5 flex items-center gap-2.5 px-2 max-[760px]:justify-center max-[760px]:px-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-accent text-[13px] font-bold text-[var(--color-accent-contrast)]">
            C
          </div>
          <div className="min-w-0 max-[760px]:hidden">
            <div className="text-[14px] font-semibold leading-tight">Cue</div>
            <div className="text-[10.5px] leading-tight text-ink-3">Settings</div>
          </div>
        </div>
        <nav className="space-y-0.5" aria-label={t('Settings sections', '설정 섹션')}>
          {TABS.map((id) => {
            const Icon = ICONS[id]
            const active = tab === id
            const label = t(...LABELS[id])
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                title={label}
                onClick={() => setTab(id)}
                className={`flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[760px]:justify-center max-[760px]:px-0 ${
                  active
                    ? 'bg-surface-3/80 font-medium text-ink'
                    : 'text-ink-2 hover:bg-surface-3/60 hover:text-ink'
                }`}
              >
                <Icon
                  size={17}
                  aria-hidden="true"
                  className={active ? 'text-accent' : 'text-ink-3'}
                />
                <span className="truncate max-[760px]:hidden">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto px-2 pt-4 text-[10px] text-ink-3 max-[760px]:px-0 max-[760px]:text-center">
          v{__APP_VERSION__}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-8 py-7 max-[760px]:px-5 max-[760px]:py-5">
          <header className="mb-7">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
              {t(...LABELS[activeTab])}
            </h1>
            <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-ink-2">
              {t(...DESCRIPTIONS[activeTab])}
            </p>
          </header>
          <Suspense
            fallback={
              <div className="space-y-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-[14px] bg-surface p-4 ring-1 ring-separator/70"
                  >
                    <div className="h-3 w-24 rounded bg-surface-3" />
                    <div className="mt-4 h-10 rounded bg-surface-2" />
                  </div>
                ))}
              </div>
            }
          >
            {tab === 'general' && <GeneralTab />}
            {tab === 'mode' && <ModeTab />}
            {tab === 'ai' && <AiTab />}
            {tab === 'security' && <SecurityTab />}
            {tab === 'help' && <HelpTab />}
            {tab === 'about' && <AboutTab />}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
