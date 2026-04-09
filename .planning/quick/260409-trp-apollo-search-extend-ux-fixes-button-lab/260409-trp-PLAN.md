---
phase: 260409-trp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/[orgId]/search/components/search-content.tsx
  - src/lib/personas/refresh.ts
autonomous: true
requirements:
  - QUICK-260409-trp
---

<objective>
Apollo discover saved-search has a "Load 500 more leads" button that often returns
only ~9 new leads because Apollo's pagination overlaps across calls (non-deterministic
ordering). The button label lies about the yield, the toast doesn't explain the gap,
and the refresh action wastes Apollo credits by re-fetching deeply-extended pages
that rarely surface new data.

This plan ships three atomic, independently-committable fixes:
1. Rename the Load More button so the label promises a *page range*, not a *yield*.
2. Enrich the load-more toast so the user sees how many returned leads were already
   in their list (explains the gap honestly).
3. Cap refresh to the top PAGES_PER_REFRESH (5) pages regardless of extend depth,
   while preserving the apollo_pages_fetched high-water-mark so future extends
   continue from where the user left off.

Purpose: Restore user trust in the Load More flow and stop burning Apollo credits
on refresh operations that historically pulled 50+ pages.

Output: 3 small commits, no behavioral regressions to extend logic, no new UI
elements, no telemetry.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/[orgId]/search/components/search-content.tsx
@src/lib/personas/refresh.ts
@src/app/api/search/[searchId]/refresh/route.ts

<interfaces>
<!-- RefreshResult — returned by /api/search/[id]/extend, consumed by handleLoadMore -->
<!-- Source: src/lib/personas/refresh.ts:12-20 -->

```typescript
export interface RefreshResult {
  newProspects: number;       // genuinely new prospects added this call
  existingActive: number;
  existingEnriched: number;
  totalDismissed: number;
  resurfaced: number;
  totalFromApollo: number;    // unique leads Apollo returned in this call's page range
  apolloPagesFetched: number;
}
```

<!-- duplicates count = totalFromApollo - newProspects -->
<!-- handleLoadMore currently destructures only `newProspects`; Task 2 adds `totalFromApollo`. -->

<!-- Refresh constants (refresh.ts:7-10) -->
```typescript
const PAGES_PER_REFRESH = 5;
const PER_PAGE = 100;
const MAX_APOLLO_PAGE = 500;
```

<!-- High-water-mark preservation — the load-bearing line for Task 3's safety -->
<!-- Source: src/lib/personas/refresh.ts:87 -->
```typescript
const newApolloPagesFetched = Math.max(previousPagesFetched, lastPageReached);
```
This is what gets written to personas.apollo_pages_fetched at lines 255-263. Even
when refresh only scans pages 1-5, `previousPagesFetched` is passed through, so the
DB value never shrinks. Extend depth is preserved.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rename Load More button to honest page-range copy</name>
  <files>src/app/[orgId]/search/components/search-content.tsx</files>
  <action>
In src/app/[orgId]/search/components/search-content.tsx, inside the `isSavedSearchMode`
"Load 500 more" pagination block (around lines 963-1003), update the two button
label strings so the copy promises a page range instead of a yield count. Apollo's
pagination overlap means the old "500 more leads" label routinely lies — the new
copy describes what the action *does* (fetches the next 500 from Apollo) instead
of what it *delivers*.

Two changes only:

1. Around line 982 — change loading state text:
   - From: `Loading 500 more…`
   - To:   `Loading next 500…`

2. Around line 987 — change the default button label:
   - From: `Load 500 more leads`
   - To:   `Load next 500 from Apollo`

Do NOT touch:
- The `<Plus />` icon
- The `<Loader2 />` spinner
- Button styling, className, style props
- The visibility conditions on lines 964-968
- The "Showing X of Y total matches" footer text on lines 991-1001
- The handleLoadMore handler itself (Task 2 modifies that)
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && grep -n "Load next 500 from Apollo" src/app/[orgId]/search/components/search-content.tsx && grep -n "Loading next 500…" src/app/[orgId]/search/components/search-content.tsx && ! grep -n "Load 500 more leads" src/app/[orgId]/search/components/search-content.tsx && ! grep -n "Loading 500 more…" src/app/[orgId]/search/components/search-content.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>
- Both new strings ("Load next 500 from Apollo", "Loading next 500…") appear in search-content.tsx
- Both old strings ("Load 500 more leads", "Loading 500 more…") are gone
- `tsc --noEmit` passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Enhance handleLoadMore toast to surface duplicate count</name>
  <files>src/app/[orgId]/search/components/search-content.tsx</files>
  <action>
In src/app/[orgId]/search/components/search-content.tsx, modify the `handleLoadMore`
callback (around lines 202-223) so the toast description tells the user how many of
the returned leads were *already* in their list. The API endpoint
`/api/search/[id]/extend` returns a `RefreshResult` (defined in
src/lib/personas/refresh.ts:12-20). The frontend currently reads only
`result.newProspects`; we need to also read `result.totalFromApollo` so we can
compute `duplicates = totalFromApollo - newProspects`.

Replace the current `toast({ ... })` block (lines 210-216) with the three-branch
logic below. Keep the title untouched. Only the `description` field changes.

Three branches:

1. **`newProspects > 0` AND `duplicates > 0`** — duplicates exist; explain them:
   ```
   `${duplicates.toLocaleString()} already in your list · Now showing ${total.toLocaleString()} leads.`
   ```

2. **`newProspects > 0` AND `duplicates === 0`** — clean fetch; keep current copy:
   ```
   `Now showing ${total.toLocaleString()} leads.`
   ```

3. **`newProspects === 0`** — preserve existing copy verbatim:
   ```
   "Apollo returned no additional unique leads for the next page range."
   ```

Compute `total` and `duplicates` as locals before the toast call, using the same
arithmetic as today (`total = result.newProspects + savedProspects.length`):

```ts
const total = result.newProspects + savedProspects.length;
const duplicates = Math.max(0, (result.totalFromApollo ?? 0) - result.newProspects);
```

(The `Math.max(0, ...)` guard handles the edge case where `totalFromApollo` is
unexpectedly missing or smaller than `newProspects` — defensive but cheap.)

Then write the description as a nested ternary or computed string — match the
existing code style (which uses an inline ternary in the toast call). Keep the
title unchanged: `result.newProspects > 0 ? \`+${result.newProspects} new leads loaded\` : "No new leads found"`.

Do NOT:
- Add a new field to the toast (no `variant`, no action button)
- Change the title logic
- Touch the catch block, finally block, or `setIsLoadingMore`
- Modify the `loadSavedProspects(id)` call
- Refactor to a separate helper function — keep it inline, ~5-10 lines
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && grep -n "totalFromApollo" src/app/[orgId]/search/components/search-content.tsx && grep -n "duplicates" src/app/[orgId]/search/components/search-content.tsx && grep -n "already in your list" src/app/[orgId]/search/components/search-content.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>
- `handleLoadMore` references `result.totalFromApollo` and computes `duplicates`
- Toast description uses three-branch logic (duplicates > 0, clean, no new)
- The "already in your list" copy appears in the file
- Existing "Apollo returned no additional unique leads…" copy is still present
- `tsc --noEmit` passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Cap refresh to PAGES_PER_REFRESH and update JSDoc</name>
  <files>src/lib/personas/refresh.ts</files>
  <action>
In src/lib/personas/refresh.ts, update `refreshSavedSearchProspects` (lines 280-305)
so it always re-fetches only the top `PAGES_PER_REFRESH` (5) pages, regardless of how
deep extend has previously pulled. This stops burning Apollo credits on refresh-time
re-scans of pages 6-50+, where Apollo's top-results-change-rate is dramatically
lower than pages 1-5.

**Safety guarantee (do not break this):** Line 87 inside `fetchAndUpsertApolloRange`
computes `const newApolloPagesFetched = Math.max(previousPagesFetched, lastPageReached);`
and that value is what gets written to `personas.apollo_pages_fetched` at lines
255-263. So even when refresh now only scans pages 1-5, the DB high-water-mark is
preserved via `previousPagesFetched` flowing through. Future extends will still
correctly start from `currentPagesFetched + 1`. **Verify line 87 still reads as
above before committing — if it does not, STOP and surface the discrepancy.**

Two changes only:

1. **Line 296** — replace `endPage` computation:
   - From: `const endPage = Math.max(PAGES_PER_REFRESH, previousPagesFetched);`
   - To:   `const endPage = PAGES_PER_REFRESH;`

2. **Lines 276-279** — update the JSDoc on `refreshSavedSearchProspects` to
   reflect the new behavior. Replace the existing block:
   ```ts
   /**
    * Refreshes a saved search — re-fetches pages 1..max(5, previousPagesFetched)
    * so previously extended results stay tracked. Updates last_refreshed_at.
    */
   ```
   with:
   ```ts
   /**
    * Refreshes a saved search — re-fetches the top PAGES_PER_REFRESH pages
    * (regardless of how deep extend has pulled) to check for newly-ranked
    * results. Extend depth is preserved via apollo_pages_fetched, which is
    * computed as max(previousPagesFetched, lastPageReached) at the upsert
    * step, so future extends still start from the correct page.
    * Updates last_refreshed_at.
    */
   ```

Do NOT touch:
- Line 87 (`Math.max(previousPagesFetched, lastPageReached)`) — load-bearing
- Lines 255-263 (the `personaUpdate` write that persists `apollo_pages_fetched`)
- `extendSavedSearchProspects` (lines 312-350) — extend logic is correct as-is
- `fetchAndUpsertApolloRange` internals
- The `previousPagesFetched` argument still being passed at line 303 — it must
  continue to flow through so the high-water-mark logic at line 87 still works
- The `PAGES_PER_REFRESH` constant value (still 5)
- The refresh route at src/app/api/search/[searchId]/refresh/route.ts — no caller
  changes are needed; the function signature is unchanged
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && grep -n "const endPage = PAGES_PER_REFRESH;" src/lib/personas/refresh.ts && ! grep -n "const endPage = Math.max(PAGES_PER_REFRESH, previousPagesFetched)" src/lib/personas/refresh.ts && grep -n "Math.max(previousPagesFetched, lastPageReached)" src/lib/personas/refresh.ts && grep -n "regardless of how deep extend has pulled" src/lib/personas/refresh.ts && npx tsc --noEmit</automated>
  </verify>
  <done>
- Line 296 reads `const endPage = PAGES_PER_REFRESH;`
- The old `Math.max(PAGES_PER_REFRESH, previousPagesFetched)` is gone from refresh.ts
- Line 87's `Math.max(previousPagesFetched, lastPageReached)` is intact
- JSDoc on `refreshSavedSearchProspects` updated to mention the cap and
  high-water-mark preservation
- `tsc --noEmit` passes
- The refresh route caller (src/app/api/search/[searchId]/refresh/route.ts) still
  compiles without modification
  </done>
</task>

</tasks>

<verification>
After all three tasks land:

1. `npx tsc --noEmit` passes for the whole project
2. The Load More button visible in the saved-search view reads "Load next 500
   from Apollo" (manual visual check optional — `tsc` + grep is sufficient)
3. The combined grep set passes:
   ```bash
   grep -n "Load next 500 from Apollo" src/app/[orgId]/search/components/search-content.tsx
   grep -n "Loading next 500…" src/app/[orgId]/search/components/search-content.tsx
   grep -n "totalFromApollo" src/app/[orgId]/search/components/search-content.tsx
   grep -n "already in your list" src/app/[orgId]/search/components/search-content.tsx
   grep -n "const endPage = PAGES_PER_REFRESH;" src/lib/personas/refresh.ts
   grep -n "Math.max(previousPagesFetched, lastPageReached)" src/lib/personas/refresh.ts
   ```
   All six lines must produce a hit.
4. The negative grep set passes (no hits):
   ```bash
   ! grep -n "Load 500 more leads" src/app/[orgId]/search/components/search-content.tsx
   ! grep -n "Loading 500 more…" src/app/[orgId]/search/components/search-content.tsx
   ! grep -n "Math.max(PAGES_PER_REFRESH, previousPagesFetched)" src/lib/personas/refresh.ts
   ```
</verification>

<success_criteria>
- Button label is honest about what the action fetches (page range, not yield)
- Toast tells the user when Apollo returned overlap so the gap is no longer mysterious
- Refresh action scans only top 5 pages, never more — Apollo credit burn on refresh
  is bounded regardless of extend depth
- `apollo_pages_fetched` high-water-mark is preserved (extend still resumes correctly)
- Zero changes to extend logic, zero new UI, zero telemetry, zero refactors
- Three atomic commits, each independently revertable
- `tsc --noEmit` passes after each task
</success_criteria>

<output>
After completion, create
`.planning/quick/260409-trp-apollo-search-extend-ux-fixes-button-lab/260409-trp-SUMMARY.md`
documenting:
- Exact line ranges modified in each file
- Before/after snippets for each of the three changes
- Confirmation that line 87 of refresh.ts is untouched
- Result of final `tsc --noEmit` run
</output>
