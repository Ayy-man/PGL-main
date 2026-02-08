---
phase: 02-persona-search-lists
plan: 05
subsystem: ui
tags: [search-ui, tanstack-table, nuqs, url-state, pagination, data-table, apollo, shadcn-ui]

# Dependency graph
requires:
  - phase: 02-02
    provides: Persona types, getPersonas query for dropdown population
  - phase: 02-03
    provides: Apollo search API route (POST /api/search/apollo) with rate limiting and caching
  - phase: 02-04
    provides: List types and queries for future "Add to List" integration
provides:
  - Search page with persona-based prospect discovery UI
  - Reusable DataTable component with server-side pagination and sorting
  - DataTablePagination component with page navigation controls
  - useSearch hook with URL state management via nuqs
  - PersonaSelector dropdown with grouped starter and custom personas
  - SearchResultsTable with 7 columns and sortable headers
affects: [02-06, 02-07, prospect-profile, add-to-list]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component page → client wrapper pattern for search with URL state"
    - "nuqs useQueryStates for shareable/bookmarkable search URLs"
    - "Generic DataTable<TData, TValue> with manualPagination and manualSorting"
    - "0-indexed internal pagination, 1-indexed URL params"
    - "AbortController for cancelling in-flight search requests"

key-files:
  created:
    - src/components/ui/data-table/data-table.tsx
    - src/components/ui/data-table/data-table-pagination.tsx
    - src/app/(dashboard)/[orgId]/search/hooks/use-search.ts
    - src/app/(dashboard)/[orgId]/search/page.tsx
    - src/app/(dashboard)/[orgId]/search/components/persona-selector.tsx
    - src/app/(dashboard)/[orgId]/search/components/search-results-table.tsx
    - src/app/(dashboard)/[orgId]/search/components/search-toolbar.tsx
    - src/app/(dashboard)/[orgId]/search/components/search-content.tsx
  modified: []

key-decisions:
  - "Server component fetches personas, client wrapper manages search state and rendering"
  - "Page param 1-indexed in URL (user-friendly), 0-indexed internally (TanStack convention)"
  - "AbortController cancels previous requests when new search triggered"
  - "Add to List button disabled/stubbed for wiring in Plan 06"
  - "100ms debounce on search execution to prevent double-fires from URL state updates"

patterns-established:
  - "Reusable DataTable pattern: generic component accepting columns, data, pagination, and sorting props"
  - "URL state management: useQueryStates with parseAsString/parseAsInteger for shareable search state"
  - "Search hook pattern: useSearch() encapsulates fetch, abort, pagination, error handling"
  - "Persona selector groups: starter personas first, custom second, with filter summary text"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 02 Plan 05: Search Results UI Summary

**Paginated search results table with TanStack Table, persona selector dropdown, URL state via nuqs, and reusable DataTable components**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T13:16:43Z
- **Completed:** 2026-02-08T13:20:26Z
- **Tasks:** 2
- **Files modified:** 8 created

## Accomplishments
- Reusable DataTable component with server-side pagination and sorting via TanStack Table
- Search page with persona selector dropdown (grouped starter/custom personas with filter summaries)
- 7-column results table: name, title, company, location, email status, phone, actions
- URL state persistence via nuqs (persona, page, sortBy, sortOrder) — search URLs are shareable and bookmarkable
- Loading skeletons, empty states, error states with retry button
- Cache indicator badge with refresh option in toolbar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reusable data table components and search hook with URL state** - `380be37` (feat)
2. **Task 2: Create search page, persona selector, and results table** - `3d05f9c` (feat)

## Files Created/Modified

**Created:**
- `src/components/ui/data-table/data-table.tsx` - Generic DataTable with TanStack Table, skeleton loading, sort indicators
- `src/components/ui/data-table/data-table-pagination.tsx` - Page navigation with first/prev/next/last buttons, gold accent on active page
- `src/app/(dashboard)/[orgId]/search/hooks/use-search.ts` - useSearch hook with nuqs URL state, fetch, abort, debounce
- `src/app/(dashboard)/[orgId]/search/page.tsx` - Server component shell with auth and persona fetching
- `src/app/(dashboard)/[orgId]/search/components/search-content.tsx` - Client wrapper orchestrating search state and rendering
- `src/app/(dashboard)/[orgId]/search/components/persona-selector.tsx` - Persona dropdown with grouped options and filter summaries
- `src/app/(dashboard)/[orgId]/search/components/search-results-table.tsx` - Results table with 7 columns, sorting, pagination
- `src/app/(dashboard)/[orgId]/search/components/search-toolbar.tsx` - Toolbar with persona selector, cache badge, result count

## Decisions Made

1. **SearchContent client wrapper:** Created a separate `search-content.tsx` client component as the bridge between server component (page.tsx) and hooks. Page fetches data server-side, SearchContent manages client-side state.

2. **Page index convention:** URL uses 1-indexed pages (human-friendly: `?page=3`) but TanStack Table uses 0-indexed internally. Conversion happens at the SearchResultsTable boundary.

3. **AbortController for request cancellation:** Previous in-flight requests are cancelled when a new search is triggered, preventing race conditions with stale responses overwriting newer results.

4. **Add to List stubbed:** The actions column has a disabled "Add to List" button with tooltip. This will be wired to actual list selection in Plan 06 (Add to List flow).

5. **100ms debounce on search:** Prevents double-firing when nuqs updates multiple URL params simultaneously (e.g., persona change triggers page reset).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused variable in use-search.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** `const data = await response.json()` in the 429 error handler was assigned but never used, causing ESLint error
- **Fix:** Removed the unused assignment; Retry-After header was already being read from response headers
- **Files modified:** `src/app/(dashboard)/[orgId]/search/hooks/use-search.ts`
- **Verification:** `pnpm build` compiles search files without lint errors
- **Committed in:** 3d05f9c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor lint fix. No functional impact.

## Issues Encountered

**Pre-existing ESLint errors in Phase 1 files:** Build fails due to unused variables in `src/app/[orgId]/page.tsx`, `src/middleware.ts`, and `src/app/admin/users/page.tsx`. These are not from this plan and do not affect the search page. All search-related files compile cleanly.

## User Setup Required

None - search UI components consume the existing `/api/search/apollo` route created in Plan 02-03. Apollo API key must already be configured (from 02-03 setup).

## Next Phase Readiness

**Ready for 02-06 (Add to List):**
- "Add to List" button column exists in results table (disabled stub)
- useSearch hook returns results with Apollo person IDs for list membership
- SearchResultsTable accepts setSearchState for state management

**Ready for prospect profile:**
- Name column can be linked to `/[orgId]/prospects/[id]` when profile page exists
- Company column can show organization links

**No blockers or concerns.**

---
*Phase: 02-persona-search-lists*
*Completed: 2026-02-08*
