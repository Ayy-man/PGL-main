---
phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives
plan: "06"
subsystem: auth-onboarding-team-settings
tags: [ux-polish, auth, onboarding, team, settings, spinners, ambient-glow, primitives]
dependency_graph:
  requires: [PHASE-39-K1, PHASE-39-K2, PHASE-39-T1-DESTRUCTIVE-SWEEP]
  provides: [PHASE-39-T2-AUTH-ONBOARDING-TEAM-SETTINGS]
  affects:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/app/(auth)/layout.tsx
    - src/app/onboarding/confirm-tenant/page.tsx
    - src/app/onboarding/set-password/page.tsx
    - src/app/suspended/page.tsx
    - src/app/[orgId]/team/page.tsx
    - src/app/[orgId]/team/invite-dialog.tsx
    - src/app/[orgId]/team/team-member-actions.tsx
    - src/app/[orgId]/team/user-status-toggle.tsx
    - src/app/[orgId]/settings/page.tsx
    - src/app/[orgId]/settings/organization/page.tsx
    - src/app/[orgId]/team/loading.tsx
    - src/app/[orgId]/settings/loading.tsx
tech_stack:
  added: []
  patterns:
    - Loader2 spinner inline with stable button label (no layout shift)
    - ambient-glow-top/bottom in auth layout matching onboarding
    - Input primitive replacing hand-rolled inputs with onFocus/onBlur handlers
    - Skeleton primitive replacing rgba animate-pulse divs
    - EmptyState replacing raw text in empty table states
    - Breadcrumbs on settings pages for navigation affordance
    - beforeunload guard on forms with dirty state
    - Promise.all parallelizing N+1 getUserById loop
    - per-row pending state for Resend button (avoids dimming all rows)
    - Deactivate gated by Confirmation isDestructive (activate stays one-click)
key_files:
  created:
    - src/app/[orgId]/team/loading.tsx
    - src/app/[orgId]/settings/loading.tsx
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/app/(auth)/layout.tsx
    - src/app/onboarding/confirm-tenant/page.tsx
    - src/app/onboarding/set-password/page.tsx
    - src/app/suspended/page.tsx
    - src/app/[orgId]/team/page.tsx
    - src/app/[orgId]/team/invite-dialog.tsx
    - src/app/[orgId]/team/team-member-actions.tsx
    - src/app/[orgId]/team/user-status-toggle.tsx
    - src/app/[orgId]/settings/page.tsx
    - src/app/[orgId]/settings/organization/page.tsx
decisions:
  - "set-password route kept (not deleted) — still wired for agent/assistant first-login via auth/callback route.ts:44-46 and middleware.ts:54-61. Brought to luxury parity instead."
  - "client-side search filter on team page deferred — page is RSC; adding a client wrapper was out-of-scope for a polish pass. Sticky header and EmptyState delivered."
  - "UserStatusToggle gained optional memberEmail prop to echo in deactivation Confirmation dialog — plumbed from both team page call sites"
  - "profile form.reset() removed — display name must persist after save per plan must-have truth"
  - "password form.reset() kept — security-correct to clear password fields after change"
  - "org settings slug: removed silent char-stripping on onChange; now allows full input and validates onBlur"
metrics:
  duration: "~90 minutes"
  completed: "2026-04-14"
  tasks_completed: 8
  files_modified: 15
---

# Phase 39 Plan 06: Auth/Onboarding/Team/Settings Polish Summary

Auth, onboarding, team management, and settings pages brought to luxury parity. Loader2 spinners on every auth submit, ambient-glow layout, Input primitives replacing hand-rolled focus handlers, N+1 getUserById parallelized, EmptyState on zero-team, role badges differentiated, deactivate gated by Confirmation, settings Breadcrumbs added, dirty-state beforeunload guards, two new loading.tsx skeleton files.

## Task Outcomes

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Auth pages spinners + eye toggle + reset-success banner + strength meter | b105769 | login, forgot-password, reset-password |
| 2 | Auth layout ambient glow + staggered fade-in | 6df8af0 | (auth)/layout.tsx |
| 3 | confirm-tenant Input primitive + slug auto-derive + URL preview + password match + Skeleton + beforeunload | de19984 | confirm-tenant/page.tsx |
| 4 | set-password orphan check → parity (kept, still wired) | 2565d82 | set-password/page.tsx |
| 5 | suspended page AlertOctagon + outline button + mailto + fade-in + font-serif H1 | 0d48e2d | suspended/page.tsx |
| 6 | team page Promise.all N+1 fix + EmptyState + role badges + lastSignInAt + sticky header + loading.tsx | 7b08024 | team/page.tsx, team/loading.tsx |
| 7 | invite-dialog themed Select + Button + toast; team-member-actions role Select + per-row Resend; user-status-toggle Deactivate Confirmation | ee0bb31 | invite-dialog.tsx, team-member-actions.tsx, user-status-toggle.tsx, page.tsx |
| 8 | settings Input primitive + no profile reset + gold-solid submit + Breadcrumbs + beforeunload + dirty indicator + loading.tsx | 7b8c759 | settings/page.tsx, organization/page.tsx, settings/loading.tsx |
| 9 | Manual verification | deferred | (see Manual Verification Deferred) |

## Task 4: set-password Orphan Decision

**Decision: KEPT (brought to parity — not deleted)**

Investigation: `grep -r "onboarding/set-password" src/` returned two callers:
- `src/app/api/auth/callback/route.ts` line 44–46: routes agents/assistants with `onboarding_completed === false` to `/onboarding/set-password`
- `src/middleware.ts` lines 54, 61: exempts the path from onboarding redirect loop AND uses it as the target for non-tenant-admin users

The recent invite rewrite (commits 8b68a28, 2f4c25d) rewrote `inviteTeamMember` to send actual Supabase invite emails and changed the flow for tenant admins → `confirm-tenant`. However agents and assistants are still invited the same way and their first-login flow still routes through `set-password`. The route is **not orphaned**.

Changes applied: `surface-card` wrapper, tenant logo fetch + render, password strength meter, inline mismatch validation, `variant="gold-solid"` Button with Loader2 spinner.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] UserStatusToggle memberEmail prop for Deactivation Confirmation**
- **Found during:** Task 7
- **Issue:** `user-status-toggle.tsx` gained a Confirmation dialog for deactivate but had no way to show which member's email in the dialog title — the prop wasn't in the interface.
- **Fix:** Added optional `memberEmail?: string` prop to `UserStatusToggleProps`; passed `member.email ?? undefined` at both call sites (desktop table + mobile card) in `team/page.tsx`.
- **Files modified:** `user-status-toggle.tsx`, `team/page.tsx`
- **Commit:** ee0bb31

**2. [Rule 2 - Missing functionality] Invite dialog email onBlur validation**
- **Found during:** Task 7
- **Issue:** Plan specified email validation on blur but the original dialog used a raw `<input type="email">` without any visible inline error.
- **Fix:** Added `validateEmail()` function with regex check and `emailError` state, rendered below the Input field on blur.
- **Files modified:** `invite-dialog.tsx`
- **Commit:** ee0bb31

## Manual Verification Deferred

Task 9 is a `checkpoint:human-verify`. Per the automated checkpoint policy, browser spot-checks are deferred.

### Automated verification results

- TypeScript: `npx tsc --noEmit` → only 6 pre-existing errors in `src/lib/search/__tests__/execute-research.test.ts`. Zero new errors from this plan.
- `grep -E "Confirmation" src/app/[orgId]/team/team-member-actions.tsx` → FOUND (39-02 wiring preserved)
- `grep -E "Confirmation" src/app/[orgId]/team/user-status-toggle.tsx` → FOUND (new deactivate gate)
- `test -f src/app/[orgId]/team/loading.tsx` → FOUND
- `test -f src/app/[orgId]/settings/loading.tsx` → FOUND

### Manual spot-checks to perform in browser

1. Login: email autoFocus, Eye toggle, Loader2 spinner, reset-success banner at `?message=password_reset_success`, ambient glow on layout
2. Forgot password: Mail icon circle in success state, "try again" focus ring
3. Reset password: Loader2 verifying state, strength meter, inline mismatch, disabled submit
4. confirm-tenant: Input primitive focus halo, slug auto-derives from name, URL preview, mismatch hint, Skeleton loading, beforeunload
5. set-password: surface-card shell, gold Button, strength meter
6. suspended: AlertOctagon, outline Sign Out button, font-serif H1, mailto link, fade-in
7. Team: fast load (Promise.all), EmptyState on zero members, role badges (Admin gold, Agent blue, Assistant ghost), humanized labels, sticky header, lastSignInAt "Last Active"
8. Invite dialog: Button primitive, themed Select, role helper text, email validation on blur, spinner on submit, Cancel button, success toast
9. Team actions: per-row Resend spinner, themed role-change Select
10. User status toggle: Deactivate → Confirmation dialog; Activate → one-click; min-width no jump
11. Settings account: Input primitive, profile save → toast + name preserved, password save → form resets, Breadcrumbs, Eye toggles + strength meter
12. Settings org: Skeleton loading, "Logo is saved immediately" helper, dirty dot on Save button, slug change toast with URL, Breadcrumbs, contact support disclaimer

## Known Stubs

None. All features wired to real data. No placeholder values flowing to UI rendering.

## Threat Flags

None. All changes are client-side UI polish wrapping existing server actions. No new network endpoints, auth paths, file access patterns, or schema changes. The password show/hide toggle reveals the password value only in the user's own browser DOM — not a new attack surface (T-39-06-01 accepted per plan threat model).

## Self-Check: PASSED

Files verified to exist:
- src/app/(auth)/login/page.tsx: FOUND (Loader2, showPassword, password_reset_success)
- src/app/(auth)/forgot-password/page.tsx: FOUND (Loader2, Mail icon)
- src/app/(auth)/reset-password/page.tsx: FOUND (Loader2, passwordStrength, passwordMismatch)
- src/app/(auth)/layout.tsx: FOUND (ambient-glow-top, ambient-glow-bottom, animate-in fade-in)
- src/app/onboarding/confirm-tenant/page.tsx: FOUND (Input, slugTouched, beforeunload, Skeleton)
- src/app/onboarding/set-password/page.tsx: FOUND (variant="gold-solid", surface-card)
- src/app/suspended/page.tsx: FOUND (AlertOctagon, variant="outline", font-serif, mailto)
- src/app/[orgId]/team/page.tsx: FOUND (Promise.all, EmptyState, roleLabel)
- src/app/[orgId]/team/loading.tsx: FOUND (Skeleton)
- src/app/[orgId]/team/invite-dialog.tsx: FOUND (Select, Loader2, useToast)
- src/app/[orgId]/team/team-member-actions.tsx: FOUND (Confirmation, Select, per-row rowPendingId)
- src/app/[orgId]/team/user-status-toggle.tsx: FOUND (Confirmation, Loader2, memberEmail)
- src/app/[orgId]/settings/page.tsx: FOUND (Input, Breadcrumbs, variant="gold-solid")
- src/app/[orgId]/settings/organization/page.tsx: FOUND (Breadcrumbs, dirty indicator, Skeleton)
- src/app/[orgId]/settings/loading.tsx: FOUND (Skeleton)

Commits verified: b105769, 6df8af0, de19984, 2565d82, 0d48e2d, 7b08024, ee0bb31, 7b8c759
