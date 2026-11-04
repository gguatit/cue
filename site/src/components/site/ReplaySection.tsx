import { useEffect, useRef, useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { createCursorReplay, type ReplayController } from '@/vendor/cursor-replay'
import { useReducedMotion } from '@/lib/useReducedMotion'
import Reveal from './Reveal'

const palette = ['#ff4d6d', '#ffb703', '#2ec4b6', '#7b61ff', '#00a8e8']

export default function ReplaySection() {
  const [playing, setPlaying] = useState(false)
  const controller = useRef<ReplayController | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(
    () => () => {
      controller.current?.destroy()
      controller.current = null
    },
    [],
  )

  const replay = () => {
    if (playing || reducedMotion) return
    controller.current?.destroy()
    const next = createCursorReplay(document.body, {
      duration: 4600,
      cursors: 8,
      maxTargets: 120,
      ink: '#1c1917',
      surface: '#fffaf0',
      colors: palette,
      reducedMotion: 'play',
    })
    controller.current = next
    setPlaying(true)
    void next.play().finally(() => {
      setPlaying(false)
      if (controller.current === next) controller.current = null
    })
  }

  return (
    <section id="replay" className="border-t border-white/5 bg-[#fffaf0] py-20 text-[#1c1917] md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#e03e5c]">
              CURSOR REPLAY / CLEAN ROOM
            </p>
            <h2 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              화면을 다시 그리는
              <br />
              커서.
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-[#57534e]">
              페이지의 위치와 텍스트만 읽고, 여러 개의 커서가 박스와 글자를 차례로
              그려 원래 화면을 다시 만듭니다. 원본 DOM은 그대로 두고, 끝나면 조용히
              사라집니다.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={replay}
                disabled={playing || reducedMotion}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] border-2 border-[#1c1917] bg-[#1c1917] px-5 text-sm font-semibold text-[#fffaf0] shadow-[4px_4px_0_#ff4d6d] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play aria-hidden="true" className="size-4" />
                {reducedMotion ? '동작 줄이기 설정 켜짐' : playing ? '다시 그리는 중…' : '페이지 다시 그리기'}
              </button>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#78716c]">
                <Sparkles aria-hidden="true" className="size-3 text-[#e03e5c]" />
                site effect demo
              </span>
            </div>
            <p className="mt-4 max-w-lg text-xs leading-6 text-[#78716c]">
              Swarm 코드나 에셋을 사용하지 않은 독립 구현입니다. Cue 앱의 기능이
              아니라 사이트 연출 데모이며, 움직임을 줄이는 설정에서는 재생하지
              않습니다.
            </p>
            <p className="sr-only" role="status" aria-live="polite">
              {playing ? '화면을 다시 그리는 중입니다.' : ''}
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative overflow-hidden rounded-[22px] border-2 border-[#1c1917] bg-white p-6 shadow-[10px_10px_0_#ffb703] sm:p-8">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[#a8a29e]">
                <span>cue / replay</span>
                <span className="inline-flex items-center gap-1.5 text-[#2ec4b6]">
                  <span className="size-1.5 rounded-full bg-[#2ec4b6]" />
                  ready
                </span>
              </div>
              <h3 className="mt-8 text-2xl font-semibold tracking-tight">다음 중 옳은 것은?</h3>
              <p className="mt-2 text-sm leading-6 text-[#78716c]">
                식물 세포에서 광합성이 일어나는 장소로 가장 알맞은 것을 고르시오.
              </p>
              <div className="mt-6 grid gap-2.5">
                {[
                  ['A', '광합성은 엽록체에서 일어난다.', 'bg-[#f7f3e8]'],
                  ['B', '광합성은 미토콘드리아에서 일어난다.', 'bg-[#ffe8ec]'],
                  ['C', '광합성은 세포막에서 일어난다.', 'bg-[#e6fbf8]'],
                  ['D', '광합성은 핵에서 일어난다.', 'bg-[#eee9ff]'],
                ].map(([key, text, tone]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-3 rounded-[10px] border border-[#1c1917] px-4 py-3 text-sm text-[#292524] ${tone}`}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#1c1917] font-mono text-[10px] text-[#fffaf0]">
                      {key}
                    </span>
                    {text}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2">
                {palette.map((color) => (
                  <span
                    key={color}
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <span className="ml-1 font-mono text-[10px] text-[#a8a29e]">
                  clean-room cursors
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
