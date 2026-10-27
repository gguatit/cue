import { useState } from 'react'
import { Code2, FileText, Languages, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const capabilities = [
  { icon: Code2, title: '코드 설명', body: '함수·에러·설정 파일이 하는 일을 풀어서 설명합니다.' },
  { icon: FileText, title: '텍스트 해설', body: '긴 문단을 요약하거나 맥락을 정리합니다.' },
  { icon: Languages, title: '번역', body: '커서 아래 문장을 원하는 언어로 옮깁니다.' },
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
    <section className="border-t border-white/5 bg-white/[0.012]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="FREE MODE"
            title="문제가 아니어도, 설명이 필요할 때."
            description="같은 단축키를 누른 채 다른 마우스 버튼을 클릭하면 자유 모드가 열립니다. 커서 아래의 코드, 문서, 도표를 읽고 원하는 방식으로 설명합니다."
          />

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <Icon aria-hidden="true" className="size-4 text-amber-400" />
                <p className="mt-2 text-sm font-medium text-zinc-200">{title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
            <MousePointerClick aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-100">같은 단축키, 다른 버튼</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                설정에서 자유 모드 버튼을 고르면 시험 모드와 자유 모드를 오가며 사용할 수
                있습니다. 지시문은 내가 원하는 말투와 형식으로 바꿀 수 있습니다.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-emerald-400/5 blur-3xl" />
            <Card className="border-white/10 bg-[#0b0d0c] ring-white/10">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                  <span className="size-2 rounded-full bg-zinc-700" />
                  <span className="size-2 rounded-full bg-zinc-700" />
                  <span className="size-2 rounded-full bg-zinc-700" />
                  <span className="ml-2 font-mono text-[10px] text-zinc-600">
                    free-mode / selection
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-auto h-5 border-emerald-400/20 px-2 text-[9px] text-emerald-300"
                  >
                    {current.badge}
                  </Badge>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-zinc-300">
                  <code>
                    <span className="text-zinc-600">{'// cursor is here'}</span>
                    {'\n'}
                    <span className="text-violet-300">function</span>{' '}
                    <span className="text-amber-300">shouldRetry</span>
                    {'(code) {\n'}
                    {'  '}
                    <span className="text-violet-300">return</span> code ==={' '}
                    <span className="text-emerald-300">'network'</span> || code ==={' '}
                    <span className="text-emerald-300">'http_429'</span>
                    {'\n}'}
                  </code>
                </pre>
                <div
                  role="group"
                  aria-label="자유 모드 작업"
                  className="flex flex-wrap gap-1.5 border-t border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  {modes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={mode === item.id}
                      onClick={() => setMode(item.id)}
                      className={`min-h-8 rounded-md border px-2.5 py-1 font-mono text-[10px] transition-[color,background-color,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                        mode === item.id
                          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                          : 'border-white/10 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 bg-white/[0.02] p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                    explanation
                  </p>
                  <p
                    key={mode}
                    aria-live="polite"
                    className="mt-2 animate-fade-up text-sm leading-6 text-zinc-300"
                  >
                    {current.text}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 rounded-xl border border-white/10 bg-background/80 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                recommended instruction
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                상황에 맞게 판단하여 질문에 직접 답하거나 설명하세요.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
