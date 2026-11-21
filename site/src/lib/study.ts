import type { Question } from '../data/questions'

export type AnswerValue = string | string[]
export type Grade = 'correct' | 'incorrect' | 'review'

export interface StoredProgress {
  answers: Record<string, AnswerValue>
  grades: Record<string, Grade>
  bookmarks: number[]
  notes: Record<string, string>
  watermark: WatermarkLevel
}

export type WatermarkLevel = 'off' | 'basic' | 'strong' | 'forensic'

const KEY = 'cue-test-lab-v1'
const SESSION_KEY = 'cue-test-session-v1'

export const emptyProgress: StoredProgress = {
  answers: {},
  grades: {},
  bookmarks: [],
  notes: {},
  watermark: 'basic',
}

export function loadProgress(): StoredProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress
    const parsed = JSON.parse(raw) as Partial<StoredProgress>
    return {
      answers: parsed.answers ?? {},
      grades: parsed.grades ?? {},
      bookmarks: parsed.bookmarks ?? [],
      notes: parsed.notes ?? {},
      watermark: parsed.watermark ?? 'basic',
    }
  } catch {
    return emptyProgress
  }
}

export function saveProgress(progress: StoredProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Local storage can be unavailable in private/embedded contexts.
  }
}

export function sessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const next = `CUE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    localStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return 'CUE-LOCAL'
  }
}

export function isChoiceQuestion(question: Question): boolean {
  return question.options.length > 0 && question.type !== 'descriptive'
}

export function isMultiQuestion(question: Question): boolean {
  return question.type === 'multi'
}

export function isTextQuestion(question: Question): boolean {
  return question.type === 'descriptive' || question.type === 'short' || question.type === 'calc' || question.type === 'code'
}

export function answerLabel(question: Question, answer: string): string {
  if (question.type === 'ox') return answer === 'A' ? 'O' : 'X'
  return answer
}

export function answerSummary(question: Question, answer: string): string {
  if (question.options.length) {
    return answer
  }
  return answerLabel(question, answer)
}
