# Cue — AGENTS.md

Windows 10/11 x64 전용 시험 보조 데스크톱 앱. React 19 + Vite + Tailwind v4 프론트, Tauri v2(Rust) 백엔드.
서버·계정·텔레메트리 없음. 모든 상태는 로컬, API 키는 Windows 자격증명 관리자(keyring)에만 저장.

## 환경

- Windows 10/11 x64, Node.js/npm, Rust stable(MSVC), WebView2. Tauri 빌드가 NSIS를 내려받는다.
- 패키지 매니저는 **npm**(`package-lock.json`). bun 금지.
- 프론트·Rust 모두 Windows에서 빌드/테스트한다. Linux에서 Rust 빌드/테스트를 기대하지 말 것.

## 명령

| 명령 | 용도 | 비고 |
| --- | --- | --- |
| `npm ci` | 의존성 설치 | lockfile 기준 |
| `npm run check` | `tsc --noEmit` | 유일한 정적 검사 |
| `npm test` | vitest | `npm test -- src/lib/answer.test.ts` |
| `npm run dev` | Vite만 실행 | 포트 1420, Tauri IPC 없음 |
| `npm run tauri dev` | 실제 앱 | Windows 필요 |
| `npm run build` | check + vite build | 프론트 배포 빌드 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | 빠른 Rust 컴파일 확인 | Windows |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust 테스트 | Windows |
| `npm run tauri build` | release + NSIS | `src-tauri/target/release/bundle/nsis/` |
| `npm run icon` | 아이콘 재생성 | 아이콘 변경 시만 |

- 검증 순서: `npm run check` → `npm test` → (Rust 변경 시) `cargo test` → 릴리스는 `npm run tauri build`.
- `cargo fmt`는 강제가 아니고 저장소가 rustfmt-clean이 아니다. 전체 재포맷으로 불필요한 diff를 만들지 말 것.
- `npm run dev`에서 `isTauri()`가 false라 invoke가 `'network'`로 거부된다. UI 확인용.

## 구조

- **창은 `tauri.conf.json`이 아니라 `src-tauri/src/windows.rs`에서 코드로 만든다.** 설정의 `"windows": []`는 비어 있는 게 정상. main/overlay 두 웹뷰가 같은 `index.html`을 쓰고 `App.tsx`가 웹뷰 label로 분기한다(`?view=` 아님). config에 창을 추가하면 중복 생성된다.
- Rust (`src-tauri/src/`): `main.rs`(CLI 모드 `--background`, `--elevated`, `--guard`, `--system`, `--service`, `--admin-setup`, `--admin-teardown`, single-instance, setup), `commands.rs`(invoke 커맨드·`AppState`·HTTP 클라이언트), `ai.rs`(프롬프트·프리셋/API 라우팅·base URL 검증·HTTP·파싱·재시도), `capture.rs`(GDI 캡처·커서 모니터·축소·크롭), `shortcut.rs`(저수준 키보드 훅, Tauri 플러그인 아님), `guard.rs`/`elevation.rs`(워치독·예약 작업·서비스·UAC·ProgramData 상태), `windows.rs`(main/overlay 창·DPI·스텔스·캡처 보호), `tray.rs`, `meeting.rs`, `led.rs`, `brightness.rs`, `models.rs`, `secrets.rs`.
- Frontend: `src/lib/tauri.ts`의 래퍼로만 invoke한다(컴포넌트 직접 invoke 금지). `src/App.tsx`가 main/overlay를 label로 분기. 설정 탭은 `src/views/settings/*`, 오버레이는 `src/overlay/*`.
- 저장소: 설정은 zustand persist `cue-settings`(`src/stores/settings.ts`, `version: 12`, `mergeSettings`). 답변 기록/오류 로그는 `cue-history`/`cue-errors`. 프로필은 `cue-profiles`(`src/lib/settingsBackup.ts`).
- 오류: Rust는 문자열 코드(`no_key`, `busy`, `http_401`, `config`, `defender` …)로 반환하고 `src/i18n.ts::ERRORS`에서 en/ko로 매핑한다. **새 오류 코드는 반드시 `ERRORS`에 쌍으로 추가** — 없으면 raw 코드가 UI에 노출된다.
- NSIS 훅: `src-tauri/windows/hooks.nsh`. 설치/제거 시 Run 키·예약 작업·서비스·ProgramData 정리를 유지한다.
- 문서: 사용법 `README.md`, 변경 기록 `docs/CHANGELOG.md`.

## 불변식

- **보안/네트워크**: 내장 프리셋(opencode/OpenAI/Google/Anthropic)의 키와 캡처는 `ai.rs::validate_base_url` 덕분에 공식 엔드포인트로만 전송된다. 이 검증을 느슨하게 하거나 프리셋 base URL을 사용자 입력으로 덮어쓰게 만들지 말 것. 커스텀 URL은 HTTPS 또는 루프백 HTTP만 허용하고, HTTP 클라이언트는 리다이렉트를 추적하지 않는다(`commands.rs`). 모델 목록 URL 예외는 `models.rs`. 서버·계정·텔레메트리·분석 호출을 추가하지 말 것. API 키는 keyring에만 저장하고 로그·설정 내보내기에 포함하지 말 것.
- **AI 요청**: OpenCode/Anthropic 네이티브 엔드포인트는 `temperature`를 거부한다. 요청 바디에 넣지 말 것. `extraJson`은 `temperature`, `model`, `messages`, `input`, `contents`, `stream`을 덮어쓸 수 없다(`ai.rs::merge_extra`).
- **캡처**: 커서가 있는 모니터만, 장변 1920 이하로 축소하고 커서 좌표도 같은 비율로 변환한다. 크롭은 1600×1000, `capture_in_flight`로 중복 실행을 막는다. 픽셀 상한은 40M(`capture::capture_fits`), GDI 비트맵은 `GetDIBits` 전에 DC에서 선택 해제한다.
- **오버레이 DPI**: 배지/텍스트 크기는 창의 `scale_factor`가 아니라 대상 모니터의 DPI(`windows::monitor_scale`)로 계산한다.
- **설정 마이그레이션**: shape를 바꾸면 `defaults` + `mergeSettings` + `version`을 함께 올리고 `settings.test.ts`를 갱신한다. 기존 사용자 설정이 깨지면 안 된다.
- **보호 기능**: guard/elevation은 서비스 설정을 HKLM `Software\Cue`(`App`, `User`)에 저장하고 `C:\ProgramData\Cue` ACL을 SYSTEM/Administrators Full + Users RX로 강제한다. 예약 작업(`Cue Elevated`, `Cue Guard`, `Cue Guard Boot`, `Cue Guard System`), 서비스(`CueWatchdog`), HKCU Run 키를 만든다. 관리자 모드가 실행할 exe는 Program Files 또는 설치 프로그램이 `--admin-prepare`로 만든 `C:\ProgramData\Cue\cue.exe` 보호 복사본이어야 한다(`elevation::is_admin_path`). 설치 폴더가 사용자 쓰기 가능해도 관리자 모드는 그 경로를 실행하지 않는다. HKLM `User`가 없으면 `/RU` 없는 작업을 만들지 않는다. 프로그램 마커가 있으면 비관리자 실행도 보호 복사본으로 자동 재실행된다. 에이전트가 `taskkill`/`sc`/`schtasks`로 앱 상태를 바꾸지 말 것.

## 코드 규칙

- 사용자 노출 문자열은 전부 `t('English', '한국어')` / `useT()`를 거친다. 기본 언어는 ko. 하드코딩 금지. README·CHANGELOG는 한국어, 커밋 제목은 영어 Conventional Commits(`feat:`, `fix:`, `docs:`).
- TypeScript: 세미콜론 없음, 작은따옴표, 2칸 들여쓰기. 주변 코드를 따른다.
- 주석은 "왜"만 한 줄. `ponytail:` / `shortcut:` 접두 주석은 알려진 한계·차후 업그레이드 지점 표시 관례다.
- 테스트는 대상 파일 옆 `*.test.ts(x)`. **DOM/jsdom 없음** — vitest environment는 `node`이고 `src/test/setup.ts`는 localStorage 스텁만 넣는다. 컴포넌트 테스트는 `renderToStaticMarkup`으로 HTML 문자열을 검증한다. @testing-library/jsdom을 추가하지 말 것.
- Rust 테스트는 파일 하단 `#[cfg(test)] mod tests`, Windows API 없이 계산 가능한 순수 함수(좌표·크기·파서·URL 검증) 위주.

## 변경 체크리스트

- 새 invoke 커맨드: `commands.rs` 구현 → `main.rs` `invoke_handler` 등록 → `src/lib/tauri.ts` 래퍼.
- 새 사용자 문자열/오류: `t()` en/ko + `ERRORS` 쌍.
- 새 설정: `defaults`/`mergeSettings`/`version`/`settings.test.ts`.
- 창/오버레이 변경: `windows.rs`와 `App.tsx` label 분기, DPI·음수 좌표 테스트 확인.
- 변경 후: `npm run check`, `npm test`, (Rust) `cargo test`; 릴리스는 `npm run tauri build`.
- 빌드 산출물: 최신 릴리스만 `src-tauri/target/release/`와 `artifacts/`에 두고, `artifacts/`에는 `Cue_<version>_x64-setup.exe`, `cue.exe`, `SHA256.txt`만 유지한다.

## 검증 원칙

- UI 변경은 `npm run check`/`npm test` 통과만으로 끝내지 않는다. `npm run dev` 또는 빌드된 `dist`를 실제로 렌더링해 새 버튼·문구가 보이는지 확인한다.
- 실행 파일을 빌드/교체한 뒤에는 실제 실행 중인 바이너리를 확인한다. HKLM `Software\Cue`의 `App` 값과 `artifacts\cue.exe`의 시각·해시를 비교한다. 예전 바이너리를 보고 "기능이 없다"고 판단하지 말 것.
- "완료"라고 말하기 전에 실행한 명령과 결과(테스트 수, 빌드 경로)를 확인한다.

## 릴리스·검증

- **설치·제거는 사용자가 직접 한다.** 빌드한 설치 파일 경로만 알려주고, 에이전트가 실행해서 설치/업그레이드/삭제하지 않는다. `uninstall.exe`, `Cue_*_x64-setup.exe`, `taskkill`, `sc`, `schtasks`로 앱 상태를 바꾸지 않는다.
- 버전은 `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`(+ lockfile)을 함께 올리고 `docs/CHANGELOG.md`를 갱신한 뒤 `vX.Y.Z` 태그/`gh release create`. 현재 버전: **0.1.0**.
- 빌드 산출물은 항상 `artifacts/`에 일반 이름(`Cue_<version>_x64-setup.exe`, `cue.exe`)으로 복사하고 `SHA256.txt`를 갱신한다. 임시 접미사(`-new` 등)를 쓰지 않는다.
- 새 버전 빌드와 해시 검증이 끝난 뒤에만 이전 버전 installer/exe를 삭제한다. 실패하면 이전 버전을 유지한다.
- 0.1.0 검증: `npm run check`, `npm test`(128), `cargo test`(123), `npm run tauri build` 성공.
- 빌드 캐시는 삭제하지 않는다: `src-tauri/target/debug`, `src-tauri/target/release/deps`, `build`, `.fingerprint`, `incremental`, `node_modules`, Cargo/npm 캐시.
- README의 시험 규정·제재 경고는 의도된 내용이므로 삭제하거나 약화하지 말 것.
- 워치독·관리자 모드·회의 감지·LED/밝기·언인스톨은 헤드리스로 검증 불가. 릴리스 전 수동으로 확인한다.
- NSIS는 perMachine, WebView2 offline installer, `windows/hooks.nsh`를 쓴다. 설치/제거 경로를 바꾸면 수동으로 확인한다.

## 알려진 함정

- `npm run dev`는 Tauri IPC가 없어 invoke가 `'network'`로 거부된다.
- `tauri.conf.json`의 `"windows": []`는 정상이다. 창을 추가하면 중복 생성된다.
- Windows 11 트레이 표시는 exe 전체 경로별로 저장된다. 관리자 모드 보호 복사본은 별도 경로라 `NotifyIconSettings`의 `IsPromoted`를 한 번 복사한다. 사용자가 숨기면 `CuePromoted` 마커로 재강제하지 않는다.
- OpenCode/Anthropic 네이티브 엔드포인트는 `temperature`를 거부한다.
- `cargo fmt`는 강제가 아니고 저장소가 rustfmt-clean이 아니다. 전체 포맷 금지.
- 서명 없는 빌드는 Defender가 `Behavior:Win32/Execution.A!ml`/`Behavior:Win32/Persistence.A!ml`로 오탐할 수 있다. 보안 탭의 "Defender 예외 추가"가 현재 exe 폴더·`C:\ProgramData\Cue`·`cue.exe`/`cue-guard.exe`를 예외 처리한다. 이미 격리됐으면 보호 기록에서 복원하거나 폴더를 수동 제외한 뒤 실행한다. 근본 해결은 코드 서명.
- main/overlay는 같은 `index.html`을 쓰고 label로 분기한다.
- guard/service 상태는 `C:\ProgramData\Cue`에 남는다. 언인스톨 훅의 정리를 깨지 말 것.
- 관리자 모드는 설치 위치와 무관하게 동작한다. 설치 프로그램이 `C:\ProgramData\Cue\cue.exe` 보호 복사본을 만들고, 그 복사본이 없거나 ProgramData ACL이 사용자 쓰기 가능하면 관리자 모드는 `admin_copy` 오류로 거부된다. 설치 프로그램을 다시 실행하거나 `C:\ProgramData\Cue`를 직접 정리하는 것은 사용자가 한다.

## 보고 형식

- 계획·작업 목록·비교는 표로 제시한다.
