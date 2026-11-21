import { Bookmark, Check, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { Question } from '@/data/questions'
import { answerLabel, answerSummary, isChoiceQuestion, isMultiQuestion, isTextQuestion, type AnswerValue, type Grade } from '@/lib/study'
import { cn } from '@/lib/utils'

const typeLabels: Record<string, string> = {
  choice3: '3지선다',
  choice4: '4지선다',
  choice5: '5지선다',
  multi: '복수 선택',
  short: '단답형',
  calc: '계산형',
  descriptive: '서술형',
  reading: '독해',
  code: '코드',
  ox: 'OX',
}

const difficultyLabels: Record<number, string> = {
  1: '기본',
  2: '보통',
  3: '심화',
  4: '고난도',
}

const gradeLabels: Record<Grade, string> = {
  correct: '맞음',
  incorrect: '틀림',
  review: '검토',
}

function asArray(value: AnswerValue | undefined): string[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

export function QuestionView({
  question,
  value,
  grade,
  answer,
  bookmarked,
  cueMode = false,
  checking = false,
  error = '',
  onAnswer,
  onGrade,
  onCheck,
  onReveal,
  onHideAnswer,
  onToggleBookmark,
  onPrev,
  onNext,
}: {
  question: Question
  value?: AnswerValue
  grade?: Grade
  answer?: string
  bookmarked: boolean
  cueMode?: boolean
  checking?: boolean
  error?: string
  onAnswer: (value: AnswerValue) => void
  onGrade: (grade: Grade) => void
  onCheck: () => void
  onReveal: () => void
  onHideAnswer: () => void
  onToggleBookmark: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const selected = asArray(value)
  const choice = isChoiceQuestion(question)
  const multi = isMultiQuestion(question)
  const textQuestion = isTextQuestion(question)
  const answerVisible = Boolean(answer)
  const correct = grade === 'correct'

  const toggleChoice = (label: string) => {
    if (multi) {
      const next = selected.includes(label)
        ? selected.filter((item) => item !== label)
        : [...selected, label]
      onAnswer(next)
      return
    }
    onAnswer(label)
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="gap-3 border-b border-border/70 bg-card pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">
            {question.subject}
          </Badge>
          <Badge variant="secondary" className="rounded-md font-normal">
            {question.topic}
          </Badge>
          <Badge variant="outline" className="rounded-md font-normal">
            {typeLabels[question.type] ?? question.type}
          </Badge>
          <Badge
            variant={question.difficulty >= 4 ? 'destructive' : 'outline'}
            className={cn('rounded-md font-normal', question.difficulty >= 4 && 'bg-destructive/10 text-destructive')}
          >
            {difficultyLabels[question.difficulty]}
          </Badge>
          {cueMode && (
            <Badge variant="outline" className="ml-auto rounded-md border-primary/30 text-primary">
              Cue 테스트
            </Badge>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              QUESTION {String(question.id).padStart(3, '0')}
            </p>
            <h2 className="mt-1 text-xl font-semibold leading-8 tracking-[-0.02em]">
              {question.prompt}
            </h2>
          </div>
          <Button
            type="button"
            variant={bookmarked ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={onToggleBookmark}
            aria-label={bookmarked ? '북마크 해제' : '북마크'}
            title={bookmarked ? '북마크 해제' : '북마크'}
            className="shrink-0"
          >
            <Bookmark className={cn('size-4', bookmarked && 'fill-current')} />
          </Button>
        </div>
        {question.hint && (
          <p className="text-xs text-muted-foreground">{question.hint}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {question.passage && (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-foreground/90">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">지문</p>
            <p className="whitespace-pre-line">{question.passage}</p>
          </div>
        )}

        {question.code && (
          <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
            <code>{question.code}</code>
          </pre>
        )}

        {choice ? (
          <div className="grid gap-2">
            {question.options.map((option) => {
              const checked = selected.includes(option.label)
              return (
                <label
                  key={option.label}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-6 transition-colors',
                    checked
                      ? 'border-primary/50 bg-primary/5 text-foreground'
                      : 'border-border bg-card text-foreground/85 hover:border-primary/30 hover:bg-muted/30',
                  )}
                >
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={`question-${question.id}`}
                    checked={checked}
                    onChange={() => toggleChoice(option.label)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="shrink-0 font-semibold text-primary">{option.label}</span>
                  <span>{option.text}</span>
                </label>
              )
            })}
          </div>
        ) : question.type === 'ox' ? (
          <div className="flex gap-2">
            {['O', 'X'].map((label) => (
              <Button
                key={label}
                type="button"
                variant={selected.includes(label) ? 'default' : 'outline'}
                className="min-w-20 text-lg"
                onClick={() => onAnswer(label)}
              >
                {label}
              </Button>
            ))}
          </div>
        ) : textQuestion ? (
          question.type === 'descriptive' ? (
            <Textarea
              value={selected[0] ?? ''}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder="자유롭게 답을 작성하세요. 작성 내용은 이 브라우저에만 저장됩니다."
              rows={6}
              className="resize-y"
              aria-label="자유응답"
            />
          ) : (
            <Input
              value={selected[0] ?? ''}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder="답을 입력하세요."
              className="h-11"
              aria-label="답안"
            />
          )
        ) : null}

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          {!cueMode && (
            <>
              <Button
                type="button"
                variant={grade ? 'secondary' : 'default'}
                onClick={onCheck}
                disabled={checking}
              >
                <Check data-icon="inline-start" />
                {checking ? '채점 중…' : '채점'}
              </Button>
              {answerVisible ? (
                <Button type="button" variant="outline" onClick={onHideAnswer}>
                  <EyeOff data-icon="inline-start" />
                  정답 숨기기
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={onReveal}>
                  <Eye data-icon="inline-start" />
                  정답 보기
                </Button>
              )}
              {question.type === 'descriptive' && (
                <>
                  <Button type="button" variant="outline" onClick={() => onGrade('correct')}>
                    맞음
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onGrade('incorrect')}>
                    틀림
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onGrade('review')}>
                    <RotateCcw data-icon="inline-start" />
                    보류
                  </Button>
                </>
              )}
            </>
          )}
          {cueMode && (
            <p className="text-xs text-muted-foreground">
              Cue 테스트 중에는 정답을 숨깁니다. 학습 모드에서 확인할 수 있습니다.
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" size="icon" onClick={onPrev} aria-label="이전 문제">
              <ChevronLeft />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label="다음 문제">
              <ChevronRight />
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {answerVisible && answer && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md bg-primary text-primary-foreground hover:bg-primary">
                정답
              </Badge>
              <span className="text-sm font-semibold text-foreground">{answerSummary(question, answer)}</span>
              {grade && (
                <Badge
                  variant={correct ? 'secondary' : grade === 'incorrect' ? 'destructive' : 'outline'}
                  className={cn('ml-auto rounded-md', correct && 'bg-emerald-100 text-emerald-700')}
                >
                  {gradeLabels[grade]}
                </Badge>
              )}
            </div>
            {choice && question.options.length > 0 && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {question.options
                  .filter((option) => answer.split(',').map((item) => item.trim()).includes(option.label))
                  .map((option) => `${option.label}. ${option.text}`)
                  .join(' · ')}
              </p>
            )}
            {question.type === 'descriptive' && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {answerLabel(question, answer)}
              </p>
            )}
            {question.type === 'ox' && (
              <p className="mt-2 text-sm text-muted-foreground">정답: {answerLabel(question, answer)}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
