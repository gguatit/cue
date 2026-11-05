import { useEffect, useState } from 'react'
import { listenEvent, overlayReady, type Verification } from '../lib/tauri'
import { useT } from '../i18n'

interface Payload {
  answer: string
  style: string
  text?: string
  verification?: Verification
}

function verificationLabel(verification: Verification | undefined, t: (en: string, ko: string) => string): string {
  if (!verification) return ''
  if (verification.error) return t('Check failed', '검증 실패')
  if (!verification.matched) {
    return `${t('Models disagree', '모델 불일치')}: ${verification.secondary.join(', ')}`
  }
  if (verification.candidatesMatched === false) {
    return t('Top answer matches, alternates differ', '최상위 일치 · 후보 다름')
  }
  return t('Models agree', '모델 일치')
}

export default function OverlayView() {
  const t = useT()
  const [p, setP] = useState<Payload | null>(null)
  useEffect(() => {
    const un = listenEvent<Payload>('overlay-show', (e) => setP(e.payload))
    void un.then((off) => {
      // The overlay is created on first use. Tell Rust the listener is ready
      // so the first answer is delivered instead of being lost during load.
      void overlayReady().catch(() => {})
      return off
    })
    return () => {
      void un.then((f) => f())
    }
  }, [])
  if (!p) return null
  const badge = verificationLabel(p.verification, t)
  if (p.style === 'flash') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/55">
        <span className="font-black leading-none text-white" style={{ fontSize: '22vw' }}>
          {p.answer}
        </span>
        {badge && (
          <span className="absolute inset-x-0 bottom-5 mx-auto w-fit rounded-lg bg-black/70 px-3 py-1.5 text-sm font-semibold text-amber-300">
            {badge}
          </span>
        )}
      </div>
    )
  }
  if (p.style === 'text') {
    const text = p.text ?? p.answer
    const long = text.length > 160
    return (
      <div className="fixed inset-0 p-2">
        <div
          className={`h-full w-full overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-white/90 p-5 text-[#111] leading-relaxed shadow-[0_12px_32px_rgba(0,0,0,0.16)] backdrop-blur-sm ${
            long ? 'text-[14px]' : 'text-[18px]'
          }`}
        >
          {text}
        </div>
      </div>
    )
  }
  return (
    <div className="fixed inset-0 flex flex-col p-2">
      <span className="flex w-full min-w-0 flex-1 items-center justify-center break-words rounded-xl border border-black/10 bg-white/90 px-2 text-center text-4xl font-bold text-[#0b0b0e] shadow-[0_12px_32px_rgba(0,0,0,0.16)] backdrop-blur-sm">
        {p.answer}
      </span>
      {badge && (
        <span className="mx-auto mt-1 w-fit shrink-0 rounded-md border border-amber-700/15 bg-white/90 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-amber-700">
          {badge}
        </span>
      )}
    </div>
  )
}
