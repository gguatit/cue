import { EyeOff, MousePointer2, ScanSearch } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SHORTCUT } from '@/lib/site'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const steps = [
  {
    number: '01',
    icon: MousePointer2,
    title: '단축키를 누른 채 클릭',
    body: `${SHORTCUT}을 누른 상태에서 마우스 버튼을 클릭합니다. 커서가 있는 모니터의 화면을 읽습니다.`,
    detail: '단축키·버튼·클릭 여부는 설정에서 바꿀 수 있습니다.',
  },
  {
    number: '02',
    icon: ScanSearch,
    title: '내 AI가 읽고 답함',
    body: 'OpenCode, OpenAI, Google, Anthropic 또는 내 OpenAI 호환 모델이 문제를 읽고 답합니다.',
    detail: '키는 Windows 자격증명 관리자에만 저장됩니다.',
  },
  {
    number: '03',
    icon: EyeOff,
    title: '가장 조용한 방식으로 표시',
    body: '트레이 아이콘, 커서 오버레이, 플래시, 키보드 LED, 화면 밝기 중 원하는 방식으로 표시합니다.',
    detail: '회의 감지 중에는 화면 기반 표시를 숨깁니다.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="HOW IT WORKS"
            title="한 번의 클릭, 세 단계."
            description="복잡한 설정 없이 지금 쓰는 AI 모델에 연결합니다. Cue는 화면과 답을 중간에서 전달할 뿐, 별도 계정을 만들지 않습니다."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, body, detail }, index) => (
            <Reveal key={number} delay={index * 80}>
              <Card className="group h-full border-white/5 bg-white/[0.018] ring-white/10 transition-[transform,border-color,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-amber-400/20 hover:bg-white/[0.03] hover:shadow-[0_18px_50px_-28px_rgba(251,191,36,0.4)]">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.24em] text-zinc-600">
                      {number}
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-amber-400">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium tracking-tight text-zinc-100">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-zinc-400">{body}</p>
                  <p className="mt-5 border-t border-white/5 pt-3 font-mono text-[10px] leading-5 text-zinc-600">
                    {detail}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
