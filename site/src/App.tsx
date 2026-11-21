import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Home,
  Menu,
  PanelRight,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { AnswerSheet, StudySidebar } from '@/components/StudyPanels'
import { PromptPanel } from '@/components/PromptPanel'
import { QuestionView } from '@/components/QuestionView'
import { Watermark, watermarkLabels } from '@/components/Watermark'
import { questions, subjects, topicsBySubject, type Question } from '@/data/questions'
import { checkAnswer, revealAnswer } from '@/lib/api'
import {
  loadProgress,
  saveProgress,
  sessionId,
  type StoredProgress,
  type WatermarkLevel,
} from '@/lib/study'
import type { AnswerValue, Grade } from '@/lib/study'
import { cn } from '@/lib/utils'

type Screen = 'home' | 'study' | 'cue'
type MobilePanel = 'subjects' | 'answers' | null

function formatTime(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function matchesType(question: Question, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'choice') return question.type.startsWith('choice') || question.type === 'reading'
  return question.type === filter
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress())
  const [currentId, setCurrentId] = useState(1)
  const [subject, setSubject] = useState('all')
  const [topic, setTopic] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null)
  const [session] = useState(() => sessionId())

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  useEffect(() => {
    if (screen === 'home') return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [screen])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return questions.filter((question) => {
      if (subject !== 'all' && question.subject !== subject) return false
      if (topic !== 'all' && question.topic !== topic) return false
      if (difficulty !== 'all' && String(question.difficulty) !== difficulty) return false
      if (!matchesType(question, type)) return false
      if (query) {
        const haystack = `${question.id} ${question.subject} ${question.topic} ${question.prompt} ${question.passage}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [subject, topic, difficulty, type, search])

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((question) => question.id === currentId)) {
      setCurrentId(filtered[0].id)
    }
  }, [filtered, currentId])

  useEffect(() => {
    setCheckError('')
  }, [currentId, screen])

  const current = filtered.find((question) => question.id === currentId) ?? filtered[0]
  const currentAnswer = current ? progress.answers[String(current.id)] : undefined
  const currentGrade = current ? progress.grades[String(current.id)] : undefined
  const currentRevealed = current ? revealed[String(current.id)] : undefined
  const completed = Object.keys(progress.grades).length
  const correct = Object.values(progress.grades).filter((grade) => grade === 'correct').length

  const updateAnswer = (value: AnswerValue) => {
    if (!current) return
    setProgress((state) => ({
      ...state,
      answers: { ...state.answers, [String(current.id)]: value },
    }))
  }

  const updateGrade = (grade: Grade) => {
    if (!current) return
    setProgress((state) => ({
      ...state,
      grades: { ...state.grades, [String(current.id)]: grade },
    }))
  }

  const apiError = (error: unknown): string => {
    const code = error instanceof Error ? error.message : String(error)
    if (code === 'attempt_required') return '먼저 채점해야 정답을 볼 수 있습니다.'
    if (code === 'already_revealed') return '이 세션에서는 이미 정답을 확인했습니다.'
    if (code === 'rate_limit') return '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'
    if (code === 'empty_answer') return '답을 먼저 입력하세요.'
    return '서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.'
  }

  const checkCurrent = async () => {
    if (!current) return
    const value = currentAnswer
    const empty = value === undefined || (Array.isArray(value) ? value.length === 0 : !value.trim())
    if (empty) {
      setCheckError('답을 먼저 입력하세요.')
      return
    }
    setChecking(true)
    setCheckError('')
    try {
      const result = await checkAnswer(current.id, value)
      updateGrade(result.review ? 'review' : result.correct ? 'correct' : 'incorrect')
    } catch (error) {
      setCheckError(apiError(error))
    } finally {
      setChecking(false)
    }
  }

  const revealCurrent = async () => {
    if (!current) return
    setCheckError('')
    try {
      const result = await revealAnswer(current.id)
      setRevealed((value) => ({ ...value, [String(current.id)]: result.answer }))
    } catch (error) {
      setCheckError(apiError(error))
    }
  }

  const toggleBookmark = () => {
    if (!current) return
    setProgress((state) => ({
      ...state,
      bookmarks: state.bookmarks.includes(current.id)
        ? state.bookmarks.filter((id) => id !== current.id)
        : [...state.bookmarks, current.id],
    }))
  }

  const setWatermark = (value: WatermarkLevel) => {
    setProgress((state) => ({ ...state, watermark: value }))
  }

  const goTo = (id: number) => {
    setCurrentId(id)
    setScreen('study')
    setMobilePanel(null)
  }

  const start = (nextSubject = 'all') => {
    setSubject(nextSubject)
    setTopic('all')
    const first = questions.find((question) => nextSubject === 'all' || question.subject === nextSubject)
    if (first) setCurrentId(first.id)
    setScreen('study')
  }

  const currentIndex = current ? filtered.findIndex((question) => question.id === current.id) : -1
  const prev = () => {
    if (filtered.length === 0) return
    const nextIndex = (currentIndex - 1 + filtered.length) % filtered.length
    setCurrentId(filtered[nextIndex].id)
  }
  const next = () => {
    if (filtered.length === 0) return
    const nextIndex = (currentIndex + 1) % filtered.length
    setCurrentId(filtered[nextIndex].id)
  }

  const effectiveWatermark: WatermarkLevel =
    screen === 'cue' && progress.watermark === 'basic' ? 'strong' : progress.watermark

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Watermark
        level={effectiveWatermark}
        session={session}
        questionLabel={current ? `Q.${current.id}` : 'HOME'}
      />

      <header className="relative z-10 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
          <button type="button" onClick={() => setScreen('home')} className="group flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              C
            </span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-semibold tracking-[-0.02em]">Cue Test Lab</span>
              <span className="block text-[10px] tracking-wide text-muted-foreground">STUDY & CAPTURE TEST</span>
            </span>
          </button>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <Button
              variant={screen === 'home' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScreen('home')}
            >
              <Home data-icon="inline-start" />
              홈
            </Button>
            <Button
              variant={screen === 'study' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScreen('study')}
            >
              <BookOpen data-icon="inline-start" />
              학습
            </Button>
            <Button
              variant={screen === 'cue' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScreen('cue')}
            >
              <FlaskConical data-icon="inline-start" />
              Cue 테스트
            </Button>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden font-normal md:inline-flex">
              <Clock className="mr-1 size-3" />
              {formatTime(elapsed)}
            </Badge>
            <Badge variant="outline" className="hidden font-normal md:inline-flex">
              {completed}/{questions.length}
            </Badge>
            <select
              value={progress.watermark}
              onChange={(event) => setWatermark(event.target.value as WatermarkLevel)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="워터마크 단계"
            >
              {(Object.keys(watermarkLabels) as WatermarkLevel[]).map((level) => (
                <option key={level} value={level}>
                  {watermarkLabels[level]}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              onClick={() => setMobilePanel('subjects')}
              aria-label="메뉴"
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {screen === 'home' ? (
          <HomeScreen
            completed={completed}
            correct={correct}
            onStart={() => start()}
            onCue={() => setScreen('cue')}
            onSubject={(nextSubject) => start(nextSubject)}
          />
        ) : (
          <div className="mx-auto max-w-[1600px] px-4 py-4">
            {screen === 'cue' && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <FlaskConical className="size-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Cue 테스트 모드</p>
                <p className="text-xs text-muted-foreground">
                  Ctrl+Alt+Win을 누른 채 왼쪽 클릭 → 답변 확인. 정답은 직접 확인하기 전까지 숨겨집니다.
                </p>
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => setScreen('study')}>
                  학습으로 돌아가기
                </Button>
              </div>
            )}

            <div className={cn('grid gap-4', screen === 'cue' ? 'grid-cols-1' : 'lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_280px]')}>
              {screen !== 'cue' && (
                <aside className="hidden lg:block">
                  <StudySidebar
                    subjects={subjects}
                    topics={topicsBySubject}
                    questions={questions}
                    selectedSubject={subject}
                    selectedTopic={topic}
                    difficulty={difficulty}
                    type={type}
                    search={search}
                    onSubject={(value) => {
                      setSubject(value)
                      setTopic('all')
                    }}
                    onTopic={setTopic}
                    onDifficulty={setDifficulty}
                    onType={setType}
                    onSearch={setSearch}
                    onReset={() => {
                      setSubject('all')
                      setTopic('all')
                      setDifficulty('all')
                      setType('all')
                      setSearch('')
                    }}
                  />
                </aside>
              )}

              <section className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {screen === 'cue' ? 'Cue 테스트' : subject === 'all' ? '전체 문제' : subject}
                  </Badge>
                  {filtered.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {currentIndex + 1} / {filtered.length}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setMobilePanel('subjects')}
                    >
                      <Search data-icon="inline-start" />
                      과목·필터
                    </Button>
                    {screen !== 'cue' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="xl:hidden"
                        onClick={() => setMobilePanel('answers')}
                      >
                        <PanelRight data-icon="inline-start" />
                        답안지
                      </Button>
                    )}
                  </div>
                </div>

                {current ? (
                  <>
                    <QuestionView
                      key={current.id}
                      question={current}
                      value={currentAnswer}
                      grade={screen === 'cue' ? undefined : currentGrade}
                      answer={screen === 'cue' ? undefined : currentRevealed}
                      bookmarked={progress.bookmarks.includes(current.id)}
                      cueMode={screen === 'cue'}
                      checking={checking}
                      error={checkError}
                      onAnswer={updateAnswer}
                      onGrade={updateGrade}
                      onCheck={() => void checkCurrent()}
                      onReveal={() => void revealCurrent()}
                      onHideAnswer={() =>
                        setRevealed((value) => {
                          const next = { ...value }
                          delete next[String(current.id)]
                          return next
                        })
                      }
                      onToggleBookmark={toggleBookmark}
                      onPrev={prev}
                      onNext={next}
                    />
                    <PromptPanel
                      question={current}
                      myAnswer={currentAnswer}
                      compact={screen === 'cue'}
                    />
                    <Card className="border-border/80 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <FileText className="size-4 text-primary" />
                          내 메모
                        </CardTitle>
                        <CardDescription>이 문제에 대한 오답 노트나 풀이 메모를 남겨두세요.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={progress.notes[String(current.id)] ?? ''}
                          onChange={(event) =>
                            setProgress((state) => ({
                              ...state,
                              notes: { ...state.notes, [String(current.id)]: event.target.value },
                            }))
                          }
                          placeholder="예: 이 문제는 조건 범위를 먼저 정리해야 함."
                          rows={3}
                          className="resize-y text-sm"
                        />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="p-10 text-center">
                    <p className="text-sm text-muted-foreground">조건에 맞는 문제가 없습니다. 필터를 초기화해 보세요.</p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => {
                        setSubject('all')
                        setTopic('all')
                        setDifficulty('all')
                        setType('all')
                        setSearch('')
                      }}
                    >
                      필터 초기화
                    </Button>
                  </Card>
                )}
              </section>

              {screen !== 'cue' && (
                <aside className="hidden xl:block">
                  <AnswerSheet
                    questions={filtered}
                    current={current?.id ?? 0}
                    grades={progress.grades}
                    bookmarks={progress.bookmarks}
                    onSelect={goTo}
                  />
                </aside>
              )}
            </div>
          </div>
        )}
      </main>

      {mobilePanel && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/25 lg:hidden" onClick={() => setMobilePanel(null)}>
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{mobilePanel === 'answers' ? '답안지' : '과목·필터'}</p>
              <Button variant="ghost" size="icon-sm" onClick={() => setMobilePanel(null)} aria-label="닫기">
                <X />
              </Button>
            </div>
            {mobilePanel === 'answers' ? (
              <AnswerSheet
                questions={filtered}
                current={current?.id ?? 0}
                grades={progress.grades}
                bookmarks={progress.bookmarks}
                onSelect={goTo}
              />
            ) : (
              <StudySidebar
                subjects={subjects}
                topics={topicsBySubject}
                questions={questions}
                selectedSubject={subject}
                selectedTopic={topic}
                difficulty={difficulty}
                type={type}
                search={search}
                onSubject={(value) => {
                  setSubject(value)
                  setTopic('all')
                  setMobilePanel(null)
                }}
                onTopic={setTopic}
                onDifficulty={setDifficulty}
                onType={setType}
                onSearch={setSearch}
                onReset={() => {
                  setSubject('all')
                  setTopic('all')
                  setDifficulty('all')
                  setType('all')
                  setSearch('')
                }}
              />
            )}
          </div>
        </div>
      )}

      <footer className="relative z-10 border-t border-border/70 px-4 py-5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Cue Test Lab · 학습용 예시 문제 · 실제 시험에서는 사용을 권장하지 않습니다.</span>
          <span>174 questions · 21 subjects · local only</span>
        </div>
      </footer>
    </div>
  )
}

function HomeScreen({
  completed,
  correct,
  onStart,
  onCue,
  onSubject,
}: {
  completed: number
  correct: number
  onStart: () => void
  onCue: () => void
  onSubject: (subject: string) => void
}) {
  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const question of questions) counts.set(question.subject, (counts.get(question.subject) ?? 0) + 1)
    return counts
  }, [])
  const progress = questions.length ? Math.round((completed / questions.length) * 100) : 0

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-16">
      <section className="grid items-center gap-8 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 font-normal text-primary">
            <Sparkles className="mr-1 size-3" />
            2026 Cue Test Lab
          </Badge>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.15] tracking-[-0.04em] sm:text-5xl">
            문제를 풀고,
            <br />
            막히면 프롬프트로.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            174개 예시 문제를 과목·난이도별로 풀고, 자유응답과 오답 노트를 남기세요.
            Cue 자유 모드에 바로 붙여넣을 프리셋 프롬프트도 문제마다 제공합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button size="lg" onClick={onStart}>
              학습 시작
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" onClick={onCue}>
              <FlaskConical data-icon="inline-start" />
              Cue 테스트
            </Button>
            <a
              href="/prompts/cue-prompts.md"
              download
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              프롬프트 MD
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-6">
            {[
              ['174', '문제'],
              ['21', '과목'],
              ['10', '유형'],
              ['4', '난이도'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-semibold tracking-[-0.03em]">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="paper-grid overflow-hidden border-border/80 bg-white shadow-sm">
          <CardHeader className="border-b border-border/70 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">오늘의 진행</CardTitle>
                <CardDescription>학습 기록은 이 브라우저에만 저장됩니다.</CardDescription>
              </div>
              <Target className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-end justify-between">
              <p className="text-4xl font-semibold tracking-[-0.04em]">{progress}%</p>
              <p className="text-xs text-muted-foreground">
                {completed} / {questions.length} 완료
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/45 p-3">
                <p className="text-lg font-semibold">{completed}</p>
                <p className="text-[11px] text-muted-foreground">채점</p>
              </div>
              <div className="rounded-lg bg-muted/45 p-3">
                <p className="text-lg font-semibold">{correct}</p>
                <p className="text-[11px] text-muted-foreground">맞음</p>
              </div>
              <div className="rounded-lg bg-muted/45 p-3">
                <p className="text-lg font-semibold">{questions.length - completed}</p>
                <p className="text-[11px] text-muted-foreground">남음</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={onStart}>
              이어서 학습
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-primary">SUBJECTS</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">과목별로 시작하기</h2>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">과목을 누르면 바로 학습 화면으로 이동합니다.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subjectName) => (
            <button
              key={subjectName}
              type="button"
              onClick={() => onSubject(subjectName)}
              className="group flex items-center justify-between rounded-xl border border-border/80 bg-card px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <span>
                <span className="block text-sm font-medium">{subjectName}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {subjectCounts.get(subjectName) ?? 0}문제
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [BookOpen, '학습 모드', '객관식·서술형·단답형을 유형별로 풀고 채점합니다.'],
          [CheckCircle2, '자유응답', '내 답안을 저장하고 모범답안과 직접 비교합니다.'],
          [FileText, '프리셋 프롬프트', '정답·이유, 오답 분석, 힌트, 채점 기준을 복사합니다.'],
          [FlaskConical, 'Cue 테스트', '워터마크와 정답 숨김으로 실제 캡처 흐름을 테스트합니다.'],
        ].map(([Icon, title, description]) => {
          const Component = Icon as typeof BookOpen
          return (
            <Card key={String(title)} className="border-border/80 shadow-sm">
              <CardContent className="pt-4">
                <Component className="mb-3 size-5 text-primary" />
                <p className="text-sm font-medium">{String(title)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{String(description)}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
