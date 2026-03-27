---
phase: quick
plan: 260327-tzg
subsystem: prospect-ui
tags: [avatar, photos, gravatar, prospect-profile, list-table]
dependency_graph:
  requires: []
  provides: [ProspectAvatar, getAvatarUrl]
  affects: [profile-header, list-member-table, upsertProspectFromApollo, mock-enrichment]
tech_stack:
  added: []
  patterns: [md5-inline, three-tier-cascade, react-usestate-onError-fallback]
key_files:
  created:
    - src/lib/avatar.ts
    - src/components/prospect/prospect-avatar.tsx
  modified:
    - src/types/database.ts
    - src/components/prospect/profile-view.tsx
    - src/lib/lists/types.ts
    - src/components/prospect/profile-header.tsx
    - src/lib/prospects/queries.ts
    - src/app/api/apollo/bulk-enrich/route.ts
    - src/lib/lists/queries.ts
    - src/app/[orgId]/lists/components/list-member-table.tsx
decisions:
  - "Inline MD5 implementation (~130 lines) avoids adding a dependency for a single hashing use-case"
  - "d=404 Gravatar param returns 404 on missing avatar, caught by onError to fall to initials"
  - "photo_url stored inside contact_data JSONB (not a dedicated column) — avoids schema migration"
  - "Mock enrichment uses ui-avatars.com with gold-on-dark (background=1a1a1a&color=d4af37) matching design system"
metrics:
  duration: "~8 min"
  completed: "2026-03-27"
  tasks_completed: 2
  files_modified: 10
---

# Quick Task 260327-tzg: Add Prospect Profile Photos Summary

**One-liner:** Three-tier avatar cascade (Apollo photo_url -> Gravatar -> initials) wired into profile header (112px) and list member table rows (28px) via shared ProspectAvatar component.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create avatar utility + ProspectAvatar component + update types | e5a48da | src/lib/avatar.ts, src/components/prospect/prospect-avatar.tsx, src/types/database.ts, src/components/prospect/profile-view.tsx, src/lib/lists/types.ts |
| 2 | Wire avatar into profile header, list table, data queries, mock enrichment | 806622b | src/components/prospect/profile-header.tsx, src/lib/prospects/queries.ts, src/app/api/apollo/bulk-enrich/route.ts, src/lib/lists/queries.ts, src/app/[orgId]/lists/components/list-member-table.tsx |

## What Was Built

### `src/lib/avatar.ts` — Avatar URL cascade utility
- Lightweight inline MD5 implementation (~130 lines, zero dependencies, browser + Node compatible)
- `getAvatarUrl({ photoUrl, email, size })` returns: photoUrl directly if present, Gravatar URL with `d=404` if email present, or `null` for initials fallback

### `src/components/prospect/prospect-avatar.tsx` — Shared ProspectAvatar component
- "use client" component with `size` prop: sm (28px), md (48px), lg (112px)
- React `useState` tracks current display stage: "photo" | "gravatar" | "initials"
- `useEffect` resets stage when photoUrl/email props change (post-enrichment updates)
- `onError` handler cascades: photo -> gravatar (if email) -> initials
- Initials circle uses same deterministic hue gradient as previous profile-header.tsx
- Font styles match size: lg uses font-serif text-3xl, sm uses text-[10px], md uses text-sm

### Type updates
- `ContactData.photo_url?: string` added to `src/types/database.ts`
- `contact_data.photo_url?: string` added to Prospect interface in `profile-view.tsx`
- `ListMember.prospect.photo_url: string | null` added to `src/lib/lists/types.ts`

### Profile header wiring
- `profile-header.tsx`: removed raw initials div + `getInitials` + `getAvatarGradient` functions
- Replaced with `<ProspectAvatar name photo_url email size="lg" />`
- Prospect interface extended with `contact_data?: { photo_url?, personal_email?, phone? } | null`

### Data persistence
- `upsertProspectFromApollo` in `queries.ts`: after upsert, if `person.photo_url` exists, merges it into `contact_data` JSONB via admin client
- Mock enrichment generates `https://ui-avatars.com/api/?name=...&background=1a1a1a&color=d4af37&size=96`

### List member table wiring
- `getListMembers`: added `contact_data` to Supabase select, `RawProspect` type updated, `photo_url` mapped from JSONB into `ListMember.prospect`
- `addProspectToList`: same select and mapping updates
- `list-member-table.tsx`: `ProspectAvatar` (size sm) rendered before `EnrichmentDot` in both desktop table and mobile card views

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Inline MD5, no dependency | Only needs one hash per avatar request; adding a 50KB dependency is not justified |
| `d=404` Gravatar param | Returns 404 on missing avatar instead of a placeholder image — allows clean `onError` fallback to initials |
| `photo_url` in `contact_data` JSONB | No schema migration needed; consistent with existing enrichment pattern of storing provider data as JSONB |
| `ui-avatars.com` for mock | Instant visual feedback in dev/staging; gold-on-dark colors match design system |

## Deviations from Plan

None — plan executed exactly as written. TypeScript compiled clean after Task 1 type additions (queries.ts error resolved as part of Task 2 wiring as planned).

## Known Stubs

None — all data flows are wired end-to-end. The `photo_url` cascade is fully functional: Apollo data persists to DB, Gravatar attempts from work_email, and initials render as ultimate fallback.

## Verification

- [x] `pnpm build` exits 0 with no TypeScript errors
- [x] ProspectAvatar exists at `src/components/prospect/prospect-avatar.tsx` and exports `ProspectAvatar`
- [x] Avatar utility exists at `src/lib/avatar.ts` and exports `getAvatarUrl`
- [x] ProfileHeader no longer has raw initials div — uses ProspectAvatar at size lg
- [x] ListMemberTable renders ProspectAvatar (size sm) in both desktop and mobile views
- [x] ContactData type in database.ts includes `photo_url` field

## Self-Check: PASSED

- `src/lib/avatar.ts` — FOUND
- `src/components/prospect/prospect-avatar.tsx` — FOUND
- Task 1 commit `e5a48da` — confirmed in git log
- Task 2 commit `806622b` — confirmed in git log
- `pnpm build` exits 0 — confirmed
