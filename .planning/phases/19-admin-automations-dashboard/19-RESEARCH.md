# Phase 19 Research: Admin Automations Dashboard

## Data Sources (Hybrid Strategy — No New Tables)

### enrich-prospect runs
- **Source**: `prospects` table — each row with `enrichment_status != 'none'` is a run
- `enrichment_status`: none | pending | in_progress | complete | failed
- `enrichment_source_status`: JSONB `{ contactout: { status, error?, at }, exa: {...}, sec: {...}, claude: {...} }`
- `enriched_at`: completion timestamp
- **NEW**: `enrichment_started_at` — set in "mark-in-progress" step (enables duration calc)
- **NEW**: `inngest_event_id` — stored from `inngest.send()` return `{ ids: string[] }`

### aggregate-daily-metrics runs
- **Source**: `activity_log` with new action_type `metrics_aggregated`
- **NEW**: Inngest function writes activity_log entry on completion with metadata `{ date, rowsUpserted, durationMs }`

### Inngest REST API (lazy drill-down)
- `GET https://api.inngest.com/v1/events/{eventId}/runs`
- Auth: `Authorization: Bearer ${INNGEST_SIGNING_KEY}`
- Returns: `{ data: [{ run_id, status, output, run_started_at, ended_at, function_id }] }`
- Used only when user clicks a run in sidebar for step-level timing

## Existing Admin API Endpoints (Reusable)
- `/api/admin/enrichment/health?days=14` — per-source success/fail time series
- `/api/admin/quota?days=7` — API usage by provider
- `/api/admin/errors?page=1` — failed enrichment error feed

## Key Patterns
- Nav: `ADMIN_NAV_PLATFORM` array in `admin-nav-links.tsx`
- Auth: `user.app_metadata?.role !== "super_admin"` → 403
- Queries: `createAdminClient()` bypasses RLS
- Drawer: `Sheet` component, `side="right"`, `p-6 space-y-5`
- Activity logger: `logActivity({ tenantId, userId, actionType, metadata })` — never throws
- `inngest.send()` returns `Promise<{ ids: string[] }>`
