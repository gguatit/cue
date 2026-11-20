import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaults, useSettings } from '../../stores/settings'
import InputTab from './InputTab'

beforeEach(() => {
  useSettings.setState({
    ...defaults,
    language: 'ko',
    shortcut: { ...defaults.shortcut, click: true, button: 'left' },
  })
})

describe('InputTab shortcut warnings', () => {
  it('shows the click requirement and the global conflict warning', () => {
    const html = renderToStaticMarkup(<InputTab />)
    expect(html).toContain('마우스 클릭 필요')
    expect(html).toContain('단축키 충돌')
  })
})
