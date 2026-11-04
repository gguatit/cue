import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { CURSOR_COLORS, CursorArrow } from './cursor'

const MIN_AGENTS = 6
const MAX_AGENTS = 35

type BuilderState = { agents: number; built: number }
const BuilderContext = createContext<BuilderState>({ agents: 0, built: 0 })

export function useBuilderState() {
  return useContext(BuilderContext)
}

type Worker = {
  x: number
  y: number
  target: HTMLElement | null
  startX: number
  startY: number
  startedAt: number
  duration: number
}

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return r.bottom > 24 && r.top < window.innerHeight - 24 && r.width > 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function PageBuilder({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const [state, setState] = useState<BuilderState>({ agents: 0, built: 0 })
  const stateRef = useRef(state)
  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([])
  const hudRef = useRef<HTMLDivElement>(null)
  const hudLabelRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-build]'))
    if (!targets.length) return

    if (reduced) {
      targets.forEach((el) => el.classList.add('is-built'))
      setState({ agents: 0, built: targets.length })
      return () => {
        targets.forEach((el) => el.classList.remove('is-built'))
      }
    }

    targets.forEach((el) => el.classList.remove('is-built', 'is-building'))
    document.documentElement.dataset.buildActive = ''
    const built = new Set<HTMLElement>()
    const queued = new Set<HTMLElement>()
    const active = new Set<HTMLElement>()
    const queue: HTMLElement[] = []
    const workers: Worker[] = Array.from({ length: MAX_AGENTS }, (_, index) => ({
      x: (index * 137) % Math.max(1, window.innerWidth - 40) + 20,
      y: (index * 83) % Math.max(1, window.innerHeight - 40) + 20,
      target: null,
      startX: 0,
      startY: 0,
      startedAt: 0,
      duration: 500,
    }))

    const updateAgents = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
      const next = Math.min(
        MAX_AGENTS,
        MIN_AGENTS + Math.round(progress * (MAX_AGENTS - MIN_AGENTS)),
      )
      if (next !== stateRef.current.agents) {
        stateRef.current = { ...stateRef.current, agents: next }
        setState(stateRef.current)
      }
    }

    const reveal = (el: HTMLElement) => {
      if (built.has(el)) return
      built.add(el)
      active.delete(el)
      queued.delete(el)
      el.classList.remove('is-building')
      el.classList.add('is-built')
      el.style.clipPath = ''
      stateRef.current = { ...stateRef.current, built: built.size }
      setState(stateRef.current)
    }

    const cancel = (worker: Worker) => {
      if (worker.target) {
        active.delete(worker.target)
        worker.target.classList.remove('is-building')
        worker.target.style.clipPath = ''
      }
      worker.target = null
    }

    const enqueue = (el: HTMLElement) => {
      if (built.has(el) || queued.has(el) || active.has(el)) return
      queued.add(el)
      queue.push(el)
    }

    const enqueueVisible = () => {
      for (const el of targets) {
        if (built.has(el)) continue
        const rect = el.getBoundingClientRect()
        // A target the reader has already scrolled past should never stay
        // invisible above the viewport. Finish it without an on-screen cursor.
        if (rect.bottom <= 0) {
          reveal(el)
        } else if (visible(el)) {
          enqueue(el)
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) enqueue(entry.target as HTMLElement)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    targets.forEach((el) => observer.observe(el))
    enqueueVisible()

    let raf = 0
    const loop = (now: number) => {
      const agentCount = stateRef.current.agents
      for (let index = 0; index < MAX_AGENTS; index++) {
        const cursorEl = cursorRefs.current[index]
        if (!cursorEl) continue
        cursorEl.classList.toggle('is-visible', index < agentCount)
      }

      for (let index = 0; index < agentCount; index++) {
        const worker = workers[index]
        const cursorEl = cursorRefs.current[index]
        if (!cursorEl) continue

        if (worker.target) {
          const el = worker.target
          const rect = el.getBoundingClientRect()
          if (!visible(el)) {
            if (rect.bottom <= 0) {
              reveal(el)
              worker.target = null
            } else {
              cancel(worker)
            }
          } else {
            const elapsed = now - worker.startedAt
            const t = clamp(elapsed / worker.duration, 0, 1)
            const move = clamp(t / 0.3, 0, 1)
            const draw = clamp((t - 0.3) / 0.7, 0, 1)
            const moveEase = move * move * (3 - 2 * move)
            const drawEase = draw * draw * (3 - 2 * draw)
            const targetX = clamp(rect.left + 10, 12, window.innerWidth - 38)
            const targetY = clamp(rect.top + 10, 12, window.innerHeight - 38)
            if (t < 0.3) {
              worker.x = worker.startX + (targetX - worker.startX) * moveEase
              worker.y = worker.startY + (targetY - worker.startY) * moveEase
            } else {
              worker.x = targetX + Math.max(0, rect.width - 20) * drawEase
              worker.y = targetY
            }
            el.style.clipPath = `inset(0 ${((1 - draw) * 100).toFixed(2)}% 0 0)`

            const hud = hudRef.current
            const label = hudLabelRef.current
            if (hud && label) {
              const rounded = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
              hud.classList.add('is-visible')
              hud.style.left = `${Math.round(rect.left)}px`
              hud.style.top = `${Math.round(rect.top)}px`
              hud.style.width = `${Math.round(rect.width)}px`
              hud.style.height = `${Math.round(rect.height)}px`
              hud.style.borderColor = CURSOR_COLORS[index % CURSOR_COLORS.length]
              hud.style.boxShadow = `0 0 0 1px ${CURSOR_COLORS[index % CURSOR_COLORS.length]}55`
              label.textContent = rounded
              label.style.background = CURSOR_COLORS[index % CURSOR_COLORS.length]
              label.style.color = '#fff'
            }

            if (t >= 1) {
              reveal(el)
              worker.target = null
            }
          }
        } else {
          queue.sort((a, b) => {
            const ar = a.getBoundingClientRect()
            const br = b.getBoundingClientRect()
            return ar.top - br.top || ar.left - br.left
          })
          const next = queue.find((candidate) => visible(candidate))
          if (next) {
            const position = queue.indexOf(next)
            if (position >= 0) queue.splice(position, 1)
            queued.delete(next)
            active.add(next)
            next.classList.add('is-building')
            worker.target = next
            worker.startX = worker.x
            worker.startY = worker.y
            worker.startedAt = now
            worker.duration = 470 + ((index * 53) % 180)
          } else {
            const drift = Math.sin(now * 0.0008 + index) * 0.08
            worker.x = clamp(worker.x + drift, 12, window.innerWidth - 38)
            worker.y = clamp(worker.y + Math.cos(now * 0.0006 + index) * 0.04, 12, window.innerHeight - 38)
          }
        }

        cursorEl.style.transform = `translate3d(${worker.x.toFixed(2)}px, ${worker.y.toFixed(2)}px, 0)`
      }

      if (!active.size && !queue.length && hudRef.current?.classList.contains('is-visible')) {
        hudRef.current.classList.remove('is-visible')
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onScroll = () => {
      updateAgents()
      enqueueVisible()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    updateAgents()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      delete document.documentElement.dataset.buildActive
      targets.forEach((el) => {
        el.classList.remove('is-built', 'is-building')
        el.style.clipPath = ''
      })
      hudRef.current?.classList.remove('is-visible')
    }
  }, [reduced])

  return (
    <BuilderContext.Provider value={state}>
      <div ref={rootRef}>{children}</div>
      {!reduced && (
        <>
          <div className="cursor-layer" aria-hidden="true">
            {Array.from({ length: MAX_AGENTS }, (_, index) => (
              <div
                key={index}
                ref={(node) => {
                  cursorRefs.current[index] = node
                }}
                className="cursor-pointer"
              >
                <CursorArrow color={CURSOR_COLORS[index % CURSOR_COLORS.length]} />
              </div>
            ))}
            <div ref={hudRef} className="measure-hud">
              <span ref={hudLabelRef} className="measure-label">
                0 × 0
              </span>
            </div>
          </div>
          <div className="agent-counter" aria-hidden="true">
            <span className="agent-dot" />
            {state.agents} agents
          </div>
          <div className="ruler" aria-hidden="true" />
        </>
      )}
    </BuilderContext.Provider>
  )
}
