import type { Question } from '../data/questions'

export type PromptId =
  | 'answer-reason'
  | 'wrong-analysis'
  | 'hint-only'
  | 'concept'
  | 'easy'
  | 'grading'
  | 'my-answer'
  | 'wrong-note'

export interface PromptPreset {
  id: PromptId
  label: string
  description: string
  build: (question: Question, myAnswer?: string) => string
}

function optionLines(question: Question): string {
  return question.options.map((option) => `${option.label}. ${option.text}`).join('\n')
}

export function questionContext(question: Question): string {
  const parts = [
    `문제 ${question.id} · ${question.subject} · ${question.topic} · 난이도 ${question.difficulty}`,
    question.passage ? `[지문]\n${question.passage}` : '',
    question.code ? `[코드]\n${question.code}` : '',
    `[문제]\n${question.prompt}`,
    question.options.length ? `[선택지]\n${optionLines(question)}` : '',
  ]
  return parts.filter(Boolean).join('\n\n')
}

export const promptPresets: PromptPreset[] = [
  {
    id: 'answer-reason',
    label: '정답과 이유',
    description: '정답과 단계별 풀이를 설명합니다.',
    build: (question) =>
      `${questionContext(question)}\n\n정답을 먼저 말하고, 왜 그 답이 맞는지 단계별로 설명해줘.`,
  },
  {
    id: 'wrong-analysis',
    label: '오답 분석',
    description: '각 선택지가 왜 맞고 틀린지 비교합니다.',
    build: (question) =>
      `${questionContext(question)}\n\n정답을 고른 뒤, 각 선택지가 왜 맞거나 틀린지 하나씩 비교해줘.`,
  },
  {
    id: 'hint-only',
    label: '힌트만',
    description: '정답 없이 풀이 방향만 제공합니다.',
    build: (question) =>
      `${questionContext(question)}\n\n정답은 말하지 말고, 스스로 풀 수 있도록 핵심 힌트만 3개 줘.`,
  },
  {
    id: 'concept',
    label: '핵심 개념 3줄',
    description: '문제에 필요한 개념만 짧게 정리합니다.',
    build: (question) =>
      `${questionContext(question)}\n\n이 문제를 풀기 위해 필요한 핵심 개념을 3줄로 정리해줘.`,
  },
  {
    id: 'easy',
    label: '쉬운 설명',
    description: '중학생도 이해할 수 있게 설명합니다.',
    build: (question) =>
      `${questionContext(question)}\n\n중학생도 이해할 수 있게 아주 쉽게 설명하고, 마지막에 정답을 알려줘.`,
  },
  {
    id: 'grading',
    label: '채점 기준',
    description: '서술형 답안의 채점 포인트를 정리합니다.',
    build: (question) =>
      `${questionContext(question)}\n\n서술형 답안을 채점한다면 필요한 핵심 포인트와 감점 요소를 표로 정리해줘.`,
  },
  {
    id: 'my-answer',
    label: '내 답 비교',
    description: '내 자유응답과 모범답안을 비교합니다.',
    build: (question, myAnswer) =>
      `${questionContext(question)}\n\n내 답안:\n${myAnswer?.trim() || '(아직 작성하지 않음)'}\n\n내 답안과 모범답안을 비교하고, 빠진 내용과 고칠 점을 알려줘.`,
  },
  {
    id: 'wrong-note',
    label: '오답 노트',
    description: '내가 고른 답을 기준으로 실수를 분석합니다.',
    build: (question, myAnswer) =>
      `${questionContext(question)}\n\n내가 고른 답/작성한 답:\n${myAnswer?.trim() || '(아직 작성하지 않음)'}\n\n내 답이 왜 틀렸는지, 어떤 개념을 다시 봐야 하는지 오답 노트 형식으로 정리해줘.`,
  },
]

export function buildPrompt(
  presetId: PromptId,
  question: Question,
  myAnswer?: string,
): string {
  const preset = promptPresets.find((item) => item.id === presetId) ?? promptPresets[0]
  return preset.build(question, myAnswer)
}
