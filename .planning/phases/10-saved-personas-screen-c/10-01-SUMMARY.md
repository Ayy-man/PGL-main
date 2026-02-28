---
phase: 10-saved-personas-screen-c
plan: "01"
subsystem: personas-ui
tags: [recharts, sparkline, persona-card, css-variables, client-components]
dependency_graph:
  requires: []
  provides:
    - PersonaSparkline component (Recharts LineChart sparkline wrapper)
    - PersonaCard component (full persona card with sparkline, filter tags, stats, actions)
    - PersonaCardGrid component (responsive grid + Create New Persona CTA)
  affects:
    - src/app/[orgId]/personas/ (ready for composition into three-column layout in Plan 03)
tech_stack:
  added: []
  patterns:
    - Recharts ResponsiveContainer + LineChart with no axes (sparkline pattern)
    - Deterministic sparkline data from persona.id hash (7 data points, LCG seed)
    - onMouseEnter/Leave for CSS variable hover states (established project pattern)
    - inline style for CSS variable gradients (Tailwind v3 cannot resolve CSS gradient variables)
    - PersonaFormDialog reused as trigger wrapper (no modification)
key_files:
  created:
    - src/app/[orgId]/personas/components/persona-sparkline.tsx
    - src/app/[orgId]/personas/components/persona-card.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
  modified: []
decisions:
  - "PersonaCard uses useState for card hover style instead of inline onMouseEnter mutation — cleaner React pattern for multi-property hover state"
  - "ghostButtonStyle defined as React.CSSProperties constant — avoids object literal repetition across Search/Explore/Edit/Delete buttons"
  - "filterTags capped at 4 per plan spec (2 titles + 1 industry + 1 seniority) — keeps chip row compact"
  - "matchCount derived from last sparkline value * 5 — purely decorative, consistent with plan spec for placeholder match count"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-01"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 10 Plan 01: Persona Card Components Summary

Three client components built: Recharts gold sparkline wrapper, full persona card with design-system surface treatment, and responsive card grid with Create New Persona CTA.

## What Was Built

### PersonaSparkline (`persona-sparkline.tsx`)
Thin Recharts LineChart wrapper for inline sparklines inside persona cards. 36px height, gold stroke (`var(--gold-primary)`), no axes, no grid, no dots, no animation. Returns null on empty data. Uses ResponsiveContainer for responsive sizing.

### PersonaCard (`persona-card.tsx`)
Full persona card with 6 layout rows:
1. Name (Cormorant Garamond 22px via `font-serif`) + "Suggested" gold badge on starter personas
2. Description (conditional, 13px, line-clamp-2)
3. Filter criteria chips (up to 4 tags: 2 titles + 1 industry + 1 seniority) with `--bg-elevated` background
4. Stats row: "Last Run" date (or "Never run") + "Total" match count in gold monospace
5. PersonaSparkline with 7 deterministic data points seeded from persona.id hash
6. Action buttons: Search + Explore links (both to `/{orgId}/search?persona={id}`), Edit (PersonaFormDialog) + Delete (`deletePersonaAction`) for non-starter personas only

All card styling uses CSS variables via inline style. Hover state managed via useState + onMouseEnter/Leave (Tailwind hover: cannot reference CSS custom properties).

### PersonaCardGrid (`persona-card-grid.tsx`)
Responsive CSS Grid with `minmax(340px, 1fr)` auto-fill columns and 20px gap. Maps persona array to PersonaCard components. Last grid item is a dashed-border "Create New Persona" CTA card wrapping PersonaFormDialog mode="create" as trigger — gold circle with Plus icon, label, and subtitle.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: PersonaSparkline + PersonaCard | `67ccd59` | persona-sparkline.tsx, persona-card.tsx |
| Task 2: PersonaCardGrid | `bcddb4b` | persona-card-grid.tsx |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note on pre-existing TypeScript errors:** `src/app/[orgId]/page.tsx` and `src/app/[orgId]/prospects/[prospectId]/page.tsx` have pre-existing TypeScript errors unrelated to this plan. None of the three new files have TypeScript errors.

## Self-Check: PASSED

Files created:
- FOUND: src/app/[orgId]/personas/components/persona-sparkline.tsx
- FOUND: src/app/[orgId]/personas/components/persona-card.tsx
- FOUND: src/app/[orgId]/personas/components/persona-card-grid.tsx

Commits:
- FOUND: 67ccd59
- FOUND: bcddb4b
