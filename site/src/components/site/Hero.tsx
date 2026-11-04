import { ArrowUpRight, Download } from 'lucide-react'
import { RELEASES_URL, SHORTCUT } from '@/lib/site'
import Reveal from './Reveal'

export default function Hero() {
  return (
    <section id="top" className="border-b border-[#e3e7eb]">
      <div className="page-shell grid gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-28">
        <Reveal>
          <p className="mono-label">Windows 10/11 x64 · local-first</p>
          <h1 className="display-title mt-6 max-w-[11ch]">
            시험지 위에서,
            <br />
            답을 조용히.
          </h1>
          <p className="body-copy mt-7 max-w-[46ch]">
            단축키 하나로 화면을 읽고, 필요한 순간에만 답을 보여줍니다. 계정도,
            서버도, 텔레메트리도 없이 내 API 키로 동작하는 Windows 시험 보조
            도구입니다.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
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
              href="#features"
              className="inline-flex h-11 items-center gap-2 border border-[#d7dbe0] px-5 text-[13px] font-medium transition-colors hover:border-[#121417]"
            >
              기능 살펴보기
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7a818a]">
            <span>{SHORTCUT} + 클릭</span>
            <span>약 221MB</span>
            <span>UAC 1회</span>
            <span>서명된 업데이트</span>
          </div>
        </Reveal>

        <Reveal className="relative">
          <div className="absolute -right-3 -top-3 hidden h-16 w-16 border-r border-t border-[#cfd4da] sm:block" />
          <div className="code-panel relative overflow-hidden">
            <div className="flex h-9 items-center gap-2 border-b border-white/10 px-3.5">
              <span className="size-1.5 rounded-full bg-white/25" />
              <span className="size-1.5 rounded-full bg-white/25" />
              <span className="size-1.5 rounded-full bg-white/25" />
              <span className="ml-2 font-mono text-[10px] text-white/40">cue / overlay</span>
              <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#0acf83]">
                <span className="size-1.5 rounded-full bg-[#0acf83]" />
                capture hidden
              </span>
            </div>
            <div className="p-5 font-mono text-[11px] leading-6 text-[#c9ced6] sm:p-6 sm:text-[12px]">
              <p className="text-white/30"># shortcut + click</p>
              <p className="mt-2">
                <span className="text-[#1abcfe]">cue</span>
                <span className="text-white/50">.</span>
                <span className="text-[#ffc700]">capture</span>
                <span className="text-white/50">(</span>
                <span className="text-[#0acf83]">'cursor-monitor'</span>
                <span className="text-white/50">)</span>
              </p>
              <p>
                <span className="text-[#1abcfe]">cue</span>
                <span className="text-white/50">.</span>
                <span className="text-[#ffc700]">ask</span>
                <span className="text-white/50">(</span>
                <span className="text-[#0acf83]">'vision-model'</span>
                <span className="text-white/50">)</span>
              </p>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-white/30">answer</p>
                <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.06em] text-white">
                  B
                </p>
                <p className="mt-2 text-[10px] text-white/45">overlay · 1 of 4 candidates</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-px border-t border-white/10 pt-4 text-[10px]">
                <span className="text-white/35">capture</span>
                <span className="text-[#0acf83]">EXCLUDED</span>
                <span className="mt-2 text-white/35">cross-check</span>
                <span className="mt-2 text-[#0acf83]">MATCH</span>
                <span className="mt-2 text-white/35">server</span>
                <span className="mt-2 text-white/60">NONE</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border border-[#dfe3e8] bg-[#fbfcfd] px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#7a818a]">
            <span>overlay / badge</span>
            <span className="text-[#121417]">local</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
