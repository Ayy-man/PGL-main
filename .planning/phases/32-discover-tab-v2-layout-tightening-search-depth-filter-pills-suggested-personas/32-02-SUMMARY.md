---
phase: 32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas
plan: "02"
subsystem: discover-tab
tags: [ui, discover, filter-pills, suggested-personas, saved-searches]
dependency_graph:
  requires: [32-01]
  provides: [filter-pills-row, suggested-personas-section, upgraded-search-cards]
  affects: [discover-tab.tsx, saved-search-shortcut-list.tsx]
tech_stack:
  added: []
  patterns: [inline-style design tokens, click-outside via mousedown+ref, single-open-pill state]
key_files:
  created:
    - src/app/[orgId]/search/components/filter-pills-row.tsx
    - src/app/[orgId]/search/components/suggested-personas-section.tsx
  modified:
    - src/app/[orgId]/search/components/saved-search-shortcut-list.tsx
    - src/app/[orgId]/search/components/discover-tab.tsx
decisions:
  - Net Worth pill writes to PersonaFilters.keywords (no dedicated net_worth field exists)
  - FilterPillsRow placed between NLSearchBar and ghost Save link; AdvancedFiltersPanel toggle kept for backward compat
  - SuggestedPersonasSection is a separate always-visible section below SavedSearchShortcutList
  - Empty-state SUGGESTED_PERSONAS fallback in saved-search-shortcut-list.tsx preserved unchanged
metrics:
  duration: ~8 min
  completed: "2026-04-07"
  tasks_completed: 3
  files_changed: 4
---

# Phase 32 Plan 02: Filter Pills Row + Suggested Personas + Search Card Upgrades Summary

## One-liner

Four-pill filter row (Industry/Title/Location/Net Worth) with click-outside popovers, five static suggested persona cards, and upgraded saved search cards with full-width names, metadata row, and play icon.

## What Was Built

### Task 1 — FilterPillsRow component (`filter-pills-row.tsx`)
New client component with 4 toggle pill buttons rendered in a centered flex row below the search bar. Each pill opens an anchored popover with:
- Industry, Title, Location: free-text input (semicolon-delimited), Enter or Apply submits
- Net Worth: static option list (4 ranges), writes to `PersonaFilters.keywords`
- Click-outside closes any open popover via `mousedown` listener + `containerRef.contains(target)` check
- Only one pill open at a time (`openPill` single state)
- Active state (gold tint) when open OR when the pill has a value applied

### Task 2 — SuggestedPersonasSection + SearchCard upgrades
**New `suggested-personas-section.tsx`:** 5 static persona cards in a `lg:grid-cols-3` grid:
- Finance Elite (TrendingUp icon), Tech Founders (Briefcase), BigLaw Partners (Scale), Real Estate Principals (Building2), Family Office Managers (Wallet)
- Each card: gold icon badge, label, one-line description, ~N prospects count, "Try this →" affordance
- Clicking calls `onPrefillSearch(query)` — does not auto-submit

**Updated `saved-search-shortcut-list.tsx`:**
- Added `Play` icon import from lucide-react
- `formatRelative` helper: Today / Yesterday / Nd / Nw / Nmo ago
- `SearchCard` now: `whitespace-normal break-words line-clamp-2` for full-width name wrapping, absolute-positioned Play icon in top-right (gold on hover), metadata row showing count + relative last-run date
- Saved search grid: `lg:grid-cols-4` (was `lg:grid-cols-3`)
- Empty-state fallback with `SUGGESTED_PERSONAS` and `SuggestionCard` unchanged

### Task 3 — discover-tab.tsx wiring
- Imported `FilterPillsRow` and `SuggestedPersonasSection`
- `FilterPillsRow` inserted between NLSearchBar and the ghost Save link, wired to `onApplyFilters`
- `SuggestedPersonasSection` appended after `SavedSearchShortcutList`, wired to existing `handlePrefill`
- Final render order: Hero → Stats → NLSearchBar → FilterPillsRow → Save link → SavedSearchShortcutList → SuggestedPersonasSection

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `96dbd32` | feat(32-02): create FilterPillsRow — 4 toggle pills with click-outside popovers |
| 2 | `bc5522e` | feat(32-02): SuggestedPersonasSection + upgraded SearchCard in SavedSearchShortcutList |
| 3 | `f842642` | feat(32-02): wire FilterPillsRow + SuggestedPersonasSection into discover-tab.tsx |

## Deviations from Plan

None — plan executed exactly as written. The existing `AdvancedFiltersPanel` toggle block was preserved (not removed) since the plan instruction was to insert FilterPillsRow between NLSearchBar and the ghost save link while leaving other JSX untouched.

## Known Stubs

None. All 5 suggested personas have real query strings. The ~N prospect counts are static estimates (intentional — no live count endpoint exists; these are marketing-style approximations to convey persona scale).

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- FOUND: filter-pills-row.tsx
- FOUND: suggested-personas-section.tsx
- FOUND: saved-search-shortcut-list.tsx
- FOUND: discover-tab.tsx
- FOUND commit: 96dbd32
- FOUND commit: bc5522e
- FOUND commit: f842642
- Build: `pnpm build --no-lint` succeeded
- TypeScript: zero errors in all 4 plan files (pre-existing test file errors unrelated to this plan)
