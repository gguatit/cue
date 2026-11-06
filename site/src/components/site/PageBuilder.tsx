import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'
import type { CursorHandoff } from '@/lib/cursorHandoff'
import { CURSOR_COLORS, CursorGlyph } from './cursor'

const MIN_AGENTS = 32
const MAX_AGENTS = 72
const MIN_MOBILE = 16
const MAX_MOBILE = 40
const MAX_CONCURRENT = 12
const TRIANGLE_RADIUS = 180
const TRIANGLE_RADIUS_MOBILE = 90
const TRIANGLE_SPEED = 120
const TRIANGLE_SPEED_MOBILE = 90

function buildKind(el: HTMLElement): 'box' | 'text' | 'code' | 'media' {
  const tag = el.tagName.toLowerCase()
  if (tag === 'pre' || tag === 'code' || el.classList.contains('code-panel')) return 'code'
  if (tag === 'img' || tag === 'picture' || tag === 'video' || tag === 'canvas') return 'media'
  if (['h1', 'h2', 'h3', 'h4', 'p', 'span', 'strong', 'em', 'a', 'button'].includes(tag)) {
    return 'text'
  }
  return 'box'
}

type BuilderState = { agents: number; built: number; builders: number }
const BuilderContext = createContext<BuilderState>({ agents: 0, built: 0, builders: 0 })

export function useBuilderState() {
  return useContext(BuilderContext)
}

type Worker = {
  x: number
  y: number
  angle: number
  desiredAngle: number

  target: HTMLElement | null
  startX: number
  startY: number
  startedAt: number
  duration: number
  trail: Array<{ x: number; y: number }>
}

type SparkShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'line' | 'cross' | 'star'

type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
  color: string
  size: number
  shape: SparkShape
  rotation: number
  spin: number
}

const SPARK_SHAPES: SparkShape[] = [
  'circle',
  'square',
  'diamond',
  'triangle',
  'line',
  'cross',
  'star',
]

type Ring = {
  x: number
  y: number
  born: number
  life: number
  color: string
}

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return r.bottom > 24 && r.top < window.innerHeight - 24 && r.width > 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function turnToward(current: number, target: number, dt: number) {
  const delta = (((target - current + 540) % 360) + 360) % 360 - 180
  const step = clamp(delta * 0.12 * dt, -3.2 * dt, 3.2 * dt)
  const next = current + step
  const normalized = ((next % 360) + 360) % 360
  return normalized > 180 ? normalized - 360 : normalized
}

type Point = { x: number; y: number }
const ROUNDED_TRIANGLE = (() => {
  const vertices: Point[] = [
    { x: 0, y: -1 },
    { x: 0.866, y: 0.5 },
    { x: -0.866, y: 0.5 },
  ]
  const corner = 0.3
  const corners = vertices.map((vertex, index) => {
    const previous = vertices[(index + 2) % 3]
    const next = vertices[(index + 1) % 3]
    return {
      start: {
        x: vertex.x + (previous.x - vertex.x) * corner,
        y: vertex.y + (previous.y - vertex.y) * corner,
      },
      control: vertex,
      end: {
        x: vertex.x + (next.x - vertex.x) * corner,
        y: vertex.y + (next.y - vertex.y) * corner,
      },
    }
  })

  const points: Point[] = []
  const push = (point: Point) => points.push(point)
  for (let index = 0; index < 3; index++) {
    const current = corners[index]
    const next = corners[(index + 1) % 3]
    for (let step = 0; step <= 18; step++) {
      const t = step / 18
      const inverse = 1 - t
      push({
        x:
          inverse * inverse * current.start.x +
          2 * inverse * t * current.control.x +
          t * t * current.end.x,
        y:
          inverse * inverse * current.start.y +
          2 * inverse * t * current.control.y +
          t * t * current.end.y,
      })
    }
    for (let step = 1; step <= 22; step++) {
      const t = step / 22
      push({
        x: current.end.x + (next.start.x - current.end.x) * t,
        y: current.end.y + (next.start.y - current.end.y) * t,
      })
    }
  }

  let distance = 0
  const path = points.map((point, index) => {
    if (index > 0) {
      const previous = points[index - 1]
      distance += Math.hypot(point.x - previous.x, point.y - previous.y)
    }
    return { ...point, distance }
  })
  return { points: path, length: distance }
})()

function pointOnTriangle(distance: number): Point {
  const length = ROUNDED_TRIANGLE.length
  const target = ((distance % length) + length) % length
  const points = ROUNDED_TRIANGLE.points
  for (let index = 1; index < points.length; index++) {
    const current = points[index]
    if (target <= current.distance) {
      const previous = points[index - 1]
      const span = current.distance - previous.distance || 1
      const t = (target - previous.distance) / span
      return {
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      }
    }
  }
  return points[points.length - 1]
}

function triangleWave(distance: number, now: number, radius: number): Point {
  const point = pointOnTriangle(distance)
  const before = pointOnTriangle(distance - 0.01)
  const after = pointOnTriangle(distance + 0.01)
  const tx = after.x - before.x
  const ty = after.y - before.y
  const length = Math.hypot(tx, ty) || 1
  const amplitude = 2.5 / Math.max(radius, 1)
  const wave =
    Math.sin((distance / ROUNDED_TRIANGLE.length) * Math.PI * 4 - now * 0.0022) *
    amplitude
  return {
    x: point.x + (-ty / length) * wave,
    y: point.y + (tx / length) * wave,
  }
}

export default function PageBuilder({
  children,
  cursorsEnabled = true,
  particlesEnabled = true,
  handoff = null,
}: {
  children: ReactNode
  cursorsEnabled?: boolean
  particlesEnabled?: boolean
  handoff?: CursorHandoff | null
}) {
  const reduced = useReducedMotion()
  const [state, setState] = useState<BuilderState>({ agents: 0, built: 0, builders: 0 })
  const stateRef = useRef(state)
  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRefs = useRef<Array<HTMLDivElement | null>>([])
  const hudRef = useRef<HTMLDivElement>(null)
  const hudLabelRef = useRef<HTMLSpanElement>(null)
  const dimensionRef = useRef<HTMLDivElement>(null)
  const effectRef = useRef<HTMLCanvasElement>(null)
  const caretRef = useRef<HTMLDivElement>(null)
  const crosshairXRef = useRef<HTMLDivElement>(null)
  const crosshairYRef = useRef<HTMLDivElement>(null)
  const coordRef = useRef<HTMLDivElement>(null)
  const cursorsRef = useRef(cursorsEnabled)
  const particlesRef = useRef(particlesEnabled)

  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  useLayoutEffect(() => {
    cursorsRef.current = cursorsEnabled
    particlesRef.current = particlesEnabled
  }, [cursorsEnabled, particlesEnabled])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-build]'))
    const targets = groups.flatMap((group) => {
      const children = Array.from(group.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      )
      return children.length ? children : [group]
    })
    if (!targets.length) return
    targets.forEach((el) => {
      el.dataset.buildTarget = ''
      el.dataset.buildKind = buildKind(el)
    })

    if (reduced) {
      targets.forEach((el) => el.classList.add('is-built'))
      setState({ agents: 0, built: targets.length, builders: 0 })
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
    const initialPointer = handoff?.pointer ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }
    const pointer = {
      x: initialPointer.x,
      y: initialPointer.y,
      lastX: initialPointer.x,
      lastY: initialPointer.y,
      lastAt: performance.now(),
      speed: 0,
    }
    let anchorX = initialPointer.x
    let anchorY = initialPointer.y
    let formationBlend = 0
    let lastAgentCount = 0
    const handoffCursors = handoff?.cursors ?? []

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now()
      const dx = event.clientX - pointer.lastX
      const dy = event.clientY - pointer.lastY
      const distance = Math.hypot(dx, dy)
      if (distance < 2.5) {
        pointer.x = event.clientX
        pointer.y = event.clientY
        pointer.lastX = event.clientX
        pointer.lastY = event.clientY
        return
      }
      const elapsed = Math.max(1, now - pointer.lastAt)
      const velocity = Math.min(36, (distance / elapsed) * 16.667)
      pointer.speed = pointer.speed * 0.4 + velocity * 0.6
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.lastX = event.clientX
      pointer.lastY = event.clientY
      pointer.lastAt = now
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    const workers: Worker[] = Array.from({ length: MAX_AGENTS }, (_, index) => {
      const handoffPoint = handoffCursors[index]
      const angle = (index * 2.39996) % (Math.PI * 2)
      const radius = 34 + (index % 8) * 11
      const x = clamp(
        handoffPoint?.x ?? initialPointer.x + Math.cos(angle) * radius,
        20,
        window.innerWidth - 20,
      )
      const y = clamp(
        handoffPoint?.y ?? initialPointer.y + Math.sin(angle) * radius * 0.8,
        20,
        window.innerHeight - 20,
      )
      return {
        x,
        y,
        angle: 0,
        desiredAngle: 0,
        target: null,
        startX: 0,
        startY: 0,
        startedAt: 0,
        duration: 1000,
        trail: [],
      }
    })

    const updateAgents = () => {
      const desktop = window.innerWidth >= 768
      const minAgents = desktop ? MIN_AGENTS : MIN_MOBILE
      const maxAgents = desktop ? MAX_AGENTS : MAX_MOBILE
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
      const next = Math.min(
        maxAgents,
        minAgents + Math.round(progress * (maxAgents - minAgents)),
      )
      if (next !== stateRef.current.agents) {
        stateRef.current = { ...stateRef.current, agents: next }
        setState(stateRef.current)
      }
    }

    const builderSet = new Set<number>()
    const dimensions = new Map<HTMLElement, HTMLElement>()
    const canvas = effectRef.current
    const ctx = canvas?.getContext('2d')
    const sparks: Spark[] = []
    const rings: Ring[] = []
    let formationDistance = 0
    let spawnLatchUntil = performance.now() + 180
    const triangleCenter = { x: anchorX, y: anchorY }
    let triangleRadius = TRIANGLE_RADIUS

    const resizeCanvas = () => {
      if (!canvas || !ctx) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.effects-panel')) return
      if (!particlesRef.current) return
      const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
      rings.push({
        x: event.clientX,
        y: event.clientY,
        born: performance.now(),
        life: 620,
        color,
      })
      if (rings.length > 4) rings.shift()
      for (let index = 0; index < 20; index++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.8 + Math.random() * 2.6
        sparks.push({
          x: event.clientX,
          y: event.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          born: performance.now(),
          life: 520 + Math.random() * 420,
          color: CURSOR_COLORS[index % CURSOR_COLORS.length],
          size: 1.4 + Math.random() * 2.4,
          shape: SPARK_SHAPES[index % SPARK_SHAPES.length],
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.24,
        })
      }
      if (sparks.length > 110) sparks.splice(0, sparks.length - 110)
    }
    window.addEventListener('pointerdown', onPointerDown, { passive: true })

    const removeDimension = (el: HTMLElement) => {
      const tag = dimensions.get(el)
      if (!tag) return
      tag.remove()
      dimensions.delete(el)
    }

    const addDimension = (el: HTMLElement, colorIndex: number) => {
      if (!cursorsRef.current || dimensions.has(el) || !dimensionRef.current) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 12 || rect.height < 8) return
      const tag = document.createElement('span')
      tag.className = 'dimension-tag'
      tag.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
      tag.style.background = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length]
      dimensionRef.current.appendChild(tag)
      dimensions.set(el, tag)
      while (dimensions.size > 28) {
        const oldest = dimensions.keys().next().value as HTMLElement | undefined
        if (!oldest) break
        dimensions.get(oldest)?.remove()
        dimensions.delete(oldest)
      }
    }

    const fadeDimension = (el: HTMLElement) => {
      const tag = dimensions.get(el)
      if (!tag) return
      window.setTimeout(() => {
        tag.style.opacity = '0'
        window.setTimeout(() => {
          tag.remove()
          if (dimensions.get(el) === tag) dimensions.delete(el)
        }, 140)
      }, 1400)
    }

    const reveal = (el: HTMLElement, builderIndex = -1) => {
      if (built.has(el)) return
      built.add(el)
      active.delete(el)
      queued.delete(el)
      if (builderIndex >= 0) builderSet.add(builderIndex)
      el.classList.remove('is-building')
      el.classList.add('is-built')
      el.style.clipPath = ''
      if (builderIndex >= 0) fadeDimension(el)
      else removeDimension(el)
      stateRef.current = {
        ...stateRef.current,
        built: built.size,
        builders: Math.min(MAX_AGENTS, Math.max(builderSet.size, built.size)),
      }
      setState(stateRef.current)
    }

    const cancel = (worker: Worker) => {
      if (worker.target) {
        active.delete(worker.target)
        worker.target.classList.remove('is-building')
        worker.target.style.clipPath = ''
        removeDimension(worker.target)
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
        // Fast scrolling skips the visible window; finish above-the-fold targets
        // silently so the page is complete when the reader scrolls back.
        if (rect.bottom <= 0) reveal(el)
        else if (visible(el)) enqueue(el)
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
    let lastFrame = 0
    let staticRevealed = false
    const loop = (now: number) => {
      const dt = lastFrame ? Math.min(2.5, (now - lastFrame) / 16.667) : 1
      lastFrame = now
      const agentCount = stateRef.current.agents
      const cursorsOn = cursorsRef.current
      for (let index = 0; index < MAX_AGENTS; index++) {
        const cursorEl = cursorRefs.current[index]
        if (!cursorEl) continue
        cursorEl.classList.toggle('is-visible', index < agentCount)
      }

      if (!cursorsOn) {
        if (!staticRevealed) {
          workers.forEach((worker) => {
            worker.target = null
          })
          active.clear()
          queue.length = 0
          queued.clear()
          dimensions.forEach((tag) => tag.remove())
          dimensions.clear()
          hudRef.current?.classList.remove('is-visible')
          caretRef.current?.classList.remove('is-visible')
          crosshairXRef.current?.classList.remove('is-visible')
          crosshairYRef.current?.classList.remove('is-visible')
          coordRef.current?.classList.remove('is-visible')
          targets.forEach((el) => reveal(el))
          staticRevealed = true
        }
      } else {
        const dtSec = dt / 60
        pointer.speed *= Math.pow(0.94, dt)
        anchorX += (pointer.x - anchorX) * (1 - Math.exp(-10 * dtSec))
        anchorY += (pointer.y - anchorY) * (1 - Math.exp(-10 * dtSec))

        if (lastAgentCount === 0) {
          lastAgentCount = agentCount
        } else if (agentCount > lastAgentCount) {
          for (let index = lastAgentCount; index < agentCount; index++) {
            const worker = workers[index]
            const angle = index * 2.39996
            const radius = 34 + (index % 8) * 11
            worker.x = clamp(anchorX + Math.cos(angle) * radius, 20, window.innerWidth - 20)
            worker.y = clamp(anchorY + Math.sin(angle) * radius * 0.8, 20, window.innerHeight - 20)
          }
          lastAgentCount = agentCount
        } else if (agentCount < lastAgentCount) {
          lastAgentCount = agentCount
        }

        const desktop = window.innerWidth >= 768
        const boost = Math.min(0.7, pointer.speed / 40)
        const baseRadius = desktop ? TRIANGLE_RADIUS : TRIANGLE_RADIUS_MOBILE
        const baseSpeed = desktop ? TRIANGLE_SPEED : TRIANGLE_SPEED_MOBILE
        const availableX = Math.max(28, Math.min(anchorX, window.innerWidth - anchorX) - 24)
        const availableY = Math.max(28, Math.min(anchorY, window.innerHeight - anchorY) - 24)
        const fitRadius = Math.max(
          40,
          Math.min(baseRadius + boost * 20, availableX / 0.9, availableY / 1.05),
        )
        triangleRadius += (fitRadius - triangleRadius) * (1 - Math.exp(-4 * dtSec))
        triangleCenter.x += (anchorX - triangleCenter.x) * (1 - Math.exp(-8 * dtSec))
        triangleCenter.y += (anchorY - triangleCenter.y) * (1 - Math.exp(-8 * dtSec))
        formationDistance +=
          ((baseSpeed + boost * 26) / triangleRadius) * 0.0167 * dt

        const buildActive = active.size > 0 || queue.length > 0
        const canForm = !buildActive && now - pointer.lastAt > 4000 && pointer.speed < 2
        const blendTarget = canForm ? 1 : 0
        const blendSpeed = canForm ? 1.15 : 3.6
        formationBlend +=
          (blendTarget - formationBlend) * (1 - Math.exp(-blendSpeed * dtSec))

      for (let index = 0; index < agentCount; index++) {
        const worker = workers[index]
        const cursorEl = cursorRefs.current[index]
        if (!cursorEl) continue

        const previousX = worker.x
        const previousY = worker.y

        if (worker.target) {
          const el = worker.target
          const rect = el.getBoundingClientRect()
          if (!visible(el)) {
            if (rect.bottom <= 0) {
              reveal(el, index)
              worker.target = null
            } else {
              cancel(worker)
            }
          } else {
            const elapsed = now - worker.startedAt
            const t = clamp(elapsed / worker.duration, 0, 1)
            const move = clamp(t / 0.36, 0, 1)
            const draw = clamp((t - 0.36) / 0.64, 0, 1)
            const moveEase = move * move * (3 - 2 * move)
            const drawEase = draw * draw * (3 - 2 * draw)
            const kind = el.dataset.buildKind ?? 'box'
            const lineY =
              kind === 'text' || kind === 'code'
                ? rect.top + Math.min(30, rect.height * 0.55)
                : rect.top + 10
            const targetX = clamp(rect.left + 10, 12, window.innerWidth - 38)
            const targetY = clamp(lineY, 12, window.innerHeight - 38)
            if (t < 0.36) {
              worker.x = worker.startX + (targetX - worker.startX) * moveEase
              worker.y = worker.startY + (targetY - worker.startY) * moveEase
            } else {
              worker.x = clamp(
                targetX + Math.max(0, rect.width - 20) * drawEase,
                12,
                window.innerWidth - 38,
              )
              worker.y = targetY
            }
            el.style.clipPath = `inset(0 ${((1 - draw) * 100).toFixed(2)}% 0 0)`

            const caret = caretRef.current
            if (caret) {
              if (kind === 'text' || kind === 'code') {
                caret.classList.add('is-visible')
                caret.style.left = `${worker.x.toFixed(2)}px`
                caret.style.top = `${targetY.toFixed(2)}px`
                caret.style.height = `${clamp(rect.height * 0.5, 12, 28).toFixed(2)}px`
                caret.style.background = CURSOR_COLORS[index % CURSOR_COLORS.length]
              } else {
                caret.classList.remove('is-visible')
              }
            }

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
              reveal(el, index)
              worker.target = null
            }
          }
        } else {
          if (now > spawnLatchUntil && active.size < MAX_CONCURRENT && queue.length) {
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
              addDimension(next, index)
              worker.target = next
              worker.startX = worker.x
              worker.startY = worker.y
              worker.startedAt = now
              worker.duration = 1000 + ((index * 67) % 260)
            }
          }

          if (!worker.target) {
            const offset = (index / Math.max(1, agentCount)) * ROUNDED_TRIANGLE.length
            const distance = (formationDistance + offset) % ROUNDED_TRIANGLE.length
            const point = triangleWave(distance, now, triangleRadius)
            const triangleX = triangleCenter.x + point.x * triangleRadius
            const triangleY = triangleCenter.y + point.y * triangleRadius
            const ringCount = agentCount > 48 ? 6 : 4
            const ring = index % ringCount
            const seat = Math.floor(index / ringCount)
            const seats = Math.max(1, Math.ceil((agentCount - ring) / ringCount))
            const freeRadius = 48 + ring * 34
            const freePhase = (seat / seats) * Math.PI * 2 + now * 0.00045 + ring * 0.37
            const freeX = anchorX + Math.cos(freePhase) * freeRadius
            const freeY = anchorY + Math.sin(freePhase) * freeRadius * 0.82
            const targetX = freeX + (triangleX - freeX) * formationBlend
            const targetY = freeY + (triangleY - freeY) * formationBlend
            const follow = 1 - Math.exp(-5.2 * dtSec)
            worker.x +=
              (clamp(targetX, 24, window.innerWidth - 40) - worker.x) * follow
            worker.y +=
              (clamp(targetY, 24, window.innerHeight - 40) - worker.y) * follow
          }
        }

        const deltaX = worker.x - previousX
        const deltaY = worker.y - previousY
        if (Math.hypot(deltaX, deltaY) > 0.12) {
          worker.desiredAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI + 135
        }
        worker.angle = turnToward(worker.angle, worker.desiredAngle, dt)

        worker.trail.push({ x: worker.x, y: worker.y })
        if (worker.trail.length > 7) worker.trail.shift()
        cursorEl.style.transform = `translate3d(${worker.x.toFixed(2)}px, ${worker.y.toFixed(2)}px, 0) rotate(${worker.angle.toFixed(2)}deg)`
      }
      }

      if (ctx && canvas) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        if (particlesRef.current) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (cursorsOn) {
        if (formationBlend > 0.02) {
          ctx.strokeStyle = 'rgba(18, 20, 23, 0.22)'
          ctx.globalAlpha = 0.32 * formationBlend
          ctx.lineWidth = 0.8
          ctx.setLineDash([3, 7])
          ctx.beginPath()
          const railStart = ROUNDED_TRIANGLE.points[0]
          ctx.moveTo(
            triangleCenter.x + railStart.x * triangleRadius,
            triangleCenter.y + railStart.y * triangleRadius,
          )
          for (const point of ROUNDED_TRIANGLE.points) {
            ctx.lineTo(
              triangleCenter.x + point.x * triangleRadius,
              triangleCenter.y + point.y * triangleRadius,
            )
          }
          ctx.stroke()
        }
        ctx.setLineDash([])

        for (let index = 0; index < agentCount; index++) {
          const trail = workers[index].trail
          if (trail.length < 2) continue
          ctx.strokeStyle = CURSOR_COLORS[index % CURSOR_COLORS.length]
          ctx.globalAlpha = 0.16
          ctx.lineWidth = 1.1
          ctx.beginPath()
          ctx.moveTo(trail[0].x, trail[0].y)
          for (let point = 1; point < trail.length; point++) {
            ctx.lineTo(trail[point].x, trail[point].y)
          }
          ctx.stroke()
        }

        }

        for (let index = rings.length - 1; index >= 0; index--) {
          const ring = rings[index]
          const age = now - ring.born
          if (age > ring.life) {
            rings.splice(index, 1)
            continue
          }
          const progress = age / ring.life
          ctx.strokeStyle = ring.color
          ctx.globalAlpha = (1 - progress) * 0.7
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(ring.x, ring.y, 10 + progress * 54, 0, Math.PI * 2)
          ctx.stroke()
        }

        for (let index = sparks.length - 1; index >= 0; index--) {
          const spark = sparks[index]
          const age = now - spark.born
          if (age > spark.life) {
            sparks.splice(index, 1)
            continue
          }
          spark.x += spark.vx * dt
          spark.y += spark.vy * dt
          spark.vy += 0.018 * dt
          spark.rotation += spark.spin * dt
          ctx.save()
          ctx.translate(spark.x, spark.y)
          ctx.rotate(spark.rotation)
          ctx.fillStyle = spark.color
          ctx.globalAlpha = 1 - age / spark.life
          const size = spark.size
          ctx.beginPath()
          if (spark.shape === 'square') {
            ctx.fillRect(-size, -size, size * 2, size * 2)
          } else if (spark.shape === 'diamond') {
            ctx.moveTo(0, -size * 1.5)
            ctx.lineTo(size * 1.3, 0)
            ctx.lineTo(0, size * 1.5)
            ctx.lineTo(-size * 1.3, 0)
            ctx.closePath()
            ctx.fill()
          } else if (spark.shape === 'triangle') {
            ctx.moveTo(0, -size * 1.6)
            ctx.lineTo(size * 1.4, size * 1.1)
            ctx.lineTo(-size * 1.4, size * 1.1)
            ctx.closePath()
            ctx.fill()
          } else if (spark.shape === 'line') {
            ctx.fillRect(-size * 2.4, -size * 0.35, size * 4.8, size * 0.7)
          } else if (spark.shape === 'cross') {
            ctx.fillRect(-size * 2, -size * 0.4, size * 4, size * 0.8)
            ctx.fillRect(-size * 0.4, -size * 2, size * 0.8, size * 4)
          } else if (spark.shape === 'star') {
            for (let point = 0; point < 10; point++) {
              const radius = point % 2 === 0 ? size * 1.8 : size * 0.72
              const angle = -Math.PI / 2 + (point * Math.PI) / 5
              const px = Math.cos(angle) * radius
              const py = Math.sin(angle) * radius
              if (point === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
          } else {
            ctx.arc(0, 0, size, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        ctx.globalAlpha = 1
        }
      }

      for (const [el, tag] of dimensions) {
        const rect = el.getBoundingClientRect()
        const shown = rect.bottom > 28 && rect.top < window.innerHeight - 28
        tag.style.display = shown ? 'inline-flex' : 'none'
        if (shown) {
          tag.style.left = `${clamp(rect.left, 24, window.innerWidth - 96)}px`
          tag.style.top = `${clamp(rect.top - 20, 30, window.innerHeight - 28)}px`
        }
      }

      const hud = hudRef.current
      const crosshairX = crosshairXRef.current
      const crosshairY = crosshairYRef.current
      const coord = coordRef.current
      const hudVisible = !!hud?.classList.contains('is-visible')
      if (hudVisible && hud && crosshairX && crosshairY && coord) {
        const left = Number.parseFloat(hud.style.left) || 0
        const top = Number.parseFloat(hud.style.top) || 0
        crosshairX.classList.add('is-visible')
        crosshairY.classList.add('is-visible')
        crosshairX.style.left = `${left}px`
        crosshairY.style.top = `${top}px`
        coord.classList.add('is-visible')
        coord.style.left = `${clamp(left + 12, 24, window.innerWidth - 90)}px`
        coord.style.top = `${clamp(top + 12, 30, window.innerHeight - 30)}px`
        coord.textContent = `x ${Math.round(left)}  y ${Math.round(top)}`
      } else {
        crosshairX?.classList.remove('is-visible')
        crosshairY?.classList.remove('is-visible')
        coord?.classList.remove('is-visible')
      }

      if (!active.size && !queue.length && hudRef.current?.classList.contains('is-visible')) {
        hudRef.current.classList.remove('is-visible')
        caretRef.current?.classList.remove('is-visible')
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onScroll = () => {
      updateAgents()
      enqueueVisible()
    }
    const onVisibility = () => {
      if (document.hidden) return
      lastFrame = 0
      pointer.lastAt = performance.now()
      updateAgents()
      enqueueVisible()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    document.addEventListener('visibilitychange', onVisibility)
    updateAgents()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      delete document.documentElement.dataset.buildActive
      targets.forEach((el) => {
        el.classList.remove('is-built', 'is-building')
        el.style.clipPath = ''
      })
      dimensions.forEach((tag) => tag.remove())
      dimensions.clear()
      hudRef.current?.classList.remove('is-visible')
      caretRef.current?.classList.remove('is-visible')
      crosshairXRef.current?.classList.remove('is-visible')
      crosshairYRef.current?.classList.remove('is-visible')
      coordRef.current?.classList.remove('is-visible')
      targets.forEach((el) => {
        delete el.dataset.buildTarget
        delete el.dataset.buildKind
      })
    }
  }, [reduced])

  return (
    <BuilderContext.Provider value={state}>
      <div ref={rootRef}>{children}</div>
      {!reduced && (
        <>
          <canvas
            ref={effectRef}
            className={`effect-canvas${particlesEnabled ? '' : ' effects-hidden'}`}
            aria-hidden="true"
          />
          <div className={`effect-overlays${cursorsEnabled ? '' : ' effects-hidden'}`}>
            <div className="ruler ruler-top" aria-hidden="true">
              {Array.from({ length: 13 }, (_, index) => (
                <span key={index} style={{ left: `${index * 100}px` }}>
                  {index * 100}
                </span>
              ))}
            </div>
            <div className="ruler ruler-left" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} style={{ top: `${index * 100}px` }}>
                  {index * 100}
                </span>
              ))}
            </div>
            <div className="ruler-corner" aria-hidden="true" />
            <div ref={dimensionRef} className="dimension-layer" aria-hidden="true" />
            <div ref={crosshairXRef} className="build-crosshair crosshair-x" aria-hidden="true" />
            <div ref={crosshairYRef} className="build-crosshair crosshair-y" aria-hidden="true" />
            <div ref={coordRef} className="cursor-coord" aria-hidden="true">
              x 0 y 0
            </div>
            <div className="cursor-layer" aria-hidden="true">
              {Array.from({ length: MAX_AGENTS }, (_, index) => (
                <div
                  key={index}
                  ref={(node) => {
                    cursorRefs.current[index] = node
                  }}
                  className="cursor-pointer"
                >
                  <CursorGlyph color={CURSOR_COLORS[index % CURSOR_COLORS.length]} />
                </div>
              ))}
              <div ref={hudRef} className="measure-hud">
                <span className="measure-handle tl" />
                <span className="measure-handle tr" />
                <span className="measure-handle bl" />
                <span className="measure-handle br" />
                <span ref={hudLabelRef} className="measure-label">
                  0 × 0
                </span>
              </div>
              <div ref={caretRef} className="build-caret" />
            </div>
            <div className="agent-counter" aria-hidden="true">
              <span className="agent-dot" />
              {state.agents} cursors
            </div>
          </div>
        </>
      )}
    </BuilderContext.Provider>
  )
}
