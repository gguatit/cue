import { EyeOff, LockKeyhole, MonitorOff, ServerOff, ShieldCheck, Siren, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'

const controls = [
  {
    icon: MonitorOff,
    title: '화면 캡처 제외',
    body: '지원되는 Windows 버전에서 Cue 창을 화면 캡처·녹화에서 제외합니다. 오래된 OS에서는 창이 빈 영역으로 보일 수 있습니다.',
  },
  {
    icon: EyeOff,
    title: '창 흔적 최소화',
    body: '작업표시줄 버튼과 트레이 툴팁을 중립화하고, 메인 창 제목도 설정 화면처럼 바꿉니다.',
  },
  {
    icon: Users,
    title: '회의 안전 모드',
    body: 'Zoom·Teams·Webex·Meet 계열 프로세스나 창 제목을 감지하면 화면 기반 표시를 숨기고 LED·밝기만 사용합니다.',
  },
  {
    icon: Siren,
    title: '패닉 클리어',
    body: '답변·기록·오류 로그·클립보드를 지우고 Cue 창을 숨깁니다. 단축키는 설정에서 바꿀 수 있습니다.',
  },
  {
    icon: LockKeyhole,
    title: '선택적 생존 보호',
    body: '예약 작업이 Cue를 다시 실행합니다. 관리자 모드에서는 CueWatchdog SYSTEM 서비스와 보호 복사본으로 한 단계 더 유지합니다.',
  },
  {
    icon: ServerOff,
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
    <section id="security" className="border-t border-white/5">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="STEALTH & PRIVACY"
            title="보이지 않아야 할 때, 보이지 않게."
            description="Cue는 답을 띄우는 것보다, 띄우지 않아야 할 순간을 더 신경 씁니다. 표시 방식과 보호 장치는 각각 분리되어 있습니다."
          />

          <div className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {controls.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-amber-400">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <Card className="border-white/10 bg-[#0b0d0c] ring-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="size-4 text-emerald-400" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    protection status
                  </span>
                </div>
                <span className="font-mono text-[9px] text-zinc-600">EXAMPLE</span>
              </div>
              <div className="mt-2 divide-y divide-white/5">
                {status.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3.5">
                    <span className="text-sm text-zinc-400">{row.label}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[10px] ${
                        row.tone === 'ok' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          row.tone === 'ok'
                            ? 'bg-emerald-400'
                            : 'animate-pulse bg-amber-400'
                        }`}
                      />
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-white/5 pt-3 text-[10px] leading-5 text-zinc-600">
                실제 상태는 앱의 보안 탭에서 확인합니다. 관리자 권한이 없으면 일부 항목은
                확인할 수 없습니다.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
