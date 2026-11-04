import { useEffect, useRef } from 'react'
import { CURSOR_COLORS, CursorArrow } from './cursor'

const COUNT = 18
const DESKTOP_MS = 12000
const MOBILE_MS = 8000

export default function CursorIntro({ onDone }: { onDone: () => void }) {
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([])
  const doneRef = useRef(false)
  const pointer = useRef({ x: 0, y: 0, active: false })

  useEffect(() => {
    const done = () => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
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
      done()
    }
    window.addEventListener('click', onSkip)
    window.addEventListener('keydown', onSkip)

    const onMove = (event: PointerEvent) => {
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
      direction: index % 3 === 0 ? -1 : 1,
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
        const angle = cursor.angle + t * cursor.speed * cursor.direction
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
          x += (pointer.current.x - x) * 0.026
          y += (pointer.current.y - y) * 0.026
        }

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
