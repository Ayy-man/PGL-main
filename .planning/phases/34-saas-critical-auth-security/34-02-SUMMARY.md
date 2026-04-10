---
phase: "34-saas-critical-auth-security"
plan: "34-02"
subsystem: "auth"
tags: ["auth", "password-reset", "supabase", "next.js"]
dependency_graph:
  requires: []
  provides: ["password-reset-flow", "forgot-password-page", "reset-password-page"]
  affects: ["src/app/(auth)/login/page.tsx", "src/app/api/auth/callback/route.ts", "src/middleware.ts"]
tech_stack:
  added: []
  patterns: ["Supabase auth.resetPasswordForEmail", "Supabase auth.updateUser", "PASSWORD_RECOVERY auth state listener"]
key_files:
  created:
    - "src/app/(auth)/forgot-password/page.tsx"
    - "src/app/(auth)/reset-password/page.tsx"
  modified:
    - "src/app/(auth)/login/page.tsx"
    - "src/app/api/auth/callback/route.ts"
    - "src/middleware.ts"
decisions:
  - "Wait for PASSWORD_RECOVERY auth state on reset-password page before enabling the form, because Supabase delivers the recovery session via fragment tokens that never reach the server"
  - "Sign the user out after successful password reset so they log in fresh with new credentials"
  - "type=recovery check happens before the onboarding/role routing to prevent recovery tokens from being rerouted to the dashboard"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-10"
  tasks_completed: 5
  files_created: 2
  files_modified: 3
---

# Phase 34 Plan 02: Password Reset / Forgot Password Summary

Self-service password reset via Supabase email recovery — forgot-password page sends reset email, reset-password page accepts new password after token exchange.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add "Forgot your password?" link to login page | 310bb1f |
| 2 | Create forgot-password page | cbfb33f |
| 3 | Create reset-password page | a8d7c7f |
| 4 | Update auth callback to handle recovery tokens | d29dddf |
| 5 | Add /forgot-password and /reset-password to PUBLIC_ROUTES | 8ff5151 |

## What Was Built

**Forgot-password page** (`/forgot-password`): Email input form that calls `supabase.auth.resetPasswordForEmail` with `redirectTo: {origin}/api/auth/callback?type=recovery`. Shows a success state with email confirmation and try-again link. No branding complexity needed — always the PGL default mark.

**Reset-password page** (`/reset-password`): New password + confirm password form. Waits for the `PASSWORD_RECOVERY` or `SIGNED_IN` Supabase auth event before enabling the form (the recovery session arrives via URL fragment, not server-side). Validates min 8 chars and password match before calling `supabase.auth.updateUser`. Signs the user out after success and redirects to `/login`.

**Auth callback** (`/api/auth/callback`): Reads the `type` query param. If `type=recovery`, bypasses all the onboarding/role routing and redirects directly to `/reset-password`. This check runs before user metadata is read, so it works even if app_metadata is incomplete.

**Middleware**: Added `/forgot-password` and `/reset-password` to `PUBLIC_ROUTES` so unauthenticated users can reach both pages.

**Login page**: "Forgot your password?" link placed inline with the Password label (right-aligned), routes to `/forgot-password`.

## Decisions Made

1. **PASSWORD_RECOVERY state listener**: The reset-password page must wait for the Supabase client to establish a session from the URL fragment (`#access_token=...&type=recovery`). The server never sees the fragment, so we can't pre-validate server-side. The `onAuthStateChange` listener fires `PASSWORD_RECOVERY` when the client picks up the tokens.

2. **Sign out after reset**: After `updateUser` succeeds we call `signOut` so the recovery session is invalidated. The user must log in with their new password, which confirms it works.

3. **type=recovery check first in callback**: Placed before the `getUser()` call to avoid unnecessary DB lookups on recovery flows and to prevent the onboarding check from intercepting recovery tokens for users with `onboarding_completed === false`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/app/(auth)/forgot-password/page.tsx` — created, verified
- `src/app/(auth)/reset-password/page.tsx` — created, verified
- `src/app/(auth)/login/page.tsx` — "Forgot your password?" link at line 176-182, verified
- `src/app/api/auth/callback/route.ts` — type=recovery check at lines 25-27, verified
- `src/middleware.ts` — PUBLIC_ROUTES includes both new routes at line 5, verified
- Commits 310bb1f, cbfb33f, a8d7c7f, d29dddf, 8ff5151 — all verified in git log
