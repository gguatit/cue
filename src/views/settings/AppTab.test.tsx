import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaults, useSettings } from '../../stores/settings'
import AppTab from './AppTab'

beforeEach(() => {
  useSettings.setState({ ...defaults, language: 'ko' })
})

describe('AppTab', () => {
  it('keeps the app data and backup sections', () => {
    const html = renderToStaticMarkup(<AppTab />)
    expect(html).toContain('언어')
    expect(html).toContain('모양')
    expect(html).toContain('설정 백업')
    expect(html).toContain('답변 기록')
    expect(html).toContain('최근 오류')
  })
})
