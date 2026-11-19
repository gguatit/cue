import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/tauri', () => ({
  isTauri: vi.fn(() => true),
  showOverlay: vi.fn(async () => {}),
}))

import { defaults, useSettings } from '../../stores/settings'
import ExperimentalTab from './ExperimentalTab'

describe('ExperimentalTab', () => {
  beforeEach(() => {
    useSettings.setState({
      language: 'ko',
      experimental: structuredClone(defaults.experimental),
    })
  })

  it('shows the warning, master switch, experiments, and warning toggle', () => {
    const html = renderToStaticMarkup(<ExperimentalTab />)
    expect(html).toContain('실험 기능입니다')
    expect(html).toContain('실험 기능 사용')
    expect(html).toContain('커서 밀착 답변')
    expect(html).toContain('스포트라이트 답변')
    expect(html).toContain('캡처 미리보기')
    expect(html).toContain('커서 정지 자동 답변')
    expect(html).toContain('정지 시 미리 캡처')
    expect(html).toContain('정답 위치 하이라이트')
    expect(html).toContain('실험 경고 표시')
  })

  it('keeps a way to turn warnings back on', () => {
    const html = renderToStaticMarkup(<ExperimentalTab />)
    expect(html).toContain('실험 경고 표시')
  })
})
