# Phase 20: Platform Pulse Detail Modal - Research

**Researched:** 2026-03-12
**Domain:** Admin dashboard modal overlay, SVG charting, Supabase aggregation queries
**Confidence:** HIGH

## Summary

Phase 20 adds a click-to-expand detail modal to the existing PlatformPulse card on the admin Command Center. The modal surfaces larger interactive charts (14-day Active Users + Prospects Scraped), an enrichment source success rate breakdown table, and a top-5-tenants-by-activity ranking. All data comes from extending the existing `/api/admin/dashboard` endpoint with two new parallel queries -- no new API routes needed.

The codebase already has a mature Radix Dialog system (`@radix-ui/react-dialog ^1.1.15` + `tailwindcss-animate ^1.0.7`) with fade+zoom animations, backdrop blur, Escape/overlay close, and design-system-compliant styling. The PlatformPulse component already builds SVG sparklines with cubic bezier paths and gradient fills, so the larger modal charts are a direct scale-up of existing patterns. The enrichment source status JSONB column (`enrichment_source_status`) on the prospects table stores per-source status objects (`{status, error?, at}`) for keys `contactout`, `exa`, `sec`, `claude` -- the health endpoint already aggregates these into success/failed counts per day.

**Primary recommendation:** Reuse the existing Radix Dialog + tailwindcss-animate system for the modal shell. Extend `/api/admin/dashboard` with `sourceStats` and `topTenants` fields via parallel Supabase queries. Build the modal's interactive SVG charts by scaling up the existing Sparkline component with hover state management, average reference lines, and day-label x-axis.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | ^1.1.15 | Modal overlay primitive | Already used for Dialog + Sheet components; handles focus trap, Escape, portal, overlay click |
| tailwindcss-animate | ^1.0.7 | Enter/exit animations | Already configured; provides `animate-in`, `animate-out`, `fade-in-0`, `zoom-in-95` classes |
| React + SVG | 18.x | Interactive charts | Phase spec: pure React + SVG, no charting library |
| Supabase JS | existing | Data aggregation queries | Already used by all admin API routes with `createAdminClient()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons (X close, Activity) | Already imported in platform-pulse.tsx |
| class-variance-authority | existing | Conditional class composition | Already used in sheet.tsx for variant-based styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Dialog | Custom portal + div | Loses focus trap, scroll lock, a11y; no reason when Radix is already installed |
| SVG charts | recharts/vitest | Phase spec explicitly says "no charting library"; SVG pattern already exists |
| CSS transitions | framer-motion | Overkill; tailwindcss-animate already handles fade+scale |

**Installation:**
```bash
# No new dependencies needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    admin/
      platform-pulse.tsx          # Existing card (add onClick + state)
      platform-pulse-modal.tsx    # NEW: modal component
  app/
    api/
      admin/
        dashboard/
          route.ts                # EXTEND: add sourceStats + topTenants
    admin/
      page.tsx                    # Wire modal open state
```

### Pattern 1: Radix Dialog Modal with Design System Styling
**What:** Reuse the existing Dialog component from `src/components/ui/dialog.tsx` which already provides fade+zoom animations, backdrop blur, X close button, and design-system styling.
**When to use:** This is the only modal pattern in the codebase.
**Example (existing pattern from dialog.tsx):**
```typescript
// DialogContent already applies:
// - fade-in-0 / fade-out-0 (opacity)
// - zoom-in-95 / zoom-out-95 (scale)
// - duration-200
// - backdrop: bg-black/80 backdrop-blur-sm
// - style={{ background: "var(--bg-card-gradient)", border: "1px solid var(--border-default)" }}
// - rounded-[14px]

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Platform Pulse</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Pattern 2: Admin Card Surface Styling
**What:** All admin dashboard cards use `surface-admin-card rounded-[14px] p-6` with the `--admin-card-bg` / `--admin-border` CSS variables.
**When to use:** Every card and section within the modal.
**Key classes from globals.css:**
```css
.surface-admin-card {
  background: var(--admin-card-bg);      /* = var(--bg-card-gradient) */
  border: 1px solid var(--admin-border); /* = var(--border-default) = rgba(255,255,255,0.10) */
  border-radius: 14px;
  box-shadow: var(--admin-shadow);       /* = var(--card-shadow) */
}
```

### Pattern 3: SVG Chart with Hover Tooltip (scale-up of existing Sparkline)
**What:** The existing `Sparkline` in platform-pulse.tsx builds cubic bezier SVG paths with gradient fills. The modal charts scale this up with: larger dimensions, day-label x-axis, average dashed reference line, and hover state via invisible rect hitboxes.
**When to use:** For the two large charts (Active Users, Prospects Scraped).
**Example (hover tooltip pattern):**
```typescript
// Add invisible rect columns for hover detection
// On mouseEnter of rect[i], set activeIndex = i
// Show a tooltip div positioned via the SVG point coordinates
// Average line: <line> with strokeDasharray="4,4"
{points.map((point, i) => (
  <rect
    key={i}
    x={point.x - stepWidth / 2}
    y={0}
    width={stepWidth}
    height={chartHeight}
    fill="transparent"
    onMouseEnter={() => setActiveIndex(i)}
    onMouseLeave={() => setActiveIndex(null)}
  />
))}
```

### Pattern 4: Parallel Supabase Queries in API Route
**What:** The existing dashboard route already runs 7 queries in parallel via `Promise.all()`. Extend by adding 2 more queries (source stats + top tenants) to the same parallel batch.
**When to use:** Extending `/api/admin/dashboard` response.
**Example (existing pattern from dashboard/route.ts):**
```typescript
const [totalRes, coverageRes, failedRes, /* ...existing... */, sourceStatsRes, topTenantsRes] =
  await Promise.all([
    /* ...existing 7 queries... */
    // NEW: Source stats
    admin.from("prospects")
      .select("enrichment_source_status")
      .not("enrichment_source_status", "is", null)
      .gte("updated_at", fourteenDaysAgo),
    // NEW: Top tenants by activity
    admin.from("activity_log")
      .select("tenant_id")
      .gte("created_at", fourteenDaysAgo),
  ]);
```

### Pattern 5: Typography and Spacing Conventions
**What:** The admin dashboard uses a consistent type hierarchy.
**Key patterns from existing components:**
```
- Section headers: text-[10px] font-semibold uppercase tracking-widest, color: var(--admin-text-secondary)
- Metric values: font-mono text-lg, color: var(--text-primary-ds) or var(--gold-primary)
- Labels: text-xs, color: var(--admin-text-secondary)
- Card titles: font-serif text-base font-semibold, color: var(--text-primary-ds)
- Fonts: Cormorant Garamond (serif, headings), DM Sans (sans, body), JetBrains Mono (mono, numbers)
```

### Anti-Patterns to Avoid
- **Do NOT create a new API endpoint:** Phase spec says "no new endpoints" -- extend the existing dashboard route.
- **Do NOT use a charting library:** Phase spec says "pure React + SVG + CSS transitions."
- **Do NOT use inline colors outside the design system:** Always use CSS variables (`var(--gold-primary)`, `var(--text-primary-ds)`, etc.).
- **Do NOT add new npm dependencies:** Phase spec says "no new dependencies."
- **Do NOT forget prefers-reduced-motion:** globals.css has `@media (prefers-reduced-motion: reduce)` that zeros out animations; the Radix Dialog already respects this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap + scroll lock | Custom portal + key listeners | `@radix-ui/react-dialog` via `src/components/ui/dialog.tsx` | Focus trap, scroll lock, a11y announcements, Escape handling all built-in |
| Enter/exit animations | Custom CSS keyframes | `tailwindcss-animate` classes (`animate-in`, `fade-in-0`, `zoom-in-95`) | Already configured in dialog.tsx, consistent with all other modals |
| SVG path generation | External SVG library | Copy and extend existing `Sparkline` component's cubic bezier logic | Already proven, no bundle cost, consistent visual style |
| Data aggregation | Custom SQL or RPC | Supabase JS client `.from().select().gte()` with in-memory aggregation | Pattern used by all 6 admin API routes already |

**Key insight:** Every building block for this modal already exists in the codebase. The implementation is assembly and extension, not invention.

## Common Pitfalls

### Pitfall 1: Dialog Max Width on Large Screens
**What goes wrong:** Default DialogContent uses `max-w-lg` (512px). The modal needs to be much wider (800-900px) for side-by-side charts.
**Why it happens:** The base dialog.tsx hardcodes `max-w-lg` in className.
**How to avoid:** Override with `className="max-w-4xl"` or `className="sm:max-w-[900px]"` on DialogContent. The existing component accepts className prop and merges via `cn()`.
**Warning signs:** Charts look squished or text overflows.

### Pitfall 2: enrichment_source_status JSONB Structure Variation
**What goes wrong:** The `enrichment_source_status` column can be `null`, a string (legacy), or an object with `{status, error?, at}` per source. Source keys are `contactout`, `exa`, `sec`, `claude`.
**Why it happens:** The enrichment pipeline evolved; older records may have different shapes. The enrichment health route already handles this with type guards.
**How to avoid:** Copy the same type-guarding pattern from `src/app/api/admin/enrichment/health/route.ts` lines 60-93: check `typeof entry === "string"` vs `typeof entry === "object"`, extract `.status` safely.
**Warning signs:** Source stats show 0 across the board despite enrichment activity.

### Pitfall 3: SVG Hover Rect Alignment
**What goes wrong:** Hover tooltip appears at wrong position because SVG coordinates vs DOM coordinates are misaligned when using `viewBox` with percentage width.
**Why it happens:** SVG viewBox scaling means pixel coordinates in the SVG don't match pixel coordinates in the DOM.
**How to avoid:** Use `getBoundingClientRect()` on the SVG element to calculate tooltip position, or use a relative-positioned wrapper div and place the tooltip absolutely within it using the same coordinate system as the SVG points.
**Warning signs:** Tooltip appears offset from the data point being hovered.

### Pitfall 4: Top Tenants Query Performance
**What goes wrong:** Querying all activity_log rows for 14 days and grouping in-memory could be slow if the table is large.
**Why it happens:** No index on (created_at, tenant_id) grouping, or too many rows returned.
**How to avoid:** Limit the query with `.select("tenant_id")` (single column), apply `.gte("created_at", fourteenDaysAgo)`, and aggregate in-memory with a Map. The existing dashboard route already fetches activity_log rows this way (lines 42-68). Keep the pattern. If the table grows very large in the future, consider a Supabase RPC function.
**Warning signs:** Dashboard API response time increases noticeably after adding the query.

### Pitfall 5: Mobile Layout Stacking
**What goes wrong:** Two side-by-side charts overflow on mobile, or the modal is too tall to scroll.
**Why it happens:** `grid-cols-2` without responsive breakpoint.
**How to avoid:** Use `grid grid-cols-1 md:grid-cols-2 gap-4` for the chart pair. Set modal max-height with overflow-y-auto. The existing DialogContent already handles mobile width with `w-[calc(100%-2rem)] sm:w-full`.
**Warning signs:** Horizontal scroll or cut-off content on mobile widths.

### Pitfall 6: Source Stats Double-Counting
**What goes wrong:** If the `enrichment_source_status` aggregation for the modal's source breakdown table produces different numbers than the enrichment health card.
**Why it happens:** Using a different date window or different status-matching logic.
**How to avoid:** Reuse the exact same SOURCES constant (`["contactout", "exa", "edgar", "claude"]`) and the same status-matching logic (`"complete" || "success"` = success, `"failed" || "error"` = failed) from `enrichment/health/route.ts`. Note: the source keys in the JSONB are `contactout`, `exa`, `sec`, `claude`, but the health endpoint maps `sec` -> `edgar` internally.
**Warning signs:** Numbers in the modal don't match the enrichment health card.

## Code Examples

Verified patterns from the existing codebase:

### Existing Dialog Animation (from dialog.tsx)
```typescript
// DialogOverlay: bg-black/80 backdrop-blur-sm + fade-in/fade-out
// DialogContent: fade + zoom-95 + slide + duration-200
// Style: background: "var(--bg-card-gradient)", border: "1px solid var(--border-default)"
// Close: X icon at right-3 top-3, sr-only label
```

### Existing Sparkline SVG Generation (from platform-pulse.tsx)
```typescript
// Cubic bezier path building:
const linePath = points
  .map((p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  })
  .join(" ");

// Area fill path:
const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

// Gradient definition:
<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor={color} stopOpacity="0.25" />
  <stop offset="100%" stopColor={color} stopOpacity="0" />
</linearGradient>
```

### Existing Admin API Auth Pattern (from dashboard/route.ts)
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.app_metadata?.role !== "super_admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
const admin = createAdminClient();
```

### enrichment_source_status JSONB Shape (from enrich-prospect.ts)
```typescript
// Initial shape set by enrichment workflow:
enrichment_source_status: {
  contactout: { status: "pending", at: "2026-03-12T..." },
  exa: { status: "pending", at: "2026-03-12T..." },
  sec: { status: "pending", at: "2026-03-12T..." },
  claude: { status: "pending", at: "2026-03-12T..." },
}

// After enrichment, each source becomes one of:
// { status: "complete", at: "..." }
// { status: "failed", error: "message", at: "..." }
// { status: "skipped", at: "..." }
// { status: "circuit_open", at: "..." }
```

### Activity Log Table Schema (from database.ts)
```typescript
interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: ActivityActionType; // 'login' | 'search_executed' | 'profile_viewed' | etc.
  target_type: 'prospect' | 'list' | 'persona' | 'user' | 'tenant' | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
```

### Colored Status Dot Pattern (from enrichment-health-chart.tsx)
```typescript
// Green/amber/red status dot with glow:
<div
  className={`size-2 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
  style={{
    background: cfg.color,     // var(--success) | var(--warning) | oklch(0.62 0.19 22)
    boxShadow: `0 0 8px ${cfg.glow}`, // rgba glow color
  }}
/>
```

### Source Stats Aggregation Pattern (from enrichment/health/route.ts)
```typescript
// Iterate prospects with enrichment_source_status:
for (const [source, entry] of Object.entries(row.enrichment_source_status)) {
  const key = source.toLowerCase();
  let status = "unknown";
  if (typeof entry === "string") {
    status = entry;
  } else if (typeof entry === "object" && entry !== null) {
    status = (entry as Record<string, unknown>).status as string ?? "unknown";
  }
  if (status === "complete" || status === "success") {
    bucket[key].success++;
  } else if (status === "failed" || status === "error") {
    bucket[key].failed++;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Progress bars for all metrics | Sparkline SVG charts for time-series, progress bars for single-value | Phase 14 (sparkline refactor) | PlatformPulse now shows 14-day sparklines for users/prospects |
| Separate enrichment status strings | JSONB `enrichment_source_status` with per-source objects | Phase 5+ (enrichment pipeline) | Enables per-source success rate aggregation |
| No admin dashboard | Full Command Center with 6 API endpoints | Phase 14 | Foundation for this expansion |

**Deprecated/outdated:**
- Nothing relevant is deprecated for this phase. All existing patterns are current.

## Open Questions

1. **Tenant Name Resolution for Top 5**
   - What we know: `activity_log` has `tenant_id` but not `tenant_name`. Need to join to `tenants` table.
   - What's unclear: Whether to join in the query or do a separate lookup.
   - Recommendation: Do a separate `.from("tenants").select("id, name").in("id", topTenantIds)` after aggregation (same pattern as tenants/activity/route.ts). Keeps the activity_log query simple and fast.

2. **SEC EDGAR Source Key Mismatch**
   - What we know: In the JSONB (`enrichment_source_status`), SEC EDGAR uses key `sec`. But the enrichment health endpoint uses SOURCES array as `["contactout", "exa", "edgar", "claude"]` and maps results to `edgar_success`, `edgar_failed`.
   - What's unclear: Whether the JSONB ever uses `edgar` as a key vs always using `sec`.
   - Recommendation: Handle both `sec` and `edgar` as keys mapping to the same "SEC EDGAR" source in the breakdown table. The enrichment-health route maps `sec` -> `edgar` bucket, so follow the same pattern.

## Sources

### Primary (HIGH confidence)
- `src/components/admin/platform-pulse.tsx` - Existing PlatformPulse component, Sparkline SVG generation
- `src/app/api/admin/dashboard/route.ts` - Dashboard API endpoint, 14-day sparkline data, parallel query pattern
- `src/app/admin/page.tsx` - Admin page layout, data fetching, component wiring
- `src/components/ui/dialog.tsx` - Radix Dialog with tailwindcss-animate fade+zoom
- `src/app/api/admin/enrichment/health/route.ts` - Source stats aggregation from enrichment_source_status
- `src/inngest/functions/enrich-prospect.ts` - enrichment_source_status JSONB shape
- `src/lib/activity-logger.ts` - Activity log schema and action types
- `src/types/database.ts` - TypeScript interfaces for all tables
- `src/app/globals.css` - Design system CSS variables, surface-admin-card, animation keyframes
- `tailwind.config.ts` - Tailwind theme with custom colors, border radius, animations

### Secondary (MEDIUM confidence)
- `src/app/api/admin/tenants/activity/route.ts` - Pattern for tenant metrics aggregation with user lookup
- `src/components/admin/tenant-detail-drawer.tsx` - Sheet/drawer pattern, MiniSparkline, AreaChart SVG patterns
- `src/components/admin/enrichment-health-chart.tsx` - Circuit breaker status dot UI pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in the codebase
- Architecture: HIGH - Every pattern directly observed in existing code
- Pitfalls: HIGH - Based on real code analysis, not speculation
- Data model: HIGH - enrichment_source_status shape verified from enrich-prospect.ts and health endpoint

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable codebase, no fast-moving external dependencies)
