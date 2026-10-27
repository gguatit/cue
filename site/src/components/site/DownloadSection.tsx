import { Download, KeyRound, MonitorCheck, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GithubIcon } from '@/components/site/icons'
import { README_URL, RELEASES_URL, REPO_URL } from '@/lib/site'
import Reveal from './Reveal'

const facts = [
  { icon: MonitorCheck, label: 'Windows 10/11 x64' },
  { icon: Download, label: '약 221MB 설치 파일' },
  { icon: ShieldCheck, label: '서명된 자동 업데이트' },
  { icon: KeyRound, label: '본인 API 키 필요' },
]

const steps = [
  'GitHub Releases에서 최신 설치 파일을 내려받습니다.',
  '설치 프로그램을 실행하고 UAC를 한 번 승인합니다.',
  '설정에서 API 키와 단축키를 등록합니다.',
]

export default function DownloadSection() {
  return (
    <section id="download" className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <Card className="relative overflow-hidden border-amber-400/15 bg-[#0c0c0a] ring-white/10">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-amber-400/10 blur-3xl" />
            <CardContent className="relative grid gap-10 p-6 md:p-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
              <div>
                <Badge
                  variant="outline"
                  className="border-amber-400/25 bg-amber-400/5 text-[10px] text-amber-200"
                >
                  DOWNLOAD FOR WINDOWS
                </Badge>
                <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
                  Windows에서 바로 시작하세요.
                </h2>
                <p className="mt-4 max-w-lg text-pretty text-sm leading-6 text-zinc-400 md:text-base">
                  Cue는 MIT로 공개된 데스크톱 앱입니다. 앱 자체는 무료이고, AI 사용료는
                  선택한 공급자의 요금제를 따릅니다. 계정을 만들 필요 없이 내 키로
                  시작하세요.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      size: 'lg',
                      className: 'h-11 gap-2 px-5 text-sm font-semibold',
                    })}
                  >
                    <Download aria-hidden="true" className="size-4" />
                    최신 버전 다운로드
                  </a>
                  <a
                    href={README_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'lg',
                      className: 'h-11 gap-2 border-white/10 bg-white/[0.02] px-5 text-sm',
                    })}
                  >
                    <GithubIcon className="size-4" />
                    README 보기
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                  {facts.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500"
                    >
                      <Icon aria-hidden="true" className="size-3 text-zinc-600" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                  install checklist
                </p>
                <ol className="mt-4 space-y-4">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-amber-400/20 bg-amber-400/[0.06] font-mono text-[10px] text-amber-300">
                        {index + 1}
                      </span>
                      <span className="text-sm leading-6 text-zinc-400">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 border-t border-white/5 pt-4">
                  <p className="text-xs leading-5 text-zinc-500">
                    설치 파일에는 WebView2 오프라인 패키지가 포함되어 221MB입니다.
                    perMachine 설치라 업데이트 때도 UAC가 한 번 필요합니다.
                  </p>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
                  >
                    GitHub에서 소스 보기
                    <GithubIcon className="size-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
