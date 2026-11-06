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

export function CursorArrow({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M6.2 3.2c-.7-.3-1.4.4-1.1 1.1l8.1 19.1c.3.7 1.3.8 1.8.1l3.1-6.3 6.9-1.2c.9-.2 1.1-1.3.4-1.8L6.2 3.2Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CursorGlyph({ color }: { color: string }) {
  return <CursorArrow color={color} />
}
