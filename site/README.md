# Cue Test Lab

발표 중 Cue의 화면 캡처·AI 답변·워터마크를 확인하는 정적 테스트 사이트입니다.

- React 19 + Vite + Tailwind v4 + shadcn/ui
- 문제 풀이·채점·정답 입력 없음
- 174개 테스트 문제, 과목·주제·유형·난이도 필터
- Cue 테스트 화면: 글자 크기, 워터마크 4단계, 전체 화면, 깔끔 모드
- 범용 프롬프트 라이브러리와 `/prompts/cue-prompts.md`
- 서버·계정·API 키·정답 API 없음

## 개발

```bash
npm install
npm run dev
npm run build
npm run deploy
```

## 배포

Cloudflare Worker static assets로 `cue.neikos.kr`에 배포합니다. `wrangler.jsonc`의 `assets.directory`는 `./dist`입니다.

## 문제 데이터

`src/data/questions.ts`의 174문제를 사용합니다. 정답 필드는 포함하지 않습니다.
