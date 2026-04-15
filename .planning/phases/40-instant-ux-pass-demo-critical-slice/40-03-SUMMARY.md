---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 03
subsystem: realtime
tags: [realtime, prospects, supabase, list-detail, tdd]
requires:
  - supabase-realtime-postgres-changes
  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
provides:
  - reduceProspectsEnrichedPayload (pure reducer)
  - shouldApplyProspectUpdate (pure gate)
  - ListProspectsRealtime (client subscriber, headless)
affects:
  - src/app/[orgId]/lists/[listId]/page.tsx
tech-stack:
  added: []
  patterns:
    - tenant-wide Realtime filter + client-side visibleIds reconciliation
    - useRef pass-through to keep per-render callbacks stable without resubscribing
    - router.refresh() fallback when no explicit onPayload consumer is wired
key-files:
  created:
    - src/lib/realtime/prospects-enriched-handler.ts
    - src/lib/realtime/__tests__/prospects-enriched-handler.test.ts
    - src/app/[orgId]/lists/components/list-prospects-realtime.tsx
  modified:
    - src/app/[orgId]/lists/[listId]/page.tsx
decisions:
  - Use `tenant_id=eq.${tenantId}` Realtime filter (NOT `id=in.(...)`) — filter-string cap ~100 chars makes the in-list form break past ~3 UUIDs.
  - Reconcile client-side via `shouldApplyProspectUpdate(payload, visibleIds)` — only payloads for currently-rendered rows trigger a state update.
  - Keep reducer PURE (no React imports) so it is Vitest-testable without jsdom/RTL per CONTEXT-locked test strategy.
  - Leave `list-member-table.tsx` UNTOUCHED — owned by Plan 40-02 in the same wave (parallel-worktree conflict). Render `<ListProspectsRealtime>` as a sibling in page.tsx instead.
  - Fall back to `router.refresh()` when no `onPayload` is passed, since the list-detail page is a server component and callbacks cannot cross the RSC boundary. Later plans can pass a concrete `setMembers` reducer once the table lifts state.
metrics:
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  tests_added: 11
  tests_passing: 11
  duration_minutes: 33
  completed_at: "2026-04-15T13:21:53Z"
  base_commit: c4f9204
---

# Phase 40 Plan 03: Supabase Realtime — `prospects.enriched_at` Summary

Added a headless `ListProspectsRealtime` client component and a pure reconciliation helper (`reduceProspectsEnrichedPayload` + `shouldApplyProspectUpdate`) so enrichment writes on `public.prospects` (`enriched_at` null → timestamp, `photo_url`, `title`, `enrichment_status`, `full_name`) propagate to the list-detail page live, without a browser refresh and without exceeding Supabase's ~100-char Realtime filter-string cap.

## Tasks

### Task 1: Pure reconciliation helper + tests (`tdd="true"`)

- **RED commit** `786499c` — 11 failing Vitest cases authored against non-existent module.
- **GREEN commit** `d9881a1` — handler implemented; 11/11 pass in ~3ms.
- Key coverage:
  - `shouldApplyProspectUpdate` — empty payload, missing `id`, off-screen id, visible id.
  - `reduceProspectsEnrichedPayload` — reference equality on no-op (off-screen, no field change, no member match); patching on single-field and multi-field updates (`enriched_at`, `photo_url`+`title`, `enrichment_status`+`full_name`); preservation of unrelated member keys (e.g. `notes`, `status`).
- No React/DOM imports — only a type-only import from `@supabase/supabase-js`. Vitest `environment: 'node'` passes without jsdom.

### Task 2: Wire channel into list-detail page via subscriber component (`tdd="true"`)

- **Commit** `22dfda0` — three files changed in one atomic unit.
- `src/app/[orgId]/lists/components/list-prospects-realtime.tsx`:
  - `"use client"`, returns `null` (headless).
  - Subscribes to `prospects` UPDATE with `filter: \`tenant_id=eq.${tenantId}\``.
  - `visibleIds` and `onPayload` are both held in refs so scroll-driven membership changes don't trigger channel tear-down/resubscribe — only `tenantId` does.
  - On payload: `shouldApplyProspectUpdate` gates the callback; when no `onPayload` is provided, calls `router.refresh()`.
  - Cleanup: `supabase.removeChannel(channel)` on effect return (Plan 40-08 will grep-audit).
- `src/app/[orgId]/lists/[listId]/page.tsx`:
  - New import and `<ListProspectsRealtime tenantId={tenantId} visibleIds={members.map(m => m.prospect_id)} />` rendered as sibling of `<ListMemberTable>` when `members.length > 0`.
  - Wrapped the non-empty branch in a fragment and added a scope comment explaining the router.refresh() fallback.

## Verification

```bash
$ pnpm exec vitest run src/lib/realtime/__tests__/prospects-enriched-handler.test.ts
Test Files  1 passed (1)
     Tests  11 passed (11)

$ grep -rn "filter: \`id=in" src/
(no results — 0 hits)

$ grep -n "tenant_id=eq" src/app/[orgId]/lists/components/list-prospects-realtime.tsx
29: * Filter is `tenant_id=eq.${tenantId}` — NOT `id=in.(...)`. Supabase caps
62:          filter: `tenant_id=eq.${tenantId}`,

$ grep -n "removeChannel" src/app/[orgId]/lists/components/list-prospects-realtime.tsx
33: * Cleanup: `supabase.removeChannel(channel)` runs on unmount. Plan 40-08
80:      supabase.removeChannel(channel);

$ pnpm exec tsc --noEmit  # scope-filtered
(no errors in any Plan 40-03 file)
```

All plan-level `<verification>` checks pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Invalid TypeScript in initial test fixture**
- **Found during:** Task 2 post-write TS check.
- **Issue:** `makePayload()` used `@ts-expect-error` that did not match a real TS error (TS2578) and assigned `errors: null` to a field typed `string[]` (TS2322).
- **Fix:** Rewrote the fixture with a single `as unknown as RealtimePostgresChangesPayload<ProspectsRow>` cast and changed `errors: null` to `errors: []`. No behavioral change — the reducer only reads `new` and `old`.
- **Files modified:** `src/lib/realtime/__tests__/prospects-enriched-handler.test.ts`
- **Commit:** folded into `22dfda0` (Task 2) to keep a single type-clean unit after wiring.

**2. [Rule 2 — Critical functionality] `onPayload` fallback to `router.refresh()`**
- **Found during:** Task 2 planning — the plan's prose assumes the page owns `members` state and passes a `setMembers` reducer as `onPayload`. In this codebase `src/app/[orgId]/lists/[listId]/page.tsx` is a **server component**, and callbacks cannot cross the RSC boundary into a client component.
- **Issue:** If `ListProspectsRealtime` required `onPayload` and no consumer existed at the page level (because `list-member-table.tsx` is owned by Plan 40-02 and must not be edited here), the subscriber would receive payloads but produce no user-visible effect.
- **Fix:** Made `onPayload` optional. When absent, the subscriber calls `router.refresh()` on any payload that passes `shouldApplyProspectUpdate`. This re-fetches the server-rendered page and updates the enrichment dot + timestamps without a manual reload — which is exactly the user-visible outcome the plan targets. Plan 40-02 (or a later state-lifting plan) can pass a concrete `setMembers` reducer to suppress the refresh and keep the update entirely client-side.
- **Files modified:** `src/app/[orgId]/lists/components/list-prospects-realtime.tsx`, `src/app/[orgId]/lists/[listId]/page.tsx`
- **Commit:** `22dfda0`

### Intentional skip (CONTEXT LOCK wins over plan prose)

**3. No RTL/DOM component test for `ListProspectsRealtime`**
- **Plan Task 2 prose** says: *"Component test … render the component, invoke the stored `.on` callback with a synthetic payload."*
- **40-CONTEXT.md LOCKED test strategy** says: *"No component tests, no `render()`, no `fireEvent`, no `jsdom` DOM testing. Vitest node environment only … If a surface genuinely cannot be made pure-testable … ship a shallow integration test that just mocks `createClient()` and asserts `channel.unsubscribe()`/`removeChannel` was called — but do not reach into the DOM."*
- **Resolution:** CONTEXT LOCK wins per the prompt reinforcement (*"LOCKED test strategy (NO RTL, pure-helper only)"*). The subscriber's two non-trivial behaviors — visibleIds gating and removeChannel cleanup — are covered by:
  - Pure helper tests in `prospects-enriched-handler.test.ts` (4 cases on `shouldApplyProspectUpdate`).
  - Grep-audit coverage: `grep -n "removeChannel" src/app/[orgId]/lists/components/list-prospects-realtime.tsx` returns 2 hits (comment + call-site); Plan 40-08 does this grep automatically across all channel usages.
- No RTL dep was added to `package.json`.

### Scope guard enforced

**4. `list-member-table.tsx` left untouched despite plan prose mentioning it**
- Prompt constraint: *"`src/app/[orgId]/lists/components/list-member-table.tsx` is owned by Plan 40-02 in the same wave. Your worktree MUST NOT modify it."*
- `git diff c4f9204..HEAD --name-only | grep list-member-table` returns 0 hits. Confirmed.

## Auth Gates

None. No authenticated API calls were made during execution.

## Known Stubs

None. The pure handler is fully implemented and the subscriber has a working `router.refresh()` fallback path (see Deviation #2), so there is no stub UI state.

## Deferred / Out-of-Scope Observations

Recorded here, NOT fixed (scope boundary):

1. **Pre-existing build failure.** `pnpm build` fails with `TypeError: Cannot read properties of undefined (reading 'trim')` during static prerender of `/login`, `/onboarding/confirm-tenant`, etc. Root cause: `src/lib/supabase/client.ts` calls `process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()` at module scope; the worktree has no local `.env.local`, so static export of auth pages crashes. Reproduced on clean `c4f9204` (my stash-pop test). Out of scope for this plan — would be a build-env or client-factory hardening fix across many files.
2. **Pre-existing TS errors in `src/lib/search/__tests__/execute-research.test.ts`** (TS2532, TS2493, TS2352). Unrelated to realtime/prospects. Owner: whatever plan wrote those tests.

## TDD Gate Compliance

This plan has two `tdd="true"` tasks. Gate sequence in git log:

| Gate     | Commit   | Message                                                            |
| -------- | -------- | ------------------------------------------------------------------ |
| RED      | 786499c  | `test(40-03): add failing tests for prospects-enriched realtime handler` |
| GREEN    | d9881a1  | `feat(40-03): implement prospects-enriched realtime handler`       |
| GREEN 2  | 22dfda0  | `feat(40-03): wire ListProspectsRealtime into list-detail page`    |

RED → GREEN ordering honored. No REFACTOR commit — the handler shipped clean on first pass.

## Self-Check: PASSED

Verified at 2026-04-15T13:21:53Z:

```
FOUND: src/lib/realtime/prospects-enriched-handler.ts
FOUND: src/lib/realtime/__tests__/prospects-enriched-handler.test.ts
FOUND: src/app/[orgId]/lists/components/list-prospects-realtime.tsx
FOUND: src/app/[orgId]/lists/[listId]/page.tsx (modified — `ListProspectsRealtime` rendered)
FOUND: commit 786499c (RED)
FOUND: commit d9881a1 (GREEN)
FOUND: commit 22dfda0 (wiring)
ABSENT: any modification to src/app/[orgId]/lists/components/list-member-table.tsx (correct — scope locked)
ABSENT: any `filter: \`id=in` in src/ (correct — scope locked)
```
