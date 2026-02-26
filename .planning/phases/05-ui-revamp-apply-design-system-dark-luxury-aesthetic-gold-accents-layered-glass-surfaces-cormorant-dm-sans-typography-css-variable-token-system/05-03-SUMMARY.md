---
phase: 05-ui-revamp
plan: 03
subsystem: ui
tags: [layout, sidebar, navigation, ambient-glow, css-variables, tailwind, lucide]

# Dependency graph
requires:
  - phase: 05-01
    provides: CSS variable token system (--bg-sidebar, --border-sidebar, --gold-primary, --gold-bg, --text-secondary-ds, --text-ghost, --bg-root, ambient-glow utilities, page-enter animation)

provides:
  - 220px gradient sidebar with gold accent right-edge line and ghost footer
  - Active nav items with gold-bg background, gold text, and 3px gold left-border
  - Mobile sidebar drawer mirroring desktop — gradient bg, gold border, same header
  - 56px sticky top bar with backdrop blur, command palette placeholder, bell icon, avatar
  - Ambient gold glow radials on tenant and admin root layouts
  - Page-enter fade animation (0.4s) wrapping all page content
  - Admin layout: gradient sidebar, gold accent line, consistent nav active states

affects:
  - 05-04 (search page uses tenant layout shell)
  - 05-05 (lists page uses tenant layout shell)
  - 05-06 (personas page uses tenant layout shell)
  - Any future pages within [orgId] or /admin route groups

# Tech tracking
tech-stack:
  added: []
  patterns:
    - inline style for CSS variable gradients (Tailwind cannot render gradient CSS variables via bg- utility)
    - onMouseEnter/onMouseLeave for CSS variable hover states on nav items (Tailwind cannot target CSS variable colors with hover: prefix)
    - z-index layering: ambient glow at z-0, content layer at z-10, top bar at z-30, mobile nav at z-40

key-files:
  created: []
  modified:
    - src/components/layout/sidebar.tsx
    - src/components/layout/nav-items.tsx
    - src/components/layout/mobile-sidebar.tsx
    - src/app/[orgId]/layout.tsx
    - src/app/admin/layout.tsx
    - src/app/admin/admin-nav-links.tsx

key-decisions:
  - "onMouseEnter/onMouseLeave handlers used for CSS variable hover states on nav items — Tailwind hover: cannot reference CSS custom property values"
  - "Admin nav links migrated from Tailwind gold/muted classes to CSS variable active states for consistency with tenant nav items"
  - "Mobile sidebar Sheet width set to 220px matching desktop — consistent brand experience across breakpoints"
  - "Top bar notification bell uses onMouseEnter/onMouseLeave for hover state since CSS variables cannot be used in Tailwind hover: prefix"

patterns-established:
  - "Shell layout pattern: bg-root wrapper > ambient-glow fixed radials > z-10 flex content > sidebar + [top bar + main page-enter]"
  - "Nav item active state: gold-bg background + gold-primary color + 3px solid gold left-border (paddingLeft reduced by 3px to preserve alignment)"
  - "Ghost footer pattern: Phronesis v1.0 in text-ghost at bottom of sidebar with mt-auto"

requirements-completed:
  - UI-04
  - UI-03

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 5 Plan 03: Application Shell Rebuild Summary

**220px gradient sidebar with gold right-edge accent, gold-active nav items with 3px left-border, 56px sticky blur top bar, ambient gold glow radials, and page-enter fade animations applied to all tenant and admin pages**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T02:16:19Z
- **Completed:** 2026-02-26T02:19:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Rebuilt sidebar to 220px with `var(--bg-sidebar)` gradient, gold right-edge border, team header with 36px gold gradient icon, ghost footer
- Updated nav items to use gold-bg/gold-primary with 3px left-border on active, CSS variable hover states via onMouseEnter/onMouseLeave
- Mobile sidebar sheet mirrors desktop gradient and gold border at 220px width
- Tenant layout: ambient-glow-top/bottom fixed radials, bg-root background, 56px sticky top bar with backdrop blur, search placeholder (⌘K badge), bell + avatar, page-enter animation
- Admin layout: same ambient glow + bg-root treatment, gradient sidebar (220px, gold accent line), admin-branded header, sticky top bar, page-enter animation
- Admin nav links migrated from Tailwind gold/muted classes to CSS variable active states for consistency

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild sidebar with gradient background, gold accent line, and active nav states** - `8666a28` (feat)
2. **Task 2: Add ambient glow, top bar, and page-enter animation to tenant and admin layouts** - `e3826ef` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/layout/sidebar.tsx` - 220px gradient sidebar, gold right edge, team header with gradient icon, ghost footer
- `src/components/layout/nav-items.tsx` - Gold active state with left-border, CSS variable hover, consistent with design system
- `src/components/layout/mobile-sidebar.tsx` - Matches desktop: gradient bg, gold border, backdrop blur mobile header
- `src/app/[orgId]/layout.tsx` - Ambient glow radials, bg-root, 56px sticky blur top bar, page-enter animation
- `src/app/admin/layout.tsx` - Same ambient/bg-root treatment, gradient sidebar, admin top bar, page-enter animation
- `src/app/admin/admin-nav-links.tsx` - CSS variable active states replacing Tailwind gold classes

## Decisions Made

- `onMouseEnter/onMouseLeave` handlers used for CSS variable hover states on nav items — Tailwind `hover:` cannot reference CSS custom property values at runtime
- Admin nav links updated from `bg-gold/10 text-gold` Tailwind classes to `var(--gold-bg)` / `var(--gold-primary)` CSS variable approach — consistent with MASTER.md rule against raw Tailwind color classes
- Mobile sidebar Sheet width set to 220px matching desktop — consistent brand experience
- Notification bell top bar button uses event handlers for hover since Tailwind cannot target CSS variable colors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated admin-nav-links.tsx to use CSS variables instead of Tailwind gold classes**
- **Found during:** Task 2 (admin layout update)
- **Issue:** AdminNavLinks used `bg-gold/10 text-gold text-muted-foreground hover:bg-muted hover:text-foreground` — raw Tailwind color classes violating MASTER.md anti-patterns
- **Fix:** Migrated to same CSS variable inline style pattern as tenant NavItems: `var(--gold-bg)`, `var(--gold-primary)`, `var(--text-secondary-ds)`, 3px gold left-border on active
- **Files modified:** `src/app/admin/admin-nav-links.tsx`
- **Verification:** TypeScript compiles clean, consistent with tenant nav item pattern
- **Committed in:** `e3826ef` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug / inconsistent styling)
**Impact on plan:** Necessary fix to maintain design system rule compliance. No scope creep.

## Issues Encountered

None — plan executed without blockers. `npx next build` succeeded without errors or warnings.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Application shell complete — every page now has the dark luxury atmospheric treatment
- Plan 04 (search page) and all subsequent plans can build on this consistent shell
- All CSS variables from Plan 01 are in use and verified working in production build

## Self-Check: PASSED

All 6 files verified present. Both task commits (8666a28, e3826ef) confirmed in git history. Build succeeds.

---
*Phase: 05-ui-revamp*
*Completed: 2026-02-26*
