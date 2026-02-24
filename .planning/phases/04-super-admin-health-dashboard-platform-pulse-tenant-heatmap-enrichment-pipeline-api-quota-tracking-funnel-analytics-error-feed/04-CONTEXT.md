# Phase 4: Super Admin Health Dashboard - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the existing super admin dashboard (4 count cards) into a platform health command center. Four vertical sections: Platform Pulse stat cards, Tenant Activity Heatmap, Graphs (enrichment pipeline health + search-to-export funnel), and Error/Failure Feed. Includes new API quota tracking via Redis counters and richer enrichment error capture. See DESIGN.md for full layout spec, data sources, and API endpoints.

</domain>

<decisions>
## Implementation Decisions

### Chart & visualization style
- Chart library: whichever best fits the existing dark theme and luxury brand (gold/dark palette) — custom tweaking expected to match brand
- Chart colors: semantic colors derived from gold-ish tones that harmonize with the existing build (not generic green/blue/red — warm gold-adjacent hues for status states)
- Subtle animations on load: bars grow in, numbers count up on initial render. Polished but not distracting.

### Data freshness & polling
- Auto-refresh every 60 seconds across all dashboard sections
- Show "Updated X seconds ago" timestamp
- Subtle refresh indicator during polling (no full-page loading states on refresh)

### Heatmap thresholds & color coding
- Relative-to-peers classification: top 25% = healthy (green-gold), middle 50% = moderate (amber), bottom 25% = needs attention (warm red)
- Adjusts automatically as tenant count grows — no hardcoded activity thresholds
- New tenants with zero data show as "new" state rather than "needs attention"

### Drill-down & interaction depth
- Primary interaction: inline expansion (click row to expand details in-place)
- Secondary: link to relevant page where possible (e.g., expanded tenant row links to that tenant's admin page, failed enrichment links to prospect profile)
- No re-trigger button on error feed — view-only error details, no actions to re-run enrichment from the dashboard

### Claude's Discretion
- Specific chart library choice (Recharts, tremor, or other) based on brand fit and dark theme compatibility
- Exact gold-adjacent semantic color palette for chart data series
- Animation timing and easing curves
- Error feed pagination vs infinite scroll
- Loading skeleton design for initial page load vs auto-refresh

</decisions>

<specifics>
## Specific Ideas

- Charts and UI should feel consistent with the existing luxury dark theme — gold-ish semantic colors, not generic dashboard colors
- DESIGN.md in this phase directory has the full layout spec with data sources, column definitions, and API endpoint inventory — downstream agents should read it
- The "Coming Soon" pattern for API Quota Burn card (grayed out with badge) is already specified in DESIGN.md

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-super-admin-health-dashboard-platform-pulse-tenant-heatmap-enrichment-pipeline-api-quota-tracking-funnel-analytics-error-feed*
*Context gathered: 2026-02-25*
