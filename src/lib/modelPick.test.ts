import { describe, expect, it } from 'vitest'
import { filterChatModels, nextModel, nextVerifyModel, preferredModel } from './modelPick'

describe('filterChatModels', () => {
  it('drops non-chat models', () => {
    const list = ['gpt-4o', 'text-embedding-3-small', 'whisper-1', 'dall-e-3', 'tts-1']
    expect(filterChatModels(list)).toEqual(['gpt-4o'])
  })

  it('hides unusable Zen free and test models but keeps Go free models', () => {
    const list = ['beam-free', 'test', 'glm-5.3']
    expect(filterChatModels(list, 'opencode')).toEqual(['glm-5.3'])
    expect(filterChatModels(list, 'opencode-go')).toEqual(list)
    expect(filterChatModels(list, 'custom')).toEqual(list)
  })
})

describe('preferredModel', () => {
  it('returns null for an empty list', () => {
    expect(preferredModel([], 'gpt-4o')).toBeNull()
  })

  it('prefers the exact preset model', () => {
    expect(preferredModel(['a', 'gpt-4o', 'gpt-4o-mini'], 'gpt-4o')).toBe('gpt-4o')
  })

  it('falls back to a prefixed match, then the first entry', () => {
    expect(preferredModel(['gemini-2.5-flash-001'], 'gemini-2.5-flash')).toBe('gemini-2.5-flash-001')
    expect(preferredModel(['zeta', 'alpha'], 'gpt-4o')).toBe('zeta')
  })
})

describe('nextVerifyModel', () => {
  it('picks a model different from the primary', () => {
    expect(nextVerifyModel(['gpt-4o', 'gpt-4o-mini'], 'gpt-4o')).toBe('gpt-4o-mini')
  })

  it('returns null when no different model is available', () => {
    expect(nextVerifyModel(['gpt-4o'], 'gpt-4o')).toBeNull()
    expect(nextVerifyModel([], 'gpt-4o')).toBeNull()
  })
})

describe('nextModel', () => {
  it('picks a model when none is set', () => {
    expect(nextModel(['gpt-4o-mini', 'gpt-4o'], 'openai', 'gpt-4o', '')).toBe('gpt-4o')
  })

  it('replaces the built-in preset model when the list does not contain it', () => {
    expect(nextModel(['qwen3.8-max-pro'], 'opencode', 'qwen3.8-max', 'qwen3.8-max')).toBe('qwen3.8-max-pro')
  })

  it('keeps a user-entered model that differs from the preset default', () => {
    expect(nextModel(['gpt-4o'], 'openai', 'gpt-4o', 'my-model-x')).toBeNull()
  })

  it('never overwrites a typed model on the custom preset', () => {
    expect(nextModel(['local-a'], 'custom', '', 'local-7b')).toBeNull()
    expect(nextModel(['local-a'], 'custom', '', '')).toBe('local-a')
  })

  it('returns null for an empty list', () => {
    expect(nextModel([], 'openai', 'gpt-4o', '')).toBeNull()
  })
})
