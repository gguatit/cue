import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/tauri', () => ({
  hasApiKey: vi.fn(async () => false),
  setApiKey: vi.fn(async () => {}),
  clearApiKey: vi.fn(async () => {}),
  listModels: vi.fn(async () => []),
  testConnection: vi.fn(async () => true),
}))

import AiTab from './AiTab'

describe('AiTab key management', () => {
  it('always shows the key state and a delete control', () => {
    const html = renderToStaticMarkup(<AiTab />)
    expect(html).toContain('설정 안 됨')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>삭제<\/button>/)
  })

  it('shows the answer type selector and hides paraphrase for multiple choice', () => {
    const html = renderToStaticMarkup(<AiTab />)
    expect(html).toContain('답변 유형')
    expect(html).toContain('객관식')
    expect(html).toContain('설명형')
    expect(html).not.toContain('답변을 한 번 바꿔 표현')
  })
})
