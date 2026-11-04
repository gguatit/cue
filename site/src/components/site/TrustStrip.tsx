import Reveal from './Reveal'

const stats = [
  { value: '5', label: '표시 방식', detail: 'tray · overlay · flash · LED · brightness' },
  { value: '2', label: '교차 검증 모델', detail: '같은 공급자, 병렬 요청' },
  { value: '0', label: '서버 · 계정 · 텔레메트리', detail: 'API 키는 Windows 자격증명 관리자에만' },
  { value: 'MIT', label: '오픈 소스', detail: 'Windows 10/11 x64' },
]

export default function TrustStrip() {
  return (
    <section aria-label="주요 특징" className="border-b border-[#e3e7eb]">
      <div className="page-shell grid grid-cols-2 md:grid-cols-4">
        {stats.map((item, index) => (
          <Reveal
            key={item.label}
            className={`border-[#e3e7eb] py-7 md:py-9 ${
              index % 2 === 1 ? 'border-l pl-5 md:pl-7' : 'md:border-l md:pl-7'
            } ${index > 1 ? 'border-t md:border-t-0' : ''} ${index === 0 ? 'md:border-l-0 md:pl-0' : ''}`}
          >
            <p className="text-[34px] font-semibold leading-none tracking-[-0.055em] text-[#121417]">
              {item.value}
            </p>
            <p className="mt-2 text-[12px] font-medium text-[#121417]">{item.label}</p>
            <p className="mt-1 font-mono text-[9px] leading-4 text-[#8a9098]">{item.detail}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
