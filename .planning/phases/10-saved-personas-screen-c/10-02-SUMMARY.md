---
phase: 10-saved-personas-screen-c
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, lucide, radix-ui, css-variables, sidebar, personas]

# Dependency graph
requires:
  - phase: 06-ui-redesign-foundation
    provides: CSS variable design tokens (--bg-card-gradient, --gold-primary, --border-subtle, etc.)
  - phase: 10-saved-personas-screen-c
    provides: Persona type and PersonaFilters interface from src/lib/personas/types.ts
provides:
  - PersonasLibrarySidebar client component with Library Stats, industry filter checkboxes, data freshness radio buttons
  - LiveDataStream client component with pulsing header and 8-second simulated event feed
affects:
  - 10-03 PersonasLayout (will compose both sidebars into three-column grid)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CSS variable inline styles for all colors (no raw Tailwind color classes)
    - useMemo for derived state (industry deduplication, stats calculation)
    - setInterval with cleanup return in useEffect for animated feeds
    - onMouseEnter/Leave for CSS variable hover states (Tailwind hover: cannot reference CSS custom property values)
    - Deterministic pseudo-random from ID char codes for stable fake data

key-files:
  created:
    - src/app/[orgId]/personas/components/personas-library-sidebar.tsx
    - src/app/[orgId]/personas/components/live-data-stream.tsx
  modified: []

key-decisions:
  - "Deterministic pseudo-random for Est. Matches: sum of persona ID char codes, modulo + multiply — consistent with PersonaCard approach, no flicker"
  - "Custom radio circles (div+inner dot) instead of native HTML radio input for consistent dark luxury styling"
  - "setEvents functional update in setInterval to avoid stale closure — same pattern as other animated components"
  - "hoveredId state for event row hover background — onMouseEnter/Leave required since CSS variables cannot be used in Tailwind hover: classes"

patterns-established:
  - "Sidebar layout: hidden lg:flex flex-col gap-6 overflow-y-auto with surface-card treatment (bg-card-gradient + border-subtle + borderRadius 14px)"
  - "Section label: text-[11px] font-semibold uppercase tracking-[1px] text-tertiary"
  - "Stat chip: bg-elevated border-default rounded-[8px] p-3 with font-mono text-[22px] value and text-[11px] sub-label"
  - "Event type badge pill: inline-flex uppercase tracking-[0.5px] text-[10px] font-semibold px-2 py-0.5 rounded-full"

requirements-completed: [PB-04, PB-06]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 10 Plan 02: Sidebar Components Summary

**Two sidebar client components for Screen C: PersonasLibrarySidebar (stats + industry filters + data freshness radio) and LiveDataStream (8-second animated event feed with gold/green type badges)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-28T19:41:55Z
- **Completed:** 2026-02-28T19:47:00Z
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments
- PersonasLibrarySidebar renders active persona count and deterministic estimated matches, industry filter checkboxes derived from personas data, and data freshness radio (Live/Past Week) — all state propagated via callback props
- LiveDataStream renders pulsing "Live Data Stream" header with 8 mock events, 8-second interval adding new events (sliced to 8 max), proper clearInterval cleanup, per-event icon circles with CSS variable colors, name/detail/time/type-badge row layout
- Both components use `hidden lg:flex` — invisible below 1024px breakpoint
- All colors via CSS variables — zero raw Tailwind color classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PersonasLibrarySidebar component** - `0f9f6b0` (feat)
2. **Task 2: Create LiveDataStream component** - `0f9f6b0` (feat — same commit, both files shipped together)

## Files Created/Modified
- `src/app/[orgId]/personas/components/personas-library-sidebar.tsx` - Left sidebar: Library Stats chips, industry filter checkboxes, data freshness custom radio buttons
- `src/app/[orgId]/personas/components/live-data-stream.tsx` - Right sidebar: pulsing header, 8-second simulated event feed with icon circles and type badges

## Decisions Made
- **Deterministic pseudo-random for Est. Matches:** sum of persona ID char codes, modulo 200 * 5 + 50 per persona — produces stable values that don't flicker on re-render
- **Custom radio circles:** div + inner dot, not native HTML radio input, for consistent dark luxury styling with CSS variable gold border/fill
- **Functional setEvents in setInterval:** `setEvents(prev => [...])` avoids stale closure — same pattern as other animated components in codebase
- **hoveredId state:** tracked via onMouseEnter/Leave for event row hover background since Tailwind `hover:` cannot reference CSS custom property values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Pre-existing TypeScript errors in `src/components/admin/platform-pulse.tsx` (ComingSoonCard and ApiQuotaPlaceholder undeclared — unrelated to this plan). Both new files compile with zero errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both sidebar components ready for composition into PersonasLayout (Plan 03)
- PersonasLibrarySidebar accepts personas + selectedIndustries + onIndustryChange + freshness + onFreshnessChange props
- LiveDataStream is standalone (no props needed)
- Three-column layout can now be assembled: LibrarySidebar | PersonaCardGrid | LiveDataStream

---
*Phase: 10-saved-personas-screen-c*
*Completed: 2026-03-01*
