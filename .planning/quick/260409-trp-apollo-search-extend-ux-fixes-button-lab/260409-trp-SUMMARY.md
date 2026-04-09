---
phase: 260409-trp
plan: 01
completed: 2026-04-09
duration: ~8 min
tasks_completed: 3
files_modified: 2
---

# Quick Task 260409-trp: Apollo Search Extend UX Fixes + Button Label

**One-liner:** Rename Load More button to honest page-range copy, surface duplicate count in toast, cap refresh to top 5 pages regardless of extend depth.

## Commits

| Hash | Change |
|------|--------|
| e40d8c3 | Task 1 — renamed button labels: "Load 500 more leads" → "Load next 500 from Apollo", "Loading 500 more…" → "Loading next 500…" |
| 0941952 | Task 2 — enhanced handleLoadMore toast: reads totalFromApollo, computes duplicates, three-branch description showing overlap count |
| 281962c | Task 3 — capped refreshSavedSearchProspects endPage to PAGES_PER_REFRESH (5), updated JSDoc; line 87 high-water-mark logic untouched |

## Files Modified

- `src/app/[orgId]/search/components/search-content.tsx` — Tasks 1 & 2 (lines 982, 987, 209-220)
- `src/lib/personas/refresh.ts` — Task 3 (lines 276-283 JSDoc, line 300 endPage)

## Line 87 Confirmation

`src/lib/personas/refresh.ts:87` reads exactly:
```ts
const newApolloPagesFetched = Math.max(previousPagesFetched, lastPageReached);
```
Untouched. High-water-mark preservation is intact.

## tsc Result

`npx tsc --noEmit` produced zero errors in search-content.tsx or refresh.ts after each task.

## Unexpected Findings

None. All three changes were straightforward; no deviations from the plan were required.

## Known Stubs

None.
