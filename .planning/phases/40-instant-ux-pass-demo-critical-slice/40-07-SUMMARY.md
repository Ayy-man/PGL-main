---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 07
subsystem: list-view + search + research-panel
tags: [skeleton, loading-states, tdd, pure-helpers, phase-14-polish-convention]
requires:
  - src/components/ui/skeleton.tsx (Skeleton primitive — unchanged)
  - Phase 14-polish shape conventions (rounded-[14px] card, rounded-lg row)
  - Existing per-prospect Realtime channel at list-member-table.tsx:186
provides:
  - src/components/ui/lib/skeleton-shapes.ts (ROW_SKELETON_SHAPE, CARD_SKELETON_SHAPE, addEnrichingIds, removeEnrichingIds, reconcileEnrichedPayload)
  - src/components/ui/__tests__/skeleton-row.test.tsx (16 pure-helper tests)
affects:
  - src/app/[orgId]/lists/components/list-member-table.tsx (enrichingId single-slot -> enrichingIds Set; rows in the Set render skeleton cells)
  - src/app/[orgId]/search/components/search-content.tsx (5 skeleton rows appended at bottom during isLoadingMore; ExtendSkeletonRow + ExtendSkeletonCard helpers)
  - src/components/prospect/research-panel.tsx (load-bearing comment above handleSend verifying Phase 27 shimmer survived — no code change)
tech-stack:
  added: []
  patterns:
    - pure-helper extraction for set operations + shape constants (per Phase 40 CONTEXT "Test strategy (LOCKED)" — pure-helper fallback only, no RTL)
    - immutable Set reducers (return new Set, never mutate prev) to stay safe inside React setState updaters
    - template-literal className composition (`${ROW_SKELETON_SHAPE}`) so the shape convention is enforced at a single source
    - appended sibling skeleton table matched to ProspectResultsTable's 6-column layout (simpler than threading a prop through the table component)
key-files:
  created:
    - src/components/ui/lib/skeleton-shapes.ts
    - src/components/ui/__tests__/skeleton-row.test.tsx
  modified:
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/app/[orgId]/search/components/search-content.tsx
    - src/components/prospect/research-panel.tsx
    - .planning/phases/40-instant-ux-pass-demo-critical-slice/deferred-items.md
decisions:
  - Replaced list-member-table's `enrichingId: string | null` single-slot tracker with `enrichingIds: Set<string>`. Two reasons — (1) concurrent re-enriches no longer stomp each other's spinners, (2) matches the plan's specified API so the same helper can be reused if a future bulk-enrich trigger lands on this page.
  - Shape constants live in `src/components/ui/lib/skeleton-shapes.ts` rather than being inlined in each consumer. This makes the Phase 14-polish convention enforced at a single source and testable without RTL — the test asserts the constants' values directly.
  - `reconcileEnrichedPayload` recognizes three terminal statuses: `enriched` (from the Plan 02 saved_search_prospects channel contract that CONTEXT documents), `complete` and `failed` (from the existing per-prospect re-enrich channel). Belt-and-suspenders so whichever realtime path lands first clears the skeleton.
  - Extend-search skeletons render as an appended sibling `<table>` below ProspectResultsTable rather than threading an `appendSkeletonRows` prop through the component. Simpler diff, keeps the table component pure, matches the plan's "append at the bottom" wording.
  - Research panel got a load-bearing comment (not a test) per plan instruction "verify, don't rebuild unless regressed". Phase 27 shimmer is intact at research-panel.tsx:812-822 (shimmer-rows block) and 828-835 (status line).
  - Plan's example test used `@testing-library/react` but CONTEXT locks no-RTL; rewrote as pure-helper tests on the extracted module. 16 tests cover both shape constants and the three Set reducers.
metrics:
  duration: ~25 minutes
  completed: 2026-04-15
  tasks_completed: 2
  tests_added: 16
  commits: 3 (1 RED, 2 GREEN)
---

# Phase 40 Plan 07: Skeleton States — Bulk-Enrich, Extend-Search, Research Verify Summary

Three slow-path loading states now use skeleton placeholders instead of spinner-only feedback, telegraphing "something is arriving at this exact location" rather than just "busy."

## What Shipped

### 1. Bulk-enrich / re-enrich skeleton (`list-member-table.tsx`)

The list-detail page's re-enrich flow now replaces a row's content with skeleton cells while enrichment is in flight, instead of only dimming the refresh button. State is tracked via `enrichingIds: Set<string>` (previously `enrichingId: string | null`, which made concurrent re-enriches invisible past the first one).

- Desktop: 6-cell skeleton row with `rounded-lg` shapes (avatar, name, company, contact, status, added-on), matching the normal table layout so the eye stays put during the transition.
- Mobile: `rounded-[14px]` card wrapper with `rounded-lg` content skeletons, matching Phase 14-polish card-shape convention.
- Clears via the existing Realtime channel on terminal status (`complete` / `failed` / `enriched`), OR on fetch-settle if the request itself fails.

### 2. Extend-search skeleton (`search-content.tsx`)

When a user clicks "Load next 500 from Apollo" (saved-search mode), 5 skeleton rows now appear at the bottom of the results grid immediately — before Apollo's 2-10s response lands. The skeleton matches `ProspectResultsTable`'s 6-column layout (checkbox, prospect, wealth tier, title/company, added, enrichment) so the eye doesn't re-anchor when real rows arrive.

- Desktop: appended `<table>` sibling with 5 `<ExtendSkeletonRow>` using `rounded-lg`.
- Mobile: 5 stacked `<ExtendSkeletonCard>` using `rounded-[14px]`.
- Gated on `isSavedSearchMode && isLoadingMore` — only fires from the saved-search flow that has the extend button.

### 3. Research panel shimmer verification (`research-panel.tsx`)

Confirmed Phase 27 shimmer is intact on the streaming fetch path:
- `streamPhase === "shimmer"` triggers the "Analyzing results" status line (line ~828).
- `streamingCards.length === 0 && streamPhase !== "reasoning"` renders 4 shimmer rows inline (line ~812).

Added a load-bearing comment above `handleSend()` documenting the two surfaces that must survive future refactors. No code change — only a regression-guard comment.

### 4. Pure-helper test module (`skeleton-shapes.ts` + test)

Per 40-CONTEXT locked test strategy (no RTL, no DOM), the state-transition and shape-class logic is extracted into a pure module with 16 Vitest tests covering:
- `ROW_SKELETON_SHAPE === "rounded-lg"` (Phase 14-polish lock)
- `CARD_SKELETON_SHAPE === "rounded-[14px]"` (Phase 14-polish lock)
- `addEnrichingIds` / `removeEnrichingIds` immutability + edge cases (empty list, missing ids, clearing all)
- `reconcileEnrichedPayload` terminal-status gating (`enriched` / `complete` / `failed` clear; `pending` / missing-status do not)

## Surfaces Map

| Strategy | Surface | File | Status |
|---|---|---|---|
| Skeleton rows | Re-enriching list members | list-member-table.tsx | ✅ shipped |
| Skeleton rows | Apollo "Load next 500" | search-content.tsx | ✅ shipped |
| Verify (no-op) | Research panel streaming fetch | research-panel.tsx | ✅ verified |

## Deviations from Plan

### Rule 3 — blocking scope clarification (no STOP, handled inline)

**Issue:** The plan's Task 1 `<action>` references a POST to `/api/apollo/bulk-enrich` with a `prospectIds` body and frames the trigger as "Enrich Selection" — but that endpoint actually accepts `apolloIds` (not `prospectIds`) and lives on the SEARCH page (`search-content.tsx` line 604), not `list-member-table.tsx`. The post-bulk-enrich flow navigates the user to the list page where the re-enrich endpoint (`/api/prospects/:id/enrich`) is the only enrichment trigger wired in `list-member-table.tsx`.

**Resolution:** Honored the plan's stated intent (skeleton rows on list members that are currently enriching) by wiring the `enrichingIds: Set<string>` pattern into the existing per-prospect `handleReEnrich` flow. The conversion from singular `enrichingId: string | null` to the Set satisfies all four of Task 1's `<done>` criteria without inventing a new fetch. If a future plan adds a true bulk-enrich trigger on this page, the Set state and the helper module are ready to absorb it.

**Tracking:** Documented in this Summary rather than `deferred-items.md` because no work is deferred — the skeleton affordance is live on the actual trigger that exists.

### Rule 3 — pure-helper test style (locked by CONTEXT)

**Issue:** Plan's Task 1 `<action>` snippet uses `@testing-library/react`'s `render()` and `toHaveClass` matchers.

**Resolution:** `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-CONTEXT.md` Test strategy (LOCKED) forbids RTL ("No component tests, no `render()`, no `fireEvent`, no jsdom"). Rewrote as pure-helper tests on the extracted `skeleton-shapes.ts` module. Same coverage goal (shape-class correctness + state transitions) but via Vitest in node environment.

## Auth Gates

None. No authentication flows touched.

## Deferred Issues

Three pre-existing failures logged in `deferred-items.md`, all confirmed out-of-scope (present at base commit `4d02a76` without my changes):

1. `src/lib/search/__tests__/execute-research.test.ts` — 6 TypeScript errors from Plan 40-06 (pre-existing).
2. `src/inngest/functions/__tests__/enrich-prospect.test.ts` — 22/22 test failures from Plan 40-06 (pre-existing).
3. `next build` static-export prerender errors on 14 pages (`/login`, `/admin/*`, `/onboarding/*`, etc.) with `TypeError: Cannot read properties of undefined (reading 'trim')` — confirmed pre-existing by stashing the Task 2 working tree and running `next build` on base commit. Next.js `Compiled successfully` and `Linting and checking validity of types` both pass, so the static-export failure is isolated to pages that need runtime env vars.

## Commits

- `4f524b7` test(40-07): add failing test for skeleton-shapes + enrichingIds helpers (RED)
- `56e443f` feat(40-07): Task 1 - skeleton rows for re-enriching list members (GREEN)
- `5c52903` feat(40-07): Task 2 - extend-search skeleton rows + research shimmer verify

## Verification

- `grep -n "rounded-lg"` in list-member-table.tsx: 1 hit in the comment + 16 runtime hits via `${ROW_SKELETON_SHAPE}` template literals = class emitted correctly.
- `grep -n "rounded-\[14px\]"` in src/: multiple hits including the new `CARD_SKELETON_SHAPE` constant + both mobile card wrappers.
- `next build` compile step: ✅ `Compiled successfully`, type-check passes.
- `vitest run src/components/ui/__tests__/skeleton-row.test.tsx`: 16/16 passing.
- Full vitest suite: 158/180 passing, 22 failures all pre-existing (`enrich-prospect.test.ts`, logged in deferred-items.md).

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/components/ui/lib/skeleton-shapes.ts
- FOUND: src/components/ui/__tests__/skeleton-row.test.tsx

Commits verified present on branch:
- FOUND: 4f524b7 (RED)
- FOUND: 56e443f (Task 1 GREEN)
- FOUND: 5c52903 (Task 2)
