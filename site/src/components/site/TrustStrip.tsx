import { Check, KeyRound, Monitor, ShieldCheck, WifiOff } from 'lucide-react'

const items = [
  { icon: Monitor, label: 'Windows 10/11 x64' },
  { icon: WifiOff, label: '계정·서버·텔레메트리 없음' },
  { icon: KeyRound, label: '내 API 키는 로컬에' },
  { icon: ShieldCheck, label: '서명된 자동 업데이트' },
  { icon: Check, label: 'MIT 라이선스' },
]

export default function TrustStrip() {
  return (
    <section aria-label="주요 특징" className="border-y border-white/5 bg-white/[0.015]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 text-xs text-zinc-500 md:px-8">
        {items.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-2">
            <Icon aria-hidden="true" className="size-3.5 text-amber-400/80" />
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
