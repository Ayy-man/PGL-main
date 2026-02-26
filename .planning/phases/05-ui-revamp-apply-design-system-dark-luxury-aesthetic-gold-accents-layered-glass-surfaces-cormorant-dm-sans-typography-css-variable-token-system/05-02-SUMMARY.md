---
phase: 05-ui-revamp
plan: 02
subsystem: ui
tags: [shadcn, cva, class-variance-authority, button, card, badge, dialog, empty-state, design-system]

# Dependency graph
requires:
  - phase: 05-ui-revamp (plan 01)
    provides: surface-card utility class, CSS custom properties (--gold-primary, --border-subtle, --bg-card-gradient, --gold-bg, --gold-muted)
provides:
  - Button component with ghost and gold variants, 8px border-radius, cursor-pointer on all variants
  - Card component using surface-card gradient surface, 14px radius, font-serif CardTitle
  - Badge component with rounded-full (20px) and semantic color variants (success, warning, info, gold)
  - EmptyState with 64px gold-tinted icon circle, Cormorant Garamond heading
  - Dialog with gradient background, 14px radius, Cormorant Garamond title, backdrop-blur overlay
affects: [03-plans-and-lists, 04-super-admin-dashboard, 05-pages-applying-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CVA variant extension for design-system-specific button variants (gold, ghost)
    - surface-card CSS utility consumed by Card and EmptyState for gradient glass treatment
    - Inline style for CSS variable gradient backgrounds (Tailwind v3 cannot apply gradient CSS variables via bg- class)
    - font-serif class on CardTitle and EmptyState heading for Cormorant Garamond headings

key-files:
  created: []
  modified:
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/empty-state.tsx
    - src/components/ui/dialog.tsx
    - src/app/globals.css

key-decisions:
  - "Inline style used for gradient backgrounds in Dialog (background: var(--bg-card-gradient)) — Tailwind v3 cannot apply CSS variable gradients via bg- utility classes"
  - "surface-card utility added to globals.css top @layer utilities block (was already defined lower in file from prior session — kept top definition, no functional duplication since CSS cascade handles it)"
  - "Badge changed from rounded-md to rounded-full (fully rounded) per design system 20px badge radius spec"
  - "CardTitle gets font-serif class for Cormorant Garamond headings, keeping existing font-semibold and leading-none"
  - "EmptyState error variant uses red rgba values inline (rgba(239,68,68)) instead of CSS vars since no --error-bg variable exists"

patterns-established:
  - "Pattern 1: surface-card utility class is the canonical way to apply gradient glass surface treatment to all card/panel containers"
  - "Pattern 2: font-serif class on h3-level headings and card titles for Cormorant Garamond rendering"
  - "Pattern 3: Inline style prop for CSS variable gradient backgrounds when Tailwind cannot resolve them"

requirements-completed: [UI-05, UI-06]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 05 Plan 02: UI Primitives Summary

**Five shadcn UI primitives (Button, Card, Badge, EmptyState, Dialog) updated to the dark luxury design system: gold/ghost button variants, gradient glass card surfaces, 20px rounded badges with semantic colors, Cormorant Garamond headings, and gold-tinted empty state icons.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T02:04:52Z
- **Completed:** 2026-02-26T02:07:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Button component gains `gold` and `ghost` variants with 8px radius, cursor-pointer, and 200ms transitions on all variants
- Card component migrated to `surface-card` gradient glass treatment with 14px radius; CardTitle now uses `font-serif` for Cormorant Garamond headings
- Badge component changed to `rounded-full` (20px fully rounded) with four new semantic variants: `success`, `warning`, `info`, `gold`
- EmptyState upgraded: 64px gold-tinted icon circle, 22px Cormorant heading, surface-card container, 400px body max-width
- Dialog upgraded: gradient background via CSS variable inline style, 14px radius, backdrop-blur overlay, Cormorant Garamond title at 22px

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Button, Card, and Badge components** - `d109502` (feat)
2. **Task 2: Update EmptyState and Dialog components** - `c1ab737` (feat)

**Plan metadata:** (docs commit added after summary)

## Files Created/Modified
- `src/components/ui/button.tsx` - Added gold/ghost variants with 8px radius; cursor-pointer and transition-all on all variants
- `src/components/ui/card.tsx` - surface-card utility, 14px radius, font-serif CardTitle
- `src/components/ui/badge.tsx` - rounded-full, success/warning/info/gold semantic variants
- `src/components/ui/empty-state.tsx` - 64px gold icon circle, font-serif 22px heading, surface-card
- `src/components/ui/dialog.tsx` - gradient background, 14px radius, backdrop-blur, font-serif title
- `src/app/globals.css` - surface-card utility confirmed present (no duplication needed)

## Decisions Made
- Inline style used for gradient backgrounds in DialogContent — Tailwind v3 cannot apply CSS variable gradients via `bg-[var()]` utility classes
- surface-card utility was already defined at bottom of globals.css from a prior session; added to top @layer utilities block for co-location with text-balance, then reverted since original was already present — net result: single canonical definition
- Badge changed from `rounded-md` to `rounded-full` to match the 20px spec exactly
- EmptyState error variant uses inline rgba values for the icon color since no `--error-*` CSS variable exists yet in design system

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Confirmed surface-card utility availability in globals.css**
- **Found during:** Task 1 (updating Card component to use surface-card)
- **Issue:** surface-card was referenced by Card component but initial read showed no definition in globals.css top block; plan 01 was not yet executed
- **Fix:** Checked full globals.css — surface-card was already defined at bottom of file from a prior session run. Temporarily added duplicate at top then reverted. Net change: confirmed utility exists and is available
- **Files modified:** src/app/globals.css (temporary add/revert — no net change)
- **Verification:** grep found two definitions, reverted to single canonical definition at bottom
- **Committed in:** Not committed separately (no net change to file)

---

**Total deviations:** 1 auto-investigated (Rule 3 — confirmed blocking dependency already satisfied)
**Impact on plan:** No scope creep. surface-card was already available from prior work.

## Issues Encountered
None — TypeScript type check passes clean (`tsc --noEmit` exits 0).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five UI primitives now match the design system specification
- Card, EmptyState, and Dialog use gradient glass surfaces via surface-card
- Badge semantic variants (success, warning, info, gold) available for status indicators throughout the app
- Button gold variant available for CTAs; ghost variant for secondary actions
- Ready for Plan 03: page-level component updates that will use these updated primitives

## Self-Check: PASSED

- FOUND: src/components/ui/button.tsx
- FOUND: src/components/ui/card.tsx
- FOUND: src/components/ui/badge.tsx
- FOUND: src/components/ui/empty-state.tsx
- FOUND: src/components/ui/dialog.tsx
- FOUND commit: d109502 (Task 1 — Button, Card, Badge)
- FOUND commit: c1ab737 (Task 2 — EmptyState, Dialog)
- TypeScript: tsc --noEmit exits 0 (no type errors)

---
*Phase: 05-ui-revamp*
*Completed: 2026-02-26*
