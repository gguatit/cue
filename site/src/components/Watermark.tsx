import { useEffect, useMemo, useState } from 'react'
import type { WatermarkLevel } from '../lib/study'

function svgTile(text: string, width: number, height: number, fontSize: number, opacity: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width / 2}" y="${height / 2 + fontSize / 3}" text-anchor="middle" transform="rotate(-24 ${width / 2} ${height / 2})" fill="#52525b" fill-opacity="${opacity}" font-family="Malgun Gothic, sans-serif" font-size="${fontSize}" font-weight="600">${text}</text></svg>`
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
}

function metaTile(session: string, now: string, questionLabel: string) {
  const text = `${session} · ${now} · ${questionLabel}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="90"><text x="260" y="45" text-anchor="middle" fill="#52525b" fill-opacity="0.2" font-family="Malgun Gothic, sans-serif" font-size="10">${text}</text></svg>`
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
}

export function Watermark({
  level,
  session,
  questionLabel,
}: {
  level: WatermarkLevel
  session: string
  questionLabel: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (level === 'off') return
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [level])

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now),
    [now],
  )

  if (level === 'off') return null

  const warning = '시험문제를 AI로 풀지 마세요'
  const brand = 'CUE TEST LAB'

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: level === 'basic' ? 0.24 : level === 'strong' ? 0.42 : 0.52,
          backgroundImage: svgTile(brand, 360, 160, 15, 0.18),
          backgroundSize: '360px 160px',
        }}
      />
      {level !== 'basic' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: svgTile(warning, 460, 180, 14, 0.16),
            backgroundSize: '460px 180px',
          }}
        />
      )}
      {level === 'forensic' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: metaTile(session, time, questionLabel),
            backgroundSize: '520px 90px',
          }}
        />
      )}
      {level === 'forensic' && (
        <div className="absolute right-4 bottom-4 rounded-md border border-zinc-300/70 bg-white/70 px-2.5 py-1.5 text-[10px] font-medium tracking-wide text-zinc-500 shadow-sm">
          {session} · {time} · {questionLabel}
        </div>
      )}
    </div>
  )
}

export const watermarkLabels: Record<WatermarkLevel, string> = {
  off: '워터마크 끔',
  basic: '기본 워터마크',
  strong: '강화 워터마크',
  forensic: '포렌식 워터마크',
}
