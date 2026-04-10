---
phase: 36-fix-nlp-search-flow-issues-25-bugs-from-5-agent-audit
verified: 2026-04-10T18:00:00Z
status: gaps_found
score: 18/19 must-haves verified
overrides_applied: 0
gaps:
  - truth: "pnpm build completes without errors (all 4 plans' output compiles)"
    status: failed
    reason: "filterOverrides is referenced on lines 1103 and 1185 of search-content.tsx but is NOT destructured from the useSearch() hook on lines 104-113. Only setFilterOverrides is destructured. TypeScript reports: 'Cannot find name filterOverrides. Did you mean setFilterOverrides?' The build exits with code 1."
    artifacts:
      - path: "src/app/[orgId]/search/components/search-content.tsx"
        issue: "Lines 104-113 destructure `setFilterOverrides` but omit `filterOverrides` from useSearch() return. Lines 1103 and 1185 reference the undeclared variable."
    missing:
      - "Add `filterOverrides` to the useSearch() destructure: change `{ searchState, setSearchState, results, pagination, isLoading, error, executeSearch, setFilterOverrides }` to `{ searchState, setSearchState, results, pagination, isLoading, error, executeSearch, filterOverrides, setFilterOverrides }`"
---

# Phase 36: Fix NLP Search Flow Issues Verification Report

**Phase Goal:** Fix 25 bugs identified by a 5-agent audit of the NLP search flow. Server-side hardening (rate limiting, query length guard, timeout, enum validation), core hook fixes (double API call, parse cache, stale filter clearing, pageSize mismatch), Discover tab UX (auto-submit, loading states, width consistency, clear button), and search orchestrator fixes (save dialog pre-fill, mode guards, auto-scroll, pagination).
**Verified:** 2026-04-10T18:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | parse-query route rejects queries longer than 1000 characters with 400 | VERIFIED | `route.ts` line 96-102: `if (query && query.length > 1000)` returns 400 |
| 2 | parse-query route rate limits at 20 requests per minute per tenant | VERIFIED | `limiters.ts` lines 54-59: `parseQueryRateLimiter` slidingWindow(20, "1 m"). `route.ts` lines 127-137 applies it with 429 + Retry-After header |
| 3 | OpenRouter fetch call aborts after 15 seconds | VERIFIED | `openrouter.ts` line 69: `signal: AbortSignal.timeout(15_000)` on the fetch call |
| 4 | LLM max_tokens is 1000 for complex queries | VERIFIED | `route.ts` line 153: `chatCompletion(SYSTEM_PROMPT, query.trim(), 1000)` |
| 5 | Parsed seniority/industry values are validated against known Apollo enums | VERIFIED | `route.ts` lines 35-78: VALID_SENIORITIES and VALID_INDUSTRIES Sets defined. Lines 173-189: filter applied post-parse, deletes key if all values invalid |
| 6 | Submitting a search fires exactly one API call, not two | VERIFIED | `search-content.tsx` lines 1106-1110: `onSubmitSearch` is an explicit no-op comment. Search fires only via `useSearch` `useEffect` debounce |
| 7 | Page navigation does not re-run the NL parse LLM call | VERIFIED | `use-search.ts` line 71: `parseCacheRef = useRef<Map<string, Partial<PersonaFiltersType>>>(new Map())`. Lines 114-138: cache lookup before fetch, `parseCacheRef.current.set` on miss |
| 8 | Clearing keywords also clears any NLP-parsed filter overrides | VERIFIED | `use-search.ts` lines 259-267: `handleSetSearchState` calls `setFilterOverrides({})` when `keywordsChanged` is true |
| 9 | Advanced Filters Clear button resets net_worth_range | VERIFIED | `advanced-filters-panel.tsx` lines 46-58: `handleClear` includes `net_worth_range: undefined` in the `onApplyFilters` call |
| 10 | Pagination display uses consistent page size of 25 | VERIFIED | `use-search.ts` line 8: `export const PAGE_SIZE = 25`. Used in initial state, reset path, fetch body, and setPagination fallback |
| 11 | FilterPillsRow and AdvancedFiltersPanel accept optional currentFilters prop | VERIFIED | `filter-pills-row.tsx` line 11: `currentFilters?: Partial<PersonaFilters>`. `advanced-filters-panel.tsx` line 11: same. Both have useEffect syncing from prop |
| 12 | Clicking a suggested persona fills the search bar AND auto-submits the search | VERIFIED | `discover-tab.tsx` lines 49-54: `handlePrefill` calls `setPrefillValue(query)`, `onNLSearch(query)`, and `onSubmitSearch()` |
| 13 | Enter key on search bar is blocked when isLoading is true | VERIFIED | `nl-search-bar.tsx` lines 44-49: `handleKeyDown` checks `!isLoading` before calling `onSearch` |
| 14 | Send button shows a spinner when isLoading | VERIFIED | `nl-search-bar.tsx` lines 144-148: renders `<Loader2 className="h-4 w-4 animate-spin" />` when `isLoading` |
| 15 | Discovery sections hide when search results are displaying | VERIFIED | `discover-tab.tsx` lines 149-163: `SavedSearchShortcutList` and `SuggestedPersonasSection` wrapped in `{!hasResults && (...)}` |
| 16 | Results container uses max-w-[960px] for consistent width | VERIFIED | `discover-tab.tsx` line 57: `className="page-enter max-w-[960px] mx-auto px-4 pt-12 pb-8"` |
| 17 | prefillValue syncs when keywords prop changes externally | VERIFIED | `discover-tab.tsx` lines 44-47: `useEffect(() => { setPrefillValue(keywords); }, [keywords])` |
| 18 | Save this search dialog opens pre-filled with current keywords and filter overrides | VERIFIED | `persona-form-dialog.tsx` lines 113-114: `initialKeywords?` and `initialFilterOverrides?` props. Lines 146-158: useEffect applies filter overrides on open. Lines 160-165: useEffect syncs keywords. `search-content.tsx` lines 1184-1185 passes both |
| 19 | pnpm build completes without errors (implicit from plan success_criteria) | FAILED | `search-content.tsx` references undeclared variable `filterOverrides` on lines 1103 and 1185. `filterOverrides` is not destructured from `useSearch()` (only `setFilterOverrides` is). TypeScript error: "Cannot find name 'filterOverrides'. Did you mean 'setFilterOverrides'?" Build exits with code 1. |

**Score:** 18/19 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/rate-limit/limiters.ts` | parseQueryRateLimiter export | VERIFIED | Lines 54-59: correctly defined as slidingWindow(20, "1 m") |
| `src/app/api/search/parse-query/route.ts` | Rate-limited, length-guarded, enum-validated endpoint | VERIFIED | All 5 bugs (H4, H5, L6, M12 seniorities, M12 industries) implemented |
| `src/lib/ai/openrouter.ts` | AbortSignal.timeout on fetch | VERIFIED | Line 69: `signal: AbortSignal.timeout(15_000)` |
| `src/app/[orgId]/search/hooks/use-search.ts` | parseCacheRef, PAGE_SIZE export, filter clearing | VERIFIED | parseCacheRef (line 71), PAGE_SIZE exported (line 8), keywordsChanged clears filterOverrides (line 265-267) |
| `src/app/[orgId]/search/components/advanced-filters-panel.tsx` | net_worth_range in handleClear, currentFilters prop | VERIFIED | handleClear includes net_worth_range: undefined; currentFilters prop + useEffect present |
| `src/app/[orgId]/search/components/filter-pills-row.tsx` | currentFilters prop | VERIFIED | Prop defined and useEffect syncing implemented |
| `src/app/[orgId]/search/components/nl-search-bar.tsx` | isLoading guard, Loader2 spinner, onClear prop | VERIFIED | All three implemented correctly |
| `src/app/[orgId]/search/components/discover-tab.tsx` | hasResults gate, 960px width, auto-submit, currentFilters pass-through | VERIFIED | All implemented; currentFilters threaded to both FilterPillsRow and AdvancedFiltersPanel |
| `src/app/[orgId]/search/components/search-content.tsx` | PAGE_SIZE import, initialKeywords/filterOverrides wiring, no-op onSubmitSearch | STUB/BROKEN | Imports PAGE_SIZE correctly (line 10). Passes initialKeywords (line 1184). But `filterOverrides` is referenced without being declared — TypeScript build failure |
| `src/app/[orgId]/personas/components/persona-form-dialog.tsx` | initialKeywords and initialFilterOverrides props | VERIFIED | Lines 113-114: props defined. Lines 146-165: useEffect hooks implement pre-fill logic |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `search/parse-query/route.ts` | `lib/rate-limit/limiters.ts` | import parseQueryRateLimiter | VERIFIED | Line 4: `import { parseQueryRateLimiter } from "@/lib/rate-limit/limiters"` |
| `lib/ai/openrouter.ts` | OpenRouter API | fetch with timeout signal | VERIFIED | Line 69: signal on fetch options object |
| `use-search.ts` | /api/search/parse-query | fetch with parseCacheRef lookup | VERIFIED | Lines 114-138: cache check precedes fetch |
| `use-search.ts` | filterOverrides state | clear on keyword change | VERIFIED | Lines 259-267: `setFilterOverrides({})` in handleSetSearchState |
| `suggested-personas-section.tsx` | `discover-tab.tsx` | onPrefillAndSearch callback | VERIFIED | `handlePrefill` in discover-tab.tsx is the callback — calls onNLSearch + onSubmitSearch |
| `nl-search-bar.tsx` | `discover-tab.tsx` | onClear callback | VERIFIED | discover-tab.tsx line 112: `onClear={onClearSearch}` passed to NLSearchBar |
| `search-content.tsx` | `use-search.ts` | import PAGE_SIZE | VERIFIED | Line 10: `import { useSearch, PAGE_SIZE } from "../hooks/use-search"` |
| `search-content.tsx` | PersonaFormDialog | initialKeywords and initialFilterOverrides props | BROKEN | `initialKeywords` correctly wired (line 1184). `initialFilterOverrides={filterOverrides}` (line 1185) references undeclared `filterOverrides` — build fails |
| `discover-tab.tsx` | FilterPillsRow + AdvancedFiltersPanel | currentFilters={currentFilters} pass-through | VERIFIED | discover-tab.tsx lines 116 and 120: both components receive currentFilters |
| `search-content.tsx` | discover-tab.tsx | currentFilters={filterOverrides} | BROKEN | `currentFilters={filterOverrides}` (line 1103) references undeclared `filterOverrides` — build fails |

### Behavioral Spot-Checks

Step 7b: SKIPPED — build does not compile; runtime checks are not possible.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PHASE-36 | All 4 plans | Bug-fix phase reference (not a REQUIREMENTS.md v1 ID) | PARTIAL | PHASE-36 is a ROADMAP-only tag with no REQUIREMENTS.md entry. All mapped v1 requirements (SRCH-07, INFRA-03) remain satisfied. Phase patches behavior, does not add new requirement coverage. The bug fix surface is complete except for the build-breaking filterOverrides declaration gap. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `search-content.tsx` | 1103 | `currentFilters={filterOverrides}` — `filterOverrides` undeclared | Blocker | TypeScript build fails with "Cannot find name 'filterOverrides'". The L4 filter sharing truth and the H3 save-dialog pre-fill truth both break because `filterOverrides` is never bound. Fix: add `filterOverrides` to useSearch() destructure |
| `search-content.tsx` | 1185 | `initialFilterOverrides={filterOverrides}` — same undeclared variable | Blocker | Same root cause as line 1103. `PersonaFormDialog` never receives filter overrides from NLP parse |

### Human Verification Required

The following behaviors require human testing (cannot verify programmatically without a running server):

**1. NL Search Single-Fire Verification**

**Test:** Open the Search page, type a multi-word natural language query (e.g. "CFOs at tech companies in NYC"), and press Enter or click the send button.
**Expected:** Exactly one network request to `/api/search/apollo` appears in DevTools Network tab. No second call fires.
**Why human:** Cannot trace browser network activity from static code inspection.

**2. Page Navigation Cache Hit**

**Test:** After running a keyword search, navigate to page 2 using pagination. Check the Network tab.
**Expected:** No request to `/api/search/parse-query` on page 2 — the cached parse result is reused.
**Why human:** Cache hit/miss behavior is runtime state.

**3. Suggested Persona Auto-Submit**

**Test:** Click a card in the "Suggested Searches" section on the Discover tab.
**Expected:** The search bar fills with the persona's query string AND a search executes immediately without requiring a manual Enter press.
**Why human:** UI interaction behavior.

**4. Loading Spinner on Send Button**

**Test:** Type a query and click the send button. Observe the button while search is in flight.
**Expected:** The ArrowUp icon is replaced by a spinning Loader2 icon for the duration of the search.
**Why human:** Visual, timing-dependent UI state.

**5. Discovery Sections Hide on Results**

**Test:** Run a keyword search that returns results.
**Expected:** The "Saved Searches" shortcut list and "Suggested Searches" sections are no longer visible while results are displayed.
**Why human:** Conditional rendering visible only at runtime.

---

## Gaps Summary

**One critical build-breaking gap** was found despite all code logic appearing correct.

The `filterOverrides` value is returned from the `useSearch()` hook (confirmed in `use-search.ts` return object, line 283), but `search-content.tsx` destructures only `setFilterOverrides` from the hook (lines 104-113). This means:

1. `currentFilters={filterOverrides}` on line 1103 (the L4 filter sharing wiring to DiscoverTab) references an undeclared variable.
2. `initialFilterOverrides={filterOverrides}` on line 1185 (the H3 save-dialog pre-fill) references the same undeclared variable.

**TypeScript confirms the failure:** `Type error: Cannot find name 'filterOverrides'. Did you mean 'setFilterOverrides'?`

**The fix is a one-line change:** Add `filterOverrides` to the destructure on line 104:

```typescript
const {
  searchState,
  setSearchState,
  results,
  pagination,
  isLoading,
  error,
  executeSearch,
  filterOverrides,        // ← add this
  setFilterOverrides,
} = useSearch();
```

All 18 other must-haves are fully verified in the codebase. This single oversight prevents the build from compiling and blocks the L4 (currentFilters threading) and H3 (save dialog pre-fill with filter overrides) goals from functioning at runtime, even though both the hook output and the receiving components are correctly implemented.

---

_Verified: 2026-04-10T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
