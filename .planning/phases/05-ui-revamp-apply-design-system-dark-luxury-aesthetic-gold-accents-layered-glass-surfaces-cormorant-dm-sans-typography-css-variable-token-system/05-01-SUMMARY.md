---
phase: 05-ui-revamp
plan: 01
subsystem: ui
tags: [css-variables, tailwind, next-font, design-tokens, typography, cormorant-garamond, dm-sans, jetbrains-mono, gold-accents]

# Dependency graph
requires: []
provides:
  - All design system CSS custom properties in globals.css .dark block
  - DM Sans + Cormorant Garamond + JetBrains Mono fonts loaded via next/font/google
  - Tailwind color/radius/animation tokens mapped to CSS variables
  - Custom scrollbar with gold-tinted thumb
  - fadeIn @keyframes and .page-enter animation class
  - .surface-card utility with gradient background and border hover transition
  - .ambient-glow-top and .ambient-glow-bottom fixed radial gradient utilities
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07]

# Tech tracking
tech-stack:
  added: [DM Sans (next/font), Cormorant Garamond (next/font), JetBrains Mono (next/font)]
  patterns:
    - CSS variables defined in .dark block; Tailwind maps via var() references
    - Font variables injected by next/font match --font-sans/--font-serif/--font-mono globals.css names
    - DS-namespaced variables (--text-primary-ds, --bg-card-gradient) avoid collision with shadcn OKLCH tokens

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - tailwind.config.ts

key-decisions:
  - "Named card background --bg-card-gradient (not --bg-card) to avoid collision with shadcn --card OKLCH token"
  - "Named text tokens --text-primary-ds / --text-secondary-ds (not --text-primary) to avoid shadcn --primary collision"
  - "gold-muted Tailwind token skipped to avoid collision with existing gold.muted nested object in tailwind.config.ts"
  - "Existing OKLCH tokens (--background, --foreground, --card, etc.) left completely untouched"
  - "success/warning/info semantic color tokens added only in .dark block (they already exist as OKLCH values in both :root and .dark)"

patterns-established:
  - "All design system tokens use CSS variables defined in .dark block; components reference via Tailwind classes only"
  - "Font loading via next/font/google with CSS variable injection — font-serif = Cormorant Garamond, font-sans = DM Sans, font-mono = JetBrains Mono"
  - "Surface pattern: .surface-card provides base gradient + border, hover transitions to gold-tinted state"

requirements-completed: [UI-01, UI-02]

# Metrics
duration: 6min
completed: 2026-02-26
---

# Phase 05 Plan 01: Design System Token Foundation Summary

**CSS variable token system established: 24 design tokens added to globals.css, DM Sans + Cormorant Garamond + JetBrains Mono loaded via next/font, Tailwind extended with gold/border/radius/animation mappings**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-26T02:04:48Z
- **Completed:** 2026-02-26T02:11:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added all design system CSS custom properties (backgrounds, borders, gold palette, text, semantic status) to the `.dark` block in globals.css without touching any existing OKLCH shadcn tokens
- Swapped font stack from Inter + Playfair Display to DM Sans + Cormorant Garamond + JetBrains Mono via next/font/google
- Extended tailwind.config.ts with gold-primary/bright/text/bg/bg-strong color tokens, border-subtle/hover/gold/sidebar, card/btn/badge radius presets, and page-enter animation
- Added custom scrollbar (gold-tinted thumb), fadeIn animation, .surface-card utility, and .ambient-glow-top/.ambient-glow-bottom fixed gradient classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add design system CSS variables, scrollbar, ambient glow, and fadeIn** - `ef73ca4` (feat)
2. **Task 2: Swap fonts and extend tailwind.config.ts** - `ab6b378` (feat)

## Files Created/Modified
- `src/app/globals.css` - Added 24 CSS design tokens to .dark block, custom scrollbar, fadeIn animation, .surface-card utility, .ambient-glow classes, updated font fallbacks in .theme/:root/.dark
- `src/app/layout.tsx` - Replaced Inter+Playfair_Display with DM_Sans+Cormorant_Garamond+JetBrains_Mono via next/font/google; updated body className
- `tailwind.config.ts` - Extended colors (gold-primary/bright/text/bg/bg-strong, border-subtle/hover/gold/sidebar, bg-elevated, text-tertiary/ghost), borderRadius (card/btn/badge), animation (page-enter), keyframes (fadeIn)
- `src/app/[orgId]/search/components/persona-selector.tsx` - Removed unused SelectValue import (auto-fix, see deviations)

## Decisions Made
- Named card background variable `--bg-card-gradient` (not `--bg-card`) to avoid collision with shadcn's `--card` OKLCH token used by the `bg-card` Tailwind class
- Named text tokens `--text-primary-ds` and `--text-secondary-ds` to avoid collision with shadcn `--primary`/`--secondary` tokens
- All existing OKLCH tokens (`--background`, `--foreground`, `--card`, `--border`, `--primary`, etc.) left completely untouched per plan requirement
- JetBrains Mono font variable (`--font-mono`) was already referenced in globals.css; now actually loaded via next/font

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused SelectValue import from persona-selector.tsx**
- **Found during:** Task 2 (build verification step)
- **Issue:** `SelectValue` was imported but never used in the JSX; ESLint `@typescript-eslint/no-unused-vars` error caused `next build` to fail
- **Fix:** Removed `SelectValue` from the destructured import statement in persona-selector.tsx
- **Files modified:** `src/app/[orgId]/search/components/persona-selector.tsx`
- **Verification:** `next build` compiled successfully after fix
- **Committed in:** `ab6b378` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Pre-existing unused import; fix was necessary for build to pass. No scope creep.

## Issues Encountered
- Font fetching from fonts.googleapis.com retried during build (network environment); build still compiled successfully as next/font handles font loading gracefully with retries

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All design system CSS tokens available globally — plans 02-07 can reference `--gold-primary`, `--bg-card-gradient`, `--border-subtle`, etc. via Tailwind classes
- font-serif = Cormorant Garamond, font-sans = DM Sans, font-mono = JetBrains Mono ready for component application
- .surface-card utility ready for card component refactors
- .ambient-glow-top/.ambient-glow-bottom ready for layout integration
- Build compiles clean, all existing functionality preserved

---
*Phase: 05-ui-revamp*
*Completed: 2026-02-26*
