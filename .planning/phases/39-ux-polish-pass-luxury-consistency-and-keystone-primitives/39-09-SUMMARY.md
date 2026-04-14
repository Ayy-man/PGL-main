---
phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives
plan: "09"
subsystem: design-system
tags: [ux-polish, tokens, typography, empty-state, primitives, button, badge, select, input, dialog, data-table]
dependency_graph:
  requires: [39-01, 39-04, 39-08]
  provides: [PHASE-39-SCREEN-TOKENS]
  affects:
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/data-table/data-table.tsx
    - src/components/prospect/timeline-feed.tsx
    - src/components/admin/tenant-activity-card.tsx
    - src/app/[orgId]/personas/components/live-data-stream.tsx
    - src/components/admin/platform-pulse-modal.tsx
    - src/components/admin/funnel-chart.tsx
    - src/components/charts/usage-chart.tsx
    - src/components/prospect/research-panel.tsx
    - src/components/prospect/add-to-list-dialog-profile.tsx
    - src/app/[orgId]/search/components/add-to-list-dialog.tsx
    - src/app/admin/reports/[id]/report-detail.tsx
    - src/components/research/research-result-card.tsx
    - src/components/research/channel-status-bar.tsx
    - tailwind.config.ts
tech_stack:
  added: []
  patterns:
    - ease-out easing appended to Button base transition
    - bg-bg-elevated/border-subtle/border-hover tokens replacing rgba literals in ghost variant
    - bg-bg-input-custom replacing bg-transparent on Input and Textarea
    - focus:bg-gold-bg focus:text-gold-primary on SelectItem (gold keyboard nav)
    - bg-success-muted/bg-warning-muted/bg-info-muted semantic tokens on Badge variants
    - EmptyState primitive rolled out to 10 consumer sites across dashboard, activity, analytics, dialogs
    - bg-[var(--bg-floating)] border border-[var(--border-default)] in Dialog className (no inline style)
key_files:
  created: []
  modified:
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/data-table/data-table.tsx
    - src/components/prospect/timeline-feed.tsx
    - src/components/admin/tenant-activity-card.tsx
    - src/app/[orgId]/personas/components/live-data-stream.tsx
    - src/components/admin/platform-pulse-modal.tsx
    - src/components/admin/funnel-chart.tsx
    - src/components/charts/usage-chart.tsx
    - src/components/prospect/research-panel.tsx
    - src/components/prospect/add-to-list-dialog-profile.tsx
    - src/app/[orgId]/search/components/add-to-list-dialog.tsx
    - src/app/admin/reports/[id]/report-detail.tsx
    - src/components/research/research-result-card.tsx
    - src/components/research/channel-status-bar.tsx
    - tailwind.config.ts
decisions:
  - "Badge radius: kept rounded-full on Badge; deleted orphan rounded-badge: 20px token from tailwind.config.ts (cleaner — removes dead token, no badge appearance change)"
  - "ConfirmationTitle: kept as text-sm font-semibold (deliberate small-heading exception per audit B-3 — font-serif at text-sm is too large for tight inline confirmation titles)"
  - "Heading scale baseline: Page H1 = font-serif text-3xl font-bold tracking-tight (app pages); auth H1 = font-serif text-2xl font-semibold tracking-tight (narrow card context). Two-step scale is intentional, not fragmentation"
  - "research-panel.tsx: EmptyState applied to the visual prompt panel (messages=0, suggestions=0, not-searching) rather than the streaming handler text (line 310) — the streaming handler builds assistant message content, not a visual component"
  - "DataTable row: removed hover:bg-muted/50 override entirely so TableRow's gold hover (hover:bg-[var(--gold-bg)]/50) is inherited without conflict"
metrics:
  duration: "~60 minutes"
  completed: "2026-04-14"
  tasks_completed: 8
  files_modified: 20
---

# Phase 39 Plan 09: Design System Typography + Token Cleanup Summary

Closed ~30 remaining findings from `05-design-system.md` not absorbed by prior plans. Primitive-level consistency polish across Button/Input/Textarea/Select/Badge/Dialog, C-3 color-leak cleanup, and EmptyState rollout to 10 consumer sites.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Button ease-out + ghost tokens + link gold; Input/Textarea bg | 1e9eaef | ease-out on base; ghost uses bg-elevated/border-subtle tokens; link uses text-gold-primary; input/textarea use bg-bg-input-custom |
| 2 | Select gold focus/check; Badge semantic tokens; rounded-badge deleted | 1b2ae09 | SelectItem focus:bg-gold-bg; Check text-gold-primary; Badge default->gold tokens; success/warning/info->semantic tokens; tailwind.config.ts orphan removed |
| 3 | Shimmer shimmer-skeleton class | — | Already complete from 39-04 Task 6 — no changes needed |
| 4 | Dialog inline style -> className | ccd025b | bg-[var(--bg-floating)] border border-[var(--border-default)] in className; style={} removed |
| 5 | Color leak cleanup: blue/emerald -> info/success | 39e2cd6 | report-detail.tsx open/investigating -> destructive/info tokens; research-result-card.tsx + channel-status-bar.tsx emerald dot -> bg-success |
| 6 | EmptyState rollout batch 1 (7 files) | f217881 | timeline-feed, tenant-activity-card (x2), live-data-stream, platform-pulse-modal, funnel-chart, usage-chart, research-panel |
| 7 | EmptyState rollout batch 2 (3 files) + DataTable | ed1c2e6 | add-to-list-dialog-profile, add-to-list-dialog, data-table empty row; DataTable hover override removed |
| 8 | Typography ladder decisions | — | suspended H1 already has font-serif (39-06); ConfirmationTitle kept as-is; heading scale documented |
| 9 | Design-system consistency walkthrough | — | checkpoint:human-verify auto-deferred per autonomous policy |

## Audit Findings Closed (05-design-system.md)

| Finding | Location | Status |
|---------|----------|--------|
| Button ease-out missing | button.tsx:8 | Closed |
| Ghost variant rgba literals | button.tsx:21 | Closed |
| Link variant text-primary not gold | button.tsx:22 | Closed |
| Input bg-transparent no elevation | input.tsx:11 | Closed |
| Textarea bg-transparent no elevation | textarea.tsx:12 | Closed |
| SelectItem focus:bg-accent not gold | select.tsx:121 | Closed |
| Check indicator not gold | select.tsx:128 | Closed |
| Badge default uses bg-primary (tan) | badge.tsx:11-12 | Closed |
| Badge success/warning/info hardcoded hex | badge.tsx:19-23 | Closed |
| rounded-badge orphan token | tailwind.config.ts:103 | Closed (deleted) |
| Checkbox no hover border | checkbox.tsx:16 | Closed (39-01 K10 already applied) |
| Shimmer animate-pulse not shimmer-skeleton | shimmer.tsx | Closed (39-04 Task 6 already applied) |
| Dialog inline style blocks override | dialog.tsx:44 | Closed |
| DataTable empty "No results." raw text | data-table.tsx:144-152 | Closed |
| DataTable row hover:bg-muted/50 overrides gold | data-table.tsx:132 | Closed |
| table.tsx header rgba literal | table.tsx:76 | Closed (39-04 Task 6 already applied) |
| report-detail bg-red-500/10 text-red-400 | report-detail.tsx:109 | Closed |
| report-detail bg-blue-500/10 text-blue-400 | report-detail.tsx:110 | Closed |
| research-result-card bg-emerald-500 dot | research-result-card.tsx:48 | Closed |
| channel-status-bar bg-emerald-500 dot | channel-status-bar.tsx:63 | Closed |
| timeline-feed raw "No activity" text | timeline-feed.tsx:544 | Closed |
| tenant-activity-card raw "No activity" (x2) | tenant-activity-card.tsx:407,652 | Closed |
| live-data-stream raw "No activity yet" | live-data-stream.tsx:156 | Closed |
| platform-pulse-modal raw "No activity data" | platform-pulse-modal.tsx:509 | Closed |
| funnel-chart raw "No activity yet" text | funnel-chart.tsx:72 | Closed |
| usage-chart raw "No data available" text | usage-chart.tsx:42 | Closed |
| research-panel bespoke prompt panel | research-panel.tsx:641 | Closed |
| add-to-list-dialog-profile bespoke empty | add-to-list-dialog-profile.tsx:108 | Closed |
| add-to-list-dialog bespoke empty | add-to-list-dialog.tsx:110 | Closed |
| suspended H1 missing font-serif | suspended/page.tsx:35 | Closed (39-06 Task 5 already applied) |
| ConfirmationTitle typography decision | confirmation.tsx:109 | Documented — kept as-is |

## Already-handled-by-earlier-plans (no duplicate work)

| Finding | Handled by |
|---------|------------|
| Shimmer animate-pulse -> shimmer-skeleton | 39-04 Task 6 |
| table.tsx header text-gold-text token | 39-04 Task 6 |
| Checkbox hover border hover:border-gold-primary/60 | 39-01 K10 |
| suspended H1 font-serif | 39-06 Task 5 |
| reports-table.tsx status badge colors | 39-05 (uses oklch tokens already) |
| tenants/new/page.tsx emerald leak | Not present — already clean |

## Decisions Made

### Badge radius: rounded-full kept, rounded-badge token deleted
The `rounded-badge: 20px` token in `tailwind.config.ts` was declared but never used (Badge used `rounded-full`). Rather than switching Badge to `rounded-badge`, the orphan token was deleted. Badges retain `rounded-full` pill appearance. No visible change.

### ConfirmationTitle: kept as text-sm font-semibold
Audit B-3 explicitly flagged this as "Flag, don't auto-fix." Tight inline confirmation titles are short (e.g., "Delete List?") — `font-serif` at `text-sm` would feel oversized. Kept as the deliberate small-heading exception.

### Heading scale baseline (B-4 — documentation only)
Two-step H1 scale is intentional:
- App pages: `font-serif text-3xl font-bold tracking-tight`
- Auth/narrow pages: `font-serif text-2xl font-semibold tracking-tight`

This is not fragmentation — it's context-appropriate sizing. No code changes.

### EmptyState in research-panel
The plan cited line 310 (streaming handler text content) as the target. However, line 310 builds the text content of an assistant message — not a visual component. The actual visual empty state is the prompt panel at line 641 (messages=0, suggestions=0). EmptyState was applied there instead.

## EmptyState Rollout Count

10 sites closed (target was 10):
1. timeline-feed.tsx — "No activity yet"
2. tenant-activity-card.tsx — "No activity found" (first site)
3. tenant-activity-card.tsx — "No activity found" (second site)
4. live-data-stream.tsx — "No activity yet"
5. platform-pulse-modal.tsx — "No activity data"
6. funnel-chart.tsx — "No funnel data yet"
7. usage-chart.tsx — "No data this period"
8. research-panel.tsx — prompt empty state (bespoke -> EmptyState)
9. add-to-list-dialog-profile.tsx — "No lists yet"
10. add-to-list-dialog.tsx — "No lists yet"

## Known Stubs

None — all changes are token substitutions, EmptyState rollouts with static copy, and CSS class renames. No placeholder data introduced.

## Threat Flags

None. Pure CSS class refactors + EmptyState component substitutions. No new network endpoints, auth paths, file access patterns, or schema changes.

## Manual Verification Deferred

Task 9 (`checkpoint:human-verify`) was deferred per autonomous checkpoint policy. To verify manually:

1. **Button**: Click any CTA — slightly more deliberate feel (ease-out). Ghost buttons look softer. Link variant renders gold underlined text.
2. **Inputs**: Resting state has subtle dark elevation (bg-bg-input-custom) instead of transparent. Especially visible on auth forms and dialog inputs.
3. **Select**: Arrow-key navigate any Select dropdown — highlighted option has gold bg + gold text. Selected option's check is gold.
4. **Badges**: Admin reports table `investigating` status uses info-blue token. Success uses success-muted. Warning uses warning-muted.
5. **Shimmer**: Any analytics or API-keys loading → gold gradient moves across (shimmer-skeleton, not opacity pulse).
6. **Dialog**: Open/close any dialog — visual unchanged. Consumer `className` overrides now work (inline style removed).
7. **Empty states**: timeline-feed with no activity, tenant-activity with no entries, live-data-stream empty, funnel with all-zero, usage-chart with no data, research-panel before first message, add-to-list with no lists, DataTable with filtered-out rows — all should show EmptyState primitive.
8. **DataTable hover**: Hover any data-table row — gold tint (not muted/50).
9. **Badge radius**: All badges remain pill-shaped (rounded-full unchanged).

## Self-Check: PASSED

Files verified to exist:
- src/components/ui/button.tsx: FOUND (ease-out, bg-bg-elevated ghost, text-gold-primary link, gold-solid default)
- src/components/ui/input.tsx: FOUND (bg-bg-input-custom)
- src/components/ui/textarea.tsx: FOUND (bg-bg-input-custom)
- src/components/ui/select.tsx: FOUND (focus:bg-gold-bg, text-gold-primary Check)
- src/components/ui/badge.tsx: FOUND (bg-gold-bg default, bg-success-muted, bg-info-muted)
- src/components/ui/dialog.tsx: FOUND (bg-[var(--bg-floating)] in className, no style={})
- src/components/ui/data-table/data-table.tsx: FOUND (EmptyState, Search icon, no hover:bg-muted/50)
- src/components/ui/table.tsx: FOUND (text-gold-text — from 39-04)
- src/app/admin/reports/[id]/report-detail.tsx: FOUND (bg-info-muted text-info, bg-destructive/10)
- src/components/research/research-result-card.tsx: FOUND (bg-success)
- src/components/research/channel-status-bar.tsx: FOUND (bg-success)
- src/components/prospect/timeline-feed.tsx: FOUND (EmptyState)
- src/components/admin/tenant-activity-card.tsx: FOUND (EmptyState x2)
- src/app/[orgId]/personas/components/live-data-stream.tsx: FOUND (EmptyState)
- src/components/admin/platform-pulse-modal.tsx: FOUND (EmptyState, BarChart3)
- src/components/admin/funnel-chart.tsx: FOUND (EmptyState, BarChart3)
- src/components/charts/usage-chart.tsx: FOUND (EmptyState, LineChartIcon)
- src/components/prospect/research-panel.tsx: FOUND (EmptyState, SearchX)
- src/components/prospect/add-to-list-dialog-profile.tsx: FOUND (EmptyState)
- src/app/[orgId]/search/components/add-to-list-dialog.tsx: FOUND (EmptyState)
- tailwind.config.ts: FOUND (rounded-badge removed)

Commits verified in git log: 1e9eaef, 1b2ae09, ccd025b, 39e2cd6, f217881, ed1c2e6

TypeScript: zero new errors — only pre-existing execute-research.test.ts tuple errors remain.
Button defaultVariants.variant = "gold-solid" confirmed intact.
