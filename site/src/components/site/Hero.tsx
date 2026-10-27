import { useRef, useState, type PointerEvent } from 'react'
import { ArrowRight, Download, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { RELEASES_URL, SHORTCUT } from '@/lib/site'
import Reveal from './Reveal'

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const visualRef = useRef<HTMLDivElement>(null)

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !visualRef.current) return
    const rect = visualRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    visualRef.current.style.setProperty('--rx', `${(-y * 3.5).toFixed(2)}deg`)
    visualRef.current.style.setProperty('--ry', `${(x * 4.5).toFixed(2)}deg`)
    visualRef.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    visualRef.current.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }

  const resetTilt = () => {
    if (!visualRef.current) return
    visualRef.current.style.setProperty('--rx', '0deg')
    visualRef.current.style.setProperty('--ry', '0deg')
    visualRef.current.style.setProperty('--mx', '50%')
    visualRef.current.style.setProperty('--my', '50%')
  }

  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-glow" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

      <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16">
        <Reveal>
          <Badge
            variant="outline"
            className="gap-2 border-amber-400/25 bg-amber-400/5 px-2.5 py-1 text-[11px] text-amber-200/90"
          >
            <span className="size-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            WINDOWS 10/11 x64 · LOCAL-FIRST
          </Badge>

          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-zinc-50 sm:text-6xl lg:text-7xl">
            시험지 위에서,
            <br />
            <span className="text-amber-400">답을 조용히.</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
            단축키 하나로 화면을 읽고, 필요한 순간에만 답을 보여줍니다. 계정도,
            서버도, 텔레메트리도 없이 내 API 키로 동작하는 Windows 시험 보조
            도구입니다.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                size: 'lg',
                className: 'h-11 gap-2 px-5 text-sm font-semibold',
              })}
            >
              <Download aria-hidden="true" className="size-4" />
              최신 버전 다운로드
            </a>
            <Button
              variant="outline"
              size="lg"
              className="h-11 gap-2 border-white/10 bg-white/[0.02] px-5 text-sm"
              onClick={() => setDemoOpen(true)}
            >
              <Play aria-hidden="true" className="size-4" />
              데모 보기
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles aria-hidden="true" className="size-3 text-amber-400" />
              {SHORTCUT} + 클릭
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="size-3 text-emerald-400" />
              서명된 자동 업데이트
            </span>
            <span>약 221MB · UAC 1회</span>
          </div>
        </Reveal>

        <Reveal delay={120} className="relative">
          <div
            ref={visualRef}
            onPointerMove={onPointerMove}
            onPointerLeave={resetTilt}
            onPointerCancel={resetTilt}
            className="group relative mx-auto max-w-xl transition-transform duration-200 will-change-transform"
            style={{
              transform:
                'perspective(1200px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
            }}
          >
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-amber-400/5 blur-3xl transition-colors duration-300 group-hover:bg-amber-400/10" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60">
              <div className="flex h-9 items-center gap-2 border-b border-white/5 bg-white/[0.025] px-3.5">
                <span className="size-2 rounded-full bg-zinc-700" />
                <span className="size-2 rounded-full bg-zinc-700" />
                <span className="size-2 rounded-full bg-zinc-700" />
                <span className="ml-2 font-mono text-[10px] text-zinc-600">cue / overlay</span>
                <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-400/80">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                  live demo
                </span>
              </div>
              <img
                src={reducedMotion ? '/media/poster.png' : '/media/cue-promo.gif'}
                alt="Cue 앱 화면 미리보기"
                width={1920}
                height={1080}
                fetchPriority="high"
                className="aspect-[16/10] w-full object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(251,191,36,0.16), transparent 65%)',
                }}
              />
            </div>

            <div
              aria-hidden="true"
              className="absolute -bottom-5 -left-4 animate-float rounded-xl border border-amber-400/25 bg-[#14130d]/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-400/70">
                answer
              </p>
              <p className="mt-0.5 text-3xl font-semibold leading-none text-amber-300">B</p>
            </div>
            <div
              aria-hidden="true"
              className="absolute -right-3 top-14 animate-float-delayed rounded-lg border border-emerald-400/20 bg-[#0c1511]/95 px-3 py-2 shadow-xl shadow-black/50 backdrop-blur"
            >
              <p className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                모델 일치
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <a
          href="#features"
          className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-300"
        >
          기능 살펴보기
          <ArrowRight
            aria-hidden="true"
            className="size-3 transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden border-white/10 bg-black p-0 sm:max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Cue 사용 흐름 데모</DialogTitle>
            <DialogDescription>
              화면을 캡처해 질문하고 답을 표시하는 실제 사용 흐름을 보여 주는 영상입니다.
            </DialogDescription>
          </DialogHeader>
          <video
            className="aspect-video w-full bg-black"
            src="/media/cue-promo.mp4"
            poster="/media/poster.png"
            controls
            playsInline
            preload="metadata"
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}
