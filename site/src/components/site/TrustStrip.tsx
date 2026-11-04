import { Check, KeyRound, Monitor, ShieldCheck, WifiOff } from 'lucide-react'
import Reveal from './Reveal'

const items = [
  { icon: Monitor, label: 'Windows 10/11 x64', tone: 'text-[#e03e5c]' },
  { icon: WifiOff, label: '계정·서버·텔레메트리 없음', tone: 'text-[#0f766e]' },
  { icon: KeyRound, label: '내 API 키는 로컬에', tone: 'text-[#6d28d9]' },
  { icon: ShieldCheck, label: '서명된 자동 업데이트', tone: 'text-[#b45309]' },
  { icon: Check, label: 'MIT 라이선스', tone: 'text-[#0369a1]' },
]

export default function TrustStrip() {
  return (
    <section aria-label="주요 특징" className="border-y border-[#1c1917]/10 bg-[#fffdf8]/80">
      <Reveal className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 text-xs text-[#6b5b4a] md:px-8">
        {items.map(({ icon: Icon, label, tone }) => (
          <span key={label} className="inline-flex items-center gap-2">
            <Icon aria-hidden="true" className={`size-3.5 ${tone}`} />
            {label}
          </span>
        ))}
      </Reveal>
    </section>
  )
}
