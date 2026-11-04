import { useEffect, useState } from 'react'

export type SiteEffects = {
  cursors: boolean
  particles: boolean
}

const STORAGE_KEY = 'cue-site-effects'
const defaults: SiteEffects = { cursors: true, particles: true }

function readEffects(): SiteEffects {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<SiteEffects>
    return {
      cursors: typeof parsed.cursors === 'boolean' ? parsed.cursors : true,
      particles: typeof parsed.particles === 'boolean' ? parsed.particles : true,
    }
  } catch {
    return defaults
  }
}

export function useSiteEffects() {
  const [effects, setEffects] = useState<SiteEffects>(readEffects)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(effects))
    } catch {
      // Storage may be unavailable in privacy modes; the current session still works.
    }
  }, [effects])

  return [effects, setEffects] as const
}
