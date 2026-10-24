const NON_CHAT = ['embed', 'moderation', 'whisper', 'tts', 'dall-e', 'imagen', 'aqa', 'audio', 'realtime', 'transcribe']

export function filterChatModels(models: string[], preset = ''): string[] {
  const zen = preset === 'opencode'
  return models.filter((m) => {
    const l = m.toLowerCase()
    if (NON_CHAT.some((p) => l.includes(p))) return false
    // Zen's free tier is restricted to the OpenCode app itself.
    if (zen && (l.endsWith('-free') || l === 'test')) return false
    return true
  })
}

export function preferredModel(models: string[], presetModel: string): string | null {
  if (models.length === 0) return null
  if (presetModel) {
    const exact = models.find((m) => m === presetModel)
    if (exact) return exact
    const prefixed = models.find((m) => m.startsWith(presetModel))
    if (prefixed) return prefixed
  }
  return models[0]
}

export function nextModel(
  models: string[],
  preset: string,
  presetModel: string,
  current: string,
): string | null {
  if (models.length === 0) return null
  if (!current) return preferredModel(models, presetModel)
  if (preset === 'custom') return null
  if (current === presetModel && !models.includes(current)) {
    return preferredModel(models, presetModel)
  }
  return null
}
