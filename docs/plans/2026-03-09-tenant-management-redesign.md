# Tenant Management Redesign — COMPLETE

**Status:** Implemented and deployed (Phase 15, 8 plans)
**Date:** 2026-03-09
**Note:** The `primary_color`/`secondary_color` fields referenced here were superseded by Phase 16 (Tenant Branding) which replaced them with a curated `theme` field. See `2026-03-09-tenant-branding.md`.

## Overview

Redesigned the tenant management system with email-based invite flows, admin onboarding, a rich tenant detail slide-over drawer, and tenant-scoped team management.

## Flow 1: Super Admin Creates Tenant + Invites Admin

1. Super admin goes to `/admin/tenants/new` — fills in tenant name, slug, colors, logo, **plus optional admin email**
2. `createTenant` server action creates tenant, then if email provided:
   - Calls `supabase.auth.admin.inviteUserByEmail()` with redirect to `/api/auth/callback`
   - Sets `app_metadata`: `{ role: 'tenant_admin', tenant_id, onboarding_completed: false }`
   - Creates `public.users` row
   - Logs `tenant_created` and `user_invited` activity
3. If no admin email, tenant is created standalone (existing flow preserved)

## Flow 2: Tenant Admin Onboarding

1. Invited admin clicks magic link in email → `/api/auth/callback`
2. Auth callback detects `onboarding_completed: false` → redirects to `/onboarding/confirm-tenant`
3. Middleware also enforces redirect for any route if flag is false (except onboarding/callback paths)
4. Onboarding page shows pre-filled tenant info (name, slug, logo, colors) — all editable
5. Admin sets password, confirms or edits settings
6. On submit: tenant updated, password set, flag cleared to `true`, activity logged (`tenant_confirmed`, `user_invite_accepted`), redirect to `/{slug}/dashboard`

## Flow 3: Tenant Admin Invites Users

1. Tenant admin goes to `/[orgId]/team` (visible in sidebar for `tenant_admin` role only)
2. Clicks "Invite Team Member" → dialog with email, name, role (`agent` or `assistant` only)
3. `inviteTeamMember` server action calls `inviteUserByEmail`, sets metadata, creates user row, logs activity
4. Invited user clicks email link → `/api/auth/callback` → `/onboarding/set-password` (simpler onboarding, password only)
5. On submit: password set, flag cleared, redirect to dashboard

## Tenant Detail Drawer (3-Level Drill-Down)

**Trigger:** Click any tenant row in `/admin/tenants` table → 680px slide-over drawer from right.

**Level 1 — Table:** Tenant list with Name, Slug, Status, Created, Actions
**Level 2 — Drawer:** Rich tenant detail with 8 cards (scrollable)
**Level 3 — Modal:** Full activity log viewer with filtering and pagination

### Drawer Cards

| Card | Content |
|------|---------|
| **Header** | Logo/initial, inline-editable name (logs `tenant_renamed`), slug, status badge, created date, color swatches, activate/deactivate button |
| **Seat Utilization** | Active/total progress bar, user list with role badges and last active times, "Invite User" button |
| **Health Score** | 0-100 score with SVG ring gauge (green/yellow/red), 4 sub-metrics: Activity (/30), Engagement (/25), Adoption (/25), Freshness (/20) |
| **Usage Stats** | 2x2 grid: Searches, Profile Views, Enrichments, Exports. Each with value, sparkline, and % change vs previous 30 days |
| **Top Personas** | Top 3 by `last_used_at`, with filter tags. Empty state if none |
| **Growth Trend** | SVG area chart of daily activity over available data |
| **Quota & Limits** | Placeholder card ("Coming soon") for future billing integration |
| **Activity (Tabbed)** | Tabs: All / Admin / User. 5 recent entries each with icon, description, timestamp. Expand button opens Level 3 modal |

### Health Score Computation

| Component | Max Points | Calculation |
|-----------|-----------|-------------|
| Activity Frequency | 30 | Days with activity in last 30 / 30 |
| User Engagement | 25 | Users who logged in last 7d / total users |
| Feature Adoption | 25 | Distinct action types used in 30d / 11 |
| Data Freshness | 20 | 0d=20, 1-3d=15, 4-7d=10, 8-14d=5, 15+=0 |

Status: healthy (>=60), warning (>=30), critical (<30)

## API Endpoints Created

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/tenants/[id]` | GET | Tenant details + users with last_sign_in_at |
| `/api/admin/tenants/[id]` | PATCH | Update tenant name (logs `tenant_renamed`) |
| `/api/admin/tenants/[id]/usage` | GET | 30-day usage metrics with sparkline data and % changes |
| `/api/admin/tenants/[id]/health` | GET | Computed health score with breakdown |
| `/api/admin/tenants/[id]/personas` | GET | Top 3 personas by last_used_at |
| `/api/admin/tenants/[id]/activity` | GET | Paginated activity with tab filtering (all/admin/user) |
| `/api/onboarding/tenant` | GET | Tenant data for onboarding page (requires onboarding_completed: false) |

All admin endpoints require `super_admin` role (inline check).

## Activity Log Action Types Added

| Action Type | When Logged |
|-------------|-------------|
| `tenant_created` | Super admin creates a tenant |
| `tenant_renamed` | Name changed via drawer inline edit |
| `tenant_settings_updated` | Tenant settings changed |
| `tenant_confirmed` | Invited admin confirms tenant during onboarding |
| `user_invited` | Any admin invites a user via email |
| `user_invite_accepted` | Invited user completes onboarding |

All log entries include before/after metadata where applicable.

## Pages & Components Created

| File | Type | Purpose |
|------|------|---------|
| `src/app/onboarding/layout.tsx` | Layout | Minimal centered layout for onboarding (no sidebar) |
| `src/app/onboarding/confirm-tenant/page.tsx` | Page | Admin onboarding — confirm tenant settings + set password |
| `src/app/onboarding/set-password/page.tsx` | Page | User onboarding — set password only |
| `src/app/[orgId]/team/page.tsx` | Page | Team management table |
| `src/app/[orgId]/team/invite-dialog.tsx` | Component | Email invite dialog (agent/assistant roles) |
| `src/app/[orgId]/team/user-status-toggle.tsx` | Component | Tenant-scoped user activate/deactivate |
| `src/app/admin/tenants/tenant-table.tsx` | Component | Client wrapper for clickable tenant rows |
| `src/components/admin/tenant-detail-drawer.tsx` | Component | 680px slide-over drawer with 8 cards |
| `src/components/admin/tenant-activity-card.tsx` | Component | Tabbed activity card with expand-to-modal |
| `src/app/actions/onboarding.ts` | Actions | `confirmTenantOnboarding`, `completeUserOnboarding` |
| `src/app/actions/team.ts` | Actions | `inviteTeamMember`, `toggleTeamMemberStatus` |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/activity-logger.ts` | 6 new action types in ActionType union + ACTION_TYPES array |
| `src/middleware.ts` | Onboarding redirect for `onboarding_completed: false` |
| `src/app/api/auth/callback/route.ts` | Onboarding detection on magic link acceptance |
| `src/app/actions/admin.ts` | `createTenant` now accepts admin_email, invites via Supabase |
| `src/app/admin/tenants/new/page.tsx` | Admin Email field added to form |
| `src/app/admin/tenants/page.tsx` | Delegates to TenantTable client component |
| `src/lib/validations/schemas.ts` | `admin_email` field in createTenantSchema |
| `src/components/layout/nav-items.tsx` | "Team" nav item (role-gated to tenant_admin) |
| `src/components/layout/sidebar.tsx` | Passes `userRole` prop through |
| `src/components/layout/mobile-sidebar.tsx` | Passes `userRole` prop through |
| `src/app/[orgId]/layout.tsx` | Extracts and passes `userRole` to Sidebar |
