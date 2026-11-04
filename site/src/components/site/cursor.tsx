export const CURSOR_COLORS = [
  '#F24E1E',
  '#A259FF',
  '#1ABCFE',
  '#0ACF83',
  '#FF7262',
  '#FFC700',
  '#FF4D6D',
  '#2EC4B6',
  '#7B61FF',
  '#00A8E8',
] as const

export type CursorVariant = 'arrow' | 'beam' | 'cross' | 'resize'

export function CursorArrow({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M6 3 23 14.4 15.6 16.7 19.8 24.8 16 26.8 11.8 18.7 6 23.5Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CursorGlyph({
  color,
  variant = 'arrow',
}: {
  color: string
  variant?: CursorVariant
}) {
  if (variant === 'beam') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M8.5 4h11M8.5 24h11M13 4h2v20h-2z"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M9.5 5h9M9.5 23h9M13.5 6h1v16h-1z"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (variant === 'cross') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 3v22M3 14h22" stroke="#fff" strokeWidth="3.2" />
        <path d="M14 4.5v19M5 14h18" stroke={color} strokeWidth="1.4" />
        <circle cx="14" cy="14" r="2.2" fill={color} stroke="#fff" strokeWidth="1" />
      </svg>
    )
  }

  if (variant === 'resize') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M5 23 23 5M15 5h8v8M5 15v8h8"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.6 22.4 22.4 5.6M16 6h6v6M6 16v6h6"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return <CursorArrow color={color} />
}
