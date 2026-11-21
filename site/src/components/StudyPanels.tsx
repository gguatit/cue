import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Question } from '@/data/questions'
import { cn } from '@/lib/utils'

export function StudySidebar({
  subjects,
  topics,
  questions,
  selectedSubject,
  selectedTopic,
  difficulty,
  type,
  search,
  onSubject,
  onTopic,
  onDifficulty,
  onType,
  onSearch,
  onReset,
}: {
  subjects: readonly string[]
  topics: Record<string, readonly string[]>
  questions: Question[]
  selectedSubject: string
  selectedTopic: string
  difficulty: string
  type: string
  search: string
  onSubject: (value: string) => void
  onTopic: (value: string) => void
  onDifficulty: (value: string) => void
  onType: (value: string) => void
  onSearch: (value: string) => void
  onReset: () => void
}) {
  const subjectCounts = new Map<string, number>()
  for (const question of questions) {
    subjectCounts.set(question.subject, (subjectCounts.get(question.subject) ?? 0) + 1)
  }

  return (
    <div className="space-y-3">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>과목</span>
            <Button variant="ghost" size="xs" onClick={onReset} className="text-muted-foreground">
              초기화
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <ScrollArea className="h-[340px] pr-2">
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
                    {subjectCounts.get(subject) ?? 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">주제</span>
            <select
              value={selectedTopic}
              onChange={(event) => onTopic(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={selectedSubject === 'all'}
            >
              <option value="all">전체 주제</option>
              {(topics[selectedSubject] ?? []).map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">난이도</span>
            <select
              value={difficulty}
              onChange={(event) => onDifficulty(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">전체 난이도</option>
              <option value="1">1 · 기본</option>
              <option value="2">2 · 보통</option>
              <option value="3">3 · 심화</option>
              <option value="4">4 · 고난도</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">유형</span>
            <select
              value={type}
              onChange={(event) => onType(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">전체 유형</option>
              <option value="choice">객관식</option>
              <option value="multi">복수 선택</option>
              <option value="short">단답형</option>
              <option value="descriptive">서술형</option>
              <option value="code">코드</option>
            </select>
          </label>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="문제 검색"
              className="h-9 pl-8 text-[13px]"
              aria-label="문제 검색"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}

export function AnswerSheet({
  questions,
  current,
  grades,
  bookmarks,
  onSelect,
}: {
  questions: Question[]
  current: number
  grades: Record<string, string>
  bookmarks: number[]
  onSelect: (id: number) => void
}) {
  const completed = questions.filter((question) => grades[String(question.id)]).length
  const correct = questions.filter((question) => grades[String(question.id)] === 'correct').length
  const percent = questions.length ? Math.round((completed / questions.length) * 100) : 0

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>답안지</span>
          <span className="text-xs font-normal text-muted-foreground">
            {completed}/{questions.length}
          </span>
        </CardTitle>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          맞음 {correct} · 검토 {completed - correct} · 북마크 {bookmarks.length}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[430px] pr-2">
          <div className="grid grid-cols-6 gap-1.5">
            {questions.map((question) => {
              const grade = grades[String(question.id)]
              const active = current === question.id
              const marked = bookmarks.includes(question.id)
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onSelect(question.id)}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-md border text-[11px] font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : grade === 'correct'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : grade === 'incorrect'
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : grade === 'review'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                  aria-label={`${question.id}번 문제${marked ? ', 북마크됨' : ''}`}
                >
                  {question.id}
                  {marked && (
                    <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
