# Phase 11: Dashboard (Screen A) — Research

**Researched:** 2026-03-01
**Domain:** Next.js 15 Server Components, Supabase data fetching, Recharts, CSS variable-based design system, activity feed rendering
**Confidence:** HIGH

---

## Summary

Phase 11 rebuilds the tenant home page (`/[orgId]/page.tsx`) to match Screen A: "Executive Strategy Dashboard." The current implementation is a minimal placeholder — a greeting heading, a single Search hero card, and three navigation pills. The redesign transforms this into a data-rich home screen with stat pills, a new-prospects alert banner, persona pills, recent exports table, and a live activity feed. All business logic (API routes, DB queries, enrichment) is already built and stable; this phase is UI-only.

The stitch mockup (`executive_strategy_dashboard_1`) provides UX direction: three large stat cards (Total Exports, Downloads Ready, Enrichment Rate), a recent-exports table with download actions, a "Target Personas" persona pill grid, and a "Live Feed" sidebar column showing team activity. The design-system spec (`dashboard.md`) overrides this slightly: the greeting uses Cormorant 38px/weight 600; the body does NOT use full stat cards — it uses a single horizontal row of **muted stat pills** above persona cards (no full stat card grid). This is the canonical source of truth and takes precedence over the stitch mockup's full-card treatment.

The live activity feed is the most technically nuanced section: the existing `/api/activity` endpoint is role-gated to `tenant_admin` and `super_admin` only, which means the feed must conditionally render based on role, or a read-only summary endpoint must be created. The analytics totals (`/api/analytics`) are also admin-only. The planner must decide whether to expose lightweight "summary" data to all roles or limit dashboard richness to admins. Per the existing patterns in the codebase, the dashboard page is a Server Component with `getUser()` — role-based conditional rendering is the correct approach.

**Primary recommendation:** Replace `/[orgId]/page.tsx` with a Server Component that fetches personas + recent activity + analytics totals in parallel, renders stat pills conditionally (admin only), a persona pill grid (all roles), a recent-exports stub (links to Export Log page), and a live activity feed (admin only). No new dependencies needed — Recharts is already installed but is not required here.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 App Router | 15.x | Server Component data fetching, route file at `/[orgId]/page.tsx` | Project standard |
| React 18 | 18.x | Server + Client component boundary | Project standard |
| Tailwind CSS | 3.x | Utility classes via CSS variables only | MASTER.md enforces this — raw color classes are forbidden |
| Lucide React | Latest | All icons — the only icon source per MASTER.md | MASTER.md mandate |
| `@supabase/ssr` + `@/lib/supabase/server` | Project lib | Session-authenticated Supabase client in Server Components | Established project pattern: `getUser()` not `getSession()` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `recharts` | ^3.7.0 | Charting (already installed) | Not needed for this phase — no charts on dashboard home |
| `nuqs` | ^2.8.8 | URL search params state | Not needed here — dashboard has no filter state |
| `@/lib/personas/queries` | Project lib | `getPersonas(tenantId)` — fetch persona pills | Server Component query for persona pill row |
| `@/lib/lists/queries` | Project lib | `getLists(tenantId)` — fetch recent lists for export stub | Server Component query for recent lists preview |
| `/api/activity` | Internal API | Activity log data — role-gated | Client fetch inside a `"use client"` ActivityFeed component, or direct Supabase query in Server Component |
| `/api/analytics` | Internal API | Stat totals — admin-gated | Fetch in Server Component with admin role guard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Component direct Supabase fetch | Client fetch via `/api/activity` | Server Component is simpler for initial load; avoids client-side loading states for above-the-fold content. Activity feed (requires polling or refresh) may benefit from `"use client"` wrapper |
| Recharts for trend mini-sparklines | CSS-only stat pills | design-system/pages/dashboard.md explicitly says "stat pills, not full stat cards" — no chart libraries needed for this screen |
| Real-time Supabase subscription | Polling-based refresh | Real-time is out of scope (decision logged in REQUIREMENTS.md: "Real-time chat — High complexity, not core"). Activity feed is rendered at load time, no subscription needed |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended File Structure

```
src/app/[orgId]/
├── page.tsx                          ← REPLACE: main dashboard Server Component
├── dashboard/
│   ├── analytics/page.tsx            ← EXISTING: no change
│   └── activity/page.tsx             ← EXISTING: no change
src/components/dashboard/             ← CREATE: dashboard-specific components
├── stat-pills.tsx                    ← Horizontal row of muted stat pills
├── persona-pill-row.tsx              ← Scrollable persona pill grid with search CTA
├── recent-lists-preview.tsx          ← Table of recent lists (max 5 rows)
└── activity-feed.tsx                 ← "use client" live feed panel
```

**Alternative:** All components can be colocated in `src/app/[orgId]/components/` if the team prefers page-local components. Either works — project already uses both patterns.

### Pattern 1: Parallel Server-Side Data Fetch

The dashboard page needs three independent data sources. Use `Promise.all` to fetch them in parallel in the Server Component.

```typescript
// src/app/[orgId]/page.tsx (Server Component pattern)
import { createClient } from "@/lib/supabase/server";
import { getPersonas } from "@/lib/personas/queries";
import { getLists } from "@/lib/lists/queries";
import { redirect } from "next/navigation";

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = user.app_metadata?.tenant_id as string;
  const role = user.app_metadata?.role as string;
  const isAdmin = role === "tenant_admin" || role === "super_admin";

  // Parallel fetch — all independent
  const [personas, lists] = await Promise.all([
    getPersonas(tenantId).catch(() => []),
    getLists(tenantId).catch(() => []),
  ]);

  // Analytics totals only for admins — avoid 403 from API
  // Query directly instead of calling /api/analytics (avoids extra HTTP hop)
  // ...
}
```

**Key constraint from STATE.md decisions:**
- Tenant ID always from `user.app_metadata.tenant_id` — never from URL params
- `getUser()` not `getSession()` for JWT validation
- `createAdminClient()` only when bypassing RLS (not needed here — RLS scopes to tenant automatically)

### Pattern 2: Role-Gated Sections

The activity API (`/api/activity`) and analytics API (`/api/analytics`) are both gated to `tenant_admin` / `super_admin`. The dashboard should conditionally render admin-only sections rather than showing empty/error states.

```typescript
// Conditional render in Server Component
{isAdmin && <ActivityFeed tenantId={tenantId} />}
{isAdmin && <StatPills totals={analyticsTotals} />}
// Persona pills visible to ALL roles
<PersonaPillRow personas={personas} orgId={orgId} />
```

This avoids the "unauthorized" flash that happens if a `agent` or `assistant` role user triggers the admin APIs client-side.

### Pattern 3: Client Component for Activity Feed

The activity feed shows recent team events and benefits from a refresh mechanism. Wrap it in a `"use client"` component that fetches `/api/activity?limit=10` on mount.

```typescript
// src/components/dashboard/activity-feed.tsx
"use client";

import { useEffect, useState } from "react";
// ...

export function ActivityFeed() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity?limit=10&page=1")
      .then(r => r.json())
      .then(json => setEntries(json.data || []))
      .finally(() => setLoading(false));
  }, []);

  // ...
}
```

**Per design-system decision [Phase 05-03]:** onMouseEnter/Leave handlers for CSS variable hover states — Tailwind `hover:` cannot reference CSS custom property values at runtime.

### Pattern 4: Persona Pills with Search CTA

Per `design-system/pages/dashboard.md`: "persona cards are the primary content" and should link to search with that persona pre-selected. The existing `NavItems` already navigate to `/${orgId}/search`. Persona pills should navigate to `/${orgId}/search?persona=<id>` (nuqs-compatible URL parameter).

```typescript
// Persona pill — links to search pre-filtered
<Link
  href={`/${orgId}/search?persona=${persona.id}`}
  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
  style={{
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
  }}
  onMouseEnter={...}
  onMouseLeave={...}
>
  {persona.name}
</Link>
```

### Anti-Patterns to Avoid

- **Full stat card grid for all roles:** `dashboard.md` says "muted stat pills, not stat cards" for the dashboard home. Full stat cards live on the analytics page. Do not replicate MetricsCards here.
- **Recharts on the dashboard home:** dashboard.md prescribes no charts on the home page — only the analytics sub-route gets charts.
- **Raw Tailwind color classes:** Use CSS variables only. `zinc-*`, `gray-*`, `yellow-*` are forbidden per MASTER.md.
- **Scale transforms on hover:** MASTER.md anti-pattern. Use `border/opacity transitions only`.
- **Emojis as icons:** Use Lucide SVGs only.
- **Client-side analytics fetch for agent/assistant roles:** This will return 403 and produce console errors. Gate client components behind role checks passed as props from the Server Component.
- **Inline hex/rgba in JSX:** Must be in `style={{ color: "var(--gold-primary)" }}` pattern or Tailwind utility classes backed by CSS variables.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Activity time formatting | Custom date formatter | `relativeTime()` function in `activity-log-viewer.tsx` — extract/reuse | Already handles all edge cases: "Just now", "Xm ago", "Xh ago", "Xd ago" |
| Persona card layout | Custom card from scratch | Existing `card-interactive` CSS utility + design system surface pattern | Already tested, consistent with all other card surfaces |
| Stat number display | Custom formatter | `value.toLocaleString()` — already used in MetricsCards | Handles thousands separators correctly for all locales |
| Empty state | Custom empty layout | `<EmptyState>` component (`src/components/ui/empty-state.tsx`) | Compliant: 64px gold circle, Cormorant heading, surface-card, all per MASTER.md |

**Key insight:** Most display primitives already exist. This phase is composition, not invention.

---

## Common Pitfalls

### Pitfall 1: Analytics API Returns HTML on Missing Data

**What goes wrong:** `/api/analytics` returns an HTML error page (not JSON) when there is no data. Calling `res.json()` directly throws a parse error and crashes the component.

**Why it happens:** Next.js error boundaries return HTML; the analytics route has a code path that triggers this.

**How to avoid:** Use the text-then-parse guard from `dashboard.md`:
```ts
const text = await res.text();
try { return JSON.parse(text); } catch { return null; }
```
This is documented as a **Known Bug** in `design-system/pages/dashboard.md`.

**Warning signs:** "Unexpected token '<'" in console — HTML was returned instead of JSON.

### Pitfall 2: Tenant ID from URL Params (Security Bug)

**What goes wrong:** Reading `tenantId` from `params.orgId` instead of `user.app_metadata.tenant_id`.

**Why it happens:** The URL contains the orgId slug/UUID which looks like the tenant ID.

**How to avoid:** Always source `tenantId` from `user.app_metadata.tenant_id`. This is a locked decision from Phase 2 (STATE.md). The `orgId` URL param is the slug used for routing, not necessarily the UUID used for DB queries.

**Warning signs:** Cross-tenant data leakage, or queries that return no results because slug != UUID.

### Pitfall 3: CSS Variable Hover States

**What goes wrong:** Using `hover:border-[var(--border-hover)]` in Tailwind classes — these do not work at runtime because Tailwind cannot reference CSS custom property values dynamically.

**Why it happens:** Tailwind processes classes at build time; CSS variables resolve at runtime.

**How to avoid:** Use `onMouseEnter` / `onMouseLeave` handlers to set `element.style.border` or `element.style.background` directly. This is the established project pattern (STATE.md decision from Phase 05-03: "onMouseEnter/Leave handlers for CSS variable hover states").

### Pitfall 4: Activity Feed Access Control

**What goes wrong:** Rendering the `<ActivityFeed>` component for all roles causes a `403 Forbidden` error from `/api/activity` when the user is `agent` or `assistant`.

**Why it happens:** The activity API is explicitly gated to admins only (see `src/app/api/activity/route.ts` lines 37–44).

**How to avoid:** Pass `isAdmin` as a prop from the Server Component and conditionally render the feed. OR render it inside a suspense boundary with graceful empty state fallback.

### Pitfall 5: bg-card-gradient Token Collision

**What goes wrong:** Using `--bg-card` CSS variable for card backgrounds collides with shadcn's own `--bg-card` token, resulting in unexpected white/light backgrounds in dark mode.

**Why it happens:** shadcn uses `--card` (not `--bg-card`) but the project defined `--bg-card-gradient` (renamed to avoid collision — see STATE.md Phase 05 decision).

**How to avoid:** Always use `var(--bg-card-gradient)` for card/surface backgrounds, not `var(--bg-card)`. Use the `.surface-card` CSS utility class or `card-interactive` for interactive cards. Both are defined in `globals.css`.

### Pitfall 6: Cormorant Font Class

**What goes wrong:** Using `font-cormorant` class instead of `font-serif` for headings.

**Why it happens:** Developers assume the class name matches the font name.

**How to avoid:** Always use `font-serif` (not `font-cormorant`). The latter bypasses the CSS variable system. Decision locked in STATE.md: "[Phase 05]: font-serif class (not font-cormorant) used on CardTitle and EmptyState heading for Cormorant Garamond rendering."

---

## Code Examples

Verified patterns from existing codebase:

### Greeting Header (from existing `/[orgId]/page.tsx`)

```typescript
// Correct greeting pattern — already in codebase, keep and enhance
const firstName =
  user.user_metadata?.first_name || user.email?.split("@")[0] || "there";
const hour = new Date().getHours();
const greeting =
  hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
const today = new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric",
});

// Render with dashboard.md override: Cormorant 38px weight 600
<h1
  className="font-serif font-semibold"
  style={{ fontSize: "38px", letterSpacing: "-0.5px" }}
>
  {greeting}, {firstName}
</h1>
<p className="mt-1 text-sm text-muted-foreground">{today}</p>
```

### Stat Pills (muted row, not stat cards)

```typescript
// Per dashboard.md: "single horizontal row of muted stat pills"
<div className="flex flex-wrap gap-2">
  {[
    { label: "Searches", value: totals.searchesExecuted },
    { label: "Profiles Viewed", value: totals.profilesViewed },
    { label: "Exports", value: totals.csvExports },
  ].map(({ label, value }) => (
    <div
      key={label}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
    >
      <span className="font-mono" style={{ color: "var(--gold-primary)" }}>
        {value.toLocaleString()}
      </span>
      <span>{label}</span>
    </div>
  ))}
</div>
```

### Card Interactive Surface (from globals.css)

```typescript
// card-interactive: bg-card-gradient + subtle border + gold hover
<div className="card-interactive rounded-[14px] p-6 cursor-pointer">
  {/* content */}
</div>
```

### Activity Feed Entry (adapted from ActivityLogViewer)

```typescript
// ACTION_LABELS already defined in activity-log-viewer.tsx
const ACTION_LABELS: Record<string, string> = {
  login: "Logged In",
  search_executed: "Executed Search",
  profile_viewed: "Viewed Profile",
  // ... 11 total action types
};

// relativeTime helper already exists in activity-log-viewer.tsx — extract to shared util or copy
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
```

### New Prospects Alert Banner (from stitch mockup pattern)

```typescript
// Gold gradient banner — from executive_strategy_dashboard_1 stitch
// Adapt to design system CSS variables
{newProspectsCount > 0 && (
  <div
    className="flex items-center gap-3 rounded-[14px] px-5 py-3"
    style={{
      background: "var(--gold-bg-strong)",
      border: "1px solid var(--border-gold)",
    }}
  >
    <Sparkles className="h-4 w-4 shrink-0" style={{ color: "var(--gold-primary)" }} />
    <p className="text-sm font-medium" style={{ color: "var(--gold-primary)" }}>
      {newProspectsCount} new prospects found in the last 24h
    </p>
    <Link href={`/${orgId}/search`} className="ml-auto text-xs underline" style={{ color: "var(--gold-text)" }}>
      View
    </Link>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Inline `rgba()` values in className | CSS variables only (`var(--gold-primary)`) | Phase 05 | All color tokens now centrally controlled |
| `font-cormorant` class | `font-serif` class | Phase 05 | Consistent variable-based font loading |
| Raw `bg-card` shadcn token | `var(--bg-card-gradient)` renamed token | Phase 05 | Avoids shadcn collision |
| `getSession()` for auth | `getUser()` for auth | Phase 01 | Security: validates JWT server-side |
| Sidebar-rendered ambient glows | Root layout renders ambient glows (sole owner) | Phase 07 | Prevents duplication across layouts |
| Inline header in tenant layout | `<TopBar>` component wired in | Phase 07 | Consistent header across all tenant pages |

**Deprecated/outdated:**
- `bg-card` (shadcn token): Named `--bg-card-gradient` in this project to avoid collision — use that token
- `font-cormorant`: Use `font-serif` exclusively
- Playfair Display: Replaced by Cormorant Garamond in v2.0 redesign (`font-serif` maps to Cormorant)

---

## Open Questions

1. **New prospects alert count source**
   - What we know: The stitch mockup shows "128 high-net-worth individuals identified in the last 24h." There is no dedicated "new prospects" counter in the DB schema.
   - What's unclear: Should this count prospects added to any list in the last 24h? Or prospects whose `created_at` is within 24h?
   - Recommendation: Query `prospects` table for `created_at >= now() - interval '24h'` scoped to `tenant_id`. If count = 0, hide the banner. Keep it simple — this is decorative UX, not a core metric.

2. **Stat pills access control**
   - What we know: `/api/analytics` is gated to `tenant_admin` / `super_admin`. Agent and assistant roles cannot see stats.
   - What's unclear: Should agents see ANY stat pills? The stitch shows stats prominently.
   - Recommendation: Show stat pills only to `tenant_admin` and `super_admin`. Agents see only the persona pill row and the search hero. This matches the existing analytics page access control pattern.

3. **Recent exports panel**
   - What we know: The stitch shows a recent exports table prominently. There is no "export log" table in the DB — exports are tracked in `activity_log` with `action_type = 'csv_exported'`.
   - What's unclear: Should the dashboard show a mini export log, or just a link to the Export Log page?
   - Recommendation: Show the 3 most recent `csv_exported` entries from `/api/activity?action_type=csv_exported&limit=3` as a simple list. Add a "View All" link to the future Export Log page (Phase 12). If admin-only, gate behind `isAdmin`.

4. **Persona pills — how many to show**
   - What we know: The 5 starter personas are always present. Custom personas can grow.
   - What's unclear: Show all personas or limit to first N?
   - Recommendation: Show first 8, with a "+ N more" pill that links to the Personas page. Matches the stitch's "4 persona grid" approach but accounts for the real data model.

5. **Activity feed — poll interval**
   - What we know: No real-time subscriptions (out of scope per requirements).
   - What's unclear: Should the feed auto-refresh or be static at page load?
   - Recommendation: Static at page load. Add a manual "Refresh" button (Ghost variant, small) in the feed header. This matches the product's "understated luxury" design direction — no aggressive polling.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (config only has `mode`, `depth`, `parallelization`, `commit_docs`, `model_profile`, `workflow.research`, `workflow.plan_check`, `workflow.verifier`). Nyquist validation flag is not set — skipping this section.

---

## Sources

### Primary (HIGH confidence)

- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/app/[orgId]/page.tsx` — existing dashboard: greeting logic, search hero pattern
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/app/[orgId]/dashboard/analytics/page.tsx` — analytics page: date range toggle, MetricsCards usage, text-then-parse guard pattern
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/app/api/activity/route.ts` — activity API: access control, query params, response shape
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/app/api/analytics/route.ts` — analytics API: role gate, response shape, totals structure
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/components/activity/activity-log-viewer.tsx` — `relativeTime()`, `ACTION_LABELS`, fetch pattern
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/components/charts/metrics-cards.tsx` — stat display: Cormorant 36px values, gold/muted color logic
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/design-system/MASTER.md` — canonical design rules: colors, typography, surfaces, components
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/design-system/pages/dashboard.md` — dashboard overrides: greeting font, "stat pills not stat cards" rule, known HTML-parse bug
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/.planning/STATE.md` — project decisions: tenant ID source, CSS variable hover pattern, font class rule, bg-card-gradient naming, ambient glow ownership
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/app/globals.css` — CSS utilities: `.surface-card`, `.card-interactive`, `.page-enter`, `--bg-card-gradient`
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/app/[orgId]/layout.tsx` — tenant layout: confirmed TopBar + Sidebar already wired (Phase 07 complete)
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/stitch/executive_strategy_dashboard_1/code.html` — UX direction: layout sections, stat cards, recent exports table, live feed, persona pills structure

### Secondary (MEDIUM confidence)

- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/lib/personas/queries.ts` — `getPersonas()` signature: confirmed takes `tenantId`, returns `Persona[]`
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/src/lib/lists/queries.ts` — `getLists()` signature: confirmed takes `tenantId`, returns `List[]` ordered by `updated_at desc`
- `/Users/aymanbaig/Desktop/Manual Library/Phronesis-main/.planning/phases/06-ui-redesign-foundation/06-SUMMARY.md` — Phase 06 deliverables: confirms TopBar, Breadcrumbs, WealthTierBadge, EnrichmentStatusDots, ProspectCard all built and verified

### Tertiary (LOW confidence)

- None — all claims verified from source files in the codebase.

---

## Phase Requirements

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLY-01 | `usage_metrics_daily` table aggregates daily stats per user | Analytics API at `/api/analytics` already aggregates this; Server Component can fetch totals directly via Supabase `usage_metrics_daily` query |
| ANLY-02 | Tenant admin dashboard shows team usage metrics | Stat pills section (admin-only): fetch `/api/analytics?range=7d`, display as muted pill row above personas |
| ANLY-04 | Metrics include: logins, searches, profiles viewed, profiles enriched, CSV exports, lists created | `analytics route` response shape confirmed: `totals.searchesExecuted`, `totals.profilesViewed`, `totals.csvExports`, `totals.listsCreated` |
| ANLY-05 | Dashboard shows date range filter (7d, 30d, 90d) | For the home dashboard, only show 7d totals (no filter toggle — that lives on the analytics sub-page) |
| ANLY-06 | Analytics API at `/api/analytics` returns aggregated metrics | Confirmed working; use text-then-parse guard against HTML response bug |
| ACT-01 | System logs 11 action types | Activity feed reads `activity_log`; `ACTION_LABELS` map all 11 types — reuse from `activity-log-viewer.tsx` |
| ACT-02 | Activity log entries include user, action type, target, timestamp, metadata | `ActivityEntry` type confirmed: `user_id`, `action_type`, `target_type`, `target_id`, `created_at` |
| ACT-03 | Activity log viewable by tenant admin | Feed section is conditionally rendered behind `isAdmin` check; non-admins do not see or query the activity feed |
| ACT-05 | Activity log API at `/api/activity` supports querying with filters | Use `?limit=10&page=1` for dashboard preview feed; "View All" links to `/[orgId]/dashboard/activity` |
| UI-01 | Dark theme (#0a0a0a base) with gold accents meeting WCAG AA | Enforced via CSS variable system; `--bg-root: #08080a` in globals.css; gold text uses `--gold-text: rgba(212,175,55,0.7)` which passes AA |
| UI-02 | Cormorant Garamond for headings, DM Sans for body text | `font-serif` = Cormorant (greeting heading); `font-sans` = DM Sans (body, labels, pills) — fonts loaded in root layout |
| UI-03 | Responsive layout | Dashboard uses `flex-wrap` pill rows and `grid` persona layout with responsive col counts |
| UI-05 | Loading states and skeleton screens for async data | Activity feed (client component) shows skeleton while loading; stat pills can show `---` placeholder server-side |
| UI-06 | Error boundaries with user-friendly error messages | Use `<EmptyState>` component for feed failure; text-then-parse guard for analytics API |
</phase_requirements>

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from `package.json` and existing source files
- Architecture: HIGH — patterns directly derived from working Phase 07 code and existing page implementations
- Pitfalls: HIGH — all documented from actual source code bugs (dashboard.md Known Bug, STATE.md Phase 05 decisions) not hypothetical
- Phase requirements: HIGH — confirmed from REQUIREMENTS.md + working API implementations

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — no fast-moving dependencies; Next.js 15 and Recharts 3.x are both stable releases)
