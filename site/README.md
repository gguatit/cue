# Cue Site

Cue의 홍보용 정적 사이트입니다. React 19 + Vite + Tailwind v4 + shadcn/ui로 만들고 Cloudflare Workers static assets로 배포합니다.

## 개발

```powershell
npm ci
npm run dev
```

기본 주소는 `http://localhost:1421`입니다.

## 검증

```powershell
npm run check
npm run build
```

## 배포

```powershell
npx wrangler whoami
npm run deploy
```

- Worker 이름: `cue-site`
- 운영 주소: `https://cue.neikos.kr`
- 설정: `wrangler.jsonc`의 `assets.directory`(`./dist`)와 `not_found_handling`(SPA)
- 첫 배포 후 `https://cue-site.<account>.workers.dev` 주소가 출력됩니다.
- 커스텀 도메인 `cue.neikos.kr`은 Cloudflare 대시보드의 Workers → Settings → Domains & Routes에 연결되어 있습니다.

## 자산

`public/brand/icon.png`, `public/media/poster.png`, `public/media/cue-promo.gif`, `public/media/cue-promo.mp4`는 앱 저장소의 아이콘과 `docs/promo/` 자산을 복사한 것입니다. 앱 프로모 자산이 바뀌면 다시 복사합니다.

## 참고

- 다운로드 버튼은 `https://github.com/gguatit/cue/releases/latest`로 연결됩니다.
- 사이트에는 시험 규정·제재 경고를 유지합니다. “탐지 불가”를 보장하는 문구를 추가하지 마세요.
- 앱 버전과 사이트는 독립적입니다. 버전을 표시해야 한다면 릴리스 시 함께 갱신합니다.
