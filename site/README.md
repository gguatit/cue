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

## 커서 페이지 빌드

`src/components/site/CursorIntro.tsx`가 3.6초(모바일 2.8초) 동안 중앙 로고 주변에서 18개 커서를 움직입니다. 클릭·`Esc`·건너뛰기 버튼으로 즉시 스킵할 수 있습니다. `prefers-reduced-motion`에서는 인트로를 생략합니다.

`src/components/site/PageBuilder.tsx`는 실제 DOM의 `[data-build]` 요소를 커서로 생성합니다. 스냅샷 복제나 페이지 전체 커버를 쓰지 않습니다. 첫 화면은 32개 커서로 시작하고, 스크롤 진행에 따라 최대 72개까지 늘어납니다(모바일 16→40). `Reveal` 그룹의 자식 77개를 text/code/box 타깃으로 나눠 생성하며, 텍스트·코드 타깃에는 얇은 캐럿이 따라갑니다. 화면에 들어온 요소는 실제 `getBoundingClientRect()` 위치로 커서가 이동한 뒤 `clip-path`로 드러나며, 한 번 생성된 요소는 다시 스크롤해도 반복하지 않습니다. 빌드 중에는 대상 위치에 크로스헤어, 좌표 라벨, 네 모서리 선택 핸들이 함께 표시됩니다. 마우스가 멈춰 있어도 유휴 커서는 포인터 주변의 큰 둥근 삼각형 레일(반지름 180/90, 속도 80/58px/s, 2.5px 물결) 위에 한 줄 대형으로 모여 같은 방향으로 살짝 물결치며 돕니다. 마우스 속도가 빠를수록 반지름과 공전 속도가 약간 커집니다. 포인터가 커서에 닿으면 잠깐 흩어졌다가 복귀합니다. 이동·충돌 파티클은 없고 클릭 파티클만 표시됩니다. 커서끼리 추격·로밍·상호작용은 하지 않습니다. 스크롤은 잠그지 않습니다.

하단 왼쪽 효과 패널에서 `커서`와 `파티클`을 각각 끌 수 있으며 설정은 `localStorage`의 `cue-site-effects`에 저장됩니다. 커서를 끄면 인트로를 생략하고 페이지를 즉시 표시하며, 파티클을 끄면 클릭 파티클과 캔버스 효과를 숨깁니다.

Swarm 사이트의 코드·에셋·문구는 복사하지 않고 공개 동작만 참고해 독립 구현했습니다. 밝은 페이퍼 그리드와 검정 타이포, 컬러 커서를 사용합니다.

## 자산

`public/brand/icon.png`는 앱 아이콘입니다. `public/media/poster.png`는 현재 사이트의 1200×630 OG 스크린샷입니다. `public/media/cue-promo.gif`와 `cue-promo.mp4`는 앱 저장소 `docs/promo/` 자산을 복사한 것이며 사이트 본문에서는 사용하지 않습니다.

## 참고

- 다운로드 버튼은 `https://github.com/gguatit/cue/releases/latest`로 연결됩니다.
- 사이트에는 시험 규정·제재 경고를 유지합니다. “탐지 불가”를 보장하는 문구를 추가하지 마세요.
- 앱 버전과 사이트는 독립적입니다. 버전을 표시해야 한다면 릴리스 시 함께 갱신합니다.
