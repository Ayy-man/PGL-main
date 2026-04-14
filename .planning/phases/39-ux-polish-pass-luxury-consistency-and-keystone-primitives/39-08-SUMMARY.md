---
phase: 39
plan: 08
subsystem: shell-cross-cutting
tags: [shell, sidebar, nav, top-bar, command-search, toast, dialog, sheet, error-pages, focus-ring, mobile, ux-polish]
dependency_graph:
  requires: [39-01, 39-05]
  provides: [shell-cross-cutting-polished]
  affects: [sidebar, admin-sidebar, nav-items, top-bar, command-search, mobile-sidebar, mobile-bottom-nav, toast, dialog, sheet, error-pages, breadcrumbs, globals-css]
tech_stack:
  added: []
  patterns:
    - CSS hover via Tailwind classes (no imperative onMouseEnter/Leave state)
    - Fade-mounted labels (keep nodes, toggle opacity) for smooth sidebar collapse
    - Radix onOpenAutoFocus replaces setTimeout focus hack
    - Custom DOM event (command-search:open) for decoupled mobile search trigger
    - .focus-ring-gold CSS utility for consistent gold focus rings
    - EmptyState variant=error for all error boundary pages
key_files:
  created: []
  modified:
    - src/components/layout/sidebar.tsx
    - src/app/admin/admin-sidebar.tsx
    - src/components/layout/nav-items.tsx
    - src/components/layout/top-bar.tsx
    - src/components/layout/mobile-sidebar.tsx
    - src/components/layout/command-search.tsx
    - src/components/layout/mobile-bottom-nav.tsx
    - src/components/ui/toast.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/sheet.tsx
    - src/app/global-error.tsx
    - src/app/[orgId]/error.tsx
    - src/app/admin/error.tsx
    - src/app/globals.css
    - src/components/ui/breadcrumbs.tsx
    - src/app/[orgId]/layout.tsx
decisions:
  - Bell removed entirely (no notifications feature exists; no dead affordance)
  - Mobile bottom-sheet drag handles removed (option a — cleaner DOM; false affordance eliminated)
  - Admin CommandSearch returns null (no orgId = admin shell; dead Cmd+K hint eliminated)
  - userEmail wired from layout.tsx to Sidebar so user card footer shows email (Rule 2)
  - Sidebar header shape unified at h-10 w-10 rounded-lg for both tenant and admin
metrics:
  duration_minutes: ~60
  completed: 2026-04-14
  tasks_completed: 10
  files_changed: 16
---

# Phase 39 Plan 08: Shell Cross-Cutting Polish Summary

Shell chrome polished across 30+ findings in 04-shell-cross-cutting.md — sidebar collapse animation, nav active state, dead affordances removed, command palette fixed, toast bottom-anchored, dialog/sheet overlays upgraded, error pages consolidated to EmptyState, gold focus ring utility added.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Sidebar fade labels, ease-out, CSS hover, Cmd+\\ shortcut, Link header, user card footer | e361cbb | sidebar.tsx: duration-300 ease-out, Link header, mounted labels with opacity fade, CSS hover toggle, Cmd+\\ shortcut, user card footer; admin-sidebar.tsx: ease-out + Link header |
| 1b | Wire userEmail to Sidebar | 02c75f5 | layout.tsx: pass user.email to Sidebar so user card shows email |
| 2 | Nav items left gold pill, Bookmark icon, ghost-hover | bd3b7d3 | Saved Searches: Users → Bookmark icon; active left gold accent pill; ghost-hover utility; transition-[background-color,color] |
| 3 | TopBar bell removed, avatar Link, mobile search entry | 77b8af8 | Bell button removed; avatar wrapped in Link to /settings; mobile-sidebar Search button fires command-search:open event |
| 4 | CommandSearch skew fix, onOpenAutoFocus, real button, admin null, mobile event | f5583df | slide-in-from-left-1/2 removed; onOpenAutoFocus replaces setTimeout; div[role=button] → real button; result focus rings; admin returns null; listens for command-search:open |
| 5 | Toast viewport bottom-anchored, close opacity-60, action hover gold | b7423a3 | Viewport always bottom; slide-in-from-bottom-full; close opacity-60; action hover gold tokens; destructive uses token classes |
| 6 | Dialog + Sheet backdrop-blur, 40px close target, SheetTitle font-serif | be801f7 | Both overlays: backdrop-blur-sm; dialog close: p-2.5 + hover gold; sheetVariants: bg-floating + border + shadow-2xl; SheetTitle: font-serif |
| 7 | Error pages EmptyState variant=error, font-semibold | 336fcfd | global-error: font-bold → font-semibold; both error.tsx files: EmptyState variant=error + AlertTriangle + Button gold + error.digest display |
| 8 | .focus-ring-gold utility + breadcrumbs CSS hover | 76763b3 | globals.css: .focus-ring-gold utility; breadcrumbs: onMouseEnter/Leave removed, CSS hover + focus-ring-gold |
| 9 | Remove mobile bottom-sheet drag handles | 3954c56 | Both More and Quick Actions sheets: visual-only drag handle markup removed |
| 10 | Manual verification (deferred per autonomous policy) | — | checkpoint:human-verify auto-deferred — see verification section below |

## Decisions

### Bell: Removed entirely
The TopBar bell had no backing notifications feature. Rather than marking it disabled/coming-soon, it was removed. A notifications feature can reintroduce it when implemented.

### Mobile bottom-sheet drag handles: Removed
Option (a) chosen — cleaner DOM. The handles were visual-only with no drag-dismiss gesture. Radix Sheet's overlay-tap close is the actual dismiss mechanism.

### Admin CommandSearch: Returns null
When `orgId` is absent (admin shell), `CommandSearch` returns `null` instead of rendering a static placeholder with a dead Cmd+K hint. The admin shell has no global search.

### Sidebar header shape unified
Both sidebars now use `h-10 w-10 rounded-lg` for the logo/icon avatar (admin was previously `h-9 w-9 rounded-full`). Unified to match the tenant sidebar's 40×40 rounded-lg shape.

### userEmail wired from layout
The tenant layout already had `user.email` available. Added `userEmail?: string` to SidebarProps and passed it through so the user card footer matches admin-sidebar's pattern (name + email).

## Audit Findings Closed

From `04-shell-cross-cutting.md`:

| Finding | File | Status |
|---------|------|--------|
| Collapse animation pop in child opacity | sidebar.tsx | Closed — mounted labels with opacity transition |
| ease-in-out feels mechanical | sidebar.tsx, admin-sidebar.tsx | Closed — ease-out on both |
| Collapse toggle uses onMouseEnter/Leave | sidebar.tsx | Closed — CSS hover via Tailwind |
| No keyboard shortcut for sidebar toggle | sidebar.tsx | Closed — Cmd+\\ + Cmd+B |
| Sidebar header has no link back to dashboard | sidebar.tsx, admin-sidebar.tsx | Closed — wrapped in Link |
| Active nav item has no left gold indicator | nav-items.tsx | Closed — absolute left accent pill |
| Saved Searches and Team both use Users icon | nav-items.tsx | Closed — Bookmark for Saved Searches |
| Nav hover uses transition-all + hard-coded rgba | nav-items.tsx | Closed — ghost-hover utility |
| Bell is dead affordance | top-bar.tsx | Closed — removed |
| Bell hover uses onMouseEnter/Leave | top-bar.tsx | Closed — removed with bell |
| Avatar has no click target | top-bar.tsx | Closed — Link to /settings |
| No mobile search entry | mobile-sidebar.tsx | Closed — Search button + custom event |
| CommandSearch slide-in-from-left skews palette | command-search.tsx | Closed — animation classes removed |
| setTimeout focus hack | command-search.tsx | Closed — onOpenAutoFocus |
| Trigger is div[role=button] | command-search.tsx | Closed — real button element |
| Result buttons lack focus rings | command-search.tsx | Closed — focus-visible ring added |
| Admin shows dead Cmd+K hint | command-search.tsx | Closed — returns null |
| Toast anchors to top on mobile | toast.tsx | Closed — always bottom-anchored |
| Toast close X opacity-0 (invisible) | toast.tsx | Closed — opacity-60 default |
| ToastAction hover is bg-secondary (generic) | toast.tsx | Closed — hover gold tokens |
| Destructive toast uses raw red-* classes | toast.tsx | Closed — token-based classes |
| Dialog overlay lacks blur | dialog.tsx | Closed — backdrop-blur-sm |
| Dialog close too small for touch | dialog.tsx | Closed — p-2.5 (40px) |
| Dialog close no hover gold | dialog.tsx | Closed — hover:text-[var(--gold-primary)] |
| Sheet lacks blur/shadow/bg upgrade | sheet.tsx | Closed — bg-floating + border + shadow-2xl + backdrop-blur-sm |
| SheetTitle uses generic sans font | sheet.tsx | Closed — font-serif matching DialogTitle |
| global-error uses font-bold (heavier than rest) | global-error.tsx | Closed — font-semibold |
| Error pages use bespoke inline markup | error.tsx (both) | Closed — EmptyState variant=error |
| No .focus-ring-gold utility | globals.css | Closed — utility added |
| Breadcrumbs use onMouseEnter/Leave | breadcrumbs.tsx | Closed — CSS hover + focus-ring-gold |
| Mobile bottom-sheet fake drag handle | mobile-bottom-nav.tsx | Closed — removed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] userEmail not wired to tenant Sidebar**
- **Found during:** Task 1 verification
- **Issue:** The user card footer was added but `userEmail` was not being passed from the layout, making the email line conditionally absent. Admin-sidebar already received email; parity required wiring it in the tenant layout too.
- **Fix:** Added `userEmail?: string` to SidebarProps; extracted from `user.email` in `[orgId]/layout.tsx`; passed as prop.
- **Files modified:** src/components/layout/sidebar.tsx, src/app/[orgId]/layout.tsx
- **Commit:** 02c75f5

## Manual Verification Deferred

Task 10 (`checkpoint:human-verify`) was deferred per autonomous checkpoint policy. To verify manually:

1. **Sidebar**: Click header logo → routes to dashboard (`/${orgId}`). Press Cmd+\\ → sidebar collapses with labels fading (not snapping). Hover collapse toggle → CSS hover only (no flicker). Footer shows user card (name + email).
2. **Nav items**: Saved Searches has Bookmark icon (not Users). Active item has left gold accent pill. Tab through → focus rings.
3. **Top bar**: Bell is gone. Click avatar → routes to `/${orgId}/settings`. No inline hover flashes.
4. **Command palette**: Cmd+K → pure fade-scale (no left skew). Typing instant. Tab through results → gold focus ring. `/admin` shell → no CommandSearch widget at all.
5. **Mobile**: Shrink viewport → mobile header has Search icon. Tap → CommandSearch opens.
6. **Toasts**: Fire toast on mobile → appears from bottom. Close X visible (opacity-60). ToastAction hover → gold bg.
7. **Dialogs**: Open any dialog → overlay has subtle blur. Close button 40px touch target. Hover → turns gold.
8. **Sheets**: Open any sheet → Cormorant Garamond serif title. Sheet has elevated bg + shadow.
9. **Error pages**: Force error → EmptyState with AlertTriangle + Try Again gold button + Error ID.
10. **Breadcrumbs**: Tab → gold focus ring. Hover → CSS color transition, no JS jank.
11. **Mobile bottom-sheet**: Tap + → sheet opens with no drag handle visible.

## Known Stubs

None — all changes are wired to real data.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. All changes are UI-only (CSS classes, component composition, Link wrappers, custom DOM event with empty payload).

## Self-Check: PASSED

All task commits verified:
- e361cbb — Task 1 (sidebar)
- 02c75f5 — Task 1b (layout userEmail)
- bd3b7d3 — Task 2 (nav-items)
- 77b8af8 — Task 3 (top-bar + mobile-sidebar)
- f5583df — Task 4 (command-search)
- b7423a3 — Task 5 (toast)
- be801f7 — Task 6 (dialog + sheet)
- 336fcfd — Task 7 (error pages)
- 76763b3 — Task 8 (globals.css + breadcrumbs)
- 3954c56 — Task 9 (mobile-bottom-nav)

Key files verified present:
- src/components/layout/sidebar.tsx ✓
- src/app/admin/admin-sidebar.tsx ✓
- src/components/layout/nav-items.tsx ✓
- src/components/layout/top-bar.tsx ✓
- src/components/layout/command-search.tsx ✓
- src/components/ui/toast.tsx ✓
- src/components/ui/dialog.tsx ✓
- src/components/ui/sheet.tsx ✓
- src/app/globals.css ✓
- src/components/ui/breadcrumbs.tsx ✓

TypeScript: zero new errors (only pre-existing execute-research.test.ts errors remain).
No new SidebarUserCard or UserCard shared components created (inline JSX in both sidebars, per CONTEXT.md constraint).
39-05's admin-sidebar.tsx edits preserved (admin nav active states, Soon pills, Tooltip collapse button — all intact alongside Task 1's ease-out + Link header additions).
39-01's K5 toast.tsx restyle preserved (--bg-floating-elevated bg, font-serif ToastTitle) — Task 5 only touched viewport + close + action classes.
