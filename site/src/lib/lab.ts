import type { Question } from '../data/questions'

export type WatermarkLevel = 'off' | 'basic' | 'strong' | 'forensic'
export type FontScale = 'sm' | 'md' | 'lg'
export type ScenarioId =
  | 'choice'
  | 'descriptive'
  | 'english'
  | 'code'
  | 'reading'
  | 'hard'
  | 'watermark'

export interface LabPrefs {
  watermark: WatermarkLevel
  fontScale: FontScale
}

const PREFS_KEY = 'cue-test-lab-v2'
const SESSION_KEY = 'cue-test-session-v1'

export const defaultPrefs: LabPrefs = {
  watermark: 'basic',
  fontScale: 'md',
}

export function loadPrefs(): LabPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return defaultPrefs
    const parsed = JSON.parse(raw) as Partial<LabPrefs>
    return {
      watermark: ['off', 'basic', 'strong', 'forensic'].includes(parsed.watermark ?? '')
        ? (parsed.watermark as WatermarkLevel)
        : defaultPrefs.watermark,
      fontScale: ['sm', 'md', 'lg'].includes(parsed.fontScale ?? '')
        ? (parsed.fontScale as FontScale)
        : defaultPrefs.fontScale,
    }
  } catch {
    return defaultPrefs
  }
}

export function savePrefs(prefs: LabPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
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

export const watermarkLabels: Record<WatermarkLevel, string> = {
  off: '워터마크 끔',
  basic: '기본 워터마크',
  strong: '강화 워터마크',
  forensic: '포렌식 워터마크',
}

export const typeLabels: Record<string, string> = {
  choice3: '3지선다',
  choice4: '4지선다',
  choice5: '5지선다',
  multi: '복수 선택',
  short: '단답형',
  calc: '계산형',
  descriptive: '서술형',
  reading: '독해',
  code: '코드',
  ox: 'OX',
}

export const difficultyLabels: Record<number, string> = {
  1: '기본',
  2: '보통',
  3: '심화',
  4: '고난도',
}

export function matchesType(question: Question, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'choice') return question.type.startsWith('choice') || question.type === 'reading'
  return question.type === filter
}

export function findScenario(questions: Question[], scenario: ScenarioId): Question | undefined {
  switch (scenario) {
    case 'descriptive':
      return questions.find((question) => question.type === 'descriptive')
    case 'english':
      return questions.find((question) => question.subject === '영어')
    case 'code':
      return questions.find((question) => question.type === 'code')
    case 'reading':
      return questions.find((question) => question.type === 'reading' || question.passage.length > 0)
    case 'hard':
      return questions.find((question) => question.difficulty === 4)
    case 'watermark':
      return questions.find((question) => question.type === 'choice5')
    case 'choice':
    default:
      return questions.find((question) => question.type === 'choice5')
  }
}
