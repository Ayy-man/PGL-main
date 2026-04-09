---
phase: 260409-su1
plan: 01
status: complete
date: 2026-04-09
commits:
  - 65afd9f
  - 481a89a
  - ec836fe
---

# Quick Task 260409-su1 — Summary

## Objective
Promote the "New Search" action to more discoverable locations in the search UI: move the sidebar rail's bottom-anchored `+ New` button to a unified top header row, and add an inline `+ New Search` ghost button to the Discover tab's `SAVED SEARCHES` heading.

## What Was Done

### Task 1 — Sidebar rail header row (commit `65afd9f`)
**File:** `src/app/[orgId]/search/components/search-sidebar-rail.tsx`

- Removed the standalone top toggle-only row (old lines 40–59).
- Removed the bottom footer container that anchored the `+ New` button (old lines 135–138).
- Added a new top header row with a `1px var(--border-subtle)` bottom border separating it from the persona list.
- **Expanded state (240px):** `flex items-center justify-between px-3 pt-3 pb-2` — `createButton` on the left, collapse chevron on the right.
- **Collapsed state (48px):** `flex flex-col items-center gap-1 pt-3 pb-2` — `createButtonCollapsed` stacked above the expand chevron.
- All existing props (`personas`, `selectedId`, `onSelect`, `collapsed`, `onToggleCollapse`, `createButton`, `createButtonCollapsed`) unchanged.
- Persona list rendering, tooltips, and collapse/expand logic unchanged.

### Task 2 — Label update (commit `481a89a`)
**File:** `src/app/[orgId]/search/components/search-content.tsx`

- Changed the expanded `createButton` label text from `New` to `New Search` (line ~1037).
- `<Plus className="h-3 w-3" />` icon preserved.
- `createButtonCollapsed` unchanged (still icon-only with `aria-label="New saved search"`).

### Task 3 — Discover heading inline button (commit `ec836fe`)
**Files:** `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx`, `src/app/[orgId]/search/components/discover-tab.tsx`

`saved-search-shortcut-list.tsx`:
- Added `Plus` to the lucide-react import (alongside existing `Play`).
- Added optional `onCreateNew?: () => void` prop to `SavedSearchShortcutListProps`.
- Wrapped the `SAVED SEARCHES` heading `<p>` in a new `<div className="flex items-center justify-between mb-4">` container (moved `mb-4` from the `<p>` to the wrapper).
- Added a conditional ghost `+ New Search` button on the right of the heading row, rendered only when `onCreateNew` is provided.
  - Base style: `flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-colors px-2.5 py-1 rounded-full`
  - Inline: `background: transparent`, `border: 1px dashed var(--border-default)`, `color: var(--text-tertiary)`
  - Hover: color → `var(--gold-primary)`, borderColor → `var(--border-gold)`
  - Icon: `<Plus className="h-3 w-3" />`

`discover-tab.tsx`:
- Added `onCreateNew={onSaveAsNewSearch}` to the `<SavedSearchShortcutList>` JSX, reusing the existing `onSaveAsNewSearch` prop that already maps to `setCreateDialogOpen(true)` in `search-content.tsx`.

## Verification
- `npx tsc --noEmit` passed after each of the three commits (zero new type errors).
- All four touched files compile cleanly.
- No new state, no new handlers, no new dialogs — all three entry points reuse the existing `setCreateDialogOpen(true)` wiring.

## Files Modified
| File | Lines changed |
|------|---------------|
| `src/app/[orgId]/search/components/search-sidebar-rail.tsx` | ~72 insertions / ~32 deletions |
| `src/app/[orgId]/search/components/search-content.tsx` | 1 line |
| `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx` | ~35 insertions / ~6 deletions |
| `src/app/[orgId]/search/components/discover-tab.tsx` | 1 line |

## Follow-ups
None — task is self-contained and complete. PersonaFormDialog was already wired up; this was purely UI affordance promotion.
