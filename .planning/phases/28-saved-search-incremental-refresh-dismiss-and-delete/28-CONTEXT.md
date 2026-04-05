# Phase 28: Saved Search Incremental Refresh, Dismiss, and Delete - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning
**Source:** PRD Express Path (user spec)

<domain>
## Phase Boundary

Add a persistent memory layer to saved searches ("personas") so they track which Apollo prospects have been seen, dismissed, or enriched. On refresh, show only genuinely new results instead of re-running the full query from scratch. Let users dismiss individual or bulk prospects, undo dismissals, and prevent dismissed prospects from reappearing. Keep enrichment status synced across all searches that share a person.

**Delivers:**
- `saved_search_prospects` join table with status tracking (active / dismissed / enriched)
- `last_refreshed_at` + `total_apollo_results` columns on `personas` table
- Refresh diff algorithm: new → badge NEW, dismissed → suppress (unless job/company changed), enriched → never re-charge
- Dismiss action (single), bulk dismiss, undo dismiss
- UI: "NEW" gold badge, "Show dismissed (N)" toggle, "Last refreshed: X ago" indicator, Refresh button
- Bulk actions bar gains "Dismiss Selected" destructive button
- Enrichment sync: after enrich, mark all saved searches containing that apollo_person_id as enriched
- Duplicate enrichment guard: check before firing enrichment pipeline
- Apollo pagination cap: 5 pages / 500 results max per refresh
- UI rename: "Persona" → "Saved Search" everywhere user-facing (DB/API/types unchanged)

</domain>

<decisions>
## Implementation Decisions

### Database Schema — New Table
- Create migration for `saved_search_prospects`:
  ```sql
  CREATE TABLE saved_search_prospects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    saved_search_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    apollo_person_id TEXT NOT NULL,
    apollo_data JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'enriched')),
    prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID,
    is_new BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_search_prospect UNIQUE (saved_search_id, apollo_person_id)
  );
  CREATE INDEX idx_ssp_search_id ON saved_search_prospects(saved_search_id);
  CREATE INDEX idx_ssp_search_status ON saved_search_prospects(saved_search_id, status);
  CREATE INDEX idx_ssp_apollo_id ON saved_search_prospects(apollo_person_id);
  CREATE INDEX idx_ssp_org_id ON saved_search_prospects(org_id);
  ```
- RLS policies use `org_id = auth.jwt() ->> 'org_id'` for SELECT, INSERT (WITH CHECK), UPDATE, USING, DELETE
- Enable RLS on the table

### Database Schema — Alter Existing Table
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;`
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS total_apollo_results INTEGER;`
- Migration file goes in `supabase/migrations/`

### Refresh Diff Logic
- New utility: `src/lib/personas/refresh.ts`
- Algorithm:
  1. Fetch all existing rows for this `saved_search_id`
  2. Build a Map keyed by `apollo_person_id`
  3. For each Apollo result:
     - **Not in map** → insert with `is_new: true`, `status: 'active'`
     - **In map, status = 'dismissed'** → check if `title` or `organization.name` changed. If yes: resurface (`status: 'active'`, `is_new: true`, `dismissed_at: null`). If no: stay dismissed, update `last_seen_at` and `apollo_data` only.
     - **In map, status = 'active' or 'enriched'** → update `apollo_data` and `last_seen_at`, set `is_new: false`, keep `status`
  4. Batch upsert via `onConflict: 'saved_search_id,apollo_person_id'`
  5. Update `personas` set `last_refreshed_at = now()`, `total_apollo_results = apolloResults.length`
- Return `RefreshResult` shape: `{ newProspects, existingActive, existingEnriched, totalDismissed, totalFromApollo }`
- Profile-change detection: compare `apollo_data.title` and `apollo_data.organization.name` from stored data vs fresh Apollo result

### Dismiss Actions
- Single dismiss: `UPDATE saved_search_prospects SET status='dismissed', dismissed_at=now(), dismissed_by={userId} WHERE saved_search_id=X AND apollo_person_id=Y`
- Bulk dismiss: same update using `.in('apollo_person_id', ids)`
- Undo dismiss: `UPDATE SET status='active', dismissed_at=null, dismissed_by=null, is_new=false` (do NOT re-badge as NEW)
- Dismissed confirmation text: "Dismiss {n} prospects? They won't appear in future refreshes of this search."
- Enriched prospects: hide dismiss button entirely — never dismissible

### Load Flow — First Load (last_refreshed_at is null)
1. Run Apollo search with saved filters
2. Run refresh diff (all results are new since table is empty)
3. Display results from join table, all badged NEW

### Load Flow — Subsequent Loads
1. Load `saved_search_prospects WHERE status IN ('active', 'enriched')` immediately — no Apollo call
2. Show cached data with "Last refreshed: {time ago}" + Refresh button
3. On Refresh button click (or if `last_refreshed_at > 7 days` prompt shown):
   a. Run Apollo search with same filters (capped at 5 pages)
   b. Run refresh diff
   c. New prospects slide to top with NEW badges
   d. Update "Last refreshed" timestamp
- Auto-refresh: show stale prompt if `last_refreshed_at` > 7 days old — never auto-refresh without user action

### Apollo Pagination Cap
- Hard cap: `MAX_PAGES_PER_REFRESH = 5`, `PER_PAGE = 100` → max 500 results per refresh
- Loop exits early if Apollo returns fewer than 100 results
- Show to user: "Showing first 500 of {total_entries} matches. Refine your filters for more targeted results."

### Enrichment Sync (cross-search)
- After enrichment pipeline completes and prospect record is created:
  ```typescript
  await supabase
    .from('saved_search_prospects')
    .update({ status: 'enriched', prospect_id: newProspectId })
    .eq('apollo_person_id', apolloPersonId)
    .eq('org_id', orgId);
  ```
- This syncs ALL saved searches that contain this person — not just the current one
- Hook location: final Inngest step or API route that marks enrichment complete

### Duplicate Enrichment Guard
- Before firing enrichment pipeline for an `apollo_person_id`:
  ```typescript
  const { data } = await supabase
    .from('saved_search_prospects')
    .select('prospect_id')
    .eq('apollo_person_id', apolloPersonId)
    .eq('org_id', orgId)
    .eq('status', 'enriched')
    .not('prospect_id', 'is', null)
    .limit(1);
  if (data?.length > 0) {
    // Link to existing prospect, skip pipeline
    await supabase.from('saved_search_prospects').update({
      status: 'enriched',
      prospect_id: data[0].prospect_id,
    }).eq('saved_search_id', currentSavedSearchId).eq('apollo_person_id', apolloPersonId);
    return;
  }
  ```

### UI — NEW Badge
- Show on prospect rows where `is_new === true`
- Style: small badge, gold accent color `#d4af37` / `--gold-primary`, text "NEW"
- Location: next to prospect name in results list

### UI — Show Dismissed Toggle
- Below or near search results header
- Label: "Show dismissed ({count})"
- Default: off
- When on: show dismissed rows in dimmed/muted style with "Undo" button per row

### UI — Last Refreshed Indicator
- Location: near saved search name/title area
- Text: "Last refreshed: 3 hours ago" or "Never refreshed"
- Refresh button: circular arrow icon
- Clicking triggers refresh flow

### UI — Bulk Actions Bar
- Current: [Add to List] [Export CSV] [Enrich Selection]
- New: [Add to List] [Export CSV] [Enrich Selection] [Dismiss Selected]
- "Dismiss Selected" styled as destructive (red/muted variant)
- On click: show confirmation dialog, then call bulk dismiss, remove rows from visible list

### UI Rename — Persona → Saved Search
- Rename ONLY user-facing strings:
  - "Persona" → "Saved Search" (headings, buttons, labels, nav items)
  - "persona" → "saved search" (descriptions, tooltips, helper text)
  - "New Persona" → "New Search"
  - "Create Persona" → "Save Search"
- DO NOT rename: database tables, API routes, TypeScript type names, internal variable names
- File/component names can stay as-is — only displayed text changes

### Concurrency
- All writes to `saved_search_prospects` use upsert with `onConflict: 'saved_search_id,apollo_person_id'` — safe for concurrent refreshes by multiple team members

### Edge Cases (all must be handled)
1. Empty Apollo refresh (0 results) → do NOT clear existing rows. Show "No results found. Your previous results are still available below."
2. Filter edit → warn user: "Changing filters will refresh results. Previously dismissed prospects may reappear if they match the new criteria." Then clear `is_new` flags and re-run full refresh diff.
3. Stale data indicator → for rows where `last_seen_at` is older than most recent refresh: optionally show "Not in latest results"
4. Concurrent refresh → upsert handles this gracefully
5. Enriched prospects → hide dismiss button in UI
6. Saved search deletion → `ON DELETE CASCADE` cleans up join table rows; enriched `prospects` records survive via `ON DELETE SET NULL`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Persona Infrastructure
- `src/app/[orgId]/search/` — search page components and current persona display
- `src/app/[orgId]/search/components/search-content.tsx` or similar — main search results component (verify exact filename)
- `src/app/[orgId]/search/components/prospect-results-table.tsx` — prospect table with existing bulk actions bar

### Apollo Integration
- `src/lib/apollo/client.ts` — Apollo API client
- `src/lib/apollo/types.ts` — Apollo type definitions

### Supabase / DB Patterns
- `supabase/migrations/` — existing migration files (follow naming convention)
- RLS policies use `auth.jwt() ->> 'org_id'` pattern (consistent with existing tables)

### Enrichment Pipeline
- `src/lib/inngest/` or similar — Inngest function definitions
- Look for the final enrichment completion step to hook enrichment sync

### Design System
- CSS variables: `--gold-primary` (#d4af37), `--bg-card`, `--bg-surface`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--text-tertiary`
- Badge style: follows existing badge patterns in the codebase

### Memory
- `/Users/aymanbaig/.claude/projects/-Users-aymanbaig-Desktop-Manual-Library-noSync-PGL-main/memory/MEMORY.md` — common gotchas, API constraints

</canonical_refs>

<specifics>
## Specific Ideas

- `is_new` badge uses gold `#d4af37` — consistent with design system accent
- Dismissed prospects resurfaced due to job/company change should get `is_new: true` (catches "promoted to trader" edge case)
- Stale data: "Not in latest results" for prospects Apollo stopped returning (possibly left company)
- `total_entries` from Apollo pagination response drives the "Showing 500 of X" copy
- Refresh button icon: circular arrow (lucide `RefreshCw` or equivalent)
- "Last refreshed: X ago" uses relative time (e.g., `formatDistanceToNow` from date-fns)
- 7-day staleness prompt: "Results may be outdated. Refresh?" — shown automatically, doesn't auto-refresh

</specifics>

<deferred>
## Deferred Ideas

- Auto-refresh on a timer (without user action) — explicitly out of scope per spec
- `TESTING.md`-style approach for the validation step — referenced in spec verification section but not blocking

</deferred>

---

*Phase: 28-saved-search-incremental-refresh-dismiss-and-delete*
*Context gathered: 2026-04-05 via PRD Express Path (user spec)*
