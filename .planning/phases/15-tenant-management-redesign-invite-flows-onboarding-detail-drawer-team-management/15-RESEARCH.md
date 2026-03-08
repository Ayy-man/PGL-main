# Phase 15 Research: Tenant Management Redesign

## Current State

### Tenant Creation
- Super admin fills form at `/admin/tenants/new` (name, slug, logo, colors)
- `createTenant` server action inserts into `tenants` table
- No user association at creation time — admin creates users separately

### User Creation
- Super admin fills form at `/admin/users/new` (email, name, password, role, tenant)
- `inviteUser` server action creates Supabase auth user with temp password + public.users row
- No email invite — user gets temp password out-of-band

### Auth Callback
- `/api/auth/callback` exchanges code → session
- Redirects: super_admin → `/admin`, tenant users → `/{tenantId}`, fallback → `/`
- No onboarding detection

### Activity Logger
- 11 action types (login, search, profile_viewed, etc.)
- No tenant lifecycle events (created, renamed, settings changed)
- Uses admin client, fire-and-forget pattern

### Tenant List Page
- Table with Name, Slug, Status, Created, Actions
- Rows are not clickable — no detail view
- TenantStatusToggle for activate/deactivate

### Tenant Heatmap (Admin Dashboard)
- Shows tenant name, seats, status, actions (Impersonate, View Logs, Suspend)
- Fetches from `/api/admin/dashboard` heatmap endpoint
- Has skeleton loading pattern

## Key Dependencies

- `@supabase/supabase-js` — `auth.admin.inviteUserByEmail()` for email invites
- shadcn `Sheet` component — right-side slide-over drawer
- shadcn `Dialog` — centered modal for 3rd-level drill-down
- shadcn `Tabs` — activity card tab switching
- `PersonaSparkline` — reusable for usage stats sparklines
- `ActivityLogViewer` — reuse in full modal view
- `recharts` — growth trend chart, health score gauge

## Implementation Approach

### Supabase inviteUserByEmail
- Creates user in pending state, sends magic link email
- User clicks link → hits redirect URL with token
- Token exchanged for session via `exchangeCodeForSession`
- We redirect to onboarding if `onboarding_completed: false` in app_metadata

### Onboarding Flow
- New page at `/onboarding/confirm-tenant`
- Pre-fills tenant info from DB
- Admin can edit name, slug, colors
- Sets password via `updateUser`
- Clears `onboarding_completed` flag

### Tenant Detail Drawer
- Triggered by row click on tenants table
- Uses shadcn Sheet (side="right")
- Multiple API endpoints for drawer data
- Tabbed activity card with expand-to-modal

### Team Management
- New page at `/[orgId]/team`
- Tenant admin can invite users (email-based)
- Uses same Supabase invite flow
- Role restricted to agent/assistant
