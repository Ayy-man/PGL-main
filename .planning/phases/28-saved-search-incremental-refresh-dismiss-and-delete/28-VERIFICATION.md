---
phase: 28-saved-search-incremental-refresh-dismiss-and-delete
verified: 2026-04-05T17:30:00Z
status: gaps_found
score: 15/16 must-haves verified
gaps:
  - truth: "No user-facing text says 'Persona' — all say 'Saved Search' instead"
    status: partial
    reason: "One user-facing JSX text node 'New Persona' persists in search-content.tsx line 668 — the restore commit (03235cd) reverted the Plan 04 rename for this specific button"
    artifacts:
      - path: "src/app/[orgId]/search/components/search-content.tsx"
        issue: "Line 668: text node reads 'New Persona' instead of 'New Search' in the PersonaPills createButton trigger"
    missing:
      - "Change line 668 text from 'New Persona' to 'New Search'"
---

# Phase 28: Saved Search Incremental Refresh, Dismiss, and Delete Verification Report

**Phase Goal:** Add persistent memory layer to saved searches so they track which Apollo prospects have been seen, dismissed, or enriched. On refresh, show only genuinely new results. Dismiss individual or bulk prospects, undo dismissals, prevent dismissed from reappearing. Keep enrichment status synced across searches. Rename user-facing "Persona" to "Saved Search".
**Verified:** 2026-04-05T17:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | saved_search_prospects table exists with tenant_id and unique constraint | ✓ VERIFIED | Migration file confirms all DDL: `tenant_id UUID NOT NULL`, `CONSTRAINT unique_search_prospect UNIQUE (saved_search_id, apollo_person_id)` |
| 2 | personas table has last_refreshed_at and total_apollo_results columns | ✓ VERIFIED | Migration file lines 35-36: `ALTER TABLE personas ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ` and `total_apollo_results INTEGER` |
| 3 | RLS is enabled on the new table | ✓ VERIFIED | Migration file line 26: `ALTER TABLE saved_search_prospects ENABLE ROW LEVEL SECURITY;` — dashboard policies human-verified per project convention |
| 4 | Persona TypeScript interface includes last_refreshed_at and total_apollo_results | ✓ VERIFIED | types.ts lines 20-21: `last_refreshed_at: string | null` and `total_apollo_results: number | null` |
| 5 | Refresh diff correctly categorizes new, active, dismissed, and enriched prospects | ✓ VERIFIED | refresh.ts contains all 4 branches: new (`!existing`), dismissed-no-change, dismissed-resurfaced (job/company changed), active/enriched updates |
| 6 | Dismissed prospects with job/company changes are resurfaced as new | ✓ VERIFIED | refresh.ts lines 141-165: title and orgName comparison; on change sets `status: 'active'`, `is_new: true`, clears `dismissed_at`/`dismissed_by` |
| 7 | Apollo pagination is capped at 5 pages (500 results max) | ✓ VERIFIED | refresh.ts: `MAX_PAGES_PER_REFRESH = 5`, `PER_PAGE = 100`, loop from 1-5 with early break |
| 8 | Cross-search enrichment sync updates all saved searches containing an enriched person | ✓ VERIFIED | enrich-prospect.ts finalize step (line 670-683): looks up `apollo_id` from prospects table, then `.update({ status: 'enriched', prospect_id: prospectId }).eq('apollo_person_id', ...).eq('tenant_id', ...)` |
| 9 | Duplicate enrichment guard prevents re-enriching already-enriched prospects | ✓ VERIFIED | enrich-prospect.ts lines 108-141: `check-duplicate-enrichment` step before `mark-in-progress` — checks `saved_search_prospects` for existing enriched row, returns `{ skipped: true }` if found |
| 10 | API routes validate tenant ownership of saved_search_id before any mutation | ✓ VERIFIED | All three routes (refresh, prospects, dismiss) perform `.eq("tenant_id", tenantId)` ownership check on personas table before any operation |
| 11 | When a saved search has been refreshed before, prospects load from DB immediately | ✓ VERIFIED | search-content.tsx: persona selection effect checks `selectedPersona.last_refreshed_at` — calls `loadSavedProspects()` if set (DB path) |
| 12 | NEW badge, dismissed toggle, last refreshed indicator, Refresh button, Bulk Dismiss, enriched guard all present | ✓ VERIFIED | prospect-results-table.tsx has gold NEW badge (rgba(212,175,55,0.15)), opacity:0.4 dismissed rows, Undo button, Enriched indicator; search-content.tsx has toolbar with formatRefreshedAgo, Refresh button, showDismissed toggle; bulk-actions-bar.tsx has Dismiss Selected (Trash2, text-red-400); dismiss confirmation dialog present |
| 13 | Stale search (>7 days) shows refresh prompt | ✓ VERIFIED | search-content.tsx lines 256-259: `daysSinceRefresh > 7` check triggers toast |
| 14 | Cap message shows when total_apollo_results > 500 | ✓ VERIFIED | search-content.tsx lines 703-706: `totalApolloResults !== null && totalApolloResults > 500` renders "Showing first 500 of ... matches" |
| 15 | Render guard fixed to show table in saved search mode | ✓ VERIFIED | search-content.tsx lines 780: `(results.length > 0 || (isSavedSearchMode && savedProspects.length > 0))` |
| 16 | No user-facing text says 'Persona' — all say 'Saved Search' instead | ✗ FAILED | search-content.tsx line 668: text node `New Persona` in PersonaPills createButton trigger — persisted after restore commit 03235cd reverted this specific rename |

**Score:** 15/16 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260405_saved_search_prospects.sql` | DDL for saved_search_prospects + ALTER TABLE personas | ✓ VERIFIED | All columns, indexes, RLS, unique constraint, CASCADE FKs present |
| `src/lib/personas/types.ts` | Updated Persona + SavedSearchProspect types | ✓ VERIFIED | Persona has new fields; SavedSearchProspect and SavedSearchProspectStatus exported |
| `src/lib/personas/refresh.ts` | Refresh diff algorithm | ✓ VERIFIED | Exports `refreshSavedSearchProspects` and `RefreshResult`; full algorithm implemented |
| `src/app/api/search/[searchId]/refresh/route.ts` | POST endpoint | ✓ VERIFIED | Exports POST; validates ownership; calls refreshSavedSearchProspects |
| `src/app/api/search/[searchId]/prospects/route.ts` | GET endpoint | ✓ VERIFIED | Exports GET; supports includeDismissed param; returns dismissedCount, lastRefreshedAt, totalApolloResults |
| `src/app/api/search/[searchId]/dismiss/route.ts` | POST endpoint | ✓ VERIFIED | Exports POST; Zod validation; handles dismiss/bulk-dismiss/undo; .neq("status","enriched") guard |
| `src/inngest/functions/enrich-prospect.ts` | Enrichment sync + duplicate guard | ✓ VERIFIED | check-duplicate-enrichment step present before mark-in-progress; cross-search sync in finalize step |
| `src/app/[orgId]/search/components/search-content.tsx` | Full saved search state management | ✓ VERIFIED | All 9 state variables, helpers, flows, and UI elements wired correctly |
| `src/app/[orgId]/search/components/prospect-results-table.tsx` | NEW badge, dismissed styling, Undo, Enriched indicator | ✓ VERIFIED | All visual indicators present; savedSearchMode, onUndoDismiss, lastRefreshedAt props added |
| `src/app/[orgId]/search/components/bulk-actions-bar.tsx` | Dismiss Selected destructive button | ✓ VERIFIED | onDismiss and showDismiss props; Trash2 icon; text-red-400 styling; conditional on showDismiss && onDismiss |
| `src/components/layout/nav-items.tsx` | "Saved Searches" label | ✓ VERIFIED | Line 33: `label: "Saved Searches"` |
| `src/components/layout/mobile-bottom-nav.tsx` | "Searches" label | ✓ VERIFIED | Line 44: `label: "Searches"` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/personas/refresh.ts` | saved_search_prospects table | `supabase.from('saved_search_prospects').upsert()` with `onConflict: 'saved_search_id,apollo_person_id'` | ✓ WIRED | Lines 211, 221: both upsert calls use correct onConflict |
| `src/inngest/functions/enrich-prospect.ts` | saved_search_prospects table | `.update({ status: 'enriched', prospect_id })` in finalize step | ✓ WIRED | Lines 678-682: update present after apollo_id lookup |
| `src/app/api/search/[searchId]/refresh/route.ts` | `src/lib/personas/refresh.ts` | `import refreshSavedSearchProspects` | ✓ WIRED | Line 3: `import { refreshSavedSearchProspects } from "@/lib/personas/refresh"` |
| `search-content.tsx` | `/api/search/[searchId]/prospects` | fetch on persona select | ✓ WIRED | loadSavedProspects function uses `/api/search/${searchId}/prospects?includeDismissed=...` |
| `search-content.tsx` | `/api/search/[searchId]/refresh` | fetch on Refresh button click or first load | ✓ WIRED | handleRefresh uses `/api/search/${id}/refresh` with POST |
| `search-content.tsx` | `/api/search/[searchId]/dismiss` | fetch on dismiss/undo/bulk-dismiss | ✓ WIRED | handleDismiss and handleUndoDismiss use `/api/search/${...}/dismiss` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `search-content.tsx` | savedProspects | `loadSavedProspects` → `GET /api/search/[id]/prospects` → Supabase `saved_search_prospects` table | Yes — Supabase query returns real rows | ✓ FLOWING |
| `search-content.tsx` | results (Apollo mode) | existing `useSearch` hook | Unchanged from pre-Phase-28 | ✓ FLOWING |
| `refresh/route.ts` → `refresh.ts` | allApolloResults | `apolloBreaker.fire()` → Apollo API | Real Apollo API calls (no mock) | ✓ FLOWING |
| `prospects/route.ts` | prospects | Supabase `saved_search_prospects.select("*")` with filters | Real DB query | ✓ FLOWING |
| `dismiss/route.ts` | mutation | Supabase `saved_search_prospects.update()` | Real DB mutation | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| refresh.ts exports exist | Grep for `export.*refreshSavedSearchProspects\|export.*RefreshResult` | Both found in refresh.ts | ✓ PASS |
| Dismiss route has .neq guard | Grep for `.neq("status", "enriched")` | Found in dismiss/route.ts line 54 | ✓ PASS |
| Enrichment sync in finalize | Grep for `saved_search_prospects.*update` in enrich-prospect.ts | Found at lines 678-682 | ✓ PASS |
| Duplicate guard before mark-in-progress | Read enrich-prospect.ts — check-duplicate-enrichment step before mark-in-progress | Confirmed: line 109 vs line 144 | ✓ PASS |
| TypeScript compiles clean (new files) | `npx tsc --noEmit` | Only pre-existing errors in test files and apollo/client.ts — zero errors in Phase 28 files | ✓ PASS |
| No org_id in new Phase 28 files | Grep for `org_id` in refresh.ts, API routes, migration | Zero matches | ✓ PASS |
| "New Persona" user-facing text | Grep for `New Persona` in TSX files | Found in search-content.tsx line 668 — user-visible button text | ✗ FAIL |

### Requirements Coverage

No formal REQ-IDs declared in phase plans (requirements field is empty in all plans). Phase goal acts as the requirements document. All goal components verified except the one gap noted above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/[orgId]/search/components/search-content.tsx` | 668 | User-facing text "New Persona" instead of "New Search" | ⚠️ Warning | Users see incorrect branding — contradicts the stated goal of renaming "Persona" to "Saved Search" throughout UI |

No stubs found. No hardcoded empty returns. No TODO/FIXME comments in new files. No placeholder implementations. All data flows wire to real Supabase operations.

### Human Verification Required

None — all observable behaviors can be checked programmatically. The following are notable items that benefit from smoke-testing but are not blockers for goal assessment:

1. **First-load Apollo path**: Select a persona with `last_refreshed_at = null` — should trigger refresh, populate DB, then display results.
   - Expected: Loading spinner during refresh; toast shows "Search refreshed" with new prospect count; table renders from DB on completion.

2. **Dismiss and undo flow**: Dismiss a prospect, verify it disappears immediately (optimistic update); click "Show dismissed"; click Undo; verify prospect returns.
   - Expected: Optimistic removal works; dismissed toggle reloads from DB; undo reloads from DB.

3. **Stale search toast**: Find a persona with `last_refreshed_at` older than 7 days — select it and verify stale warning toast appears.

### Gaps Summary

One gap blocks full goal achievement:

**"New Persona" button label in search-content.tsx** — The restore commit (03235cd, "fix(28-04): restore search-content.tsx 28-03 work — revert regression, apply rename only") was applied to recover the Plan 03 saved-search wiring that was accidentally overwritten by Plan 04. During that restore, the rename of the PersonaPills create button text from "New Persona" to "New Search" was reverted. Every other user-facing "Persona" string was correctly renamed across 15 files, but this one text node was lost.

**Fix required:** In `src/app/[orgId]/search/components/search-content.tsx` at line 668, change the JSX text node from `New Persona` to `New Search`.

This is a single-line fix. It does not affect any logic, types, API calls, or other functionality. All other phase goals are fully achieved.

---

_Verified: 2026-04-05T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
