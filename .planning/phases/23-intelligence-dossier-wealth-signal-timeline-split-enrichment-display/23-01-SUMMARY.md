---
phase: 23-intelligence-dossier-wealth-signal-timeline-split-enrichment-display
plan: 01
subsystem: database
tags: [postgres, supabase, migrations, typescript, jsonb, rls]

# Dependency graph
requires:
  - phase: 22-lead-profile-editing
    provides: Migration pattern for ALTER TABLE + CREATE TABLE + indexes + RLS

provides:
  - prospect_signals table with category, headline, summary, source_url, event_date, raw_source, is_new columns
  - signal_views table with per-user seen tracking
  - prospects table extended with intelligence_dossier jsonb, dossier_generated_at, dossier_model columns
  - IntelligenceDossierData TypeScript interface
  - SignalCategory union type including sec_filing and market_event
  - ProspectSignal TypeScript interface
  - SignalView TypeScript interface

affects:
  - 23-02
  - 23-03
  - 23-04
  - 23-05
  - all plans using Prospect type

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migration with IF NOT EXISTS guards following Phase 22 convention"
    - "RLS enabled on tables, policies configured in Supabase dashboard (not in migrations)"
    - "TypeScript types co-located in src/types/database.ts mirroring DB schema"
    - "Unique dedup index via partial index (WHERE source_url IS NOT NULL) for signal deduplication"

key-files:
  created:
    - supabase/migrations/20260329_intelligence_dossier_signals.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "source_url is nullable in prospect_signals to support SEC filings that may not have a direct URL"
  - "event_date is nullable to support signals without a known date"
  - "Dedup handled via partial unique index (prospect_id, source_url) WHERE source_url IS NOT NULL"
  - "RLS policies delegated to Supabase dashboard per project convention (not in migration file)"
  - "IntelligenceDossierData added before EnrichmentStatus, all new types grouped together"

patterns-established:
  - "Pattern: ProspectSignal raw_source is a narrow union type ('exa' | 'sec-edgar' | 'market') for type-safety"
  - "Pattern: SignalCategory extends existing exa-digest.ts categories with sec_filing and market_event"

requirements-completed:
  - DOSS-01
  - SIG-01
  - SIG-02

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 23 Plan 01: DB Schema Foundation + TypeScript Types Summary

**SQL migration creating prospect_signals and signal_views tables with dedup indexes, plus TypeScript interfaces for IntelligenceDossierData, ProspectSignal, SignalView, and SignalCategory exported from database.ts**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T00:00:00Z
- **Completed:** 2026-03-27T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created SQL migration adding intelligence_dossier, dossier_generated_at, dossier_model columns to prospects table
- Created prospect_signals table with category, headline, summary, source_url, event_date, raw_source, is_new columns, dedup index, and RLS
- Created signal_views table with per-user seen tracking, unique constraint, and RLS
- Added IntelligenceDossierData, SignalCategory, ProspectSignal, SignalView TypeScript types to database.ts
- Extended Prospect interface with three new dossier fields
- Build passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration for prospect_signals, signal_views tables and prospects dossier columns** - `341a867` (feat)
2. **Task 2: TypeScript types for IntelligenceDossierData, ProspectSignal, SignalView, SignalCategory** - `dcb5eac` (feat)

## Files Created/Modified
- `supabase/migrations/20260329_intelligence_dossier_signals.sql` - Phase 23 DB migration with prospect_signals, signal_views tables and prospects column additions
- `src/types/database.ts` - Added IntelligenceDossierData, SignalCategory, ProspectSignal, SignalView types; extended Prospect with dossier fields

## Decisions Made
- `source_url` is nullable in prospect_signals — SEC filings may not have a direct URL
- `event_date` is nullable — not all signals have an extractable date
- Unique dedup index uses partial index pattern (WHERE source_url IS NOT NULL) to avoid conflicts on null values
- RLS enabled on both new tables; policies configured in Supabase dashboard per project convention
- TypeScript types grouped together in database.ts after StockSnapshot and before EnrichmentStatus

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `pnpm build --no-lint` failed in worktree due to missing node_modules symlink; resolved by using the main repo's node_modules binary directly. Build succeeded with zero errors.

## User Setup Required
None — migration file is ready to apply via `supabase db push` or Supabase dashboard SQL editor. No external service configuration required.

## Next Phase Readiness
- DB schema contract is established — all subsequent Phase 23 plans can reference prospect_signals and signal_views
- TypeScript types exported and ready for use in API routes, Inngest functions, and UI components
- No blockers for Plan 02

## Known Stubs
None - this plan only establishes the DB schema and TypeScript types. No UI or data-fetching code was written.

---
*Phase: 23-intelligence-dossier-wealth-signal-timeline-split-enrichment-display*
*Completed: 2026-03-27*
