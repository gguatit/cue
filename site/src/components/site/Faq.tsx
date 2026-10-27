import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { README_URL } from '@/lib/site'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const faqs = [
  {
    q: 'Cue는 무료인가요?',
    a: '앱은 MIT 라이선스로 무료입니다. 다만 AI 답변을 만들려면 본인의 API 키가 필요하고, 사용한 만큼 공급자 요금이 발생합니다. Cue가 대신 결제하거나 크레딧을 제공하지는 않습니다.',
  },
  {
    q: '계정이나 서버가 필요한가요?',
    a: '아니요. Cue 계정도, Cue 서버도, 텔레메트리도 없습니다. API 키는 Windows 자격증명 관리자에 저장되고, 화면은 설정한 공급자에게만 직접 전송됩니다.',
  },
  {
    q: '어떤 AI 모델을 쓸 수 있나요?',
    a: 'OpenCode, OpenAI, Google, Anthropic과 OpenAI 호환 사용자 지정 주소를 지원합니다. 비전을 지원하는 모델이 필요하며, 공급자별 모델 목록을 불러와 선택할 수 있습니다.',
  },
  {
    q: '시험 중 탐지되지 않나요?',
    a: '보장하지 않습니다. 화면 캡처 제외, 작업표시줄 숨김, 회의 안전 모드 같은 기능을 제공하지만 감시 프로그램·프로세스 목록·웹캠·네트워크 흔적까지 막을 수는 없습니다. 사용 전에 주최 기관의 규정을 확인하세요.',
  },
  {
    q: 'Windows 외 OS도 지원하나요?',
    a: '현재 Windows 10/11 x64만 지원합니다. macOS와 Linux 빌드는 제공하지 않습니다.',
  },
  {
    q: '업데이트는 어떻게 되나요?',
    a: 'GitHub Releases의 서명된 latest.json을 확인해 새 버전을 설치합니다. 업데이트는 NSIS /UPDATE로 실행되어 기존 제거 프로그램의 서비스·예약 작업·ProgramData 정리를 유지합니다. 0.1.0/0.1.1 사용자는 0.1.2 이상을 한 번 직접 설치해야 합니다.',
  },
  {
    q: '관리자 권한이 꼭 필요한가요?',
    a: '필수는 아닙니다. 기본 기능은 일반 권한으로 동작합니다. 강제 종료 저항과 CueWatchdog 서비스 같은 최대 보호 기능을 켤 때만 관리자 권한과 UAC가 필요합니다.',
  },
  {
    q: '화면과 기록은 어디에 저장되나요?',
    a: '답변 기록과 오류 로그는 로컬에만 저장되며, 설정에서 저장을 끄거나 패닉 클리어로 지울 수 있습니다. Cue는 별도 분석 서버로 데이터를 보내지 않습니다.',
  },
]

export default function Faq() {
  return (
    <section id="faq" className="border-t border-white/5">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="자주 묻는 질문."
            description="설치 전에 알아두면 좋은 것들. 더 자세한 내용은 README와 릴리스 노트에 정리되어 있습니다."
          />
          <a
            href={README_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex text-sm font-medium text-amber-300 underline-offset-4 hover:underline"
          >
            README에서 전체 문서 보기
          </a>
        </Reveal>

        <Reveal delay={100}>
          <Accordion
            defaultValue={[]}
            className="rounded-xl border border-white/10 bg-white/[0.018] px-5"
          >
            {faqs.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`faq-${index}`}
                className={index === faqs.length - 1 ? 'border-b-0' : ''}
              >
                <AccordionTrigger className="py-4 text-left text-sm text-zinc-200 hover:text-zinc-50 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-6 text-zinc-400">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
