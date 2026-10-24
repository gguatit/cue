import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Onboarding from './Onboarding'

describe('Onboarding', () => {
  it('starts on the first of four steps with skip and next controls', () => {
    const html = renderToStaticMarkup(<Onboarding />)
    expect(html).toContain('1 / 4')
    expect(html).toContain('건너뛰기')
    expect(html).toContain('다음')
    expect(html).toContain('트레이 아이콘을 항상 보이게')
  })
})
