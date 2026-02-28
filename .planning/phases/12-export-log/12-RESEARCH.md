# Phase 12: Export Log (Screen E) - Research

**Researched:** 2026-03-01
**Domain:** Next.js 15, React, Supabase activity_log queries, CSV re-download, data table pagination, design system compliance
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXP-01 | User can export list to CSV with all enriched data columns | Backend already complete — `/api/export/csv` route exists with streaming. Phase 12 adds a re-download UI action that calls this same route with the `listId` stored in the activity log metadata. |
| EXP-02 | CSV export uses streaming (papaparse) to handle 1000+ prospects without OOM | Already implemented in `/api/export/csv/route.ts` using `ReadableStream` + `csv-stringify`. Phase 12 does not re-implement this — it surfaces it through the export log UI. |
| EXP-03 | Export includes UTF-8 encoding for international names | Already implemented via `bom: true` in `csv-stringify` options. No Phase 12 work needed beyond verifying re-download hits the same route. |
| EXP-04 | Export triggers activity log entry | Already fires `logActivity({ actionType: "csv_exported", ... })` in export route. Phase 12 reads these entries from the `activity_log` table to render the export history. |
| ACT-01 | System logs 11 action types including `csv_exported` | `activity_log` table already populated with `csv_exported` entries that include `metadata.listName` and `metadata.memberCount`. Phase 12 queries filtered to `action_type = csv_exported`. |
| ACT-03 | Activity log is viewable by tenant admin (tenant-scoped) | `/api/activity` route already enforces `tenant_admin` or `super_admin` role check, with RLS automatic tenant scoping. Phase 12 consumes this API with `action_type=csv_exported` filter. |
</phase_requirements>

---

## Summary

Phase 12 is a UI-only build. All backend infrastructure — the CSV export endpoint, activity logging, and the `/api/activity` query API — is complete from Phase 3. The goal is to build Screen E: a luxury-styled export history page at `/{orgId}/exports` (or a sub-route of dashboard) that reads `csv_exported` activity log entries and presents them as a filterable, paginated table with stat cards and a re-download action.

The stitch mockup (`stitch/crm_sync_team_export_log/`) defines the visual target: a page titled "Export Log & Usage Analytics" with three stat cards (Total Monthly Exports, Unique Prospects, Top Exporter), a "Recent Exports" table (Timestamp, List Name, Row Count, Format, Exported By, Re-download action), and a pagination bar. The design must be translated from the stitch's raw Inter/Tailwind color classes into the project's design system: Cormorant Garamond headings, DM Sans body, CSS variable tokens, `surface-card` class, gold accents via CSS variables (never raw hex), and Lucide icons (no Material Symbols).

The primary technical challenge is the **re-download** action: the original CSV file is not stored — the system only logs that an export happened. Re-download must re-trigger `/api/export/csv?listId={id}` using the `target_id` from the activity log entry. This requires the `target_id` (listId) to be present in the activity log row. A secondary concern is **stat card aggregation**: the API returns raw activity log entries; the page must derive "Total Monthly Exports," "Unique Prospects" (sum of `metadata.memberCount`), and "Top Exporter" client-side from the fetched data.

**Primary recommendation:** Build `/{orgId}/exports/page.tsx` as a Server Component for initial data fetch, with a `ExportLogClient` client component for filters + pagination. Derive stat card values from the same activity data. Implement re-download as a simple `window.location.href` navigation to the existing export route.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 (App Router) | ^15 | Page routing, Server Components, async params | Already in use |
| React 18 | ^18 | Client components for filters/pagination interactivity | Already in use |
| Supabase JS (`@supabase/ssr`) | current | Data fetching via `/api/activity` route | Already in use |
| Tailwind CSS + CSS variables | v3 | Styling with design system tokens | Already in use |
| Lucide React | current | Icons (Download, FileText, User, Filter, ChevronLeft, ChevronRight, BarChart2) | Design system mandates Lucide exclusively |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` (already available via project) | — | Date formatting for timestamps in table cells | Use `format(date, 'MMM d, h:mm a')` for display |
| `nuqs` | current | URL-synchronized filter state (date range, page) | Consistent with project pattern (used in search page) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side stat derivation | Separate `/api/analytics` endpoint | Client-side is simpler since data volume is small (exports per month typically < 200); avoids new API surface |
| `nuqs` for filter state | `useState` only | `nuqs` gives bookmarkable/shareable URLs; consistent with search page pattern |

**Installation:**
```bash
# No new dependencies required. All libraries already installed.
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/[orgId]/exports/
├── page.tsx                      # Server Component — auth check, initial data fetch
└── components/
    ├── export-log-client.tsx     # Client Component — filters, pagination, table
    └── export-stat-cards.tsx     # Client or pure component — 3 stat cards
```

### Pattern 1: Server Component Auth + Initial Fetch

**What:** Page-level Server Component handles auth, role check, and passes initial data to the client component for hydration (avoids loading flash).

**When to use:** When the page has protected access and benefits from SSR initial data.

**Example:**
```tsx
// Source: Pattern from src/app/[orgId]/lists/[listId]/page.tsx
export default async function ExportsPage({ params }: PageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.app_metadata?.role;
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect(`/${orgId}`);
  }

  // Fetch first page of csv_exported activity entries
  const res = await fetch(`/api/activity?action_type=csv_exported&limit=20&page=1`, {
    headers: { Cookie: ... } // server-side fetch with cookies
  });
  const initial = await res.json();

  return <ExportLogClient orgId={orgId} initialData={initial} />;
}
```

**Critical note:** Server-side fetch from Route Handlers within the same Next.js 15 app requires either using the Supabase client directly (preferred) or passing the request cookies. The simpler approach: query `activity_log` directly in the Server Component using `createClient()` rather than going through the `/api/activity` route.

### Pattern 2: Direct Supabase Query in Server Component (Preferred)

**What:** Skip the `/api/activity` HTTP round-trip. Query `activity_log` table directly using `createClient()` with the `action_type = csv_exported` filter. The RLS on `activity_log` will automatically scope to the user's tenant.

**Example:**
```tsx
// Source: pattern from src/app/[orgId]/dashboard/analytics/page.tsx
const { data: exports, count } = await supabase
  .from("activity_log")
  .select("*", { count: "exact" })
  .eq("action_type", "csv_exported")
  .order("created_at", { ascending: false })
  .range(0, 19);
```

**Why preferred:** No HTTP overhead, RLS enforces tenant scoping automatically, consistent with how other pages fetch data.

### Pattern 3: Client Component Pagination + Filters

**What:** The client component owns filter state (date range, page number) via `nuqs`. When filters change, it refetches from `/api/activity` using the existing API. This avoids re-rendering the entire Server Component on every filter change.

**Example:**
```tsx
// Source: pattern from src/components/activity/activity-log-viewer.tsx
"use client";
const [startDate, setStartDate] = useQueryState("start");
const [endDate, setEndDate] = useQueryState("end");
const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

// On filter change, fetch from /api/activity?action_type=csv_exported&...
```

### Pattern 4: Re-Download Action

**What:** The re-download button navigates to `/api/export/csv?listId={targetId}`, which triggers the browser's download via `Content-Disposition: attachment`. The `target_id` in the activity log entry IS the listId.

**Example:**
```tsx
// Direct navigation — browser handles download without JS fetch
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    window.location.href = `/api/export/csv?listId=${entry.target_id}`;
  }}
  aria-label="Re-download export"
>
  <Download className="h-4 w-4" />
  Re-download
</Button>
```

**Caveat:** This only works if the list still exists. If the list was deleted, the re-download will return a 404. The UI should handle this gracefully (show a toast error if the download fails). Use a fetch check + fallback error toast rather than a plain `window.location.href` navigation if error handling is desired.

### Pattern 5: Stat Card Aggregation

**What:** "Total Monthly Exports" = count of entries. "Unique Prospects" = sum of `metadata.memberCount` across entries. "Top Exporter" = `user_id` with most entries. Since the activity log does not store `user.full_name` directly (only `user_id`), the "Exported By" column and "Top Exporter" stat will show a truncated user_id or require a secondary users table lookup.

**Decision for planning:** Fetch user display names from the `public.users` table where `id IN (distinct user_ids from activity entries)`. This requires either a server-side join or a secondary client fetch. The simpler approach: show `user_id.slice(0, 8)...` as in the existing `ActivityLogViewer`. The design spec shows "Sarah Jenkins" — this requires the `users` table lookup. Plan should include this as an optional enhancement or use the existing truncated ID pattern.

**Recommendation:** Include user display name lookup (join against `public.users`) for the "Exported By" column. This is a single additional query and makes the page match the stitch mockup quality.

### Anti-Patterns to Avoid

- **Using raw hex values in className:** Use CSS variables (`var(--gold-primary)`) via inline style or the established token class pattern, never `#d4af37` inline or `text-yellow-500` Tailwind classes
- **Raw Tailwind color classes:** `zinc-*`, `gray-*`, `emerald-*` are banned per design system — use `text-muted-foreground`, `text-foreground`, CSS variable tokens
- **Scale transforms on hover:** No `hover:scale-105`. Use border/opacity transitions only
- **Material Symbols or emoji icons:** Only Lucide React
- **Flat solid backgrounds on cards:** Every card uses `surface-card` class (which applies `--bg-card-gradient`)
- **Going through `/api/activity` for the initial server-side data fetch:** Use `createClient()` directly in the Server Component to avoid HTTP round-trips
- **Not handling "list deleted" case for re-download:** The listId in `target_id` may no longer exist

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination UI | Custom pagination component | Existing `DataTablePagination` at `src/components/ui/data-table/data-table-pagination.tsx` OR simple prev/next buttons as in `ActivityLogViewer` | Already built, design-system compliant |
| Empty state | Custom empty div | `EmptyState` from `src/components/ui/empty-state.tsx` | Already built with gold icon circle, Cormorant heading |
| Table structure | Custom table | `Table`, `TableHead`, `TableRow`, `TableCell` from `src/components/ui/table.tsx` | Already has `border-[var(--border-subtle)]` and correct hover states |
| Status badge | Custom badge div | `Badge` from `src/components/ui/badge.tsx` with `variant="gold"` or `variant="success"` | Already design-system compliant |
| Date formatting | Custom date logic | `relativeTime()` pattern from `ActivityLogViewer` or `date-fns format()` | Well-tested, edge-case-safe |
| Card structure | Custom card div | `Card`, `CardHeader`, `CardContent` from `src/components/ui/card.tsx` | Already uses `surface-card` class |
| Breadcrumbs | Custom breadcrumb | `Breadcrumbs` from `src/components/ui/breadcrumbs.tsx` | Already built per design system spec |

**Key insight:** The shared component library built in Phases 6–7 covers every reusable element. This phase assembles them, not builds them.

---

## Common Pitfalls

### Pitfall 1: Missing Metadata Fields on Re-Download

**What goes wrong:** The re-download action requires `target_id` (listId) to be stored in the activity log. If any export was logged with `targetId` missing, the re-download button cannot function.

**Why it happens:** The `logActivity` call in `/api/export/csv/route.ts` already passes `targetId: listId` — this is correct. However, if the activity log entry for any reason has `target_id = null`, the button must be disabled or hidden.

**How to avoid:** Conditionally render the re-download button only when `entry.target_id` is non-null. Show a disabled state with tooltip "List ID not available" otherwise.

**Warning signs:** `entry.target_id === null` — add a guard in the render logic.

### Pitfall 2: User Display Names Require a Join

**What goes wrong:** The `activity_log` table stores `user_id` (UUID), not user display names. The stitch mockup shows full names ("Sarah Jenkins"). If you render `user_id.slice(0, 8)...`, the page looks incomplete vs. the design intent.

**Why it happens:** Activity logging is intentionally thin — it logs IDs, not denormalized data.

**How to avoid:** In the Server Component, after fetching activity entries, collect distinct `user_id` values and run a secondary query: `supabase.from("users").select("id, full_name").in("id", userIds)`. Build a lookup map `{ [userId]: fullName }` and pass to the client component.

**Warning signs:** If "Exported By" column shows UUIDs, the join was skipped.

### Pitfall 3: Stat Cards Use Stale Data When Filters Applied

**What goes wrong:** If the user applies a date filter, the stat cards should reflect the filtered dataset totals, not all-time totals. If stat cards are computed from a different (full) dataset, they will show misleading numbers.

**How to avoid:** Compute stat cards from the same filtered dataset used for the table. Pass the same query params to both the stats aggregation and the table data fetch, or compute stats client-side from the current page data + totals returned by the API.

**Warning signs:** Stat card "Total Monthly Exports: 128" does not change when a date filter narrows the table to 3 rows.

### Pitfall 4: `metadata` JSONB Field Null Safety

**What goes wrong:** `entry.metadata` is typed as `Record<string, unknown> | null`. Accessing `entry.metadata.memberCount` will throw if metadata is null or if the key is absent.

**How to avoid:** Always use optional chaining: `(entry.metadata as Record<string, unknown>)?.memberCount as number ?? 0`.

**Warning signs:** TypeScript errors or runtime crashes when rendering row count in the table.

### Pitfall 5: `/api/activity` Role Check Blocks Non-Admins

**What goes wrong:** The `/api/activity` route returns 403 for `agent` and `assistant` roles. If the exports page is accessed by a non-admin tenant user, it will silently fail to load data.

**Why it happens:** The API intentionally restricts to `tenant_admin` and `super_admin`. The page should redirect non-admin users before attempting the fetch.

**How to avoid:** In the Server Component, check `user.app_metadata.role` before rendering the page — redirect to `/{orgId}` if role is `agent` or `assistant`.

---

## Code Examples

### Example: Direct Activity Log Query in Server Component

```tsx
// Source: pattern from /api/activity/route.ts + supabase server client
const supabase = await createClient();
const { data: exports, count, error } = await supabase
  .from("activity_log")
  .select("*", { count: "exact" })
  .eq("action_type", "csv_exported")
  .order("created_at", { ascending: false })
  .range(0, 19); // first 20 rows

// User lookup
const userIds = [...new Set((exports ?? []).map((e) => e.user_id))];
const { data: users } = await supabase
  .from("users")
  .select("id, full_name")
  .in("id", userIds);
const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.full_name]));
```

### Example: Stat Cards Derivation

```tsx
// Computed from exports array — matches stitch mockup stat cards
const totalExports = count ?? 0;

const uniqueProspects = (exports ?? []).reduce(
  (sum, e) => sum + ((e.metadata as Record<string, unknown>)?.memberCount as number ?? 0),
  0
);

const exportsByUser = (exports ?? []).reduce<Record<string, number>>((acc, e) => {
  acc[e.user_id] = (acc[e.user_id] ?? 0) + 1;
  return acc;
}, {});
const topExporterId = Object.entries(exportsByUser)
  .sort(([, a], [, b]) => b - a)[0]?.[0];
const topExporterName = userMap[topExporterId ?? ""] ?? topExporterId?.slice(0, 8) ?? "—";
```

### Example: Re-Download Button

```tsx
// Source: pattern consistent with /api/export/csv route GET behavior
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function ReDownloadButton({ listId }: { listId: string | null }) {
  if (!listId) {
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Unavailable
      </span>
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => { window.location.href = `/api/export/csv?listId=${listId}`; }}
      aria-label="Re-download this export"
    >
      <Download className="h-4 w-4 shrink-0" />
      Re-download
    </Button>
  );
}
```

### Example: Table Row with Correct Design Tokens

```tsx
// Source: design-system/MASTER.md — table rows, typography rules
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";

// TableHead already has: text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground
// TableRow already has: border-b border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)]
// TableCell already has: px-4 py-3

// Timestamp cell — use font-mono per MASTER.md "data" type scale
<TableCell className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
  {format(new Date(entry.created_at), "MMM d, h:mm a")}
</TableCell>

// Row count cell — right align, font-mono, gold text
<TableCell className="font-mono text-xs text-right" style={{ color: "var(--gold-text)" }}>
  {(entry.metadata as Record<string, unknown>)?.memberCount as number ?? "—"}
</TableCell>
```

### Example: Stat Card Component

```tsx
// Source: pattern from existing dashboard stat cards, MASTER.md surface treatment
import { Card, CardContent } from "@/components/ui/card";
// Card already uses surface-card class (gradient bg, subtle border, 14px radius)

interface ExportStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtext?: string;
}

function ExportStatCard({ label, value, icon: Icon, subtext }: ExportStatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6">
        <div className="absolute top-4 right-4 opacity-10">
          <Icon className="h-12 w-12" style={{ color: "var(--gold-primary)" }} />
        </div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[1px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </p>
        <p
          className="mt-3 font-serif text-4xl font-semibold"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Example: Page Header (matching stitch mockup)

```tsx
// Page title: h1 at 38px, font-serif per MASTER.md
// Action buttons: ghost variant + gold variant
import { Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

<div className="space-y-6">
  <Breadcrumbs
    items={[
      { label: "Dashboard", href: `/${orgId}` },
      { label: "Export Log" },
    ]}
  />
  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
    <div>
      <h1
        className="font-serif font-semibold"
        style={{ fontSize: "38px", letterSpacing: "-0.5px", color: "var(--text-primary-ds)" }}
      >
        Export Log
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary-ds)" }}>
        Monitor your team's data extraction history and access previous downloads.
      </p>
    </div>
    <div className="flex gap-3">
      <Button variant="ghost" size="sm">
        <Filter className="h-4 w-4 shrink-0" />
        Filters
      </Button>
    </div>
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw Tailwind color classes (`zinc-*`, `gray-*`) | CSS variables via inline style or Tailwind arbitrary `[var(--token)]` | Phase 5 | All existing pages updated; new pages must follow |
| `font-cormorant` class | `font-serif` class | Phase 5 | `font-cormorant` bypasses variable system — always use `font-serif` |
| `useState` for URL params | `nuqs` for shareable URLs | Phase 2 | Consistent with search page; filters are bookmarkable |
| Supabase client in useEffect (client component) | `createClient()` in Server Component | Phase 1 | Better perf, no auth flash |
| `getSession()` | `getUser()` for JWT validation | Phase 1 | Security best practice enforced throughout |

---

## Open Questions

1. **Route location: `/[orgId]/exports` vs `/[orgId]/dashboard/exports`**
   - What we know: Other standalone tenant pages (`/lists`, `/search`, `/personas`) live at `/{orgId}/{slug}` directly. The activity log page lives at `/{orgId}/dashboard/activity`.
   - What's unclear: The Roadmap calls this "Screen E" but doesn't specify a URL slug. The stitch mockup nav shows "Export Log" as a top-level nav item.
   - Recommendation: Use `/{orgId}/exports` as a top-level route (matching the nav item in the stitch mockup). If the sidebar nav item for "Exports" was not added in Phase 7, the planner should add a task to add it to NavItems.

2. **User display name join performance**
   - What we know: The `users` table exists with `id` and `full_name`. The join adds one extra query.
   - What's unclear: Whether `public.users` is accessible via the session client (RLS) for tenant admins — or whether it requires the admin client.
   - Recommendation: Test via session client first (tenant admin can presumably read other users in their tenant); fall back to admin client if RLS blocks it.

3. **Stat card scope: all-time vs. monthly**
   - What we know: The stitch mockup says "Total Monthly Exports" with "Files generated this billing cycle."
   - What's unclear: There is no billing cycle concept in the current schema. "Monthly" likely means current calendar month.
   - Recommendation: Default the stat cards to current month (add `start_date=first-of-month` query param on mount). Allow date filter to expand/contract the scope.

4. **"Format" column in the table**
   - What we know: The stitch mockup shows CSV and XLSX format badges. Currently, the system only supports CSV export.
   - What's unclear: The `activity_log.metadata` for `csv_exported` entries stores `{ listName, memberCount }` — no format field.
   - Recommendation: Always show "CSV" badge. Do not over-engineer a format field that doesn't exist in the current schema. If XLSX is added later, a migration can add `metadata.format`.

5. **Nav item for Exports in Sidebar**
   - What we know: Phase 7 built the NavItems with: Dashboard, Search, Lists, Personas, Activity, Analytics. The stitch mockup shows "Export Log" in the nav.
   - What's unclear: Whether Phase 12 should add the Exports nav item or whether it was intentionally deferred.
   - Recommendation: Phase 12 planner should add a task to add the Exports nav link to `src/components/layout/nav-items.ts` (or equivalent).

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (only `research`, `plan_check`, `verifier` flags). Skipping Validation Architecture section.

---

## Sources

### Primary (HIGH confidence)

- Codebase — `/src/app/api/export/csv/route.ts` — complete streaming CSV export, activity logging, `target_id = listId`
- Codebase — `/src/app/api/activity/route.ts` — pagination, filters including `action_type`, role enforcement
- Codebase — `/src/lib/activity-logger.ts` — `ActivityLogEntry` type, `csv_exported` action type confirmed
- Codebase — `/src/lib/csv-export.ts` — column definitions, `formatProspectRow` utility
- Codebase — `/src/types/database.ts` — `ActivityLog`, `ActivityActionType`, `ListMember`, `Prospect` types
- Codebase — `design-system/MASTER.md` — authoritative typography, color token, surface treatment rules
- Codebase — `stitch/crm_sync_team_export_log/code.html` — visual mockup reference
- Codebase — `src/app/globals.css` — all CSS variable token definitions for dark mode
- Codebase — `src/components/ui/table.tsx` — design-system-compliant table components
- Codebase — `src/components/ui/button.tsx` — ghost and gold button variants
- Codebase — `src/components/ui/card.tsx` — `surface-card` class on Card component
- Codebase — `src/components/ui/empty-state.tsx` — standard empty state pattern
- Codebase — `src/components/ui/breadcrumbs.tsx` — breadcrumb component with design system tokens
- Codebase — `src/app/[orgId]/layout.tsx` — tenant layout (Sidebar + TopBar + `page-enter` main)

### Secondary (MEDIUM confidence)

- Codebase — `src/components/activity/activity-log-viewer.tsx` — existing activity table pattern (client component with filters, pagination, API fetch)
- Codebase — `.planning/STATE.md` — confirmed Phase 7 complete, design system decisions from Phases 5–7

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, confirmed in package.json and source
- Architecture: HIGH — patterns directly observed in existing codebase (no novel patterns)
- Pitfalls: HIGH — identified from actual code reading (null safety, role check, missing join)
- Visual/design: HIGH — stitch mockup reviewed, design system MASTER.md read, CSS tokens verified in globals.css

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — design system and backend APIs are complete/frozen)
