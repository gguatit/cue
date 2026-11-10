import type { Transition } from 'motion/react'

export const springSnappy: Transition = {
  type: 'spring',
  visualDuration: 0.28,
  bounce: 0.06,
}

export const springSoft: Transition = {
  type: 'spring',
  visualDuration: 0.4,
  bounce: 0.03,
}

export const fade: Transition = {
  duration: 0.18,
  ease: 'easeOut',
}

export const fadeFast: Transition = {
  duration: 0.12,
  ease: 'easeOut',
}
