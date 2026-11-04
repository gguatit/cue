import { useState } from 'react'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const capabilities = [
  { number: '01', title: '코드 설명', body: '함수·에러·설정 파일이 하는 일을 풀어서 설명합니다.' },
  { number: '02', title: '텍스트 해설', body: '긴 문단을 요약하거나 맥락을 정리합니다.' },
  { number: '03', title: '번역', body: '커서 아래 문장을 원하는 언어로 옮깁니다.' },
]

const modes = [
  {
    id: 'explain',
    label: '설명',
    badge: 'EXPLAIN',
    text: '네트워크 오류와 429 응답만 재시도하는 함수입니다. 401·403처럼 다시 시도해도 결과가 바뀌지 않는 오류는 즉시 반환합니다.',
  },
  {
    id: 'summary',
    label: '요약',
    badge: 'SUMMARY',
    text: '네트워크 오류와 429 응답만 재시도하고, 401·403은 즉시 반환합니다.',
  },
  {
    id: 'translate',
    label: '번역',
    badge: 'TRANSLATE',
    text: 'This function retries only network errors and 429 responses. It returns immediately for 401/403 errors that will not change on retry.',
  },
] as const

type Mode = (typeof modes)[number]['id']

export default function FreeModeSection() {
  const [mode, setMode] = useState<Mode>('explain')
  const current = modes.find((item) => item.id === mode) ?? modes[0]

  return (
    <section className="border-b border-[#e3e7eb] bg-[#f4f6f8]">
      <div className="page-shell grid gap-12 py-16 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="FREE MODE"
            title="문제가 아니어도, 설명이 필요할 때."
            description="같은 단축키를 누른 채 다른 마우스 버튼을 클릭하면 자유 모드가 열립니다. 커서 아래의 코드, 문서, 도표를 읽고 원하는 방식으로 설명합니다."
          />

          <div className="mt-9 divide-y divide-[#e3e7eb] border-y border-[#e3e7eb]">
            {capabilities.map((item) => (
              <div key={item.number} className="flex gap-5 py-4">
                <span className="font-mono text-[9px] tracking-[0.12em] text-[#9aa0a8]">
                  {item.number}
                </span>
                <div>
                  <p className="text-[13px] font-medium">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 font-mono text-[10px] leading-5 text-[#7a818a]">
            SAME SHORTCUT · DIFFERENT MOUSE BUTTON
          </p>
        </Reveal>

        <Reveal>
          <div className="code-panel">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="size-1.5 rounded-full bg-white/20" />
              <span className="size-1.5 rounded-full bg-white/20" />
              <span className="size-1.5 rounded-full bg-white/20" />
              <span className="ml-2 font-mono text-[10px] text-white/40">
                free-mode / selection
              </span>
              <span className="ml-auto font-mono text-[9px] tracking-[0.12em] text-[#0acf83]">
                {current.badge}
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-6 text-[#c9ced6] sm:p-6">
              <code>
                <span className="text-white/30">{'// cursor is here'}</span>
                {'\n'}
                <span className="text-[#a259ff]">function</span>{' '}
                <span className="text-[#ffc700]">shouldRetry</span>
                {'(code) {\n'}
                {'  '}
                <span className="text-[#a259ff]">return</span> code ==={' '}
                <span className="text-[#0acf83]">'network'</span> || code ==={' '}
                <span className="text-[#0acf83]">'http_429'</span>
                {'\n}'}
              </code>
            </pre>
            <div
              role="group"
              aria-label="자유 모드 작업"
              className="flex flex-wrap gap-1 border-t border-white/10 px-4 py-3"
            >
              {modes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  onClick={() => setMode(item.id)}
                  className={`h-8 border px-3 font-mono text-[9px] tracking-[0.08em] transition-colors ${
                    mode === item.id
                      ? 'border-[#0acf83]/40 bg-[#0acf83]/10 text-[#0acf83]'
                      : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 p-5 sm:p-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
                explanation
              </p>
              <p
                key={mode}
                aria-live="polite"
                className="fade-in mt-2 min-h-[72px] text-[13px] leading-6 text-[#e8eaed]"
              >
                {current.text}
              </p>
            </div>
          </div>
          <div className="mt-4 border border-[#dfe3e8] bg-white/55 p-4">
            <p className="mono-label">recommended instruction</p>
            <p className="mt-2 text-[13px] leading-6">
              상황에 맞게 판단하여 질문에 직접 답하거나 설명하세요.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
