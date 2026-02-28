---
phase: "09"
plan: "04"
subsystem: "prospect-profile"
tags: [design-tokens, audit, refactor, slide-over, wealth-signals]
dependency_graph:
  requires: [09-01]
  provides: [prospect-slide-over-audited, wealth-signals-token-compliant]
  affects: [prospect-profile-page]
tech_stack:
  added: []
  patterns: [surface-card-utility, css-variable-tokens, title-tooltip-ux]
key_files:
  modified:
    - src/components/prospect/prospect-slide-over.tsx
    - src/components/prospect/wealth-signals.tsx
key_decisions:
  - "title attribute used for tooltip on non-functional buttons — lightweight UX hint without building feature scope"
  - "surface-card replaces rounded-lg border bg-card / rounded-md border bg-background on all WealthSignals containers"
  - "hover:bg-[rgba(255,255,255,0.02)] replaces hover:bg-muted/50 on WealthSignals transaction rows to match MASTER data table pattern"
metrics:
  duration: "~2 min"
  completed_date: "2026-02-28"
  tasks_completed: 2
  files_modified: 2
---

# Phase 09 Plan 04: Audit + Clean Up Slide-Over Panel + Refactor WealthSignals Summary

Slide-over panel passes full 7-section audit with tooltip hints added to non-functional buttons; WealthSignals refactored to use surface-card utility and MASTER data table hover pattern throughout.

## What Was Built

### Task 1 — Audit and clean up ProspectSlideOver (commit: 1271e20)

Full audit of `prospect-slide-over.tsx` against design-system/pages/prospect-detail.md Section 4b:

- **Section 1 (Identity Block):** PASS — no changes
- **Section 2 (Quick Info Grid):** PASS — inline `var(--bg-card-gradient)` with `rounded-[10px]` acceptable per spec
- **Section 3 (Enrichment Progress):** PASS — gold gradient bar, source tags with status colors
- **Section 4 (AI Summary):** PASS — gold left-border, "AI INSIGHT" label, Generate Summary button
- **Section 5 (SEC Transactions):** PASS — top 5 rows, gold amounts, View All link
- **Section 6 (Notes):** FIXED — added `title="Add notes on the full profile page"` to "+ Add Note" button
- **Section 7 (Lists Membership):** FIXED — added `title="Add to list on the full profile page"` to "+ Add to List" button
- Additional checks: no raw zinc-* classes, only `#0d0d10` hex (acceptable per spec), all clickable elements have `cursor-pointer`, all icon-only buttons have `aria-label`

### Task 2 — WealthSignals design token compliance (commit: 6692d08)

Refactored `wealth-signals.tsx` to align with design system tokens:

- **Containers:** Replaced `rounded-lg border bg-card p-6` with `surface-card rounded-[14px] p-6` on both main and empty state divs
- **Mention cards:** Replaced `rounded-md border bg-background p-4` with `surface-card rounded-[14px] p-4`
- **Row hover:** Replaced `hover:bg-muted/50` with `hover:bg-[rgba(255,255,255,0.02)]` on transaction rows (MASTER data table pattern)
- **Heading:** Verified `font-serif` (not `font-cormorant`) — correct
- **Mention links:** Verified `text-gold hover:text-gold-muted` — already correct
- **Transaction amounts:** Verified `font-mono font-semibold text-gold` on total value column — already correct
- **Total amount:** Verified `font-mono font-semibold text-gold` on summary total — already correct
- **No raw color classes:** No `text-white`, `bg-red-*`, `bg-green-*`, `zinc-*` found

## Verification Results

- [x] TypeScript clean for both target files (pre-existing errors in unrelated files are out of scope)
- [x] ProspectSlideOver "+ Add Note" button has tooltip
- [x] ProspectSlideOver "+ Add to List" button has tooltip
- [x] No functional changes to slide-over behavior (purely cosmetic)
- [x] WealthSignals uses `surface-card` for containers (3 occurrences)
- [x] WealthSignals transaction amounts use `text-gold`
- [x] WealthSignals row hover uses `rgba(255,255,255,0.02)` pattern
- [x] No raw zinc-*, no `font-cormorant`, no inline hex colors (except #0d0d10 in slide-over)
- [x] All clickable elements have `cursor-pointer`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified present:
- FOUND: src/components/prospect/prospect-slide-over.tsx
- FOUND: src/components/prospect/wealth-signals.tsx

Commits verified:
- FOUND: 1271e20 (Task 1 — slide-over audit + tooltips)
- FOUND: 6692d08 (Task 2 — WealthSignals design token refactor)
