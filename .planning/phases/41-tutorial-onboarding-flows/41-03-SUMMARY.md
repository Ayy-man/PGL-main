---
phase: 41-tutorial-onboarding-flows
plan: 03
subsystem: layout-onboarding
tags: [top-bar, help-menu, dropdown, dialog, video-embed, report-issue, tdd]
dependency_graph:
  requires:
    - src/app/actions/onboarding-state.ts           # Plan 01 write action
    - src/components/issues/report-issue-dialog.tsx # composed, not duplicated
    - src/lib/issues/capture-screenshot.ts          # pre-capture for report flow
    - src/components/ui/dropdown-menu.tsx           # shadcn primitive
    - src/components/ui/dialog.tsx                  # shadcn primitive
    - src/components/ui/button.tsx                  # ghost/icon variant trigger
  provides:
    - "HelpMenu client component (CircleHelp icon → 3-item DropdownMenu)"
    - "resolveVideoUrl(env) pure helper — discriminated { kind } union"
    - "isEmbeddableVideoUrl(url) pure helper"
    - "pickVideoRenderer(url) pure helper — 'iframe' | 'video'"
    - "NEXT_PUBLIC_PGL_INTRO_VIDEO_URL env var contract"
  affects:
    - src/components/layout/top-bar.tsx             # +2 lines (import + mount)
tech_stack:
  added: []
  patterns:
    - "Pure helper + consumer test split: video-url.ts holds the logic, both a
       co-located test file and a HelpMenu-adjacent test file import via the
       consumer path (@/lib/onboarding/video-url) to lock the public contract"
    - "onSelect={(e)=>{ e.preventDefault(); ... }} on DropdownMenuItem — the
       default close-on-select fires before our async work resolves and would
       dismiss the Dialog we just opened; preventDefault keeps the menu the
       sole owner of close semantics while we run the handler"
    - "Dual state (replaying / capturing) + disabled prop on the DropdownMenuItem
       so rapid re-clicks don't stack requests"
    - "Screenshot pre-capture before opening ReportIssueDialog, matching the
       existing ReportIssueButton flow exactly (no new capture timing)"
key_files:
  created:
    - src/lib/onboarding/video-url.ts
    - src/lib/onboarding/__tests__/video-url.test.ts
    - src/components/layout/help-menu.tsx
    - src/components/layout/__tests__/help-menu-helpers.test.ts
  modified:
    - src/components/layout/top-bar.tsx
decisions:
  - "Store the video URL as NEXT_PUBLIC_PGL_INTRO_VIDEO_URL — NEXT_PUBLIC_ prefix
     is REQUIRED because top-bar is a 'use client' component; Next statically
     inlines the value at build time and the plain-string result flows through
     resolveVideoUrl without runtime env access inside the helper"
  - "ReportTarget variant is 'none' (reused existing TargetType union), NOT a
     new 'help-menu' variant — the phase constraint forbids adding variants,
     and 'none' is the closest semantic match for a page-agnostic entry point.
     The orgId + source='help-menu' tag rides in target.snapshot for debugging"
  - "Replay flow requires router.refresh() — not useState toggle — because the
     tour mount point in the server layout reads onboarding_state from the
     session JWT server-side. Plain client state won't re-fire <TourTrigger>"
  - "Only tour_completed is flipped on replay. The plan's note suggested
     tour_skipped_at: null but OnboardingStatePartial (Plan 01) allow-lists
     an optional string only — no null. The tour-render gate in later plans
     reads tour_completed alone; skipped_at is metadata, not a gate"
  - "ReportIssueDialog is composed, NOT duplicated. HelpMenu owns its own
     open-state + blob-state and renders <ReportIssueDialog> directly. This
     reuses the entire screenshot-capture + POST /api/issues/report pipeline
     without touching ReportIssueButton"
  - "Help-menu-helpers test imports via the consumer path (@/lib/onboarding/...)
     rather than the relative path. The coverage is intentionally overlapping
     with video-url.test.ts — same helpers, different import entry points.
     Point: a future refactor that silently removes an export breaks this
     test, flagging the regression to HelpMenu's dialog branching"
metrics:
  duration: ~14min
  tasks_completed: 2
  tests_added: 30
  completed_date: 2026-04-15
---

# Phase 41 Plan 03: Help Menu in Top Bar Summary

Persistent Help affordance in the top-bar: one CircleHelp button that opens a 3-item dropdown — watch intro video, replay product tour, report an issue — all composed from existing primitives with zero new dependencies.

## What shipped

Four new files, one modified file, three commits, 30 Vitest specs green, `tsc --noEmit` clean on every touched file.

### File tree

```
src/
├── components/
│   └── layout/
│       ├── help-menu.tsx                        (new — client component, 171 lines)
│       ├── top-bar.tsx                          (MODIFIED — +2 lines)
│       └── __tests__/
│           └── help-menu-helpers.test.ts        (new — 6 specs, pure helpers)
└── lib/
    └── onboarding/
        ├── video-url.ts                         (new — 3 pure helpers, no side effects)
        └── __tests__/
            └── video-url.test.ts                (new — 24 specs)
```

## Public API

### `src/lib/onboarding/video-url.ts`

```ts
export type VideoUrlResolution =
  | { kind: "url"; url: string }
  | { kind: "missing" }
  | { kind: "invalid" };

export function resolveVideoUrl(
  env: Partial<Record<string, string | undefined>>
): VideoUrlResolution;

export function isEmbeddableVideoUrl(url: string): boolean;

export function pickVideoRenderer(url: string): "iframe" | "video";
```

Contract (covered by tests):

- `resolveVideoUrl` — unset / empty / whitespace / `undefined` → `missing`; unparseable or non-http(s) → `invalid`; otherwise → `{ kind: "url", url }` with the raw string preserved.
- `isEmbeddableVideoUrl` — true for loom / youtube / youtu.be / vimeo hosts (including subdomains) and direct `.mp4` / `.webm` / `.mov` paths. Uses anchored `host === X || host.endsWith("." + X)` matching so `evil-loom.com.attacker.tld` doesn't pass.
- `pickVideoRenderer` — `video` when the URL path ends in mp4/webm/mov, `iframe` otherwise. Unparseable URLs default to `iframe` (caller's `resolveVideoUrl` already routed them to the fallback branch).

### `src/components/layout/help-menu.tsx`

```ts
export interface HelpMenuProps {
  orgId?: string;
}
export function HelpMenu(props: HelpMenuProps): JSX.Element;
```

Behavior:

- **Trigger**: `CircleHelp` icon inside a ghost/icon `<Button>` (`h-8 w-8`, `aria-label="Help"`). Matches the avatar's dimensions so the top-bar right cluster stays visually even.
- **Menu item 1 — Watch intro video**: opens `<Dialog>`. Internally calls `resolveVideoUrl({ NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: process.env.NEXT_PUBLIC_PGL_INTRO_VIDEO_URL })`. If `{kind:"url"}`, branches on `pickVideoRenderer` between `<iframe>` (loom / youtube / vimeo) and `<video>` (direct file). Else renders *"Video coming soon — check back after the demo."*
- **Menu item 2 — Replay product tour**: calls `updateOnboardingState({ tour_completed: false })` then `router.refresh()` on success. Disabled while in-flight, label swaps to "Resetting…".
- **Menu item 3 — Report an issue**: calls `captureScreenshot()` (swallows errors to `null`), then opens the existing `<ReportIssueDialog>` with the captured blob. Disabled while capturing, label swaps to "Capturing page…".

### `src/components/layout/top-bar.tsx` (diff)

```diff
 import Link from "next/link";
 import { CommandSearch } from "./command-search";
+import { HelpMenu } from "./help-menu";
 ...
       <div className="flex items-center gap-3">
+        <HelpMenu orgId={orgId} />
         <Link
           href={orgId ? `/${orgId}/settings` : "/settings"}
```

Exactly 2 additions. No restyle, no flex-container change, no avatar change.

## The env-var gotcha

`NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` is the **only** correct variable name:

- **Must be `NEXT_PUBLIC_`-prefixed** — top-bar is a `"use client"` component. Next 14 statically inlines `NEXT_PUBLIC_*` reads at build time; non-prefixed env reads in client code resolve to `undefined` silently and would always drop us into the "Video coming soon" branch.
- **Set in two places**: local `.env.local` AND Vercel project env (Production + Preview). Vercel reads don't propagate to local dev.
- **Change requires rebuild**. Client-inlined values don't hot-update — after setting the var, trigger a deploy (or `pnpm dev` restart locally).

Follow-up action (user-owned, flagged in 41-CONTEXT `<deferred>`):

1. Record 2–3 min Loom walkthrough.
2. Copy the share URL (format: `https://www.loom.com/share/<id>`).
3. Add to `.env.local` and the Vercel dashboard as `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL`.
4. Redeploy. The Dialog now embeds the iframe automatically — no code change required.

## The replay-flow gotcha

`router.refresh()` is NOT optional. The tour mount point (future Plan 02/04) reads `user.app_metadata.onboarding_state.tour_completed` server-side from the session JWT inside `src/app/[orgId]/layout.tsx`. A purely client-side state toggle would never reach that read path.

Sequence on replay click:

1. `updateOnboardingState({ tour_completed: false })` → Server Action (Plan 01)
   - Service-role admin client writes new `app_metadata.onboarding_state`
   - Session JWT gets re-signed with the new claim on next auth hydration
2. `router.refresh()` → App Router re-fetches the layout RSC, which re-reads the JWT
3. `<TourTrigger>` (or whatever renders the tour) sees `tour_completed: false` and re-mounts
4. User sees step 1 of the tour again

Skipping the refresh leaves the layout render stuck on the stale `tour_completed: true` render tree and the tour never re-appears — the user would have to full-reload manually.

## The ReportTarget variant choice

The existing `TargetType` union (`src/types/database.ts:331`):

```ts
export type TargetType = "prospect" | "list" | "persona" | "search" | "none";
```

HelpMenu is page-agnostic (mounted in the top bar on every tenant page), so none of the content-specific variants (`prospect` / `list` / `persona` / `search`) fit. `"none"` is the existing escape hatch and was **reused** as prescribed — no new variant was added, per the plan's explicit constraint:

> NOTE on `target={{ kind: "help-menu", orgId }}`: match the existing `ReportTarget` union... If that union doesn't have a `"help-menu"` variant, use the closest existing variant (e.g., `{ kind: "generic", orgId }`) — do NOT add new variants in this phase.

`orgId` + `source: "help-menu"` ride in `target.snapshot` so downstream triage still sees where the report came from, but the surface-level type stays stable.

## Why ReportIssueDialog is composed, not duplicated

`<ReportIssueButton>` (the existing component) ships a `<Button>` + its own `open` state + screenshot capture + `<ReportIssueDialog>`. HelpMenu can't drop-in that button because the trigger needs to be a `<DropdownMenuItem>` — a `<button>` inside a `<button>` would be invalid DOM and break keyboard navigation.

Options considered:

1. **`asChild` the existing `ReportIssueButton` into `DropdownMenuItem`.** Rejected — `ReportIssueButton` renders its own `<Button>`, so we'd be nesting Radix's button primitives (DropdownMenuItem is a Radix MenuItem, the inner Button is a Radix Slot). The `onClick` timing also fights the dropdown's auto-close.
2. **Duplicate the ReportIssueButton logic inline.** Rejected — two copies of the screenshot-capture + FormData-build code would drift.
3. **Compose `<ReportIssueDialog>` directly, manage state in HelpMenu.** ✓ Chosen — HelpMenu owns the `open` + `blob` state, renders the dialog as a sibling, and the DropdownMenuItem's handler does `captureScreenshot() → setIssueBlob(blob) → setIssueOpen(true)`. One capture pipeline, zero duplication, and the dropdown closes naturally before the dialog opens (the `onSelect` handler is async, so by the time the blob resolves the menu is already gone).

## Test coverage

30 Vitest specs total, all passing, ~4ms run time. Node env, zero React rendering, zero RTL (package not installed — matches 41 CONTEXT locked test strategy).

| File | Specs | Covers |
|------|-------|--------|
| `src/lib/onboarding/__tests__/video-url.test.ts` | 24 | `resolveVideoUrl` (7 specs: url/missing/invalid branches, whitespace, undefined, ftp), `isEmbeddableVideoUrl` (11 specs: loom / youtube / vimeo / mp4 / webm / mov + rejects), `pickVideoRenderer` (6 specs: direct-file / iframe / junk) |
| `src/components/layout/__tests__/help-menu-helpers.test.ts` | 6 | Same helpers through the consumer import path — locks the public contract HelpMenu consumes |

## Verification — all green

- `npx vitest run src/lib/onboarding/__tests__/video-url.test.ts src/components/layout/__tests__/help-menu-helpers.test.ts` → 30 passed (2 files)
- `npx tsc --noEmit` → no errors attributable to the 5 touched files (pre-existing `execute-research.test.ts` cluster already logged in Plan 01 `deferred-items.md`, out of scope)
- `rg '<HelpMenu' src/components/layout/top-bar.tsx` → 1 match (line 29)
- `rg 'NEXT_PUBLIC_PGL_INTRO_VIDEO_URL' src/` → 12 matches across helper, component, and both test files
- `rg 'updateOnboardingState' src/components/layout/help-menu.tsx` → 2 matches (import + call)

## How downstream plans consume

Plan 04 (or whichever plan introduces `<TourTrigger>`) reads the same JWT claim HelpMenu writes to:

```ts
// In src/app/[orgId]/layout.tsx (server component):
const { data: { user } } = await supabase.auth.getUser();
const state =
  (user?.app_metadata?.onboarding_state as OnboardingState | undefined)
  ?? DEFAULT_ONBOARDING_STATE;

// Replay gate the HelpMenu flipped:
if (!state.tour_completed) {
  return <TourTrigger user={user} ... />;
}
```

When HelpMenu's "Replay product tour" fires, the client-side `router.refresh()` causes this exact server render to re-run with the new claim, re-mounting `<TourTrigger>`.

## TDD gate compliance

Gate sequence honored for Task 1 (pure helpers):

1. **RED** — `test(41-03): add failing tests for video-url pure helpers` — commit `fc1c6bd`. All 24 tests fail with `Cannot find module '../video-url'`.
2. **GREEN** — `feat(41-03): implement pure video-url helpers` — commit `bc87105`. 24 tests pass in 2ms.
3. **REFACTOR** — skipped; the straight-line implementation is already minimal.

Task 2 (HelpMenu component + TopBar wire) ships with the help-menu-helpers test co-located. Per 41-CONTEXT locked test strategy ("pure helpers only, no RTL"), the component itself is not rendered under test — its correctness is enforced by (a) a clean `tsc --noEmit`, (b) the `<HelpMenu` single-mount grep, (c) the public-contract overlap test that guards the helpers HelpMenu depends on, and (d) the visual manual verification step in the deferred post-phase checklist.

## Deviations from plan

**Deviation 1 (Rule 2 — missing safety): added `disabled` + state-guard to "Report an issue" item.**
The plan's reference implementation for the Report handler had no `capturing` guard — a user double-clicking the menu item while `captureScreenshot()` was resolving would stack two opens and produce a flickering dialog. Matched the existing `ReportIssueButton`'s `capturing` state pattern, adding `const [capturing, setCapturing] = React.useState(false);` + a `disabled={capturing}` prop + label swap. Not a new behavior — just parity with the existing button HelpMenu composes with.

**Deviation 2 (Rule 3 — type constraint): dropped `tour_skipped_at: null` from replay payload.**
The plan's description text mentioned `updateOnboardingState({ tour_completed: false, tour_skipped_at: null })` but Plan 01's `OnboardingStatePartial` type:

```ts
export type OnboardingStatePartial = {
  tour_completed?: boolean;
  tour_skipped_at?: string;
  tour_completed_at?: string;
  admin_checklist?: Partial<AdminChecklistState>;
};
```

`tour_skipped_at` is `string | undefined`, not `string | null`. Passing `null` is a `tsc` error. The effective fix is to flip `tour_completed: false` alone — the downstream tour-render gate reads `tour_completed`, and the stale `tour_skipped_at` timestamp is metadata that does not suppress the re-render. Documented inline in the component comment.

**Deviation 3 (Rule 2 — security): locked host matching in `isEmbeddableVideoUrl`.**
The plan's sample used `host.includes("loom.com")` which would return true for `evil-loom.com.attacker.tld`. Tightened to `host === "loom.com" || host.endsWith(".loom.com")` (same pattern for youtube, youtu.be, vimeo). Added a dedicated test case (`"https://www.loom.com/share/abc"` → true) to verify the subdomain branch still works. Zero functional impact; strictly narrower matching.

**Deviation 4 (Rule 3 — test-file re-use): placed the component test at the plan's prescribed path.**
The plan initially suggested either extending `video-url.test.ts` OR creating `help-menu-helpers.test.ts`. Chose the latter (per the plan's explicit path in `files_modified` and the `<action>` code block) and imported helpers from the consumer path `@/lib/onboarding/video-url` — intentional overlap with the co-located test so a future refactor that silently breaks the export surface HelpMenu depends on fails at both import sites.

None of the deviations changed any architectural decision locked in 41-CONTEXT. All are Rule 2/3 refinements; Rule 4 was not triggered.

## Known Stubs

None. The "Video coming soon" message is intentionally the designed fallback per 41-CONTEXT `<deferred>` — not a stub. Once the user sets `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` on Vercel after recording the Loom, the branch flips to the iframe embed with zero code change.

## Threat Flags

None. HelpMenu introduces no new network endpoints, no new auth surface, no new file-access patterns, and no schema changes. The `updateOnboardingState` write path (Plan 01) already exists and is exercised here via its typed `OnboardingStatePartial` contract. The `<iframe>` embed uses a `NEXT_PUBLIC_` value the user explicitly sets — same trust boundary as any hard-coded external URL.

## Commits

| # | Hash       | Message                                                             |
|---|------------|---------------------------------------------------------------------|
| 1 | `fc1c6bd`  | test(41-03): add failing tests for video-url pure helpers           |
| 2 | `bc87105`  | feat(41-03): implement pure video-url helpers                       |
| 3 | `420d8b4`  | feat(41-03): ship HelpMenu top-bar dropdown + wire into TopBar      |

## Post-phase action items (user-owned)

Carry-over from 41-CONTEXT `<deferred>`:

- [ ] Record 2–3 min Loom walkthrough.
- [ ] Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` in `.env.local`.
- [ ] Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` on Vercel (Production + Preview).
- [ ] Redeploy. Confirm the Dialog shows the iframe (not the fallback copy).

## Self-Check

- [x] FOUND: `src/lib/onboarding/video-url.ts`
- [x] FOUND: `src/lib/onboarding/__tests__/video-url.test.ts`
- [x] FOUND: `src/components/layout/help-menu.tsx`
- [x] FOUND: `src/components/layout/__tests__/help-menu-helpers.test.ts`
- [x] FOUND: `src/components/layout/top-bar.tsx` (modified, +2 lines)
- [x] FOUND commit `fc1c6bd`
- [x] FOUND commit `bc87105`
- [x] FOUND commit `420d8b4`

## Self-Check: PASSED
