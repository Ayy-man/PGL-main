---
phase: 26-targeted-multi-source-search
plan: 05
subsystem: api, ui
tags: [multi-source-search, channel-ui, research, next.js, typescript, tailwind]

# Dependency graph
requires:
  - phase: 26-targeted-multi-source-search
    plan: 04
    provides: "executeResearch orchestrator, ResearchResult, ResearchParams, ChannelResult, CHANNEL_DISPLAY_NAMES"

provides:
  - "POST /api/prospects/[prospectId]/research/multi-source — intent-routed multi-source research endpoint"
  - "ChannelStatusBar component — per-channel status pills with loading/success/cached/error/empty states"
  - "ChannelFilterChips component — toggleable gold-active filter chips for channel filtering"
  - "ResearchResultCard component — channel-badged result card with category border + relevance dot"

affects:
  - phase-25-research-scrapbook
  - profile-view-research-tab
  - any UI consuming multi-source search results

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Channel UI components use CSS design tokens (--gold-primary, --text-primary-ds, surface-card)"
    - "Date formatting via Intl.DateTimeFormat (no date-fns, per Phase 12 decision)"
    - "Multi-source API route placed at /research/multi-source to avoid conflict with existing Phase 25 streaming endpoint"

key-files:
  created:
    - src/app/api/prospects/[prospectId]/research/multi-source/route.ts
    - src/components/research/channel-status-bar.tsx
    - src/components/research/channel-filter-chips.tsx
    - src/components/research/research-result-card.tsx
  modified: []

key-decisions:
  - "Route placed at /research/multi-source (not /research) to avoid breaking Phase 25 streaming scrapbook endpoint at the same path"
  - "ChannelFilterChips uses Set<string> for activeFilters with size===0 meaning all-active (avoids redundant all-channels tracking)"
  - "ResearchResultCard falls back to source_name if channelId not in CHANNEL_DISPLAY_NAMES for forward compatibility"

patterns-established:
  - "Channel badge pattern: text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary-ds)]"
  - "Category border pattern: border-l-2 + category-specific color class on surface-card"
  - "Filter chip active state: bg-[var(--gold-bg-strong)] text-[var(--gold-primary)] border-[var(--border-gold)]"

requirements-completed:
  - MSS-13
  - MSS-14
  - MSS-15

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 26 Plan 05: Research API Route + Channel UI Components Summary

**Multi-source research API endpoint and three UI components (ChannelStatusBar, ChannelFilterChips, ResearchResultCard) wiring the Plan 01-04 pipeline to the frontend with per-channel attribution, status indicators, and gold-themed filter chips.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T00:18:10Z
- **Completed:** 2026-03-29T00:21:21Z
- **Tasks:** 2 (Task 3 is checkpoint — paused for human verify)
- **Files modified:** 4

## Accomplishments
- `POST /api/prospects/[prospectId]/research/multi-source` authenticates user, fetches prospect, delegates to `executeResearch`, returns `ResearchResult` JSON
- `ChannelStatusBar` renders loading/success/cached/error/empty pill states per channel with latency in ms
- `ChannelFilterChips` provides toggleable filter chips — "All" chip clears filters, per-channel chips show result counts, gold active state
- `ResearchResultCard` shows channel badge, category-colored left border (news=blue, wealth=gold, corporate=purple, property=green, career=teal), relevance dot, headline link, 3-line summary, source attribution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create research API route** - `017d2c6` (feat)
2. **Task 2: Create UI components** - `94cb02c` (feat)

## Files Created/Modified
- `src/app/api/prospects/[prospectId]/research/multi-source/route.ts` - POST handler delegating to executeResearch with full auth + tenant pattern
- `src/components/research/channel-status-bar.tsx` - ChannelStatusBar with 5 state variants
- `src/components/research/channel-filter-chips.tsx` - ChannelFilterChips with gold active toggle
- `src/components/research/research-result-card.tsx` - ResearchResultCard with CHANNEL_DISPLAY_NAMES badge and category left border

## Decisions Made
- Route placed at `/research/multi-source` instead of `/research` to avoid overwriting the existing Phase 25 streaming scrapbook endpoint (a different, streaming-only interface). Both endpoints can coexist.
- `ChannelFilterChips` treats `activeFilters.size === 0` as "All active" to avoid needing a separate all-channels set. The "All" button iterates active filters to clear them.
- `ResearchResultCard` uses `CHANNEL_DISPLAY_NAMES[channelId] ?? source_name` as the channel badge label for forward compatibility with future channels not yet in the registry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Routed to /research/multi-source to avoid existing route conflict**
- **Found during:** Task 1 (Create research API route)
- **Issue:** The plan specified creating `src/app/api/prospects/[prospectId]/research/route.ts` but that file already exists with the Phase 25 streaming scrapbook endpoint (imports from `ai`, manages sessions, streams cards). Overwriting it would break Phase 25 functionality.
- **Fix:** Created the new endpoint at `/research/multi-source/route.ts` instead — a sub-route that coexists with the streaming endpoint without conflict.
- **Files modified:** `src/app/api/prospects/[prospectId]/research/multi-source/route.ts`
- **Verification:** Build passes, existing route unchanged
- **Committed in:** 017d2c6

**2. [Rule 3 - Blocking] Ran pnpm install to restore missing ai package**
- **Found during:** Task 1 build verification
- **Issue:** `node_modules/ai` was missing (not installed) despite being in package.json, causing build failure on the existing Phase 25 route.
- **Fix:** Ran `pnpm install` to restore dependencies.
- **Files modified:** None (node_modules only)
- **Verification:** Build passes after install
- **Committed in:** (dependency restoration, no new files committed)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes required for build to pass and to preserve Phase 25 functionality. No scope creep.

## Issues Encountered
- Existing `route.ts` at the target path was the Phase 25 streaming research endpoint — resolved by creating a sub-route at `/multi-source`.

## User Setup Required
The plan's `user_setup` specifies API keys for GNews, OpenCorporates, and Crunchbase. These channels are already implemented in Plans 26-01 through 26-04 and will skip silently if the keys are missing. No additional setup is required to use the API route or UI components — channels with missing keys return empty results.

For full channel coverage, add to `.env.local` and Vercel:
- `GNEWS_API_KEY` — https://gnews.io
- `OPENCORPORATES_API_TOKEN` — https://opencorporates.com
- `CRUNCHBASE_API_KEY` — https://data.crunchbase.com

## Known Stubs
None — all components receive real data from props (no hardcoded empty values or placeholder text).

## Next Phase Readiness
- API route and all 3 UI components are ready to be integrated into the Phase 25 research profile view
- Components accept standard props from `ResearchResult` shape — no adapter layer needed
- Task 3 (human verify) requires running `pnpm build --no-lint` and confirming file structure

---
*Phase: 26-targeted-multi-source-search*
*Completed: 2026-03-29*
