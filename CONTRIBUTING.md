# Cue 기여 안내

Cue는 Windows 10/11 x64에서 동작하는 시험 보조 앱입니다. 이 문서는 버그 제보, 기능 제안, 문서 수정, 코드 기여를 할 때 지켜야 할 기준을 정리합니다.

> Cue는 허용된 곳에서만 사용해야 합니다. 시험·기관 규정을 위반할 수 있는 기능이나 탐지를 우회하는 기능은 받지 않습니다. 자세한 경고는 [README](README.md)를 먼저 읽어 주세요.

## 기여 방법

| 방법 | 대상 | 방법 |
|---|---|---|
| 버그 제보 | 재현 가능한 오동작 | GitHub Issues에 재현 순서, 기대 결과, 실제 결과, Cue 버전을 적습니다 |
| 기능 제안 | 범위에 맞는 개선 | 먼저 [OUT_OF_SCOPE.md](docs/OUT_OF_SCOPE.md)와 [IDEAS.md](docs/IDEAS.md)를 확인합니다 |
| 문서 수정 | README·가이드·오탈자 | 작은 PR도 환영합니다 |
| 코드 기여 | 버그 수정·테스트·최적화 | 아래 개발·검증 규칙을 따릅니다 |
| 번역 | 영어·한국어 문서 | 원문의 경고와 제한을 약화하지 않습니다 |

이슈와 PR은 누구나 열 수 있습니다. 저장소에 직접 푸시할 권한은 없으며, PR은 포크에서 만들어 주세요.

## 시작하기 전에

1. [README](README.md), [AGENTS.md](AGENTS.md), [OUT_OF_SCOPE.md](docs/OUT_OF_SCOPE.md)를 읽습니다.
2. 보안·보호 기능을 바꾸는 경우 [ARCHITECTURE.md](docs/ARCHITECTURE.md)와 [AI_HARNESS.md](docs/AI_HARNESS.md)를 함께 읽습니다.
3. 큰 기능은 코드를 쓰기 전에 이슈로 범위를 먼저 합의합니다.
4. API 키, 캡처 이미지, 개인정보, 빌드 산출물은 이슈·PR에 올리지 않습니다.

## 개발 환경

| 항목 | 요구 사항 |
|---|---|
| OS | Windows 10/11 x64 |
| Node.js | `npm ci`로 의존성 설치 (`bun` 사용 금지) |
| Rust | stable MSVC 툴체인 |
| WebView2 | Windows에 설치된 런타임 |
| 앱 실행 | `npm run tauri dev` |
| 프론트만 실행 | `npm run dev` — Tauri IPC가 없어 실제 기능은 동작하지 않음 |

```powershell
npm ci
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

## 검증 기준

| 변경 | 필수 검증 |
|---|---|
| TypeScript·React | `npm run check`, `npm test` |
| Rust | `cargo test --manifest-path src-tauri/Cargo.toml` |
| UI·오버레이 | 실제 앱에서 화면·키보드·마우스 동작 확인 |
| 보안·보호 | 관리자 권한, UAC 취소, 서비스·작업 상태를 실제 Windows에서 확인 |
| 릴리스 | 메인테이너가 서명 빌드와 `latest.json`을 검증 |

테스트는 대상 파일 옆 `*.test.ts(x)`에 둡니다. DOM/jsdom 환경은 사용하지 않으며, 컴포넌트 테스트는 `renderToStaticMarkup`으로 HTML 문자열을 검증합니다. Rust 테스트는 Windows API 없이 계산 가능한 순수 함수 위주로 작성합니다.

## 코드 규칙

- TypeScript는 세미콜론 없이, 작은따옴표, 2칸 들여쓰기를 사용합니다.
- 사용자에게 보이는 문자열은 `t('English', '한국어')`를 거칩니다.
- 새 오류 코드는 `src/i18n.ts::ERRORS`에 en/ko 쌍으로 추가합니다.
- 새 설정은 `defaults`, `mergeSettings`, `version`, `settings.test.ts`를 함께 갱신합니다.
- 새 invoke 커맨드는 `commands.rs` 구현 → `main.rs` 등록 → `src/lib/tauri.ts` 래퍼 순서로 추가합니다.
- 새 JavaScript 의존성은 원칙적으로 추가하지 않습니다. 필요한 경우 이슈에서 먼저 합의합니다.
- `cargo fmt` 전체 재포맷은 하지 않습니다. 저장소가 rustfmt-clean이 아닙니다.
- 주석은 “왜”만 한 줄로 적습니다. 알려진 한계는 `shortcut:` 또는 `ponytail:` 접두어로 표시합니다.

## 보안·개인정보

- 서버·계정·텔레메트리·분석 호출을 추가하지 않습니다.
- API 키는 Windows 자격증명 관리자(keyring)에만 저장하고 로그·설정 내보내기에 포함하지 않습니다.
- 내장 프리셋의 키와 캡처가 공식 엔드포인트 밖으로 나가게 하는 변경은 받지 않습니다.
- `WDA_EXCLUDEFROMCAPTURE`, fail-closed 표시, URL 검증, 관리자 보호의 의미를 약화하는 PR은 받지 않습니다.
- 민감한 보안 취약점은 공개 이슈에 공격 코드를 올리지 말고, GitHub의 비공개 취약점 신고 경로가 보이면 그 경로를 사용해 주세요. 없다면 최소 재현 정보만으로 메인테이너에게 연락합니다.
- 캡처 이미지에는 시험 문제·개인정보가 포함될 수 있으므로 이슈에 원본을 첨부하지 않습니다.

## PR 규칙

- 하나의 PR은 하나의 문제를 해결합니다.
- 버그 수정에는 회귀 테스트를 포함합니다.
- UI 변경은 스크린샷과 확인한 화면 크기·테마를 적습니다.
- 동작이 바뀌면 README·CHANGELOG·관련 문서를 함께 갱신합니다.
- 버전 번호, 태그, 릴리스, 설치 파일은 메인테이너가 관리합니다. 기여 PR에서 버전을 올리지 않습니다.
- 다음 파일은 커밋하지 않습니다: `node_modules`, `dist`, `src-tauri/target`, `artifacts`, `.env`, API 키, 캡처 이미지, 임시 로그.
- 커밋 제목은 영어 Conventional Commits(`fix:`, `feat:`, `docs:`)를 사용합니다.

## 리뷰·행동 규칙

- 서로 존중하고, 공격적인 표현·차별·괴롭힘을 하지 않습니다.
- 리뷰 의견에는 근거와 재현 방법을 함께 적습니다.
- AI가 만든 코드도 제출자가 동작과 테스트를 직접 확인해야 합니다.
- 유지보수자는 범위·보안·호환성을 이유로 PR을 거절할 수 있습니다.

## 라이선스

Cue는 MIT License로 배포됩니다. 기여한 코드와 문서는 같은 라이선스로 제공되는 것에 동의하는 것으로 봅니다.

## 도움이 필요하면

- 버그·질문: GitHub Issues
- 보안 문제: 비공개 취약점 신고 경로 또는 메인테이너에게 최소 정보로 연락
- 기능 범위: [OUT_OF_SCOPE.md](docs/OUT_OF_SCOPE.md), [IDEAS.md](docs/IDEAS.md)
