---
phase: 04-super-admin-health-dashboard-platform-pulse-tenant-heatmap-enrichment-pipeline-api-quota-tracking-funnel-analytics-error-feed
plan: "03"
subsystem: ui
tags: [nextjs, react, recharts, tailwind, admin, dashboard, animations]

# Dependency graph
requires:
  - phase: 04-super-admin-health-dashboard
    provides: 04-02 admin API routes (dashboard, tenants/activity, quota, enrichment/health, funnel, errors)
  - phase: 03-enrich-ship
    provides: enrichment_source_status JSONB schema, activity_log action types
provides:
  - "useCountUp hook — requestAnimationFrame count-up animation with ease-out cubic"
  - "ComingSoonCard — reusable semi-transparent overlay wrapper with Coming Soon badge"
  - "PlatformPulse — 4 stat cards (Total Prospects, Enrichment Pipeline, API Quota Coming Soon, Active Users)"
  - "TenantHeatmap — expandable tenant table with relative-to-peers color coding and per-user breakdown"
  - "EnrichmentHealthChart — Recharts stacked BarChart per source with gold-adjacent OKLCH palette"
  - "FunnelChart — Recharts 4-stage funnel with gold-to-amber gradient and memoized data"
  - "ErrorFeed — paginated expandable error table with User column, prospect profile links, view-only"
affects:
  - "04-04 — dashboard page will compose all 7 components together with polling data fetcher"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useCountUp with requestAnimationFrame + ease-out cubic (no external library)"
    - "Relative-to-peers ranking via getHeatmapClass — no hardcoded thresholds"
    - "New tenant detection: all metrics zero = New badge, not red warning"
    - "useMemo for Recharts Cell array — prevents color reconciliation on re-renders"
    - "OKLCH color space for chart palette — gold-adjacent warm hues graduating by source"
    - "Skeleton loading via animate-pulse matching card/table layout structure"
    - "Fragment key pattern for expandable table rows (parent row + expanded row)"

key-files:
  created:
    - src/hooks/use-count-up.ts
    - src/components/admin/platform-pulse.tsx
    - src/components/admin/coming-soon-card.tsx
    - src/components/admin/tenant-heatmap.tsx
    - src/components/admin/enrichment-health-chart.tsx
    - src/components/admin/funnel-chart.tsx
    - src/components/admin/error-feed.tsx
  modified: []

key-decisions:
  - "getHeatmapClass uses relative ranking (non-zero values sorted, percentile thresholds) — no hardcoded activity numbers"
  - "New tenant detection: ALL three 7d metrics are zero = New badge with text-muted-foreground, not red"
  - "useMemo for funnelData AND cells array in FunnelChart to prevent Recharts reconciliation color reset"
  - "Gold-adjacent OKLCH palette for enrichment chart: graduated 0.84/0.77/0.70/0.63 for success, warm red for failed"
  - "ErrorFeed is view-only — no re-trigger button per DESIGN.md locked decision"
  - "Prospect links in ErrorFeed: /${tenantId}/prospects/${id} for super admin drill-down"
  - "Tenant admin links in TenantHeatmap expanded row: /admin/tenants/${tenant.id}"

patterns-established:
  - "Admin components accept data props and render skeleton when null"
  - "Expandable table rows use local useState<string | null> for expand tracking, collapse on same-row click"
  - "Next.js Link with e.stopPropagation() in expandable rows — prevents row expand when clicking links"

requirements-completed:
  - "DESIGN.md Section: Platform Pulse (4 stat cards)"
  - "DESIGN.md Section: Tenant Activity Heatmap (expandable table)"
  - "DESIGN.md Section: Graphs (enrichment pipeline + funnel)"
  - "DESIGN.md Section: Error/Failure Feed (expandable table)"
  - "DESIGN.md Section: Coming Soon Cards"
  - "DESIGN.md Section: Component Structure"

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 4 Plan 03: Dashboard UI Components Summary

**7 prop-driven React components for the super admin health dashboard: stat cards with count-up animation, relative-ranked tenant heatmap, Recharts stacked bar + funnel charts with gold OKLCH palette, and paginated error feed with prospect drill-through links**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T00:01:26Z
- **Completed:** 2026-02-25T00:04:48Z
- **Tasks:** 2
- **Files modified:** 7 (all created)

## Accomplishments

- Created useCountUp hook using requestAnimationFrame with ease-out cubic easing (no external dependency)
- Built PlatformPulse with 4 stat cards: Total Prospects + Enrichment Pipeline + API Quota (Coming Soon overlay) + Active Users, all with skeleton loading
- TenantHeatmap uses relative-to-peers ranking with getHeatmapClass — top 25% emerald, middle 50% amber, bottom 25% red, new tenants show badge (not red)
- EnrichmentHealthChart renders stacked bar per source (contactout/exa/edgar/claude) with animated bars and gold-adjacent OKLCH warm palette
- FunnelChart memoizes both funnelData array and Cell elements to prevent Recharts color reconciliation bug on re-renders
- ErrorFeed: paginated, expandable, view-only — User column shows who triggered enrichment, prospect names link to `/${tenantId}/prospects/${id}`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create stat cards, Coming Soon overlay, and tenant heatmap components** - `1d4d885` (feat)
2. **Task 2: Create enrichment health chart, funnel chart, and error feed components** - `bd1afeb` (feat)

## Files Created/Modified

- `src/hooks/use-count-up.ts` — requestAnimationFrame count-up animation with ease-out cubic, cleanup on unmount
- `src/components/admin/coming-soon-card.tsx` — reusable overlay wrapper with semi-transparent bg-card/80 and Coming Soon badge
- `src/components/admin/platform-pulse.tsx` — 4 stat cards with useCountUp, ComingSoonCard for quota, skeleton loading
- `src/components/admin/tenant-heatmap.tsx` — expandable table with relative-to-peers getHeatmapClass, new tenant detection, per-user breakdown, tenant admin link
- `src/components/admin/enrichment-health-chart.tsx` — Recharts stacked BarChart (contactout/exa/edgar/claude), gold OKLCH success colors + warm red failed, animated bars
- `src/components/admin/funnel-chart.tsx` — Recharts FunnelChart with memoized data + Cell array, gold-to-amber gradient, dark theme tooltip
- `src/components/admin/error-feed.tsx` — paginated expandable table, User column, prospect links, per-source badge status, no re-trigger button

## Decisions Made

- getHeatmapClass computes relative ranking from non-zero values in sorted array — no hardcoded thresholds (locked decision)
- New tenant badge: if all 7d metrics are zero → show "New" badge with text-muted-foreground, not red (per plan requirement)
- FunnelChart useMemo: both the data array and the Cell elements are memoized separately — prevents Recharts color reconciliation on re-renders (Research pitfall #5)
- OKLCH graduated palette for enrichment chart: 4 success values 0.84→0.63 L, 4 failure values 0.52→0.35 L, all warm hues

## Deviations from Plan

None — plan executed exactly as written. All 7 files compile with zero TypeScript errors.

## Issues Encountered

None — all components compiled cleanly on first attempt.

## User Setup Required

None — these are pure UI components that receive data as props. No external services required.

## Next Phase Readiness

- All 7 dashboard UI components are complete and ready for composition in Plan 04
- Components accept typed props and render skeletons when data is null
- ErrorFeed accepts `onPageChange` callback prop for parent-driven pagination state
- TypeScript compiles clean with zero errors
- No blockers for dashboard page assembly

---
*Phase: 04-super-admin-health-dashboard*
*Completed: 2026-02-25*
