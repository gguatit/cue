import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { README_URL } from '@/lib/site'

export default function WarningBand() {
  return (
    <section aria-labelledby="warning-title" className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.045] p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="warning-title" className="text-base font-semibold text-amber-100">
              시험 규정을 먼저 확인하세요.
            </h2>
            <p className="mt-1.5 max-w-4xl text-pretty text-sm leading-6 text-zinc-400">
              Cue는 허용된 환경에서만 사용해야 합니다. 주최 기관의 규정에 따라 시험
              무효·퇴장·성적 취소·자격 박탈 같은 제재가 발생할 수 있습니다. 스텔스
              기능은 탐지 불가를 보장하지 않으며, 사용과 결과에 대한 책임은 사용자에게
              있습니다.
            </p>
            <a
              href={README_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 underline-offset-4 hover:underline"
            >
              전체 경고와 사용 규정 읽기
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
