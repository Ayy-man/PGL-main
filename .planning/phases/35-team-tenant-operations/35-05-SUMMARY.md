---
plan: "35-05"
phase: "35-team-tenant-operations"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: User Removal

`removeTeamMember` server action fully deletes user from both `public.users` and `auth.users`. Guards: cannot remove self, cannot remove last tenant_admin. Confirmation UI in TeamMemberActions component.

Key files: `src/app/actions/team.ts`, `src/app/[orgId]/team/team-member-actions.tsx`
