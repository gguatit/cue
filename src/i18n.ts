import { useCallback } from 'react'
import { useSettings } from './stores/settings'

export function useT() {
  const lang = useSettings((s) => s.language)
  return useCallback((en: string, ko: string) => (lang === 'ko' ? ko : en), [lang])
}

export function t(en: string, ko: string): string {
  return useSettings.getState().language === 'ko' ? ko : en
}

export const ERRORS: Record<string, [string, string]> = {
  no_key: ['Enter your API key in Settings', '설정에서 API 키를 입력하세요'],
  http_401: ['API key is not valid', 'API 키가 유효하지 않습니다'],
  http_404: ['Check the model name or Base URL', '모델 또는 Base URL을 확인하세요'],
  http_400: ['The provider rejected the request. Check the model and extra parameters', '공급자가 요청을 거부했습니다. 모델과 추가 파라미터를 확인하세요'],
  http_429: ['Too many requests. Wait a moment and try again', '요청이 너무 많습니다. 잠시 후 다시 시도하세요'],
  http_5xx: ['Server error. Try again later', '서버 오류입니다. 잠시 후 다시 시도하세요'],
  free_model: ['OpenCode free models only work inside the OpenCode app. Choose another model', 'OpenCode 무료 모델은 OpenCode 앱에서만 사용할 수 있습니다. 다른 모델을 선택하세요'],
  model_disabled: ['This model is not enabled for your OpenCode plan', '이 모델은 현재 OpenCode 플랜에서 사용할 수 없습니다'],
  model_protocol: ['This model does not support the selected API protocol', '이 모델은 선택한 API 방식과 호환되지 않습니다'],
  model_unavailable: ['The provider reports this model endpoint is unavailable. Try another model', '공급자가 이 모델 엔드포인트를 사용할 수 없다고 응답했습니다. 다른 모델을 선택하세요'],
  model_session: ['OpenCode Go session header is missing. Restart Cue and try again', 'OpenCode Go 세션 헤더가 없습니다. Cue를 다시 시작한 뒤 시도하세요'],
  network: ['Cannot reach the server. Check your network', '연결할 수 없습니다. 네트워크를 확인하세요'],
  parse: ['Could not parse the AI response', 'AI 응답 형식을 해석하지 못했습니다'],
  vision: ['The model may not support vision. Choose a vision-capable model', '모델이 비전을 지원하지 않을 수 있습니다. 비전 지원 모델을 선택하세요'],
  empty: ['No multiple-choice answer found. Point at a question and try again', '객관식 답을 찾지 못했습니다. 문제를 가리키고 다시 시도하세요'],
  empty_text: ['No descriptive answer found. Point at a question and try again', '설명형 답을 찾지 못했습니다. 문제를 가리키고 다시 시도하세요'],
  capture: ['Could not capture the screen', '화면을 캡처할 수 없습니다'],
  busy: ['A search is already running', '이미 검색이 실행 중입니다'],
  cancelled: ['The request was cancelled', '요청이 취소되었습니다'],
  timeout: ['The request took too long. Try again', '요청 시간이 너무 길어 중단했습니다. 다시 시도하세요'],
  extra: ['Extra JSON cannot override temperature, model, messages, input, contents, or stream', '추가 JSON으로 temperature, model, messages, input, contents, stream을 덮어쓸 수 없습니다'],
  config: ['Check the extra parameters JSON', '추가 파라미터 JSON을 확인하세요'],
  keystore: ['Credential store is unavailable', '자격증명 저장소를 사용할 수 없습니다'],
  shortcut: ['Could not register the shortcut', '단축키를 등록할 수 없습니다'],
  tray: ['Could not update the tray icon', '트레이 아이콘을 갱신할 수 없습니다'],
  link: ['This link is not permitted', '허용되지 않은 링크입니다'],
  autostart: ['Could not change the autostart setting', '자동 실행 설정을 변경할 수 없습니다'],
  guard: ['Could not change the survival guard', '생존 보호를 변경할 수 없습니다'],
  stealth: ['Could not apply the security setting', '보안 설정을 적용할 수 없습니다'],
  led: ['Could not blink the keyboard LED', '키보드 LED를 깜빡일 수 없습니다'],
  brightness: ['Could not dim the screen', '화면 밝기를 조절할 수 없습니다'],
  clipboard: ['Could not copy to the clipboard', '클립보드에 복사할 수 없습니다'],
  admin: ['Could not change administrator mode', '관리자 모드를 변경할 수 없습니다'],
  admin_copy: ['Administrator mode needs the protected copy created by Cue setup. Run the installer again', '관리자 모드에는 Cue 설치 프로그램이 만든 보호 복사본이 필요합니다. 설치 프로그램을 다시 실행하세요'],
  defender: ['Could not add the Windows Defender exclusion', 'Windows Defender 예외를 추가할 수 없습니다'],
}

export function errorPair(code: string): [string, string] {
  return ERRORS[code] ?? [code, code]
}

export function errorMessage(code: string): string {
  const e = errorPair(code)
  return useSettings.getState().language === 'ko' ? e[1] : e[0]
}

export function trayMenuLabels() {
  return {
    open: t('Open Cue…', 'Cue 열기…'),
    help: t('Help', '사용법'),
    last: t('Last answer', '마지막 답'),
    copy: t('Copy last answer', '마지막 답 복사'),
    clear: t('Clear', '지우기'),
    quit: t('Quit', '종료'),
  }
}
