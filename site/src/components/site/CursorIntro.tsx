import { useEffect, useRef } from 'react'
import type { CursorHandoff } from '@/lib/cursorHandoff'
import { CURSOR_COLORS, CursorArrow } from './cursor'

const COUNT = 18
const DESKTOP_MS = 3600
const MOBILE_MS = 2800

export default function CursorIntro({
  onDone,
}: {
  onDone: (handoff?: CursorHandoff) => void
}) {
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([])
  const cursorPositions = useRef<Array<{ x: number; y: number }>>([])
  const doneRef = useRef(false)
  const pointer = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
  })

  useEffect(() => {
    const done = () => {
      if (doneRef.current) return
      doneRef.current = true
      const fallback = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      onDone({
        pointer: { x: pointer.current.x, y: pointer.current.y },
        cursors: Array.from({ length: COUNT }, (_, index) => cursorPositions.current[index] ?? fallback),
      })
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      done()
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(
      done,
      window.innerWidth >= 768 ? DESKTOP_MS : MOBILE_MS,
    )

    const onSkip = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event instanceof MouseEvent) {
        pointer.current = { x: event.clientX, y: event.clientY, active: true }
      }
      done()
    }
    window.addEventListener('click', onSkip)
    window.addEventListener('keydown', onSkip)

    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.intro-skip')) return
      pointer.current = { x: event.clientX, y: event.clientY, active: true }
    }
    const onLeave = () => {
      pointer.current.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    let raf = 0
    const start = performance.now()
    const cursors = Array.from({ length: COUNT }, (_, index) => ({
      angle: (Math.PI * 2 * index) / COUNT + Math.random() * 0.6,
      radius: 82 + (index % 6) * 24 + Math.random() * 28,
      speed: 0.00072 + (index % 5) * 0.00013,
      phase: Math.random() * Math.PI * 2,
      wobble: 16 + Math.random() * 20,
    }))

    const frame = (now: number) => {
      const t = now - start
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const settle = Math.min(1, t / 2800)
      const radiusScale = 1 + Math.sin(settle * Math.PI) * 0.35

      for (let index = 0; index < COUNT; index++) {
        const el = cursorRefs.current[index]
        if (!el) continue
        const cursor = cursors[index]
        const angle = cursor.angle - t * cursor.speed
        const wobble = Math.sin(t * 0.0016 + cursor.phase) * cursor.wobble
        let x =
          cx +
          Math.cos(angle) * (cursor.radius * radiusScale + wobble) -
          9 * Math.sin(angle + 0.7)
        let y =
          cy +
          Math.sin(angle) * (cursor.radius * 0.72 * radiusScale + wobble) -
          9 * Math.cos(angle + 0.7)

        if (pointer.current.active) {
          const dx = pointer.current.x - x
          const dy = pointer.current.y - y
          const distance = Math.hypot(dx, dy) || 1
          const pull = Math.min(0.008, 12 / distance)
          x += dx * pull
          y += dy * pull
        }

        cursorPositions.current[index] = { x, y }
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(
          (angle * 180) / Math.PI +
          24
        ).toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('click', onSkip)
      window.removeEventListener('keydown', onSkip)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
      document.body.style.overflow = previousOverflow
    }
  }, [onDone])

  return (
    <div className="intro-screen grid-page" aria-label="Cue 인트로">
      <div className="intro-cursors" aria-hidden="true">
        {Array.from({ length: COUNT }, (_, index) => (
          <div
            key={index}
            ref={(node) => {
              cursorRefs.current[index] = node
            }}
            className="intro-cursor"
          >
            <CursorArrow color={CURSOR_COLORS[index % CURSOR_COLORS.length]} />
          </div>
        ))}
      </div>
      <div className="intro-logo">
        <img src="/brand/icon.png" alt="" width={56} height={56} />
        <span className="intro-word">Cue</span>
      </div>
      <p className="intro-meta">18 cursors · local-first · click / esc to skip</p>
      <button type="button" className="intro-skip">
        건너뛰기
      </button>
    </div>
  )
}
