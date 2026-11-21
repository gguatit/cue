import { useMemo, useState } from 'react'
import { Check, Copy, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { Question } from '@/data/questions'
import { buildPrompt, promptPresets, type PromptId } from '@/data/prompts'
import type { AnswerValue } from '@/lib/study'

export function PromptPanel({
  question,
  myAnswer,
  compact = false,
}: {
  question: Question
  myAnswer?: AnswerValue
  compact?: boolean
}) {
  const [preset, setPreset] = useState<PromptId>('answer-reason')
  const [copied, setCopied] = useState(false)

  const answerText = Array.isArray(myAnswer) ? myAnswer.join(', ') : myAnswer
  const prompt = useMemo(
    () => buildPrompt(preset, question, answerText),
    [preset, question, answerText],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <CardTitle className="text-base">프리셋 프롬프트</CardTitle>
            <Badge variant="secondary" className="font-normal">
              복사용
            </Badge>
          </div>
          <a
            href="/prompts/cue-prompts.md"
            download
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Markdown 다운로드
          </a>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Cue 자유 모드에 붙여넣을 프롬프트입니다. 사이트는 AI를 호출하지 않습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as PromptId)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="프롬프트 프리셋"
          >
            {promptPresets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} — {item.description}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => void copy()} className="shrink-0">
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? '복사됨' : '프롬프트 복사'}
          </Button>
        </div>
        <Textarea
          readOnly
          value={prompt}
          rows={compact ? 6 : 9}
          className="resize-none bg-muted/35 font-mono text-[12px] leading-5 text-foreground"
          aria-label="생성된 프롬프트"
        />
      </CardContent>
    </Card>
  )
}
