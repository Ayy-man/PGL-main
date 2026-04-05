# Phase 28: Saved Search Incremental Refresh, Dismiss, and Delete - Research

**Researched:** 2026-04-05
**Domain:** Supabase join tables, Apollo ID tracking, Inngest enrichment pipeline hooks, React bulk-action UI
**Confidence:** HIGH — all findings verified directly against codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Database Schema — New Table**
- Create migration for `saved_search_prospects` with: id, saved_search_id, org_id, apollo_person_id, apollo_data JSONB, status CHECK('active','dismissed','enriched'), prospect_id, first_seen_at, last_seen_at, dismissed_at, dismissed_by, is_new BOOLEAN, created_at
- UNIQUE CONSTRAINT: (saved_search_id, apollo_person_id)
- Indexes: idx_ssp_search_id, idx_ssp_search_status, idx_ssp_apollo_id, idx_ssp_org_id
- RLS policies using `org_id = auth.jwt() ->> 'org_id'`

**Database Schema — Alter Existing Table**
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;`
- `ALTER TABLE personas ADD COLUMN IF NOT EXISTS total_apollo_results INTEGER;`

**Refresh Diff Logic**
- New utility: `src/lib/personas/refresh.ts`
- Algorithm: fetch existing rows → Map by apollo_person_id → for each Apollo result: insert new (is_new:true), update active/enriched (is_new:false), handle dismissed with job/company change detection
- Batch upsert via `onConflict: 'saved_search_id,apollo_person_id'`
- Returns `RefreshResult` shape

**Dismiss Actions**
- Single and bulk dismiss via Supabase update
- Undo dismiss resets to active (is_new:false — do NOT re-badge)
- Enriched prospects: never dismissible (hide dismiss button)

**Load Flow**
- First load: run Apollo search → run refresh diff → display all as NEW
- Subsequent loads: load from join table immediately (no Apollo call) → show Refresh button
- Refresh capped at 5 pages / 500 results max

**Enrichment Sync (cross-search)**
- After enrichment pipeline: update ALL saved_search_prospects rows matching apollo_person_id + org_id
- Hook location: "finalize" step in `src/inngest/functions/enrich-prospect.ts`

**Duplicate Enrichment Guard**
- Check saved_search_prospects for existing enriched row before firing pipeline

**UI — NEW Badge**
- Gold `#d4af37` / `--gold-primary`, text "NEW", small badge next to prospect name

**UI — Show Dismissed Toggle**
- Default off, shows dimmed rows with Undo button per row

**UI — Last Refreshed Indicator**
- Relative time ("Last refreshed: 3 hours ago") + RefreshCw icon button

**UI — Bulk Actions Bar**
- Add "Dismiss Selected" as destructive button after "Enrich Selection"

**UI Rename — Persona → Saved Search**
- User-facing strings only; DB tables, API routes, TypeScript types, variable names unchanged

**Concurrency**
- All writes use upsert with onConflict — safe for concurrent refreshes

**Edge Cases**
- Empty Apollo refresh: do not clear existing rows
- Filter edit: warn user, clear is_new flags, re-run full diff
- Stale data: "Not in latest results" indicator
- Enriched prospects: hide dismiss button

### Claude's Discretion
- Exact file naming for new API routes (e.g., `src/app/api/search/[searchId]/refresh/route.ts`)
- Component breakdown within the results area (whether dismiss UX lives in ProspectResultsTable or a new wrapper)
- Wave/task sequencing order

### Deferred Ideas (OUT OF SCOPE)
- Auto-refresh on a timer (without user action)
- TESTING.md-style approach for the validation step
</user_constraints>

---

## Summary

Phase 28 adds a persistent join table (`saved_search_prospects`) between the `personas` (saved searches) table and Apollo results, turning the current stateless search-and-display flow into a stateful incremental diff flow. The current architecture loads Apollo results fresh on every search; this phase caches them in Postgres, tracks status per prospect, and only surfaces new results on subsequent refreshes.

The codebase already has a clear join-table precedent in `prospect_list_members` (used for list membership) and the Supabase upsert pattern is established — but note that the CONTEXT.md specifies `org_id` in the new table while the **entire existing codebase uses `tenant_id`**. This naming mismatch must be resolved before migration is written. The RLS pattern used everywhere is `tenant_id = auth.jwt() ->> 'tenant_id'`, not `org_id`.

The enrichment sync hook belongs in the "finalize" step of `src/inngest/functions/enrich-prospect.ts` (Step 6), immediately after the `enrichment_status = 'complete'` update. The `createAdminClient()` is already used in that file — no new import needed.

**Primary recommendation:** Use `tenant_id` (not `org_id`) throughout the new table to match every other table in the schema. Add the cross-search enrichment sync as a fire-and-forget call inside the finalize step before the activity log.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.95.3 | Supabase client (DB read/write) | Already installed [VERIFIED: INTEGRATIONS.md] |
| `@supabase/ssr` | 0.8.0 | Server-side Supabase client | Already installed [VERIFIED: INTEGRATIONS.md] |
| `inngest` | (project version) | Enrichment pipeline steps | Already installed [VERIFIED: enrich-prospect.ts] |
| `lucide-react` | (project version) | RefreshCw, Trash2 icons | Already used in search-content.tsx [VERIFIED: codebase] |
| `zod` | (project version) | Request body validation | Standard in all API routes [VERIFIED: multiple route.ts files] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nuqs` | (project version) | URL state for showDismissed toggle | Already used for search state [VERIFIED: use-search.ts] |

**No new packages required.** All functionality is achievable with the existing stack.

---

## Architecture Patterns

### Verified Project Structure (from codebase)

```
src/
├── lib/
│   ├── personas/
│   │   ├── types.ts         # Persona, PersonaFilters interfaces
│   │   ├── queries.ts       # getPersonas, createPersona, etc.
│   │   └── refresh.ts       # NEW — refresh diff utility
│   └── supabase/
│       ├── server.ts        # createClient() — for API routes (respects RLS)
│       └── admin.ts         # createAdminClient() — for Inngest (bypasses RLS)
├── app/
│   ├── api/
│   │   └── search/
│   │       └── [searchId]/  # NEW route group for per-search operations
│   │           ├── refresh/route.ts
│   │           ├── dismiss/route.ts
│   │           └── prospects/route.ts
│   └── [orgId]/search/
│       ├── components/
│       │   ├── search-content.tsx      # 826 lines — main orchestrator
│       │   ├── bulk-actions-bar.tsx    # 68 lines — add Dismiss Selected here
│       │   └── prospect-results-table.tsx  # 333 lines — add NEW badge here
│       └── hooks/
│           └── use-search.ts           # URL state + Apollo fetch
└── inngest/functions/
    └── enrich-prospect.ts  # Add enrichment sync in "finalize" step
```

### Pattern 1: Supabase Upsert with onConflict

The existing codebase uses select-then-insert/update (NOT `.upsert()` with `ignoreDuplicates`) due to a past fix (commit 83e674c: "replace ON CONFLICT upsert with select-then-insert/update pattern").

**However**, the CONTEXT.md explicitly specifies using `.upsert()` with `onConflict: 'saved_search_id,apollo_person_id'` for batch writes in the refresh diff. This is appropriate for the join table since:
1. The unique constraint ensures safety
2. The batch nature (100s of rows at once) makes select-then-insert prohibitive
3. Apollo IDs are stable identifiers — no ambiguity issue that drove the prospects table fix

```typescript
// Source: CONTEXT.md decision + upsert pattern
const rows = apolloResults.map(p => ({
  saved_search_id: searchId,
  tenant_id: tenantId,        // NOTE: use tenant_id, not org_id
  apollo_person_id: p.id,
  apollo_data: {
    title: p.title,
    organization: { name: p.organization_name || p.organization?.name },
    first_name: p.first_name,
  },
  status: existingMap.has(p.id) ? existingMap.get(p.id)!.status : 'active',
  is_new: !existingMap.has(p.id),
  last_seen_at: new Date().toISOString(),
}));

await supabase
  .from('saved_search_prospects')
  .upsert(rows, { onConflict: 'saved_search_id,apollo_person_id' });
```
[VERIFIED: CONTEXT.md decisions + src/lib/prospects/queries.ts pattern study]

### Pattern 2: Supabase Client Selection

Two clients exist — use the right one:

| Client | File | Use When |
|--------|------|----------|
| `createClient()` | `src/lib/supabase/server.ts` | API route handlers — respects RLS, uses user JWT |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Inngest functions — bypasses RLS, uses service role key |

[VERIFIED: src/lib/supabase/server.ts, src/lib/supabase/admin.ts]

### Pattern 3: Migration File Format

All migrations:
- Located in `supabase/migrations/`
- Filename format: `YYYYMMDD_descriptive_name.sql`
- Most recent example: `20260329_research_scrapbook.sql`
- Header comment: `-- Phase N: Description`
- End with: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + comment: `-- NOTE: RLS policy configured in Supabase dashboard per project convention`
- **RLS policies are NOT in migration files** — they are set in the Supabase dashboard

[VERIFIED: all 4 migration files in supabase/migrations/]

### Pattern 4: Inngest Step Additions

The "finalize" step (Step 6) in `enrich-prospect.ts` already uses `createAdminClient()`. The cross-search sync belongs here, immediately after updating `enrichment_status = 'complete'`:

```typescript
// Inside step.run("finalize", ...) — after enrichment_status update
// Sync all saved searches that contain this person
const apolloId = event.data.apolloPersonId; // needs to be passed in event
if (apolloId) {
  await supabase
    .from('saved_search_prospects')
    .update({ status: 'enriched', prospect_id: prospectId })
    .eq('apollo_person_id', apolloId)
    .eq('tenant_id', tenantId);
}
```

**Important:** The `apollo_person_id` / `apolloPersonId` must be passed through the Inngest event payload. Currently the event payload includes `prospectId`, `tenantId`, `userId`, `email`, `linkedinUrl`, `name`, `company`, `title`, `companyCik`, `ticker` — but NOT the raw Apollo ID. The event schema needs this field added, or it must be looked up from the prospects table using `prospectId`.

[VERIFIED: src/inngest/functions/enrich-prospect.ts lines 92-104]

### Pattern 5: BulkActionsBar Extension

Current `BulkActionsBarProps`:
```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onAddToList: () => void;
  onExport: () => void;
  onEnrich: () => void;
}
```

Add `onDismiss?: () => void` and render the button only when `selectedCount > 0` (matching existing pattern). Use destructive styling — the project uses `variant="ghost"` for neutral actions and `variant="gold"` for the primary action. A destructive "Dismiss" button should use a red variant or explicit inline style consistent with the design system.

[VERIFIED: src/app/[orgId]/search/components/bulk-actions-bar.tsx]

### Pattern 6: Relative Time Formatting

The project does NOT use `date-fns`. The existing `formatRelativeDate` function in `prospect-results-table.tsx` (lines 6-19) is a custom implementation using native Date arithmetic. The `--gold-primary` context specifies using `formatDistanceToNow` from date-fns, but date-fns is NOT installed.

**The correct approach:** Extend the existing `formatRelativeDate` pattern for "Last refreshed: X ago" display, OR use `Intl.RelativeTimeFormat` (as done in `export-log-client.tsx`).

[VERIFIED: prospect-results-table.tsx lines 6-19, package.json (no date-fns), export-log-client.tsx comment]

### Anti-Patterns to Avoid

- **Do NOT use `org_id` as the column name** — entire codebase uses `tenant_id`. The CONTEXT.md schema shows `org_id` but this conflicts with every existing table and the RLS JWT claim. Use `tenant_id` and `tenant_id = auth.jwt() ->> 'tenant_id'` for RLS.
- **Do NOT import `createAdminClient` in client components** — only in API routes and Inngest functions.
- **Do NOT add date-fns as a dependency** — use native Date arithmetic or Intl.RelativeTimeFormat.
- **Do NOT put RLS policies in migration files** — project convention is dashboard-only.
- **Do NOT auto-refresh without user action** — explicitly deferred per spec.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time display | Custom duration formatter | Extend existing `formatRelativeDate` in prospect-results-table.tsx | Already solves days/months/years |
| Concurrent refresh safety | Optimistic locking | PostgreSQL UNIQUE + upsert onConflict | DB handles races atomically |
| Toast notifications | Custom notification | Existing `useToast()` hook from `@/hooks/use-toast` | Already used in search-content.tsx |
| Dialog/confirmation | Custom modal | Existing `Dialog` from `@/components/ui/dialog` | Already imported in search-content.tsx |
| Loading spinners | Custom spinner | `Loader2` from lucide-react + `animate-spin` | Already used in search-content.tsx |

---

## Critical Schema Finding: `org_id` vs `tenant_id`

**This is the most important finding from the codebase audit.**

The CONTEXT.md decision specifies the new table should have an `org_id` column with RLS `org_id = auth.jwt() ->> 'org_id'`. However:

- Every existing table (`personas`, `prospects`, `research_sessions`, `prospect_tags`, `signal_views`, etc.) uses `tenant_id` [VERIFIED: all migration files + src/types/database.ts]
- The JWT claim is `tenant_id` (from `user.app_metadata.tenant_id`) [VERIFIED: search/page.tsx line 44, search/apollo/route.ts line 50]
- `auth.jwt() ->> 'org_id'` would never match anything — it would silently return NULL and break all RLS checks
- The `createClient()` server client already passes the user's session JWT to Supabase

**Resolution:** Use `tenant_id UUID NOT NULL` instead of `org_id UUID NOT NULL` throughout the new table. Use `tenant_id = auth.jwt() ->> 'tenant_id'` for RLS policies (consistent with all other tables).

[VERIFIED: src/types/database.ts, supabase/migrations/*, search/page.tsx]

---

## Critical Finding: Apollo Person ID in Inngest Event

To implement the enrichment sync hook, the Inngest event needs to carry the Apollo person ID. Currently the event payload (defined by what is sent to `prospect/enrich.requested`) does NOT include `apolloPersonId`.

Two approaches:
1. **Pass it in the event** — add `apolloPersonId` to the event when firing enrichment from `src/app/api/prospects/[prospectId]/enrich/route.ts`
2. **Look it up in the finalize step** — query `SELECT apollo_id FROM prospects WHERE id = prospectId` using `createAdminClient()` inside the finalize step

Approach 2 is safer (no event schema change, works even for manual re-enrichments) and has zero risk of breaking existing callers.

[VERIFIED: src/inngest/functions/enrich-prospect.ts lines 92-104, src/types/database.ts line 50]

---

## Key File Inventory

### Files to CREATE

| File | Purpose |
|------|---------|
| `supabase/migrations/20260405_saved_search_prospects.sql` | New join table + personas column additions |
| `src/lib/personas/refresh.ts` | Refresh diff algorithm + RefreshResult type |
| `src/app/api/search/[searchId]/refresh/route.ts` | POST — runs Apollo + refresh diff |
| `src/app/api/search/[searchId]/prospects/route.ts` | GET — loads saved prospects for a search |
| `src/app/api/search/[searchId]/dismiss/route.ts` | POST — single/bulk dismiss + undo |

### Files to MODIFY

| File | Change |
|------|--------|
| `src/inngest/functions/enrich-prospect.ts` | Add cross-search sync in "finalize" step; add duplicate enrichment guard at start |
| `src/app/[orgId]/search/components/bulk-actions-bar.tsx` | Add `onDismiss` prop + Dismiss Selected button |
| `src/app/[orgId]/search/components/search-content.tsx` | Wire up load-from-DB flow, refresh button, dismissed toggle, persona→saved search renames |
| `src/app/[orgId]/search/components/prospect-results-table.tsx` | Add NEW badge, dismissed row styling, Undo button |
| `src/app/[orgId]/search/hooks/use-search.ts` | Add saved-search state (last_refreshed_at, showDismissed) |
| `src/lib/personas/types.ts` | Add `last_refreshed_at`, `total_apollo_results` to `Persona` interface |

[VERIFIED: All file paths confirmed in codebase]

---

## Common Pitfalls

### Pitfall 1: org_id vs tenant_id Column Name
**What goes wrong:** Migration creates `org_id` column; RLS uses `org_id = auth.jwt() ->> 'org_id'` — the JWT claim returns null, every RLS check silently fails or blocks all reads/writes.
**Why it happens:** CONTEXT.md spec used `org_id` but the codebase established `tenant_id` from Phase 1.
**How to avoid:** Use `tenant_id` everywhere in the new table.
**Warning signs:** RLS tests return 0 rows; API calls return empty arrays.

### Pitfall 2: upsert() vs select-then-insert
**What goes wrong:** Using `.upsert()` on the `prospects` table causes race conditions (known issue, commit 83e674c fixed this).
**Why it happens:** The prospects table has multi-key deduplication logic that Supabase's upsert can't handle cleanly.
**How to avoid:** The `saved_search_prospects` join table has a single clean unique key `(saved_search_id, apollo_person_id)` — upsert IS appropriate here. Keep select-then-insert only for `prospects`.

### Pitfall 3: Apollo Response Shape for refresh diff
**What goes wrong:** Refresh diff compares `apollo_data.organization.name` but Apollo search previews populate `organization_name` (flat field) AND `organization.name` (nested), while the join table stores what the refresh util serializes.
**Why it happens:** Apollo response is inconsistently shaped; `ApolloPerson` has both `organization_name?: string` and `organization?: { name: string }`.
**How to avoid:** In `refresh.ts`, always normalize to `organization?.name ?? organization_name ?? ''` before storing and comparing.
**Warning signs:** Job/company-change detection always reports "no change" even when title changed.

### Pitfall 4: search-content.tsx is 826 Lines
**What goes wrong:** Adding more state and handlers to this component without extracting sub-components leads to re-render storms and maintenance nightmares.
**Why it happens:** CONCERNS.md already flags this as a performance risk. New state for `savedProspects`, `showDismissed`, `lastRefreshedAt`, `isRefreshing` compounds the issue.
**How to avoid:** Extract a `SavedSearchResultsArea` component that owns the new state rather than pushing all state into `SearchContent`.

### Pitfall 5: First Load vs Subsequent Load Race
**What goes wrong:** On page load, both `last_refreshed_at` check and Apollo call fire simultaneously; user sees stale + fresh data flickering.
**Why it happens:** Async load and URL state changes are not gated.
**How to avoid:** Check `last_refreshed_at` first; if null, run full refresh. If non-null, load from DB only. Make these sequential, not concurrent.

### Pitfall 6: Missing apolloPersonId in Inngest Event
**What goes wrong:** Enrichment sync hook in "finalize" step can't find the Apollo ID to update `saved_search_prospects`.
**Why it happens:** Current event payload doesn't include `apolloPersonId`.
**How to avoid:** In finalize step, look up `apollo_id` from `prospects` table using `prospectId` before running the sync update. This requires zero event schema changes.

---

## Code Examples

### Existing formatRelativeDate (to extend for "Last refreshed")
```typescript
// Source: src/app/[orgId]/search/components/prospect-results-table.tsx lines 6-19
function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}
// Extend for sub-day precision: add hours/minutes for "Last refreshed"
```

### Existing BulkActionsBar (exact current structure)
```typescript
// Source: src/app/[orgId]/search/components/bulk-actions-bar.tsx
// Current actions: Add to List | Export CSV | Enrich Selection
// New action: Dismiss Selected (destructive, after Enrich Selection)
// Pattern: add onDismiss?: () => void to interface + render conditionally
```

### Migration Naming Convention
```sql
-- File: supabase/migrations/20260405_saved_search_prospects.sql
-- Phase 28: Saved Search Incremental Refresh — join table + personas columns
-- NOTE: RLS policy configured in Supabase dashboard per project convention
```

### Inngest finalize step — enrichment sync location
```typescript
// Source: src/inngest/functions/enrich-prospect.ts — Step 6 "finalize"
// Insert BEFORE the existing logActivity call:
const { data: prospectRow } = await supabase
  .from('prospects')
  .select('apollo_id')
  .eq('id', prospectId)
  .single();

if (prospectRow?.apollo_id) {
  await supabase
    .from('saved_search_prospects')
    .update({ status: 'enriched', prospect_id: prospectId })
    .eq('apollo_person_id', prospectRow.apollo_id)
    .eq('tenant_id', tenantId);
}
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `org_id` in CONTEXT.md is a mistake; correct column name is `tenant_id` | Schema Finding | If wrong: migration works but RLS is broken — all queries return empty |
| A2 | The Supabase `upsert()` with `onConflict` is appropriate for the join table (safe because single-key unique constraint) | Architecture Patterns | If wrong: use select-then-update loop instead — works but slower for 500 rows |
| A3 | `formatRelativeDate` custom function should be extended for sub-day precision rather than adding date-fns | Standard Stack | Low risk — easy to implement either way |

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — all functionality uses existing Supabase + Inngest + React stack).

---

## Open Questions

1. **`org_id` vs `tenant_id` in the migration**
   - What we know: CONTEXT.md says `org_id`; every other table uses `tenant_id`; JWT carries `tenant_id`
   - What's unclear: Was `org_id` intentional (future rename) or a copy-paste from a different codebase?
   - Recommendation: Use `tenant_id` to match existing schema. If a rename is planned, do it as a separate phase.

2. **Persona → Saved Search rename in sidebar nav**
   - What we know: CONTEXT.md says rename user-facing strings; sidebar likely has "Personas" link
   - What's unclear: Which file controls the sidebar nav item label
   - Recommendation: Planner should locate sidebar nav component and add it to the rename task list.

3. **`search-content.tsx` refactoring scope**
   - What we know: File is 826 lines; CONCERNS.md flags it as a performance risk
   - What's unclear: Whether Phase 28 should refactor it or just extend it
   - Recommendation: Extract a `SavedSearchResultsArea` component to own the new state — this is minimal refactoring that prevents the file from reaching 1,200+ lines.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected (no jest.config, vitest.config, or pytest.ini found) |
| Config file | None found |
| Quick run command | N/A — no test runner configured |
| Full suite command | N/A |

### Phase Requirements — Test Map

| Behavior | Test Type | Notes |
|----------|-----------|-------|
| Refresh diff: new person inserts with is_new=true | unit | `src/lib/personas/refresh.ts` logic |
| Refresh diff: dismissed person without job change stays dismissed | unit | Same |
| Refresh diff: dismissed person WITH job change resurfaces | unit | Same |
| Dismiss updates status + dismissed_at | integration | Requires Supabase |
| Undo dismiss resets to active with is_new=false | integration | Same |
| Enrichment sync updates all matching rows | integration | Requires Inngest finalize step |

### Wave 0 Gaps
- No test infrastructure exists for this project. The spec deferred TESTING.md approach. Planner should not add test tasks unless explicitly asked.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | RLS on saved_search_prospects with tenant_id scope |
| V5 Input Validation | yes | Zod schemas on all new API routes |
| V6 Cryptography | no | N/A |
| V2 Authentication | yes (existing) | createClient() — user JWT already validated |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access via saved_search_id | Spoofing | RLS WHERE tenant_id = auth.jwt() ->> 'tenant_id' |
| Bulk dismiss of another tenant's prospects | Tampering | RLS + verify saved_search_id belongs to requesting tenant in route handler |
| Mass dismiss via API without confirmation | Tampering | Route handler validates `saved_search_id` ownership before bulk update |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/apollo/client.ts` — Apollo ID field is `p.id` (type: `string`); response shape confirmed
- `src/lib/apollo/types.ts` — `ApolloPerson.id: string`, `ApolloSearchPerson.id: string`
- `src/inngest/functions/enrich-prospect.ts` — finalize step location, event payload fields
- `src/app/[orgId]/search/components/bulk-actions-bar.tsx` — exact props interface
- `src/app/[orgId]/search/components/prospect-results-table.tsx` — formatRelativeDate, badge patterns
- `src/app/[orgId]/search/components/search-content.tsx` — state structure, existing bulk handlers
- `src/app/[orgId]/search/hooks/use-search.ts` — URL state with nuqs, Apollo fetch pattern
- `src/lib/supabase/server.ts` + `admin.ts` — two-client pattern
- `src/lib/personas/queries.ts` — persona query patterns, tenant scoping
- `supabase/migrations/*.sql` (all 4 files) — naming convention, RLS pattern, `IF NOT EXISTS` usage
- `src/types/database.ts` — `tenant_id` confirmed on all tables
- `.planning/config.json` — `nyquist_validation` key absent

### Secondary (MEDIUM confidence)
- `ARCHITECTURE.md` — enrichment pipeline flow, Inngest function structure
- `INTEGRATIONS.md` — Apollo cost model (search free, enrich credits)
- `CONCERNS.md` — search-content.tsx size risk, upsert race condition history

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json / import statements
- Architecture: HIGH — all patterns verified directly in source files
- Pitfalls: HIGH — schema mismatch and date-fns absence are hard facts from codebase

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable codebase, no fast-moving dependencies)
