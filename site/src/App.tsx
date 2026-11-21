import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  FlaskConical,
  Home,
  Languages,
  Maximize2,
  Menu,
  Minimize2,
  MousePointer2,
  ScanLine,
  Type,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PromptLibrary } from '@/components/PromptLibrary'
import { QuestionView } from '@/components/QuestionView'
import { TestSidebar } from '@/components/TestSidebar'
import { Watermark } from '@/components/Watermark'
import { questions, subjects, topicsBySubject } from '@/data/questions'
import {
  findScenario,
  loadPrefs,
  matchesType,
  savePrefs,
  sessionId,
  watermarkLabels,
  type FontScale,
  type LabPrefs,
  type ScenarioId,
  type WatermarkLevel,
} from '@/lib/lab'
import { cn } from '@/lib/utils'

type Screen = 'home' | 'test' | 'prompts'

type Route = {
  screen: Screen
  id?: number
  subject: string
  topic: string
  difficulty: string
  type: string
  search: string
}

function readRoute(): Route {
  const parts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const params = new URLSearchParams(window.location.search)
  const rawId = parts[0] === 'test' ? Number(parts[1]) : NaN
  return {
    screen: parts[0] === 'test' ? 'test' : parts[0] === 'prompts' ? 'prompts' : 'home',
    id: Number.isInteger(rawId) && rawId > 0 ? rawId : undefined,
    subject: params.get('subject') ?? 'all',
    topic: params.get('topic') ?? 'all',
    difficulty: params.get('difficulty') ?? 'all',
    type: params.get('type') ?? 'all',
    search: params.get('q') ?? '',
  }
}

function routePath(route: Route): string {
  const path =
    route.screen === 'home'
      ? '/'
      : route.screen === 'prompts'
        ? '/prompts'
        : route.id
          ? `/test/${route.id}`
          : '/test'
  if (route.screen !== 'test') return path
  const params = new URLSearchParams()
  if (route.subject !== 'all') params.set('subject', route.subject)
  if (route.topic !== 'all') params.set('topic', route.topic)
  if (route.difficulty !== 'all') params.set('difficulty', route.difficulty)
  if (route.type !== 'all') params.set('type', route.type)
  if (route.search.trim()) params.set('q', route.search.trim())
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

const scenarioCards: {
  id: ScenarioId
  title: string
  description: string
  icon: typeof MousePointer2
}[] = [
  {
    id: 'choice',
    title: '객관식',
    description: '5지선다 문제로 캡처와 답변 표시를 확인합니다.',
    icon: MousePointer2,
  },
  {
    id: 'descriptive',
    title: '서술형',
    description: '긴 답변과 스트리밍 표시를 확인합니다.',
    icon: FileText,
  },
  {
    id: 'english',
    title: '영어',
    description: '영어 지문과 선택지를 읽는지 확인합니다.',
    icon: Languages,
  },
  {
    id: 'code',
    title: '코드',
    description: '코드 블록과 긴 줄을 캡처해 봅니다.',
    icon: Code2,
  },
  {
    id: 'reading',
    title: '긴 지문',
    description: '지문이 긴 화면에서 캡처 범위를 확인합니다.',
    icon: BookOpen,
  },
  {
    id: 'hard',
    title: '고난도',
    description: '난이도 4 문제로 긴 풀이를 테스트합니다.',
    icon: ScanLine,
  },
]

const scenarioFlow: { id: ScenarioId; label: string }[] = [
  { id: 'choice', label: '객관식' },
  { id: 'descriptive', label: '서술형' },
  { id: 'english', label: '영어' },
  { id: 'watermark', label: '워터마크' },
  { id: 'hard', label: '고난도' },
]

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export default function App() {
  const initialRoute = readRoute()
  const [screen, setScreen] = useState<Screen>(initialRoute.screen)
  const [prefs, setPrefs] = useState<LabPrefs>(() => loadPrefs())
  const [currentId, setCurrentId] = useState(initialRoute.id ?? 1)
  const [subject, setSubject] = useState(initialRoute.subject)
  const [topic, setTopic] = useState(initialRoute.topic)
  const [difficulty, setDifficulty] = useState(initialRoute.difficulty)
  const [type, setType] = useState(initialRoute.type)
  const [search, setSearch] = useState(initialRoute.search)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [clean, setClean] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [session] = useState(() => sessionId())

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onPop = () => {
      const route = readRoute()
      setScreen(route.screen)
      if (route.id) setCurrentId(route.id)
      setSubject(route.subject)
      setTopic(route.topic)
      setDifficulty(route.difficulty)
      setType(route.type)
      setSearch(route.search)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const routeState = (patch: Partial<Route> = {}): Route => ({
    screen,
    id: currentId,
    subject,
    topic,
    difficulty,
    type,
    search,
    ...patch,
  })

  const pushRoute = (next: Route) => {
    window.history.pushState({}, '', routePath(next))
  }

  const replaceRoute = (next: Route) => {
    window.history.replaceState({}, '', routePath(next))
  }

  const navigate = (nextScreen: Screen, id = currentId) => {
    const next = routeState({ screen: nextScreen, id })
    pushRoute(next)
    setScreen(nextScreen)
    if (nextScreen === 'test') setCurrentId(id)
  }

  const replaceFilters = (patch: Partial<Route>) => {
    replaceRoute(routeState(patch))
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return questions.filter((question) => {
      if (subject !== 'all' && question.subject !== subject) return false
      if (topic !== 'all' && question.topic !== topic) return false
      if (difficulty !== 'all' && String(question.difficulty) !== difficulty) return false
      if (!matchesType(question, type)) return false
      if (query) {
        const haystack =
          `${question.id} ${question.subject} ${question.topic} ${question.prompt} ${question.passage}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [subject, topic, difficulty, type, search])

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((question) => question.id === currentId)) {
      const id = filtered[0].id
      setCurrentId(id)
      if (screen === 'test') replaceRoute(routeState({ id }))
    }
  }, [filtered, currentId, screen])

  const current = filtered.find((question) => question.id === currentId) ?? filtered[0]
  const currentIndex = current ? filtered.findIndex((question) => question.id === current.id) : -1

  const goTo = (id: number) => {
    setCurrentId(id)
    setScreen('test')
    setFiltersOpen(false)
    pushRoute(routeState({ screen: 'test', id }))
  }

  const resetFilters = () => {
    setSubject('all')
    setTopic('all')
    setDifficulty('all')
    setType('all')
    setSearch('')
  }

  const startScenario = (scenario: ScenarioId) => {
    const question = findScenario(questions, scenario)
    if (!question) return
    const nextFilters = {
      subject: 'all',
      topic: 'all',
      difficulty: 'all',
      type: 'all',
      search: '',
    }
    resetFilters()
    setCurrentId(question.id)
    if (scenario === 'watermark') {
      setPrefs((value) => ({ ...value, watermark: 'strong' }))
    }
    setClean(false)
    setScreen('test')
    pushRoute(routeState({ screen: 'test', id: question.id, ...nextFilters }))
  }

  const startFlow = () => {
    setClean(false)
    startScenario('choice')
  }

  const previous = () => {
    if (filtered.length === 0) return
    const index = (currentIndex - 1 + filtered.length) % filtered.length
    const id = filtered[index].id
    setCurrentId(id)
    pushRoute(routeState({ screen: 'test', id }))
  }

  const next = () => {
    if (filtered.length === 0) return
    const index = (currentIndex + 1) % filtered.length
    const id = filtered[index].id
    setCurrentId(id)
    pushRoute(routeState({ screen: 'test', id }))
  }

  useEffect(() => {
    if (screen !== 'test' || clean) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowLeft') previous()
      if (event.key === 'ArrowRight') next()
      if (event.key === 'Escape' && filtersOpen) setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // The browser may reject fullscreen without a user gesture.
    }
  }

  const setWatermark = (watermark: WatermarkLevel) => {
    setPrefs((value) => ({ ...value, watermark }))
  }

  const setFontScale = (fontScale: FontScale) => {
    setPrefs((value) => ({ ...value, fontScale }))
  }

  const effectiveWatermark: WatermarkLevel =
    screen === 'test' && prefs.watermark === 'basic' ? 'strong' : prefs.watermark

  const sidebar = current ? (
    <TestSidebar
      subjects={subjects}
      topics={topicsBySubject}
      questions={questions}
      selectedSubject={subject}
      selectedTopic={topic}
      difficulty={difficulty}
      type={type}
      search={search}
      currentId={current.id}
      onSubject={(value) => {
        setSubject(value)
        setTopic('all')
        replaceFilters({ subject: value, topic: 'all' })
      }}
      onTopic={(value) => {
        setTopic(value)
        replaceFilters({ topic: value })
      }}
      onDifficulty={(value) => {
        setDifficulty(value)
        replaceFilters({ difficulty: value })
      }}
      onType={(value) => {
        setType(value)
        replaceFilters({ type: value })
      }}
      onSearch={(value) => {
        setSearch(value)
        replaceFilters({ search: value })
      }}
      onReset={() => {
        resetFilters()
        replaceFilters({ subject: 'all', topic: 'all', difficulty: 'all', type: 'all', search: '' })
      }}
      onSelect={goTo}
    />
  ) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Watermark
        level={effectiveWatermark}
        session={session}
        questionLabel={current ? `Q.${current.id}` : 'HOME'}
      />

      {!clean && (
        <header className="relative z-10 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="group flex items-center gap-2.5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                C
              </span>
              <span className="text-left leading-tight">
                <span className="block text-sm font-semibold tracking-[-0.02em]">Cue Test Lab</span>
                <span className="block text-[10px] tracking-wide text-muted-foreground">
                  PRESENTATION &amp; CAPTURE TEST
                </span>
              </span>
            </button>

            <nav className="ml-2 flex items-center gap-0.5 sm:ml-4 sm:gap-1">
              <Button
                variant={screen === 'home' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('home')}
              >
                <Home data-icon="inline-start" />
                <span className="hidden sm:inline">홈</span>
              </Button>
              <Button
                variant={screen === 'test' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('test')}
              >
                <FlaskConical data-icon="inline-start" />
                <span className="hidden sm:inline">테스트</span>
              </Button>
              <Button
                variant={screen === 'prompts' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('prompts')}
              >
                <FileText data-icon="inline-start" />
                <span className="hidden sm:inline">프롬프트</span>
              </Button>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="hidden font-normal md:inline-flex">
                {formatCount(questions.length)}문제
              </Badge>
              <Button variant="ghost" size="icon-sm" onClick={() => void toggleFullscreen()} aria-label="전체 화면">
                {fullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </div>
          </div>
        </header>
      )}

      {screen === 'home' && (
        <main className="relative z-10 mx-auto max-w-[1200px] space-y-6 px-4 py-8">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
              <div>
                <Badge variant="secondary" className="mb-4 font-normal">
                  <FlaskConical data-icon="inline-start" />
                  발표용 기능 테스트
                </Badge>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                  Cue Test Lab
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  발표 중 Cue의 화면 캡처·AI 답변·워터마크를 바로 확인하는 테스트 화면입니다.
                  문제 풀이·채점·정답 입력은 넣지 않았습니다.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={startFlow}>
                    테스트 시작
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate('prompts')}>
                    <FileText data-icon="inline-start" />
                    프롬프트 보기
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 self-end md:self-center">
                {[
                  ['문제', questions.length],
                  ['과목', subjects.length],
                  ['유형', new Set(questions.map((question) => question.type)).size],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/70 bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-semibold tracking-tight">{value}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">테스트 시나리오</h2>
                <p className="text-xs text-muted-foreground">발표에서 확인할 화면을 바로 엽니다.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scenarioCards.map((scenario) => {
                const Icon = scenario.icon
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => startScenario(scenario.id)}
                    className="group rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="mt-3 block text-sm font-semibold">{scenario.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {scenario.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">발표 순서</CardTitle>
                <CardDescription>3~5분 안에 기능을 확인하는 순서입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {scenarioFlow.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => startScenario(step.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="flex-1">{step.label}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">테스트 전 확인</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-5 text-muted-foreground">
                <p className="font-medium text-foreground">모델 연결 · API 키</p>
                <p>워터마크 강도 · 전체 화면 · 커서 위치</p>
                <p>발표 중에는 정답 입력 없이 화면만 사용합니다.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('prompts')}>
                  <FileText data-icon="inline-start" />
                  프롬프트 라이브러리
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      )}

      {screen === 'test' && (
        <main className={cn('relative z-10 mx-auto max-w-[1600px] px-4 py-5', clean && 'max-w-none px-6 py-6')}>
          {!clean && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <Menu data-icon="inline-start" />
                문제 선택
              </Button>
              <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card p-1">
                {(['sm', 'md', 'lg'] as FontScale[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={prefs.fontScale === value ? 'secondary' : 'ghost'}
                    onClick={() => setFontScale(value)}
                  >
                    {value === 'sm' ? '작게' : value === 'md' ? '보통' : '크게'}
                  </Button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2 py-1.5 text-xs">
                <Type className="size-3.5 text-muted-foreground" />
                <select
                  value={prefs.watermark}
                  onChange={(event) => setWatermark(event.target.value as WatermarkLevel)}
                  className="bg-transparent text-xs outline-none"
                  aria-label="워터마크"
                >
                  {(Object.keys(watermarkLabels) as WatermarkLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {watermarkLabels[level]}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="outline" size="sm" onClick={() => setClean(true)}>
                깔끔 모드
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('prompts')}>
                <FileText data-icon="inline-start" />
                프롬프트
              </Button>
            </div>
          )}

          {clean && (
            <Button
              variant="secondary"
              size="sm"
              className="fixed right-4 top-4 z-40 shadow-sm"
              onClick={() => setClean(false)}
            >
              <X data-icon="inline-start" />
              나가기
            </Button>
          )}

          <div className={cn('grid gap-5', !clean && 'lg:grid-cols-[260px_minmax(0,1fr)]')}>
            {!clean && <aside className="hidden lg:block">{sidebar}</aside>}
            <div className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {current ? `${currentIndex + 1} / ${filtered.length}` : '문제 없음'}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={previous} aria-label="이전 문제">
                    <ChevronLeft />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={next} aria-label="다음 문제">
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              {current ? (
                <QuestionView question={current} size={prefs.fontScale} cueMode />
              ) : (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                  조건에 맞는 문제가 없습니다. 필터를 초기화하세요.
                </Card>
              )}
            </div>
          </div>
        </main>
      )}

      {screen === 'prompts' && (
        <main className="relative z-10 mx-auto max-w-[1400px] px-4 py-8">
          <PromptLibrary />
        </main>
      )}

      {filtersOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 w-[min(340px,90vw)] overflow-y-auto bg-background p-3 shadow-xl">
            <div className="mb-2 flex justify-end">
              <Button variant="ghost" size="icon-sm" onClick={() => setFiltersOpen(false)} aria-label="닫기">
                <X />
              </Button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  )
}
