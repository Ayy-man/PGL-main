---
plan: "35-06"
phase: "35-team-tenant-operations"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: Non-Admin Onboarding

New `/onboarding/set-password` page for agent/assistant users — shows welcome message with org name, password form only (no org config). Auth callback routes by role: tenant_admin → confirm-tenant, agent/assistant → set-password. Middleware updated with same role-based routing.

Key files: `src/app/onboarding/set-password/page.tsx`, `src/app/api/auth/callback/route.ts`, `src/middleware.ts`
