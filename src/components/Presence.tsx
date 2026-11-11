import type { AriaRole, ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { exit, fade } from '../lib/motion'

export function Presence({
  show,
  children,
  className = '',
  role,
  live,
}: {
  show: boolean
  children: ReactNode
  className?: string
  role?: AriaRole
  live?: 'polite' | 'assertive'
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="presence"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2, transition: exit }}
          transition={fade}
          role={role}
          aria-live={live}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
