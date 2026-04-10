---
plan: "34-05"
phase: "34-saas-critical-auth-security"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: Session/Token Expiry Handling

## What was built

1. **SessionGuard component** (`src/components/auth/session-guard.tsx`): Client component that listens to `supabase.auth.onAuthStateChange`. On `SIGNED_OUT` event, redirects to `/login`. Cleans up subscription on unmount. Renders null (invisible).

2. **Root layout mount** (`src/app/layout.tsx`): SessionGuard imported and placed inside NuqsAdapter, before children. Active on all pages.

## Key files

- `src/components/auth/session-guard.tsx` — new client component
- `src/app/layout.tsx` — SessionGuard mounted

## Self-Check: PASSED

- [x] SessionGuard component created with onAuthStateChange
- [x] Redirects to /login on SIGNED_OUT
- [x] Mounted in root layout
- [x] Subscription cleaned up on unmount
