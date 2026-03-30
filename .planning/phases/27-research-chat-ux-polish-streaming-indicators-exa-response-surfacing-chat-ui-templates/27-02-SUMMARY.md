---
phase: 27-research-chat-ux-polish-streaming-indicators-exa-response-surfacing-chat-ui-templates
plan: 02
subsystem: ui
tags: [react, streaming, sse, animation, css, research-panel]

# Dependency graph
requires:
  - phase: 27-01
    provides: "exa_highlights, exa_highlight_scores, exa_summary, exa_author, exa_image on ScrapbookCard"
provides:
  - STREAMING_LABELS map with phase-contextual labels (reasoning, tool, shimmer, cards, sources)
  - exaResultCount state parsed from tool_call SSE event.count field
  - "Analyzing N results..." label transitioning immediately on tool_call completion
  - ExaHighlightQuote sub-component rendering gold-bordered blockquote at score >= 0.7
  - Author chip in result card footer when exa_author is present
  - cardFadeIn and slideDown keyframes in globals.css (removed from inline style tags)
  - Improved "No results found" empty state with prospect first_name guidance
  - Centered empty session state with icon + descriptive text
affects: [research-panel, research-result-card, streaming UX, card rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "STREAMING_LABELS constant map drives UI text from StreamPhase enum values"
    - "SSE tool_call event.count directly updates toolStatus label before shimmer phase starts"
    - "Score-gated pull-quotes: only render ExaHighlightQuote when top score >= 0.7"
    - "Global keyframes in globals.css shared across all card instances (no per-card style duplication)"

key-files:
  created: []
  modified:
    - src/components/prospect/research-panel.tsx
    - src/components/prospect/research-result-card.tsx
    - src/app/globals.css

key-decisions:
  - "Shimmer phase shows ToolStatus label ('Analyzing results...') alongside skeleton cards for continuous feedback"
  - "ExaHighlightQuote uses top score (index 0) only; numeric scores never displayed in UI"
  - "exa_image thumbnail explicitly skipped per RESEARCH.md Pitfall 5 (og:image often generic/low-quality)"
  - "exaResultCount stored as _exaResultCount (unused read) since label transitions through toolStatus string"

patterns-established:
  - "STREAMING_LABELS: lookup map for phase-to-label text, fallback in ToolStatus JSX"
  - "ExaHighlightQuote: sub-component pattern — returns null for missing/low-score data, renders blockquote otherwise"

requirements-completed: [RCH-04, RCH-05, RCH-06, RCH-07]

# Metrics
duration: 12min
completed: 2026-03-29
---

# Phase 27 Plan 02: Research Chat UX Polish Summary

**Contextual streaming phase labels + Exa highlight pull-quotes on result cards + keyframes moved to globals.css**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-29T00:00:00Z
- **Completed:** 2026-03-29T00:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Streaming UX shows contextual labels at each phase: "Thinking about your question...", "Searching the web...", "Analyzing N results...", "Building intelligence cards...", "Collecting sources..."
- Tool call completion immediately transitions label to "Analyzing N results..." (parses event.count from SSE), fixing race condition before shimmer phase
- Shimmer phase now shows ToolStatus label alongside skeleton cards instead of just skeletons alone
- ExaHighlightQuote sub-component renders gold-bordered italic blockquote for top Exa highlights when score >= 0.7; hidden otherwise (backward compatible with old cards)
- Author chip added to result card footer when exa_author is available
- cardFadeIn and slideDown keyframe animations moved from per-card inline `<style>` tags to globals.css
- "No results found" message now includes helpful guidance referencing prospect's first name
- Empty session state (no messages, no suggestions) shows centered gold icon + descriptive text

## Task Commits

1. **Task 1: Streaming phase labels + tool_call count parsing + improved empty state** - `4df00dd` (feat)
2. **Task 2: ExaHighlightQuote on result cards + move keyframes to globals.css** - `1e41537` (feat)

## Files Created/Modified

- `src/components/prospect/research-panel.tsx` - STREAMING_LABELS map, exaResultCount state, updated SSE tool_call parsing, shimmer ToolStatus, improved empty states
- `src/components/prospect/research-result-card.tsx` - ExaHighlightQuote sub-component, author chip, removed inline style tag
- `src/app/globals.css` - Added @keyframes cardFadeIn and @keyframes slideDown

## Decisions Made

- Used `_exaResultCount` prefix (underscore) since the state is set but only consumed indirectly through `toolStatus` string — avoids lint warning while keeping the state for potential future direct display
- Shimmer phase shows both ToolStatus label AND skeleton cards simultaneously for better continuity feedback
- ExaHighlightQuote gates strictly on `scores[0] >= 0.7` — users don't need to see scores, just relevant highlights
- exa_image deliberately skipped per RESEARCH.md Pitfall 5

## Deviations from Plan

None — plan executed exactly as written. Pre-existing TypeScript errors in `src/lib/search/__tests__/execute-research.test.ts` (6 errors) were present before this plan and are out of scope.

## Issues Encountered

- Phase 27-01 changes (exa_* types) were on `main` branch but not yet in the worktree branch. Resolved by merging main into the worktree branch before executing tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Research chat UX polish complete for plans 01 and 02
- Plan 27-03 can proceed: chat UI templates / further enhancements
- All new fields (exa_highlights, exa_highlight_scores, exa_author) are optional — backward compatible with all persisted ScrapbookCards

---
*Phase: 27-research-chat-ux-polish-streaming-indicators-exa-response-surfacing-chat-ui-templates*
*Completed: 2026-03-29*
