---
plan: "35-03"
phase: "35-team-tenant-operations"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: Pending Invite Visibility

Team page detects pending invites via `auth.users.last_sign_in_at`. Shows amber "Pending" badge. Resend and Revoke actions available for pending users. Server actions: `resendInvite`, `revokeInvite`.

Key files: `src/app/actions/team.ts`, `src/app/[orgId]/team/page.tsx`, `src/app/[orgId]/team/team-member-actions.tsx`
