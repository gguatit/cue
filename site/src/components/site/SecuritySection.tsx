import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const controls = [
  {
    number: '01',
    title: '화면 캡처 제외',
    body: '지원되는 Windows 버전에서 Cue 창을 화면 캡처·녹화에서 제외합니다. 오래된 OS에서는 창이 빈 영역으로 보일 수 있습니다.',
  },
  {
    number: '02',
    title: '창 흔적 최소화',
    body: '작업표시줄 버튼과 트레이 툴팁을 중립화하고, 메인 창 제목도 설정 화면처럼 바꿉니다.',
  },
  {
    number: '03',
    title: '회의 안전 모드',
    body: 'Zoom·Teams·Webex·Meet 계열 프로세스나 창 제목을 감지하면 화면 기반 표시를 숨기고 LED·밝기만 사용합니다.',
  },
  {
    number: '04',
    title: '패닉 클리어',
    body: '답변·기록·오류 로그·클립보드를 지우고 Cue 창을 숨깁니다. 단축키는 설정에서 바꿀 수 있습니다.',
  },
  {
    number: '05',
    title: '선택적 생존 보호',
    body: '예약 작업이 Cue를 다시 실행합니다. 관리자 모드에서는 CueWatchdog SYSTEM 서비스와 보호 복사본으로 한 단계 더 유지합니다.',
  },
  {
    number: '06',
    title: '로컬 우선',
    body: 'Cue 서버, 계정, 텔레메트리가 없습니다. API 키는 Windows 자격증명 관리자에만 저장하고, 화면은 내가 지정한 공급자로만 전송합니다.',
  },
]

const status = [
  { label: '캡처 제외', value: 'ACTIVE', tone: 'ok' },
  { label: '작업표시줄', value: 'HIDDEN', tone: 'ok' },
  { label: '회의 감지', value: 'ARMED', tone: 'warn' },
  { label: 'API 키', value: 'LOCAL', tone: 'ok' },
  { label: '텔레메트리', value: 'NONE', tone: 'ok' },
]

export default function SecuritySection() {
  return (
    <section id="security" className="border-b border-[#e3e7eb]">
      <div className="page-shell grid gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="STEALTH & PRIVACY"
            title="보이지 않아야 할 때, 보이지 않게."
            description="Cue는 답을 띄우는 것보다, 띄우지 않아야 할 순간을 더 신경 씁니다. 표시 방식과 보호 장치는 각각 분리되어 있습니다."
          />

          <div className="mt-9 divide-y divide-[#e3e7eb] border-y border-[#e3e7eb]">
            {controls.map((item) => (
              <div key={item.number} className="grid gap-3 py-4 sm:grid-cols-[36px_1fr]">
                <span data-build-item className="font-mono text-[9px] tracking-[0.12em] text-[#9aa0a8]">
                  {item.number}
                </span>
                <div>
                  <p className="text-[13px] font-medium">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className="border border-[#dfe3e8] bg-white/60">
            <div className="flex items-center justify-between border-b border-[#e3e7eb] px-4 py-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6b7280]">
                protection status
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#9aa0a8]">
                example
              </span>
            </div>
            <div className="divide-y divide-[#e3e7eb]">
              {status.map((row) => (
                <div
                  key={row.label}
                  data-build-item
                  data-build-kind="box"
                  className="flex items-center justify-between px-4 py-3.5"
                >
                  <span className="text-[12px] text-[#5f6670]">{row.label}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.08em] ${
                      row.tone === 'ok' ? 'text-[#0a8f5c]' : 'text-[#b45309]'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        row.tone === 'ok' ? 'bg-[#0acf83]' : 'animate-pulse bg-[#f59e0b]'
                      }`}
                    />
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t border-[#e3e7eb] px-4 py-3 font-mono text-[9px] leading-4 text-[#8a9098]">
              실제 상태는 앱의 보안 탭에서 확인합니다. 관리자 권한이 없으면 일부 항목은
              확인할 수 없습니다.
            </p>
          </div>

          <div className="mt-4 border border-[#dfe3e8] bg-[#fbfcfd] p-4">
            <p className="mono-label">caveat</p>
            <p className="mt-2 text-[12px] leading-5 text-[#5f6670]">
              캡처 제외는 지원되는 Windows와 캡처 API에서만 동작합니다. 카메라 촬영,
              커널 드라이버, 외부 HDMI 레코더까지 막을 수는 없습니다.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
