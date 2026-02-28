---
phase: "09"
plan: "01"
subsystem: prospect-profile
tags: [components, ui, profile, design-system]
dependency_graph:
  requires: []
  provides: [ProfileHeader, ProfileTabs, ActivityTimeline, ProfileTabName]
  affects: [profile-view, prospect-profile-page]
tech_stack:
  added: []
  patterns:
    - "Prospect sub-components with pure rendering, no data fetching"
    - "CSS variable tokens via inline style attributes for CSS variable hover states"
    - "formatRelativeDate utility inlined in ActivityTimeline"
    - "getInitials + getAvatarGradient reused from prospect-card pattern"
key_files:
  created:
    - src/components/prospect/profile-header.tsx
    - src/components/prospect/profile-tabs.tsx
    - src/components/prospect/activity-timeline.tsx
  modified: []
decisions:
  - "ProfileTabName union type exported from profile-tabs.tsx for reuse by parent composers"
  - "Draft Outreach button disabled with cursor-not-allowed + opacity-50 + title Coming Soon (no tooltip library needed)"
  - "formatRelativeDate inlined in ActivityTimeline rather than importing from shared util (no shared util exists yet)"
  - "ProfileHeader Prospect type duplicated from profile-view.tsx (will be deduplicated in 09-02 refactor)"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-01"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 09 Plan 01: Extract Profile Sub-Components Summary

Three pure presentational sub-components extracted for the prospect profile page redesign: ProfileHeader (avatar, name, action buttons), ProfileTabs (sticky 6-tab bar with gold underline), and ActivityTimeline (vertical line with color-coded event circles).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 09-01-T1 | Create profile-header.tsx | c7e6078 | src/components/prospect/profile-header.tsx |
| 09-01-T2 | Create profile-tabs.tsx | fc18a1d | src/components/prospect/profile-tabs.tsx |
| 09-01-T3 | Create activity-timeline.tsx | 6694b92 | src/components/prospect/activity-timeline.tsx |

## What Was Built

### ProfileHeader (`src/components/prospect/profile-header.tsx`)

Props: `prospect` (full Prospect type), `isStale`, `onFindLookalikes`, `onAddToList`, `orgId`

- 64px avatar (`h-16 w-16`) with initials + `getAvatarGradient()` from prospect-card pattern
- 28px Cormorant Garamond name (`font-serif text-[28px] font-bold`)
- Title + Company joined with `\u00B7` centered dot, `text-sm text-muted-foreground`
- Location with `MapPin` icon, created date formatted via `formatDate()`
- Stale data warning: `inline-flex border border-warning/30 bg-warning-muted px-3 py-1.5 text-xs text-warning`
- Mail/Phone/MoreHorizontal icon-only ghost buttons with `aria-label` attributes
- Add to List + Find Lookalikes outline buttons with icons
- Draft Outreach: disabled gold button with `opacity-50 cursor-not-allowed` and `title="Coming Soon"`
- Container: `py-7 px-14 bg-gradient-to-b from-card to-background border-b border-border`

### ProfileTabs (`src/components/prospect/profile-tabs.tsx`)

Exports: `ProfileTabName` union type, `ProfileTabs` component

Props: `activeTab: ProfileTabName`, `onTabChange: (tab: ProfileTabName) => void`

- Sticky tab bar with `z-10`, `px-14` padding, `border-b border-border`
- Background via `style={{ background: "var(--background)" }}` per Phase 5 CSS variable pattern
- Active tab: `color: var(--text-primary-ds)`, `fontWeight: 500`, gold underline `h-0.5` with `background: var(--gold-primary)`
- Inactive tab: `color: var(--text-secondary-ds)`, `fontWeight: 400`
- Tab labels formatted by replacing hyphens with spaces: "sec-filings" → "sec filings"

### ActivityTimeline (`src/components/prospect/activity-timeline.tsx`)

Props: `events: ActivityEvent[]` where each event has `id`, `action_type`, `user_id`, `created_at`, optional `metadata`

- Vertical line: `absolute left-4 top-0 bottom-0 w-px bg-border`
- Each event: `relative pl-8 pb-6`
- Event circle: `h-[10px] w-[10px] absolute left-[13px] top-0 rounded-full` with CSS variable color
- Color mapping: search/lookalike=`var(--info)`, enriched=`var(--gold-primary)`, note=`var(--muted-foreground)`, list ops=`var(--success)`, viewed=`var(--text-tertiary)`, default=`var(--text-muted)`
- `getEventLabel()` converts snake_case action types to readable labels
- `formatRelativeDate()` inlined (just now / Xm ago / Xh ago / Xd ago / Xw ago / Xmo ago / Xy ago)
- Empty state: "No activity recorded yet."

## Verification Results

- `pnpm tsc --noEmit` — no errors in any of the three new files
- All three files have `"use client"` directive
- Zero `zinc-*` classes in all files
- Zero `font-cormorant` in all files
- All clickable elements have `cursor-pointer`; disabled button has `cursor-not-allowed`
- All icon-only buttons have `aria-label` attributes

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: src/components/prospect/profile-header.tsx
- FOUND: src/components/prospect/profile-tabs.tsx
- FOUND: src/components/prospect/activity-timeline.tsx

Commits verified:
- FOUND: c7e6078 feat(09-01): create ProfileHeader component
- FOUND: fc18a1d feat(09-01): create ProfileTabs component
- FOUND: 6694b92 feat(09-01): create ActivityTimeline component
