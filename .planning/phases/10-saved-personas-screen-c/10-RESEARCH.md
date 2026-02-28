# Phase 10: Saved Personas (Screen C) - Research

**Researched:** 2026-03-01
**Domain:** Persona card grid UI, sparklines (Recharts), simulated live data stream, three-column layout with sidebars
**Confidence:** HIGH

---

## Summary

Phase 10 rebuilds the existing `/[orgId]/personas` page from a basic card grid into the full "Saved Personas & Living Data" screen (Screen C). The existing backend is complete — all CRUD server actions (`createPersonaAction`, `updatePersonaAction`, `deletePersonaAction`), the `getPersonas` query, and the `Persona` type are already built and working. The phase is purely a UI redesign with zero backend changes required.

The new design introduces three distinct layout zones: a left sidebar for Library Stats and filters, a center grid of rich persona cards (with sparklines, filter-criteria tags, match counts, "Suggested" ribbons, and Search/Explore actions), and a right sidebar for a Live Data Stream feed. The `PersonaFormDialog` (existing) can be reused wholesale for the "Create New Persona" modal trigger. The sparkline trend inside each persona card is built with Recharts `LineChart` — the same library already installed (v3.7.0) and used in `src/components/charts/usage-chart.tsx`.

The Live Data Stream right sidebar is the only genuinely novel UI element. Since there is no real-time enrichment event infrastructure at the API layer for this feed (no webhook, no Supabase realtime subscription wired), the spec is best implemented as a simulated/mock feed using `useState` + `useEffect` with synthetic event entries. This is consistent with the redesign constraint: "preserve all business logic, API integrations." Wiring a real live feed is Post-MVP.

**Primary recommendation:** Decompose the page into five focused components: `PersonasLayout` (three-column shell), `PersonasLibrarySidebar` (left), `PersonaCardGrid` (center), `PersonaCard` (individual card with sparkline), and `LiveDataStream` (right sidebar). The existing `PersonaFormDialog` and `deletePersonaAction` are reused without modification.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PB-01 | Tenant admin/agent can create named personas with search filter combinations | Existing `createPersonaAction` + `PersonaFormDialog` reused; Create New Persona card triggers the modal |
| PB-02 | Persona filters map to Apollo.io API parameters (title, seniority, industry, location, company size, keywords) | Filter criteria tags on each card render from `persona.filters` — same data structure, purely display layer |
| PB-03 | 5 starter personas seeded per tenant: Finance Elite, Tech Execs, Startup Founders, BigLaw Partners, Crypto/Web3 | "Suggested" ribbon rendered on cards where `persona.is_starter === true`; all 5 already in DB |
| PB-04 | Personas are tenant-scoped (RLS enforced) and reusable across searches | No change — `getPersonas(tenantId)` already RLS-scoped; Search action links to `/${orgId}/search?persona=${persona.id}` |
| PB-05 | User can edit and delete custom personas | Edit: `PersonaFormDialog mode="edit"` reused per card (non-starter only). Delete: `deletePersonaAction` called from card menu |
| PB-06 | Persona list view shows name, description, filter summary, last used date | Card design maps directly: name (h3 Cormorant), filter criteria tags (chip row), last run date (`last_used_at`), total matches (derived from `filters` cardinality heuristic or placeholder) |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 14.2.35 | Page + Server Component for data fetch | Already in use; `page.tsx` pattern established |
| React | ^18 | Client components for interactive grid/sidebar | Already in use |
| Recharts | ^3.7.0 | Sparkline trend inside persona cards | Already installed; `LineChart` pattern exists in `usage-chart.tsx` |
| Lucide React | ^0.563.0 | Icons (TrendingUp, Plus, Search, Zap, Activity, Users, Filter, Radio) | Project standard — Lucide only |
| Tailwind CSS | ^3.4.1 | Layout utilities via CSS variables | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix UI Dialog (via shadcn) | installed | "Create New Persona" modal | Reuses existing `PersonaFormDialog` — no new Radix install needed |
| Radix UI Checkbox (via shadcn) | installed | Left sidebar industry filter checkboxes | Already in `src/components/ui/checkbox.tsx` |
| class-variance-authority | installed | Variant classes on "Suggested" ribbon badge | Already used in badge.tsx |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts LineChart for sparkline | `react-sparklines` or hand-rolled SVG | Recharts already installed; `react-sparklines` would add a dependency for no gain |
| Simulated live feed with useEffect | Supabase Realtime subscription | Supabase Realtime requires `on('postgres_changes')` wiring at DB level; not configured; post-MVP |
| Three-column CSS Grid | Flexbox | CSS Grid more predictable for fixed-width sidebars + fluid center |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/[orgId]/personas/
├── page.tsx                        # Server Component — fetches personas, renders layout
├── actions.ts                      # (unchanged) createPersonaAction, updatePersonaAction, deletePersonaAction
└── components/
    ├── personas-layout.tsx          # NEW: three-column grid shell (left sidebar + center + right sidebar)
    ├── personas-library-sidebar.tsx # NEW: left sidebar — Library Stats, industry filter checkboxes, data freshness radio
    ├── persona-card-grid.tsx        # NEW: center column — renders the card grid + "Create New Persona" card
    ├── persona-card.tsx             # NEW: individual persona card with sparkline, tags, stats, actions
    ├── persona-sparkline.tsx        # NEW: thin Recharts wrapper for the inline sparkline (no axes, no grid)
    ├── live-data-stream.tsx         # NEW: right sidebar — simulated feed of events
    ├── persona-form-dialog.tsx      # (unchanged) existing create/edit modal
    └── persona-list.tsx             # DELETED/REPLACED — entire file replaced by persona-card-grid.tsx
```

Page `page.tsx` becomes a Server Component that:
1. Fetches `personas` via `getPersonas(tenantId)`
2. Passes personas as props to `<PersonasLayout>` (client component)
3. `PersonasLayout` renders all three columns

### Pattern 1: Three-Column Layout Shell

**What:** A CSS Grid with fixed-width left/right sidebars and a fluid center column.
**When to use:** Any screen with persistent sidebar panels flanking a main content area.
**Example:**

```tsx
// src/app/[orgId]/personas/components/personas-layout.tsx
"use client";

export function PersonasLayout({ personas }: { personas: Persona[] }) {
  return (
    <div
      className="grid gap-5 min-h-0"
      style={{ gridTemplateColumns: "220px 1fr 280px" }}
    >
      <PersonasLibrarySidebar personas={personas} />
      <PersonaCardGrid personas={personas} />
      <LiveDataStream />
    </div>
  );
}
```

Note: On mobile (< 1024px) the sidebars collapse. Use `hidden lg:block` on sidebar columns.

### Pattern 2: Persona Card with Inline Sparkline

**What:** Each persona card shows a mini sparkline trend (7 data points, no axes) using Recharts `LineChart` with `dot={false}` and no `CartesianGrid`/`XAxis`/`YAxis`.
**When to use:** When conveying trend direction without needing precise values.
**Example:**

```tsx
// src/app/[orgId]/personas/components/persona-sparkline.tsx
"use client";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: Array<{ value: number }>;
  color?: string;
}

export function PersonaSparkline({ data, color = "var(--gold-primary)" }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

Sparkline data is synthetic for now (e.g., `[{ value: 200 }, { value: 315 }, ...]`). The `isAnimationActive={false}` prevents Recharts animation from causing re-render jitter in a card grid. Source: verified against existing `usage-chart.tsx` pattern in this codebase.

### Pattern 3: "Suggested" Ribbon on Starter Persona Cards

**What:** Starter personas (`is_starter === true`) get a gold badge inline with the card name.
**When to use:** Anytime a card needs a "recommended/default" marker.
**Example:**

```tsx
<div className="flex items-start justify-between gap-2">
  <h3 className="font-serif text-[22px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
    {persona.name}
  </h3>
  {persona.is_starter && (
    <Badge variant="gold" className="shrink-0 text-[10px] uppercase tracking-wide">
      Suggested
    </Badge>
  )}
</div>
```

Reuses the existing `Badge` component's `variant="gold"` from `src/components/ui/badge.tsx` — no new component needed.

### Pattern 4: Filter Criteria Tags (chip row)

**What:** The persona's filter values rendered as small read-only chip badges below the name.
**When to use:** Compact display of multi-value filter config.
**Example:**

```tsx
function FilterTags({ filters }: { filters: PersonaFilters }) {
  const tags: string[] = [
    ...(filters.titles?.slice(0, 2) ?? []),
    ...(filters.industries?.slice(0, 1) ?? []),
    ...(filters.seniorities?.slice(0, 1)?.map(s => s.replace("_", " ")) ?? []),
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span
          key={tag}
          className="text-[11px] px-2.5 py-0.5 rounded-[6px]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
```

This matches the chip pattern in `design-system/pages/search.md` ("Title tags — flex-wrap chips: 11px, --bg-elevated background, --border-default border").

### Pattern 5: "Create New Persona" Card

**What:** A dashed-border card with centered + icon that opens `PersonaFormDialog`.
**When to use:** At the end of the persona grid as an inline CTA.
**Example:**

```tsx
<PersonaFormDialog
  mode="create"
  trigger={
    <button
      className="surface-card rounded-[14px] p-7 w-full cursor-pointer flex flex-col items-center justify-center gap-3 transition-all"
      style={{
        border: "1px dashed var(--border-default)",
        background: "transparent",
        minHeight: "220px",
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--gold-bg)" }}
      >
        <Plus className="h-5 w-5" style={{ color: "var(--gold-primary)" }} />
      </div>
      <span className="text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
        Create New Persona
      </span>
      <span className="text-[12px]" style={{ color: "var(--text-ghost)" }}>
        Custom filter combination
      </span>
    </button>
  }
/>
```

This matches the spec in `design-system/pages/search.md` ("Create Persona Card — Dashed border, centered 48px circle with + in gold").

### Pattern 6: Simulated Live Data Stream

**What:** A right sidebar panel showing a feed of "events" (new match, enrichment update, lookalike finding, high-value alert) rendered as a vertical timeline list with auto-scroll.
**When to use:** When real-time data isn't yet available but the UX calls for a live feed.
**Example:**

```tsx
"use client";
import { useEffect, useState } from "react";

const MOCK_EVENTS = [
  { id: 1, type: "new_match", label: "New Match", persona: "Finance Elite", name: "Jonathan S.", time: "2m ago", detail: "Director of NYC Real Estate There" },
  { id: 2, type: "enrichment", label: "Enrichment", persona: "Soho Crypto Founders", name: "Sarah K.", time: "5m ago", detail: "Contact details updated" },
  // ... more events
];

export function LiveDataStream() {
  const [events, setEvents] = useState(MOCK_EVENTS.slice(0, 5));

  useEffect(() => {
    // Simulate new events appearing every 8 seconds
    const interval = setInterval(() => {
      setEvents(prev => {
        const next = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
        return [{ ...next, id: Date.now(), time: "just now" }, ...prev].slice(0, 8);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="hidden lg:flex flex-col gap-0 rounded-[14px] overflow-hidden"
      style={{ background: "var(--bg-card-gradient)", border: "1px solid var(--border-subtle)" }}>
      {/* Header */}
      {/* Event list */}
    </aside>
  );
}
```

### Pattern 7: Left Sidebar — Library Stats + Filters

**What:** A narrow sidebar panel with two stat chips at top, then an industry checkbox filter group and data freshness radio group.
**When to use:** Auxiliary filter panel beside a main content grid.
**Key detail:** The filter state (`selectedIndustries`, `freshness`) should be managed in `PersonasLayout` (parent) and passed down, so the grid can use it to filter the persona list client-side (no server round-trip needed — personas are already loaded).

### Anti-Patterns to Avoid

- **Don't put sidebar state in page.tsx (Server Component):** Page.tsx fetches data only; all interactive state lives in the `PersonasLayout` client component.
- **Don't use raw Recharts dimensions:** Always wrap in `ResponsiveContainer` — fixed width/height on charts breaks responsive layout.
- **Don't add a fourth "Explore" page route for personas:** The "Explore" action button per card links to `/${orgId}/search?persona=${persona.id}` (same as "Search") — there is no separate "explore" route.
- **Don't import `PersonaList` in the redesigned page:** The old `persona-list.tsx` component is replaced by `persona-card-grid.tsx`. Don't mix old and new.
- **Don't use `window.setInterval` without cleanup:** Always return a cleanup function from `useEffect` for the Live Data Stream timer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sparkline chart | Custom SVG path calculation | Recharts `LineChart` with axes/grid removed | Handles edge cases (empty data, NaN) transparently |
| Modal dialog for Create Persona | Custom modal | Existing `PersonaFormDialog` (Radix Dialog) | Already wired to server actions, validated, accessible |
| Checkbox group | Custom checkbox | `src/components/ui/checkbox.tsx` (Radix) | Focus management, keyboard nav, indeterminate state handled |
| Filter tags (chips) | Custom badge system | Inline span with CSS variable styles | `Badge` component is rounded-full (pill); search.md spec wants rounded-[6px] chips — use span directly |
| Delete confirmation | Custom modal | `window.confirm()` | Existing `deletePersonaAction` already uses this pattern — maintain consistency for now |

**Key insight:** This phase is predominantly a display layer redesign. The entire data layer exists. Resist the urge to "improve" the data model or add new API calls — that creates Phase 9+ scope creep.

---

## Common Pitfalls

### Pitfall 1: Three-Column Layout Breaking on Mid-Size Screens

**What goes wrong:** The `gridTemplateColumns: "220px 1fr 280px"` leaves insufficient space for the center column on 768–1023px screens, causing overflow.
**Why it happens:** Tailwind's `lg` breakpoint is 1024px; sidebars must be hidden below that.
**How to avoid:** Wrap sidebars in `hidden lg:flex flex-col` so they disappear on tablet/mobile. Center column gets full width on `< lg`.
**Warning signs:** Center column content wraps or gets cut off at 768px viewport.

### Pitfall 2: Recharts Sparkline SSR Warning

**What goes wrong:** Recharts' `ResponsiveContainer` relies on DOM measurement (`getBoundingClientRect`). In Next.js App Router, if the component renders server-side, Recharts throws a hydration mismatch.
**Why it happens:** `ResponsiveContainer` measures the parent element's width on mount. On SSR there's no DOM.
**How to avoid:** Mark `persona-sparkline.tsx` as `"use client"`. The parent `persona-card.tsx` also needs `"use client"` if it renders the sparkline inline.
**Warning signs:** `Warning: Prop 'width' did not match. Server: "0" Client: "..."` in console.

### Pitfall 3: Inline `style` Required for CSS Variable Gradients in Tailwind v3

**What goes wrong:** Writing `bg-[var(--bg-card-gradient)]` in className fails silently — Tailwind v3 can't process CSS gradient variables via JIT.
**Why it happens:** JIT arbitrary value syntax resolves at build time; CSS custom properties that themselves contain `linear-gradient()` are not resolvable.
**How to avoid:** Use `style={{ background: "var(--bg-card-gradient)" }}` for card backgrounds. This is an established pattern in this codebase (see `[Phase 05]` decision in STATE.md: "Inline style used for Dialog gradient background").
**Warning signs:** Cards appear with `bg-transparent` or missing gradient.

### Pitfall 4: `is_starter` Cards Are Read-Only

**What goes wrong:** Edit/Delete buttons rendered on starter persona cards.
**Why it happens:** Forgetting the `is_starter` guard in the new `PersonaCard` component.
**How to avoid:** Always gate Edit and Delete actions with `{!persona.is_starter && (...)}`. The `updatePersona` and `deletePersona` queries in `queries.ts` also enforce `.eq("is_starter", false)` as a server-side guard.
**Warning signs:** Edit button visible on "Finance Elite" card.

### Pitfall 5: `last_used_at` Can Be `null`

**What goes wrong:** Displaying "Invalid Date" or runtime error when formatting `persona.last_used_at`.
**Why it happens:** New personas and starter personas that haven't been run yet have `null` in this field.
**How to avoid:** Always null-check: `persona.last_used_at ? formatDate(persona.last_used_at) : "Never run"`.
**Warning signs:** "Last run: Invalid Date" on fresh personas.

### Pitfall 6: "Total Matches" Count Has No Real Data Source

**What goes wrong:** The design requires "total matches" on each persona card but the DB `personas` table has no `total_matches` column.
**Why it happens:** The schema only has `id, tenant_id, name, description, filters, is_starter, created_by, last_used_at, created_at, updated_at`.
**How to avoid:** Use a placeholder/estimated match count derived from the filter complexity (e.g., `"~2,400 matches"` as static text) or show "Run to see matches." Do NOT attempt to compute real match counts — that would require Apollo API calls on page load, which is expensive and against the redesign scope.
**Warning signs:** Temptation to add a `match_count` DB column or call Apollo on page render.

### Pitfall 7: `revalidatePath` on Delete Uses Template Literal, Not Dynamic Path

**What goes wrong:** `revalidatePath('/[orgId]/personas')` (template literal with brackets) may not revalidate the actual rendered path.
**Why it happens:** Existing `actions.ts` uses this pattern. It works in most cases but is a known Next.js nuance.
**How to avoid:** Do not change the existing `actions.ts` — it already works and this phase doesn't modify server actions.
**Warning signs:** Persona still appears in grid after deletion (before page refresh).

---

## Code Examples

Verified patterns from existing codebase:

### Sparkline — Minimal Recharts LineChart

```tsx
// Derived from src/components/charts/usage-chart.tsx
// Source: existing codebase, Recharts ^3.7.0
"use client";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function PersonaSparkline({
  data,
}: {
  data: Array<{ value: number }>;
}) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--gold-primary)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Card Surface with CSS Variable Gradient (correct pattern)

```tsx
// Source: established pattern in this codebase (Phase 05 decision in STATE.md)
<div
  className="rounded-[14px] p-7 cursor-pointer transition-all"
  style={{
    background: "var(--bg-card-gradient)",
    border: "1px solid var(--border-subtle)",
  }}
  onMouseEnter={e => {
    (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
  }}
  onMouseLeave={e => {
    (e.currentTarget as HTMLElement).style.background = "var(--bg-card-gradient)";
    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
  }}
>
  {/* card content */}
</div>
```

Note: `onMouseEnter`/`onMouseLeave` for CSS variable hover states is the established pattern in this project (see `[Phase 05-03]` and `[Phase 05-05]` decisions in STATE.md). Tailwind `hover:` cannot reference CSS custom property values.

### Filter State in Parent, Grid Filtered Client-Side

```tsx
// PersonasLayout — filter state owned here, not in child components
"use client";
import { useState, useMemo } from "react";

export function PersonasLayout({ personas }: { personas: Persona[] }) {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [freshness, setFreshness] = useState<"live" | "past_week">("live");

  const filteredPersonas = useMemo(() => {
    if (selectedIndustries.length === 0) return personas;
    return personas.filter(p =>
      p.filters.industries?.some(ind => selectedIndustries.includes(ind))
    );
  }, [personas, selectedIndustries]);

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "220px 1fr 280px" }}>
      <PersonasLibrarySidebar
        personas={personas}
        selectedIndustries={selectedIndustries}
        onIndustryChange={setSelectedIndustries}
        freshness={freshness}
        onFreshnessChange={setFreshness}
      />
      <PersonaCardGrid personas={filteredPersonas} />
      <LiveDataStream />
    </div>
  );
}
```

### Breadcrumbs Usage (from Phase 6 component)

```tsx
// src/components/ui/breadcrumbs.tsx already exists from Phase 6
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

// In page.tsx or PersonasLayout
<Breadcrumbs
  items={[{ label: "Personas" }]}
/>
```

---

## What the Mockup Shows (Screen C — `stitch/outreach_campaign_orchestrator/screen.png`)

Verified by reading the stitch screenshot. Key observations:

1. **Left sidebar (narrow):** "LIBRARY STATE" section with "843" active personas and stat. "FILTER BY INDUSTRY" checkboxes (Real Estate, Crypto/Web3, Fintech, Private Equity). "DATA FRESHNESS" radio (Live / Past Week). "New Persona Search" gold button at top.

2. **Center grid (3-column card grid):** Cards shown: NYC Crypto Founders (with "MULTI-RISE" badge ribbon), Soho Crypto Founders (with "Suggested" badge, "4,298" total, "Top 1%" badge), Miami... (1,000 total), London... (315 today). Each card has: last run time, "Today" count, sparkline chart area, user avatar circles, "Search" and "Explore" buttons at bottom.

3. **Create New Persona card:** Plain card with "+" icon, "Create New Persona" label, and sub-description. No border emphasis beyond card surface.

4. **Right sidebar:** "Live Data Stream" header. Feed items: name, sub-detail, time ago, and a pill badge for event type (NEW MATCH, ENRICHMENT, etc.). "Review Matches" and "Review Matches" CTAs on some items.

5. **Top bar:** "Saved Personas & Living Data" as page title with subtitle "Your active data streams. These personas are constantly updated with new leads matching your criteria."

---

## Existing Assets to Reuse (Zero Modification)

| Asset | Location | Reuse |
|-------|----------|-------|
| `PersonaFormDialog` | `src/app/[orgId]/personas/components/persona-form-dialog.tsx` | Unchanged — triggered by "Create New Persona" card and Edit button |
| `createPersonaAction` / `updatePersonaAction` / `deletePersonaAction` | `src/app/[orgId]/personas/actions.ts` | Unchanged |
| `getPersonas()` | `src/lib/personas/queries.ts` | Used in `page.tsx` server component |
| `Persona` type | `src/lib/personas/types.ts` | Unchanged |
| `Badge` component | `src/components/ui/badge.tsx` | `variant="gold"` for "Suggested" ribbon |
| `EmptyState` component | `src/components/ui/empty-state.tsx` | For zero-personas state |
| `Breadcrumbs` component | `src/components/ui/breadcrumbs.tsx` | In page header |
| `surface-card` CSS utility | `src/app/globals.css` | On card containers |
| `onMouseEnter/Leave` pattern | STATE.md Phase 05-03 | For card hover state |
| `font-serif` class | design-system/MASTER.md | Cormorant Garamond on card titles |

---

## New Components to Create

| Component | File | Description |
|-----------|------|-------------|
| `PersonasLayout` | `components/personas-layout.tsx` | Three-column grid shell + filter state |
| `PersonasLibrarySidebar` | `components/personas-library-sidebar.tsx` | Left sidebar (stats, industry filter, freshness radio) |
| `PersonaCardGrid` | `components/persona-card-grid.tsx` | Responsive grid of persona cards + Create New card |
| `PersonaCard` | `components/persona-card.tsx` | Individual persona card (name, tags, sparkline, stats, actions) |
| `PersonaSparkline` | `components/persona-sparkline.tsx` | Thin Recharts wrapper for inline sparkline |
| `LiveDataStream` | `components/live-data-stream.tsx` | Right sidebar with simulated event feed |

**Replace:** `persona-list.tsx` is deleted and replaced by `PersonaCardGrid` + `PersonaCard`.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `PersonaList` renders a flat card grid via shadcn `Card` | `PersonaCardGrid` + `PersonaCard` with custom CSS variable surface treatment, sparklines, and stat metadata | Richer data density without new dependencies |
| Plain page layout (no sidebars) | Three-column CSS Grid with fixed sidebars | Matches Screen C spec; sidebars hidden on mobile |
| No real-time feel | Simulated `LiveDataStream` with `setInterval` | Creates "living data" UX without backend changes |
| "Starter" badge = shadcn `<Badge variant="secondary">` | "Suggested" ribbon = `<Badge variant="gold">` per design system | Correct gold treatment for featured/recommended items |

---

## Open Questions

1. **"Explore" vs "Search" actions per card**
   - What we know: REDESIGN-PROMPT.md lists both "Search" and "Explore" as separate actions per card. The existing code only has "Search" (links to `/${orgId}/search?persona=${id}`).
   - What's unclear: What does "Explore" do differently from "Search"? The stitch mockup shows both buttons at the bottom of each card.
   - Recommendation: Treat "Explore" as identical to "Search" for now (same link). Document as a Post-MVP distinction. Don't create a new route.

2. **"New match count badge" data source**
   - What we know: The spec calls for "+124 New Matches" badge on cards. No DB column stores this.
   - What's unclear: Is this count of prospects found since `last_used_at`? Would require a fresh Apollo call per persona on page load.
   - Recommendation: Use a placeholder `0 New` count with a "Run to discover" tooltip. Mark as Post-MVP for real counts.

3. **"User avatars of who uses this persona"**
   - What we know: The spec calls for user avatar chips on each card. The `personas` table has `created_by` (user UUID) but no multi-user "used by" tracking.
   - What's unclear: Should it show only `created_by` user, or everyone who has run it?
   - Recommendation: Show a single avatar for `created_by` only. Use initials-based avatar (no image fetch) matching the TopBar pattern.

4. **Left sidebar "Data Freshness" radio (Live / Past Week)**
   - What we know: The filter exists as a UI element but there's no `freshness` column on `personas`.
   - What's unclear: Does "Live" vs "Past Week" filter which personas are shown, or toggle some display mode?
   - Recommendation: Implement as a display filter: "Past Week" filters to personas with `last_used_at` within the last 7 days. "Live" shows all personas.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — the key is absent from the config, which only contains `mode`, `depth`, `parallelization`, `commit_docs`, `model_profile`, and `workflow.research`/`plan_check`/`verifier`. No `nyquist_validation` key. Skipping this section.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/app/[orgId]/personas/` — all 4 files read directly; complete understanding of current state
- Existing codebase: `src/lib/personas/` — types, queries, seed data read directly
- Existing codebase: `src/components/charts/usage-chart.tsx` — Recharts LineChart pattern verified
- `design-system/MASTER.md` — read directly; all color variables, surface patterns, typography rules
- `design-system/pages/search.md` — read directly; persona card chip/tag spec, create persona card spec
- `stitch/outreach_campaign_orchestrator/screen.png` — read directly; Screen C mockup confirms three-column layout, card anatomy, live data stream sidebar
- `stitch/heatmap_of_outreach_campaign_orchestrator/screen.png` — read directly; heat map variant shows additional context
- `.planning/STATE.md` — read directly; all Phase 05 pattern decisions (CSS variable hover, inline style for gradients, font-serif class)
- `package.json` — versions confirmed: Recharts 3.7.0, Next.js 14.2.35, Lucide ^0.563.0

### Secondary (MEDIUM confidence)

- Recharts documentation knowledge (training data, last verified against codebase pattern): `ResponsiveContainer` + `LineChart` with `dot={false}` for sparklines is a standard pattern widely used in React data dashboards
- Next.js App Router Server/Client component boundary: Server Component fetches data, Client Component owns interactivity — confirmed by existing `page.tsx` pattern

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from `package.json` and existing usage
- Architecture: HIGH — derived directly from existing file structure and mockup screenshots
- Pitfalls: HIGH — most derived from STATE.md accumulated decisions and direct code inspection
- Open questions: MEDIUM — design intent ambiguity, not technical uncertainty

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable stack; no fast-moving dependencies)
