import { Download } from 'lucide-react'
import { GithubIcon } from '@/components/site/icons'
import { README_URL, RELEASES_URL, REPO_URL } from '@/lib/site'
import Reveal from './Reveal'

const facts = [
  'Windows 10/11 x64',
  '약 221MB 설치 파일',
  '서명된 자동 업데이트',
  '본인 API 키 필요',
]

const steps = [
  'GitHub Releases에서 최신 설치 파일을 내려받습니다.',
  '설치 프로그램을 실행하고 UAC를 한 번 승인합니다.',
  '설정에서 API 키와 단축키를 등록합니다.',
]

export default function DownloadSection() {
  return (
    <section id="download" className="border-b border-[#e3e7eb]">
      <div className="page-shell py-16 md:py-24">
        <Reveal className="grid border border-[#dfe3e8] bg-white/45 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="p-6 md:p-10 lg:p-12">
            <p className="mono-label">download for windows</p>
            <h2 className="section-title mt-5 max-w-[12ch]">
              Windows에서
              <br />
              바로 시작하세요.
            </h2>
            <p className="body-copy mt-5 max-w-lg text-pretty">
              Cue는 MIT로 공개된 데스크톱 앱입니다. 앱 자체는 무료이고, AI 사용료는
              선택한 공급자의 요금제를 따릅니다. 계정을 만들 필요 없이 내 키로
              시작하세요.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 bg-[#121417] px-5 text-[13px] font-medium text-[#f8f9fa] transition-colors hover:bg-[#2b2f35]"
              >
                <Download aria-hidden="true" className="size-4" />
                최신 버전 다운로드
              </a>
              <a
                href={README_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 border border-[#d7dbe0] px-5 text-[13px] font-medium transition-colors hover:border-[#121417]"
              >
                <GithubIcon className="size-4" />
                README 보기
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[0.08em] text-[#7a818a]">
              {facts.map((fact) => (
                <span key={fact} data-build-item>{fact}</span>
              ))}
            </div>
          </div>

          <div className="border-t border-[#e3e7eb] p-6 md:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <p className="mono-label">install checklist</p>
            <ol className="mt-5 divide-y divide-[#e3e7eb] border-y border-[#e3e7eb]">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-4 py-4">
                  <span className="font-mono text-[9px] tracking-[0.12em] text-[#9aa0a8]">
                    0{index + 1}
                  </span>
                  <span className="text-[12px] leading-5 text-[#5f6670]">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] leading-5 text-[#7a818a]">
              설치 파일에는 WebView2 오프라인 패키지가 포함되어 221MB입니다. perMachine
              설치라 업데이트 때도 UAC가 한 번 필요합니다.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#5f6670] underline-offset-4 hover:text-[#121417] hover:underline"
            >
              GitHub에서 소스 보기
              <GithubIcon className="size-3" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
