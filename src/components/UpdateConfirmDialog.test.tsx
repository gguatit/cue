import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import UpdateConfirmDialog from './UpdateConfirmDialog'

describe('UpdateConfirmDialog', () => {
  it('renders an in-app confirmation with the target version', () => {
    const html = renderToStaticMarkup(
      <UpdateConfirmDialog
        version="0.1.5"
        busy={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('0.1.5')
    expect(html).toContain('Cue 업데이트를 설치할까요?')
    expect(html).toContain('취소')
    expect(html).toContain('설치')
  })
})
