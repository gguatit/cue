import { useState, type ReactNode } from 'react'
import {
  BatteryMedium,
  Bell,
  CheckCheck,
  Code2,
  Keyboard,
  KeyRound,
  Layers,
  MousePointer2,
  RefreshCw,
  ScanEye,
  Shield,
  SunMedium,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const displayModes = [
  { id: 'tray', icon: Bell, label: '트레이', hint: '작업표시줄 아이콘처럼 위장합니다.' },
  { id: 'overlay', icon: ScanEye, label: '오버레이', hint: '커서 옆에 작은 배지로 표시합니다.' },
  { id: 'flash', icon: Zap, label: '플래시', hint: '화면 전체에 짧게 표시합니다.' },
  { id: 'led', icon: Keyboard, label: 'LED', hint: '키보드 LED로 답을 깜빡입니다.' },
  { id: 'brightness', icon: SunMedium, label: '밝기', hint: '화면 밝기를 깜빡여 표시합니다.' },
] as const

type DisplayMode = (typeof displayModes)[number]['id']

function DisplayPreview({ mode }: { mode: DisplayMode }) {
  const current = displayModes.find((item) => item.id === mode) ?? displayModes[0]
  return (
    <div className="mt-5">
      <div className="relative h-32 overflow-hidden rounded-xl border border-white/10 bg-[#09090b]">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-30" />
        <span className="absolute left-3 top-3 z-10 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          {current.label} preview
        </span>

      {mode === 'tray' && (
        <div className="absolute inset-x-0 bottom-0 flex h-9 items-center gap-2 border-t border-white/10 bg-white/[0.03] px-3">
          <span className="size-2 rounded-full bg-zinc-700" />
          <span className="size-2 rounded-full bg-zinc-700" />
          <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[10px] text-amber-300">
            <BatteryMedium aria-hidden="true" className="size-3" />
            B
          </span>
        </div>
      )}

      {mode === 'overlay' && (
        <div className="relative flex h-full items-center justify-center">
          <MousePointer2
            aria-hidden="true"
            className="absolute left-[56%] top-[58%] size-4 text-zinc-400"
          />
          <span className="animate-float rounded-lg border border-white/15 bg-[#17171b]/95 px-5 py-2 text-3xl font-bold text-zinc-100 shadow-xl">
            B
          </span>
        </div>
      )}

      {mode === 'flash' && (
        <div className="flex h-full items-center justify-center bg-black/55">
          <span className="animate-pulse text-6xl font-black leading-none text-white">B</span>
        </div>
      )}

      {mode === 'led' && (
        <div className="flex h-full items-center justify-center gap-2">
          {['S', 'C', 'N'].map((key) => (
            <span
              key={key}
              className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] font-mono text-[10px] text-zinc-500"
            >
              {key}
            </span>
          ))}
          <span className="ml-2 size-2 animate-led rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
        </div>
      )}

      {mode === 'brightness' && (
        <div className="relative flex h-full items-center justify-center overflow-hidden">
          <SunMedium aria-hidden="true" className="size-9 text-amber-300" />
          <span aria-hidden="true" className="absolute inset-0 animate-led bg-black/45" />
        </div>
      )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">{current.hint}</p>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  className = '',
  children,
}: {
  icon: LucideIcon
  title: string
  body: string
  className?: string
  children?: ReactNode
}) {
  return (
    <Reveal className={className}>
      <Card className="group h-full border-white/5 bg-white/[0.018] ring-white/10 transition-[transform,border-color,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-amber-400/20 hover:bg-white/[0.03] hover:shadow-[0_18px_50px_-28px_rgba(251,191,36,0.4)]">
        <CardContent className="flex h-full flex-col p-5">
          <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-amber-400">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <h3 className="mt-5 text-base font-medium tracking-tight text-zinc-100">{title}</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">{body}</p>
          {children}
        </CardContent>
      </Card>
    </Reveal>
  )
}

export default function FeatureGrid() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('tray')
  return (
    <section id="features" className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="FEATURES"
            title="답을 보여주는 방식까지, 내 환경에 맞게."
            description="같은 화면도 상황에 따라 다르게 보여야 합니다. Cue는 표시 방식과 안전장치를 분리해, 필요한 것만 켤 수 있게 했습니다."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <FeatureCard
            className="md:col-span-4"
            icon={Layers}
            title="다섯 가지 표시 방식"
            body="트레이 아이콘부터 커서 오버레이, 전체 화면 플래시, 키보드 LED, 화면 밝기까지. 각 방식을 독립적으로 켜고 끌 수 있습니다."
          >
            <div
              role="group"
              aria-label="표시 방식 미리보기"
              className="mt-5 flex flex-wrap gap-2"
            >
              {displayModes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={displayMode === id}
                  onClick={() => setDisplayMode(id)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] transition-[color,background-color,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                    displayMode === id
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                      : 'border-white/10 bg-white/[0.025] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-3" />
                  {label}
                </button>
              ))}
            </div>
            <DisplayPreview mode={displayMode} />
          </FeatureCard>

          <FeatureCard
            className="md:col-span-2"
            icon={Code2}
            title="자유 모드"
            body="문제가 아니어도 됩니다. 커서 아래의 코드·텍스트·도표를 설명하고, 지시문을 직접 바꿀 수 있습니다."
          >
            <Badge variant="outline" className="mt-5 w-fit border-emerald-400/20 text-emerald-300">
              설명 · 요약 · 번역
            </Badge>
          </FeatureCard>

          <FeatureCard
            className="md:col-span-2"
            icon={CheckCheck}
            title="교차 검증"
            body="같은 공급자의 두 번째 모델에 같은 문제를 병렬로 질문합니다. 일치하면 안심하고, 다르면 두 답을 함께 봅니다."
          >
            <Badge variant="outline" className="mt-5 w-fit border-amber-400/20 text-amber-300">
              2개 모델 · 2배 요청
            </Badge>
          </FeatureCard>

          <FeatureCard
            className="md:col-span-2"
            icon={Users}
            title="회의 안전 모드"
            body="Zoom, Teams, Webex, Meet 계열 프로세스나 창 제목이 감지되면 화면 기반 표시를 숨기고 LED·밝기만 사용합니다."
          />

          <FeatureCard
            className="md:col-span-2"
            icon={KeyRound}
            title="로컬 우선"
            body="계정도, Cue 서버도, 텔레메트리도 없습니다. API 키는 Windows 자격증명 관리자에만 저장되고 화면은 지정한 공급자로만 전송됩니다."
          />

          <FeatureCard
            className="md:col-span-3"
            icon={Shield}
            title="생존 보호"
            body="선택적 예약 작업이 Cue가 강제 종료되면 다시 실행합니다. 관리자 모드에서는 CueWatchdog SYSTEM 서비스와 보호 복사본으로 한 단계 더 버팁니다."
          />

          <FeatureCard
            className="md:col-span-3"
            icon={RefreshCw}
            title="서명된 자동 업데이트"
            body="GitHub Releases의 서명된 새 버전을 확인합니다. 업데이트는 NSIS /UPDATE로 설치되어 기존 제거 프로그램의 정리 동작을 유지합니다."
          />
        </div>
      </div>
    </section>
  )
}
