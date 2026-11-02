import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders an accessible confirmation dialog', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        title="저장된 API 키를 삭제할까요?"
        description="삭제하면 다시 입력해야 합니다."
        confirmLabel="삭제"
        danger
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('저장된 API 키를 삭제할까요?')
    expect(html).toContain('삭제하면 다시 입력해야 합니다.')
    expect(html).toContain('취소')
    expect(html).toContain('삭제')
  })
})
