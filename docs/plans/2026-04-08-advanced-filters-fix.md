# Advanced Filters Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the filter pills (Industry, Title, Location, Net Worth) and Advanced Filters panel actually apply to Apollo searches correctly — stacking, clearing, and all.

**Architecture:** Three bugs exist. (1) Each pill apply call overwrites all other pills because `setFilterOverrides` replaces instead of merges. (2) Clicking "Clear" on a pill only resets local UI state — it never tells the parent to remove that filter from the search. (3) `AdvancedFiltersPanel` is fully built but never rendered in the UI. Fix (1) by merging in `handleApplyFilters`. Fix (2) by having `clearPill` call `onApplyFilters` with the removed key. Fix (3) by importing and rendering the panel. Bonus: map `net_worth_range` to `q_keywords` in Apollo so it isn't silently dropped.

**Tech Stack:** Next.js 14, TypeScript, `useState`, Supabase, Apollo.io search API

---

### Task 1: Fix `handleApplyFilters` to merge instead of replace

**Files:**
- Modify: `src/app/[orgId]/search/components/search-content.tsx:324-337`

**Step 1: Locate the handler and understand current behaviour**

Current code at line 324:
```ts
const handleApplyFilters = (filters: Partial<PersonaFiltersType>) => {
  ...
  const { keywords: _keywords, ...nonKeywordOverrides } = filters;
  setFilterOverrides(nonKeywordOverrides);  // ← REPLACES everything
};
```

**Step 2: Change to merge, with undefined-key cleanup**

Replace the handler body with:
```ts
const handleApplyFilters = (filters: Partial<PersonaFiltersType>) => {
  if (isSavedSearchMode) {
    toast({
      title: "Filters changed",
      description: "Changing filters will refresh results. Previously dismissed prospects may reappear if they match the new criteria.",
    });
  }
  if (filters.keywords !== undefined) {
    setSearchState({ keywords: filters.keywords });
  }
  const { keywords: _keywords, ...nonKeywordOverrides } = filters;
  setFilterOverrides((prev) => {
    const next = { ...prev, ...nonKeywordOverrides } as Partial<PersonaFiltersType>;
    // Remove keys explicitly set to undefined (used by clear actions)
    (Object.keys(next) as Array<keyof PersonaFiltersType>).forEach((k) => {
      if (next[k] === undefined) delete next[k];
    });
    return next;
  });
};
```

**Step 3: Verify TypeScript compiles**

```bash
cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main"
npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

**Step 4: Commit**

```bash
git add src/app/\[orgId\]/search/components/search-content.tsx
git commit -m "fix(search): merge filter overrides instead of replacing on each pill apply"
```

---

### Task 2: Fix FilterPillsRow clear to remove filter from search

**Files:**
- Modify: `src/app/[orgId]/search/components/filter-pills-row.tsx:62-67`

**Step 1: Understand the current `clearPill` function**

Current (line 62):
```ts
const clearPill = (key: PillKey) => {
  if (key === "industry") setIndustries("");
  if (key === "title") setTitles("");
  if (key === "location") setLocations("");
  if (key === "networth") setNetWorth("");
};
```

This only resets local UI state. The `filterOverrides` in the parent still holds the old value.

**Step 2: Map each pill key to its PersonaFilters field**

```ts
const PILL_FILTER_KEY: Record<PillKey, keyof PersonaFilters> = {
  industry: "industries",
  title: "titles",
  location: "locations",
  networth: "net_worth_range",
};
```

**Step 3: Update `clearPill` to notify parent**

Replace the function (add the map above it, then):
```ts
const clearPill = (key: PillKey) => {
  if (key === "industry") setIndustries("");
  if (key === "title") setTitles("");
  if (key === "location") setLocations("");
  if (key === "networth") setNetWorth("");
  // Notify parent to remove this key from active filters
  onApplyFilters({ [PILL_FILTER_KEY[key]]: undefined } as Partial<PersonaFilters>);
};
```

**Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
git add src/app/\[orgId\]/search/components/filter-pills-row.tsx
git commit -m "fix(search): clear pill now removes filter from active search state"
```

---

### Task 3: Wire AdvancedFiltersPanel into the search UI

**Files:**
- Modify: `src/app/[orgId]/search/components/discover-tab.tsx`

**Step 1: Add the import**

At the top of `discover-tab.tsx`, add:
```ts
import { AdvancedFiltersPanel } from "./advanced-filters-panel";
```

**Step 2: Render it below `FilterPillsRow`**

In the JSX, after:
```tsx
<FilterPillsRow onApplyFilters={onApplyFilters} />
```

Add:
```tsx
{/* Advanced filters — collapsible multi-field panel */}
<div className="mt-3 flex justify-center">
  <AdvancedFiltersPanel onApplyFilters={onApplyFilters} />
</div>
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add src/app/\[orgId\]/search/components/discover-tab.tsx
git commit -m "feat(search): render AdvancedFiltersPanel below filter pills"
```

---

### Task 4: Map `net_worth_range` to Apollo `q_keywords`

Apollo has no net worth field, but appending the selected label to `q_keywords` is the best-effort approach. Since these values are descriptive strings like "ultra high net worth $100M+", they won't hurt the search and do add signal.

**Files:**
- Modify: `src/lib/apollo/client.ts:61-64` (after the `keywords` block)

**Step 1: Add the mapping after the existing keywords block**

Current end of `translateFiltersToApolloParams` (around line 61):
```ts
  if (filters.keywords && filters.keywords.trim().length > 0) {
    params.q_keywords = filters.keywords;
  }

  return params;
```

Replace with:
```ts
  // Combine keywords and net_worth_range into q_keywords
  const keywordParts: string[] = [];
  if (filters.keywords?.trim()) keywordParts.push(filters.keywords.trim());
  if (filters.net_worth_range?.trim()) keywordParts.push(filters.net_worth_range.trim());
  if (keywordParts.length > 0) {
    params.q_keywords = keywordParts.join(" ");
  }

  return params;
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/lib/apollo/client.ts
git commit -m "fix(search): map net_worth_range to Apollo q_keywords"
```

---

### Task 5: Manual smoke test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test pill stacking**
1. Open Search → Discover tab
2. Apply "Title" filter: `CEO`
3. Apply "Location" filter: `New York`
4. Verify both are in effect — search results should reflect both (check console logs for `[useSearch] [2/3] Apollo request body` — both `person_titles` and `person_locations` should appear)

**Step 3: Test pill clear**
1. Apply "Title" filter: `CEO`
2. Click "Clear" on the Title pill
3. Verify `titles` is removed from the Apollo request body in console logs

**Step 4: Test Advanced Filters panel**
1. Click "Advanced Filters" toggle
2. Enter Seniority: `c_suite`
3. Click "Apply Filters"
4. Verify `person_seniorities: ["c_suite"]` appears in Apollo request body

**Step 5: Test Net Worth**
1. Select "$100M+" from Net Worth pill
2. Verify `q_keywords` includes "ultra high net worth $100M+" in Apollo request body

---

## Summary of bugs fixed

| Bug | File | Fix |
|-----|------|-----|
| Applying one pill clears others | `search-content.tsx:336` | Merge with prev state instead of replace |
| Clear pill doesn't update search | `filter-pills-row.tsx:62` | Call `onApplyFilters({key: undefined})` on clear |
| AdvancedFiltersPanel never shown | `discover-tab.tsx` | Import + render below FilterPillsRow |
| `net_worth_range` silently dropped | `apollo/client.ts:61` | Append to `q_keywords` |
