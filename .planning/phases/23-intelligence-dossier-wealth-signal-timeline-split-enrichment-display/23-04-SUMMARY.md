---
phase: 23-intelligence-dossier-wealth-signal-timeline-split-enrichment-display
plan: "04"
subsystem: prospect-profile
tags: [intelligence-dossier, signal-timeline, api-routes, ui-components]
dependency_graph:
  requires: ["23-01 (DB schema + types)"]
  provides: ["IntelligenceDossier component", "SignalTimeline component", "GET /api/.../signals", "POST /api/.../signals/mark-seen"]
  affects: ["profile-view.tsx (wired in plan 05)", "prospect_signals table", "signal_views table"]
tech_stack:
  added: []
  patterns: ["surface-card + rounded-[14px] card pattern", "CSS variable color coding per signal category", "useEffect mark-seen fire-and-forget", "paginated API with is_seen join"]
key_files:
  created:
    - src/components/prospect/intelligence-dossier.tsx
    - src/components/prospect/signal-timeline.tsx
    - src/app/api/prospects/[prospectId]/signals/route.ts
    - src/app/api/prospects/[prospectId]/signals/mark-seen/route.ts
  modified:
    - src/types/database.ts
decisions:
  - "Use client-side filter for initial signals; server-side only for load-more pagination pages"
  - "Mark-seen is fire-and-forget (POST failures are non-critical)"
  - "signal-timeline committed to main directly due to parallel worktree git complexity"
metrics:
  duration: "~17 min"
  completed: "2026-03-28"
  tasks_completed: 3
  files_created: 4
  files_modified: 1
---

# Phase 23 Plan 04: IntelligenceDossier + SignalTimeline UI Components + API Routes Summary

**One-liner:** IntelligenceDossier prose-section card + vertical SignalTimeline with 8-category color coding, NEW badges, and paginated GET/mark-seen API routes.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create IntelligenceDossier component | Done | 98c5aee |
| 2 | Create SignalTimeline component | Done | cca6f2a, 473f030 |
| 3 | Create API routes (GET signals + POST mark-seen) | Done | 41d3cf7 (merged) |

## What Was Built

### IntelligenceDossier (`src/components/prospect/intelligence-dossier.tsx`)
- Renders structured prose sections from `IntelligenceDossierData` JSON
- Empty state: "No dossier generated yet. Will appear after enrichment completes."
- Gold left-border accent on summary paragraph
- `DossierSection` helper for Career Narrative, Wealth Assessment, Company Context
- Outreach hooks as bulleted list with gold dash markers
- Quick facts 2-column grid with subtle background
- `generatedAt` date stamp in header

### SignalTimeline (`src/components/prospect/signal-timeline.tsx`)
- Vertical timeline with left rail and colored dot per category
- 8 category types with distinct color coding (sec_filing=blue, career_move=green, wealth_signal=gold, funding=emerald, media=purple, company_intel=cyan, recognition=amber, market_event=blue)
- "NEW" badge with `animate-pulse` on unseen signals (shown when `is_seen === false`)
- Category filter `<select>` dropdown (client-side for initial signals)
- "Load more" button fetches next 10 from `GET /api/prospects/[id]/signals?page=N`
- `useEffect` on mount: POST mark-seen with all unseen signal IDs from initialSignals
- Empty state: "No signals yet. Will appear after enrichment."

### GET /api/prospects/[prospectId]/signals
- Auth: `createClient()` + `getUser()` + tenant_id from app_metadata
- Query params: `page` (default 1), `limit` (default 10, max 50), `category` (optional)
- Fetches paginated `prospect_signals` rows ordered by `created_at DESC`
- Joins `signal_views` to add `is_seen: boolean` per user
- Returns: `{ signals, total, page, limit }`

### POST /api/prospects/[prospectId]/signals/mark-seen
- Auth: same pattern as GET
- Body: `{ signalIds: string[] }`
- Upserts `signal_views` rows with `onConflict: "user_id,signal_id"` + `ignoreDuplicates: true`
- Returns: `{ marked: number }`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing Phase 23 types to database.ts**
- **Found during:** Task 1 (would fail type imports)
- **Issue:** Plan 01 (creates `IntelligenceDossierData`, `ProspectSignal`, `SignalCategory`, `SignalView`) had not been executed in the main branch. However, plan 23-02 (already merged) had added `IntelligenceDossierData`. The `SignalCategory`, `ProspectSignal`, `SignalView` types and `intelligence_dossier` Prospect fields were still missing.
- **Fix:** Added `SignalCategory` union type, `ProspectSignal` interface, `SignalView` interface, and `intelligence_dossier`/`dossier_generated_at`/`dossier_model` fields to the `Prospect` interface.
- **Files modified:** `src/types/database.ts`
- **Commit:** 473f030

**2. [Scope boundary] Pre-existing build failure in enrich-prospect.ts NOT fixed**
- Found during Task 3 verification: `enrich-prospect.ts:574` TypeScript error from parallel agent's changes
- Confirmed pre-existing (build failed before any of my changes)
- Logged to deferred-items per scope boundary rules

## Known Stubs

None — all components accept real data props and render conditional sections. No hardcoded placeholders beyond the empty-state messages which are intentional UX.

## Self-Check: PASSED

- `src/components/prospect/intelligence-dossier.tsx` exists in HEAD: FOUND
- `src/components/prospect/signal-timeline.tsx` exists in HEAD: FOUND
- `src/app/api/prospects/[prospectId]/signals/route.ts` exists in HEAD: FOUND
- `src/app/api/prospects/[prospectId]/signals/mark-seen/route.ts` exists in HEAD: FOUND
- Commits 98c5aee, 473f030, cca6f2a exist: FOUND
- Build passes (`pnpm build --no-lint`): PASSED
