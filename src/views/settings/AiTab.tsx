import { useEffect, useRef, useState } from 'react'
import { clearApiKey, hasApiKey, listModels, setApiKey, testConnection } from '../../lib/tauri'
import { errorMessage, useT } from '../../i18n'
import { filterChatModels, nextModel } from '../../lib/modelPick'
import {
  PRESETS,
  useSettings,
  type AnswerLanguage,
  type AnswerLevel,
} from '../../stores/settings'
import { useAnswer } from '../../stores/answer'
import { Button, Card, Field, Input, SectionTitle, Select } from '../../components/ui'

export default function AiTab() {
  const t = useT()
  const provider = useSettings((s) => s.provider)
  const setProvider = useSettings((s) => s.setProvider)
  const answer = useSettings((s) => s.answer)
  const setAnswer = useSettings((s) => s.setAnswer)
  const [keyInput, setKeyInput] = useState('')
  const [keyState, setKeyState] = useState<'saved' | 'none' | 'unknown'>('none')
  const [status, setStatus] = useState('')
  const [statusKind, setStatusKind] = useState<'idle' | 'ok' | 'warn' | 'err'>('idle')
  const [countdown, setCountdown] = useState(0)
  const [models, setModels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [extraDraft, setExtraDraft] = useState(provider.extraJson)
  const [extraError, setExtraError] = useState('')
  const loadId = useRef(0)
  const keyId = useRef(0)
  const testTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshKey = async (preset: string): Promise<'saved' | 'none' | 'unknown'> => {
    const id = ++keyId.current
    try {
      const has = await hasApiKey(preset)
      if (
        id !== keyId.current ||
        useSettings.getState().provider.preset !== preset
      ) {
        return 'none'
      }
      const next = has ? 'saved' : 'none'
      setKeyState(next)
      return next
    } catch {
      if (
        id !== keyId.current ||
        useSettings.getState().provider.preset !== preset
      ) {
        return 'none'
      }
      setKeyState('unknown')
      void useAnswer.getState().logError('keystore')
      return 'unknown'
    }
  }

  const cancelLoad = () => {
    loadId.current++
    setBusy(false)
  }

  const load = async (presetId: string, baseUrl: string, model: string) => {
    const id = ++loadId.current
    setBusy(true)
    try {
      const list = filterChatModels(await listModels(presetId, baseUrl), presetId)
      if (id !== loadId.current) return
      if (useSettings.getState().provider.preset !== presetId) return
      setModels(list)
      const next = nextModel(list, presetId, PRESETS[presetId]?.placeholder ?? '', model)
      if (
        next &&
        next !== model &&
        useSettings.getState().provider.model === model
      ) {
        setProvider({ model: next })
      }
      setStatus(
        list.length
          ? t(`Models loaded (${list.length})`, `모델 ${list.length}개 불러옴`)
          : t('No models found', '모델을 찾지 못했습니다'),
      )
      setStatusKind(list.length ? 'ok' : 'idle')
    } catch (e) {
      if (id !== loadId.current) return
      setStatus(errorMessage(String(e)))
      setStatusKind('err')
    } finally {
      if (id === loadId.current) setBusy(false)
    }
  }

  useEffect(() => {
    void (async () => {
      if ((await refreshKey(provider.preset)) === 'saved') {
        await load(provider.preset, provider.baseUrl, provider.model)
      }
    })()
    // ponytail: load once on mount; later preset/key changes load explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      loadId.current++
      keyId.current++
      clearTestTimer()
    }
  }, [])

  const save = async () => {
    if (!keyInput.trim()) return
    stopRealTest()
    try {
      await setApiKey(provider.preset, keyInput.trim())
      setKeyInput('')
      setKeyState('saved')
      setStatus(t('Saved', '저장됨'))
      setStatusKind('ok')
      await refreshKey(provider.preset)
      await load(provider.preset, provider.baseUrl, provider.model)
    } catch (e) {
      setStatus(errorMessage(String(e)))
      setStatusKind('err')
    }
  }
  const remove = async () => {
    if (!window.confirm(t('Delete the stored API key?', '저장된 API 키를 삭제할까요?'))) return
    cancelLoad()
    stopRealTest()
    try {
      await clearApiKey(provider.preset)
      setKeyState('none')
      setModels([])
      setStatus('')
      setStatusKind('idle')
      await refreshKey(provider.preset)
    } catch (e) {
      setStatus(errorMessage(String(e)))
      setStatusKind('err')
    }
  }
  const test = async () => {
    setStatus(t('Testing…', '테스트 중…'))
    setStatusKind('idle')
    try {
      const ok = await testConnection(
        provider.preset,
        provider.baseUrl,
        provider.model,
        provider.extraJson,
      )
      if (ok) {
        setStatus(t('OK', '성공'))
        setStatusKind('ok')
      } else {
        setStatus(errorMessage('vision'))
        setStatusKind('warn')
        void useAnswer.getState().logError('vision')
      }
    } catch (e) {
      setStatus(errorMessage(String(e)))
      setStatusKind('err')
    }
  }
  const clearTestTimer = () => {
    if (testTimer.current) {
      clearInterval(testTimer.current)
      testTimer.current = null
    }
  }

  const stopRealTest = () => {
    clearTestTimer()
    setCountdown(0)
  }

  const realTest = () => {
    if (countdown > 0) return
    stopRealTest()
    let remaining = 5
    setCountdown(remaining)
    testTimer.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        stopRealTest()
        void useAnswer.getState().run(false)
      }
    }, 1000)
  }
  const applyExtra = () => {
    setExtraError('')
    if (extraDraft.trim()) {
      try {
        const parsed: unknown = JSON.parse(extraDraft)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setExtraError(t('Invalid JSON', '올바른 JSON이 아닙니다'))
          return
        }
        const reserved = ['temperature', 'model', 'messages', 'input', 'contents', 'stream']
        if (Object.keys(parsed).some((key) => reserved.includes(key))) {
          setExtraError(
            t(
              'Reserved keys cannot be overridden.',
              '예약된 키는 덮어쓸 수 없습니다.',
            ),
          )
          return
        }
      } catch {
        setExtraError(t('Invalid JSON', '올바른 JSON이 아닙니다'))
        return
      }
    }
    setProvider({ extraJson: extraDraft.trim() })
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Field label={t('Provider', '프로바이더')}>
          <Select
            value={provider.preset}
            onChange={(e) => {
              const id = e.target.value
              const p = PRESETS[id]
              cancelLoad()
              stopRealTest()
              setProvider({ preset: id, baseUrl: p.baseUrl, model: p.placeholder })
              setModels([])
              setKeyInput('')
              setStatus('')
              setStatusKind('idle')
              void (async () => {
                if ((await refreshKey(id)) === 'saved') {
                  await load(id, p.baseUrl, p.placeholder)
                }
              })()
            }}
          >
            {Object.entries(PRESETS).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Base URL', 'API 주소')}>
          <Input
            value={provider.baseUrl}
            disabled={provider.preset !== 'custom'}
            onChange={(e) => setProvider({ baseUrl: e.target.value })}
          />
          {provider.preset !== 'custom' && (
            <p className="mt-1 text-xs text-zinc-500">
              {t(
                'The official endpoint is fixed for this preset. Use Custom to enter another compatible endpoint.',
                '이 프리셋의 공식 주소는 고정되어 있습니다. 다른 호환 주소를 쓰려면 Custom을 선택하세요.',
              )}
            </p>
          )}
        </Field>
        <Field label={t('Model (vision-capable)', '모델 (비전 지원 필요)')}>
          <div className="flex gap-2">
            <Input
              list="cue-models"
              className="flex-1"
              placeholder={PRESETS[provider.preset]?.placeholder}
              value={provider.model}
              onChange={(e) => {
                cancelLoad()
                setProvider({ model: e.target.value })
              }}
            />
            <Button
              className="whitespace-nowrap"
              disabled={busy}
              onClick={() => void load(provider.preset, provider.baseUrl, provider.model)}
            >
              {busy ? t('Loading…', '불러오는 중…') : t('Load models', '모델 불러오기')}
            </Button>
          </div>
          <datalist id="cue-models">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {models.length > 0 && (
            <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setProvider({ model: m })}
                  className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                    m === provider.model
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-zinc-700/80 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </Field>
        {(provider.preset === 'opencode' || provider.preset === 'opencode-go') && (
          <p className="text-xs text-zinc-500">
            {t(
              'The list shows only models available to your OpenCode plan. Zen free models are hidden because OpenCode only allows them inside its own app.',
              '목록은 현재 OpenCode 플랜에서 사용 가능한 모델만 표시합니다. Zen 무료 모델은 OpenCode 앱에서만 사용할 수 있어 숨깁니다.',
            )}
          </p>
        )}
        <Field label={t('Answer type', '답변 유형')}>
          <Select
            value={provider.answerType}
            onChange={(e) => setProvider({ answerType: e.target.value as 'choice' | 'text' })}
          >
            <option value="choice">{t('Multiple choice', '객관식')}</option>
            <option value="text">{t('Descriptive', '설명형')}</option>
          </Select>
        </Field>
        {provider.answerType === 'text' && (
          <p className="text-xs text-zinc-500">
            {t(
              'Descriptive answers always use the overlay panel, even when the overlay toggle is off.',
              '설명형 답변은 오버레이 토글과 관계없이 항상 패널로 표시됩니다.',
            )}
          </p>
        )}
        {provider.answerType === 'text' && (
          <>
            <Field label={t('Answer language', '답변 언어')}>
              <Select
                value={answer.language}
                onChange={(e) => setAnswer({ language: e.target.value as AnswerLanguage })}
              >
                <option value="auto">{t('Auto (match the question)', '자동 (질문 언어에 맞춤)')}</option>
                <option value="ko">{t('Korean', '한국어')}</option>
                <option value="en">{t('English', '영어')}</option>
              </Select>
              <p className="mt-1 text-xs text-zinc-500">
                {t(
                  'Auto answers in the language of the question.',
                  '자동은 질문의 언어로 답합니다.',
                )}
              </p>
            </Field>
            <Field label={t('Answer level', '답변 수준')}>
              <Select
                value={answer.level}
                onChange={(e) => setAnswer({ level: e.target.value as AnswerLevel })}
              >
                <option value="concise">{t('Concise', '간결')}</option>
                <option value="normal">{t('Normal', '보통')}</option>
                <option value="detailed">{t('Detailed', '상세')}</option>
              </Select>
              <p className="mt-1 text-xs text-zinc-500">
                {t(
                  'Level controls how long and detailed the answer is.',
                  '수준은 답변의 길이와 상세함을 조절합니다.',
                )}
              </p>
            </Field>
            <label className="flex items-start gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="mt-0.5 accent-amber-400"
                checked={provider.paraphrase}
                onChange={(e) => setProvider({ paraphrase: e.target.checked })}
              />
              <span>
                {t('Paraphrase the answer once', '답변을 한 번 바꿔 표현')}
                <span className="mt-1 block text-xs text-zinc-500">
                  {t(
                    'Descriptive answers appear only in a click-through overlay panel for the configured duration. Very long text may clip.',
                    '설명형 답변은 설정된 시간 동안 클릭 통과 오버레이 패널에만 표시됩니다. 아주 긴 텍스트는 잘릴 수 있습니다.',
                  )}
                </span>
              </span>
            </label>
          </>
        )}
      </Card>
      <Card>
        <SectionTitle>{t('API key', 'API 키')}</SectionTitle>
        <div className="flex gap-2">
          <Input
            type="password"
            className="flex-1"
            aria-label={t('API key', 'API 키')}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={keyState === 'saved' ? t('Saved', '저장됨') : ''}
          />
          <Button variant="primary" disabled={!keyInput.trim()} onClick={save}>
            {t('Save', '저장')}
          </Button>
          <Button variant="danger" disabled={keyState === 'none'} onClick={remove}>
            {t('Delete', '삭제')}
          </Button>
        </div>
        <div className="mt-3">
          <span
            className={`rounded-md px-2 py-0.5 text-xs ${
              keyState === 'saved'
                ? 'bg-emerald-500/10 text-emerald-400'
                : keyState === 'none'
                  ? 'bg-zinc-800 text-zinc-400'
                  : 'bg-red-500/10 text-red-400'
            }`}
          >
            {keyState === 'saved'
              ? t('Registered', '등록됨')
              : keyState === 'none'
                ? t('Not set', '설정 안 됨')
                : t('Unavailable', '확인할 수 없음')}
          </span>
        </div>
      </Card>
      <Card>
        <SectionTitle>{t('Extra parameters (JSON)', '추가 파라미터 (JSON)')}</SectionTitle>
        <textarea
          className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 transition-colors placeholder:text-zinc-600 focus:border-accent focus:outline-none"
          rows={3}
          value={extraDraft}
          onChange={(e) => {
            setExtraDraft(e.target.value)
            setExtraError('')
          }}
          placeholder='{"max_tokens": 512}'
        />
        <div className="mt-2 flex items-center gap-2">
          <Button onClick={applyExtra}>{t('Apply', '적용')}</Button>
          {extraError && <span className="text-xs text-red-400">{extraError}</span>}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {t(
            'temperature, model, messages, input, contents and stream are managed by Cue and cannot be overridden.',
            'temperature, model, messages, input, contents, stream은 Cue가 관리하며 덮어쓸 수 없습니다.',
          )}
        </p>
      </Card>
      <div className="flex items-center gap-3">
        <Button onClick={test}>{t('Test connection', '연결 테스트')}</Button>
        <Button variant="primary" disabled={countdown > 0} onClick={realTest}>
          {countdown > 0 ? `${countdown}s` : t('Full test in 5s', '5초 후 실전 테스트')}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className={`text-sm ${
            statusKind === 'err'
              ? 'text-red-400'
              : statusKind === 'warn'
                ? 'text-amber-400'
                : statusKind === 'ok'
                  ? 'text-emerald-400'
                  : 'text-zinc-400'
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-xs text-zinc-500">
        {t(
          'Full test runs the real shortcut flow after a 5-second countdown: move the pointer over a question during the countdown.',
          '실전 테스트는 5초 카운트다운 뒤 실제 단축키 흐름을 실행합니다. 카운트다운 동안 포인터를 문제 위로 옮기세요.',
        )}
      </p>
      <p className="text-xs text-zinc-500">
        {t(
          'Use a vision-capable model. Screenshots are sent only to the provider you configure.',
          '비전 지원 모델을 사용하세요. 화면은 사용자가 지정한 프로바이더로만 전송됩니다.',
        )}
      </p>
      <p className="text-xs text-zinc-500">
        {t(
          'Paraphrasing sends the extracted answer text to the provider for one extra rewrite request. Only the cleaned answer is shown; invisible watermark characters and HTML tags are removed.',
          '바꿔 표현을 켜면 추출된 답변 텍스트가 한 번의 추가 재작성 요청으로 프로바이더에 전송됩니다. 화면에는 정리된 답변만 표시되며, 보이지 않는 워터마크 문자와 HTML 태그는 제거됩니다.',
        )}
      </p>
    </div>
  )
}
