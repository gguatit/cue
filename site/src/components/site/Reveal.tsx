import { useRef, type ReactNode } from 'react'

let buildOrder = 0

export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const order = useRef<number | null>(null)
  if (order.current === null) order.current = buildOrder++

  return (
    <div
      className={`reveal ${className}`}
      style={{ animationDelay: `${delay + Math.min(order.current, 24) * 22}ms` }}
    >
      {children}
    </div>
  )
}
