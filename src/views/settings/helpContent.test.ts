import { describe, expect, it } from 'vitest'
import { ERROR_CODES, SECTIONS } from './helpContent'
import { ERRORS } from '../../i18n'

describe('help content', () => {
  it('has complete bilingual sections', () => {
    expect(SECTIONS.length).toBeGreaterThanOrEqual(6)
    for (const s of SECTIONS) {
      expect(s.title[0].trim()).not.toBe('')
      expect(s.title[1].trim()).not.toBe('')
      expect(s.bullets.length).toBeGreaterThan(0)
      for (const b of s.bullets) {
        expect(b[0].trim()).not.toBe('')
        expect(b[1].trim()).not.toBe('')
      }
    }
  })

  it('documents every error code in both languages', () => {
    for (const c of ERROR_CODES) {
      const p = ERRORS[c]
      expect(p, c).toBeDefined()
      expect(p[0].trim()).not.toBe('')
      expect(p[1].trim()).not.toBe('')
    }
  })
})
