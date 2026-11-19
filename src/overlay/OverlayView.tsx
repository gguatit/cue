import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { listenEvent, overlayReady, streamDone, type Verification } from '../lib/tauri'
import { useSettings } from '../stores/settings'
import { useT } from '../i18n'
import { fadeFast } from '../lib/motion'
import { advanceStream, initialPace, type PaceState } from './streamPacing'

interface Payload {
  answer: string
  style: string
  text?: string
  verification?: Verification
  stream?: boolean
  final?: boolean
  id?: number
  peek?: string
  spotlight?: boolean
  spotlightX?: number
  spotlightY?: number
  highlight?: { x: number; y: number; w: number; h: number }
}

function HighlightMark({ box }: { box: NonNullable<Payload['highlight']> }) {
  return (
    <div
      className="pointer-events-none absolute rounded-md border-2 border-amber-400 bg-amber-300/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.16)]"
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
      }}
    />
  )
}

function verificationLabel(verification: Verification | undefined, t: (en: string, ko: string) => string): string {
  if (!verification) return ''
  if (verification.error) return t('Check failed', '검증 실패')
  if (!verification.matched) {
    return `${t('Models disagree', '모델 불일치')}: ${verification.secondary.join(', ')}`
  }
  if (verification.candidatesMatched === false) {
    return `${t('Top answer matches, alternates differ', '최상위 일치 · 후보 다름')}`
  }
  return t('Models agree', '모델 일치')
}

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  )
}

export default function OverlayView() {
  const t = useT()
  const [p, setP] = useState<Payload | null>(null)
  const [visible, setVisible] = useState(0)
  const targetRef = useRef('')
  const finalRef = useRef(false)
  const idRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const paceRef = useRef<PaceState>(initialPace)
  const rafRef = useRef<number | null>(null)

  const finishStream = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    const id = idRef.current
    if (id !== null) {
      void streamDone(id, useSettings.getState().display.textMs).catch(() => {})
    }
  }, [])

  const pump = useCallback(() => {
    if (rafRef.current !== null) return
    let last = performance.now()
    const tick = (now: number) => {
      rafRef.current = null
      const dt = Math.min(100, Math.max(0, now - last))
      last = now
      const target = targetRef.current
      const next = advanceStream(paceRef.current, target, dt, finalRef.current)
      paceRef.current = next
      setVisible((prev) => (prev === next.visible ? prev : next.visible))
      if (next.visible >= target.length) {
        if (finalRef.current) finishStream()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [finishStream])

  const stopStream = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    targetRef.current = ''
    finalRef.current = false
    idRef.current = null
    doneRef.current = false
    paceRef.current = initialPace
    setVisible(0)
  }, [])

  useEffect(() => {
    const un = listenEvent<Payload>('overlay-show', (event) => {
      const payload = event.payload
      if (!payload.stream) {
        stopStream()
        setP(payload)
        return
      }

      const nextId = payload.id ?? null
      if (nextId !== idRef.current) {
        stopStream()
        idRef.current = nextId
        setP({
          answer: '',
          style: 'text',
          text: '',
          stream: true,
          peek: payload.peek,
          spotlight: payload.spotlight,
          spotlightX: payload.spotlightX,
          spotlightY: payload.spotlightY,
        })
      }
      const text = payload.text ?? ''
      targetRef.current = text
      finalRef.current = Boolean(payload.final)
      if (paceRef.current.visible > text.length) {
        paceRef.current = { ...paceRef.current, visible: text.length }
        setVisible(text.length)
      }
      if (reducedMotion()) {
        paceRef.current = { visible: text.length, carry: 0, pauseLeftMs: 0 }
        setVisible(text.length)
        if (finalRef.current) finishStream()
        return
      }
      pump()
    })
    void un.then((off) => {
      // The overlay is created on first use. Tell Rust the listener is ready
      // so the first answer is delivered instead of being lost during load.
      void overlayReady().catch(() => {})
      return off
    })
    return () => {
      void un.then((f) => f())
    }
  }, [finishStream, pump, stopStream])

  if (!p) return null
  const badge = verificationLabel(p.verification, t)
  const streamedText = p.stream ? targetRef.current.slice(0, visible) : (p.text ?? p.answer)
  if (p.spotlight) {
    const x = `${(p.spotlightX ?? 0.5) * 100}%`
    const y = `${(p.spotlightY ?? 0.5) * 100}%`
    const mask = `radial-gradient(circle at ${x} ${y}, transparent 0 150px, black 210px)`
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fadeFast}
          className="fixed inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-black/70"
            style={{ WebkitMaskImage: mask, maskImage: mask }}
          />
          {p.highlight && <HighlightMark box={p.highlight} />}
          <div
            className="absolute"
            style={{
              left: `clamp(180px, ${x}, calc(100vw - 180px))`,
              top: `clamp(120px, ${y}, calc(100vh - 120px))`,
              transform: 'translate(-50%, -50%)',
              width: 'min(360px, calc(100vw - 32px))',
            }}
          >
            <div className="overlay-glass max-h-[50vh] overflow-y-auto rounded-xl p-4 text-[#111] shadow-2xl">
              {p.peek && (
                <img
                  src={`data:image/jpeg;base64,${p.peek}`}
                  alt=""
                  className="mb-3 max-h-24 w-auto max-w-full rounded-md border border-black/10 object-contain"
                />
              )}
              {p.style === 'text' || p.stream ? (
                <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                  {streamedText}
                </div>
              ) : (
                <div className="text-center text-4xl font-bold">{p.answer}</div>
              )}
              {badge && (
                <div className="mt-3 rounded-md bg-white/75 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-amber-700">
                  {badge}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </MotionConfig>
    )
  }
  if (p.highlight) {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fadeFast}
          className="fixed inset-0 overflow-hidden"
        >
          <HighlightMark box={p.highlight} />
          <span className="overlay-glass absolute inset-x-0 bottom-5 mx-auto w-fit max-w-[calc(100vw-32px)] rounded-xl px-4 py-2 text-center text-2xl font-bold text-[#0b0b0e]">
            {p.answer}
          </span>
          {badge && (
            <span className="absolute inset-x-0 bottom-1 mx-auto w-fit rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-amber-700">
              {badge}
            </span>
          )}
        </motion.div>
      </MotionConfig>
    )
  }
  if (p.style === 'flash') {
    return (
      <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={fadeFast}
        className="fixed inset-0 flex items-center justify-center bg-black/55"
      >
        <span className="font-black leading-none text-white" style={{ fontSize: '22vw' }}>
          {p.answer}
        </span>
        {badge && (
          <span className="absolute inset-x-0 bottom-5 mx-auto w-fit rounded-lg bg-black/70 px-3 py-1.5 text-sm font-semibold text-amber-300">
            {badge}
          </span>
        )}
      </motion.div>
      </MotionConfig>
    )
  }
  if (p.style === 'text') {
    const text = p.stream ? targetRef.current.slice(0, visible) : (p.text ?? p.answer)
    const long = (p.stream ? targetRef.current.length : text.length) > 160
    return (
      <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={fadeFast}
        className="fixed inset-0 p-2"
      >
        <div
          className={`overlay-glass flex h-full w-full flex-col overflow-hidden rounded-xl p-5 text-[#111] leading-relaxed ${
            long ? 'text-[14px]' : 'text-[18px]'
          }`}
        >
          {p.peek && (
            <img
              src={`data:image/jpeg;base64,${p.peek}`}
              alt=""
              className="mb-3 max-h-20 w-auto max-w-full shrink-0 self-start rounded-md border border-black/10 object-contain"
            />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
      </motion.div>
      </MotionConfig>
    )
  }
  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fadeFast}
      className="fixed inset-0 flex flex-col p-2"
    >
      <span className="overlay-glass flex w-full min-w-0 flex-1 items-center justify-center break-words rounded-xl px-2 text-center text-4xl font-bold text-[#0b0b0e]">
        {p.answer}
      </span>
      {badge && (
        <span className="mx-auto mt-1 w-fit shrink-0 rounded-md border border-amber-700/15 bg-white/75 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-amber-700 shadow-sm backdrop-blur-md">
          {badge}
        </span>
      )}
    </motion.div>
    </MotionConfig>
  )
}
