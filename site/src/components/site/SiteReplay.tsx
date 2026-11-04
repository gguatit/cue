import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { createCursorReplay, type ReplayController } from '@/vendor/cursor-replay'
import { useReducedMotion } from '@/lib/useReducedMotion'

const palette = ['#ff4d6d', '#ffb703', '#2ec4b6', '#7b61ff', '#00a8e8', '#f97316']

const viewportOptions = () => {
  const wide = window.innerWidth >= 768
  return {
    duration: wide ? 8000 : 6500,
    cursors: wide ? 8 : 6,
    maxTargets: wide ? 180 : 100,
    colors: palette,
    ink: '#1c1917',
    surface: '#fffaf0',
    fullscreen: true,
    anchor: 'viewport' as const,
    lockScroll: false,
    reducedMotion: 'play' as const,
  }
}

// One replay per page load. A module flag survives StrictMode's effect replay
// and React's re-renders, but resets on a real refresh.
let bootIntroStarted = false

export default function SiteReplay() {
  const [playing, setPlaying] = useState(false)
  const reducedMotion = useReducedMotion()
  const controller = useRef<ReplayController | null>(null)
  const playingRef = useRef(false)

  const replayViewport = useCallback(() => {
    if (reducedMotion || playingRef.current) return
    controller.current?.destroy()
    let next: ReplayController
    try {
      next = createCursorReplay(document.body, viewportOptions())
    } catch {
      return
    }
    controller.current = next
    playingRef.current = true
    setPlaying(true)
    void next
      .play()
      .catch(() => undefined)
      .finally(() => {
        if (controller.current === next) controller.current = null
        playingRef.current = false
        setPlaying(false)
      })
  }, [reducedMotion])

  useEffect(() => {
    if (bootIntroStarted) return
    const timer = window.setTimeout(() => {
      if (bootIntroStarted) return
      bootIntroStarted = true
      replayViewport()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [replayViewport])

  useEffect(
    () => () => {
      controller.current?.destroy()
      controller.current = null
      playingRef.current = false
    },
    [],
  )

  return (
    <>
      <button
        type="button"
        onClick={replayViewport}
        disabled={playing || reducedMotion}
        title={
          reducedMotion ? '동작 줄이기 설정이 켜져 있습니다' : '지금 보이는 화면을 커서로 다시 그립니다'
        }
        className="fixed bottom-5 right-5 z-[80] inline-flex h-11 items-center gap-2 rounded-xl border-2 border-[#1c1917] bg-[#1c1917] px-4 text-sm font-semibold text-[#fffaf0] shadow-[4px_4px_0_#ffb703] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-[#292524] hover:shadow-[6px_6px_0_#ff4d6d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d] disabled:cursor-not-allowed disabled:opacity-55 sm:bottom-6 sm:right-6"
      >
        {playing ? (
          <Sparkles aria-hidden="true" className="size-4 animate-pulse" />
        ) : (
          <Play aria-hidden="true" className="size-4" />
        )}
        <span className="hidden sm:inline">
          {reducedMotion ? '동작 줄이기 켜짐' : playing ? '다시 그리는 중…' : '화면 다시 그리기'}
        </span>
        <span className="sm:hidden">Replay</span>
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {playing ? '보이는 화면을 다시 그리는 중입니다.' : ''}
      </p>
    </>
  )
}
