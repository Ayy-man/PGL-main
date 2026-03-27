---
phase: quick
plan: 260327-rqs
subsystem: prospect-profile
tags: [ui-polish, profile-view, wealth-signals, breadcrumbs, enrichment-status]
dependency_graph:
  requires: []
  provides: [polished-prospect-profile-ui]
  affects: [profile-view, profile-header, market-intelligence-card, wealth-signals, activity-timeline, breadcrumbs]
tech_stack:
  added: []
  patterns: [onMouseEnter/Leave CSS variable hover, cleanText helper, conditional section rendering]
key_files:
  created: []
  modified:
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/profile-header.tsx
    - src/components/prospect/market-intelligence-card.tsx
    - src/components/prospect/wealth-signals.tsx
    - src/components/prospect/activity-timeline.tsx
    - src/components/ui/breadcrumbs.tsx
decisions:
  - Enrichment status card removes h-full/justify-between to render naturally sized (~80px) with colored dots per source status
  - Market intelligence returns null (not placeholder card) when no ticker — cleaner for non-public prospects
  - Company context uses IIFE pattern for multi-value conditional, single-col layout when no title/CIK details
  - cleanText() strips markdown headers and HTML entities before rendering signal headlines/summaries
metrics:
  duration: 184s (~3min)
  completed: 2026-03-27
  tasks_completed: 2
  files_modified: 6
---

# Quick Task 260327-rqs: Prospect Profile UI Fixes Summary

**One-liner:** Eight UI polish fixes across 6 prospect profile components — compact enrichment status pills with colored dots, conditional company context rendering, hidden market intelligence when no ticker, clean wealth signal cards with max-height and text sanitization, decorative activity empty state, and gold hover breadcrumbs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Layout, enrichment status, header, market intelligence, company context, spacing | 2a1c2ff | profile-view.tsx, profile-header.tsx, market-intelligence-card.tsx |
| 2 | Wealth signal cards, activity empty state, breadcrumb styling | 3ce6e7d | wealth-signals.tsx, activity-timeline.tsx, breadcrumbs.tsx |

## Fixes Implemented

### Fix 1: Enrichment Status Card Collapse
- Removed `h-full flex flex-col justify-between` from outer div — card now renders naturally sized (~80px)
- Each source pill now shows a colored dot: green (complete), gold (in_progress), red (failed), gray (pending)
- Pill text matches status: gold for complete/in_progress, secondary for pending/failed
- Gap reduced to `gap-1.5`, margin to `mt-2` for tighter layout

### Fix 2: Wealth Signal Card Styling
- Added `max-h-[160px] overflow-hidden relative` to each signal card
- Added `cleanText()` helper that strips markdown headers (`#`/`##`/`###`), HTML entities (`&amp;`, `&#x27;`, etc.), and boilerplate prefixes (`Summary:`, `Key Points:`)
- Headline: changed to `text-[16px] font-semibold font-serif`
- Body: changed to `text-[13px] font-sans leading-relaxed line-clamp-3 mb-3` with `--text-secondary` color
- Source link: changed to `text-[12px]`
- Added `enriched_at` timestamp top-right of card row with `--text-tertiary` color

### Fix 3: Remove Contact Icon Row from Profile Header
- Deleted the entire "Social Links" section (Mail/Phone/LinkedIn icon row with `mt-5 pt-4 border-top`)
- Removed unused `Mail`, `Phone`, `Linkedin` imports from lucide-react
- Verified Contact card in profile-view.tsx already shows contact data with proper labels

### Fix 4: Market Intelligence Empty State
- `!ticker` case now returns `null` — hides section entirely for non-public prospects
- Cleaner than a placeholder card, avoids clutter

### Fix 5: Company Context Conditional
- Computed `hasCompanyContext`: true if any of company, publicly_traded_symbol, company_cik, location, title have values
- Returns null when `!hasCompanyContext`
- When `hasDetails` (title or company_cik present): renders 2-col grid layout
- When no detail fields: renders single-col layout with just ticker and/or location

### Fix 6: Activity Timeline Empty State
- Replaced plain "No activity recorded yet." text with decorative layout:
  - Gold-tinted circle icon container with `Activity` icon (lucide-react)
  - Serif heading "No team activity yet"
  - Descriptive subtitle in `--text-secondary`

### Fix 7: Breadcrumb Styling
- Parent links: added `onMouseEnter` (color → `--gold-primary`) and `onMouseLeave` (reset to `--text-secondary-ds`) — CSS variable hover values cannot use Tailwind `hover:` classes
- Removed Tailwind `hover:text-[var(--text-primary-ds)]` class (replaced by onMouseEnter/Leave)

### Fix 8: Spacing
- Enrichment status card spacing tightened (gap-1.5, mt-2) as part of Fix 1
- Wealth signal card layout consistent with gap-4 in the 2-col grid (pre-existing)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript: `npx tsc --noEmit` — passes with zero errors (both tasks)
- Build: `pnpm build` — passes cleanly

## Self-Check: PASSED

Files modified confirmed present:
- src/components/prospect/profile-view.tsx — FOUND
- src/components/prospect/profile-header.tsx — FOUND
- src/components/prospect/market-intelligence-card.tsx — FOUND
- src/components/prospect/wealth-signals.tsx — FOUND
- src/components/prospect/activity-timeline.tsx — FOUND
- src/components/ui/breadcrumbs.tsx — FOUND

Commits confirmed:
- 2a1c2ff — Task 1
- 3ce6e7d — Task 2
