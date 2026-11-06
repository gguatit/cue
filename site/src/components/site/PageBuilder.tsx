import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { CURSOR_COLORS, CursorGlyph, type CursorVariant } from './cursor'

const MIN_AGENTS = 19
const MAX_AGENTS = 44
const MIN_MOBILE = 10
const MAX_MOBILE = 26
const MAX_CONCURRENT = 12

function cursorVariant(index: number): CursorVariant {
  if (index % 7 === 0) return 'beam'
  if (index % 11 === 0) return 'cross'
  if (index % 5 === 0) return 'resize'
  return 'arrow'
}

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
  homeX: number
  homeY: number
  angle: number
  desiredAngle: number
  mode: 'orbit' | 'chase' | 'roam'
  modeUntil: number
  orbitAngle: number
  orbitRadius: number
  orbitSpeed: number
  roamX: number
  roamY: number
  roamUntil: number
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

type Token = {
  x: number
  y: number
  text: string
  color: string
  born: number
  life: number
}

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

export default function PageBuilder({
  children,
  cursorsEnabled = true,
  particlesEnabled = true,
}: {
  children: ReactNode
  cursorsEnabled?: boolean
  particlesEnabled?: boolean
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
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const anchor = { x: pointer.x, y: pointer.y }
    let startleUntil = 0
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    const desktop = window.innerWidth >= 768
    const orbitBase = desktop ? 92 : 48
    const orbitSpread = desktop ? 24 : 12
    const workers: Worker[] = Array.from({ length: MAX_AGENTS }, (_, index) => {
      const x = (index * 137) % Math.max(1, window.innerWidth - 40) + 20
      const y = (index * 83) % Math.max(1, window.innerHeight - 40) + 20
      return {
        x,
        y,
        homeX: x,
        homeY: y,
        angle: 0,
        desiredAngle: 0,
        mode: index % 6 === 0 ? 'chase' : index % 4 === 0 ? 'roam' : 'orbit',
        modeUntil: 0,
        orbitAngle: (Math.PI * 2 * index) / MAX_AGENTS,
        orbitRadius: orbitBase + (index % 8) * orbitSpread,
        orbitSpeed: 0.0002 + (index % 7) * 0.000032,
        roamX: x,
        roamY: y,
        roamUntil: 0,
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
    const tokens: Token[] = []
    const rings: Ring[] = []
    let lastInteractionAt = 0

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
      if (cursorsRef.current) startleUntil = performance.now() + 460
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
        anchor.x += (pointer.x - anchor.x) * 0.11
        anchor.y += (pointer.y - anchor.y) * 0.11

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
          if (active.size < MAX_CONCURRENT && queue.length) {
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
            if (now > worker.modeUntil) {
              const roll = (index * 7 + Math.floor(now / 1000)) % 10
              worker.mode = roll === 0 ? 'chase' : roll < 3 ? 'roam' : 'orbit'
              worker.modeUntil = now + 4200 + ((index * 431) % 2600)
            }

            let targetX = worker.x
            let targetY = worker.y

            if (now < startleUntil) {
              const dx = worker.x - pointer.x
              const dy = worker.y - pointer.y
              const distance = Math.hypot(dx, dy) || 1
              targetX = pointer.x + (dx / distance) * (150 + (index % 5) * 24)
              targetY = pointer.y + (dy / distance) * (120 + (index % 4) * 22)
            } else if (worker.mode === 'chase' && agentCount > 2) {
              const partner = workers[(index + 7) % agentCount]
              const chaseAngle = now * 0.0012 + index * 1.7
              targetX = partner.x + Math.cos(chaseAngle) * 46
              targetY = partner.y + Math.sin(chaseAngle) * 34
            } else if (worker.mode === 'roam') {
              if (
                now > worker.roamUntil ||
                Math.hypot(worker.x - worker.roamX, worker.y - worker.roamY) < 28
              ) {
                const angle = Math.random() * Math.PI * 2
                const distance =
                  110 + Math.random() * Math.max(80, Math.min(window.innerWidth, window.innerHeight) * 0.18)
                worker.roamX = clamp(
                  anchor.x + Math.cos(angle) * distance,
                  30,
                  window.innerWidth - 40,
                )
                worker.roamY = clamp(
                  anchor.y + Math.sin(angle) * distance * 0.8,
                  30,
                  window.innerHeight - 40,
                )
                worker.roamUntil = now + 2600 + Math.random() * 2400
              }
              targetX = worker.roamX
              targetY = worker.roamY
            } else {
              const orbit = worker.orbitAngle + now * worker.orbitSpeed
              targetX =
                anchor.x +
                Math.cos(orbit) * worker.orbitRadius +
                Math.sin(now * 0.0009 + index) * 9
              targetY =
                anchor.y +
                Math.sin(orbit) * worker.orbitRadius * 0.72 +
                Math.cos(now * 0.0007 + index * 1.3) * 10
            }

            let separationX = 0
            let separationY = 0
            for (let other = 0; other < agentCount; other++) {
              if (other === index) continue
              const dx = worker.x - workers[other].x
              const dy = worker.y - workers[other].y
              const distance = Math.hypot(dx, dy)
              if (distance > 0.01 && distance < 34) {
                separationX += (dx / distance) * (34 - distance)
                separationY += (dy / distance) * (34 - distance)
              }
            }

            worker.x +=
              (clamp(targetX + separationX * 0.45, 24, window.innerWidth - 40) - worker.x) * 0.04
            worker.y +=
              (clamp(targetY + separationY * 0.45, 24, window.innerHeight - 40) - worker.y) * 0.04
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

        if (now - lastInteractionAt > 3800) {
          let pair: [number, number] | null = null
          let closest = 150
          for (let first = 0; first < agentCount; first++) {
            for (let second = first + 1; second < agentCount; second++) {
              const distance = Math.hypot(
                workers[first].x - workers[second].x,
                workers[first].y - workers[second].y,
              )
              if (distance < closest) {
                closest = distance
                pair = [first, second]
              }
            }
          }
          if (pair) {
            lastInteractionAt = now
            const [first, second] = pair
            const a = workers[first]
            const b = workers[second]
            const same = (first + second) % 2 === 0
            const token: Token = {
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2 - 20,
              text: same ? '✓' : '?',
              color: same ? '#0ACF83' : '#FFC700',
              born: now,
              life: 900,
            }
            tokens.push(token)
            if (tokens.length > 2) tokens.shift()
            rings.push({
              x: token.x,
              y: token.y,
              born: now,
              life: 620,
              color: token.color,
            })
            for (let spark = 0; spark < 6; spark++) {
              const angle = Math.random() * Math.PI * 2
              sparks.push({
                x: token.x,
                y: token.y,
                vx: Math.cos(angle) * 1.4,
                vy: Math.sin(angle) * 1.4,
                born: now,
                life: 420,
                color: token.color,
                size: 1.6,
                shape: SPARK_SHAPES[(spark + first + second) % SPARK_SHAPES.length],
                rotation: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.2,
              })
            }
          }
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
          spark.x += spark.vx
          spark.y += spark.vy
          spark.vy += 0.018
          spark.rotation += spark.spin
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

        if (cursorsOn) {
        for (let index = tokens.length - 1; index >= 0; index--) {
          const token = tokens[index]
          const age = now - token.born
          if (age > token.life) {
            tokens.splice(index, 1)
            continue
          }
          const progress = age / token.life
          ctx.globalAlpha = 1 - progress
          ctx.fillStyle = token.color
          ctx.beginPath()
          ctx.arc(token.x, token.y, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = '10px "JetBrains Mono", monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(token.text, token.x, token.y + 0.5)
        }
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
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    updateAgents()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('resize', resizeCanvas)
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
                  <CursorGlyph
                    color={CURSOR_COLORS[index % CURSOR_COLORS.length]}
                    variant={cursorVariant(index)}
                  />
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
