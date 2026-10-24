import { BookOpen, Crosshair, Info, Settings, Shield, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '../../i18n'
import { useUi } from '../../stores/ui'
import AboutTab from './AboutTab'
import AiTab from './AiTab'
import GeneralTab from './GeneralTab'
import HelpTab from './HelpTab'
import ModeTab from './ModeTab'
import SecurityTab from './SecurityTab'

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
  return (
    <div className="min-h-screen bg-[#111113] text-zinc-100">
      <div className="mx-auto flex max-w-2xl">
        <nav className="w-44 shrink-0 p-4">
          <div className="mb-4 px-3 text-sm font-semibold tracking-wide text-zinc-100">Cue</div>
          <div className="space-y-0.5">
            {TABS.map((id) => {
              const Icon = ICONS[id]
              const active = tab === id
              return (
                <button
                  key={id}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(id)}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-zinc-800/70 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className={active ? 'text-accent' : 'text-zinc-500'}
                  />
                  {t(...LABELS[id])}
                </button>
              )
            })}
          </div>
        </nav>
        <main className="min-w-0 flex-1 p-4">
          {tab === 'general' && <GeneralTab />}
          {tab === 'mode' && <ModeTab />}
          {tab === 'ai' && <AiTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'help' && <HelpTab />}
          {tab === 'about' && <AboutTab />}
        </main>
      </div>
    </div>
  )
}
