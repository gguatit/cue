import { GithubIcon } from '@/components/site/icons'
import {
  CHANGELOG_URL,
  ISSUES_URL,
  LICENSE_URL,
  README_URL,
  RELEASES_URL,
  REPO_URL,
} from '@/lib/site'

const links = [
  { label: 'GitHub', href: REPO_URL },
  { label: 'Releases', href: RELEASES_URL },
  { label: 'README', href: README_URL },
  { label: 'Changelog', href: CHANGELOG_URL },
  { label: 'License', href: LICENSE_URL },
  { label: 'Issues', href: ISSUES_URL },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-black/20">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <a href="#top" className="inline-flex items-center gap-2.5" aria-label="Cue 홈">
              <img
                src="/brand/icon.png"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-lg ring-1 ring-white/10"
              />
              <span className="text-sm font-semibold text-zinc-100">Cue</span>
            </a>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Windows 시험 환경을 위한 조용한 AI 보조. 로컬 우선, 계정 없음, 서명된
              업데이트.
            </p>
            <p className="mt-4 font-mono text-[10px] leading-5 text-zinc-600">
              Cue is not affiliated with any exam provider.
              <br />
              시험 규정을 확인하고 책임 있게 사용하세요.
            </p>
          </div>

          <nav aria-label="바닥글 링크" className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] text-zinc-600">
            © 2026 kalpha · MIT License · Made for Windows
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <GithubIcon className="size-3.5" />
            gguatit/cue
          </a>
        </div>
      </div>
    </footer>
  )
}
