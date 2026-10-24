import { describe, expect, it } from 'vitest'
import { answerGlyph } from './trayIcon'

describe('answerGlyph', () => {
  it('falls back to the answer text when the slot maps to char', () => {
    expect(answerGlyph('B', { byAnswer: { '2': 'char' } })).toEqual({ choice: 'B', glyph: null })
  })
  it('uses the mapped camouflage glyph for the answer slot', () => {
    expect(answerGlyph('B', { byAnswer: { '2': 'wifi' } })).toEqual({ choice: null, glyph: 'wifi' })
  })
  it('resolves circled digits to their slot', () => {
    expect(answerGlyph('③', { byAnswer: { '3': 'bell' } })).toEqual({ choice: null, glyph: 'bell' })
  })
  it('falls back to text for labels outside A-E/1-5', () => {
    expect(answerGlyph('?', { byAnswer: { '1': 'wifi' } })).toEqual({ choice: '?', glyph: null })
  })
})
