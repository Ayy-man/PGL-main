# Phase 33: Tenant Issue Reporting System — Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Source:** PRD Express Path (`~/.claude/plans/mighty-booping-stardust.md`)

<domain>
## Phase Boundary

Build an in-product reporting system for tenants. Tenants click a contextual "Report an issue" button on lead-workflow pages (prospect dossier, list detail, search, personas), fill a small form, and the system auto-captures page context + target entity snapshot + screenshot. A new `/admin/reports` area lets super_admins triage reports across tenants with status workflow, inline snapshots, and screenshot previews — without needing cross-tenant data access.

**What ships in v1:**
- `issue_reports` table in Supabase
- Private `issue-reports` storage bucket for screenshots
- Reusable `<ReportIssueButton>` + `<ReportIssueDialog>` tenant components
- `POST /api/issues/report` endpoint
- `/admin/reports` list + `/admin/reports/[id]` detail pages
- Admin API routes (GET list, GET detail, PATCH, GET unread-count)
- In-app unread badge on admin nav "Issue Reports" entry
- `html2canvas` dynamic import for client-rendered screenshots

**What does NOT ship in v1** (deferred to v2):
- Tenant-visible history of their own past reports
- Email / Slack notifications to admins
- GitHub / Linear integration
- Bulk admin actions
- Per-row "report this lead" action inside list members table
- i18n of category labels

</domain>

<decisions>
## Implementation Decisions

### Entry point placement (LOCKED)
- **Contextual only** — no global topbar button. The report button appears on pages with a meaningful target.
- Mount sites (v1):
  - Prospect dossier: `src/app/[orgId]/prospects/[prospectId]/page.tsx` header action row
  - List detail: `src/app/[orgId]/lists/[listId]/page.tsx` header
  - Search page: via `SearchContent` client component, top-right of filter bar
  - Personas list: `src/app/[orgId]/personas/page.tsx` header
- Do NOT mount on: tenant settings, org admin pages, login/auth pages.

### Context capture (LOCKED)
- Every report captures ALL THREE signals:
  1. **JSON snapshot** of key target fields (e.g., prospect name/company/title/linkedin) — frozen at report time so admins see what the tenant saw even if data changes later
  2. **Deep link** — full tenant URL (`page_url`) stored as informational reference
  3. **Client-rendered screenshot** — via `html2canvas` dynamic import, uploaded to private Supabase storage bucket `issue-reports`, served to admins via signed URLs
- Plus: `user_agent`, `viewport {w, h}`, `page_path`

### Categories (LOCKED)
Five values for the `category` column:
- `incorrect_data` — wrong title, company, LinkedIn URL, etc.
- `missing_data` — not enough data, missing enrichment
- `bad_source` — broken SEC filing link, source cites wrong page
- `bug` — page crashed, button doesn't work, wrong UI state
- `other` — free-form "Something else"

### Database schema (LOCKED)
New migration: `supabase/migrations/20260410_issue_reports.sql`

```sql
CREATE TABLE issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id   UUID          REFERENCES users(id)   ON DELETE SET NULL,

  category TEXT NOT NULL CHECK (category IN (
    'incorrect_data','missing_data','bad_source','bug','other'
  )),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),

  page_url    TEXT NOT NULL,
  page_path   TEXT NOT NULL,
  user_agent  TEXT,
  viewport    JSONB,

  target_type     TEXT CHECK (target_type IN ('prospect','list','persona','search','none')),
  target_id       UUID,
  target_snapshot JSONB,

  screenshot_path TEXT,

  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','investigating','resolved','wontfix','duplicate'
  )),
  admin_notes  TEXT,
  resolved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_reports_tenant_created ON issue_reports(tenant_id, created_at DESC);
CREATE INDEX idx_issue_reports_status_created ON issue_reports(status, created_at DESC);
CREATE INDEX idx_issue_reports_target ON issue_reports(target_type, target_id)
  WHERE target_id IS NOT NULL;

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER issue_reports_updated_at
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**RLS policies (configured in Supabase dashboard per project convention):**
- Tenant users can INSERT rows where `tenant_id = auth tenant_id`
- Tenant users cannot SELECT any rows from this table
- super_admin reads/updates via service-role admin client (bypasses RLS)

### Storage (LOCKED)
- Private bucket `issue-reports`
- Path convention: `{tenant_id}/{report_id}.png`
- Uploaded during report submission using user-scoped supabase client (honors bucket RLS)
- Served to admins via `admin.storage.from('issue-reports').createSignedUrl(path, 3600)` — 60-minute TTL

### Tenant API (LOCKED)
`POST /api/issues/report` — mirrors `src/app/api/prospects/add-to-list/route.ts`
- `multipart/form-data`: JSON `payload` field + optional `screenshot` File field
- Parse via `req.formData()`
- Auth via `createClient()` from `src/lib/supabase/server.ts` + `auth.getUser()`
- Extract `tenant_id` from `user.app_metadata.tenant_id`
- Validate payload with zod schema
- Upload screenshot (if present) to storage, fall back to `screenshot_path = null` if upload fails
- Insert row with `tenant_id` and `user_id` scoped to authed user
- Fire-and-forget `logActivity({ actionType: 'issue_reported', targetType: 'issue_report', targetId: report.id, metadata: { category } })`
- Return `{ id }` 201

### Admin UI (LOCKED)
New route tree: `/admin/reports`
- `src/app/admin/reports/page.tsx` — server component, calls `requireSuperAdmin()`, fetches initial page via `createAdminClient()`, renders `<ReportsTable>`
- `src/app/admin/reports/reports-table.tsx` — client component, mirrors `src/app/admin/tenants/tenant-table.tsx` (desktop HTML table + mobile cards)
- `src/app/admin/reports/[id]/page.tsx` — detail, fetches one report + signed screenshot URL server-side
- `src/app/admin/reports/[id]/report-detail.tsx` — client component with status dropdown + admin_notes textarea + Save button

List view columns: Created (relative), Tenant, User, Category badge, Target (type + snapshot name), Status badge, quick-view icon. Filters above table: status (default `open`), category, tenant search.

Detail sections: Header (category + status + created) → Submitter (tenant + user) → Description → Target snapshot JSON → Screenshot preview (signed URL, hidden if none) → Original URL (informational) → Context (UA/viewport/path, collapsible) → Admin actions (status dropdown + notes + save).

### Admin API routes (LOCKED)
- `GET /api/admin/reports` — super_admin check + `createAdminClient()`; accepts `?status=&category=&tenant=&limit=&offset=`; joins tenant + user for display
- `GET /api/admin/reports/[id]` — detail + signed screenshot URL (60-min TTL)
- `PATCH /api/admin/reports/[id]` — updates status + admin_notes; on transition to `resolved`, sets `resolved_by = user.id` and `resolved_at = now()`
- `GET /api/admin/reports/unread-count` — returns `{ open: N }` for the nav badge

All mirror the super_admin check from `src/app/api/admin/tenants/route.ts`.

### Admin navigation (LOCKED)
Edit `src/app/admin/admin-nav-links.tsx`:
- Add `{ label: "Issue Reports", href: "/admin/reports", icon: AlertTriangle }` to `ADMIN_NAV_PLATFORM`
- Fetch `/api/admin/reports/unread-count` from the nav component on mount
- Render a red dot / numeric badge on the "Issue Reports" entry when `open > 0`

### Notifications (LOCKED)
- **In-app badge only for v1.** No email, no Slack, no Inngest events.
- Reason: project has neither Resend/SendGrid nor Slack webhook infrastructure today. Adding either is out of scope for this phase.
- Admins see the badge when they visit `/admin`.

### Dialog UX pattern (LOCKED)
- shadcn Dialog primitive (matches `persona-form-dialog.tsx` reference pattern)
- `useState` + `useTransition` for form state and submission (project convention — **no react-hook-form**)
- Form fields: category radio group, description textarea (min 10 chars, max 5000), "Include a screenshot" checkbox (default on), collapsible "What gets sent" preview
- Submit button label transitions "Send report" → "Sending..." during `useTransition` pending
- Success: close dialog, reset state, toast via `useToast` ("Thanks — we'll take a look")
- Error: red banner (mirror persona dialog pattern)
- If `html2canvas` throws or the 2-second soft timeout fires → submit proceeds with `screenshot_path = null` (graceful fallback)

### Dependencies (LOCKED)
- **New dependency:** `html2canvas` (~200KB gzipped). Loaded dynamically via `await import('html2canvas')` inside `src/lib/issues/capture-screenshot.ts` so the tenant bundle does not pay for it unless a user opens the report dialog.
- **Reused, no new deps:** `zod`, `@radix-ui/react-dialog`, `useToast` hook, `createClient`/`createAdminClient`, `requireSuperAdmin`, `logActivity`.

### Type definitions (LOCKED)
Add to `src/types/database.ts`:
- `IssueReport` interface matching the table schema
- `IssueCategory` union type: `'incorrect_data' | 'missing_data' | 'bad_source' | 'bug' | 'other'`
- `IssueStatus` union type: `'open' | 'investigating' | 'resolved' | 'wontfix' | 'duplicate'`
- `TargetType` union type: `'prospect' | 'list' | 'persona' | 'search' | 'none'`

Add to `src/lib/activity-logger.ts`:
- `'issue_reported'` value added to the `ActionType` union

### Claude's Discretion
Items the PRD leaves to the implementer:
- Exact React component file layout inside `src/components/issues/` (single file vs split)
- Icon choice for the report trigger button (lucide-react `Bug`, `Flag`, or `AlertTriangle` — pick one and use consistently)
- Exact Tailwind class strings for dialog styling (must match existing dark-luxury aesthetic in `persona-form-dialog.tsx`)
- Which filter UI primitive to use for admin list filters (Select vs segmented buttons) — match existing tenant-table pattern
- Zod schema field ordering and error message copy
- Default page size for admin list (suggest 25)
- Relative-time formatter (reuse existing if project has one, otherwise inline `Intl.RelativeTimeFormat`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Approved design doc (primary source)
- `~/.claude/plans/mighty-booping-stardust.md` — full design, verification plan, out-of-scope list

### Tenant POST API reference pattern
- `src/app/api/prospects/add-to-list/route.ts` — auth + tenant extraction + zod validation + write + fire-and-forget `logActivity` pattern to mirror in `POST /api/issues/report`

### Admin GET API reference pattern
- `src/app/api/admin/tenants/route.ts` — super_admin gate + `createAdminClient()` query pattern to mirror in `GET /api/admin/reports` (and sibling routes)

### Dialog form reference pattern
- `src/app/[orgId]/personas/components/persona-form-dialog.tsx` — `useState` + `useTransition` dialog form with error banner (no react-hook-form, no server actions). This is the exact pattern to clone for `<ReportIssueDialog>`.

### Admin table reference pattern
- `src/app/admin/tenants/tenant-table.tsx` — desktop `<table>` + mobile card variants, status badges, date formatting to mirror in `<ReportsTable>`

### Auth / Supabase helpers (use as-is)
- `src/lib/auth/rbac.ts` — `requireSuperAdmin()` used in admin layout + server pages
- `src/lib/supabase/admin.ts` — `createAdminClient()` for service-role queries
- `src/lib/supabase/server.ts` — `createClient()` for user-scoped (RLS) queries
- `src/lib/activity-logger.ts` — `logActivity({ tenantId, userId, actionType, targetType, targetId, metadata })` fire-and-forget
- `src/hooks/use-toast` — `useToast()` returns `{ toast }` for success/error notifications

### Navigation mount point
- `src/app/admin/admin-nav-links.tsx` — `ADMIN_NAV_PLATFORM` array where "Issue Reports" link gets added + badge rendering location

### Migration convention reference
- `supabase/migrations/20260407_activity_log_table.sql` — most recent migration; shows snake_case + uuid PK + `timestamptz` + CHECK enums + `ENABLE ROW LEVEL SECURITY` with in-dashboard policy comment (RLS configured in dashboard, not in migration files per project convention)

</canonical_refs>

<specifics>
## Specific Ideas

### File creation manifest (new files)
- `supabase/migrations/20260410_issue_reports.sql`
- `src/components/issues/report-issue-button.tsx`
- `src/components/issues/report-issue-dialog.tsx`
- `src/lib/issues/capture-context.ts`
- `src/lib/issues/capture-screenshot.ts`
- `src/app/api/issues/report/route.ts`
- `src/app/admin/reports/page.tsx`
- `src/app/admin/reports/reports-table.tsx`
- `src/app/admin/reports/[id]/page.tsx`
- `src/app/admin/reports/[id]/report-detail.tsx`
- `src/app/api/admin/reports/route.ts`
- `src/app/api/admin/reports/[id]/route.ts`
- `src/app/api/admin/reports/unread-count/route.ts`

### File modification manifest (existing files)
- `src/types/database.ts` — add `IssueReport`, `IssueCategory`, `IssueStatus`, `TargetType` types
- `src/lib/activity-logger.ts` — add `'issue_reported'` to `ActionType` union
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — mount `<ReportIssueButton target={{ type: 'prospect', id, snapshot }} />`
- `src/app/[orgId]/lists/[listId]/page.tsx` — mount in list header
- `src/app/[orgId]/search/page.tsx` (or its client `SearchContent`) — mount in filter bar
- `src/app/[orgId]/personas/page.tsx` — mount in page header
- `src/app/admin/admin-nav-links.tsx` — add "Issue Reports" nav entry + unread badge wiring

### Manual Supabase dashboard tasks (required before verification)
1. Apply migration `20260410_issue_reports.sql`
2. Create private storage bucket named `issue-reports`
3. Configure RLS policies on `issue_reports` table: INSERT allowed for rows where `tenant_id = auth.jwt() ->> 'app_metadata' ->> 'tenant_id'`; no SELECT policy (tenants cannot read the table)
4. Configure bucket policies on `issue-reports`: authenticated users can INSERT to `{tenant_id}/*` paths; no public reads (admin signed URLs only)

### Verification plan (from PRD)
**End-to-end smoke test:**
1. Apply migration + create bucket + configure RLS
2. Log in as tenant user, navigate to a prospect dossier
3. Click "Report an issue" → category "Incorrect data" → description → submit with screenshot checkbox on
4. Confirm toast, row in `issue_reports`, PNG in `issue-reports/{tenant_id}/{id}.png`
5. Log in as super_admin, visit `/admin/reports`, confirm report appears, open detail
6. Confirm snapshot JSON + screenshot render, change status to `investigating`, save, refresh
7. Badge unread count decrements
8. Repeat from list page and search page

**Edge cases:**
- Submit without screenshot → `screenshot_path = null`, detail view hides screenshot block
- `html2canvas` throws → form still submits with `screenshot_path = null`
- 5000-char description accepted; 5001 rejected with 400 from zod
- Browser-console verify: tenant cannot `from('issue_reports').select()` via user-scoped supabase client
- PATCH to `resolved` populates `resolved_by` + `resolved_at`
- Non-super_admin hitting `/admin/reports` gets redirected to `/login` by `requireSuperAdmin` in layout

**Regression:** `npm run lint` and `npm run typecheck` must stay clean; diffs to existing tenant pages must be additive (new button mount only).

</specifics>

<deferred>
## Deferred Ideas

Items explicitly marked out-of-scope for v1:

- **Tenant report history** — tenants cannot see a list of their own submitted reports. Success feedback is the toast, nothing more.
- **Email notifications** — no Resend/SendGrid setup exists today; adding that is a separate phase.
- **Slack webhook** — same rationale.
- **Inngest event** (`tenant-issue/created`) — would only be needed once email/Slack lands.
- **GitHub/Linear integration** — converting a report into an external tracker ticket.
- **Bulk admin actions** — bulk resolve, bulk assign, multi-select triage.
- **Per-row report action on list members table** — only the list-level button ships in v1. Per-row requires a different UX surface and a different target snapshot shape.
- **i18n** — category labels and dialog copy stay English-only.
- **Cross-tenant admin deep-link that opens the tenant's live dossier** — admins get snapshot + screenshot instead; the live deep link is informational only. Cross-tenant impersonation is not built today and is not in scope.

</deferred>

---

*Phase: 33-tenant-issue-reporting-system*
*Context gathered: 2026-04-10 via PRD Express Path*
*PRD source: `~/.claude/plans/mighty-booping-stardust.md`*
