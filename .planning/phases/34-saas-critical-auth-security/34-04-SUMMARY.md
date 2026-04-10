---
plan: "34-04"
phase: "34-saas-critical-auth-security"
status: complete
started: "2026-04-10"
completed: "2026-04-10"
---

# Summary: Deactivated Tenant Gate

## What was built

Enforced tenant `is_active` status at two layers:

1. **Middleware** (`src/middleware.ts`): After resolving tenant ID from URL path, checks `tenants.is_active`. Deactivated tenants redirect to `/suspended`. Super admins are exempt.

2. **Auth helper** (`src/lib/auth/session.ts`): `requireTenantUser()` now queries tenant active status and redirects to `/suspended` if deactivated. Catches direct API calls that bypass middleware.

3. **Suspended page** (`src/app/suspended/page.tsx`): Client component with centered card, warning icon, suspension message, and sign-out button. Added `/suspended` to PUBLIC_ROUTES.

## Key files

- `src/middleware.ts` — tenant active check after slug resolution
- `src/app/suspended/page.tsx` — new suspended page
- `src/lib/auth/session.ts` — requireTenantUser active guard

## Self-Check: PASSED

- [x] Middleware checks tenant is_active
- [x] /suspended page created with sign-out
- [x] requireTenantUser guards API routes
- [x] /suspended in PUBLIC_ROUTES
- [x] Super admin exempt from check
