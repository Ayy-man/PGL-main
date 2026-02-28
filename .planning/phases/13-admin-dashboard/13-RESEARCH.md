# Phase 13: Admin Dashboard — Research

**Researched:** 2026-03-01
**Domain:** Admin UI redesign — existing admin components + design system compliance
**Confidence:** HIGH

---

## Summary

Phase 13 is a redesign of the existing admin dashboard at `/admin`, not a ground-up build. The backend infrastructure (5 API routes), the admin layout shell (layout.tsx, AdminNavLinks, AdminMobileSidebar, TopBar), and 6 admin components (PlatformPulse, TenantHeatmap, EnrichmentHealthChart, FunnelChart, ErrorFeed, ComingSoonCard) are all fully built and functional. The work in Phase 13 is to apply design system compliance, integrate the `stitch/executive_strategy_dashboard_2` mockup's visual language, fix the `ComingSoonCard` API Quota placeholder into a real live quota widget, and refine the admin sidebar nav section headers ("Platform Control" / "System Config").

The stitch mockup (`executive_strategy_dashboard_2/code.html`) shows a "Global Command Center" with: 4-column top stat row (Platform Pulse, Enrichment Health CB, Unit Economics, Export Activity), a Tenant Management table, a 2-column bottom row (Live Error Feed, System Actions). The real app implementation already covers the first 3 sections. What is missing or incomplete: (1) the API Quota Burn stat card is a `ComingSoonCard` placeholder — the Redis `track-api-usage` data is being written (`api_usage:{provider}:{YYYY-MM-DD}`) but the `/api/admin/quota` route was deleted (appears in git status as `D src/app/api/admin/quota/route.ts`), so it needs rebuilding; (2) admin nav lacks "Platform Control" and "System Config" section headers that appear in the stitch; (3) the page's visual polish needs design system compliance passes (surface-admin-card, gold section headings, etc.).

**Primary recommendation:** Restore the `/api/admin/quota` route that reads from Upstash Redis (`api_usage:*` keys), replace the `ComingSoonCard` placeholder with a live `ApiQuotaCard` component, add nav section headers to AdminNavLinks matching the stitch, and run a full design system compliance pass on all admin components. No new dependencies needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 App Router | 15.x | Route handlers, server components | Project standard |
| React | 18.x | Client components (`"use client"`) | Project standard |
| Tailwind CSS | 3.x | CSS variable utility classes | Project standard |
| Recharts | Latest (already installed) | EnrichmentHealthChart, FunnelChart | Already in use in admin components |
| Lucide React | Latest | Icon library — only icon source per MASTER.md | MASTER.md mandates Lucide |
| Upstash Redis | @upstash/redis (already installed) | Read `api_usage:*` keys for quota card | Already used for caching/rate-limiting throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/supabase/admin` `createAdminClient()` | Project lib | Bypasses RLS for cross-tenant queries | All admin API routes (same pattern as existing routes) |
| `@/lib/cache/redis` | Project lib | Upstash Redis client | Quota data reads |
| `@/hooks/use-count-up` | Project hook | Animated number display in stat cards | Already used in PlatformPulse StatCard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts for charts | Visx, Chart.js | Recharts already installed and used; switching adds dependencies |
| Custom quota API | Third-party quota service | Redis-based tracking already implemented in `track-api-usage.ts` |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── admin/
│       ├── layout.tsx              EXISTS — admin layout, TopBar, AdminNavLinks wired
│       ├── admin-nav-links.tsx     EDIT — add section headers "Platform Control" / "System Config"
│       ├── page.tsx                EDIT — replace ComingSoonCard, add page compliance
│       └── (other admin pages)
├── components/
│   └── admin/
│       ├── platform-pulse.tsx      EDIT — design system compliance pass
│       ├── tenant-heatmap.tsx      EDIT — design system compliance pass
│       ├── enrichment-health-chart.tsx   EDIT — design system compliance pass
│       ├── funnel-chart.tsx        EDIT — design system compliance pass
│       ├── error-feed.tsx          EDIT — design system compliance pass
│       ├── coming-soon-card.tsx    EXISTS — keep for other future use
│       └── api-quota-card.tsx      CREATE — replaces ApiQuotaPlaceholder in PlatformPulse
├── app/api/admin/
│   └── quota/
│       └── route.ts                RESTORE — deleted in current git state, needs rebuilding
```

### Pattern 1: Admin API Route Auth Guard

All admin API routes use an inline super_admin check (not `requireSuperAdmin()`) — this is a locked project decision from Phase 04 to avoid `redirect()` 500 errors in Route Handler context.

```typescript
// Source: existing admin routes (src/app/api/admin/dashboard/route.ts)
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ... admin logic using createAdminClient()
}
```

### Pattern 2: Redis Quota Read

The `track-api-usage.ts` (the `2.ts` version, which is the complete implementation) writes keys with pattern `api_usage:{provider}:{YYYY-MM-DD}`. The quota route reads these with Upstash Redis MGET or multiple GETs. The `redis` client is at `@/lib/cache/redis`.

```typescript
// Key pattern from track-api-usage 2.ts
const key = `api_usage:${provider}:${today}`;
// Providers: "apollo" | "contactout" | "exa" | "edgar" | "claude"

// Quota API route reads last N days for each provider
// Use redis.mget([key1, key2, ...]) for batch reads
```

Note: The current `src/lib/enrichment/track-api-usage.ts` (non-`2.ts` version) is a stub that does nothing. The `2.ts` version has the real implementation. The Phase 13 quota API route should use the same `api_usage:{provider}:{date}` key pattern as the `2.ts` version.

### Pattern 3: Admin Component Surface Treatment

All admin cards use `surface-admin-card` CSS utility class (defined in `globals.css`). This is the admin-specific variant of `surface-card` — it uses the slightly brighter admin card tokens.

```typescript
// Correct surface treatment for admin components
<div className="surface-admin-card rounded-[14px] p-5">
  {/* content */}
</div>

// CSS variables in .dark scope:
// --admin-card-bg: linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))
// --admin-border: rgba(255,255,255,0.12)
// --admin-text-secondary: rgba(232,228,220,0.65)
```

### Pattern 4: Admin Nav Section Headers

The stitch mockup shows two section headers: "Platform Control" (above Dashboard, Tenants, Users, Analytics) and "System Config" (above deferred items). For Phase 13, "Platform Control" applies to the existing 4 nav items. "System Config" section can be omitted since no config routes exist yet — OR it can be added as a visual separator with no links (greyed out label only).

```typescript
// AdminNavLinks.tsx pattern — section headers as non-interactive labels
<div className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1 mt-4"
     style={{ color: "var(--text-ghost)" }}>
  Platform Control
</div>
{/* nav links follow */}
```

### Pattern 5: Stat Card Pattern with Gold Serif Value

All PlatformPulse stat cards follow this pattern from the design system (same as Analytics page stat cards):

```typescript
// Cormorant 36px value — gold if non-zero, muted-foreground if zero
<p className="font-serif font-bold leading-none"
   style={{
     fontSize: "36px",
     color: isNonZero ? "var(--gold-primary)" : "var(--text-secondary)"
   }}>
  {animated.toLocaleString()}
</p>
// Label: text-xs font-semibold uppercase tracking-wider, color: --admin-text-secondary
```

### Pattern 6: Section Headings with Gold Left Accent

The `admin-section-heading` CSS class adds a 3px gold left border accent before section h2 headings. Already used in `admin/page.tsx`:

```typescript
<h2 className="font-serif text-xl font-semibold mb-4 admin-section-heading">
  Tenant Activity
</h2>
// CSS: .admin-section-heading { position: relative; padding-left: 12px }
// CSS: .admin-section-heading::before { content:""; left:0; width:3px; bg:var(--gold-primary) }
```

### Anti-Patterns to Avoid

- **Using Tailwind color classes:** Never `bg-zinc-*`, `text-gray-*`, `border-white/5` directly — use CSS variables via `style={}` or `surface-admin-card` utility class.
- **Calling redirect() in Route Handlers:** Use inline role check returning JSON 403, not `requireSuperAdmin()` (which calls redirect() internally).
- **Blocking quota tracking:** The `trackApiUsage()` call is fire-and-forget (`.catch(() => {})`). The quota API read should also degrade gracefully — return zeros if Redis unavailable.
- **Emojis as icons:** All icons must be Lucide SVGs.
- **Scale transforms on hover:** MASTER.md anti-pattern. Use border/opacity transitions only.
- **Raw hex values in JSX:** Use CSS variables (`var(--gold-primary)`) not `#d4af37`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart components | Custom SVG bars | Recharts (already installed and used) | Already in EnrichmentHealthChart + FunnelChart |
| Animated numbers | Custom RAF loop | `useCountUp` hook (exists at `@/hooks/use-count-up`) | Already used in PlatformPulse |
| Mobile sidebar | Custom drawer overlay | `AdminMobileSidebar` (already built) | Sheet-based, fully functional |
| Loading skeletons | Custom shimmer CSS | `animate-pulse` pattern already established in all admin components | Consistent with existing skeleton pattern |

**Key insight:** All major UI primitives are already built. Phase 13 is refinement, not construction.

---

## What Already Exists vs. What Needs Work

### Already Built and Correct

| Component/Route | File | Status |
|---|---|---|
| Admin layout + shell | `src/app/admin/layout.tsx` | Complete — TopBar, AdminNavLinks, AdminMobileSidebar all wired |
| AdminNavLinks | `src/app/admin/admin-nav-links.tsx` | Works — needs section header labels added |
| AdminMobileSidebar | `src/app/admin/admin-mobile-sidebar.tsx` | Complete |
| PlatformPulse | `src/components/admin/platform-pulse.tsx` | Works — API Quota slot needs live widget |
| TenantHeatmap | `src/components/admin/tenant-heatmap.tsx` | Works — expandable rows, per-user breakdown |
| EnrichmentHealthChart | `src/components/admin/enrichment-health-chart.tsx` | Works — Recharts stacked bar |
| FunnelChart | `src/components/admin/funnel-chart.tsx` | Works — Recharts funnel with memoized cells |
| ErrorFeed | `src/components/admin/error-feed.tsx` | Works — expandable error rows, pagination |
| ComingSoonCard | `src/components/admin/coming-soon-card.tsx` | Works — reusable overlay wrapper |
| Dashboard API | `src/app/api/admin/dashboard/route.ts` | Complete |
| Enrichment Health API | `src/app/api/admin/enrichment/health/route.ts` | Complete |
| Errors API | `src/app/api/admin/errors/route.ts` | Complete |
| Funnel API | `src/app/api/admin/funnel/route.ts` | Complete |
| Tenant Activity API | `src/app/api/admin/tenants/activity/route.ts` | Complete |
| Admin CSS tokens | `src/app/globals.css` `.dark` block | Complete — `--admin-*` tokens, `surface-admin-card`, `admin-section-heading` |
| `useCountUp` hook | `src/hooks/use-count-up.ts` | Complete — ease-out cubic RAF animation |

### Needs Work in Phase 13

| Task | File | Change |
|---|---|---|
| Restore quota route | `src/app/api/admin/quota/route.ts` | Rebuild — reads `api_usage:*` from Redis for all 5 providers |
| API Quota live widget | `src/components/admin/api-quota-card.tsx` | Create — replace `ApiQuotaPlaceholder` with live progress bars |
| Replace ComingSoonCard in PlatformPulse | `src/components/admin/platform-pulse.tsx` | Remove `ComingSoonCard` wrapper, render `ApiQuotaCard` |
| Admin nav section headers | `src/app/admin/admin-nav-links.tsx` | Add "Platform Control" section label above existing items |
| Design system compliance pass | All 5 admin components | Audit and fix: CSS variable usage, `admin-section-heading`, surface classes |
| Admin page header | `src/app/admin/page.tsx` | Minor polish — ensure header typography matches design system spec |

---

## Common Pitfalls

### Pitfall 1: Deleted quota route

**What goes wrong:** `src/app/api/admin/quota/route.ts` appears as `D` (deleted) in git status. It no longer exists in the working tree.
**Why it happens:** The file was deleted as part of a previous cleanup or was never fully implemented.
**How to avoid:** Rebuild the route from scratch using the same auth guard pattern as other admin routes. Read from Upstash Redis using `api_usage:{provider}:{YYYY-MM-DD}` keys. Return daily totals per provider for the last N days (default 7).
**Warning signs:** 404 on `/api/admin/quota` fetch; `ApiQuotaCard` renders empty state despite real usage.

### Pitfall 2: track-api-usage stub vs. real implementation

**What goes wrong:** `src/lib/enrichment/track-api-usage.ts` is a stub that does nothing (exports an empty function). The real implementation is in `src/lib/enrichment/track-api-usage 2.ts`. If the enrichment pipeline is actually calling the stub, no quota data is being written to Redis.
**Why it happens:** The `2.ts` files appear to be duplicates from a migration phase — some have the real implementation.
**How to avoid:** The quota API route should gracefully handle empty Redis data (return zeros). Do not assume Redis has data until API keys are configured and enrichment is run. The quota card should show "No data yet" empty state when all providers return 0.
**Warning signs:** All quota bars at 0% even after running enrichments.

### Pitfall 3: Recharts color reconciliation bug

**What goes wrong:** FunnelChart Cell elements lose colors on re-render when `data` prop changes.
**Why it happens:** Recharts reconciles Cell children by reference. When the parent re-renders with new data, new Cell elements are created but Recharts may not re-apply fills.
**How to avoid:** Already solved in the existing FunnelChart — `useMemo` is applied to both `funnelData` and `cells` arrays separately. Do not remove these memos during compliance pass.
**Warning signs:** Funnel bars appear gray/unstyled after polling refresh.

### Pitfall 4: Admin nav section header indentation conflicts with active state

**What goes wrong:** Adding section header `<div>` elements between nav links disrupts the `flex flex-col gap-1` spacing or causes the gold active left-border to visually connect to the header label.
**Why it happens:** The nav container uses `gap-1` which applies to all children including the header label divs.
**How to avoid:** Use `mt-4 mb-1` on the header div to create visual separation. The `gap-1` will still apply but the margin override dominates. Test active state visually.
**Warning signs:** Section label visually merges with the active nav item's gold border.

### Pitfall 5: 60-second polling on page.tsx not compatible with navigation

**What goes wrong:** The admin `page.tsx` client component starts a `setInterval(fetchAll, 60_000)` on mount. If the user navigates away and back quickly, duplicate intervals can stack.
**Why it happens:** The `useEffect` cleanup for the interval depends on the component unmounting cleanly. In React 18 Strict Mode (development), effects run twice.
**How to avoid:** The existing cleanup is `return () => clearInterval(interval)` — this is correct. Don't modify the interval logic during compliance pass.

---

## Code Examples

### Quota API Route Pattern

```typescript
// src/app/api/admin/quota/route.ts
// Source: pattern from existing admin routes + track-api-usage 2.ts key pattern
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

const PROVIDERS = ["apollo", "contactout", "exa", "edgar", "claude"] as const;
const DEFAULT_DAYS = 7;

export async function GET(request: NextRequest) {
  // Guard: inline super_admin check (NOT requireSuperAdmin)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? String(DEFAULT_DAYS), 10);

  // Build date array
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Build all Redis keys: api_usage:{provider}:{date}
  const keys = PROVIDERS.flatMap((p) => dates.map((d) => `api_usage:${p}:${d}`));

  try {
    const values = await redis.mget<number[]>(...keys);
    // Aggregate by provider
    const totals: Record<string, number> = {};
    PROVIDERS.forEach((p, pi) => {
      totals[p] = dates.reduce((sum, _, di) => {
        const idx = pi * days + di;
        return sum + (values[idx] ?? 0);
      }, 0);
    });
    return NextResponse.json({ totals, days });
  } catch {
    // Redis unavailable — return zeros gracefully
    const totals = Object.fromEntries(PROVIDERS.map((p) => [p, 0]));
    return NextResponse.json({ totals, days });
  }
}
```

### ApiQuotaCard Component Pattern

```typescript
// src/components/admin/api-quota-card.tsx
"use client";
import { Activity } from "lucide-react";

interface ApiQuotaCardProps {
  data: { totals: Record<string, number> } | null;
}

const PROVIDERS = [
  { key: "apollo", label: "Apollo" },
  { key: "contactout", label: "ContactOut" },
  { key: "exa", label: "Exa" },
  { key: "edgar", label: "EDGAR" },
  { key: "claude", label: "Claude" },
];

export function ApiQuotaCard({ data }: ApiQuotaCardProps) {
  if (data === null) {
    // Skeleton state
    return (
      <div className="surface-admin-card rounded-[14px] p-5 animate-pulse">
        {/* skeleton bars */}
      </div>
    );
  }

  const maxValue = Math.max(...Object.values(data.totals), 1);

  return (
    <div className="surface-admin-card rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider"
           style={{ color: "var(--admin-text-secondary)" }}>
          API Quota Burn (7d)
        </p>
        <Activity className="h-4 w-4 shrink-0"
                  style={{ color: "var(--admin-text-secondary)", opacity: 0.7 }} />
      </div>
      <div className="space-y-2">
        {PROVIDERS.map(({ key, label }) => {
          const count = data.totals[key] ?? 0;
          const pct = Math.round((count / maxValue) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs w-20 shrink-0"
                    style={{ color: "var(--admin-text-secondary)" }}>
                {label}
              </span>
              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: "var(--gold-primary)" }}
                />
              </div>
              <span className="text-xs font-mono w-10 text-right shrink-0"
                    style={{ color: count > 0 ? "var(--gold-primary)" : "var(--text-secondary)" }}>
                {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Admin Nav Section Headers Pattern

```typescript
// src/app/admin/admin-nav-links.tsx
// Add before the ADMIN_NAV map:
<div className="px-3 mb-1 mt-2">
  <p className="text-[10px] font-semibold uppercase tracking-widest"
     style={{ color: "var(--text-ghost)" }}>
    Platform Control
  </p>
</div>
{/* nav links */}
```

---

## Design System Compliance Checklist

Critical items to verify during Phase 13 compliance pass:

- [ ] All stat card values: `font-serif` at 36px, gold if non-zero, `--text-secondary` if zero
- [ ] All labels: `text-xs font-semibold uppercase tracking-wider`, color `--admin-text-secondary`
- [ ] All card containers: `surface-admin-card` class (not raw Tailwind card classes)
- [ ] Section headings: `font-serif text-xl font-semibold mb-4 admin-section-heading`
- [ ] Table headers: `text-[11px] font-semibold uppercase tracking-wider`, color `--admin-text-secondary`
- [ ] Table row borders: `var(--admin-row-border)` not raw Tailwind `border-white/*`
- [ ] Table row hover: `admin-row-hover` class (CSS utility)
- [ ] Table thead: `admin-thead` class (CSS utility)
- [ ] Chart tooltips: `background: "var(--card)"`, `border: "1px solid var(--border)"`, `borderRadius: "8px"`
- [ ] Empty states: Use `<EmptyState>` component (MASTER.md §Admin Dashboard spec)
- [ ] No raw Tailwind color classes (`bg-white/5`, `text-white/40`) — use CSS variable equivalents
- [ ] Icons: All `h-4 w-4 shrink-0`, Lucide only
- [ ] No scale transforms on hover — border/opacity transitions only
- [ ] Page fade-in: `page-enter` class on top-level page div

### Note on "raw Tailwind vs. CSS variable" judgment call

The existing admin components use some raw Tailwind opacity classes (`bg-white/[0.06]`, `bg-white/[0.05]`). Per MASTER.md rule, these should be CSS variables. However, the design system tokens don't cover every granular opacity level. In practice: use defined tokens (`--admin-card-bg`, `--admin-border`, `--admin-row-hover`, etc.) where they exist; for skeleton shimmer backgrounds and very subtle overlays where no token exists, `bg-white/[0.06]` is acceptable. Prioritize fixing `text-white/40`, `text-white/50`, `text-white/70` to `--admin-text-secondary` or `--text-secondary-ds`.

---

## API Routes Summary

All admin API routes follow identical patterns:

| Route | File | Returns | Used By |
|-------|------|---------|---------|
| `GET /api/admin/dashboard` | `route.ts` | `{ totalProspects, enrichmentCoverage, enrichmentFailed, activeUsersToday, activeUsers7dAvg }` | PlatformPulse |
| `GET /api/admin/tenants/activity` | `tenants/activity/route.ts` | `{ tenants: [...] }` | TenantHeatmap |
| `GET /api/admin/enrichment/health?days=14` | `enrichment/health/route.ts` | `{ data: [...daily...], days }` | EnrichmentHealthChart |
| `GET /api/admin/funnel?days=7` | `funnel/route.ts` | `{ data: [...stages...], days }` | FunnelChart |
| `GET /api/admin/errors?limit=50&page=1` | `errors/route.ts` | `{ data: [...], total, page, limit }` | ErrorFeed |
| `GET /api/admin/quota?days=7` | `quota/route.ts` | **MISSING** — needs rebuild: `{ totals: { apollo, contactout, exa, edgar, claude }, days }` | ApiQuotaCard |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `requireSuperAdmin()` in Route Handlers | Inline role check in Route Handler | Phase 04 | Prevents redirect() 500 in Route Handler context |
| `enrichment_source_status` as plain string | JSONB object `{ status, error?, at? }` with backward compat | Phase 04 | Backward compat normalization required in error feed |
| In-memory GROUP BY aggregation | Supabase JS lacks native GROUP BY | Phases 03-04 | All analytics queries aggregate in Node.js, not SQL |
| `fire-and-forget` quota tracking | `.catch(() => {})` pattern | Phase 04 | Quota tracking must never block enrichment pipeline |

---

## Open Questions

1. **Quota per-day vs. cumulative display**
   - What we know: Redis stores `api_usage:{provider}:{YYYY-MM-DD}` per-day counters. The ApiQuotaPlaceholder shows a single bar per provider with no time dimension.
   - What's unclear: Should the quota card show 7-day cumulative totals (simpler) or a mini sparkline per provider (more informative)?
   - Recommendation: Start with 7-day cumulative totals + relative bar (simpler, matches mockup visual). Sparklines can be a Phase 14 enhancement.

2. **System Actions block from stitch mockup**
   - What we know: The stitch shows a "System Actions" 2x2 grid (Rotate Master Keys, Flush Cache, Broadcast Alert, Export System Logs).
   - What's unclear: Whether Phase 13 should build real system actions or placeholders.
   - Recommendation: Phase 13 scope matches existing functionality only. Build as UI-only ghost buttons with no backend wiring (same `ComingSoonCard` treatment or disabled state with tooltip). "Flush Cache (Global)" could wire to a real Redis FLUSHDB — but this is destructive and risky. Defer real wiring to a future phase.

3. **"System Config" nav section**
   - What we know: Stitch shows items: Global API Keys, Master Data Schema, Security Policies, Integrations.
   - What's unclear: None of these routes exist.
   - Recommendation: Add the "System Config" section label to AdminNavLinks but leave no links under it (or add placeholder items in `ComingSoonCard` style). Phase 13 should not add dead nav links.

4. **track-api-usage.ts stub vs. real implementation**
   - What we know: `src/lib/enrichment/track-api-usage.ts` is a stub. The `2.ts` version has the real implementation.
   - What's unclear: Whether the enrichment pipeline is actually calling the stub or the real version.
   - Recommendation: As part of Phase 13, check which file is actually imported in the enrichment pipeline (`claude.ts`, `contactout.ts`, etc.) and ensure the real `track-api-usage` implementation is what gets called. The quota card should gracefully show zeros until real data flows.

---

## Phase Requirements

<phase_requirements>
## Phase Requirements

Phase 13 goal maps to SA-01 through SA-05 (super admin panel) and ANLY-03 (super admin analytics dashboard). These are already complete in functional terms; Phase 13 is the UI redesign layer.

| ID | Description | Research Support |
|----|-------------|-----------------|
| SA-01 | PGL super admin panel lists all tenants with status | TenantHeatmap component + /api/admin/tenants/activity already serve this |
| SA-02 | Super admin can create new tenants | /admin/tenants/new exists — design system compliance applies |
| SA-03 | Super admin can create/invite users | /admin/users/new exists — design system compliance applies |
| SA-04 | Super admin can deactivate tenants or users | TenantStatusToggle + UserStatusToggle exist — compliance pass |
| SA-05 | Super admin panel isolated at /admin route group | Already enforced via requireSuperAdmin() in layout.tsx |
| ANLY-03 | Super admin dashboard shows cross-tenant metrics | /admin/analytics page exists — compliance pass needed |
</phase_requirements>

---

## Sources

### Primary (HIGH confidence)

- Direct codebase reading — `src/app/admin/page.tsx` — current admin page implementation
- Direct codebase reading — `src/app/admin/layout.tsx` — shell structure
- Direct codebase reading — `src/app/admin/admin-nav-links.tsx` — nav links
- Direct codebase reading — `src/components/admin/*.tsx` (6 components) — all admin UI widgets
- Direct codebase reading — `src/app/api/admin/*/route.ts` (5 routes) — all backend endpoints
- Direct codebase reading — `src/app/globals.css` — admin CSS tokens and utility classes
- `design-system/MASTER.md` — authoritative design token and component spec
- `design-system/pages/dashboard.md` — admin dashboard overrides spec
- `.planning/STATE.md` — accumulated decisions (Phase 04 decisions about inline auth, backward-compat JSONB, fire-and-forget quota, etc.)
- `stitch/executive_strategy_dashboard_2/code.html` — admin dashboard mockup (visual reference)
- `src/lib/enrichment/track-api-usage 2.ts` — real quota key pattern implementation
- Git status showing `D src/app/api/admin/quota/route.ts` — deleted route that needs restoration

### Secondary (MEDIUM confidence)

- `stitch/executive_strategy_dashboard_1/code.html` — alternate admin dashboard mockup
- `stitch/heatmap_of_outreach_campaign_orchestrator/screen.png` — heatmap visual reference
- `.planning/phases/07-layout-shell-navigation/07-RESEARCH.md` — Phase 7 decisions about admin layout (TopBar, mobile sidebar, nav patterns)

### Tertiary (LOW confidence)

- None — all findings grounded in direct codebase and official project documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries in use, verified in source files
- Architecture: HIGH — derived from reading existing component implementations
- Pitfalls: HIGH — identified from existing code patterns and STATE.md decisions
- Quota route: HIGH — Redis key pattern confirmed in `track-api-usage 2.ts`

**Research date:** 2026-03-01
**Valid until:** Stable — no fast-moving external dependencies; valid until design system MASTER.md changes
