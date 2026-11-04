import { GithubIcon } from '@/components/site/icons'
import { useBuilderState } from '@/components/site/PageBuilder'
import {
  CHANGELOG_URL,
  ISSUES_URL,
  LICENSE_URL,
  NAV,
  README_URL,
  RELEASES_URL,
  REPO_URL,
} from '@/lib/site'
import Reveal from './Reveal'

const resources = [
  { label: 'GitHub', href: REPO_URL },
  { label: 'Releases', href: RELEASES_URL },
  { label: 'README', href: README_URL },
  { label: 'Changelog', href: CHANGELOG_URL },
  { label: 'License', href: LICENSE_URL },
  { label: 'Issues', href: ISSUES_URL },
]

export default function SiteFooter({ cursorsEnabled = true }: { cursorsEnabled?: boolean }) {
  const { builders } = useBuilderState()

  return (
    <footer className="border-t border-[#dfe3e8] bg-[#f4f6f8]">
      <div className="page-shell py-12 md:py-16">
        <Reveal className="grid gap-12 md:grid-cols-[1fr_auto_auto] md:gap-20">
          <div className="max-w-sm">
            <a href="#top" className="inline-flex items-center gap-2.5" aria-label="Cue 홈">
              <img
                src="/brand/icon.png"
                alt=""
                width={30}
                height={30}
                className="size-[30px] rounded-[7px] grayscale"
              />
              <span className="text-[15px] font-semibold tracking-[-0.04em]">Cue</span>
            </a>
            <p className="mt-4 text-[12px] leading-5 text-[#6b7280]">
              Windows 시험 환경을 위한 조용한 AI 보조. 로컬 우선, 계정 없음, 서명된
              업데이트.
            </p>
            <p className="mt-4 font-mono text-[9px] leading-4 text-[#8a9098]">
              Cue is not affiliated with any exam provider.
              <br />
              시험 규정을 확인하고 책임 있게 사용하세요.
            </p>
          </div>

          <div>
            <p className="mono-label">sections</p>
            <nav aria-label="바닥글 섹션" className="mt-3 grid gap-2">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-[12px] text-[#5f6670] transition-colors hover:text-[#121417]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="mono-label">resources</p>
            <nav aria-label="바닥글 링크" className="mt-3 grid gap-2">
              {resources.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-[#5f6670] transition-colors hover:text-[#121417]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </Reveal>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#dfe3e8] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#8a9098]">
            © 2026 kalpha · MIT License · Made for Windows
          </p>
          <p className="font-mono text-[9px] leading-4 text-[#8a9098]">
            {!cursorsEnabled
              ? '커서 효과가 꺼져 있어 페이지를 바로 표시했습니다.'
              : builders > 0
                ? `이 페이지는 스크롤하는 동안 ${builders}개의 커서가 만들었습니다.`
                : '동작 줄이기 설정에 맞춰 페이지를 바로 표시했습니다.'}
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[9px] text-[#8a9098] transition-colors hover:text-[#121417]"
          >
            <GithubIcon className="size-3" />
            gguatit/cue
          </a>
        </div>
      </div>
    </footer>
  )
}
