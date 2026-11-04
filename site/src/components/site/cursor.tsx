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
        d="M4 2.5 23.5 14.2 15.1 16.8 19.7 25.1 15.9 27.1 11.3 18.8 4 24.2Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
