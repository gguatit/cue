type D1Result = { meta?: { changes?: number } }
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement
  first: <T = Record<string, unknown>>() => Promise<T | null>
  run: () => Promise<D1Result>
}
type D1 = { prepare: (query: string) => D1Statement }
type Assets = { fetch: (request: Request) => Promise<Response> }

interface Env {
  DB: D1
  ASSETS: Assets
  SESSION_SECRET?: string
}

interface Session {
  id: string
  ipHash: string
  setCookie?: string
}

const COOKIE = 'cue_session'
const MAX_BODY = 4096
const CHECK_PER_MINUTE = 60
const REVEAL_PER_MINUTE = 20
const SESSION_TTL = 60 * 60 * 24 * 30

function json(data: unknown, status = 200, setCookie?: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(setCookie ? { 'set-cookie': setCookie } : {}),
    },
  })
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

function sessionCookie(id: string, request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure}`
}

async function hashIp(request: Request, secret: string): Promise<string> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${ip}:${secret}`),
  )
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function ensureSession(request: Request, env: Env): Promise<Session> {
  const token = cookieValue(request, COOKIE)
  const valid = token && /^[a-f0-9]{32}$/i.test(token)
  const ipHash = await hashIp(request, env.SESSION_SECRET ?? 'cue-test-lab')

  if (valid) {
    const row = await env.DB.prepare('SELECT id FROM sessions WHERE id = ?')
      .bind(token)
      .first<{ id: string }>()
    if (row) {
      await env.DB.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?')
        .bind(Date.now(), token)
        .run()
      return { id: token, ipHash }
    }
  }

  const id = crypto.randomUUID().replace(/-/g, '')
  const now = Date.now()
  await env.DB.prepare(
    'INSERT INTO sessions (id, ip_hash, created_at, last_seen) VALUES (?, ?, ?, ?)',
  )
    .bind(id, ipHash, now, now)
    .run()
  return { id, ipHash, setCookie: sessionCookie(id, request) }
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const url = new URL(request.url)
  if (origin === url.origin) return true
  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  )
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (text.length > MAX_BODY) return null
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?。！？]/g, '')
}

function labels(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort()
}

function isCorrect(questionType: string, expected: string, actual: string): boolean {
  if (questionType === 'ox') {
    const answer = expected === 'A' ? 'O' : 'X'
    return normalize(actual) === normalize(answer)
  }
  if (questionType === 'choice3' || questionType === 'choice4' || questionType === 'choice5' || questionType === 'multi') {
    return labels(expected).join('|') === labels(actual).join('|')
  }
  return normalize(expected) === normalize(actual)
}

async function checkRate(
  env: Env,
  session: Session,
  table: 'attempts' | 'reveals',
  limit: number,
): Promise<boolean> {
  const since = Date.now() - 60_000
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM ${table} t JOIN sessions s ON s.id = t.session_id WHERE s.ip_hash = ? AND t.created_at > ?`,
  )
    .bind(session.ipHash, since)
    .first<{ count: number }>()
  return (row?.count ?? 0) < limit
}

async function handleCheck(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body || typeof body.id !== 'number' || !Number.isInteger(body.id)) {
    return json({ error: 'invalid_request' }, 400)
  }
  if (typeof body.answer !== 'string' || body.answer.length > 2000) {
    return json({ error: 'invalid_request' }, 400)
  }
  const answer = body.answer.trim()
  if (!answer) return json({ error: 'empty_answer' }, 400)

  const session = await ensureSession(request, env)
  if (!(await checkRate(env, session, 'attempts', CHECK_PER_MINUTE))) {
    return json({ error: 'rate_limit' }, 429, session.setCookie)
  }

  const row = await env.DB.prepare(
    'SELECT question_type, answer FROM answers WHERE question_id = ?',
  )
    .bind(body.id)
    .first<{ question_type: string; answer: string }>()
  if (!row) return json({ error: 'not_found' }, 404, session.setCookie)

  const review = row.question_type === 'descriptive'
  const correct = review ? null : isCorrect(row.question_type, row.answer, answer)
  await env.DB.prepare(
    'INSERT INTO attempts (session_id, question_id, answer, correct, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(session.id, body.id, answer, correct === null ? null : correct ? 1 : 0, Date.now())
    .run()

  return json({ correct, review }, 200, session.setCookie)
}

async function handleReveal(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request)
  if (!body || typeof body.id !== 'number' || !Number.isInteger(body.id)) {
    return json({ error: 'invalid_request' }, 400)
  }

  const session = await ensureSession(request, env)
  if (!(await checkRate(env, session, 'reveals', REVEAL_PER_MINUTE))) {
    return json({ error: 'rate_limit' }, 429, session.setCookie)
  }

  const attempted = await env.DB.prepare(
    'SELECT 1 AS ok FROM attempts WHERE session_id = ? AND question_id = ? LIMIT 1',
  )
    .bind(session.id, body.id)
    .first<{ ok: number }>()
  if (!attempted) return json({ error: 'attempt_required' }, 409, session.setCookie)

  const result = await env.DB.prepare(
    'INSERT OR IGNORE INTO reveals (session_id, question_id, created_at) VALUES (?, ?, ?)',
  )
    .bind(session.id, body.id, Date.now())
    .run()
  if ((result.meta?.changes ?? 0) === 0) {
    return json({ error: 'already_revealed' }, 409, session.setCookie)
  }

  const row = await env.DB.prepare('SELECT answer FROM answers WHERE question_id = ?')
    .bind(body.id)
    .first<{ answer: string }>()
  if (!row) return json({ error: 'not_found' }, 404, session.setCookie)
  return json({ answer: row.answer }, 200, session.setCookie)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      if (!originAllowed(request)) return json({ error: 'forbidden' }, 403)
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'content-type',
          },
        })
      }
      if (url.pathname === '/api/check' && request.method === 'POST') {
        return handleCheck(request, env)
      }
      if (url.pathname === '/api/reveal' && request.method === 'POST') {
        return handleReveal(request, env)
      }
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ ok: true })
      }
      return json({ error: 'not_found' }, 404)
    }
    return env.ASSETS.fetch(request)
  },
}
