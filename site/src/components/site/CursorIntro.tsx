import { useEffect, useRef } from 'react'
import { CURSOR_COLORS, CursorArrow } from './cursor'

const COUNT = 18
const DESKTOP_MS = 12000
const MOBILE_MS = 8000
const SKIP_AFTER_MS = 1800

export default function CursorIntro({ onDone }: { onDone: () => void }) {
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([])
  const doneRef = useRef(false)

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
    let skipTimer = 0
    const onSkip = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      done()
    }
    skipTimer = window.setTimeout(() => {
      window.addEventListener('click', onSkip)
      window.addEventListener('keydown', onSkip)
    }, SKIP_AFTER_MS)

    let raf = 0
    const start = performance.now()
    const cursors = Array.from({ length: COUNT }, (_, index) => ({
      angle: (Math.PI * 2 * index) / COUNT + Math.random() * 0.5,
      radius: 78 + (index % 5) * 28 + Math.random() * 18,
      speed: 0.00016 + (index % 4) * 0.000035,
      phase: Math.random() * Math.PI * 2,
      drift: 0.75 + Math.random() * 0.5,
    }))

    const frame = (now: number) => {
      const t = now - start
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const settle = Math.min(1, t / 3200)
      const radiusScale = 1 + Math.sin(settle * Math.PI) * 0.5
      for (let index = 0; index < COUNT; index++) {
        const el = cursorRefs.current[index]
        if (!el) continue
        const cursor = cursors[index]
        const angle = cursor.angle + t * cursor.speed * cursor.speed * 1000
        const wobble = Math.sin(t * 0.001 * cursor.drift + cursor.phase) * 14
        const x =
          cx +
          Math.cos(angle) * (cursor.radius * radiusScale + wobble) -
          9 * Math.sin(angle + 0.7)
        const y =
          cy +
          Math.sin(angle) * (cursor.radius * 0.72 * radiusScale + wobble) -
          9 * Math.cos(angle + 0.7)
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(
          angle * 18 +
          12
        ).toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(skipTimer)
      window.removeEventListener('click', onSkip)
      window.removeEventListener('keydown', onSkip)
      cancelAnimationFrame(raf)
      document.body.style.overflow = previousOverflow
    }
  }, [onDone])

  return (
    <div className="intro-screen grid-page" aria-label="Cue 인트로" role="status">
      {Array.from({ length: COUNT }, (_, index) => (
        <div
          key={index}
          ref={(node) => {
            cursorRefs.current[index] = node
          }}
          className="intro-cursor"
          aria-hidden="true"
        >
          <CursorArrow color={CURSOR_COLORS[index % CURSOR_COLORS.length]} />
        </div>
      ))}
      <div className="intro-logo">
        <img src="/brand/icon.png" alt="" width={56} height={56} />
        <span className="intro-word">Cue</span>
      </div>
      <p className="intro-meta">18 cursors · local-first · click / esc to skip</p>
    </div>
  )
}
