---
phase: 32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas
fixed_at: 2026-04-08T00:00:00Z
review_path: .planning/phases/32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas/32-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 32: Code Review Fix Report

**Fixed at:** 2026-04-08  
**Source review:** .planning/phases/32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas/32-REVIEW.md  
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical, 4 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Net Worth filter overwrites NL keywords field

**Files modified:** `src/lib/personas/types.ts`, `src/app/[orgId]/search/components/filter-pills-row.tsx`  
**Commit:** 482477b  
**Applied fix:** Added `net_worth_range?: string` field to the `PersonaFilters` interface, then updated `filter-pills-row.tsx` to set `filters.net_worth_range = netWorth.trim()` instead of `filters.keywords = netWorth.trim()`. The user's NL query in `keywords` is no longer overwritten when a net-worth pill is applied.

---

### WR-01: Enter key fires search on empty input in NLSearchBar

**Files modified:** `src/app/[orgId]/search/components/nl-search-bar.tsx`  
**Commit:** ba704e7  
**Applied fix:** Wrapped the `onSearch(value.trim())` call inside `handleKeyDown` with a `if (value.trim())` guard, matching the existing behaviour of the submit button's `disabled` prop. Pressing Enter on an empty textarea now does nothing.

---

### WR-02: Duplicate suggested-persona cards rendered simultaneously

**Files modified:** `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx`  
**Commit:** e88458f  
**Applied fix:** Replaced the empty-state branch in `SavedSearchShortcutList` (which rendered 3 hardcoded `SUGGESTED_PERSONAS` cards) with `return null`, deferring to the canonical `SuggestedPersonasSection` rendered by `DiscoverTab`. Also removed the now-unused `SUGGESTED_PERSONAS` constant and `SuggestionCard` component to keep the file clean.

---

### WR-03: Sidebar hover style lost on React re-render

**Files modified:** `src/components/layout/sidebar.tsx`  
**Commit:** 82e6cd5  
**Applied fix:** Added a `toggleHovered` React state variable. Replaced the imperative `onMouseEnter`/`onMouseLeave` handlers that mutated `e.currentTarget.style` directly with handlers that call `setToggleHovered(true/false)`. The button's `style` prop now reads `toggleHovered` to derive `background` and `border` values declaratively, so React re-renders correctly reflect hover state.

---

### WR-04: `getUser()` auth error silently ignored

**Files modified:** `src/app/[orgId]/layout.tsx`  
**Commit:** 0ed3496  
**Applied fix:** Destructured `error: authError` from `supabase.auth.getUser()` and added a `console.error("[TenantLayout] Auth error:", authError.message)` log before the `!user` redirect check. Auth failures are now visible in server logs and distinguishable from a simple "not logged in" case.

---

_Fixed: 2026-04-08_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
