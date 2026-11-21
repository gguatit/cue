# Cue Test Lab

Cue의 화면 캡처·AI 답변 흐름을 연습하고, 174개 문제를 학습할 수 있는 정적 React 사이트입니다.

## 구성

- React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- 문제·과목·난이도 필터, 자유응답, 채점, 오답 확인, 진행률, 북마크
- Cue 테스트 모드와 워터마크 4단계
- 문제별 프리셋 프롬프트와 Markdown 모음 (`public/prompts/cue-prompts.md`)
- Cloudflare Worker + D1: 문제 본문만 클라이언트에 제공하고 정답은 서버에서만 조회

## 개발

```bash
cd site
npm install
npm run dev
```

로컬에서 `/api/*`를 사용하려면 `wrangler dev`와 Vite 프록시를 함께 실행해야 합니다.

```bash
npx wrangler dev
```

## 빌드·배포

```bash
npm run build
npx wrangler deploy
```

배포 주소: https://cue.neikos.kr

## D1

```bash
npx wrangler d1 migrations apply cue-test-lab --remote
```

초기 정답 seed는 `worker/seed.sql`에서 생성하며, **저장소에 커밋하지 않습니다.** `.gitignore`에 등록되어 있습니다. 원격 D1에는 이미 적용되어 있습니다.

## 보안

- `/api/check`는 정답을 반환하지 않고 `correct`만 반환합니다.
- `/api/reveal`은 해당 세션에서 한 번 이상 시도한 문제만, 한 번만 공개합니다.
- 세션 쿠키는 `HttpOnly`, `SameSite=Lax`, HTTPS에서 `Secure`입니다.
- 정답 전체를 내려주는 API는 없습니다.
- `docs/test-exam.html` 원본에는 정답이 남아 있으므로, 저장소를 공개한다면 별도로 제거하거나 비공개 처리해야 합니다.
