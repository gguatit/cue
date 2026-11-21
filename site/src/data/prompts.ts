export type PromptCategoryId = 'answer' | 'explain' | 'study' | 'format' | 'code'

export interface PromptCategory {
  id: PromptCategoryId
  label: string
  description: string
}

export interface GeneralPrompt {
  id: string
  category: PromptCategoryId
  label: string
  description: string
  text: string
}

export const promptCategories: PromptCategory[] = [
  { id: 'answer', label: '답과 풀이', description: '정답, 풀이, 오답을 확인합니다.' },
  { id: 'explain', label: '설명과 힌트', description: '이해를 돕는 설명과 힌트입니다.' },
  { id: 'study', label: '학습 정리', description: '채점 기준과 내 답안을 정리합니다.' },
  { id: 'format', label: '정리와 변환', description: '내용을 표·요약·번역으로 바꿉니다.' },
  { id: 'code', label: '코드', description: '코드와 오류를 분석합니다.' },
]

export const generalPrompts: GeneralPrompt[] = [
  {
    id: 'answer-reason',
    category: 'answer',
    label: '정답과 이유',
    description: '정답을 먼저 말하고 이유를 설명합니다.',
    text: '화면에 보이는 문제의 정답을 먼저 말하고, 왜 그 답이 맞는지 단계별로 설명해줘.',
  },
  {
    id: 'solve-steps',
    category: 'answer',
    label: '단계별 풀이',
    description: '풀이 과정을 순서대로 보여줍니다.',
    text: '화면에 보이는 문제를 처음부터 끝까지 단계별로 풀어줘. 중간 계산과 판단 근거를 빠뜨리지 마.',
  },
  {
    id: 'compare-options',
    category: 'answer',
    label: '오답 비교',
    description: '각 선택지의 맞고 틀린 이유를 비교합니다.',
    text: '화면에 보이는 문제의 각 선택지가 왜 맞는지 또는 왜 틀린지 하나씩 비교해줘. 마지막에 정답을 정리해줘.',
  },
  {
    id: 'hint-only',
    category: 'explain',
    label: '힌트만',
    description: '정답 없이 풀이 방향만 제공합니다.',
    text: '화면에 보이는 문제의 정답은 말하지 말고, 스스로 풀 수 있도록 핵심 힌트만 3개 줘.',
  },
  {
    id: 'concept',
    category: 'explain',
    label: '핵심 개념 3줄',
    description: '문제에 필요한 개념만 짧게 정리합니다.',
    text: '화면에 보이는 문제를 풀기 위해 필요한 핵심 개념을 3줄로 정리해줘. 어려운 용어는 짧게 풀어서 설명해줘.',
  },
  {
    id: 'easy',
    category: 'explain',
    label: '쉬운 설명',
    description: '처음 배우는 사람도 이해하게 설명합니다.',
    text: '화면에 보이는 문제를 처음 배우는 사람도 이해할 수 있게 아주 쉽게 설명해줘. 마지막에 정답을 알려줘.',
  },
  {
    id: 'grading',
    category: 'study',
    label: '채점 기준',
    description: '서술형 답안의 핵심 포인트를 정리합니다.',
    text: '화면에 보이는 서술형 문제의 모범답안과 채점 기준을 알려줘. 꼭 들어가야 하는 핵심 포인트와 감점 요소를 구분해줘.',
  },
  {
    id: 'review-answer',
    category: 'study',
    label: '내 답안 검토',
    description: '내가 쓴 답안의 빠진 부분을 찾습니다.',
    text: '화면에 보이는 문제와 내가 작성한 답안을 비교해줘. 맞은 부분, 빠진 부분, 고칠 부분을 구분해서 알려줘.',
  },
  {
    id: 'three-lines',
    category: 'format',
    label: '3줄 요약',
    description: '핵심만 세 줄로 정리합니다.',
    text: '화면에 보이는 내용을 핵심만 남겨 3줄로 요약해줘. 중요한 숫자나 조건은 빠뜨리지 마.',
  },
  {
    id: 'table',
    category: 'format',
    label: '표로 정리',
    description: '비교할 내용을 표로 정리합니다.',
    text: '화면에 보이는 내용을 비교하기 쉬운 표로 정리해줘. 항목, 차이, 주의할 점이 드러나게 해줘.',
  },
  {
    id: 'translate-ko',
    category: 'format',
    label: '한국어로 번역',
    description: '영어 지문이나 코드 설명을 번역합니다.',
    text: '화면에 보이는 영어 지문이나 설명을 자연스러운 한국어로 번역해줘. 전문 용어는 원어를 괄호에 함께 표시해줘.',
  },
  {
    id: 'code-flow',
    category: 'code',
    label: '코드 실행 흐름',
    description: '코드가 어떤 순서로 동작하는지 설명합니다.',
    text: '화면에 보이는 코드가 어떤 순서로 실행되는지, 입력과 출력이 어떻게 바뀌는지 단계별로 설명해줘.',
  },
  {
    id: 'code-review',
    category: 'code',
    label: '오류와 개선점',
    description: '코드의 오류와 개선 방향을 찾습니다.',
    text: '화면에 보이는 코드에서 오류가 날 수 있는 부분과 개선할 점을 찾아줘. 가능하면 수정 예시도 보여줘.',
  },
]
