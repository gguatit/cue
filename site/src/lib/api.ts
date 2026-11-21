import type { AnswerValue } from './study'

export interface CheckResult {
  correct: boolean | null
  review: boolean
}

interface ApiErrorBody {
  error?: string
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as T & ApiErrorBody
  if (!response.ok) {
    throw new Error(data.error ?? `http_${response.status}`)
  }
  return data
}

function asAnswer(value: AnswerValue | undefined): string {
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

export function checkAnswer(questionId: number, value: AnswerValue | undefined): Promise<CheckResult> {
  return post<CheckResult>('/api/check', { id: questionId, answer: asAnswer(value) })
}

export function revealAnswer(questionId: number): Promise<{ answer: string }> {
  return post<{ answer: string }>('/api/reveal', { id: questionId })
}
