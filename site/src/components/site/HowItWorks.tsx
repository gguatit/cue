import { SHORTCUT } from '@/lib/site'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const steps = [
  {
    number: '01',
    title: '단축키를 누른 채 클릭',
    body: `${SHORTCUT}을 누른 상태에서 마우스 버튼을 클릭합니다. 커서가 있는 모니터만 읽습니다.`,
    detail: '단축키·버튼·클릭 여부는 설정에서 바꿀 수 있습니다.',
  },
  {
    number: '02',
    title: '내 AI가 읽고 답함',
    body: 'OpenCode, OpenAI, Google, Anthropic 또는 내 OpenAI 호환 모델이 문제를 읽고 답합니다.',
    detail: '키는 Windows 자격증명 관리자에만 저장됩니다.',
  },
  {
    number: '03',
    title: '가장 조용한 방식으로 표시',
    body: '트레이, 커서 오버레이, 플래시, 키보드 LED, 화면 밝기 중 원하는 방식으로 표시합니다.',
    detail: '회의 감지 중에는 화면 기반 표시를 숨깁니다.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="border-b border-[#e3e7eb]">
      <div className="page-shell py-16 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="HOW IT WORKS"
            title="한 번의 클릭, 세 단계."
            description="복잡한 설정 없이 지금 쓰는 AI 모델에 연결합니다. Cue는 화면과 답을 중간에서 전달할 뿐, 별도 계정을 만들지 않습니다."
          />
        </Reveal>

        <div className="mt-10 grid border-l border-t border-[#e3e7eb] md:mt-14 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal
              key={step.number}
              className={`border-b border-r border-[#e3e7eb] p-6 md:p-8 ${
                index === 0 ? '' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.16em] text-[#9aa0a8]">
                  {step.number}
                </span>
                <span className="size-1.5 rounded-full bg-[#121417]" />
              </div>
              <h3 className="mt-9 text-[18px] font-medium tracking-[-0.03em]">{step.title}</h3>
              <p className="mt-3 text-[13px] leading-6 text-[#5f6670]">{step.body}</p>
              <p className="mt-6 border-t border-[#e3e7eb] pt-3 font-mono text-[9px] leading-4 text-[#8a9098]">
                {step.detail}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
