# Cue Resource Footprint Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Cue's idle CPU, transient child-process creation, and background network activity without weakening answer quality, stealth behavior, protection features, or the update path.

**Architecture:** First add a repeatable process-tree measurement script. Then remove duplicate meeting polling and cache the expensive process snapshot. Make security status checks user-triggered instead of spawning PowerShell/schtasks/sc when the Security tab opens. Add WebView2 background-networking flags. Filter guard process enumeration by executable name before opening process handles. Finally, switch the capture resize filter to a cheaper one only after checking visual quality.

**Tech Stack:** Windows 10/11 x64, Tauri 2, Rust 2021, React 19, TypeScript, Vite, Vitest, PowerShell 5.1, `windows` crate, WebView2.

**Spec:** No separate spec. The audit and baseline measurements are captured in the Background, Constraints, and Review Focus sections below.

## Background

Baseline measured on the running 0.1.9 app over 30 seconds idle:

| Metric | Baseline |
|---|---|
| CPU | 0.53 s / 30 s = 1.8% of one core |
| Working set | 39.4 MB (`cue.exe` 5.4 MB + WebView2 processes) |
| Private commit | 286.2 MB (WebView2 reservation/commit; not resident memory) |
| TCP connections | 0 |
| Process tree | 8 processes |
| Separate guard process | `cue-guard.exe` about 2.1 MB |
| Separate service | `CueWatchdog` running |

The app is already below the threshold where resource usage alone makes it a top process. The remaining wins are wakeups and transient process creation, not raw resident memory.

Known findings:

| ID | Finding | Evidence |
|---|---|---|
| C1 | Meeting detection scans all processes and windows every 1.5 s; the Security tab starts a second meeting scan every 15 s | `src/stores/answer.ts:148,215`, `src-tauri/src/meeting.rs:57`, `src/views/settings/SecurityTab.tsx:232` |
| C2 | Security tab mount automatically calls Defender (`Get-MpPreference` via PowerShell) and protection status (`schtasks`/`sc` subprocesses) | `SecurityTab.tsx:84-87`, `src-tauri/src/elevation.rs:650,797,963,1074` |
| C3 | WebView2 has no background-network suppression flags | `src-tauri/src/windows.rs:5` |
| C4 | Guard/service loops call `process_paths()` every 2 s; it opens every process before checking the path | `src-tauri/src/guard.rs:10,188,265,329-372` |
| C5 | Capture uses full-monitor RGBA, RGB conversion, Lanczos3 resize, JPEG, then base64 | `src-tauri/src/capture.rs:89-110,170-220` |
| C6 | Hidden overlay renderer holds about 11.7 MB working set | Process-tree measurement |
| C7 | Startup status invokes run sequentially | `src/lib/startup.ts:51-69` |

## Global Constraints

- Do not add a server, account, telemetry, analytics, or a new background service.
- Do not change AI provider routing, API-key handling, the update endpoint, signature verification, installer behavior, or admin/guard semantics.
- Do not add a new JavaScript dependency. Do not add jsdom or `@testing-library`.
- User-visible strings use `t('English', '한국어')` / `useT()`; default language is Korean.
- TypeScript: no semicolons, single quotes, 2-space indentation.
- Rust tests stay in the file's bottom `#[cfg(test)] mod tests`; prefer pure helpers.
- `cargo fmt` is not enforced. Do not reformat whole files.
- Verification order: `npm run check` → `npm test` → `cargo test` → signed `npm run tauri build`.
- The agent does not run installers, uninstallers, `taskkill`, `sc`, or `schtasks` to change the app's state. The user runs installer/update/uninstall tests.
- Release changes are committed and pushed with the code; version becomes **0.1.10** at the end.
- Manual release only: no GitHub Actions workflow.

## File Structure

Create:

- `scripts/measure-resource.ps1` — repeatable 30/60 s process-tree measurement.
- `docs/superpowers/plans/2026-10-29-resource-optimization.md` — this plan.

Modify:

- `src-tauri/src/meeting.rs` — process snapshot cache.
- `src-tauri/src/guard.rs` — executable-name fast path.
- `src-tauri/src/windows.rs` — WebView2 args.
- `src-tauri/src/capture.rs` — resize filter.
- `src/views/settings/SecurityTab.tsx` — single meeting source, on-demand status checks.
- `docs/CHANGELOG.md`, `AGENTS.md`, version files.
- No new Rust module and no new React component.

Tests:

- Inline Rust tests in `meeting.rs` and `guard.rs`.
- Existing `capture.rs` tests remain the regression guard.
- No DOM tests; Security tab changes are verified in Vite and the real Tauri window.

## Review Focus

1. **Meeting detection delay:** a 3 s process cache can delay detection of an app whose window title does not match. The window-title scan still runs every 1.5 s. Test with Zoom/OBS and a process-only case.
2. **Security tab first paint:** admin/guard/Defender labels now start as “확인 안 됨” until the user clicks refresh. Add/repair must still work without a prior status query.
3. **WebView2 flags:** background-network switches must not blank the local UI, break IPC, or stop the shortcut listener. Smoke-test a built Tauri window.
4. **Guard fast path:** filtering by `szExeFile` must still find the protected copy path and revive a killed `cue.exe`; test with guard enabled.
5. **Capture filter quality:** CatmullRom must keep dense question text and small option labels readable. Compare a 4K/dense screenshot before and after.

---

### Task 1: Add a repeatable resource measurement script

**Files:**
- Create: `scripts/measure-resource.ps1`

**Interfaces:**
- Consumes: a running `cue.exe` process.
- Produces: `cpuSeconds`, `cpuPercentOneCore`, `workingSetMB`, `privateMB`, `tcpConnections`, `processes`.

- [ ] **Step 1: Write the script**

```powershell
param(
  [int]$Seconds = 30,
  [string]$Name = 'cue.exe',
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$procs = Get-CimInstance Win32_Process |
  Select-Object ProcessId, ParentProcessId, Name
$root = $procs | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
if (-not $root) {
  throw "No $Name process found."
}

$ids = [System.Collections.Generic.HashSet[int]]::new()
[void]$ids.Add([int]$root.ProcessId)
$changed = $true
while ($changed) {
  $changed = $false
  foreach ($p in $procs) {
    if ($ids.Contains([int]$p.ParentProcessId) -and -not $ids.Contains([int]$p.ProcessId)) {
      [void]$ids.Add([int]$p.ProcessId)
      $changed = $true
    }
  }
}

$idArray = @($ids)
$before = Get-Process -Id $idArray -ErrorAction SilentlyContinue
$cpu1 = ($before | Measure-Object CPU -Sum).Sum
Start-Sleep -Seconds $Seconds
$after = Get-Process -Id $idArray -ErrorAction SilentlyContinue
$cpu2 = ($after | Measure-Object CPU -Sum).Sum
$ws = ($after | Measure-Object WorkingSet64 -Sum).Sum
$private = ($after | Measure-Object PrivateMemorySize64 -Sum).Sum
$conns = Get-NetTCPConnection -ErrorAction SilentlyContinue |
  Where-Object { $ids.Contains([int]$_.OwningProcess) }

$result = [ordered]@{
  seconds = $Seconds
  processes = $ids.Count
  cpuSeconds = [math]::Round($cpu2 - $cpu1, 2)
  cpuPercentOneCore = if ($Seconds -gt 0) {
    [math]::Round((($cpu2 - $cpu1) / $Seconds) * 100, 1)
  } else { 0 }
  workingSetMB = [math]::Round($ws / 1MB, 1)
  privateMB = [math]::Round($private / 1MB, 1)
  tcpConnections = $conns.Count
}

if ($Json) {
  $result | ConvertTo-Json -Compress
} else {
  $result.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
}
```

- [ ] **Step 2: Run a short check**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/measure-resource.ps1 -Seconds 5
```

Expected: one line per metric; `processes` is at least 1 and `workingSetMB` is greater than 0.

- [ ] **Step 3: Run the JSON form**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/measure-resource.ps1 -Seconds 5 -Json
```

Expected: a single JSON object with the same keys.

- [ ] **Step 4: Commit**

```powershell
git add scripts/measure-resource.ps1
git commit -m "chore: add resource measurement script"
```

---

### Task 2: Deduplicate meeting detection

**Files:**
- Modify: `src-tauri/src/meeting.rs`
- Modify: `src/views/settings/SecurityTab.tsx`
- Test: inline `#[cfg(test)] mod tests` in `meeting.rs`

**Interfaces:**
- Consumes: `meeting_active()` from `commands::meeting_active`.
- Produces: unchanged `meeting_active() -> bool`; a 3-second process snapshot cache; Security tab reads `useAnswer.meetingHidden`.

- [ ] **Step 1: Add the failing cache test**

Add to `src-tauri/src/meeting.rs` tests:

```rust
#[test]
fn process_cache_expires_after_three_seconds() {
    assert!(cache_is_fresh(Duration::from_millis(2999)));
    assert!(!cache_is_fresh(PROCESS_CACHE_TTL));
}
```

- [ ] **Step 2: Run it and confirm it fails**

```powershell
cargo test --manifest-path src-tauri/Cargo.toml meeting::tests::process_cache_expires_after_three_seconds
```

Expected: compile error because `cache_is_fresh` and `PROCESS_CACHE_TTL` do not exist.

- [ ] **Step 3: Add the cache and replace `meeting_active`**

Add imports at the top of `meeting.rs`:

```rust
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
```

Add below the title constants:

```rust
const PROCESS_CACHE_TTL: Duration = Duration::from_secs(3);

struct ProcessCache {
    checked: Instant,
    active: bool,
}

fn process_cache() -> &'static Mutex<Option<ProcessCache>> {
    static CACHE: OnceLock<Mutex<Option<ProcessCache>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

fn cache_is_fresh(age: Duration) -> bool {
    age < PROCESS_CACHE_TTL
}

fn cached_process_running() -> bool {
    let Ok(mut cache) = process_cache().lock() else {
        return process_running();
    };
    if let Some(cached) = cache.as_ref() {
        if cache_is_fresh(cached.checked.elapsed()) {
            return cached.active;
        }
    }
    let active = process_running();
    *cache = Some(ProcessCache {
        checked: Instant::now(),
        active,
    });
    active
}

pub fn meeting_active() -> bool {
    if cached_process_running() {
        return true;
    }
    unsafe {
        let mut found = false;
        let _ = EnumWindows(
            Some(find_meeting_window),
            LPARAM(&mut found as *mut bool as isize),
        );
        found
    }
}
```

Remove the old `process_running() || unsafe { ... }` body of `meeting_active`. Keep `process_running`, `find_meeting_window`, and the existing title/process helpers unchanged.

- [ ] **Step 4: Run the cache test**

```powershell
cargo test --manifest-path src-tauri/Cargo.toml meeting::tests::process_cache_expires_after_three_seconds
```

Expected: PASS.

- [ ] **Step 5: Make the Security tab read shared meeting state**

In `src/views/settings/SecurityTab.tsx`:

1. Remove `meetingActive,` from the `../../lib/tauri` import.
2. Add `const meetingHidden = useAnswer((s) => s.meetingHidden)` next to `const t = useT()`.
3. Delete `const [meetingStatus, setMeetingStatus] = useState<boolean | null>(null)`.
4. Delete the 15-second `useEffect` that calls `meetingActive()`.
5. Change `{meetingStatus === true && (` to `{meetingHidden && (`.

The resulting condition is:

```tsx
{meetingHidden && (
  <span className="mb-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
    {t('Meeting detected', '회의 감지됨')}
  </span>
)}
```

- [ ] **Step 6: Verify and commit**

```powershell
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
git add src-tauri/src/meeting.rs src/views/settings/SecurityTab.tsx
git commit -m "perf: deduplicate meeting detection"
```

Expected: all tests pass; Vite Security tab renders without a `meetingActive` invoke on mount.

---

### Task 3: Make security status checks user-triggered

**Files:**
- Modify: `src/views/settings/SecurityTab.tsx`

**Interfaces:**
- Consumes: existing `refreshProtection()`, `refreshDefender()`, `refreshGuard()`, `refreshCapture()`.
- Produces: no automatic PowerShell/schtasks/sc spawn when the Security tab opens; explicit “보호 상태 새로 고침” and “상태 확인” buttons.

- [ ] **Step 1: Remove the automatic heavy queries**

Change the mount effect from:

```tsx
useEffect(() => {
  void refreshGuard()
  void refreshProtection()
  void refreshDefender()
}, [])
```

to:

```tsx
useEffect(() => {
  void refreshGuard()
  void refreshCapture()
}, [])
```

`refreshGuard` reads the guard marker and `refreshCapture` calls `GetWindowDisplayAffinity`; neither spawns a subprocess.

- [ ] **Step 2: Change the initial labels**

Change:

```tsx
let adminLabel = t('Checking…', '확인 중…')
```

to:

```tsx
let adminLabel = t('Not checked', '확인 안 됨')
```

Change:

```tsx
let defenderLabel = t('Checking…', '확인 중…')
```

to:

```tsx
let defenderLabel = t('Not checked', '확인 안 됨')
```

The existing `if (protection) { ... }` and `if (defenderStatus) { ... }` blocks overwrite these labels after a manual refresh.

- [ ] **Step 3: Add the protection refresh button**

After the protection chips block in the “Maximum protection” card, add:

```tsx
<Button className="mt-2" variant="secondary" onClick={() => void refreshProtection()}>
  {t('Refresh protection status', '보호 상태 새로 고침')}
</Button>
```

- [ ] **Step 4: Add the Defender status button**

In the Defender card, after the “Add Defender exclusion” button inside the flex row, add:

```tsx
<Button variant="secondary" disabled={defenderBusy} onClick={() => void refreshDefender()}>
  {t('Check status', '상태 확인')}
</Button>
```

- [ ] **Step 5: Verify and commit**

```powershell
npm run check
npm test
git add src/views/settings/SecurityTab.tsx
git commit -m "perf: query security status on demand"
```

Manual Tauri check:

```powershell
Get-Process powershell, schtasks, sc -ErrorAction SilentlyContinue
```

Expected: opening the Security tab creates none of those processes. Clicking “보호 상태 새로 고침” or “상태 확인” may create them briefly. Adding a Defender exclusion still works; if the status was not checked, the idempotent elevated script runs and reports added/already-added.

---

### Task 4: Disable WebView2 background networking

**Files:**
- Modify: `src-tauri/src/windows.rs`

**Interfaces:**
- Consumes: `BROWSER_ARGS` used by both `create_main` and `create_overlay`.
- Produces: same two windows, same IPC; fewer browser background requests.

- [ ] **Step 1: Update the browser args**

Replace the `BROWSER_ARGS` value with:

```rust
pub const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-networking --disable-component-update --disable-sync --disable-domain-reliability --no-default-browser-check";
```

- [ ] **Step 2: Build and smoke-test**

```powershell
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Run the built app and confirm:

- the main settings window renders;
- the tray icon appears;
- the shortcut opens the overlay;
- no blank WebView2 window or IPC error appears.

- [ ] **Step 3: Measure idle network**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/measure-resource.ps1 -Seconds 30
```

Expected: `tcpConnections=0` after the first 10 seconds, or no regression from the baseline. WebView2 may ignore a flag; the measurement decides.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/windows.rs
git commit -m "perf: disable WebView2 background networking"
```

---

### Task 5: Filter guard process lookups by executable name

**Files:**
- Modify: `src-tauri/src/guard.rs`
- Test: inline `#[cfg(test)] mod tests` in `guard.rs`

**Interfaces:**
- Consumes: `process_running(&Path)`, `process_named(&str)`, `guard_running()`.
- Produces: unchanged signatures; only matching executable names are opened.

- [ ] **Step 1: Add the failing helper test**

Add to `guard.rs` tests:

```rust
#[test]
fn executable_names_compare_case_insensitively() {
    assert!(same_exe_name("CUE.EXE", "cue.exe"));
    assert!(!same_exe_name("cue.exe", "cue-guard.exe"));
}
```

- [ ] **Step 2: Run it and confirm it fails**

```powershell
cargo test --manifest-path src-tauri/Cargo.toml guard::tests::executable_names_compare_case_insensitively
```

Expected: compile error because `same_exe_name` does not exist.

- [ ] **Step 3: Add the filter and replace the lookups**

Add:

```rust
fn same_exe_name(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}
```

Replace `process_paths()` with `process_paths_named(name: Option<&str>)` and filter before `OpenProcess`:

```rust
fn process_paths_named(name: Option<&str>) -> Vec<PathBuf> {
    use ::windows::Win32::Foundation::CloseHandle;
    use ::windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use ::windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use ::windows::core::PWSTR;

    let mut out = Vec::new();
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return out;
        };
        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let exe = String::from_utf16_lossy(&entry.szExeFile[..len]);
                if name.is_none_or(|target| same_exe_name(&exe, target)) {
                    let handle = OpenProcess(
                        PROCESS_QUERY_LIMITED_INFORMATION,
                        false,
                        entry.th32ProcessID,
                    );
                    if let Ok(handle) = handle {
                        let mut buf = [0u16; 1024];
                        let mut length = buf.len() as u32;
                        if QueryFullProcessImageNameW(
                            handle,
                            Default::default(),
                            PWSTR(buf.as_mut_ptr()),
                            &mut length,
                        )
                        .is_ok()
                        {
                            out.push(PathBuf::from(String::from_utf16_lossy(
                                &buf[..length as usize],
                            )));
                        }
                        let _ = CloseHandle(handle);
                    }
                }
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
    }
    out
}
```

Replace `process_named`:

```rust
fn process_named(name: &str) -> bool {
    !process_paths_named(Some(name)).is_empty()
}
```

Replace `process_running`:

```rust
pub fn process_running(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    let Some(target) = canonical(path) else {
        return false;
    };
    process_paths_named(Some(name))
        .into_iter()
        .any(|path| canonical(&path).as_deref() == Some(target.as_path()))
}
```

- [ ] **Step 4: Run the helper test and the full Rust suite**

```powershell
cargo test --manifest-path src-tauri/Cargo.toml guard::tests::executable_names_compare_case_insensitively
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: both pass.

- [ ] **Step 5: Manual guard check**

With guard enabled, kill the user-facing `cue.exe` through the normal app/guard flow as the user normally would and confirm the guard revives it. Do not use `taskkill`, `sc`, or `schtasks` as an agent.

- [ ] **Step 6: Commit**

```powershell
git add src-tauri/src/guard.rs
git commit -m "perf: filter guard process scans by name"
```

---

### Task 6: Use a cheaper capture resize filter

**Files:**
- Modify: `src-tauri/src/capture.rs`

**Interfaces:**
- Consumes: existing `encode_capture_crop`.
- Produces: same JPEG/base64 `Capture`; only the resize filter changes.

- [ ] **Step 1: Establish the capture regression baseline**

Run the existing capture tests:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml capture::tests
```

Expected: all pass. Keep a dense-text screenshot for a visual comparison.

- [ ] **Step 2: Change the filter**

In `encode_capture_crop`, change:

```rust
image::imageops::FilterType::Lanczos3
```

to:

```rust
image::imageops::FilterType::CatmullRom
```

- [ ] **Step 3: Run the capture tests**

```powershell
cargo test --manifest-path src-tauri/Cargo.toml capture::tests
```

Expected: all pass.

- [ ] **Step 4: Visual check**

Capture a 4K/dense question with small option text before and after. Expected: labels remain readable; if CatmullRom is visibly worse, revert and stop this task.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri/src/capture.rs
git commit -m "perf: use a cheaper capture resize filter"
```

---

### Task 7: Verify, version, and release 0.1.10

**Files:**
- Modify: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`
- Modify: `docs/CHANGELOG.md`, `AGENTS.md`

**Interfaces:**
- Consumes: all changes from Tasks 1-6.
- Produces: a signed 0.1.10 NSIS build and published GitHub Release with BOM-less `latest.json`.

- [ ] **Step 1: Run the full verification suite**

```powershell
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: TS 173 tests pass; Rust 139 tests pass (137 + 2 new helpers). Record the actual counts in `AGENTS.md`.

- [ ] **Step 2: Measure before/after**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/measure-resource.ps1 -Seconds 60
```

Record CPU, working set, private commit, TCP, and process count. Expected: idle CPU no higher than the 1.8% baseline; Security tab no longer creates `powershell`/`schtasks`/`sc` on open; idle TCP remains 0.

- [ ] **Step 3: Bump the version**

```powershell
npm version 0.1.10 --no-git-tag-version
```

Update `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json` to `0.1.10`.

Add to `docs/CHANGELOG.md`:

```markdown
## 0.1.10 — 2026-10-29

개선
- 회의 감지를 한 곳으로 모으고 프로세스 스냅샷을 3초 캐시했습니다.
- 보안 탭의 Defender·보호 상태 조회를 사용자가 요청할 때만 실행합니다.
- WebView2 백그라운드 네트워킹을 줄였습니다.
- guard/service 프로세스 조회를 실행 파일 이름으로 먼저 필터링합니다.
- 캡처 리사이즈 필터를 CatmullRom으로 바꿔 변환 비용을 줄였습니다.
```

Update `AGENTS.md`: current version 0.1.10, test counts, settings v15, and the resource notes.

- [ ] **Step 4: Commit and push the release changes**

```powershell
git add -A
git commit -m "chore: release 0.1.10"
git push origin main
```

- [ ] **Step 5: Build the signed installer**

```powershell
$keyPath = Join-Path $env:USERPROFILE '.tauri\cue\cue.key'
$passPath = Join-Path $env:USERPROFILE '.tauri\cue\cue.key.password'
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -Raw -LiteralPath $keyPath).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content -Raw -LiteralPath $passPath).Trim()
npm run tauri build
```

Expected: `src-tauri/target/release/bundle/nsis/Cue_0.1.10_x64-setup.exe` and `.sig`.

- [ ] **Step 6: Copy artifacts and generate the manifest**

```powershell
Copy-Item -LiteralPath 'src-tauri\target\release\bundle\nsis\Cue_0.1.10_x64-setup.exe' -Destination 'artifacts\Cue_0.1.10_x64-setup.exe' -Force
Copy-Item -LiteralPath 'src-tauri\target\release\cue.exe' -Destination 'artifacts\cue.exe' -Force
$setupHash = (Get-FileHash 'artifacts\Cue_0.1.10_x64-setup.exe' -Algorithm SHA256).Hash
$exeHash = (Get-FileHash 'artifacts\cue.exe' -Algorithm SHA256).Hash
Set-Content 'artifacts\SHA256.txt' -Encoding ascii -Value @(
  "$setupHash  Cue_0.1.10_x64-setup.exe",
  "$exeHash  cue.exe"
)
Remove-Item -LiteralPath 'artifacts\Cue_0.1.9_x64-setup.exe' -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath 'src-tauri\target\release\bundle\nsis\Cue_0.1.9_x64-setup.exe' -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath 'src-tauri\target\release\bundle\nsis\Cue_0.1.9_x64-setup.exe.sig' -Force -ErrorAction SilentlyContinue
& .\scripts\latest-json.ps1 -Version '0.1.10' `
  -Setup 'src-tauri\target\release\bundle\nsis\Cue_0.1.10_x64-setup.exe' `
  -Signature 'src-tauri\target\release\bundle\nsis\Cue_0.1.10_x64-setup.exe.sig' `
  -Notes 'Cue 0.1.10 - resource and process-footprint improvements.'
```

Expected: BOM-less `latest.json`; signature matches `.sig`.

- [ ] **Step 7: Publish the release**

```powershell
gh release create v0.1.10 --draft --target main --title "Cue 0.1.10" `
  --notes "Cue 0.1.10 - resource and process-footprint improvements." `
  "artifacts\Cue_0.1.10_x64-setup.exe" `
  "src-tauri\target\release\bundle\nsis\Cue_0.1.10_x64-setup.exe.sig" `
  "src-tauri\target\release\bundle\nsis\latest.json" `
  "artifacts\SHA256.txt" "artifacts\cue.exe"
gh release edit v0.1.10 --draft=false --latest
```

- [ ] **Step 8: Verify the live endpoint**

```powershell
$url = 'https://github.com/gguatit/cue/releases/latest/download/latest.json'
$j = (curl.exe -L -s $url) | ConvertFrom-Json
$j.version
$j.platforms.'windows-x86_64'.url
& curl.exe -L -s -o NUL -w '%{http_code}' $j.platforms.'windows-x86_64'.url
```

Expected: version `0.1.10`, setup URL HTTP 200, signature matches, release is published/latest.

- [ ] **Step 9: User-only checks**

Ask the user to verify:

- install/update from 0.1.9 to 0.1.10;
- UAC and restart;
- guard/admin service restore;
- Security tab opens without PowerShell/schtasks/sc until a status button is clicked;
- Defender add/status still work;
- meeting safe mode still hides the tray/overlay with Zoom/OBS;
- uninstall after update still cleans service/tasks/ProgramData.

## Deferred Decisions

These were found during the audit but are intentionally **not** in this plan:

| Item | Reason |
|---|---|
| Make auto-update manual | Idle TCP is already 0; one request per launch/24h. This is a product decision, not a resource bug. Revisit if network monitoring is a concern. |
| Lazily create/destroy the overlay | Saves about 12 MB working set but needs a ready handshake and adds first-answer latency. Current total working set is 39 MB. |
| Capture only the crop region | Requires refactoring cursor-coordinate mapping and capture buffers. Measure Task 6 first; add only if capture peak memory/latency is still a problem. |
| Remove WebView2 anti-throttle flags | The tray/badge timers currently live in JavaScript. Removing the flags without moving timers to Rust risks delayed tray clearing. |
| Parallelize startup invokes | Saves tens of milliseconds; not worth the ordering risk now. |
| Auto-load AI models on AI tab mount | A settings-open network request, not an idle request. |
| Disable guard/admin service | The service and `cue-guard.exe` are a protection/visibility tradeoff, not a code bug. Resource cost is small (about 2 MB). |
| Authenticode code signing | Distribution/Defender false-positive work, not a runtime resource optimization. |

## Self-Review

- Spec coverage: C1/Task 2, C2/Task 3, C3/Task 4, C4/Task 5, C5/Task 6, measurement/Task 1, release/Task 7. C6/C7 are explicitly deferred.
- Placeholder scan: no TBD/TODO; deferred items have explicit reasons.
- Type consistency: `meeting_active() -> bool`, `process_running(&Path) -> bool`, `process_named(&str) -> bool`, `cache_is_fresh(Duration) -> bool`, `same_exe_name(&str, &str) -> bool`, and `process_paths_named(Option<&str>) -> Vec<PathBuf>` are used consistently.
- Review Focus: each failure mode has a test or a manual Tauri check in its owning task.
