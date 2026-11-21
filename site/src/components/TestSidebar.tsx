import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Question } from '@/data/questions'
import { cn } from '@/lib/utils'

export function TestSidebar({
  subjects,
  topics,
  questions,
  selectedSubject,
  selectedTopic,
  difficulty,
  type,
  search,
  currentId,
  onSubject,
  onTopic,
  onDifficulty,
  onType,
  onSearch,
  onReset,
  onSelect,
}: {
  subjects: readonly string[]
  topics: Record<string, readonly string[]>
  questions: Question[]
  selectedSubject: string
  selectedTopic: string
  difficulty: string
  type: string
  search: string
  currentId: number
  onSubject: (value: string) => void
  onTopic: (value: string) => void
  onDifficulty: (value: string) => void
  onType: (value: string) => void
  onSearch: (value: string) => void
  onReset: () => void
  onSelect: (id: number) => void
}) {
  return (
    <div className="space-y-3">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>테스트 문제</span>
            <Button variant="ghost" size="xs" onClick={onReset} className="text-muted-foreground">
              초기화
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="문제 검색"
              className="h-9 pl-8 text-xs"
              aria-label="문제 검색"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={difficulty}
              onChange={(event) => onDifficulty(event.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="난이도"
            >
              <option value="all">난이도 전체</option>
              <option value="1">기본</option>
              <option value="2">보통</option>
              <option value="3">심화</option>
              <option value="4">고난도</option>
            </select>
            <select
              value={type}
              onChange={(event) => onType(event.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="유형"
            >
              <option value="all">유형 전체</option>
              <option value="choice">객관식</option>
              <option value="descriptive">서술형</option>
              <option value="short">단답형</option>
              <option value="calc">계산형</option>
              <option value="code">코드</option>
              <option value="reading">독해</option>
              <option value="ox">OX</option>
            </select>
          </div>
          <select
            value={selectedTopic}
            onChange={(event) => onTopic(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="주제"
          >
            <option value="all">주제 전체</option>
            {(selectedSubject === 'all' ? [] : topics[selectedSubject] ?? []).map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">과목</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ScrollArea className="h-[260px] pr-2">
            <div className="space-y-0.5">
              <Button
                variant={selectedSubject === 'all' ? 'secondary' : 'ghost'}
                className="h-9 w-full justify-between px-2.5 text-[13px]"
                onClick={() => onSubject('all')}
              >
                <span>전체 문제</span>
                <Badge variant="outline" className="font-normal">
                  {questions.length}
                </Badge>
              </Button>
              {subjects.map((subject) => (
                <Button
                  key={subject}
                  variant={selectedSubject === subject ? 'secondary' : 'ghost'}
                  className="h-9 w-full justify-between px-2.5 text-[13px]"
                  onClick={() => onSubject(subject)}
                >
                  <span className="truncate">{subject}</span>
                  <Badge variant="outline" className="font-normal">
                    {questions.filter((question) => question.subject === subject).length}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">문제 목록</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-0.5">
              {questions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onSelect(question.id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                    question.id === currentId
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <span className="w-7 shrink-0 font-mono text-[10px] text-primary">
                    {question.id}
                  </span>
                  <span className="min-w-0 truncate">{question.prompt}</span>
                </button>
              ))}
              {questions.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  조건에 맞는 문제가 없습니다.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
