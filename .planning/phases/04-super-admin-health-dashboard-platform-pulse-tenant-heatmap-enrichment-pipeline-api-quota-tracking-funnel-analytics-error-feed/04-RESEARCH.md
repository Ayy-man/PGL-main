# Phase 4: Super Admin Health Dashboard — Research

**Researched:** 2026-02-25
**Domain:** React dashboard, data visualization, Redis instrumentation, Next.js App Router API routes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Chart library:** whichever best fits the existing dark theme and luxury brand (gold/dark palette) — custom tweaking expected to match brand
- **Chart colors:** semantic colors derived from gold-ish tones that harmonize with the existing build (not generic green/blue/red — warm gold-adjacent hues for status states)
- **Subtle animations on load:** bars grow in, numbers count up on initial render. Polished but not distracting.
- **Auto-refresh every 60 seconds** across all dashboard sections
- **Show "Updated X seconds ago"** timestamp
- **Subtle refresh indicator** during polling (no full-page loading states on refresh)
- **Heatmap thresholds:** relative-to-peers classification: top 25% = healthy (green-gold), middle 50% = moderate (amber), bottom 25% = needs attention (warm red)
- **Thresholds auto-adjust** as tenant count grows — no hardcoded activity thresholds
- **New tenants with zero data** show as "new" state rather than "needs attention"
- **Primary interaction:** inline expansion (click row to expand details in-place)
- **Secondary:** link to relevant page where possible
- **NO re-trigger button** on error feed — view-only error details, no actions to re-run enrichment from the dashboard

### Claude's Discretion

- Specific chart library choice (Recharts, tremor, or other) based on brand fit and dark theme compatibility
- Exact gold-adjacent semantic color palette for chart data series
- Animation timing and easing curves
- Error feed pagination vs infinite scroll
- Loading skeleton design for initial page load vs auto-refresh

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 4 transforms `src/app/admin/page.tsx` — currently 4 raw count cards — into a full platform health command center. The work splits into three distinct tracks: (1) new data capture (Redis INCR instrumentation on enrichment clients + richer error capture in Inngest), (2) six new API endpoints under `/api/admin/*` that aggregate existing Supabase data, and (3) new React components that visualize the data with auto-refresh and drill-down interactions.

**Chart library decision:** Recharts 3.7.0 is already installed and already used in production (`UsageChart`, `MetricsCards`). It ships `BarChart`, `Bar`, `FunnelChart`, and `Funnel` out of the box, all confirmed present in the installed build. Dark theme integration is already proven — the existing `UsageChart` uses inline Recharts styling against the OKLCH color system. The only library bringing everything needed without adding a dependency is Recharts. No new library needs to be installed.

**Architecture overview:** All new API endpoints are Next.js Route Handlers under `/api/admin/*`, guard-checked with the existing `requireSuperAdmin()` helper, and queried via `createAdminClient()` (service role, bypasses RLS for cross-tenant admin reads). The dashboard page itself becomes a client component with a single `useEffect` poll loop at 60-second intervals. Individual sections are server-rendered on first load via the initial fetch in the `useEffect`, then kept fresh by the poll. Inline expansion (tenant row, error row) is handled purely client-side with local state — no extra API calls needed on expand because the initial response already includes the detail rows required for expansion.

**Primary recommendation:** Build all six API endpoints first (they are self-contained), then build the UI components against real response shapes, then wire up the Redis INCR instrumentation in the enrichment clients. This order prevents chasing moving targets in the UI and lets the "Coming Soon" quota card be a simple overlay drop-in once the Redis data exists.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.7.0 (installed) | BarChart, FunnelChart, Cell, Tooltip | Already installed, already themed, `BarChart` + `FunnelChart` confirmed present |
| @upstash/redis | 1.36.2 (installed) | Redis INCR for API quota counters | Already the project-wide Redis client |
| Next.js App Router | 14.2.35 (installed) | Route Handlers for 6 new API endpoints | Consistent with all existing API routes |
| @supabase/supabase-js | 2.95.3 (installed) | Supabase queries for heatmap, errors, funnel | `createAdminClient()` already used in admin routes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.563.0 (installed) | Icons in stat cards, refresh indicator | Consistent with existing admin UI icon usage |
| tailwindcss-animate | 1.0.7 (installed) | Entry animations for stat cards | `animate-pulse` already in use; `animate-in`, `fade-in` for load animations |
| zod | 4.3.6 (installed) | Query param validation in API routes | Consistent with all existing routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts (already installed) | Tremor | Tremor has nicer defaults but adds ~80KB and a full component abstraction layer; Recharts is already proven in this project |
| Recharts FunnelChart | Custom horizontal bar ratio | FunnelChart in Recharts 3 renders a stepped funnel natively; the custom approach needs more CSS work |
| useEffect poll loop | React Query / SWR | Either would clean up the polling logic, but adds a dependency; a simple setInterval in useEffect matches project style (no data-fetching library is currently used) |

**Installation:** No new packages required — all dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── admin/
│   │   └── page.tsx                        (refactored — health dashboard, client component)
│   └── api/
│       └── admin/
│           ├── dashboard/route.ts           (Platform Pulse stats)
│           ├── tenants/
│           │   └── activity/route.ts        (Tenant Heatmap data)
│           ├── enrichment/
│           │   └── health/route.ts          (Enrichment pipeline per-source breakdown)
│           ├── errors/route.ts              (Error/Failure Feed)
│           ├── funnel/route.ts              (Search-to-export funnel)
│           └── quota/route.ts              (API quota — Coming Soon shell)
├── components/
│   └── admin/
│       ├── platform-pulse.tsx              (4 stat cards with count-up animation)
│       ├── tenant-heatmap.tsx              (expandable table with relative-rank coloring)
│       ├── enrichment-health-chart.tsx     (stacked bar chart, per-source success/failure)
│       ├── funnel-chart.tsx                (horizontal funnel — Searches → Exports)
│       ├── error-feed.tsx                  (expandable table, view-only, paginated)
│       └── coming-soon-card.tsx            (reusable overlay for unimplemented cards)
```

### Pattern 1: Admin API Route (Consistent with Existing Routes)

**What:** Every new admin route follows the same guard + admin client + response shape pattern already established in `/api/admin/tenants/route.ts`.

**When to use:** All 6 new `/api/admin/*` routes.

```typescript
// Source: /src/app/api/admin/tenants/route.ts (existing pattern)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic"; // Required for routes that read Redis at module level

export async function GET() {
  try {
    await requireSuperAdmin(); // Redirects non-super_admin; returns user object

    const supabase = createAdminClient(); // Service role client — bypasses RLS

    // ... query logic ...

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[admin/xxx] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Key detail:** `export const dynamic = "force-dynamic"` is required on any route that imports Redis at module level (pattern from Phase 3 fix in `STATE.md`). All new quota and dashboard routes will need it.

### Pattern 2: Redis INCR for API Quota Counters

**What:** After each successful API call, `INCR` a day-keyed Redis counter. Key pattern: `api_usage:{provider}:{YYYY-MM-DD}`. TTL: 90 days.

**When to use:** Instrument `src/lib/enrichment/contactout.ts`, `exa.ts`, `edgar.ts`, `claude.ts`, and `src/lib/apollo/client.ts`.

```typescript
// Source: @upstash/redis INCR + EXPIRE pipeline pattern
import { redis } from "@/lib/cache/redis"; // Use existing singleton

async function incrementApiUsage(provider: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // "2026-02-25"
  const key = `api_usage:${provider}:${today}`;
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60 * 60 * 24 * 90); // 90 days TTL
    await pipeline.exec();
  } catch {
    // Quota tracking is non-critical — never let it throw
  }
}
```

**Key detail:** Use the existing `redis` singleton from `src/lib/cache/redis.ts` (not `src/lib/redis/client.ts` — there are two redis files; `src/lib/cache/redis.ts` is the canonical one used by rate-limit and cache utilities). Fire-and-forget with a try/catch — quota tracking must never throw and must never block the enrichment call.

### Pattern 3: Relative-to-Peers Heatmap Coloring

**What:** Given N tenants' activity totals, rank each tenant and assign CSS class based on quartile position. New tenants (zero activity across all metrics) get a "new" class, not "low".

**When to use:** `tenant-heatmap.tsx` cell coloring logic.

```typescript
// Derived from CONTEXT.md decision — no external library needed
function getHeatmapClass(value: number, allValues: number[]): string {
  if (value === 0 && allValues.every(v => v === 0)) return "heatmap-new";
  if (value === 0) return "heatmap-low";
  const nonZero = allValues.filter(v => v > 0).sort((a, b) => a - b);
  const rank = nonZero.indexOf(value) / (nonZero.length - 1); // 0..1
  if (rank >= 0.75) return "heatmap-high";
  if (rank >= 0.25) return "heatmap-mid";
  return "heatmap-low";
}
```

### Pattern 4: 60-Second Auto-Refresh with Stale Indicator

**What:** Client component uses `useEffect` with `setInterval` at 60s. Tracks last-fetched timestamp and renders "Updated X seconds ago" that ticks every second. Shows a subtle spinner during background refresh (not a full loading state).

**When to use:** `src/app/admin/page.tsx` after refactor.

```typescript
// Pattern consistent with /admin/analytics/page.tsx (existing client component)
"use client";
import { useEffect, useState, useCallback } from "react";

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async (isBackground = false) => {
    if (isBackground) setIsRefreshing(true);
    try {
      const [pulse, heatmap, enrichment, funnel, errors] = await Promise.all([
        fetch("/api/admin/dashboard").then(r => r.json()),
        fetch("/api/admin/tenants/activity").then(r => r.json()),
        fetch("/api/admin/enrichment/health").then(r => r.json()),
        fetch("/api/admin/funnel").then(r => r.json()),
        fetch("/api/admin/errors").then(r => r.json()),
      ]);
      setData({ pulse, heatmap, enrichment, funnel, errors });
      setLastFetched(new Date());
    } finally {
      if (isBackground) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(false); // Initial load
    const interval = setInterval(() => fetchAll(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);
  // ...
}
```

### Pattern 5: Enrichment Error Detail Capture in Inngest

**What:** Modify `updateSourceStatus` in `enrich-prospect.ts` to accept a richer object (not just a string status). Write structured error objects to `enrichment_source_status` JSONB.

**When to use:** `src/inngest/functions/enrich-prospect.ts` — in catch blocks for each step.

```typescript
// Extended updateSourceStatus — replaces current string-only version
type SourceStatus = { status: string; error?: string; at: string };

async function updateSourceStatus(
  prospectId: string,
  source: string,
  payload: SourceStatus
): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("prospects")
    .select("enrichment_source_status")
    .eq("id", prospectId)
    .single();

  await supabase
    .from("prospects")
    .update({
      enrichment_source_status: {
        ...(data?.enrichment_source_status || {}),
        [source]: payload,
      },
    })
    .eq("id", prospectId);
}

// In catch block:
await updateSourceStatus(prospectId, "contactout", {
  status: "failed",
  error: error instanceof Error ? error.message : String(error),
  at: new Date().toISOString(),
});
```

**Key detail:** This is a breaking change to the `updateSourceStatus` signature. All existing callers within `enrich-prospect.ts` must be updated to pass the new shape. The existing JSONB column (`enrichment_source_status`) already stores objects — this just makes the object richer.

### Pattern 6: Stacked BarChart with Recharts 3.x

**What:** Recharts 3.7.0 `BarChart` with `stackId` on each `Bar`. Per-source bars split into "success" and "failed" segments by iterating each source × status combination.

```typescript
// Source: verified against Recharts 3.7.0 installed in project
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Data shape from /api/admin/enrichment/health response:
// [{ date: "2026-02-25", contactout_success: 12, contactout_failed: 2, exa_success: 10, ... }]

const SOURCES = ["contactout", "exa", "edgar", "claude"] as const;
const COLORS = {
  success: { contactout: "oklch(0.84 0.10 85)", exa: "oklch(0.77 0.09 85)", edgar: "oklch(0.70 0.08 85)", claude: "oklch(0.63 0.07 85)" },
  failed:  { contactout: "oklch(0.52 0.13 22)", exa: "oklch(0.46 0.12 22)", edgar: "oklch(0.40 0.11 22)", claude: "oklch(0.35 0.10 22)" },
};

<BarChart data={data}>
  {SOURCES.map(source => (
    <>
      <Bar key={`${source}_success`} dataKey={`${source}_success`} stackId={source} fill={COLORS.success[source]} />
      <Bar key={`${source}_failed`}  dataKey={`${source}_failed`}  stackId={source} fill={COLORS.failed[source]} />
    </>
  ))}
</BarChart>
```

### Pattern 7: FunnelChart with Recharts 3.x

**What:** Recharts 3.7.0 exports `FunnelChart` and `Funnel` components. `Funnel` takes a `data` array with `{ name, value }` and renders a stepped funnel. `Cell` controls per-step colors.

```typescript
// Source: verified — FunnelChart and Funnel confirmed in recharts@3.7.0 build
import { FunnelChart, Funnel, Cell, Tooltip, LabelList, ResponsiveContainer } from "recharts";

const funnelData = [
  { name: "Searches",   value: 340 },
  { name: "Profile Views", value: 210 },
  { name: "Enrichments",   value: 87 },
  { name: "Exports",        value: 24 },
];

// Gold-to-amber gradient palette — warm hues, not generic rainbow
const FUNNEL_COLORS = [
  "oklch(0.84 0.10 85)",  // bright gold
  "oklch(0.77 0.09 80)",
  "oklch(0.68 0.11 70)",
  "oklch(0.60 0.12 60)",  // warm amber
];

<ResponsiveContainer width="100%" height={280}>
  <FunnelChart>
    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
    <Funnel dataKey="value" data={funnelData} isAnimationActive>
      {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
      <LabelList dataKey="name" position="right" fill="var(--muted-foreground)" fontSize={12} />
    </Funnel>
  </FunnelChart>
</ResponsiveContainer>
```

### Anti-Patterns to Avoid

- **Hardcoded activity thresholds in heatmap:** The user explicitly locked "relative-to-peers" — never write `if (searches < 10) return "low"`. Always calculate quartile position against the full dataset.
- **Blocking enrichment calls on quota INCR:** The Redis INCR must be fire-and-forget inside a try/catch. If Redis is down, enrichment must still succeed.
- **Full-page reload on 60s refresh:** The poll must use `setIsRefreshing(true)` (subtle indicator), not replace the entire loading state with skeletons. Users should see data while the refresh runs.
- **Importing Redis at module level without force-dynamic:** New API routes that import `redis` at module level need `export const dynamic = "force-dynamic"` to avoid Vercel build-time evaluation errors (pattern from Phase 3 STATE.md fix).
- **Using src/lib/redis/client.ts instead of src/lib/cache/redis.ts:** Two Redis files exist. The canonical singleton with lazy init and env trimming is `src/lib/cache/redis.ts`. The other (`src/lib/redis/client.ts`) is an older file used only by `getRedisClient()`. New code should import from `src/lib/cache/redis.ts`.
- **Querying activity_log without tenant_id in super_admin context:** The `activity_log` table has RLS. The error feed query must use `createAdminClient()` (service role) to read cross-tenant failures, then manually filter/join to tenants and users.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stacked bar chart | Custom SVG/canvas bars with D3 | Recharts `BarChart` + `stackId` | Already installed, handles resize, tooltip, animation |
| Funnel visualization | CSS trapezoid shapes or SVG | Recharts `FunnelChart` + `Funnel` + `Cell` | Native Recharts component confirmed in v3.7.0 |
| Count-up animation | Custom requestAnimationFrame | CSS `@keyframes` + `tabular-nums` font feature, or tiny inline hook | A 10-line useCountUp hook is trivial and avoids adding a library |
| Bar entry animation | Custom JS animation | Recharts built-in `isAnimationActive={true}` with `animationBegin` / `animationDuration` props | Recharts handles this natively |
| Relative rank calculation | External statistics library | Inline sort + array index / length | The percentile math is 3 lines of JS |
| Redis TTL management | Custom expiry logic | Upstash `pipeline.expire()` chained after `incr()` | Single pipeline call handles atomic INCR + TTL |

**Key insight:** This phase is entirely buildable with installed dependencies. Zero new npm packages are needed.

---

## Common Pitfalls

### Pitfall 1: enrichment_source_status Currently Stores Strings, Not Objects

**What goes wrong:** The existing `updateSourceStatus` call writes plain strings like `"complete"`, `"failed"` into `enrichment_source_status` JSONB (e.g., `{ "contactout": "complete", "exa": "failed" }`). The error feed component reads this field expecting structured objects with `{ status, error, at }` fields — it will get strings instead and crash or show nothing.

**Why it happens:** Phase 3 implemented `updateSourceStatus(prospectId, source, statusString)`. No one audited whether the value stored was a string or an object until now.

**How to avoid:** Migrate `updateSourceStatus` to accept `{ status, error?, at }` shape. This is a backward-compatible JSONB change — existing `"complete"` string values are simply left as-is in historical rows; new rows write the richer shape. The error feed query should handle both shapes: `typeof entry === "string" ? { status: entry } : entry`.

**Warning signs:** If `enrichment_source_status.contactout` in the Supabase dashboard is a string value like `"complete"` rather than `{ "status": "complete", "at": "..." }`, you are hitting this pitfall.

### Pitfall 2: Partitioned activity_log Requires Date Range in ALL Admin Queries

**What goes wrong:** The `activity_log` table is `PARTITION BY RANGE (created_at)`. Queries without a `created_at` filter will trigger a full-table scan across all partitions instead of pruning to the relevant partition. On large deployments this is slow.

**Why it happens:** Developers write `SELECT * FROM activity_log WHERE action_type = 'profile_enriched' LIMIT 50` without a date constraint.

**How to avoid:** Every error feed query and enrichment health query MUST include a `created_at >= now() - interval 'X days'` clause. The error feed endpoint should default to 7 days of errors and allow a configurable range.

**Warning signs:** API response times > 2s for the error feed on any reasonably sized dataset.

### Pitfall 3: Two Redis Singletons — Use the Right One

**What goes wrong:** Both `src/lib/redis/client.ts` (exports `getRedisClient()`) and `src/lib/cache/redis.ts` (exports `redis` proxy) exist. The new quota INCR code imports from the wrong one and gets a different singleton.

**Why it happens:** The `src/lib/redis/client.ts` was created early in Phase 1; `src/lib/cache/redis.ts` was created in Phase 2 with env-var trimming and a Proxy pattern for lazy init. `src/lib/cache/redis.ts` is the canonical one; all rate-limiters and cache utilities use it.

**How to avoid:** Always `import { redis } from "@/lib/cache/redis"`. Never import from `@/lib/redis/client`.

### Pitfall 4: enrichment_source_status Backfill Gap

**What goes wrong:** Historical prospects enriched before the Phase 4 change will have sparse or string-only `enrichment_source_status`. The enrichment health chart groups by source + date, so it will show gaps for pre-phase-4 enrichments.

**Why it happens:** The richer error capture is only added going forward.

**How to avoid:** The enrichment health API endpoint should treat missing/string source statuses gracefully: if a source entry is a string `"complete"`, count it as success; if it is a string `"failed"`, count it as failure; if missing, skip it. Document in the component that historical data before Phase 4 deploy may show lower-than-actual success counts.

### Pitfall 5: FunnelChart Requires Distinct stackId / Key per Cell

**What goes wrong:** Recharts `Funnel` component does not apply `Cell` colors if keys are not stable or if the data array mutates across renders.

**Why it happens:** Recharts Funnel uses index-based reconciliation. If the `data` prop array reference changes on every render (e.g., created inline in JSX), React reconciles `Cell` children incorrectly and fill colors revert to defaults.

**How to avoid:** Memoize the funnel data array with `useMemo`. Keep `Cell` children as a static array derived from `funnelData.map(...)`.

### Pitfall 6: requireSuperAdmin() Uses redirect(), Not NextResponse

**What goes wrong:** The existing `requireSuperAdmin()` calls `redirect("/login")` from `next/navigation`, which throws a special Next.js redirect error. If called inside an API Route Handler (which runs in a different context), this will 500 instead of 401.

**Why it happens:** `requireSuperAdmin()` was built for Server Components and Server Actions, not Route Handlers.

**How to avoid:** In API Route Handlers, do NOT call `requireSuperAdmin()` directly. Replicate the auth check inline for Route Handlers:

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.app_metadata?.role !== "super_admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

The existing `/api/admin/tenants/route.ts` DOES import `requireSuperAdmin()` — verify this works in practice. If it causes issues, inline the check. **Investigation needed** (see Open Questions).

---

## Code Examples

### GET /api/admin/dashboard — Platform Pulse Stats

```typescript
// Source: pattern from /api/analytics/route.ts + /api/admin/tenants/route.ts
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const [prospectsResult, activeUsersToday, activeUsers7d] = await Promise.all([
    admin.from("prospects").select("enrichment_status", { count: "exact" }),
    admin.from("activity_log")
      .select("user_id", { count: "exact" })
      .eq("action_type", "login")
      .gte("created_at", today),
    admin.from("usage_metrics_daily")
      .select("total_logins")
      .gte("date", sevenDaysAgo),
  ]);

  const total = prospectsResult.count ?? 0;
  const enriched = prospectsResult.data?.filter(p => p.enrichment_status === "complete").length ?? 0;
  const failed = prospectsResult.data?.filter(p => p.enrichment_status === "failed").length ?? 0;

  return NextResponse.json({
    totalProspects: total,
    enrichmentCoverage: total > 0 ? Math.round((enriched / total) * 100) : 0,
    enrichmentFailed: failed,
    activeUsersToday: activeUsersToday.count ?? 0,
    activeUsers7dAvg: Math.round(
      (activeUsers7d.data?.reduce((s, r) => s + (r.total_logins ?? 0), 0) ?? 0) / 7
    ),
  });
}
```

### GET /api/admin/tenants/activity — Heatmap Data

```typescript
// Queries: tenants + usage_metrics_daily (7d aggregates) + activity_log (last active)
// Returns array sorted by searches desc (most active first)
export async function GET() {
  // ... auth check ...
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const [tenants, metrics, lastActive] = await Promise.all([
    admin.from("tenants").select("id, name").eq("is_active", true),
    admin.from("usage_metrics_daily")
      .select("tenant_id, searches_executed, profiles_enriched, csv_exports")
      .gte("date", sevenDaysAgo),
    admin.from("activity_log")
      .select("tenant_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000), // Get most recent 1000 entries to find last active per tenant
  ]);
  // ... aggregate by tenant_id ...
}
```

### GET /api/admin/enrichment/health — Per-Source Breakdown

```typescript
// Query: prospects.enrichment_source_status JSONB, group by date + source
// enrichment_source_status shape: { contactout: { status: "complete"|"failed", at: "...", error?: "..." } }
// Must handle both string ("complete") and object ({ status, at }) values — backward compat

export async function GET(request: NextRequest) {
  // ... auth check ...
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "14", 10);
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

  const admin = createAdminClient();
  const { data } = await admin
    .from("prospects")
    .select("enrichment_source_status, updated_at")
    .not("enrichment_source_status", "is", null)
    .gte("updated_at", cutoff);

  // In-memory aggregation: group by date(updated_at) × source × status
  // (same pattern as Phase 3 in-memory aggregation in Inngest daily-metrics.ts)
  const byDate: Record<string, Record<string, { success: number; failed: number }>> = {};
  for (const row of (data ?? [])) {
    const date = row.updated_at.slice(0, 10);
    byDate[date] ??= {};
    for (const [source, entry] of Object.entries(row.enrichment_source_status ?? {})) {
      byDate[date][source] ??= { success: 0, failed: 0 };
      const status = typeof entry === "string" ? entry : (entry as { status: string }).status;
      if (status === "complete") byDate[date][source].success++;
      else if (status === "failed") byDate[date][source].failed++;
    }
  }
  // Flatten to array for Recharts ...
}
```

### Redis INCR Pipeline in Enrichment Clients

```typescript
// Place immediately after a successful API response — NOT in catch block
// Source: Upstash Redis INCR + pipeline, verified against @upstash/redis@1.36.2
import { redis } from "@/lib/cache/redis";

async function trackApiUsage(provider: "apollo" | "contactout" | "exa" | "edgar" | "claude"): Promise<void> {
  try {
    const key = `api_usage:${provider}:${new Date().toISOString().slice(0, 10)}`;
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60 * 60 * 24 * 90); // 90-day TTL
    await pipeline.exec();
  } catch {
    // Non-critical — never block the caller
  }
}
```

### GET /api/admin/errors — Error Feed

```typescript
// Queries prospects with enrichment_status = 'failed', joins tenants + users via admin client
// Handles both sparse and rich enrichment_source_status shapes
// Default: last 7 days, limit 50, most recent first

export async function GET(request: NextRequest) {
  // ... auth check ...
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();

  const admin = createAdminClient();
  const { data, count } = await admin
    .from("prospects")
    .select(`
      id, full_name, enrichment_status, enrichment_source_status, updated_at,
      tenant:tenants(id, name)
    `, { count: "exact" })
    .eq("enrichment_status", "failed")
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  return NextResponse.json({ data, total: count, page, limit });
}
```

### Count-Up Animation Hook (No Library Needed)

```typescript
// Tiny inline hook — avoids adding react-countup or similar
// Consistent with project pattern of minimal dependencies
import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCurrent(Math.round(progress * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}
```

### Recharts Dark Theme Configuration (Consistent with Existing UsageChart)

```typescript
// Source: existing /src/components/charts/usage-chart.tsx — established dark theme pattern
const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#18181b",          // matches --card in dark mode approx
  border: "1px solid #3f3f46",         // matches --border in dark mode approx
  borderRadius: "8px",
  color: "#f4f4f5",
} as const;

const CHART_AXIS_STYLE = {
  stroke: "#a1a1aa",
  tick: { fill: "#a1a1aa", fontSize: 12 },
} as const;

const GRID_STYLE = { strokeDasharray: "3 3", stroke: "#27272a" } as const;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `enrichment_source_status` stores plain strings (`"complete"`) | Phase 4 upgrades to structured objects `{ status, error, at }` | Phase 4 (this phase) | Enables error feed to show failure reason and timestamp per source |
| Admin dashboard is a Server Component with 4 static count cards | Phase 4 converts to Client Component with 60s poll + 4 sections | Phase 4 | Dashboard becomes live; requires `"use client"` and explicit data fetching |
| No API quota visibility | Redis INCR counters per provider per day | Phase 4 | Operators can see API burn rate; "Coming Soon" for UI until instrumentation ships |

**Deprecated / patterns to replace:**

- `src/app/admin/page.tsx` as a Server Component: replace entirely with a client component. The current 4-card server render becomes the skeleton/loading state.
- `updateSourceStatus(prospectId, source, statusString)` in `enrich-prospect.ts`: replace signature to accept `{ status, error?, at }`.

---

## Open Questions

1. **Does `requireSuperAdmin()` work safely inside Route Handlers?**
   - What we know: `requireSuperAdmin()` calls `redirect()` from `next/navigation`. The `redirect()` function works in Server Components and Server Actions by throwing a special error caught by Next.js. Route Handlers may or may not catch it correctly in Next.js 14.
   - What's unclear: The existing `/api/admin/tenants/route.ts` already uses it and there are no reported errors, but this has not been E2E tested (external services not configured per STATE.md).
   - Recommendation: In all 6 new Route Handlers, replicate the auth check inline (`getUser()` + role check → return 403) rather than relying on `requireSuperAdmin()`. This avoids the redirect-in-Route-Handler ambiguity entirely and matches the pattern used in `/api/analytics/route.ts`.

2. **enrichment_source_status backfill — is any needed?**
   - What we know: Historical rows have string values. The error feed only queries `enrichment_status = 'failed'` prospects. The enrichment health chart queries `enrichment_source_status` for per-source breakdown.
   - What's unclear: How many failed prospects are in the database before Phase 4 deploys? If zero (all existing failures were during dev/test), no backfill needed. If many, the health chart will show a burst of history with only string-level detail.
   - Recommendation: No SQL migration needed. Handle both string and object shapes in all query response processing. Document in API JSDoc that pre-Phase-4 entries may have less detail.

3. **activity_log partition coverage — what happens after 2026-06?**
   - What we know: The Phase 3 migration only created partitions through `2026-06`. The error feed queries `activity_log` for failed enrichment log entries with recent `created_at`.
   - What's unclear: If the app is running in July 2026 or later, inserts into `activity_log` will fail (no partition to route into). But errors also surface as `enrichment_status = 'failed'` on `prospects`, so the error feed can query `prospects` directly without needing `activity_log`. The DESIGN.md spec lists both as data sources.
   - Recommendation: The error feed should primarily query `prospects WHERE enrichment_status = 'failed'` (more reliable, no partition concern). Activity log entries for errors are supplementary. A future migration to add more partitions is a separate concern.

4. **`api_usage:apollo:*` vs tenant-scoped quota keys**
   - What we know: DESIGN.md specifies `api_usage:{provider}:{YYYY-MM-DD}` (global, not per-tenant). The admin quota card reads aggregate usage.
   - What's unclear: If per-tenant quota breakdown is ever needed (v2 feature), global keys won't support it.
   - Recommendation: Use global keys as specified for now (`api_usage:{provider}:{date}`). This is a conscious scope decision per DESIGN.md.

---

## Data Flow Summary (for Planner Reference)

```
Section 1: Platform Pulse
  GET /api/admin/dashboard
    └── prospects (COUNT + filter by enrichment_status)
    └── activity_log (logins today + usage_metrics_daily for 7d avg)
    └── redis.mget(api_usage:*:today) → API Quota Burn (Coming Soon shell)

Section 2: Tenant Activity Heatmap
  GET /api/admin/tenants/activity
    └── tenants (id, name)
    └── usage_metrics_daily (7d aggregate per tenant_id)
    └── users (COUNT per tenant for user count column)
    └── activity_log (MAX created_at per tenant_id for "last active")
  Inline expand → per-user breakdown from same usage_metrics_daily by user_id

Section 3a: Enrichment Pipeline Health Chart
  GET /api/admin/enrichment/health?days=14
    └── prospects.enrichment_source_status JSONB (aggregate in-memory)
    └── Returns: [{ date, contactout_success, contactout_failed, exa_success, ... }]

Section 3b: Search-to-Export Funnel
  GET /api/admin/funnel?days=7
    └── activity_log GROUP BY action_type (search_executed, profile_viewed, profile_enriched, csv_exported)
    └── Returns: [{ stage, count }]

Section 4: Error/Failure Feed
  GET /api/admin/errors?limit=50&page=1
    └── prospects WHERE enrichment_status = 'failed' + join tenants
    └── enrichment_source_status JSONB → expand inline to show per-source failure reason
    └── View-only (no re-trigger button per CONTEXT.md decision)
```

---

## Implementation Wave Suggestion (for Planner)

The phase splits naturally into 3 sequential waves:

**Wave 1 — Data Layer (no UI):**
- 6 new API endpoints (`/api/admin/dashboard`, `/tenants/activity`, `/enrichment/health`, `/errors`, `/funnel`, `/quota` shell)
- Enrich Inngest `updateSourceStatus` to write `{ status, error?, at }` objects
- Redis INCR instrumentation in 5 enrichment clients

**Wave 2 — Component Library:**
- `platform-pulse.tsx` — stat cards + count-up animation
- `tenant-heatmap.tsx` — expandable table + relative-rank coloring
- `enrichment-health-chart.tsx` — Recharts BarChart stacked
- `funnel-chart.tsx` — Recharts FunnelChart
- `error-feed.tsx` — paginated expandable table, view-only
- `coming-soon-card.tsx` — overlay wrapper

**Wave 3 — Dashboard Assembly:**
- Refactor `src/app/admin/page.tsx` to client component
- Wire 60s poll loop
- Connect all components to their respective endpoints
- "Updated X seconds ago" timestamp
- Subtle refresh indicator

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection — `/src/app/admin/page.tsx`, `/src/components/charts/*.tsx`, `/src/app/api/analytics/route.ts`, `/src/lib/cache/redis.ts`, `/src/inngest/functions/enrich-prospect.ts`, `/src/lib/auth/rbac.ts` — direct source reading
- `/supabase/migrations/` — confirmed schema shapes for `prospects.enrichment_source_status`, `activity_log` partition structure, `usage_metrics_daily` columns
- `recharts@3.7.0` installed — confirmed `BarChart`, `Bar`, `FunnelChart`, `Funnel`, `Cell` exports via `node -e "require('recharts')"` against project node_modules
- `@upstash/redis@1.36.2` installed — pipeline API confirmed via installed package
- `.planning/phases/04-*/04-CONTEXT.md` — user decisions locked
- `.planning/phases/04-*/DESIGN.md` — full layout, data sources, endpoint inventory

### Secondary (MEDIUM confidence)

- `STATE.md` accumulated decisions — force-dynamic requirement, in-memory aggregation pattern, admin client usage for cross-tenant queries — sourced from project history, verified against actual route files

### Tertiary (LOW confidence)

- Recharts 3 FunnelChart `isAnimationActive` and `LabelList` props — confirmed component exists but specific prop behavior validated only by inspection of installed JS, not against official docs. Recommend testing rendering in isolation before assuming label positioning works as expected.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified installed in project node_modules
- Architecture patterns: HIGH — all patterns derived directly from existing codebase files
- Pitfalls: HIGH for items 1-4 (verified from schema/code), MEDIUM for items 5-6 (reasoning from Recharts behavior and Next.js patterns)
- Open questions: documented honestly with recommendations

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable stack; no fast-moving dependencies)
