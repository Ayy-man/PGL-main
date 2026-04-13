---
phase: quick
plan: 260413-wz9
subsystem: auth/invite
tags: [invite, auth, supabase, admin, fix]
dependency_graph:
  requires: []
  provides: [working-invite-email-flow, working-resend-invite]
  affects: [src/app/actions/admin.ts, src/app/actions/team.ts, src/components/admin/tenant-detail-drawer.tsx, src/app/admin/users/new/page.tsx]
tech_stack:
  added: []
  patterns: [inviteUserByEmail, generateLink-with-magiclink-fallback]
key_files:
  created: []
  modified:
    - src/app/actions/admin.ts
    - src/app/actions/team.ts
    - src/components/admin/tenant-detail-drawer.tsx
    - src/app/admin/users/new/page.tsx
    - src/app/admin/actions.ts
decisions:
  - "Use inviteUserByEmail pattern already proven in createTenant() — same file, same approach"
  - "resendInvite uses generateLink({ type: 'invite' }) with magiclink fallback to cover both unconfirmed and confirmed-but-inactive users"
  - "tempPassword removed entirely from return type to eliminate credential leak vector (T-quick-03)"
metrics:
  duration: ~10 minutes
  completed: "2026-04-13T18:19:29Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Quick Fix 260413-wz9: Fix Broken Invite System Summary

**One-liner:** Replaced `createUser`+temp-password with `inviteUserByEmail`+`updateUserById` pattern in `inviteUser()`, fixed `resendInvite()` to use `generateLink` so existing users can receive re-invites, and removed all password UI from the invite pages.

## What Was Done

### Task 1: Fix server actions (8b68a28)

**`src/app/actions/admin.ts` — `inviteUser()`:**
- Replaced `createUser({ password: tempPassword, email_confirm: true })` with `inviteUserByEmail(email, { data: { full_name }, redirectTo })` — the exact pattern already used by `createTenant()` in the same file
- Added `updateUserById` call to set `app_metadata: { role, tenant_id, onboarding_completed: false }`
- Kept rollback: if `public.users` insert fails, delete auth user
- Changed return type from `{ id, email, tempPassword }` to `{ id, email }` — no credential leak

**`src/app/actions/team.ts` — `resendInvite()`:**
- Replaced `inviteUserByEmail()` (which fails for already-registered users) with `generateLink({ type: 'invite' })`
- Added fallback to `generateLink({ type: 'magiclink' })` for confirmed-but-never-logged-in users
- Both paths cover the full spectrum of pending user states

**`src/app/admin/actions.ts`:**
- Added `DEPRECATED: Dead code` comment to `createUserAction()` — not imported anywhere, preserved to avoid unexpected breakage

### Task 2: Update UI consumers (babfe7b)

**`src/components/admin/tenant-detail-drawer.tsx`:**
- Success message changed from `"Invited {email}"` to `"Invitation sent to {email}"`

**`src/app/admin/users/new/page.tsx`:**
- Removed password field (label + input) — no longer relevant with invite flow
- Page title: "Create User" → "Invite User"
- Subtitle: "Add a new user to the platform" → "Send an invitation to join the platform"
- Submit button: "Creating..." / "Create User" → "Sending..." / "Send Invite"
- Error fallback: "Failed to create user" → "Failed to send invitation"

## Verification Results

| Check | Result |
|-------|--------|
| `createUser` not in `inviteUser()` | PASS |
| `tempPassword` zero results across `src/` | PASS |
| `inviteUserByEmail` in both `createTenant` and `inviteUser` | PASS |
| `generateLink` in `resendInvite` | PASS |
| TypeScript errors in modified files | NONE |

Pre-existing TS errors in `src/lib/search/__tests__/execute-research.test.ts` (6 errors, unrelated mock typing) were out of scope and not introduced by this fix.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all invite paths are wired to real Supabase Admin API calls.

## Threat Flags

None — changes only narrow the attack surface (T-quick-03 resolved by removing tempPassword from return type).

## Self-Check: PASSED

- `src/app/actions/admin.ts` modified: confirmed (inviteUserByEmail present at line 166)
- `src/app/actions/team.ts` modified: confirmed (generateLink present at lines 239, 247)
- `src/app/admin/users/new/page.tsx` modified: confirmed (password field removed)
- `src/components/admin/tenant-detail-drawer.tsx` modified: confirmed (success message updated)
- Commit `8b68a28` exists: confirmed
- Commit `babfe7b` exists: confirmed
