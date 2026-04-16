---
phase: 260416-vpr
plan: 01
type: quick
subsystem: lists-ui
tags: [hover-card, lead-preview, ux, lists-page]
tech-stack:
  added: ["@radix-ui/react-hover-card@1.1.15"]
  patterns: ["shadcn HoverCard primitive pattern", "asChild trigger forwarding", "floating-surface token usage"]
key-files:
  created:
    - src/components/ui/hover-card.tsx
    - src/components/prospect/lead-hover-preview.tsx
  modified:
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - package.json
    - pnpm-lock.yaml
decisions:
  - "asChild on HoverCardTrigger: preserves the Link as the real DOM element, no extra button wrapper that would break the flex gap-1.5 layout"
  - "No useMediaQuery: Radix HoverCard is pointer-only by spec; touch devices naturally receive no popup — this is the correct UX primitive"
  - "No wealth tier in popup: ListMember.prospect has no wealth_tier field; adding it would require a new DB query, violating the no-new-queries constraint"
  - "StatusPill inlined: EnrichmentDot in list-member-table.tsx is not exported; inlining a StatusPill keeps this PR minimal and self-contained"
  - "shortLocation inlined: function already existed in list-member-table.tsx; copying it into lead-hover-preview.tsx keeps the component self-contained without a shared-utilities extraction that would be out of scope"
  - "side=right for desktop (popup opens beside name, away from row content); side=bottom for mobile (more vertical space available)"
  - "Pre-existing build failure (TypeError trim on /admin, /login, etc.) confirmed out-of-scope via git stash verification — identical errors on HEAD~1"
metrics:
  duration: ~8min
  completed: 2026-04-16
  tasks_completed: 2
  files_changed: 5
---

# Quick Task 260416-vpr: Hover-to-Preview Mini Popup on Lists Page

**One-liner:** Radix HoverCard popup on list-member name links surfaces title, company, location, enrichment status, and contact availability in ~300ms — zero new API routes or DB queries.

## What Shipped

| File | Description |
|------|-------------|
| `src/components/ui/hover-card.tsx` | shadcn HoverCard primitive (Root/Trigger/Content) wrapping `@radix-ui/react-hover-card`. Modeled directly on `popover.tsx` — uses `var(--bg-floating-elevated,#1a1a1e)`, `var(--border-subtle)`, backdrop-blur-sm, shadow-xl, animate-in/out. Exports `HoverCard`, `HoverCardTrigger`, `HoverCardContent`. |
| `src/components/prospect/lead-hover-preview.tsx` | Presentational popup card consuming `ListMember["prospect"]`. Shows: ProspectAvatar + name (gold) + LinkedIn icon + title at company + location + StatusPill + email/phone availability indicators. Self-contained — no fetches, no new props beyond `prospect`. |
| `src/app/[orgId]/lists/components/list-member-table.tsx` | Added HoverCard imports. Desktop name Link wrapped with `openDelay=300, closeDelay=120, side=right`. Mobile card name Link wrapped with `side=bottom`. Both use `asChild` to preserve the Link DOM element. |
| `package.json` / `pnpm-lock.yaml` | Added `@radix-ui/react-hover-card@1.1.15`. |

## Design Choices

**Why `asChild` on HoverCardTrigger:** Without `asChild`, Radix wraps the trigger in a `<span>`, creating an extra DOM element inside the existing `<div className="flex items-center gap-1.5">`. With `asChild`, HoverCardTrigger forwards its ref/event handlers directly onto the `<Link>` — the existing flex layout and `truncate` behavior are preserved unchanged.

**Why no `useMediaQuery`:** Radix HoverCard is pointer-only by design. On touch devices, `pointerenter` events never fire for hover — the popup simply does not appear. Wiring both mobile and desktop surfaces is harmless and lets tablet users with a mouse see the preview.

**Why no wealth tier / signals in the popup:** `ListMember.prospect` does not carry `wealth_tier` or `signals`. The existing `getListMembers` query selects only `full_name, title, company, location, work_email, work_phone, linkedin_url, enrichment_status, contact_data, manual_photo_url`. Adding those fields would require a new DB query or new join — explicitly prohibited by the plan constraint.

**Why StatusPill is inlined (not imported from EnrichmentDot):** `EnrichmentDot` inside `list-member-table.tsx` is an unexported internal function. Extracting it to a shared module is out of scope for this PR. The StatusPill renders a labeled pill (not just a dot), which suits the popup's read-at-a-glance purpose better anyway.

**Why shortLocation is inlined:** The function already existed in `list-member-table.tsx`. Duplicating it into `lead-hover-preview.tsx` keeps the component fully self-contained without a shared-utilities extraction that could ripple into other components.

## Verification

| Check | Result |
|-------|--------|
| `pnpm exec tsc --noEmit` — hover-card.tsx errors | PASS: 0 errors |
| `pnpm exec tsc --noEmit` — lead-hover-preview.tsx errors | PASS: 0 errors |
| `pnpm exec tsc --noEmit` — list-member-table.tsx errors | PASS: 0 errors |
| No hardcoded `rgba(212,175,55,*)` in new files | PASS |
| `git diff src/lib/lists/queries.ts` is empty | PASS |
| No new files under `src/app/api/` | PASS |
| `grep -c "HoverCard" list-member-table.tsx` >= 6 | PASS: 13 matches |
| `@radix-ui/react-hover-card` in package.json | PASS |
| `pnpm build` | Pre-existing failure on 14 unrelated pages (/(auth)/login, /admin/*, etc.) confirmed via git stash — identical errors on HEAD before any changes in this task |

## Deviations from Plan

None — plan executed exactly as written. The pre-existing build error (`TypeError: Cannot read properties of undefined (reading 'trim')` on 14 pages) was verified not introduced by this task via `git stash` before/after comparison.

## Smoke Checks

Deferred to post-deploy (no local dev environment available per project convention). Expected behavior:
- Hovering a lead name on `/[orgId]/lists/[listId]` for ~300ms opens a popup to the right (desktop) or below (mobile-width) showing avatar, name in gold, title at company, location, enrichment status pill, email/phone availability
- Popup closes when cursor leaves both trigger and popup (120ms close delay)
- Clicking the name still navigates to the prospect profile
- Touching a name on a touch device navigates as before — no popup
- LinkedIn icon inside popup opens LinkedIn in new tab without triggering navigation

## Known Stubs

None — component is fully wired to live `ListMember.prospect` data already fetched by `getListMembers`.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.
