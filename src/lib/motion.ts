import type { Transition } from 'motion/react'

export const micro: Transition = {
  type: 'spring',
  visualDuration: 0.22,
  bounce: 0.02,
}

export const panel: Transition = {
  type: 'spring',
  visualDuration: 0.32,
  bounce: 0.04,
}

export const exit: Transition = {
  duration: 0.12,
  ease: 'easeIn',
}

export const fade: Transition = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1],
}

export const fadeFast: Transition = {
  duration: 0.12,
  ease: 'easeOut',
}

export const layoutSpring: Transition = {
  type: 'spring',
  visualDuration: 0.24,
  bounce: 0.02,
}

export const stagger = 0.018

export const springSnappy = micro
export const springSoft = panel
