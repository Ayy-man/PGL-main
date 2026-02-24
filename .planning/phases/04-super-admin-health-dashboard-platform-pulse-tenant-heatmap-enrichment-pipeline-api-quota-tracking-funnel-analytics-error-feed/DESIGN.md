# Phase 4: Super Admin Health Dashboard — Design

## Purpose

Transform the bare admin dashboard (4 count cards) into a platform health command center for PGL operators. Every number is clickable and drills down to details.

## Layout (4 vertical sections, scrollable)

### Section 1: Platform Pulse (4 stat cards, top row)

| Card | Data Source | Status |
|------|-------------|--------|
| **Total Prospects** — count + enrichment coverage % | `prospects` table: `COUNT(*)` and `COUNT WHERE enrichment_status = 'complete'` / total | Existing data |
| **Enrichment Pipeline** — success rate %, failed count (clickable drill-down) | `prospects` table: group by `enrichment_status` enum; drill-down reads `enrichment_source_status` JSONB for per-source failures | Existing data |
| **API Quota Burn** — requests used / limit per provider, mini progress bars | **NEW**: Redis counters per provider per day (`INCR` on each call). Key pattern: `api_usage:{provider}:{YYYY-MM-DD}` | Coming Soon (needs new data capture) |
| **Active Users Today** — count vs 7-day average | `activity_log WHERE action_type = 'login' AND created_at > today` + 7d average from `usage_metrics_daily` | Existing data |

### Section 2: Tenant Activity Heatmap (table)

| Column | Data Source | Status |
|--------|-------------|--------|
| Tenant name | `tenants.name` | Existing |
| User count | `COUNT users WHERE tenant_id = X` | Existing |
| Searches (7d) | `SUM(usage_metrics_daily.searches_executed) WHERE date >= now()-7d` | Existing |
| Enrichments (7d) | `SUM(usage_metrics_daily.profiles_enriched) WHERE date >= now()-7d` | Existing |
| Exports (7d) | `SUM(usage_metrics_daily.csv_exports) WHERE date >= now()-7d` | Existing |
| Last active | `MAX(activity_log.created_at) WHERE tenant_id = X` | Existing |

- Cell color coding: green (healthy), amber (low activity), red (zero)
- Clicking a tenant row expands inline to show per-user breakdown (data already in `usage_metrics_daily` by `user_id`)

### Section 3: Graphs (2-up layout)

**Left: Enrichment Pipeline Health** (stacked bar chart, daily)
- Bars segmented by source: Apollo, ContactOut, Exa, EDGAR, Claude
- Each segment split into success/failure
- Data source: `prospects.enrichment_source_status` JSONB — aggregate by source and status per day
- Status: **Partially existing** — `enrichment_source_status` exists but may not consistently store per-source results. Needs audit + backfill logic in Inngest enrichment function.

**Right: Search-to-Export Funnel** (funnel or horizontal bar chart)
- 4 stages: Searches → Profile Views → Enrichments → Exports
- Data source: `activity_log` grouped by `action_type` for the selected date range
- Action types: `search_executed` → `profile_viewed` → `profile_enriched` → `csv_exported`
- Status: **Existing data** — all 4 action types already tracked

### Section 4: Error/Failure Feed (table, most recent first)

| Column | Data Source | Status |
|--------|-------------|--------|
| Timestamp | `activity_log.created_at` or `prospects.updated_at` | Existing |
| Tenant | Join to `tenants.name` | Existing |
| User | Join to `users.full_name` | Existing |
| Action/Error type | `activity_log.action_type` + metadata, or `prospects.enrichment_status = 'failed'` | Existing |
| Details (expandable) | `activity_log.metadata` JSONB or `prospects.enrichment_source_status` JSONB | Partially existing |
| Re-trigger button | Calls existing `/api/prospects/[id]/enrich` endpoint | Existing |

- Status: **Partially existing** — failed enrichments are tracked but error details in `enrichment_source_status` may be sparse. Needs richer error capture in Inngest function.

## New Data Capture Required

### 1. API Quota Usage (Redis counters)

**Where to add `INCR`:**
- `src/lib/apollo/client.ts` — after successful Apollo call
- `src/lib/enrichment/contactout.ts` — after successful ContactOut call
- `src/lib/enrichment/exa.ts` — after successful Exa call
- `src/lib/enrichment/edgar.ts` — after successful SEC EDGAR call
- `src/lib/enrichment/claude.ts` — after successful Claude call

**Redis key pattern:** `api_usage:{provider}:{YYYY-MM-DD}`
**TTL:** 90 days
**Read endpoint:** New `/api/admin/quota` route

### 2. Enrichment Error Details

**Where to add:**
- `src/inngest/functions/enrich-prospect.ts` — in each step's catch block, write failure reason to `enrichment_source_status` JSONB

**Format:**
```json
{
  "contactout": { "status": "failed", "error": "402 Payment Required", "at": "2026-02-25T..." },
  "exa": { "status": "success", "at": "2026-02-25T..." },
  "edgar": { "status": "success", "at": "2026-02-25T..." }
}
```

### 3. Enrichment Timing (optional)

**Where to add:**
- `src/inngest/functions/enrich-prospect.ts` — record `started_at` and `completed_at` in step metadata

**Purpose:** Calculate avg enrichment time for pipeline health card.

## "Coming Soon" Cards

The API Quota Burn card should render with the card layout, show "Coming Soon" badge, and be grayed out until the Redis counter instrumentation is implemented. All other cards/sections use existing data and can ship immediately.

## API Endpoints Needed

| Endpoint | Purpose | New? |
|----------|---------|------|
| `GET /api/admin/dashboard` | Platform pulse stats (prospects count, enrichment %, active users) | New |
| `GET /api/admin/tenants/activity` | Tenant heatmap data with 7d aggregates | New |
| `GET /api/admin/enrichment/health` | Per-source success/failure rates over time | New |
| `GET /api/admin/errors` | Recent failures feed | New |
| `GET /api/admin/funnel` | Search-to-export funnel data | New |
| `GET /api/admin/quota` | API quota usage (Coming Soon) | New |
| `GET /api/analytics` | Already exists — reuse for daily trend data | Existing |

## Component Structure

```
src/app/admin/page.tsx (refactored — becomes the health dashboard)
src/components/admin/
  platform-pulse.tsx        (4 stat cards)
  tenant-heatmap.tsx        (expandable table)
  enrichment-health-chart.tsx (stacked bar)
  funnel-chart.tsx          (horizontal funnel)
  error-feed.tsx            (expandable table with re-trigger)
  coming-soon-card.tsx      (reusable "Coming Soon" overlay)
```
