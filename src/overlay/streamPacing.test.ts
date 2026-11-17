import { describe, expect, it } from 'vitest'
import { advanceStream, initialPace } from './streamPacing'

describe('advanceStream', () => {
  it('uses the base rate for small backlogs', () => {
    const next = advanceStream(initialPace, 'x'.repeat(10), 100, false)
    expect(next.visible).toBe(4)
  })

  it('accelerates when the backlog grows', () => {
    const next = advanceStream(initialPace, 'x'.repeat(300), 100, false)
    expect(next.visible).toBeGreaterThan(30)
  })

  it('drains quickly after the final chunk', () => {
    const next = advanceStream(initialPace, 'x'.repeat(300), 100, true)
    expect(next.visible).toBeGreaterThanOrEqual(45)
  })

  it('pauses after punctuation when the backlog is small', () => {
    const next = advanceStream({ visible: 1, carry: 0, pauseLeftMs: 0 }, 'A.xx', 30, false)
    expect(next.visible).toBe(2)
    expect(next.pauseLeftMs).toBe(80)
  })

  it('skips punctuation pauses while draining', () => {
    const next = advanceStream({ visible: 1, carry: 0, pauseLeftMs: 0 }, 'A.xx', 30, true)
    expect(next.visible).toBe(2)
    expect(next.pauseLeftMs).toBe(0)
  })

  it('consumes an active pause before revealing more', () => {
    const next = advanceStream({ visible: 2, carry: 0, pauseLeftMs: 80 }, 'A.xxxxx', 50, false)
    expect(next.visible).toBe(2)
    expect(next.pauseLeftMs).toBe(30)
  })

  it('clamps when the target text shrinks', () => {
    const next = advanceStream({ visible: 5, carry: 0.5, pauseLeftMs: 0 }, 'abc', 16, false)
    expect(next.visible).toBe(3)
    expect(next.carry).toBe(0)
  })
})
