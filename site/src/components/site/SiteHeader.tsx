import { GithubIcon } from '@/components/site/icons'
import { NAV, RELEASES_URL, REPO_URL } from '@/lib/site'

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#dfe3e8] bg-[#f8f9fa]/95 backdrop-blur-md">
      <div className="page-shell flex h-[68px] items-center justify-between gap-6">
        <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="Cue 홈">
          <img
            src="/brand/icon.png"
            alt=""
            width={30}
            height={30}
            className="size-[30px] rounded-[7px] grayscale"
          />
          <span className="text-[15px] font-semibold tracking-[-0.04em]">Cue</span>
          <span className="hidden border-l border-[#dfe3e8] pl-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a9098] lg:inline">
            Windows only
          </span>
        </a>

        <nav aria-label="주요 섹션" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] text-[#5f6670] transition-colors hover:text-[#121417]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 저장소"
            className="flex size-9 items-center justify-center text-[#5f6670] transition-colors hover:text-[#121417]"
          >
            <GithubIcon className="size-[17px]" />
          </a>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 bg-[#121417] px-4 text-[12px] font-medium text-[#f8f9fa] transition-colors hover:bg-[#2b2f35]"
          >
            다운로드
          </a>
        </div>
      </div>
    </header>
  )
}
