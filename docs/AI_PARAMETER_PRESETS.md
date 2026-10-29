# Cue AI 파라미터·프리셋 가이드

작성 기준: **Cue 0.1.13**, 2026-10-29.  
대상: Cue의 **설정 → AI → 추가 파라미터(JSON)** 에 넣는 값과 상황별 추천 설정.

> 추가 파라미터는 요청 본문에 **얕게 병합**됩니다. 한 JSON이 현재 모델의 답변 요청뿐 아니라 JSON 보정 요청, 패러프레이즈 요청에도 적용됩니다. 모델을 바꾸면 지원하지 않는 필드가 400을 만들 수 있으므로, 실패하면 먼저 **비우기(Clear)** 로 초기화하세요.

## 1. 먼저 알아둘 공통 규칙

### 1.1 적용 방법

1. Cue → 설정 → AI.
2. 프로바이더와 모델을 선택합니다.
3. **추가 파라미터(JSON)** 에 아래 프리셋 중 하나를 붙여 넣습니다.
4. **적용**을 누릅니다.
5. **연결 테스트**로 비전/모델 접근을 확인하고, **5초 후 실전 테스트**로 실제 캡처 흐름을 확인합니다.

### 1.2 Cue가 직접 관리하는 필드

아래 키는 추가 JSON으로 덮어쓸 수 없습니다.

| 필드 | 이유 |
|---|---|
| `temperature` | Cue가 Chat 요청에서 0으로 고정하거나, 네이티브 API에서는 생략 |
| `model` | Cue의 모델 설정이 관리 |
| `messages` | Cue의 프롬프트·이미지·보정 대화가 관리 |
| `input` | Responses API의 입력 |
| `contents` | Google API의 입력 |
| `stream` | Cue는 전체 응답을 받아 파싱 |

### 1.3 토큰 필드 이름

| 경로 | 출력 토큰 필드 |
|---|---|
| DeepSeek 공식 Chat | `max_tokens` |
| OpenAI 공식 Chat (GPT-4o 등) | `max_tokens` |
| OpenAI 공식 Chat (GPT-5/o-series) | `max_completion_tokens` |
| OpenCode Go/Zen의 `gpt-*` (Responses) | `max_output_tokens` |
| Anthropic Messages | `max_tokens` |
| Google 네이티브 | `generationConfig.maxOutputTokens` |

### 1.4 추론(reasoning) 필드 이름

| 경로 | 필드 |
|---|---|
| DeepSeek Chat | `reasoning_effort` 또는 `thinking` |
| OpenAI 공식 Chat | `reasoning_effort` |
| OpenCode Go/Zen의 `gpt-*` (Responses) | `reasoning: { "effort": "..." }` |
| Anthropic Messages | `output_config: { "effort": "..." }` |

### 1.5 공통 금지·주의

| 항목 | 판단 |
|---|---|
| `tools`, `tool_choice` | API는 지원하지만 Cue의 답변 파서를 깨뜨릴 수 있음. 사용 금지 |
| `stream` | Cue가 차단. 사용 금지 |
| `stream_options` | 스트리밍 전용. Cue에서는 400 위험 |
| `n` | 답변 후보가 여러 개면 Cue 파서가 혼란. 사용 금지 |
| `temperature` | Cue 예약 필드. 변경 불가 |
| `response_format` | DeepSeek/OpenAI Chat에서는 가능. Anthropic에는 없음 |
| `output_config.format` | Anthropic 구조화 출력. 패러프레이즈/보정에도 적용되는 점 주의 |
| 높은 `effort`/`thinking` | 90초 요청 예산을 넘기거나 출력 토큰을 많이 사용할 수 있음 |

### 1.6 빠른 선택표

| 목적 | DeepSeek | OpenAI 공식 Chat | Claude |
|---|---|---|---|
| 빠른 객관식 | `deepseek-fast` | `gpt-4o-fast` 또는 `gpt-5-fast` | `claude-fast` |
| 균형 | `deepseek-balanced` | `gpt-balanced` | `claude-balanced` |
| 고난도 | `deepseek-deep` | `gpt-deep` | `claude-deep` |
| JSON 안정성 | `deepseek-json` | `gpt-json` | `claude-json` |
| 교차 검증 | `deepseek-balanced` | `gpt-balanced` | `claude-balanced` |

---

## 2. DeepSeek

### 2.1 연결 설정

Cue에 DeepSeek 전용 프리셋은 없으므로 **Custom**을 사용합니다.

| 항목 | 값 |
|---|---|
| 프로바이더 | Custom |
| Base URL | `https://api.deepseek.com/v1` |
| 모델 예 | `deepseek-v4-pro`, `deepseek-flash` |
| API 키 | DeepSeek Platform 키 |
| 비전 | 공식 Chat 문서의 요청 본문만으로는 이미지 입력 지원이 확인되지 않음. Cue는 캡처 이미지를 보내므로 **연결 테스트로 비전 지원을 먼저 확인** |

### 2.2 추천 프리셋

#### deepseek-fast — 빠른 객관식

```json
{
  "reasoning_effort": "none",
  "max_tokens": 4096
}
```

- thinking을 끄고 빠르게 답합니다.
- 일반 객관식·짧은 질문에 적합합니다.

#### deepseek-balanced — 균형

```json
{
  "reasoning_effort": "low",
  "max_tokens": 8192
}
```

- 약간의 추론을 허용합니다.
- 시험 문제 대부분에 무난합니다.

#### deepseek-deep — 고난도

```json
{
  "reasoning_effort": "high",
  "max_tokens": 16384
}
```

- 추론 토큰이 늘어나 느려질 수 있습니다.
- 계산·논리·긴 지문에 적합합니다.

#### deepseek-max — 최대 추론

```json
{
  "reasoning_effort": "max",
  "max_tokens": 32768
}
```

- 가장 느리고 토큰을 많이 사용합니다.
- 90초 예산을 넘기면 `timeout`이 날 수 있습니다.
- 정말 어려운 문제에만 사용하세요.

#### deepseek-thinking-off — thinking 명시적 끄기

```json
{
  "thinking": {
    "type": "disabled"
  },
  "max_tokens": 8192
}
```

- `reasoning_effort: "none"`과 같은 방향입니다.
- **`thinking`과 `reasoning_effort`를 동시에 넣지 마세요.** 하나만 사용합니다.

#### deepseek-json — JSON 출력 고정

```json
{
  "reasoning_effort": "none",
  "max_tokens": 8192,
  "response_format": {
    "type": "json_object"
  }
}
```

- Cue의 객관식 프롬프트는 이미 JSON을 요구하므로 보통 없어도 됩니다.
- 패러프레이즈를 켜면 패러프레이즈 요청에도 `json_object`가 적용되어 출력이 깨질 수 있습니다. **패러프레이즈를 끄고 사용**하세요.

### 2.3 DeepSeek 파라미터 표

| 파라미터 | 의미 | Cue 판단 |
|---|---|---|
| `max_tokens` | 출력 토큰 상한. 1~393,216. 기본 8K(비thinking), 64K(thinking), 128K(max effort) | 사용 권장. thinking이면 8192 이상 |
| `thinking` | `enabled`/`disabled`. 기본 enabled | 사용 가능. `reasoning_effort`와 중복 사용 금지 |
| `reasoning_effort` | `none`/`low`/`high`/`max`. 기본 high. `none`은 thinking 끔 | 사용 권장 |
| `response_format` | `text`/`json_object` | 사용 가능. 패러프레이즈/보정 요청에도 적용 주의 |
| `stop` | 최대 16개 stop 문자열 | 사용 가능하지만 JSON 절단 위험 |
| `top_p` | thinking에서만 0.95~1.0 유효, 비thinking은 1.0 고정 | 거의 효과 없음 |
| `temperature` | 0~2. thinking에서 무효 | **Cue 예약 필드. 변경 불가** |
| `presence_penalty` | thinking에서 무효, 폐기 | 넣지 말 것 |
| `frequency_penalty` | thinking에서 무효 | 넣지 말 것 |
| `logprobs` / `top_logprobs` | 토큰 확률 | Cue가 사용하지 않음 |
| `tools` / `tool_choice` | 함수 호출 | **Cue에서 사용 금지** |
| `stream` | SSE 스트리밍 | **Cue 차단** |
| `stream_options` | stream 전용 | **Cue에서 400 위험** |
| `model`, `messages` | 모델·대화 | **Cue 예약 필드** |
| `n`, `seed`, `max_completion_tokens` | 현재 DeepSeek Chat 문서에 없음 | 사용하지 말 것 |

---

## 3. GPT / OpenAI

Cue는 프리셋에 따라 GPT를 **서로 다른 API**로 보냅니다.

| 경로 | Cue 라우팅 | 토큰 필드 | 추론 필드 |
|---|---|---|---|
| OpenAI 프리셋 | Chat Completions | GPT-4o: `max_tokens`, GPT-5/o-series: `max_completion_tokens` | `reasoning_effort` |
| OpenCode Go/Zen의 `gpt-*` | Responses | `max_output_tokens` | `reasoning.effort` |

> OpenAI 프리셋의 Chat 요청에는 Cue가 `temperature: 0`을 넣습니다. GPT-5/o-series가 temperature를 거부하면 400이 날 수 있습니다. 이 경우 OpenCode Go/Zen의 Responses 경로나 temperature를 허용하는 모델을 사용하세요.

### 3.1 OpenAI 공식 프리셋 — Chat Completions

#### gpt-4o-fast — GPT-4o 계열 빠른 답변

```json
{
  "max_tokens": 4096,
  "response_format": {
    "type": "json_object"
  },
  "store": false
}
```

- GPT-4o/4.1 계열은 `max_tokens`를 사용합니다.
- `store: false`는 응답 저장을 줄이는 privacy 설정입니다. 프록시가 거부하면 제거하세요.

#### gpt-5-fast — GPT-5/o-series 빠른 답변

```json
{
  "max_completion_tokens": 4096,
  "reasoning_effort": "low",
  "store": false
}
```

- GPT-5/o-series Chat은 `max_completion_tokens`와 `reasoning_effort`를 사용합니다.
- temperature 0을 거부하는 모델이면 400이 날 수 있습니다.

#### gpt-balanced — 균형

```json
{
  "max_completion_tokens": 8192,
  "reasoning_effort": "medium",
  "store": false
}
```

#### gpt-deep — 고난도

```json
{
  "max_completion_tokens": 16384,
  "reasoning_effort": "high",
  "store": false
}
```

#### gpt-json — JSON 안정성

```json
{
  "max_completion_tokens": 8192,
  "reasoning_effort": "low",
  "response_format": {
    "type": "json_object"
  },
  "store": false
}
```

- 패러프레이즈를 켜면 패러프레이즈 요청에도 JSON 형식이 적용됩니다. **패러프레이즈를 끄고 사용**하세요.

#### gpt-deterministic — 반복 재현

```json
{
  "max_completion_tokens": 8192,
  "reasoning_effort": "low",
  "seed": 12345,
  "store": false
}
```

- `seed`는 완전한 결정성을 보장하지 않지만 변동을 줄이는 데 도움이 됩니다.
- 모델/공급자가 seed를 지원하지 않으면 400이 날 수 있습니다.

### 3.2 OpenCode Go/Zen의 GPT — Responses

OpenCode Go/Zen에서 `gpt-*` 모델은 Cue가 Responses API로 라우팅합니다. 이 경로에서는 **`max_completion_tokens`가 아니라 `max_output_tokens`** 를 사용합니다.

#### gpt-responses-fast

```json
{
  "max_output_tokens": 4096,
  "reasoning": {
    "effort": "low"
  },
  "text": {
    "verbosity": "low"
  }
}
```

#### gpt-responses-balanced

```json
{
  "max_output_tokens": 8192,
  "reasoning": {
    "effort": "medium"
  },
  "text": {
    "verbosity": "low"
  }
}
```

#### gpt-responses-deep

```json
{
  "max_output_tokens": 16384,
  "reasoning": {
    "effort": "high"
  },
  "text": {
    "verbosity": "medium"
  }
}
```

- OpenCode 프록시가 `store`/`service_tier`/`text.verbosity`를 거부할 수 있습니다. 400이면 해당 필드를 제거하세요.
- `reasoning.effort` 지원 값은 모델에 따라 다릅니다. `low`/`medium`/`high`부터 시도하세요.

### 3.3 GPT 파라미터 표

| 파라미터 | 경로 | 의미 | Cue 판단 |
|---|---|---|---|
| `max_tokens` | Chat (구형) | 출력 상한. o-series와 비호환 | GPT-4o 계열만 |
| `max_completion_tokens` | Chat (신형) | 출력+추론 토큰 상한 | GPT-5/o-series |
| `max_output_tokens` | Responses | 출력 상한 | OpenCode Go/Zen `gpt-*` |
| `reasoning_effort` | Chat | 추론 강도 | OpenAI 공식 Chat |
| `reasoning.effort` | Responses | 추론 강도 | OpenCode Go/Zen Responses |
| `text.verbosity` | Responses | 답변 길이 성향 | Responses에서만 |
| `response_format` | Chat | JSON/스키마 출력 | 사용 가능. 패러프레이즈 주의 |
| `seed` | Chat | 샘플링 시드 | 사용 가능. 모델 지원 확인 |
| `stop` | Chat | stop 문자열 | JSON 절단 위험 |
| `top_p` | Chat | nucleus sampling | temperature를 못 쓰므로 제한적 |
| `frequency_penalty` | Chat | 반복 억제 | 사용 가능하지만 답변 형식에 영향 |
| `presence_penalty` | Chat | 새 주제 유도 | 사용 가능하지만 답변 형식에 영향 |
| `logit_bias` | Chat | 토큰 편향 | Cue 용도에 비권장 |
| `logprobs` / `top_logprobs` | Chat | 확률 반환 | Cue가 사용하지 않음 |
| `store` | Chat/Responses | 응답 저장 | privacy를 위해 `false` 권장. 프록시 지원 확인 |
| `tools` / `tool_choice` | 공통 | 함수 호출 | **Cue에서 사용 금지** |
| `stream` | 공통 | 스트리밍 | **Cue 차단** |
| `n` | Chat | 다중 후보 | **Cue에서 사용 금지** |
| `temperature` | 공통 | 샘플링 | **Cue 예약 필드** |
| `service_tier` | Responses | 처리 등급 | 비권장. 지연·비용 정책에 영향 |

---

## 4. Claude / Anthropic

### 4.1 연결 설정

| 항목 | 값 |
|---|---|
| 프로바이더 | Anthropic |
| Base URL | 공식 Anthropic 주소 고정 |
| 모델 | 사용 가능한 Claude 모델 |
| API 키 | Anthropic 키 |
| 특징 | 이미지 입력 지원, `max_tokens` 필수 |

### 4.2 추천 프리셋

#### claude-fast — 빠른 답변

```json
{
  "max_tokens": 4096,
  "thinking": {
    "type": "disabled"
  }
}
```

- thinking을 끄고 지연을 줄입니다.
- 모델이 `thinking.type: disabled`를 지원하지 않으면 `thinking`을 제거하세요.

#### claude-balanced — 균형

```json
{
  "max_tokens": 8192,
  "thinking": {
    "type": "adaptive"
  }
}
```

- 현재 Claude 모델의 adaptive thinking을 사용합니다.
- `max_tokens`가 thinking 출력까지 포함하므로 4096보다 8192를 권장합니다.

#### claude-deep — 고난도

```json
{
  "max_tokens": 16384,
  "thinking": {
    "type": "adaptive"
  },
  "output_config": {
    "effort": "high"
  }
}
```

- `effort`는 `low`/`medium`/`high`/`xhigh`/`max` 중 모델이 지원하는 값을 사용합니다.
- 높은 effort는 느리고 90초 예산을 넘길 수 있습니다.

#### claude-careful — 최대 검토

```json
{
  "max_tokens": 24000,
  "thinking": {
    "type": "adaptive"
  },
  "output_config": {
    "effort": "xhigh"
  }
}
```

- `xhigh`/`max`는 모델 지원 여부를 확인해야 합니다.
- 시험 중 실시간 사용보다는 시간 여유가 있을 때 적합합니다.

#### claude-json — 구조화 JSON

```json
{
  "max_tokens": 8192,
  "output_config": {
    "effort": "low",
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": {
          "answers": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "answers"
        ],
        "additionalProperties": false
      }
    }
  }
}
```

- Cue의 객관식 답변 형식 `{ "answers": [...] }`에 맞춘 스키마입니다.
- 패러프레이즈를 켜면 패러프레이즈 요청에도 이 형식이 적용되어 출력이 깨질 수 있습니다. **패러프레이즈를 끄고 사용**하세요.
- 모델/플랜이 구조화 출력 `output_config.format`을 지원하지 않으면 400이 날 수 있습니다.

#### claude-system — 시스템 지시 추가

```json
{
  "max_tokens": 4096,
  "system": "Answer in Korean. Return only the answer.",
  "thinking": {
    "type": "disabled"
  }
}
```

- `system`은 Anthropic Messages의 최상위 필드라 Cue 추가 JSON으로 넣을 수 있습니다.
- Cue의 기본 프롬프트와 충돌하지 않도록 짧게 유지하세요.

### 4.3 Anthropic 파라미터 표

| 파라미터 | 의미 | Cue 판단 |
|---|---|---|
| `max_tokens` | **필수** 출력 상한 | 사용 권장. thinking이면 8192 이상 |
| `system` | 최상위 시스템 프롬프트 | 사용 가능. Cue 프롬프트와 충돌 주의 |
| `thinking` | `adaptive`/`enabled`/`disabled`, budget/display | 사용 가능. 느려짐 |
| `output_config` | `effort`, `format` | 사용 가능. effort high는 느림 |
| `stop_sequences` | stop 문자열 배열 | 사용 가능하지만 JSON 절단 위험 |
| `metadata` | `user_id` 등 | 사용 가능. 답변 영향 없음 |
| `service_tier` | `auto`/`standard_only` | 사용 가능. 지연·비용 정책 |
| `top_p`, `top_k` | 구형 모델 샘플링 | 최신 모델은 무시. temperature만 Cue가 차단 |
| `temperature` | 구형 모델 샘플링 | **Cue 예약 필드** |
| `tools` / `tool_choice` | tool use | **Cue에서 사용 금지** |
| `stream` | SSE | **Cue 차단** |
| `cache_control` | 프롬프트 캐시 | 1회성 캡처에는 이득 적음 |
| `container`, `diagnostics`, `inference_geo` | 신규·고급 기능 | Cue 용도에 비권장 |
| `user_profile_id`, `workspace_id` | SDK 헤더 전용 | body에 넣지 말 것 |
| `output_format` | 폐기됨 | `output_config.format` 사용 |
| `response_format` | Anthropic body 필드가 아님 | 사용 금지 |
| `frequency_penalty`, `presence_penalty`, `seed`, `logprobs`, `n` | 미지원 | 사용 금지 |
| `max_completion_tokens` | OpenAI/Responses식 이름 | Anthropic은 `max_tokens` |

---

## 5. 상황별 Cue 설정 프리셋

| 상황 | 추가 JSON | 답변 유형 | 표시 | 크롭 | 패러프레이즈 | 교차 검증 |
|---|---|---|---|---|---|---|
| 빠른 객관식 | `deepseek-fast` / `gpt-4o-fast` / `claude-fast` | 객관식 | 트레이 + 오버레이 | 켬 | 끔 | 끔 |
| 정확도 우선 | `deepseek-balanced` / `gpt-balanced` / `claude-balanced` | 객관식 | 오버레이 | 켬 | 끔 | 켬 |
| 고난도 문제 | `deepseek-deep` / `gpt-deep` / `claude-deep` | 객관식 | 오버레이 | 끔 | 끔 | 선택 |
| 긴 서술형 | `deepseek-balanced` / `gpt-balanced` / `claude-balanced` | 설명형 | 텍스트 패널 | 끔 | 끔 | 끔 |
| 자유 모드 설명 | `deepseek-fast` / `gpt-4o-fast` / `claude-fast` | 자유 모드 | 텍스트 패널 | 끔 | 끔 | 끔 |
| JSON 안정성 | `deepseek-json` / `gpt-json` / `claude-json` | 객관식 | 오버레이 | 켬 | **끔** | 끔 |
| 시험 직전 최소 지연 | `deepseek-fast` / `claude-fast` | 객관식 | 트레이 | 켬 | 끔 | 끔 |

### 교차 검증을 쓸 때

- Cue의 교차 검증은 **같은 프로바이더·같은 Base URL·같은 키**의 두 번째 모델을 사용합니다.
- 추가 JSON은 두 모델 모두에 적용됩니다. 두 모델이 공통으로 지원하는 필드만 넣으세요.
- 서로 다른 프로바이더를 섞는 교차 검증은 현재 지원하지 않습니다.
- 교차 검증은 요청이 2배, 비용이 2배, 지연이 늘어납니다. 빠른 시험에는 끄는 편이 좋습니다.

---

## 6. 문제 해결

| 증상 | 먼저 확인할 것 |
|---|---|
| `http_400` | 추가 파라미터를 **비우고** 재시도. 토큰 필드 이름과 모델 지원 여부 확인 |
| `http_401` | API 키. 프로바이더를 바꾼 뒤 키를 다시 저장 |
| `http_404` | 모델명/Base URL. Custom이면 `/v1` 경로 확인 |
| `parse` | `response_format`/`output_config.format`/`tools`가 답변 형식을 깨는지 확인. 추가 JSON 비우기 |
| `empty_text` | 모델이 답을 못 찾음. 크롭·문제 위치·비전 지원 확인 |
| `timeout` | thinking/effort를 낮추고 `max_tokens`를 줄이기. 90초 예산 |
| 답이 잘림 | `max_tokens`/`max_completion_tokens`/`max_output_tokens`를 늘리기 |
| 비전 테스트 실패 | 텍스트 전용 모델이거나 이미지 입력을 지원하지 않는 경로. 비전 지원 모델로 변경 |
| 교차 검증 불일치 | 두 모델이 모두 비전 지원인지, 같은 문제를 보고 있는지 확인 |

---

## 7. 참고

- DeepSeek: Create Chat Completion, Thinking Mode 문서.
- OpenAI: Chat Completions, Responses API 문서.
- Anthropic: Messages API, adaptive thinking, structured outputs 문서.
- Cue: `src-tauri/src/ai.rs`의 `merge_extra`와 `build_body`, `src/views/settings/AiTab.tsx`.

이 문서는 파라미터 예시이며, 모델·플랜·게이트웨이에 따라 지원 필드가 달라질 수 있습니다. 400이 나면 **추가 파라미터를 먼저 비우고** 모델과 토큰 필드 이름을 확인하세요.
