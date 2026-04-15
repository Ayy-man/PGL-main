---
phase: 41-tutorial-onboarding-flows
plan: 02
subsystem: onboarding
tags: [product-tour, radix-popover, coachmark, data-tour-id, tdd, hand-rolled]
dependency_graph:
  requires:
    - src/app/actions/onboarding-state.ts
    - src/types/onboarding.ts
    - src/lib/onboarding/merge-state.ts
  provides:
    - "TOUR_STEPS array (6 locked steps, readonly)"
    - "Pure helpers: nextTourStep, nextPresentTourStep, previousTourStep, findFirstPresentStep"
    - "Popover primitive (shadcn wrapper over @radix-ui/react-popover)"
    - "TourProvider + useTour context hook (currentStep, isActive, next, previous, skip, complete, restart)"
    - "ProductTour client component (Popover anchored via virtualRef + fallback bottom-right card)"
    - "TourTrigger server-layout entry (gates on !tour_completed)"
  affects:
    - "src/app/[orgId]/layout.tsx — TourTrigger mounted after MobileBottomNav"
    - "7 tour-target files — single data-tour-id attribute added per file"
tech_stack:
  added:
    - "@radix-ui/react-popover@^1.1.15"
  patterns:
    - "Hand-rolled tour — zero tour library install (no react-joyride/driver.js/shepherd)"
    - "nextPresentTourStep auto-skips steps whose target selector is absent — missing DOM nodes never hang the popover over nothing"
    - "PopoverAnchor virtualRef={{ current: anchorEl }} — HTMLElement satisfies Radix's Measurable contract"
    - "Initial currentStep = findFirstPresentStep(…) — lets the tour start from the current page rather than always forcing to dashboard"
    - "Fallback: when anchor element is missing, render a fixed bottom-right card instead of a Popover anchored to nothing"
    - "Escape key = skip (keyboard-nav requirement from 41-CONTEXT.md)"
key_files:
  created:
    - src/components/ui/popover.tsx
    - src/lib/onboarding/tour-steps.ts
    - src/lib/onboarding/tour-navigation.ts
    - src/lib/onboarding/__tests__/tour-navigation.test.ts
    - src/components/onboarding/tour-context.tsx
    - src/components/onboarding/product-tour.tsx
    - src/components/onboarding/tour-trigger.tsx
  modified:
    - src/app/[orgId]/layout.tsx
    - src/app/[orgId]/page.tsx
    - src/app/[orgId]/search/components/nl-search-bar.tsx
    - src/app/[orgId]/search/components/advanced-filters-panel.tsx
    - src/app/[orgId]/search/components/bulk-actions-bar.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/components/prospect/profile-view.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Installed @radix-ui/react-popover at ^1.1.15 to match the installed major/minor of the other Radix deps (dialog 1.1.15, tooltip 1.2.8, dropdown-menu 2.1.16). No upgrade cascade."
  - "TourProvider's next() callback uses nextPresentTourStep (not plain nextTourStep) so missing-target steps are skipped client-side. isSelectorPresent is a document.querySelector lookup — safe because next() only fires in response to client user interaction."
  - "Anchor via virtualRef rather than wrapping a <span> at the target's bounding rect — lighter-weight, no extra DOM, and Radix re-observes via rect package on rAF loop automatically."
  - "Fallback bottom-right fixed card when anchor missing, instead of always centering — preserves hierarchy, doesn't fight with existing modals/dialogs."
  - "Kept UI-component test scope to pure helpers only (12 Vitest specs). ProductTour / TourProvider are glue code over a tested reducer + tested pure helpers + a tested Server Action — RTL not installed and scope-locked per 41-CONTEXT.md test-strategy."
  - "discover-card attribute placed on the gold 'Download New List' Button (the dashboard's CTA to the search page) rather than wrapping the entire stat-cards row — the popover's 'Start here: Discover leads' copy anchors to an action, not a passive section."
  - "profile-summary attribute placed on the right-column Enrichment Status card (holds the per-source status dots + AI/Web/Filings/Market labels) — this IS the 'enrichment sources + AI summary block' named in plan Task 3."
  - "7th tour target (export button) lives in src/app/[orgId]/lists/components/list-grid.tsx (per-list Export button on the lists grid), not in list-member-table.tsx. Discovered via grep 'exportCsv|Download|Export' — plan instructed to list the discovered file under files_modified."
metrics:
  duration: ~12min
  tasks_completed: 3
  tests_added: 12
  completed_date: 2026-04-15
---

# Phase 41 Plan 02: Product Tour Engine + 6 Steps Summary

Hand-rolled 6-step coachmark tour, zero tour-library install, auto-skipping missing targets, gated on `onboarding_state.tour_completed` with all persistence routed through Plan 01's Server Action.

## What shipped

Three tasks, four commits, 12 new Vitest specs (21 total when combined with Plan 01's 9), tsc clean on every new file, single-attribute diffs on all 7 tour-target files.

### File tree

```
src/
├── components/
│   ├── ui/
│   │   └── popover.tsx                          (new — shadcn wrapper)
│   └── onboarding/
│       ├── tour-context.tsx                     (new — TourProvider + useTour)
│       ├── product-tour.tsx                     (new — Popover UI)
│       └── tour-trigger.tsx                     (new — server-layout entry)
├── lib/
│   └── onboarding/
│       ├── tour-steps.ts                        (new — TOUR_STEPS array)
│       ├── tour-navigation.ts                   (new — pure helpers)
│       └── __tests__/
│           └── tour-navigation.test.ts          (new — 12 Vitest specs)
└── app/
    └── [orgId]/
        ├── layout.tsx                           (modified — TourTrigger mount)
        ├── page.tsx                             (+1 attr — discover-card)
        ├── search/components/
        │   ├── nl-search-bar.tsx                (+1 attr — nl-search-bar)
        │   ├── advanced-filters-panel.tsx       (+1 attr — advanced-filters-toggle)
        │   └── bulk-actions-bar.tsx             (+1 attr — bulk-actions-bar)
        └── lists/components/
            ├── list-member-table.tsx            (+1 attr — list-member-table)
            └── list-grid.tsx                    (+1 attr — export-csv)
src/components/prospect/profile-view.tsx         (+1 attr — profile-summary)
```

## Public API

### `src/lib/onboarding/tour-steps.ts`

```ts
export type TourStepId =
  | "discover" | "search" | "enrich" | "list" | "profile" | "export";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  targetSelector: string;           // always `[data-tour-id="..."]`
  placement: "top" | "right" | "bottom" | "left";
  suggestedHref?: (orgId: string) => string;
}

export const TOUR_STEPS: readonly TourStep[]; // length 6, frozen order
```

### `src/lib/onboarding/tour-navigation.ts`

```ts
export function nextTourStep(current: TourStepId): TourStepId | null;
export function nextPresentTourStep(
  current: TourStepId,
  isSelectorPresent: (selector: string) => boolean,
): TourStepId | null;
export function previousTourStep(current: TourStepId): TourStepId | null;
export function findFirstPresentStep(
  steps: readonly TourStep[],
  isSelectorPresent: (selector: string) => boolean,
): TourStepId | null;
```

All four are pure, injectable (take a `(selector) => boolean` rather than touching the DOM), and unit-tested in node env.

### `src/components/ui/popover.tsx`

```ts
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

Canonical shadcn wrapper over `@radix-ui/react-popover`. `PopoverContent` styled with the existing dark-luxury tokens (`--bg-elevated`, `--border-subtle`, fade animations).

### `src/components/onboarding/tour-context.tsx`

```ts
export function TourProvider({ initiallyActive, children }): JSX.Element;
export function useTour(): {
  currentStep: TourStepId | null;
  isActive: boolean;
  next: () => void;      // calls nextPresentTourStep (auto-skip)
  previous: () => void;  // calls previousTourStep
  skip: () => void;      // writes tour_completed=true, tour_skipped_at=now
  complete: () => void;  // writes tour_completed=true, tour_completed_at=now
  restart: () => void;   // writes tour_completed=false, re-seeds currentStep
};
```

**Exposed restart function** — Plan 03's Help menu ("Replay product tour") will call `useTour().restart()` to re-fire the tour.

### `src/components/onboarding/product-tour.tsx`

```ts
export function ProductTour(): JSX.Element | null;
```

Resolves `anchorEl` via `document.querySelector(step.targetSelector)` in a `useEffect` gated on `step`. Renders `<Popover open><PopoverAnchor virtualRef={{ current: anchorEl }} />…</Popover>`. **Fallback:** when `anchorEl === null` (role-gated page, target not rendered), renders a fixed bottom-right card so the tour is never "hung over nothing".

### `src/components/onboarding/tour-trigger.tsx`

```ts
export function TourTrigger({
  initialOnboardingState: OnboardingState | null | undefined;
}): JSX.Element | null;
```

One-line guard: `if (initialOnboardingState?.tour_completed) return null;` — otherwise wraps `<ProductTour/>` in `<TourProvider initiallyActive/>`.

## The 7 `data-tour-id` attribute additions

| # | File | Line | Attribute | Element |
|---|------|------|-----------|---------|
| 1 | `src/app/[orgId]/page.tsx` | 237 | `data-tour-id="discover-card"` | Gold "Download New List" `<Button>` |
| 2 | `src/app/[orgId]/search/components/nl-search-bar.tsx` | 50 | `data-tour-id="nl-search-bar"` | Root `<div>` wrapping the NL textarea |
| 3 | `src/app/[orgId]/search/components/advanced-filters-panel.tsx` | 89 | `data-tour-id="advanced-filters-toggle"` | Filter-toggle `<button>` (also used by Plan 05 tooltip) |
| 4 | `src/app/[orgId]/search/components/bulk-actions-bar.tsx` | 41 | `data-tour-id="bulk-actions-bar"` | Root bar `<div>` |
| 5 | `src/app/[orgId]/lists/components/list-member-table.tsx` | 223 | `data-tour-id="list-member-table"` | Outer table wrapper `<div>` |
| 6 | `src/components/prospect/profile-view.tsx` | 750 | `data-tour-id="profile-summary"` | Right-column Enrichment Status card (holds per-source status dots + AI label) |
| 7 | `src/app/[orgId]/lists/components/list-grid.tsx` | 299 | `data-tour-id="export-csv"` | Per-list `<Button>` with `Download` icon in list-grid row |

`git diff --stat` confirms each tour-target file shows `+1 -0` or `+1 -1` (when attr lands on same line as an existing prop). No refactor, no style tweak, no import changes.

## Install details

```
pnpm add @radix-ui/react-popover@^1.1.15
```

Chosen to align with the installed Radix family:
- `@radix-ui/react-dialog@^1.1.15` ← matches
- `@radix-ui/react-tooltip@^1.2.8`
- `@radix-ui/react-dropdown-menu@^2.1.16`

Transitive deps added (all peer-compatible):
- `@radix-ui/react-popper` (1.2.8) — provides `PopperAnchor` with `virtualRef?: React.RefObject<Measurable>`
- `@radix-ui/rect` (1.1.1) — `Measurable = { getBoundingClientRect(): DOMRect }`

HTMLElement satisfies `Measurable` natively, so `virtualRef={{ current: anchorEl }}` typechecks and works at runtime without custom shims.

## Layout integration

`src/app/[orgId]/layout.tsx` now:

```tsx
import { TourTrigger } from "@/components/onboarding/tour-trigger";
import type { OnboardingState } from "@/types/onboarding";

// ... inside try block, after user+tenant resolved:
initialOnboardingState =
  (user.app_metadata?.onboarding_state as OnboardingState | undefined) ?? null;

// ... in JSX, after <MobileBottomNav/>, inside the z-10 content layer:
<TourTrigger initialOnboardingState={initialOnboardingState} />
```

Mount line range: **line 126** (`<TourTrigger …/>`), with supporting changes at lines 6 (import), 10 (type import), 22 (let declaration), 76 (state extraction). Placed AFTER `<Sidebar/>`, `<TopBar/>`, `<MobileBottomNav/>` render so data-tour-id nodes on child pages are mounted in the DOM before the tour's `findFirstPresentStep` runs on the first `requestAnimationFrame` tick.

## Fallback behavior when target is missing

If `document.querySelector(step.targetSelector) === null` at the time `ProductTour` resolves `anchorEl`:

1. **Initial mount:** `TourProvider`'s `findFirstPresentStep` skips past absent targets and seeds `currentStep` to the first step whose target IS present on this page. If none, `currentStep === null` and `ProductTour` renders nothing.
2. **Mid-tour Next():** `nextPresentTourStep` jumps to the next present target, bypassing any absent ones in between. If the terminus is reached with no present targets, returns `null` and the popover unmounts.
3. **Mid-tour, step exists but target node is gone** (transient race, e.g. route change flushes the DOM): `ProductTour` renders a fixed bottom-right card with the same title/body/Skip/Next CTAs. User can still advance or skip. No "Popover floating over 0,0" phantoms.

## Test coverage

12 new Vitest specs in `src/lib/onboarding/__tests__/tour-navigation.test.ts`, all green, ~2ms run time, node env, zero DOM / zero RTL (RTL not installed — test strategy locked per 41-CONTEXT.md).

| Suite | Specs |
|-------|-------|
| `nextTourStep` | advances through sequence; returns null at terminus |
| `previousTourStep` | walks back; returns null at start |
| `nextPresentTourStep` | immediate next when present; skips absent lands on next; null when none remain; null at terminus regardless |
| `findFirstPresentStep` | first present wins; null when none; discover when all |
| `TOUR_STEPS` | has 6 steps in canonical order |

Combined with Plan 01's 9 specs for `mergeOnboardingState`, the `src/lib/onboarding/` test dir now runs 21/21 green.

## Verification — all green

- `rg 'data-tour-id=' src/ --glob '!**/tour-steps.ts' --glob '!**/__tests__/**' | wc -l` → **7** (one attribute per target file)
- `rg '<TourTrigger' src/app/\[orgId\]/layout.tsx` → **1** match (line 126)
- `rg 'updateOnboardingState' src/components/onboarding/ | wc -l` → **4** (import + skip + complete + restart)
- `npx vitest run src/lib/onboarding/` → **21 passed** (0 failed)
- `npx tsc --noEmit` → clean on all 7 new files + 8 modified files (pre-existing `execute-research.test.ts` errors are tracked in deferred-items.md from Plan 01)
- `git diff --stat` on the 7 tour-target files → 7 files, 7 insertions, 2 deletions (2 files had attr land on same line as existing prop)

## TDD gate compliance

Gate sequence honored for Task 1:
1. **RED** — `test(41-02): add failing tests for tour-navigation helpers` → commit `426877c`. Vitest fails with `Cannot find module '../tour-navigation'`.
2. **GREEN** — `feat(41-02): add Popover primitive + tour-steps + pure nav helpers` → commit `86749f0`. All 12 tests pass.
3. **REFACTOR** — skipped; code shape is minimal and intentional, no smell worth separating.

Tasks 2 & 3 have `tdd="true"` in the plan frontmatter but their `<behavior>` is UI glue / attribute additions — per the test-strategy lock ("pure-helper extraction only"), correctness for these is enforced by `tsc --noEmit` + grep-verifiable attribute counts + a manual UAT scheduled in Plan 06.

## Deviations from plan

None. Plan executed exactly as written (including the 2026-04-15 amendment adding `nextPresentTourStep` and its 4 test cases). The 7th tour-target file (`list-grid.tsx`) was discovered via the prescribed grep and listed in `files_modified` as the plan instructed.

## Known stubs

None. All 7 `data-tour-id` attributes are wired to real, rendered DOM nodes on their respective pages. The tour itself will render real popovers over real elements — no placeholder text, no empty arrays flowing to UI.

## Threat flags

None. This plan adds:
- Zero network endpoints
- Zero auth paths (reads existing `user.app_metadata` that Plan 01 already writes)
- Zero file/schema changes
- Zero new trust boundaries

The only new runtime write is via Plan 01's already-threat-modeled `updateOnboardingState` Server Action.

## Deferred issues

None introduced by this plan. The pre-existing `execute-research.test.ts` tsc errors remain in `deferred-items.md` from Plan 01 — still out of scope.

## How Plan 03 consumes

Plan 03's Help menu dropdown's "Replay product tour" item will call `useTour().restart()` from a component rendered inside the same `<TourProvider>` subtree. Because `TourTrigger` mounts the provider in the tenant layout (always), the Help menu can sit anywhere inside `[orgId]/*` and use `useTour()`.

If the user has `tour_completed === true`, `TourTrigger` currently returns `null` and there's no provider — Plan 03 will need to either:
1. Mount `TourProvider` unconditionally (just gate `ProductTour`'s render), OR
2. Route "Replay" through a direct `updateOnboardingState({ tour_completed: false })` call + full page reload.

Option 1 is cleaner and is recommended; Plan 03 has discretion.

## Commits

| # | Hash       | Message                                                                             |
|---|------------|-------------------------------------------------------------------------------------|
| 1 | `426877c`  | test(41-02): add failing tests for tour-navigation helpers                          |
| 2 | `86749f0`  | feat(41-02): add Popover primitive + tour-steps + pure nav helpers                  |
| 3 | `a6b22d8`  | feat(41-02): add TourProvider + ProductTour + TourTrigger glue                      |
| 4 | `1d8cc3d`  | feat(41-02): mount TourTrigger in tenant layout + add 7 data-tour-id targets        |

## Self-Check

- [x] FOUND: `src/components/ui/popover.tsx`
- [x] FOUND: `src/lib/onboarding/tour-steps.ts`
- [x] FOUND: `src/lib/onboarding/tour-navigation.ts`
- [x] FOUND: `src/lib/onboarding/__tests__/tour-navigation.test.ts`
- [x] FOUND: `src/components/onboarding/tour-context.tsx`
- [x] FOUND: `src/components/onboarding/product-tour.tsx`
- [x] FOUND: `src/components/onboarding/tour-trigger.tsx`
- [x] FOUND: `src/app/[orgId]/layout.tsx` TourTrigger mount (line 126)
- [x] FOUND: 7 data-tour-id attribute additions (verified via rg, one per target file)
- [x] FOUND commit `426877c`
- [x] FOUND commit `86749f0`
- [x] FOUND commit `a6b22d8`
- [x] FOUND commit `1d8cc3d`

## Self-Check: PASSED
