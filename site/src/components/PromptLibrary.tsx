import { useState } from 'react'
import { Check, Copy, Download, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { generalPrompts, promptCategories } from '@/data/prompts'
import { cn } from '@/lib/utils'

export function PromptLibrary({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className={cn('space-y-6', compact && 'space-y-4')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h2 className="text-xl font-semibold tracking-[-0.02em]">범용 프롬프트</h2>
            <Badge variant="secondary" className="font-normal">
              복사용
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            문제에 묶이지 않은 Cue 자유 모드용 프롬프트입니다. 화면을 띄운 뒤 원하는 프롬프트를 복사해 붙여넣으세요.
          </p>
        </div>
        <a href="/prompts/cue-prompts.md" download className={buttonVariants({ variant: 'outline' })}>
          <Download data-icon="inline-start" />
          Markdown 다운로드
        </a>
      </div>

      {promptCategories.map((category) => {
        const items = generalPrompts.filter((prompt) => prompt.category === category.id)
        if (items.length === 0) return null
        return (
          <section key={category.id} className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold">{category.label}</h3>
              <p className="text-xs text-muted-foreground">{category.description}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((prompt) => (
                <Card key={prompt.id} className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm">{prompt.label}</CardTitle>
                        <CardDescription className="mt-0.5 text-xs">{prompt.description}</CardDescription>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => void copy(prompt.id, prompt.text)}
                        aria-label={`${prompt.label} 복사`}
                        title={`${prompt.label} 복사`}
                      >
                        {copied === prompt.id ? <Check /> : <Copy />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-xs leading-5 text-foreground/85">
                      {prompt.text}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
