# Deferred Items - Plan 09-03

## Out-of-scope pre-existing TypeScript errors

**File:** `src/app/[orgId]/page.tsx` (dashboard page — not touched by plan 09-03)
**Errors:**
- TS2339: Property 'catch' does not exist on type 'PromiseLike<{ count: number | null; }>' (line 81)
- TS2339: Property 'catch' does not exist on type 'PromiseLike<{...}>' (line 119)
**Note:** These errors are from pre-existing uncommitted changes in the dashboard page. Plan 09-03 only modified `page.tsx` for the prospect profile page and `profile-view.tsx`. These should be addressed in the dashboard plan (Phase 11 or plan cleanup).
