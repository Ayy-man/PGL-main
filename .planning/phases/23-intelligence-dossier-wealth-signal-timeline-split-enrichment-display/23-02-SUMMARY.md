---
phase: 23-intelligence-dossier-wealth-signal-timeline-split-enrichment-display
plan: "02"
subsystem: enrichment
tags: [ai, dossier, exa-digest, intelligence, signals]
dependency_graph:
  requires: []
  provides: [generateIntelligenceDossier, DigestedSignal.event_date]
  affects: [src/lib/enrichment/claude.ts, src/lib/enrichment/exa-digest.ts, src/types/database.ts]
tech_stack:
  added: []
  patterns: [fence-stripping, graceful-degradation, null-on-failure]
key_files:
  created: []
  modified:
    - src/lib/enrichment/claude.ts
    - src/lib/enrichment/exa-digest.ts
    - src/types/database.ts
decisions:
  - "IntelligenceDossierData added to database.ts as Rule 3 deviation since Plan 01 not yet executed in parallel wave"
  - "maxTokens=1800 for dossier generation to accommodate 6-field JSON response"
  - "event_date typed as string|null (optional) to handle Exa signals without publish dates"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 3
---

# Phase 23 Plan 02: Enrichment Logic Functions Summary

## One-liner

Added `generateIntelligenceDossier()` with JSON fence-stripping and 6-field validation, plus `DigestedSignal.event_date` propagated from Exa `publishDate`.

## What Was Built

### Task 1: generateIntelligenceDossier() in claude.ts

- Added `DossierInput` interface covering name, title, company, contactData, webSignals, insiderTransactions, stockSnapshot
- Added `DOSSIER_SYSTEM_PROMPT` constant directing the LLM to return 6-field JSON (no fences)
- Added `generateIntelligenceDossier()` that builds a rich user message from all enrichment data, calls `chatCompletion` at 1800 tokens, strips code fences using same pattern as exa-digest.ts, validates all 6 required fields, returns `null` on any failure
- Imported `IntelligenceDossierData` from `@/types/database` (no local duplicate)
- Existing `generateProspectSummary()` unchanged

### Task 2: event_date in exa-digest.ts

- Added `event_date?: string | null` to `DigestedSignal` type
- Propagated `mention.publishDate || null` into `event_date` in the push block of `digestExaResults()`
- No other changes to the file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added IntelligenceDossierData to database.ts**
- **Found during:** Task 1 (import would fail without the type)
- **Issue:** Plan 02 imports `IntelligenceDossierData` from `@/types/database`, but Plan 01 (which adds this type) had not been executed yet in the parallel wave
- **Fix:** Added `IntelligenceDossierData` interface to `src/types/database.ts` matching the exact shape specified in Plan 01
- **Files modified:** `src/types/database.ts`
- **Commit:** 912838e

## Commits

| Hash | Message |
|------|---------|
| 912838e | feat(23-02): add generateIntelligenceDossier() to claude.ts + IntelligenceDossierData type |
| c884139 | feat(23-02): add event_date to DigestedSignal + propagate publishDate in digestExaResults |

## Decisions Made

1. `IntelligenceDossierData` added directly to `database.ts` to unblock the import — Plan 01 will be a no-op for this type when it runs
2. Used 1800 token budget for dossier generation (6-field structured JSON requires more space than the 500-token summary)
3. `event_date` is optional (`?`) in the DigestedSignal type since not all signals from Exa have publish dates

## Known Stubs

None — both functions are fully implemented. `generateIntelligenceDossier()` makes a real LLM call and returns parsed data; `digestExaResults()` propagates the real `publishDate` field.

## Self-Check: PASSED

- `src/lib/enrichment/claude.ts` — FOUND: exports generateIntelligenceDossier, DossierInput, DOSSIER_SYSTEM_PROMPT, imports IntelligenceDossierData
- `src/lib/enrichment/exa-digest.ts` — FOUND: event_date in type definition and assignment
- `src/types/database.ts` — FOUND: IntelligenceDossierData interface
- Build: PASSED (pnpm build --no-lint succeeds)
- Commits: 912838e, c884139 — both verified
