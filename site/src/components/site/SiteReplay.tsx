import { useEffect, useRef, useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { createCursorReplay, type ReplayController } from '@/vendor/cursor-replay'
import { useReducedMotion } from '@/lib/useReducedMotion'

const palette = ['#ff4d6d', '#ffb703', '#2ec4b6', '#7b61ff', '#00a8e8', '#f97316']

const sectionOptions = {
  duration: 4200,
  cursors: 4,
  maxTargets: 80,
  colors: palette,
  ink: '#1c1917',
  surface: '#fffaf0',
  fullscreen: false,
  reducedMotion: 'play' as const,
}

export default function SiteReplay() {
  const [playing, setPlaying] = useState(false)
  const reducedMotion = useReducedMotion()
  const queue = useRef<Promise<void>>(Promise.resolve())
  const queued = useRef(new Set<HTMLElement>())
  const active = useRef(0)

  const enqueue = (run: () => Promise<void>) => {
    active.current += 1
    setPlaying(true)
    queue.current = queue.current
      .then(run)
      .catch(() => undefined)
      .finally(() => {
        active.current -= 1
        if (active.current === 0) setPlaying(false)
      })
  }

  const playSection = (section: HTMLElement) => {
    if (reducedMotion || queued.current.has(section)) return
    queued.current.add(section)
    enqueue(async () => {
      const rect = section.getBoundingClientRect()
      const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
      if (
        reducedMotion ||
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight ||
        visible < Math.min(rect.height, window.innerHeight) * 0.2
      ) {
        queued.current.delete(section)
        return
      }
      const replay = createCursorReplay(section, sectionOptions)
      const stopIfOffscreen = () => {
        const current = section.getBoundingClientRect()
        if (current.bottom <= 0 || current.top >= window.innerHeight) replay.cancel()
      }
      window.addEventListener('scroll', stopIfOffscreen, { passive: true })
      try {
        await replay.play()
      } finally {
        window.removeEventListener('scroll', stopIfOffscreen)
      }
    })
  }

  const replayViewport = () => {
    if (reducedMotion) return
    enqueue(async () => {
      const replay: ReplayController = createCursorReplay(document.body, {
        duration: window.innerWidth >= 768 ? 7000 : 5200,
        cursors: window.innerWidth >= 768 ? 8 : 6,
        maxTargets: window.innerWidth >= 768 ? 180 : 100,
        colors: palette,
        ink: '#1c1917',
        surface: '#fffaf0',
        fullscreen: true,
        anchor: 'viewport',
        lockScroll: false,
        reducedMotion: 'play',
      })
      await replay.play()
    })
  }

  useEffect(() => {
    if (reducedMotion) return
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('main > section'),
    )
    const visible = sections.filter((section) => {
      const rect = section.getBoundingClientRect()
      return rect.bottom > 0 && rect.top < window.innerHeight
    })
    visible.forEach((section) => playSection(section))

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) playSection(entry.target as HTMLElement)
        }
      },
      { threshold: 0.25 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
    // ponytail: each section replays once; scrolling must not restart the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

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
