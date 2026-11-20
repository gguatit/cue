import { lazy, Suspense } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { FlaskConical, Info, Keyboard, Monitor, Settings, Shield, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '../../i18n'
import { fade, layoutSpring } from '../../lib/motion'
import { useUi } from '../../stores/ui'

const AboutTab = lazy(() => import('./AboutTab'))
const AiTab = lazy(() => import('./AiTab'))
const AppTab = lazy(() => import('./AppTab'))
const DisplayTab = lazy(() => import('./ModeTab'))
const ExperimentalTab = lazy(() => import('./ExperimentalTab'))
const InputTab = lazy(() => import('./InputTab'))
const ProtectionTab = lazy(() => import('./SecurityTab'))

const TABS = ['input', 'display', 'ai', 'protection', 'app', 'experimental', 'info'] as const
type Tab = (typeof TABS)[number]

const LABELS: Record<Tab, [string, string]> = {
  input: ['Input', '입력'],
  display: ['Display', '표시'],
  ai: ['AI', 'AI'],
  protection: ['Protection', '보호'],
  app: ['App', '앱'],
  experimental: ['Lab', '실험실'],
  info: ['Info', '정보'],
}

const DESCRIPTIONS: Record<Tab, [string, string]> = {
  input: [
    'Answer shortcut, mouse trigger, and free mode.',
    '답변 단축키, 마우스 트리거, 자유 모드를 설정합니다.',
  ],
  display: [
    'Choose how answers appear and how long they stay.',
    '답 표시 방식과 지속 시간을 조정합니다.',
  ],
  ai: [
    'Connect a vision model and tune how answers are generated.',
    '비전 모델을 연결하고 답변 생성 방식을 조정합니다.',
  ],
  protection: [
    'Capture protection, meeting mode, and system protection.',
    '화면 캡처·회의·시스템 보호를 관리합니다.',
  ],
  app: [
    'Language, appearance, startup, history, and backups.',
    '언어, 모양, 시작, 기록과 백업을 관리합니다.',
  ],
  experimental: [
    'Features being tested before moving to normal tabs.',
    '실사용 검증 후 정식 탭으로 옮기는 기능입니다.',
  ],
  info: [
    'Help, test exam, updates, and license.',
    '도움말, 테스트 시험지, 업데이트, 라이선스를 확인합니다.',
  ],
}

const ICONS: Record<Tab, LucideIcon> = {
  input: Keyboard,
  display: Monitor,
  ai: Sparkles,
  protection: Shield,
  app: Settings,
  experimental: FlaskConical,
  info: Info,
}

export default function SettingsHome() {
  const t = useT()
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const activeTab: Tab = (TABS as readonly string[]).includes(tab) ? (tab as Tab) : 'input'

  return (
    <MotionConfig reducedMotion="user">
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
            const active = activeTab === id
            const label = t(...LABELS[id])
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                title={label}
                onClick={() => setTab(id)}
                className={`relative flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-[760px]:justify-center max-[760px]:px-0 ${
                  active ? 'font-medium text-ink' : 'text-ink-2 hover:bg-surface-3/60 hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="settings-active"
                    transition={layoutSpring}
                    className="absolute inset-0 rounded-[10px] bg-surface-3/80"
                  />
                )}
                <Icon
                  size={17}
                  aria-hidden="true"
                  className={`relative ${active ? 'text-accent' : 'text-ink-3'}`}
                />
                <span className="relative truncate max-[760px]:hidden">{label}</span>
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ opacity: fade, y: layoutSpring }}
          >
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
              {activeTab === 'input' && <InputTab />}
              {activeTab === 'display' && <DisplayTab />}
              {activeTab === 'ai' && <AiTab />}
              {activeTab === 'protection' && <ProtectionTab />}
              {activeTab === 'app' && <AppTab />}
              {activeTab === 'experimental' && <ExperimentalTab />}
              {activeTab === 'info' && <AboutTab />}

            </Suspense>
          </motion.div>
        </div>
      </main>
    </div>
    </MotionConfig>
  )
}
