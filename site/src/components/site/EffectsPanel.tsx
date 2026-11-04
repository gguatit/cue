import type { Dispatch, SetStateAction } from 'react'
import type { SiteEffects } from '@/lib/useSiteEffects'

export default function EffectsPanel({
  effects,
  setEffects,
}: {
  effects: SiteEffects
  setEffects: Dispatch<SetStateAction<SiteEffects>>
}) {
  return (
    <div className="effects-panel" role="group" aria-label="사이트 효과 설정">
      <span className="effects-label">effects</span>
      <button
        type="button"
        className="effects-toggle"
        aria-pressed={effects.cursors}
        title="커서 효과 켜기/끄기"
        onClick={() => setEffects((current) => ({ ...current, cursors: !current.cursors }))}
      >
        커서
      </button>
      <button
        type="button"
        className="effects-toggle"
        aria-pressed={effects.particles}
        title="파티클 효과 켜기/끄기"
        onClick={() => setEffects((current) => ({ ...current, particles: !current.particles }))}
      >
        파티클
      </button>
    </div>
  )
}
