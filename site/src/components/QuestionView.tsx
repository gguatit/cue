import { FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Question } from '@/data/questions'
import { difficultyLabels, typeLabels, type FontScale } from '@/lib/lab'
import { cn } from '@/lib/utils'

export function QuestionView({
  question,
  size = 'md',
  cueMode = false,
}: {
  question: Question
  size?: FontScale
  cueMode?: boolean
}) {
  const promptClass =
    size === 'lg' ? 'text-2xl leading-10' : size === 'sm' ? 'text-lg leading-8' : 'text-xl leading-9'
  const bodyClass =
    size === 'lg' ? 'text-base leading-8' : size === 'sm' ? 'text-sm leading-7' : 'text-[15px] leading-7'

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
            className={cn(
              'rounded-md font-normal',
              question.difficulty >= 4 && 'bg-destructive/10 text-destructive',
            )}
          >
            {difficultyLabels[question.difficulty]}
          </Badge>
          {cueMode && (
            <Badge variant="outline" className="ml-auto rounded-md border-primary/30 text-primary">
              <FlaskConical data-icon="inline-start" />
              Cue 테스트
            </Badge>
          )}
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            QUESTION {String(question.id).padStart(3, '0')}
          </p>
          <h2 className={cn('mt-1 font-semibold tracking-[-0.02em]', promptClass)}>
            {question.prompt}
          </h2>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {question.passage && (
          <div className={cn('rounded-xl border border-border/70 bg-muted/30 p-4 text-foreground/90', bodyClass)}>
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">지문</p>
            <p className="whitespace-pre-line">{question.passage}</p>
          </div>
        )}

        {question.code && (
          <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
            <code>{question.code}</code>
          </pre>
        )}

        {question.options.length > 0 ? (
          <div className="grid gap-2">
            {question.options.map((option) => (
              <div
                key={option.label}
                className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-foreground/85"
              >
                <span className="shrink-0 font-semibold text-primary">{option.label}</span>
                <span className={bodyClass}>{option.text}</span>
              </div>
            ))}
          </div>
        ) : question.type === 'ox' ? (
          <div className="flex gap-2">
            {['O', 'X'].map((label) => (
              <div
                key={label}
                className="flex min-w-20 items-center justify-center rounded-xl border border-border bg-card py-3 text-lg font-semibold text-foreground"
              >
                {label}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            서술형·단답형 화면입니다. Cue로 캡처해 답변 생성을 테스트하세요.
          </p>
        )}

        <Separator />
        <p className="text-xs leading-5 text-muted-foreground">
          정답 입력과 채점은 없습니다. 발표 중 Cue의 캡처·AI·표시 동작을 확인하는 테스트 화면입니다.
        </p>
      </CardContent>
    </Card>
  )
}
