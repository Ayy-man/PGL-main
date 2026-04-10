---
plan: "35-02"
phase: "35-team-tenant-operations"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: Seat Limits / Usage Quotas

Migration adds `max_seats` and `plan` columns to tenants. `inviteTeamMember` checks active user count against limit before sending invite. Team page shows "X of Y seats used" badge.

Key files: `supabase/migrations/20260410_tenant_quotas.sql`, `src/app/actions/team.ts`, `src/app/[orgId]/team/page.tsx`
