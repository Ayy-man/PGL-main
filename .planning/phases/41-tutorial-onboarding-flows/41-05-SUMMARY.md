---
phase: 41-tutorial-onboarding-flows
plan: 05
subsystem: onboarding
tags: [empty-state, tooltip, onboarding, copy, ui-polish]
requires:
  - "src/components/ui/empty-state.tsx (existing primitive, unmodified)"
  - "src/components/ui/tooltip.tsx (existing primitive, unmodified)"
  - "TooltipProvider mounted at src/app/layout.tsx:54 (confirmed pre-existing)"
provides:
  - "src/lib/onboarding/empty-state-copy.ts — EMPTY_STATE_COPY map + emptyStateCopy(surface) pure helper"
  - "4 EmptyState CTA upgrades: lists, personas, activity (+ dashboard via Plan 04)"
  - "4 inline Tooltips: advanced-filters toggle, enrich selection button, per-source enrichment dots, wealth tier badge"
affects:
  - src/app/[orgId]/lists/components/lists-page-client.tsx
  - src/app/[orgId]/personas/page.tsx
  - src/components/activity/activity-log-viewer.tsx
  - src/app/[orgId]/search/components/advanced-filters-panel.tsx
  - src/app/[orgId]/search/components/bulk-actions-bar.tsx
  - src/components/prospect/profile-view.tsx
  - src/app/[orgId]/search/components/prospect-result-card.tsx
tech-stack:
  added: []
  patterns:
    - "Centralized copy map with pure helper + typed surface keys + safe fallback"
    - "TooltipTrigger asChild wrapping existing controls (no restyling)"
key-files:
  created:
    - src/lib/onboarding/empty-state-copy.ts
    - src/lib/onboarding/__tests__/empty-state-copy.test.ts
  modified:
    - src/app/[orgId]/lists/components/lists-page-client.tsx
    - src/app/[orgId]/personas/page.tsx
    - src/components/activity/activity-log-viewer.tsx
    - src/app/[orgId]/search/components/advanced-filters-panel.tsx
    - src/app/[orgId]/search/components/bulk-actions-bar.tsx
    - src/components/prospect/profile-view.tsx
    - src/app/[orgId]/search/components/prospect-result-card.tsx
decisions:
  - "personas CTA routes to /{orgId}/search (actionable) instead of helper's self-referential /{orgId}/personas — real-estate-agent test: click should take you somewhere useful"
  - "lists empty-state keeps existing CreateListDialog trigger (same as header) to preserve proven UX; helper supplies title/body/disabled-CTA label only — avoids scope creep into create-list-dialog.tsx"
  - "prospect-result-card: wealth_tier badge is conditionally rendered via extended prospect shape (ApolloPerson & { wealth_tier?: string | null }) — safe if upstream attaches enrichment metadata; null/undefined renders nothing"
  - "Per-source enrichment-dot tooltips use an inline Record<string,string> (5 sources: contactout/exa/sec/market/claude) — no reuse justifies extracting a helper"
metrics:
  duration: "~35 min"
  completed: 2026-04-15
---

# Phase 41 Plan 05: Empty-State CTAs + Inline Tooltips Summary

Phase 41 polish pass: centralized empty-state copy with one pure helper, wired into 3 surfaces this plan owns (dashboard owned by Plan 04), plus 4 inline explanatory Tooltips on dense search/profile controls. Real-estate-agent-friendly language — no "persona" jargon without "saved search" context.

## What Shipped

### 1. Pure copy map + helper

`src/lib/onboarding/empty-state-copy.ts` — `EMPTY_STATE_COPY` record keyed by `EmptyStateSurface` (`"dashboard" | "lists" | "personas" | "activity"`), each entry carrying `title`, `body`, `ctaLabel`, and `ctaHref(orgId) => string`. `emptyStateCopy(surface)` returns the entry or a safe fallback (never null, never throws).

All copy uses the phrase "saved search" anywhere "persona" would otherwise appear — the personas entry specifically is covered by a test asserting `"saved search"` appears in its title/body/ctaLabel joined text.

### 2. Four EmptyState CTA surfaces

| Surface | File | Trigger | CTA |
|---|---|---|---|
| Dashboard | `src/app/[orgId]/page.tsx` | **Plan 04 owns** (Wave 3 coordination) | `emptyStateCopy("dashboard")` → Link to `/{orgId}/personas` |
| Lists | `src/app/[orgId]/lists/components/lists-page-client.tsx` | `lists.length === 0` | Existing `CreateListDialog` trigger (keeps header-button UX); helper supplies title/body/disabled-label |
| Personas | `src/app/[orgId]/personas/page.tsx` | `personas.length === 0` | `<Button asChild><Link href="/{orgId}/search">Create your first saved search</Link></Button>` — routes to search, not back to `/personas`, so the click is actionable |
| Activity | `src/components/activity/activity-log-viewer.tsx` | `entries.length === 0` | `<Button asChild><Link href={emptyCopy.ctaHref(orgId)}>Start a search</Link></Button>` — `useParams()` resolves `orgId` inside the client component |

This plan shipped 3 of 4. Plan 04 wires the dashboard surface as part of its Wave 3 mount work per the coordination note at the top of 41-05-PLAN.md.

### 3. Four inline Tooltips

All four consume the existing shadcn `Tooltip` primitive. `TooltipProvider` was already mounted once at `src/app/layout.tsx:54` (confirmed pre-existing) — no new providers added anywhere.

| # | File | Control wrapped | Copy |
|---|---|---|---|
| 1 | `advanced-filters-panel.tsx` | Toggle `<button>` (keeps `data-tour-id="advanced-filters-toggle"` attribute) | "Narrow results by industry, title, location, wealth tier, and more." |
| 2 | `bulk-actions-bar.tsx` | Enabled "Enrich Selection" `<Button variant="gold">` (disabled path already had its own Tooltip explaining the assistant-role restriction) | "Uses about 1 credit per prospect. Pulls email, phone, wealth signals, and recent news." |
| 3 | `profile-view.tsx` | Each enrichment status dot — 5 sources: `contactout` / `exa` / `sec` / `market` / `claude`. Each dot is an individual `<Tooltip>` with its own copy via a `sourceTooltips` Record. | Per-source 1-sentence explanations (e.g. "SEC EDGAR filings including Form 4 insider transactions.", "AI-generated summary synthesizing all sources above.") |
| 4 | `prospect-result-card.tsx` | `<WealthTierBadge>` (conditionally rendered when `prospect.wealth_tier` is truthy — the card's extended prospect shape tolerates the enriched-payload case) | "Estimated net worth. Tier is derived from public filings, company ownership, and observed signals." |

## Deviations from Plan

### Minor scope adjustments (not Rule 1-4 deviations; plan-latitude calls)

**1. personas empty-state CTA routes to `/search`, not to the helper's `/{orgId}/personas`.**
- The helper's `ctaHref` for "personas" returns `/{orgId}/personas` which is self-referential from the personas page. A button that click-refreshes the page users are already on fails the real-estate-agent usability test.
- Compromise: helper stays consistent (all 4 surface entries follow the same shape), but the personas page hard-codes the `href` to `/search` where a saved search is actually created. Comment in `personas/page.tsx` explains the divergence.

**2. lists empty-state keeps existing CreateListDialog instead of a Link Button.**
- The lists CTA `ctaHref` is similarly self-referential (`/{orgId}/lists`). The existing `CreateListDialog` component is already a proven dialog trigger that matches the header button — wrapping a plan-literal `<Link>` inside the empty state would be strictly worse UX than the existing dialog.
- Compromise: consume the helper for `title`, `body`, and the `ctaLabel` on the disabled (non-canEdit) fallback path. The enabled path continues to render `CreateListDialog` which opens the create-list modal in-place. Inline comment documents this.
- Net: no scope creep into `create-list-dialog.tsx` (not in file_modified), preserves prior-plan optimistic-create UX.

**3. prospect-result-card extended prospect shape for wealth_tier.**
- `ApolloPerson` type (the prop type for this card) does not declare `wealth_tier`. The card had a `{/* Name + wealth badge */}` comment but no badge rendered.
- To honor the plan's "Wealth tier badge wrapped in Tooltip" requirement without editing external types, I used an inline intersection cast: `(prospect as ApolloPerson & { wealth_tier?: string | null }).wealth_tier`. Renders `WealthTierBadge` (and its Tooltip) only when the field is truthy, a no-op otherwise.
- This card is not currently instantiated anywhere in the codebase (confirmed via grep — zero callers). If/when a caller passes an enriched-prospect payload with `wealth_tier`, the tooltip-wrapped badge will appear automatically. No runtime regression risk.

### None of the above are Rule 1-4 auto-fixes. All are scope-clarification calls within the plan's "minimal edits" constraint.

## Authentication Gates

None. No network or Supabase calls introduced by this plan.

## TDD Gate Compliance

- RED commit: `f24c1f1 test(41-05): add failing tests for emptyStateCopy pure helper` (tests failed because module didn't exist)
- GREEN commit: `9b0a5db feat(41-05): implement emptyStateCopy pure helper` (7/7 tests green)
- No REFACTOR commit — implementation was clean at GREEN and needed no cleanup.

## Tests

`npx vitest run src/lib/onboarding/__tests__/empty-state-copy.test.ts` — **7/7 passing**:

1. `EMPTY_STATE_COPY has exactly 4 known surfaces`
2. `personas copy defines 'saved search' in agent-friendly terms`
3. `ctaHref substitutes orgId` (all 4 surfaces)
4. `every entry has title, body, ctaLabel, and ctaHref`
5. `emptyStateCopy returns entry for known surface`
6. `emptyStateCopy returns fallback for unknown surface (no null, no throw)`
7. `fallback ctaHref still substitutes orgId`

No RTL / component tests — matches phase test strategy (pure helpers only).

## Verification Evidence

```
$ grep -rln "emptyStateCopy(" src/app src/components
src/app/[orgId]/lists/components/lists-page-client.tsx
src/app/[orgId]/personas/page.tsx
src/components/activity/activity-log-viewer.tsx
# (4th consumer — dashboard — shipped by Plan 04)

$ grep -l "TooltipContent" 4-target-files
src/app/[orgId]/search/components/advanced-filters-panel.tsx
src/app/[orgId]/search/components/bulk-actions-bar.tsx
src/components/prospect/profile-view.tsx
src/app/[orgId]/search/components/prospect-result-card.tsx

$ npx tsc --noEmit  # filtered for touched files
# (no output — all clean; 7 pre-existing errors in unrelated files confirmed pre-existing)
```

## Commits

1. `f24c1f1` — test(41-05): add failing tests for emptyStateCopy pure helper
2. `9b0a5db` — feat(41-05): implement emptyStateCopy pure helper
3. `bafdab1` — feat(41-05): wire emptyStateCopy helper into 3 empty-state surfaces
4. `36a12b7` — feat(41-05): add 4 inline Tooltips to dense controls

## Known Stubs

None. All code paths render real content or correctly omit rendering (e.g. wealth badge skipped when tier is null).

## Out-of-scope Pre-existing Issues (not fixed)

- `src/components/ui/popover.tsx:4` — missing `@radix-ui/react-popover` module resolution. Unrelated to this plan; tracked by Plan 02 area.
- `src/lib/search/__tests__/execute-research.test.ts:178-200` — 6 tuple/undefined type errors pre-dating this plan.

These were visible in the same `npx tsc --noEmit` run but none are in files this plan modified. Per scope boundary, logged here but not auto-fixed.

## Self-Check: PASSED

- **Files created:**
  - FOUND: `src/lib/onboarding/empty-state-copy.ts`
  - FOUND: `src/lib/onboarding/__tests__/empty-state-copy.test.ts`
- **Files modified:**
  - FOUND: all 5 consumer files (lists-page-client, personas/page, activity-log-viewer, advanced-filters-panel, bulk-actions-bar, profile-view, prospect-result-card)
- **Commits:**
  - FOUND: `f24c1f1`, `9b0a5db`, `bafdab1`, `36a12b7`
- **Tests:** 7/7 green
- **tsc scope-filtered:** 0 errors on touched files
