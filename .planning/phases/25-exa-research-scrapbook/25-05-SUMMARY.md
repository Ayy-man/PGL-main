---
phase: 25-exa-research-scrapbook
plan: "05"
subsystem: integration
tags: [react, typescript, profile-view, tab-toggle, research-panel, signal-timeline, activity-log]
dependency_graph:
  requires:
    - "25-03: research API routes (POST/GET sessions, streaming /run, pin endpoints)"
    - "25-04: DossierResearchToggle, ResearchPanel, ResearchResultCard UI components"
  provides:
    - "Dossier/Research tab toggle wired into prospect profile center column"
    - "ResearchPanel accessible from profile page"
    - "SignalTimeline research-pin visual distinction"
  affects:
    - "src/components/prospect/profile-view.tsx"
    - "src/components/prospect/signal-timeline.tsx"
    - "src/components/prospect/intelligence-dossier.tsx"
tech_stack:
  added: []
  patterns:
    - "useRef for deduplication (lastResearchLogRef, 3600000ms threshold)"
    - "CSS @keyframes goldHighlight for 1s fade animation"
    - "tailwindcss-animate classes: animate-in fade-in slide-in-from-bottom-1 duration-250"
key_files:
  modified:
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/signal-timeline.tsx
    - src/components/prospect/intelligence-dossier.tsx
decisions:
  - "Use profile_viewed event_type (not 'viewed') since TeamEventType union only has profile_viewed; distinguish research tab via metadata.section='research'"
  - "Deduplication via useRef<number> tracking last log epoch (3600000ms = 1hr threshold)"
  - "Research-pinned signals use separate Search icon + NEW badge; non-research unseen signals keep existing animate-pulse badge"
  - "MVP: dossier hook reactivity requires page refresh; real-time update is a v2 enhancement"
metrics:
  duration: "2 min"
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 3
---

# Phase 25 Plan 05: Profile Integration Summary

**One-liner:** Dossier/Research tab toggle wired into profile-view center column, with research-pinned signal distinctions and deduplicated activity logging.

## What Was Built

### Task 1: Wire tab toggle into profile-view.tsx center column (commit: 40d6013)

Modified `src/components/prospect/profile-view.tsx`:
- Added `useRef` import alongside existing `useState, useCallback`
- Imported `DossierResearchToggle` and `ResearchPanel`
- Added `activePanel` state (`"dossier" | "research"`, defaults to `"dossier"`)
- Added `lastResearchLogRef` (useRef<number>) for deduplication
- Added `handlePanelChange` callback: sets active panel, fires `profile_viewed` activity log with `metadata.section="research"` deduplicated to once per hour
- Replaced center column's bare `<IntelligenceDossier>` with:
  - `<DossierResearchToggle>` toggle bar
  - Crossfade `<div>` with `animate-in fade-in slide-in-from-bottom-1 duration-250`
  - Conditional render: `IntelligenceDossier` on "dossier" tab, `ResearchPanel` on "research" tab
- `<SignalTimeline>` remains below the toggle block (visible in both tabs)
- No changes to `page.tsx` — already uses `select("*")` which covers all required fields

### Task 2: Update SignalTimeline for research-pinned signals (commit: 7b7192f)

Modified `src/components/prospect/signal-timeline.tsx`:
- Imported `Search` from lucide-react
- Added `isResearchPin = signal.raw_source === "research"` check per signal
- Research-pinned + `is_new` signals: Show `Search` icon (gold) + gold "NEW" badge in separate `<div>`
- Non-research unseen signals: Keep original animate-pulse NEW badge (no regression)
- Added `goldHighlight` `@keyframes` via inline `<style>` tag: gold bg 0.15 opacity -> transparent over 1s
- Applied `goldHighlight 1s ease forwards` animation to research + is_new signal rows

Modified `src/components/prospect/intelligence-dossier.tsx`:
- Added comment block before `outreach_hooks` map explaining MVP reactivity: pinned hooks appear after page refresh, not real-time. Real-time update would require parent refetch or optimistic update from ResearchPanel pin callback.

## Decisions Made

1. **event_type mapping**: Plan CONTEXT.md says `type: 'viewed'` but `TeamEventType` union only has `'profile_viewed'`. Using `profile_viewed` with `metadata.section='research'` is the correct mapping per the plan's own note.

2. **Deduplication approach**: `useRef<number>` tracking epoch milliseconds avoids re-render overhead vs. `useState`. Fires once per browser session per hour per tab visit.

3. **Separate badge logic for research vs non-research**: Research pins get Search icon + simple gold NEW badge (no animate-pulse — the goldHighlight row animation is the visual cue). Non-research unseen signals keep the existing pulsing NEW badge.

4. **Dossier reactivity**: For MVP, pinned hooks appear on page refresh. Added a comment explaining this and noting the v2 path (refetch or optimistic update from pin callback).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all wired to real data.

## Self-Check: PASSED

Files exist:
- src/components/prospect/profile-view.tsx — FOUND (modified)
- src/components/prospect/signal-timeline.tsx — FOUND (modified)
- src/components/prospect/intelligence-dossier.tsx — FOUND (modified)

Commits exist:
- 40d6013 — feat(25-05): wire Dossier/Research tab toggle into profile-view center column
- 7b7192f — feat(25-05): update SignalTimeline for research-pinned signals + dossier hook note

## Awaiting

Task 3 (human-verify checkpoint) — end-to-end browser verification of the Research Scrapbook feature.
