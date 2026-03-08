# Tenant Management Redesign

## Overview

Redesign the tenant management system with email-based invite flows, admin onboarding, and a rich tenant detail drawer.

## Flow 1: Super Admin Invites Tenant Admin

1. Super admin goes to "Create Tenant" page — fills in tenant name, slug, colors, logo, **plus admin email**
2. Server action creates tenant, creates user with `tenant_admin` role, calls `supabase.auth.admin.inviteUserByEmail()`
3. User record gets metadata flag: `onboarding_completed: false`

## Flow 2: Tenant Admin Onboarding

1. Invited admin clicks magic link in email → `/auth/callback`
2. Callback detects `onboarding_completed: false` → redirects to `/onboarding/confirm-tenant`
3. Onboarding page shows pre-filled tenant info (name, slug, logo, colors) — all editable
4. Admin confirms or edits, sets password
5. On submit: tenant updated, flag cleared, activity logged (`tenant_confirmed`), redirect to dashboard

## Flow 3: Tenant Admin Invites Users

1. Tenant admin goes to "Team" page within their tenant (`/[orgId]/team`)
2. Enters email + selects role (`agent` or `assistant`)
3. Supabase `inviteUserByEmail()` sends email
4. User clicks link → `/auth/callback` → simpler onboarding (just set password, no tenant config)

## Tenant Detail Drawer

Triggered by clicking a tenant row in `/admin/tenants` table. Wide slide-over from right.

### Header
- Tenant name (inline editable), logo, status badge, slug, created date, brand color swatches
- Deactivate/Activate button

### Seat Utilization Card
- Visual bar: active vs total users
- Users list: name, email, role badge, last active
- "Invite User" button

### Tenant Health Score Card
- Score 0-100 with color-coded ring (green/yellow/red)
- Computed from: activity frequency, user engagement, feature adoption, data freshness
- Sub-metric breakdown

### Usage Stats Card
- Searches, enrichments, profile views, CSV exports — last 30 days
- Sparklines per metric (reuse `PersonaSparkline`)
- Comparison vs previous 30 days (arrows with %)

### Top Personas Card
- Top 3 most-used personas: name, last used, sparkline
- "View All" link

### Growth Trend Card
- Mini line chart: user count + activity over last 90 days

### Quota / Limits Card
- API calls, enrichment credits — usage vs allocation bars
- Placeholder-ready for billing

### Activity Card (Tabbed)
- Tabs: All | Admin Actions | User Activity
- Each tab: 5 most recent entries with icon, description, user, relative timestamp
- Expand button → centered modal (3rd level drill-down) with full `ActivityLogViewer`, tenant-scoped

## Database Changes

### New action types for `activity_log`
- `tenant_created`, `tenant_renamed`, `tenant_settings_updated`, `tenant_confirmed`
- `user_invited`, `user_invite_accepted`

### User metadata additions
- `onboarding_completed: boolean` in `app_metadata`

### New API endpoints
- `GET /api/admin/tenants/[id]/details` — all drawer data in one call
- `GET /api/admin/tenants/[id]/users` — users for this tenant
- `GET /api/admin/tenants/[id]/usage` — usage stats with sparkline data
- `GET /api/admin/tenants/[id]/health` — computed health score
- `GET /api/admin/tenants/[id]/personas` — top personas
- `POST /api/[orgId]/team/invite` — tenant admin invites user

## New Pages/Components
- `/onboarding/confirm-tenant` — onboarding page for invited admins
- `/[orgId]/team` — tenant-scoped user/team management page
- `TenantDetailDrawer` — slide-over drawer component
- `TenantHealthScore` — gauge/ring component
- `SeatUtilizationBar` — visual bar component
- `TenantActivityCard` — tabbed activity card with expand-to-modal
- `TenantUsageStats` — usage sparklines card
- `TenantGrowthChart` — 90-day trend chart
