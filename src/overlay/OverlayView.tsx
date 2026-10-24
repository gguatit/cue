import { useEffect, useState } from 'react'
import { listenEvent } from '../lib/tauri'

interface Payload {
  answer: string
  style: string
  text?: string
}

export default function OverlayView() {
  const [p, setP] = useState<Payload | null>(null)
  useEffect(() => {
    const un = listenEvent<Payload>('overlay-show', (e) => setP(e.payload))
    return () => {
      void un.then((f) => f())
    }
  }, [])
  if (!p) return null
  if (p.style === 'flash') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/55">
        <span className="font-black leading-none text-white" style={{ fontSize: '22vw' }}>
          {p.answer}
        </span>
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
    <div className="fixed inset-0 flex items-center justify-start p-2">
      <span className="flex h-full w-full items-center justify-center rounded-xl border border-white/15 bg-[#17171b]/95 text-4xl font-bold text-white">
        {p.answer}
      </span>
    </div>
  )
}
