import { ArrowUpRight } from 'lucide-react'
import { README_URL } from '@/lib/site'
import Reveal from './Reveal'

export default function WarningBand() {
  return (
    <section aria-labelledby="warning-title" className="border-b border-[#e3e7eb] bg-white/35">
      <div className="page-shell py-10 md:py-12">
        <Reveal className="grid gap-5 border-l-2 border-[#f24e1e] pl-5 sm:grid-cols-[auto_1fr] sm:gap-7 sm:pl-7">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#d92d20]">
            warning
          </span>
          <div>
            <h2 id="warning-title" className="text-[17px] font-medium tracking-[-0.02em]">
              시험 규정을 먼저 확인하세요.
            </h2>
            <p className="mt-2 max-w-4xl text-[13px] leading-6 text-[#5f6670]">
              Cue는 허용된 환경에서만 사용해야 합니다. 주최 기관의 규정에 따라 시험
              무효·퇴장·성적 취소·자격 박탈 같은 제재가 발생할 수 있습니다. 스텔스
              기능은 탐지 불가를 보장하지 않으며, 사용과 결과에 대한 책임은 사용자에게
              있습니다.
            </p>
            <a
              href={README_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium underline-offset-4 hover:underline"
            >
              전체 경고와 사용 규정 읽기
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
