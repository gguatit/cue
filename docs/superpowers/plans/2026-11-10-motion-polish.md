# Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cue's Motion animations feel more natural without making them slower, then add the safe high-value motion patterns that remain.

**Architecture:** Keep Motion 14.11.1. Tune the shared tokens, synchronize control animations, add reusable presence for status text, add layout animation only to small controls/lists, and keep the answer overlay at a short opacity fade. Risky transitions are gated behind visual checks.

**Tech Stack:** React 19, Motion 14.11.1, Tailwind 4, Vite, Tauri 2.

**Spec:** Current Cue 0.4.6 motion implementation; conversation decisions of 2026-11-10. This plan is the design authority if no separate spec exists.

## Global Constraints

- **No new dependencies.** Motion is already installed.
- **Do not make interactions slower.** Enter 140–180ms, exit 100–140ms, micro spring 0.20–0.24s.
- **Only transform, opacity, and small-control layout.** Never animate large panel width/height.
- **Overlay stays at 120ms opacity fade.** No spring, layout, or presence in the answer overlay.
- **`prefers-reduced-motion` disables layout/spring**, leaving a short fade only.
- **No Rune changes.** This is the Tauri/React UI only.
- **No jsdom tests.** Use existing TypeScript tests plus Vite/Playwright visual verification.
- **Preserve 203 TS / 157 Rust tests.**
- **No release until visual checks pass.** Target version after implementation: 0.4.7.

## Review Focus

1. **Reduced motion:** every new presence/layout must disappear or become a short fade.
2. **Lazy tabs:** tab transitions must not block lazy loading or cause layout jumps.
3. **Dialog exit:** closing must complete the exit animation without trapping focus or leaving the backdrop.
4. **640×480:** new movement must not introduce horizontal overflow or clipped controls.
5. **Overlay:** answer display must remain immediate, click-through, and capture-protected.
6. **Interruption:** rapid toggle/tab changes must retarget springs without visible jumps.

---

### Task 1: Refine motion tokens and synchronize controls

**Files:**
- Modify: `src/lib/motion.ts`
- Modify: `src/components/ui.tsx`

**Interfaces:**
- Produces: `micro`, `panel`, `fade`, `exit`, `stagger`, and `layoutSpring` transitions from `src/lib/motion.ts`.
- Keeps: `springSnappy`, `springSoft`, `fade`, `fadeFast` aliases while callers migrate.

- [ ] **Step 1: Define the token values**

Update `src/lib/motion.ts` to contain:

```ts
export const micro: Transition = { type: 'spring', visualDuration: 0.22, bounce: 0.02 }
export const panel: Transition = { type: 'spring', visualDuration: 0.32, bounce: 0.04 }
export const exit: Transition = { duration: 0.12, ease: 'easeIn' }
export const fade: Transition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] }
export const stagger = 0.018
export const layoutSpring: Transition = { type: 'spring', visualDuration: 0.24, bounce: 0.02 }
```

Replace the existing `fade`; keep `fadeFast` for tests/compatibility until callers are migrated. Add `springSnappy = micro` and `springSoft = panel` aliases so existing imports keep compiling.

- [ ] **Step 2: Synchronize switch timing**

In `Switch` and `Toggle`:
- knob uses `micro`
- track uses `duration-150` color transition
- no `transition-transform` class on the knob

Expected: knob and track finish together; no bounce beyond the 2% setting.

- [ ] **Step 3: Use one spring for segmented selection**

In `SegmentedControl`:
- use `layoutSpring` for the selected pill
- keep `useId()` layoutId isolation
- keep text above the pill with `relative z-10`

- [ ] **Step 4: Tune button press**

In `Button`:
- `whileTap={{ scale: 0.975 }}`
- `transition={micro}`
- keep background hover as CSS only

- [ ] **Step 5: Verify**

Run:

```bash
npm run check
npm test
npm run build
```

Expected: 203 tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/motion.ts src/components/ui.tsx
git commit -m "feat: tune motion timing and controls"
```

### Task 2: Add reusable presence for status messages

**Files:**
- Create: `src/components/Presence.tsx`
- Modify: `src/views/settings/AiTab.tsx`
- Modify: `src/views/settings/GeneralTab.tsx`
- Modify: `src/views/settings/AboutTab.tsx`

**Interfaces:**
- Produces:

```ts
export function Presence({
  show,
  children,
  className,
  role,
  live,
}: {
  show: boolean
  children: ReactNode
  className?: string
  role?: AriaRole
  live?: 'polite' | 'assertive'
})
```

- Uses `AnimatePresence initial={false}` and `motion.div` with `opacity` and `y: 2`; enter `fade`, exit `exit`.

- [ ] **Step 1: Create the component**

Render nothing when hidden. When shown, render a `motion.div` with the caller's `role`, `aria-live`, and className. Use `key="presence"`.

- [ ] **Step 2: Use it for AI status**

In `AiTab`, wrap the existing status span (`role="status"`, `aria-live="polite"`) in `Presence show={Boolean(status)}`. Keep the text and color conditions unchanged.

- [ ] **Step 3: Use it for backup and update messages**

- `GeneralTab`: `backupMessage`
- `AboutTab`: `cleanupResult`, `cleanupError`, preflight error/status
- Preserve each existing `role`/`aria-live` and text.

- [ ] **Step 4: Verify**

Run `npm run check`, `npm test`, `npm run build`. In Vite, trigger a save/error/backup message and confirm it fades without jumping.

- [ ] **Step 5: Commit**

```bash
git add src/components/Presence.tsx src/views/settings/AiTab.tsx src/views/settings/GeneralTab.tsx src/views/settings/AboutTab.tsx
git commit -m "feat: animate status messages"
```

### Task 3: Layout-animate small lists

**Files:**
- Modify: `src/views/settings/AiTab.tsx`
- Modify: `src/views/settings/GeneralTab.tsx`

**Interfaces:**
- Uses `LayoutGroup`, `AnimatePresence`, `motion.button`, and `motion.li`.

- [ ] **Step 1: Animate model chips**

Wrap `ModelChips` in `LayoutGroup`; each chip is `motion.button layout="position"` with `layoutSpring`. Do not animate the model list height.

- [ ] **Step 2: Animate profile rows**

Wrap the profiles list in `AnimatePresence initial={false}`. Each row is `motion.li layout="position"` with initial/exit opacity and 4px x movement; use `exit` timing. Keep the existing Apply/Delete buttons and keys.

- [ ] **Step 3: Verify**

Add/delete a profile and load model chips. Confirm rows move without layout jumps or hidden buttons.

- [ ] **Step 4: Commit**

```bash
git add src/views/settings/AiTab.tsx src/views/settings/GeneralTab.tsx
git commit -m "feat: animate model chips and profiles"
```

### Task 4: Refine onboarding progress and step timing

**Files:**
- Modify: `src/views/onboarding/Onboarding.tsx`

**Interfaces:**
- Uses `LayoutGroup`, `motion.span`, `AnimatePresence mode="wait"`, and `micro`/`exit`.

- [ ] **Step 1: Animate progress bars**

Replace the CSS `transition-all` bars with `motion.span layout` inside `LayoutGroup`. Keep the active/complete colors and widths. Use `layoutSpring`; no height animation.

- [ ] **Step 2: Shorten step transition**

Keep `AnimatePresence mode="wait"` but use:
- enter: opacity + x 6, 0.14s
- exit: opacity + x -6, 0.12s

Expected: total transition is shorter than the current 0.18s enter/exit, with no layout pop.

- [ ] **Step 3: Verify**

Move through all four steps; confirm focus stays usable and no content is clipped at 640×480.

- [ ] **Step 4: Commit**

```bash
git add src/views/onboarding/Onboarding.tsx
git commit -m "feat: polish onboarding motion"
```

### Task 5: Animate update progress with transform

**Files:**
- Modify: `src/views/settings/AboutTab.tsx`

**Interfaces:**
- Replaces width animation with `scaleX` and `transformOrigin: left`.

- [ ] **Step 1: Replace the progress fill**

Use a `motion.div` with `style={{ scaleX: (progress ?? 0) / 100, transformOrigin: 'left' }}` and `animate={{ scaleX: ... }}`, `transition={layoutSpring}`. Keep the outer track and text.

- [ ] **Step 2: Verify**

In Vite, mock or trigger a progress state; confirm the bar moves smoothly and the percentage text remains correct.

- [ ] **Step 3: Commit**

```bash
git add src/views/settings/AboutTab.tsx
git commit -m "feat: animate update progress"
```

### Task 6: Tab crossfade experiment (gated)

**Files:**
- Modify: `src/views/settings/SettingsHome.tsx`

**Interfaces:**
- Tries `AnimatePresence` around the lazy tab content; keeps the current mount fade if the gate fails.

- [ ] **Step 1: Try a stable crossfade**

Use a relative content wrapper and `AnimatePresence mode="popLayout"` with:
- enter opacity + y 4, 0.16s
- exit opacity, 0.12s
- exiting layer absolute and pointer-events-none

- [ ] **Step 2: Gate**

At 880×640 and 640×480, switch all tabs rapidly, including during lazy load.

Pass only if:
- no overlap/clipped content after 200ms
- no scroll position jump
- no console errors
- tab switch latency does not increase perceptibly

If any check fails, revert to the current single `motion.div` mount fade and leave the task without a commit.

- [ ] **Step 3: Commit only on pass**

```bash
git add src/views/settings/SettingsHome.tsx
git commit -m "feat: crossfade settings tabs"
```

### Task 7: Dialog direction polish (optional gate)

**Files:**
- Modify: `src/components/ConfirmDialog.tsx`
- Modify: `src/components/UpdateConfirmDialog.tsx`

**Interfaces:**
- Uses `panel` and `exit`; no container-transform/shared layout yet.

- [ ] **Step 1: Tune dialog motion**

Panel: opacity 0 + scale 0.985 + y 6; enter `panel`, exit 0.12s. Backdrop: opacity only, 0.12s. Use `transformOrigin: center`.

Do not add a `layoutId` container transform in this task; that is a separate high-risk experiment.

- [ ] **Step 2: Verify**

Open/cancel both dialogs; confirm Escape/cancel/confirm, focus, and backdrop removal are unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx src/components/UpdateConfirmDialog.tsx
git commit -m "feat: refine dialog motion"
```

### Task 8: Optional stagger (only if visual review passes)

**Files:**
- Modify: `src/views/onboarding/Onboarding.tsx` or `src/views/settings/HelpTab.tsx`

**Interfaces:**
- Uses `stagger` from `motion.ts`.

- [ ] **Step 1: Apply to a maximum of four items**

Use a parent `motion.div` with `variants` and `staggerChildren: stagger` for onboarding steps or Help groups. Do not animate full settings lists.

- [ ] **Step 2: Gate**

If the page feels slower or elements are still appearing after 250ms, remove the stagger.

- [ ] **Step 3: Commit only on pass**

```bash
git add src/views/onboarding/Onboarding.tsx src/views/settings/HelpTab.tsx
git commit -m "feat: stagger small groups"
```

### Task 9: Verification and release 0.4.7

**Files:**
- Modify: `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`
- Modify: `docs/CHANGELOG.md`, `AGENTS.md`

- [ ] **Step 1: Full checks**

```bash
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

Expected: 203 TS / 157 Rust pass.

- [ ] **Step 2: Visual matrix**

- 880×640 and 640×480
- all six settings tabs
- sidebar active pill
- theme/accent segmented controls
- toggle and button press
- both dialogs
- onboarding four steps
- update progress
- reduced motion
- overlay fade only

- [ ] **Step 3: Record bundle impact**

Record the `motion-*.js` chunk size and any change to the main chunk.

- [ ] **Step 4: Version and docs**

Bump to **0.4.7** in all version files; add a CHANGELOG entry; update AGENTS current version and test counts.

- [ ] **Step 5: Build and release only after visual pass**

Use the existing signed build, artifacts, BOM-less latest.json, and GitHub release procedure.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json docs/CHANGELOG.md AGENTS.md
git commit -m "chore: release 0.4.7 motion polish"
```

## Not Planned

- Scroll-linked reveals or scroll hijacking.
- Magnetic pointer-follow buttons.
- Spring/layout animations in the answer overlay.
- Full shared-element dialog container transforms.
- Large-list height animations.

## Review Checklist

- [ ] Reduced motion verified for every new transition.
- [ ] No layout jump on lazy tab load.
- [ ] Dialog exit completes before removal.
- [ ] No horizontal overflow at 640×480.
- [ ] Overlay remains 120ms fade only.
- [ ] Tests 203/157 and build pass.
- [ ] Bundle change recorded.
