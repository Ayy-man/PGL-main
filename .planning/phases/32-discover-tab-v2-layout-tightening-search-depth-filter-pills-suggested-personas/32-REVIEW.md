---
phase: 32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas
reviewed: 2026-04-08T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/app/[orgId]/layout.tsx
  - src/app/[orgId]/search/components/discover-tab.tsx
  - src/app/[orgId]/search/components/filter-pills-row.tsx
  - src/app/[orgId]/search/components/nl-search-bar.tsx
  - src/app/[orgId]/search/components/saved-search-shortcut-list.tsx
  - src/app/[orgId]/search/components/suggested-personas-section.tsx
  - src/components/layout/nav-items.tsx
  - src/components/layout/sidebar.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-04-08  
**Depth:** standard  
**Files Reviewed:** 8  
**Status:** issues_found

## Summary

Reviewed the Phase 32 Discover Tab v2 polish changes: the new `DiscoverTab` orchestrator, `FilterPillsRow`, `NLSearchBar`, `SavedSearchShortcutList`, `SuggestedPersonasSection`, and the supporting `Sidebar`/`NavItems` layout components.

The search UI is well-structured and visually consistent. One critical logic bug was found in `FilterPillsRow` where applying a net-worth filter silently overwrites the user's natural-language keywords. Four warnings cover: an Enter-key search firing on empty input, duplicate suggested-persona cards rendering simultaneously, a hover state that can be lost on re-render, and `getUser()` error silently ignored. Three info items cover icon deduplication, hardcoded prospect counts, and stale `prefillValue` on external `keywords` prop changes.

---

## Critical Issues

### CR-01: Net Worth filter overwrites NL keywords field

**File:** `src/app/[orgId]/search/components/filter-pills-row.tsx:55-58`  
**Issue:** When the net worth pill is applied, the code sets `filters.keywords = netWorth.trim()`. The `keywords` field in `PersonaFilters` is the same field that holds the user's natural-language search query typed in the `NLSearchBar`. If a user types a query (e.g., "hedge fund managers in Miami") and then opens the Net Worth pill and clicks Apply, `onApplyFilters` is called with `{ keywords: "net worth $5M to $25M" }`. Depending on how the parent merges filters, this can silently replace the NL query with only the net-worth string.

**Fix:** Use a dedicated filter field for net-worth (e.g., `net_worth_range`) rather than repurposing `keywords`. If `PersonaFilters` doesn't have a dedicated field, append to the existing keywords instead of replacing:

```typescript
if (key === "networth" && netWorth.trim()) {
  // Append to keywords rather than overwriting
  // Better: add a dedicated net_worth field to PersonaFilters
  filters.net_worth_range = netWorth.trim();
}
```

---

## Warnings

### WR-01: Enter key fires search on empty input in NLSearchBar

**File:** `src/app/[orgId]/search/components/nl-search-bar.tsx:38-43`  
**Issue:** The `handleKeyDown` handler calls `onSearch(value.trim())` on Enter without checking whether `value.trim()` is non-empty. The submit button correctly guards against this with `disabled={isLoading || !value.trim()}`, but the keyboard path has no such guard. This means pressing Enter in an empty textarea dispatches a search for an empty string.

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSearch(value.trim()); // fires even when value.trim() === ""
  }
};
```

**Fix:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }
};
```

---

### WR-02: Duplicate suggested-persona cards rendered simultaneously

**File:** `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx:175-191` and `src/app/[orgId]/search/components/discover-tab.tsx:133`  
**Issue:** `SavedSearchShortcutList` renders `SUGGESTED_PERSONAS` (3 hardcoded cards: Finance Elite, Tech Founders, Real Estate Principals) in its empty-state branch (when `personas.length === 0`). `DiscoverTab` then also unconditionally renders `<SuggestedPersonasSection />` beneath it (line 133), which has its own 5-card set of suggested personas with overlapping entries ("Finance Elite", "Tech Founders", "Real Estate Principals" appear in both). When a new user has no saved searches, both sections render simultaneously — producing two suggestion grids on the same page with duplicate content.

**Fix:** Remove the `SUGGESTED_PERSONAS` empty-state from `SavedSearchShortcutList` (or remove `SuggestedPersonasSection` from `DiscoverTab`). The standalone `SuggestedPersonasSection` component is the canonical implementation; the inline suggestions inside `SavedSearchShortcutList` are superseded and should be deleted:

```typescript
// saved-search-shortcut-list.tsx — remove the empty-state branch that renders SUGGESTED_PERSONAS
if (personas.length === 0) {
  return null; // Let SuggestedPersonasSection in DiscoverTab handle this case
}
```

---

### WR-03: Sidebar hover style lost on React re-render

**File:** `src/components/layout/sidebar.tsx:100-108`  
**Issue:** The collapse toggle button applies hover styles by directly mutating `e.currentTarget.style` in `onMouseEnter`/`onMouseLeave`. React's reconciliation does not track these imperative style mutations. If the component re-renders while the user is hovering (e.g., due to a parent state change), React will reset the button's `style` prop to the non-hover values, causing the hover highlight to visually disappear while the cursor is still over the button.

```tsx
onMouseEnter={(e) => {
  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
  // React can overwrite this on re-render
}}
```

**Fix:** Use a React state variable for the hover state, or move hover styling entirely to CSS/Tailwind classes:

```tsx
const [toggleHovered, setToggleHovered] = useState(false);
// ...
<button
  onMouseEnter={() => setToggleHovered(true)}
  onMouseLeave={() => setToggleHovered(false)}
  style={{
    background: toggleHovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
    borderColor: toggleHovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
  }}
>
```

---

### WR-04: `getUser()` auth error silently ignored

**File:** `src/app/[orgId]/layout.tsx:25-28`  
**Issue:** The `supabase.auth.getUser()` call destructures only `data: { user }`, discarding the `error` field. If the Supabase auth call itself fails (network error, invalid JWT, etc.), `user` will be `null` and execution correctly hits `redirect("/login")`. However, the error is never logged, making auth failures invisible in server logs and indistinguishable from a simple "not logged in" case during debugging.

```typescript
const { data: { user } } = await supabase.auth.getUser();
// auth error is silently dropped
```

**Fix:**
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError) {
  console.error("[TenantLayout] Auth error:", authError.message);
}
if (!user) {
  redirect("/login");
}
```

---

## Info

### IN-01: Duplicate `Users` icon for two nav items

**File:** `src/components/layout/nav-items.tsx:33,38`  
**Issue:** Both "Saved Searches" and "Team" nav items use the `Users` icon from Lucide. When the sidebar is collapsed to icon-only mode, both items render identically and are visually indistinguishable. The `title` tooltip helps on desktop hover, but the collapsed state is visually ambiguous.

**Fix:** Use a distinct icon for "Team", for example `UsersRound` or `UserCog` from Lucide:
```typescript
import { ..., UserCog } from "lucide-react";
// ...
{ label: "Team", href: "/team", icon: UserCog, exact: false, roles: [...] },
```

---

### IN-02: `prefillValue` state does not sync when `keywords` prop changes externally

**File:** `src/app/[orgId]/search/components/discover-tab.tsx:37`  
**Issue:** `prefillValue` is initialized once from the `keywords` prop: `useState(keywords)`. If the parent re-renders `DiscoverTab` with a new `keywords` value (e.g., after loading a saved search), `prefillValue` will not update because `useState` initializer only runs once. The search bar will retain its old value. The `key={prefillValue}` pattern forces a remount when `prefillValue` changes via `handlePrefill`, but not when `keywords` changes from outside.

**Fix:** Add a `useEffect` to sync `prefillValue` when `keywords` changes:
```typescript
useEffect(() => {
  setPrefillValue(keywords);
}, [keywords]);
```

---

### IN-03: Hardcoded prospect counts in SuggestedPersonasSection

**File:** `src/app/[orgId]/search/components/suggested-personas-section.tsx:22,29,36,43,50`  
**Issue:** Each suggested persona has a hardcoded `count` string (e.g., `"~8,400 prospects"`, `"~3,200 prospects"`). These are static estimates that will never update. Users may rely on these counts to gauge data quality or make decisions. If the underlying dataset changes, the displayed numbers will be stale.

**Fix:** Either label these clearly as approximate estimates in the UI (e.g., add a tooltip: "Estimated based on typical Apollo dataset sizes") or remove the counts entirely and let the actual search surface the real number. No code change is strictly required if the design intent is "illustrative estimates only."

---

_Reviewed: 2026-04-08_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
