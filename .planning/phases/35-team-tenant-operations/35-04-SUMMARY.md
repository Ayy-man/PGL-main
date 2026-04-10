---
plan: "35-04"
phase: "35-team-tenant-operations"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: Role Change by Tenant Admin

`changeUserRole` server action allows tenant admins to switch users between agent and assistant. Updates both `public.users.role` and `auth.users.app_metadata.role`. Cannot promote to tenant_admin or change own role. Role dropdown in TeamMemberActions component.

Key files: `src/app/actions/team.ts`, `src/app/[orgId]/team/team-member-actions.tsx`
