import { useEffect, useRef, useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { createCursorReplay, type ReplayController } from '@/vendor/cursor-replay'
import { useReducedMotion } from '@/lib/useReducedMotion'

const palette = ['#ff4d6d', '#ffb703', '#2ec4b6', '#7b61ff', '#00a8e8', '#f97316']
const INTRO_KEY = 'cue-replay-intro'

export default function SiteReplay() {
  const [playing, setPlaying] = useState(false)
  const controller = useRef<ReplayController | null>(null)
  const playingRef = useRef(false)
  const reducedMotion = useReducedMotion()

  useEffect(
    () => () => {
      controller.current?.destroy()
      controller.current = null
    },
    [],
  )

  const replay = () => {
    if (playingRef.current || reducedMotion) return
    const wide = window.innerWidth >= 768
    controller.current?.destroy()
    const next = createCursorReplay(document.body, {
      duration: wide ? 7000 : 5200,
      cursors: wide ? 8 : 6,
      maxTargets: wide ? 180 : 100,
      colors: palette,
      ink: '#1c1917',
      surface: '#fffaf0',
      fullscreen: true,
      anchor: 'viewport',
      lockScroll: false,
      reducedMotion: 'play',
    })
    controller.current = next
    playingRef.current = true
    setPlaying(true)
    void next.play().finally(() => {
      playingRef.current = false
      setPlaying(false)
      if (controller.current === next) controller.current = null
    })
  }

  useEffect(() => {
    if (reducedMotion) return
    try {
      if (sessionStorage.getItem(INTRO_KEY) === '1') return
    } catch {
      // Storage may be unavailable in private mode; still show the effect once.
    }
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(INTRO_KEY, '1')
      } catch {
        // Ignore storage failures.
      }
      replay()
    }, 1100)
    return () => window.clearTimeout(timer)
    // ponytail: the intro runs once per session; the fixed button replays it later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  return (
    <>
      <button
        type="button"
        onClick={replay}
        disabled={playing || reducedMotion}
        title={
          reducedMotion ? '동작 줄이기 설정이 켜져 있습니다' : '보이는 화면을 커서로 다시 그립니다'
        }
        className="fixed bottom-5 right-5 z-[80] inline-flex h-11 items-center gap-2 rounded-xl border-2 border-[#1c1917] bg-[#1c1917] px-4 text-sm font-semibold text-[#fffaf0] shadow-[4px_4px_0_#ffb703] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-[#292524] hover:shadow-[6px_6px_0_#ff4d6d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d] disabled:cursor-not-allowed disabled:opacity-55 sm:bottom-6 sm:right-6"
      >
        {playing ? (
          <Sparkles aria-hidden="true" className="size-4 animate-pulse" />
        ) : (
          <Play aria-hidden="true" className="size-4" />
        )}
        <span className="hidden sm:inline">
          {reducedMotion ? '동작 줄이기 켜짐' : playing ? '다시 그리는 중…' : '페이지 다시 그리기'}
        </span>
        <span className="sm:hidden">Replay</span>
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {playing ? '보이는 화면을 다시 그리는 중입니다.' : ''}
      </p>
    </>
  )
}
