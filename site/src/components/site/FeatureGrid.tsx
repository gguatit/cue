import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const features = [
  {
    number: '01',
    title: '다섯 가지 표시 방식',
    body: '트레이 아이콘, 커서 오버레이, 전체 화면 플래시, 키보드 LED, 화면 밝기. 각 방식을 독립적으로 켜고 끌 수 있습니다.',
    tag: 'tray / overlay / flash / LED / brightness',
  },
  {
    number: '02',
    title: '자유 모드',
    body: '문제가 아니어도 됩니다. 커서 아래의 코드·텍스트·도표를 읽고, 내가 쓴 지시문에 맞춰 설명합니다.',
    tag: 'explain / summarize / translate',
  },
  {
    number: '03',
    title: '교차 검증',
    body: '같은 공급자의 두 번째 모델에 같은 문제를 병렬로 질문합니다. 일치하면 배지로, 다르면 두 답을 함께 보여줍니다.',
    tag: '2 models · parallel',
  },
  {
    number: '04',
    title: '회의 안전 모드',
    body: 'Zoom, Teams, Webex, Meet 계열 프로세스나 창 제목을 감지하면 화면 기반 표시를 숨기고 LED·밝기만 사용합니다.',
    tag: 'window / process signal',
  },
  {
    number: '05',
    title: '로컬 우선',
    body: 'Cue 서버도, 계정도, 텔레메트리도 없습니다. API 키는 Windows 자격증명 관리자에만 저장되고 화면은 지정한 공급자로만 전송됩니다.',
    tag: '0 servers · 0 accounts',
  },
  {
    number: '06',
    title: '생존 보호와 업데이트',
    body: '선택적 예약 작업이 강제 종료 후 Cue를 다시 실행합니다. 새 버전은 GitHub Releases의 서명된 업데이트로 설치됩니다.',
    tag: 'guard · signed update',
  },
]

export default function FeatureGrid() {
  return (
    <section id="features" className="border-b border-[#e3e7eb]">
      <div className="page-shell py-16 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="FEATURES"
            title="답을 보여주는 방식까지, 내 환경에 맞게."
            description="같은 화면도 상황에 따라 다르게 보여야 합니다. Cue는 표시 방식과 안전장치를 분리해, 필요한 것만 켤 수 있게 했습니다."
          />
        </Reveal>

        <div className="mt-10 grid border-l border-t border-[#e3e7eb] md:mt-14 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Reveal
              key={feature.number}
              className="group border-b border-r border-[#e3e7eb] p-6 transition-colors duration-200 hover:bg-white/60 md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.16em] text-[#9aa0a8]">
                  {feature.number}
                </span>
                <span className="h-px w-5 bg-[#cfd4da] transition-all duration-300 group-hover:w-9 group-hover:bg-[#121417]" />
              </div>
              <h3 className="mt-8 text-[18px] font-medium tracking-[-0.03em]">{feature.title}</h3>
              <p className="mt-3 min-h-[72px] text-[13px] leading-6 text-[#5f6670]">
                {feature.body}
              </p>
              <p className="mt-5 border-t border-[#e3e7eb] pt-3 font-mono text-[9px] leading-4 text-[#8a9098]">
                {feature.tag}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
