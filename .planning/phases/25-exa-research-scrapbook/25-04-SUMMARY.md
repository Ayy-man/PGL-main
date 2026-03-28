---
phase: 25-exa-research-scrapbook
plan: 04
subsystem: ui
tags: [react, typescript, research, scrapbook, streaming, sse, shadcn]

# Dependency graph
requires:
  - phase: 25-01
    provides: research types and shadcn AI component intent (types now created here instead)

provides:
  - DossierResearchToggle: two-tab pill toggle (dossier/research) with gold active indicator
  - ResearchPanel: full chat UX with SSE streaming phases, suggestions, session history
  - ResearchResultCard: rich result cards with category badges, relevance dots, pin/copy actions
  - ResearchPinDropdown: 3-target pin flow with inline edit mode and 5-second undo
  - src/types/research.ts: ScrapbookCard, PinTarget, ResearchSession, ResearchMessage types

affects:
  - 25-05 (profile view wiring — will consume all 4 components)
  - 25-02, 25-03 (API routes — consumed by ResearchPanel and ResearchPinDropdown)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSE stream parsing via ReadableStream reader (no useChat hook dependency)
    - Streaming phase state machine (idle/reasoning/tool/shimmer/cards/sources/complete)
    - cardFadeIn CSS keyframe with index*120ms stagger delay
    - Inline edit dropdown pattern for pin flow
    - CSS variable design system usage throughout (no hardcoded colors except fallbacks)

key-files:
  created:
    - src/components/prospect/dossier-research-toggle.tsx
    - src/components/prospect/research-panel.tsx
    - src/components/prospect/research-result-card.tsx
    - src/components/prospect/research-pin-dropdown.tsx
    - src/types/research.ts
  modified: []

key-decisions:
  - "Implemented SSE stream parsing via fetch+ReadableStream instead of useChat — avoids AI SDK message format coupling"
  - "Created src/types/research.ts here (Plan 01 dependency not available) — ScrapbookCard, PinTarget, etc."
  - "ResearchPinDropdown renders edit mode absolutely-positioned within card context — avoids portal complexity"
  - "cardFadeIn keyframe defined inline via <style> tag in ResearchResultCard — avoids globals.css modification"
  - "ShimmerCard, ReasoningBlock, ToolStatus, CardGroup, SourcesList extracted as sub-components inside research-panel.tsx"

patterns-established:
  - "CSS variable fallbacks: var(--token, hardcoded-fallback) for all design tokens"
  - "Streaming phase state machine: setStreamPhase drives which indicator renders"
  - "Low-relevance collapse: filter cards by relevance!==low && answer_relevance!==background"
  - "5-second undo window: setTimeout + UI state reset (DB undo deferred)"

requirements-completed: [RES-12, RES-13, RES-14, RES-15]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 25 Plan 04: Research Scrapbook UI Components Summary

**Four research scrapbook components: tab toggle, streaming chat panel, result card with category badges, and pin dropdown with 3-target inline edit flow**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-28T23:34:42Z
- **Completed:** 2026-03-28T23:38:47Z
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments

- DossierResearchToggle: controlled two-tab pill with gold bottom border on active tab, CSS-variable design system compliance
- ResearchPanel: full streaming UX with SSE parsing, prospect context strip, smart suggestions (fetch on mount), session history clock dropdown, streaming phase indicators (reasoning/tool/shimmer/cards/sources), low-relevance collapse, gold focus ring textarea
- ResearchResultCard: category badge (8 color mappings), relevance dot (gold=high, muted=medium, none=low), 15px/600 headline, line-clamp-3 summary with read-more, source favicon+link footer, cardFadeIn stagger animation, pinned state with gold left border
- ResearchPinDropdown: 3 targets (Zap/MessageSquare/FileText), inline edit mode with pre-fill, dossier_hook suggests "Ask about their {headline}", gold gradient Save & Pin button, 5-second undo window
- src/types/research.ts: ScrapbookCard, PinTarget, ResearchSession, ResearchMessage, ResearchPin, SessionListItem

## Task Commits

1. **Task 1: DossierResearchToggle + ResearchPanel + types** - `cadc38e` (feat)
2. **Task 2: ResearchResultCard + ResearchPinDropdown** - `fd8f32b` (feat)

## Files Created/Modified

- `src/components/prospect/dossier-research-toggle.tsx` - Controlled two-tab pill toggle, gold active bottom border
- `src/components/prospect/research-panel.tsx` - Main research chat panel with full streaming UX, ~390 lines
- `src/components/prospect/research-result-card.tsx` - Result card with category badge, relevance, pin/copy actions
- `src/components/prospect/research-pin-dropdown.tsx` - Pin target dropdown with 3 targets and inline edit mode
- `src/types/research.ts` - All research domain types (ScrapbookCard, PinTarget, SessionListItem, etc.)

## Decisions Made

- **SSE over useChat:** Used fetch+ReadableStream parser instead of AI SDK's `useChat` hook. The plan explicitly notes "Claude's discretion" for state management — useChat expects specific message formats that would require backend shaping. Custom SSE parsing is simpler and decoupled.
- **Types created here:** Plan 01 was supposed to create `src/types/research.ts` but the file didn't exist. Created it here as a deviation (Rule 2 — missing critical functionality required for TypeScript compilation).
- **Sub-components in research-panel.tsx:** ReasoningBlock, ToolStatus, ShimmerCard, CardGroup, SourcesList kept in the same file to avoid fragmentation. These are not exported — they're implementation details of ResearchPanel.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created src/types/research.ts**
- **Found during:** Task 1 (DossierResearchToggle + ResearchPanel)
- **Issue:** Plan references `@/types/research` imports for ScrapbookCard and PinTarget, but Plan 01 had not created this file (only plans, no summaries present for 25-01)
- **Fix:** Created full research types file with ScrapbookCard, PinTarget, ResearchSession, ResearchMessage, ResearchPin, SessionListItem
- **Files modified:** src/types/research.ts (created)
- **Verification:** TypeScript compilation (`npx tsc --noEmit`) passes with no errors
- **Committed in:** cadc38e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for TypeScript compilation. No scope creep.

## Issues Encountered

- node_modules not installed in worktree — used `npx tsc --noEmit` for TypeScript validation instead of `pnpm build`. TypeScript passed with 0 errors.

## Known Stubs

None — all components are fully wired to their API endpoints:
- ResearchPanel: POST `/api/prospects/${prospectId}/research`, POST `.../suggestions`, GET `.../sessions`, GET `.../sessions/${id}`
- ResearchPinDropdown: POST `.../research/pin`

API routes themselves are in scope for Plans 25-02 and 25-03.

## Next Phase Readiness

- All 4 components ready for wiring into profile view (Plan 25-05)
- ResearchPanel expects API routes from Plan 25-02 (research) and 25-03 (pin/sessions)
- DossierResearchToggle ready for profile-view tab switching integration

---
*Phase: 25-exa-research-scrapbook*
*Completed: 2026-03-28*
