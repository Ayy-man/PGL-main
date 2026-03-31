---
phase: quick
plan: 260331-qpm
subsystem: research-panel
tags: [ui, session-history, layout, refactor]
dependency_graph:
  requires: []
  provides: [inline-session-history-panel]
  affects: [research-panel]
tech_stack:
  added: []
  patterns: [inline-flex-child-panel, no-absolute-positioning]
key_files:
  modified:
    - src/components/prospect/research-panel.tsx
decisions:
  - "Removed X close button — clock icon toggle is sufficient for open/close"
  - "Session rows omit result count for compactness — just query text + date"
  - "maxHeight 220px with overflow-y-auto prevents panel from pushing chat area off screen"
metrics:
  duration: "5 min"
  completed: "2026-03-31"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260331-qpm: Replace Floating Session History Dropdown with Inline Panel

**One-liner:** Replaced absolute-positioned z-50 dropdown with a flex-sibling inline panel between header strip and chat messages area.

## What Was Done

Refactored the session history UI in `research-panel.tsx` to eliminate the floating dropdown pattern. The session list now renders as a normal flow element inside the card's flex column, directly below the prospect context strip header and above the messages area.

## Changes Made

### Task 1: Replace floating dropdown with inline session panel

**File:** `src/components/prospect/research-panel.tsx`

- Removed the `{showSessionHistory && ...}` block containing `absolute right-0 top-10 z-50 w-72` positioned dropdown
- Removed the X close button (`<X className="w-3 h-3" />`) and its `X` import from lucide-react
- Changed clock button parent from `<div className="relative flex-shrink-0">` to `<div className="flex-shrink-0">` (no longer needs relative anchor)
- Added new inline session panel as a flex sibling between header `</div>` and Messages Area `<div>`:
  - `flex-shrink-0 overflow-y-auto` — normal flow, doesn't expand to fill
  - `background: #1a1a1a` with `borderBottom` separator
  - `maxHeight: 220px` to keep it compact
  - "+ New" button at top (gold text, hover highlight)
  - Session rows: query text (truncated, flex-1) + date (shrink-0) on single line
  - Clock icon toggle handles both open and close

**Commit:** `66f3bda`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- Lint: `npx next lint --file src/components/prospect/research-panel.tsx` — passes with only pre-existing warnings (react-hooks/exhaustive-deps, no-img-element), no new errors
- No `X` import remains in lucide-react import line
- No `absolute`, `z-50`, or `w-72` classes remain in session history code
- Inline panel is a sibling div in the outer flex column, not inside the clock button wrapper

## Self-Check: PASSED

- File exists: `src/components/prospect/research-panel.tsx` — FOUND
- Commit exists: `66f3bda` — FOUND
- No floating dropdown classes remain in file
