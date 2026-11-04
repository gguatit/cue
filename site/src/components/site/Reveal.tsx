import type { ReactNode } from 'react'

export default function Reveal({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return <div className={className}>{children}</div>
}
