import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { GithubIcon } from '@/components/site/icons'
import { NAV, RELEASES_URL, REPO_URL } from '@/lib/site'

export default function SiteHeader() {
  const [progress, setProgress] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const root = document.documentElement
      const max = root.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
      setScrolled(window.scrollY > 8)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    const sections = NAV.map((item) => document.querySelector(item.href)).filter(
      (section): section is Element => section !== null,
    )
    if (!sections.length || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries.find((entry) => entry.isIntersecting)
        if (current) setActive(`#${current.target.id}`)
      },
      { rootMargin: '-35% 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-0.5 bg-white/5"
      >
        <div
          className="h-full origin-left bg-gradient-to-r from-amber-400 to-amber-200 transition-transform duration-150"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? 'border-white/10 bg-background/95 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.9)]'
            : 'border-white/5 bg-background/75'
        }`}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between px-5 transition-[height] duration-300 md:px-8 ${
            scrolled ? 'h-14' : 'h-16'
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5" aria-label="Cue 홈">
            <img
              src="/brand/icon.png"
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-lg ring-1 ring-white/10"
            />
            <span className="text-sm font-semibold tracking-tight text-zinc-100">Cue</span>
            <span className="hidden rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:inline">
              for Windows
            </span>
          </a>

          <nav aria-label="주요 섹션" className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => {
              const current = active === item.href
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={current ? 'location' : undefined}
                  className={`relative py-1 text-sm transition-colors ${
                    current ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-amber-400 transition-transform duration-300 ${
                      current ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 저장소"
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
            >
              <GithubIcon className="size-4" />
            </a>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: 'sm', className: 'h-9 gap-1.5 px-3.5' })}
            >
              <Download aria-hidden="true" className="size-3.5" />
              다운로드
            </a>
          </div>
        </div>
      </header>
    </>
  )
}
