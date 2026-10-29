import { useEffect, useState } from 'react'
import { listenEvent, type Verification } from '../lib/tauri'
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
  if (verification.matched) return t('Models agree', '모델 일치')
  return `${t('Models disagree', '모델 불일치')}: ${verification.secondary.join(', ')}`
}

export default function OverlayView() {
  const t = useT()
  const [p, setP] = useState<Payload | null>(null)
  useEffect(() => {
    const un = listenEvent<Payload>('overlay-show', (e) => setP(e.payload))
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
          className={`h-full w-full overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-white/15 bg-[#17171b]/95 p-5 text-zinc-100 leading-relaxed ${
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
      <span className="flex w-full flex-1 items-center justify-center rounded-xl border border-white/15 bg-[#17171b]/95 text-4xl font-bold text-white">
        {p.answer}
      </span>
      {badge && (
        <span className="mt-1 shrink-0 px-1 text-center text-[11px] font-semibold leading-tight text-amber-300">
          {badge}
        </span>
      )}
    </div>
  )
}
