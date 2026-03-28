---
phase: 23-intelligence-dossier-wealth-signal-timeline-split-enrichment-display
plan: "05"
subsystem: prospect-profile
tags: [intelligence-dossier, signal-timeline, profile-integration, wiring]
dependency_graph:
  requires: ["23-04 (IntelligenceDossier + SignalTimeline components)", "23-01 (DB schema + types)"]
  provides: ["Wired profile page with IntelligenceDossier + SignalTimeline replacing WealthSignals"]
  affects: ["prospect profile center column", "server-side signal fetching"]
tech_stack:
  added: []
  patterns: ["server-side signal fetch with is_seen join", "prop threading from page.tsx to ProfileView"]
key_files:
  created: []
  modified:
    - src/app/[orgId]/prospects/[prospectId]/page.tsx
    - src/components/prospect/profile-view.tsx
    - src/types/database.ts
decisions:
  - "Removed duplicate IntelligenceDossierData/SignalCategory/ProspectSignal/SignalView type definitions from database.ts (two plans added them independently)"
  - "Signal fetch uses exact count query so totalCount prop is accurate for Load More pagination"
metrics:
  duration: ~4 min
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 3
---

# Phase 23 Plan 05: Integration — Wire IntelligenceDossier + SignalTimeline into Profile Page Summary

**One-liner:** Profile center column now renders IntelligenceDossier then SignalTimeline in place of WealthSignals, with server-side signal fetching and is_seen computation in page.tsx.

## What Was Built

The final integration plan for Phase 23. Connected all components built in Plans 01-04 into the live prospect profile page:

- **page.tsx**: Added server-side fetch of `prospect_signals` (first 10, ordered by recency with exact count), followed by a `signal_views` join to compute `is_seen` per signal for the current user. Both `signalsWithSeen` and `signalCount` are passed as new props to `ProfileView`.
- **profile-view.tsx**: Replaced `WealthSignals` import/usage with `IntelligenceDossier` and `SignalTimeline`. Added `intelligence_dossier`, `dossier_generated_at`, and `dossier_model` fields to the local `Prospect` interface. Added `initialSignals` and `signalCount` to `ProfileViewProps`. Center column now renders: IntelligenceDossier → SignalTimeline → MarketIntelligenceCard → Company Context.
- **database.ts**: Removed duplicate type definitions (`IntelligenceDossierData`, `SignalCategory`, `ProspectSignal`, `SignalView`) that were added twice across Plan 01 and Plan 04 — caused a TypeScript build error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate type identifiers in database.ts caused build failure**
- **Found during:** Task 2 build verification
- **Issue:** `IntelligenceDossierData`, `SignalCategory`, `ProspectSignal`, and `SignalView` were defined twice in `src/types/database.ts` — once at lines ~162-208 (added by Plan 01) and again at lines ~296-337 (added by Plan 04). TypeScript rejected the duplicate identifiers.
- **Fix:** Removed the second duplicate block (lines 296-337) which was identical to the first. The first block has more complete comments so it was retained.
- **Files modified:** `src/types/database.ts`
- **Commit:** 9b58bcd

## Known Stubs

None — the components render meaningful empty states when no dossier/signals exist yet. Data will populate after enrichment runs.

## Commits

| Hash | Message |
|------|---------|
| 0d14b5a | feat(23-05): fetch initial signals server-side and pass to ProfileView |
| 9b58bcd | feat(23-05): replace WealthSignals with IntelligenceDossier + SignalTimeline |

## Checkpoint Pending

Task 3 is a `checkpoint:human-verify` — human must run the SQL migration, configure RLS, and visually verify the prospect profile renders IntelligenceDossier and SignalTimeline correctly.

## Self-Check: PASSED
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — exists and contains `prospect_signals`, `signal_views`, `initialSignals`, `signalCount`
- `src/components/prospect/profile-view.tsx` — exists and contains `IntelligenceDossier`, `SignalTimeline`, no `WealthSignals`
- Build passes with zero errors
- Commits 0d14b5a and 9b58bcd exist
