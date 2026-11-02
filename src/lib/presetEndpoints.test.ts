import { describe, expect, it } from 'vitest'
import ai from '../../src-tauri/src/ai.rs?raw'
import models from '../../src-tauri/src/models.rs?raw'
import { PRESETS } from '../stores/settings'

const BASE_URLS = {
  opencode: 'https://opencode.ai/inference/openai/v1',
  'opencode-go': 'https://opencode.ai/inference/go/openai/v1',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  anthropic: 'https://api.anthropic.com/v1',
} as const

const MODELS_URLS = [
  'https://opencode.ai/inference/v1/models',
  'https://opencode.ai/inference/go/v1/models',
  'https://generativelanguage.googleapis.com/v1beta/models',
  'https://api.anthropic.com/v1/models?limit=100',
]

describe('preset endpoints', () => {
  it('keeps the frontend and Rust base URLs in sync', () => {
    for (const [preset, url] of Object.entries(BASE_URLS)) {
      expect(PRESETS[preset].baseUrl).toBe(url)
      expect(ai).toContain(url)
    }
  })

  it('keeps the hardcoded model-list URLs present', () => {
    for (const url of MODELS_URLS) {
      expect(models).toContain(url)
    }
  })
})
