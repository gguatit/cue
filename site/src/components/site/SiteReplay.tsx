import { useEffect, useRef, useState } from 'react'
import { createCursorReplay, type ReplayController } from '@/vendor/cursor-replay'
import { useReducedMotion } from '@/lib/useReducedMotion'

const palette = ['#ff4d6d', '#ffb703', '#2ec4b6', '#7b61ff', '#00a8e8', '#f97316']

let bootStarted = false

export default function SiteReplay() {
  const reducedMotion = useReducedMotion()
  const [booting, setBooting] = useState(true)
  const controller = useRef<ReplayController | null>(null)

  useEffect(() => {
    if (reducedMotion) {
      setBooting(false)
      return
    }
    if (bootStarted) {
      setBooting(false)
      return
    }

    const timer = window.setTimeout(() => {
      if (bootStarted) return
      bootStarted = true
      const wide = window.innerWidth >= 768
      let replay: ReplayController
      try {
        replay = createCursorReplay(document.body, {
          duration: wide ? 3600 : 3000,
          cursors: wide ? 8 : 5,
          maxTargets: wide ? 160 : 90,
          colors: palette,
          ink: '#1c1917',
          surface: '#fffaf0',
          fullscreen: true,
          lockScroll: false,
        })
      } catch {
        setBooting(false)
        return
      }
      controller.current = replay
      void replay
        .play()
        .catch(() => undefined)
        .finally(() => {
          if (controller.current === replay) controller.current = null
          setBooting(false)
        })
    }, 30)

    return () => {
      window.clearTimeout(timer)
      controller.current?.destroy()
      controller.current = null
    }
  }, [reducedMotion])

  return booting ? (
    <div
      aria-hidden="true"
      data-cursor-replay
      className="pointer-events-none fixed inset-0 z-[2147482999] bg-[#fffaf0]"
    />
  ) : null
}
