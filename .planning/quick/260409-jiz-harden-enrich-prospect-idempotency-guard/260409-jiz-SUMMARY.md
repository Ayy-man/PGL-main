---
phase: quick/260409-jiz-harden-enrich-prospect-idempotency-guard
plan: 01
subsystem: enrichment/inngest
tags: [inngest, idempotency, supabase, batching, enrich-prospect]
requirements:
  - QUICK-260409-jiz-01
  - QUICK-260409-jiz-02
dependency_graph:
  requires:
    - inngest@3.52.6 (idempotency top-level option on createFunction config)
    - supabase-js (array-argument .insert signature)
  provides:
    - Concurrent-trigger credit-safe enrichProspect Inngest function
    - Single-round-trip batched prospect_signals writes (Exa, SEC EFTS, SEC CIK)
  affects:
    - prospect/enrich.requested event pipeline
    - prospect_signals table write pattern
tech_stack:
  added: []
  patterns:
    - "Inngest idempotency CEL expression over event payload"
    - "Supabase batched .insert(rowsArray) with destructured { error } and source-scoped error prefix"
key_files:
  created: []
  modified:
    - src/inngest/functions/enrich-prospect.ts
decisions:
  - "Used Inngest's top-level `idempotency` option instead of a row-level claim table — cheapest surface change, handled entirely inside the SDK, zero schema impact."
  - "Kept three independent batched inserts (Exa, SEC EFTS, SEC CIK) rather than consolidating into a helper — minimizes diff and preserves per-branch error isolation."
  - "Preserved the existing `err.message.includes('duplicate')` filter verbatim to keep idempotent-re-enrichment semantics identical."
metrics:
  duration: "~8 min"
  tasks_completed: 2
  files_touched: 1
  completed: "2026-04-09"
---

# Quick Task 260409-jiz: Harden enrich-prospect Idempotency Guard — Summary

**One-liner:** Added Inngest `idempotency: "event.data.prospectId"` to block concurrent duplicate triggers from double-charging ContactOut/Exa/SEC credits, and batched the three per-row `prospect_signals` insert loops into single round-trip calls with unchanged row shapes and duplicate-error tolerance.

## What Changed

Single file modified: `src/inngest/functions/enrich-prospect.ts` (35 insertions, 29 deletions across two commits).

### Task 1: Idempotency key (commit `3be262e`)

Added `idempotency: "event.data.prospectId"` to the `inngest.createFunction` first-argument object, positioned between `concurrency` and `onFailure` with a multi-line comment explaining why it complements the existing step-0 dedup guard (which only fires AFTER a prior run has written `status: 'enriched'`).

**Effect:** A second `prospect/enrich.requested` event for the same `prospectId` arriving while the first run is still in-flight is now suppressed by Inngest itself — before any step runs — so no duplicate ContactOut / Exa / SEC credits are spent.

**Did NOT touch:** the existing step-0 `check-duplicate-enrichment` block at lines 108-150 remains byte-for-byte identical; it still handles the post-retention "same person added to a new saved search" case.

### Task 2: Batched `prospect_signals` inserts (commit `924f5c3`)

Three surgical edits, one per source branch. All three use the destructured `{ error }` pattern so a failure is logged once and swallowed — no throw escapes the enclosing `step.run`, matching the prior per-row behavior exactly.

**Edit A — Exa branch** (lines 322-334):
- Replaced `for (const row of signalRows) { await supabase...insert(row).then(...) }` with a single `.insert(signalRows)` call.
- Error log prefix: `[enrich] exa signal batch insert error:`
- `signalRows` row construction (lines 316-326) untouched.

**Edit B — SEC EFTS-only branch** (lines 431-448):
- Introduced a new `eftsSignalRows = eftsResult.transactions.map(...)` constant whose row objects are identical field-for-field to the prior inline object literal in the per-row loop.
- Single `.insert(eftsSignalRows)` call inside the existing `if (eftsResult.found && eftsResult.transactions.length > 0)` guard.
- Error log prefix: `[enrich] SEC EFTS signal batch insert error:`

**Edit C — SEC EDGAR CIK branch** (lines 524-532):
- Replaced the inner `for (const row of secSignalRows)` loop with a single `.insert(secSignalRows)` call, keeping the outer `if (secSignalRows.length > 0)` guard intact.
- Error log prefix: `[enrich] SEC signal batch insert error:`
- `secSignalRows` row construction (lines 513-523) untouched.

**Not changed anywhere:**
- `updateSourceStatus` calls for `"exa"` and `"sec"` — count, order, payload unchanged.
- `logProspectActivity` calls — unchanged.
- The row objects / field shapes written to `prospect_signals`.
- The outer `try { ... } catch (error) { ... }` blocks that mark a source as failed.
- The existing duplicate-error tolerance (`err.message.includes("duplicate")`).

## Verification Results

### SDK Compatibility
- `package.json` declares `"inngest": "^3.52.6"`.
- `node_modules/inngest/types.d.ts` confirms `idempotency` on the function config at:
  - Line 1206: `idempotency: z.ZodOptional<z.ZodString>;`
  - Line 1358: `idempotency?: string | undefined;`
  - Line 1418: `idempotency?: string | undefined;`
- Preferred top-level approach was used — no fallback row-level claim needed.

### Static Checks (scoped to the target file)
- **ESLint** (`./node_modules/.bin/eslint --no-eslintrc --config .eslintrc.json src/inngest/functions/enrich-prospect.ts`): **PASS** (exit 0, no errors/warnings on the modified file).
- **TypeScript** (`pnpm exec tsc --noEmit | grep enrich-prospect.ts`): **PASS** (0 errors on the target file).
- Pre-existing unrelated tsc errors were observed in `src/lib/search/__tests__/execute-research.test.ts` — these exist on `main` before these commits and are explicitly out of scope per the task constraints.

### Plan Verification Gates

| Gate | Expected | Actual |
|------|----------|--------|
| `grep -cE 'idempotency:\s*"event\.data\.prospectId"'` | 1 | 1 |
| `.from("prospect_signals").insert(...)` call sites (multiline grep) | 3 | 3 (lines 330, 444, 527) |
| `grep -cE 'for \([^)]*\).*prospect_signals'` — residual per-row loops | 0 | 0 |
| Error log prefixes present once each | 3 | 3 (`[enrich] exa signal batch insert error:`, `[enrich] SEC EFTS signal batch insert error:`, `[enrich] SEC signal batch insert error:`) |
| `git diff --stat HEAD~2 HEAD` — files touched | 1 | 1 (`src/inngest/functions/enrich-prospect.ts`) |
| `git status --porcelain` after commits | clean | clean |

### Note on `pnpm lint`
Running `pnpm lint` (which invokes `next lint`) at the worktree root surfaces a Next.js plugin conflict caused by multiple sibling worktrees each carrying their own `.eslintrc.json` that ESLint attempts to merge up the tree:

```
Plugin "@next/next" was conflicted between ".eslintrc.json » eslint-config-next/core-web-vitals » plugin:@next/next/core-web-vitals" and "../../../.eslintrc.json » eslint-config-next/core-web-vitals » plugin:@next/next/core-web-vitals".
```

This is a pre-existing worktree environment issue **not caused by these commits** — it affects any `next lint` run in this worktree regardless of content. To confirm the target file is clean, I ran ESLint directly with `--no-eslintrc --config .eslintrc.json` against the single modified file: **exit 0, no warnings**.

## Behavioral Guarantees (from the `must_haves.truths` block)

- [x] A second Inngest trigger for the same `prospectId` within the idempotency retention window is suppressed by Inngest before any ContactOut/Exa/SEC credits are spent.
- [x] Exa digested signals for a single enrichment run are written to `prospect_signals` in ONE Supabase insert call.
- [x] SEC EFTS-only branch writes its signals in ONE Supabase insert call per run.
- [x] SEC EDGAR CIK branch writes its transaction signals in ONE Supabase insert call per run.
- [x] A failure in any of the three batch inserts logs a single error and does NOT throw out of its parent `step.run` — enrichment proceeds.
- [x] The existing `updateSourceStatus` payloads for exa/sec are unchanged (same keys, same values, same order of calls).

## Deviations from Plan

**None.** The plan was executed exactly as written — two tasks, four intended hunks (one idempotency addition + three insert batchings), no refactors, no rename, no additional Inngest options, no helper function consolidation, no try/catch wrapping.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `3be262e` | fix(enrich-prospect): add Inngest idempotency key on prospectId |
| 2 | `924f5c3` | fix(enrich-prospect): batch prospect_signals inserts per source branch |

## Self-Check: PASSED

- File exists: `src/inngest/functions/enrich-prospect.ts` — VERIFIED
- Commit `3be262e` exists — VERIFIED
- Commit `924f5c3` exists — VERIFIED
- `idempotency: "event.data.prospectId"` present exactly once — VERIFIED (line 68)
- Three multiline `.from("prospect_signals").insert(...)` calls present at lines 330, 444, 527 — VERIFIED
- Three error log prefixes present at lines 333, 447, 530 — VERIFIED
- Working tree clean, only target file in `git diff HEAD~2 HEAD` — VERIFIED
