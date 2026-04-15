# Phase 41 — Deferred Items

Out-of-scope issues discovered during execution. Log only — do NOT fix in this phase.

## Plan 41-01

### Pre-existing TypeScript errors (NOT caused by this plan)

- `src/lib/search/__tests__/execute-research.test.ts:178,180,200` — Tuple element access on empty tuple + undefined-conversion cast issues in a pre-existing test file. Discovered while running `npx tsc --noEmit` to verify the new onboarding files. Unrelated to `src/types/onboarding.ts`, `src/lib/onboarding/**`, `src/app/actions/onboarding-state.ts`. Logged per executor scope boundary; not addressed in 41-01.
