# Phase 8: Lead Search (Screen B) — Research

**Researched:** 2026-03-01
**Domain:** Search UI — natural language bar, persona pills, result cards, bulk actions, slide-over trigger, pagination
**Confidence:** HIGH

---

## Summary

Phase 8 rebuilds the search screen (`/[orgId]/search`) into the "Lead Discovery" screen described in the stitch mockup and `design-system/pages/search.md`. The existing implementation is already surprisingly far along — it has two views (persona card grid + results card stack), `useSearch` hook with `nuqs` URL state, `ProspectResultCard` with all visual elements, pagination, and `AddToListDialog`. The primary work is **architectural restructuring and UX enhancement**, not a ground-up rewrite.

The biggest structural change is the **two-view model must be collapsed into a unified single-screen layout**: the mockup shows the NL search bar + persona pills always visible at the top, with results appearing below. The current implementation hides the persona grid entirely once a persona is selected. The slide-over trigger is currently a `no-op` placeholder (`handleProspectClick` does nothing) — Phase 8 must wire the URL query param `?prospect=<id>` to open the `ProspectSlideOver` Sheet component that already exists in `src/components/prospect/prospect-slide-over.tsx`.

The stitch mockup uses a **table layout** for results (not horizontal cards), but `design-system/pages/search.md` explicitly overrides this and mandates **horizontal card stacks** — which is already what the current `ProspectResultCard` implements. The design spec wins over the mockup on this point.

**Primary recommendation:** Reuse and enhance existing components. Migrate `SearchContent` from a two-view toggle to a single-screen layout with: NL textarea + persona pills row always visible, advanced filters collapse, bulk-select toolbar above results, wire `ProspectSlideOver` via URL param.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nuqs` | Already used | URL query state (persona, page, sortBy, sortOrder) | Already wired in `useSearch` hook — shareable/bookmarkable URLs |
| `@tanstack/react-table` | Already used | Table primitives for bulk selection state | Powers existing `DataTable` and `search-results-table` |
| shadcn `Sheet` | Already used | Slide-over panel | `ProspectSlideOver` already uses it — just need to trigger it |
| shadcn `Dialog` | Already used | Add to List dialog | `AddToListDialog` is production-ready |
| shadcn `Checkbox` | Already used | Bulk select checkboxes | Used in `ProspectCard` via `onSelect` prop |
| Lucide React | Already used | All icons | Only icon source per design system |

### Supporting (no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useQueryStates` from nuqs | Already used | Multi-param URL state | Add `prospect` param for slide-over URL sync |
| `useState` | React built-in | Local checkbox selection set | Bulk select IDs array |
| `useCallback` / `useRef` | React built-in | Abort controller for in-flight search | Already in `useSearch` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nuqs for slide-over URL param | `useState` only | nuqs gives shareable profile URLs — design spec requires `?prospect=<id>` URL sync |
| Native `<textarea>` for NL bar | shadcn `Textarea` | Native gives finer control of auto-resize; shadcn wraps it — either works, native is simpler |
| CSS variable hover on pills | Tailwind `hover:` | Tailwind can't reference CSS custom property values; onMouseEnter/Leave pattern is established in this codebase |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended File Structure

The existing search directory is clean. Phase 8 modifies existing files and adds one new component:

```
src/app/[orgId]/search/
  page.tsx                          — Server component (no changes needed)
  hooks/
    use-search.ts                   — ADD `prospect` query param for slide-over URL sync
  components/
    search-content.tsx              — MAJOR REWRITE: unified single-screen layout
    persona-pills.tsx               — NEW: horizontal scrollable pill row (replaces full-page card grid in results view)
    nl-search-bar.tsx               — NEW: NL textarea with voice icon placeholder + Search button
    advanced-filters-panel.tsx      — NEW: collapsible filter panel (titles, location, industry, seniority)
    bulk-actions-bar.tsx            — NEW: select-all + Add to List + Export CSV + Enrich Selection
    prospect-result-card.tsx        — MINOR UPDATE: add checkbox prop, wire onClick to slide-over
    search-results-table.tsx        — KEEP AS-IS (unused in new design, keep for reference)
    persona-card.tsx                — KEEP AS-IS (no longer shown in results view)
    persona-selector.tsx            — KEEP AS-IS (older dropdown, not used in new layout)
    add-to-list-dialog.tsx          — KEEP AS-IS (production-ready, no changes needed)
    wealth-tier-badge.tsx           — KEEP AS-IS (local duplicate of shared component)
```

### Pattern 1: Single-Screen Layout (unified view)

**What:** Always show the NL search bar and persona pills. Results appear below when a persona is selected. No full-page swap between "persona grid" and "results view."

**When to use:** This matches the stitch mockup layout and prevents jarring full-page navigation when switching personas.

**Implementation:**

```tsx
// search-content.tsx — simplified structure
export function SearchContent({ personas, lists, orgId }) {
  // NL bar + persona pills always visible
  return (
    <div className="page-enter flex flex-col h-full">
      {/* Header + NL bar + persona pills — always visible */}
      <div className="px-0 pt-8 pb-6 flex flex-col gap-4">
        <PageHeader />
        <NLSearchBar onSearch={handleNLSearch} />
        <PersonaPills personas={personas} selected={searchState.persona} onSelect={...} />
        <AdvancedFiltersToggle />
      </div>

      {/* Results area — conditional */}
      {hasPersonaSelected && (
        <>
          <BulkActionsBar selected={selectedIds} onAddToList={...} onExport={...} />
          <ResultsStack results={results} />
          <Pagination />
        </>
      )}

      {/* Empty state when no persona selected */}
      {!hasPersonaSelected && <EmptyState ... />}

      {/* Slide-over panel */}
      <ProspectSlideOver prospectId={searchState.prospect} orgId={orgId} onClose={...} />
    </div>
  );
}
```

### Pattern 2: Persona Pills Row

**What:** Compact horizontal pill row replacing the full-page persona card grid in the results view context. Each pill = one persona. Clicking fires the search.

**When to use:** Always visible above results, replaces the persona card grid that currently only shows in the "no persona selected" state.

**Design spec from stitch mockup:**
```
pill: rounded-full, bg surface-dark, border border-dark
      hover: border-primary/50, bg-primary/5
      colored dot (2px circle) per persona for visual variety
      "New Persona" pill with dashed border and + icon at end
```

**Translated to design system tokens:**
```tsx
// Rest state
background: "var(--bg-elevated)"
border: "1px solid var(--border-default)"
// Hover state (onMouseEnter/Leave)
border: "1px solid var(--border-hover)"
background: "var(--gold-bg)"
// Active/selected state
background: "var(--gold-bg)"
border: "1px solid var(--border-gold)"
color: "var(--gold-primary)"
```

### Pattern 3: Slide-Over URL Sync

**What:** Clicking a prospect card sets `?prospect=<apolloId>` in the URL. `ProspectSlideOver` reads this param and renders. Closing clears the param.

**Current state:** `handleProspectClick` in `search-content.tsx` is a no-op. The `ProspectSlideOver` component exists at `src/components/prospect/prospect-slide-over.tsx` and accepts a `prospectId` prop.

**Implementation:**
```tsx
// In use-search.ts — add prospect param
const [searchState, setSearchState] = useQueryStates({
  persona: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  sortBy: parseAsString.withDefault("name"),
  sortOrder: parseAsString.withDefault("asc"),
  prospect: parseAsString.withDefault(""),  // ADD THIS
});

// In search-content.tsx
const handleProspectClick = (prospectId: string) => {
  setSearchState({ prospect: prospectId });
};

const handleSlideOverClose = () => {
  setSearchState({ prospect: "" });
};

// Render ProspectSlideOver
<ProspectSlideOver
  prospectId={searchState.prospect || null}
  orgId={orgId}
  open={Boolean(searchState.prospect)}
  onClose={handleSlideOverClose}
/>
```

**NOTE:** Phase 9 builds the full slide-over content. Phase 8 only wires the open/close trigger mechanism and URL param. The existing `ProspectSlideOver` already has the shell — Phase 8 just needs to connect it.

### Pattern 4: Bulk Selection State

**What:** Local `useState` tracking selected prospect IDs. `ProspectCard` accepts `selected` prop (already built). `BulkActionsBar` appears when `selectedIds.length > 0`.

**Implementation:**
```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const handleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};

const handleSelectAll = () => {
  if (selectedIds.size === results.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(results.map(r => r.id)));
  }
};
```

**Reset selection on new search:** Clear `selectedIds` whenever `searchState.persona` changes.

### Pattern 5: Advanced Filters Panel

**What:** Collapsible section below persona pills. Contains filter inputs that map to `PersonaFilters`. Toggle with a "Filters" button (icon: `SlidersHorizontal` from Lucide).

**Current state:** `SearchToolbar` has a non-functional "Filters" ghost button. No filter panel exists.

**Design spec from stitch mockup:**
- "Advanced Filters" text button with tune icon and expand_more chevron
- Panel expands with filter inputs (titles, location, industry, seniority)

**Key decision:** Filters in Phase 8 are applied as **ad-hoc overrides** on top of the selected persona, NOT as persona edits. The existing `searchApollo()` accepts `PersonaFilters` directly. The `useSearch` hook currently fetches the persona from the server and passes its filters. To support ad-hoc filters, Phase 8 needs to either:
1. Pass additional filter params to the search API, OR
2. Store override filters in URL state alongside persona

**Recommendation:** Store override filters in URL state (nuqs) — keeps URL bookmarkable. The search API already accepts `personaId` and the server fetches its filters. Ad-hoc filters can be additional URL params that the client merges client-side into the display, or passed as additional body params to the search API route.

**IMPORTANT CONSTRAINT:** The Apollo API endpoint `/api/search/apollo` currently only accepts `personaId`, `page`, `pageSize`. Advanced filters would require either (a) extending the API route to accept optional filter overrides, or (b) creating a separate "filter override" mechanism. This is a planning decision — flag for planner.

### Pattern 6: NL Search Bar

**What:** A `<textarea>` with auto-resize, placeholder text, and a "Search" button. In MVP scope, it populates `q_keywords` in the Apollo search params.

**Current state:** `PersonaFilters.keywords` field already exists and maps to Apollo's `q_keywords`. The `useSearch` hook and `searchApollo()` both support keywords. The NL bar needs only to set the `keywords` state and trigger a search.

**Design spec from stitch mockup:**
```
textarea: rounded-2xl, py-6, pl-16, pr-32, text-xl, shadow-xl
          placeholder: muted, italic
          search icon left
          search button right (gold)
          voice icon button (placeholder, no functionality needed in Phase 8)
```

**Translated to design system:**
- Background: `var(--bg-input)` with `border: var(--border-subtle)`
- Focus: `border: var(--border-hover)`
- Search button: `variant="gold"` per design system button spec
- Border radius: 12px (card radius — no dedicated NL bar radius token, use 12px)

**NL Processing Reality:** True AI-powered NL parsing (extracting titles, industries etc. from plain text) requires Claude API calls. Per project memory, `ANTHROPIC_API_KEY` is NOT configured. Phase 8 should treat the NL bar as a **keyword search passthrough** that sets `q_keywords` — it maps to Apollo's existing keyword search. Full NL parsing is v2.

### Anti-Patterns to Avoid

- **Keeping the two-view swap:** Switching the entire content area between "persona grid" and "results" is jarring. Use the unified layout.
- **Using `search-results-table.tsx` for the new design:** The design spec explicitly says no table layout for results — use horizontal cards only.
- **Rebuilding `AddToListDialog`:** It is production-ready with proper error handling, toast feedback, and Supabase writes. Do not replace it.
- **Using raw Tailwind color classes** (`bg-yellow-500`, `text-gray-400`) — use CSS variables only.
- **Scale transforms on hover** — use border/background transitions only per design system.
- **Emojis as icons** — use Lucide only.
- **Duplicating `WealthTierBadge`** — import from `@/components/ui/wealth-tier-badge` (the shared Phase 6 component), not from the local search `components/` copy.
- **Duplicating `ProspectCard` logic** — `ProspectResultCard` in `src/app/[orgId]/search/components/` can be REPLACED by the shared `ProspectCard` from Phase 6 (`src/components/prospect/prospect-card.tsx`), which already has all the same functionality plus checkbox support.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-over panel | Custom overlay/drawer | `shadcn Sheet` (already in `ProspectSlideOver`) | shadcn handles focus trap, keyboard dismiss, animation, aria — already built |
| Add to List flow | Custom list picker | `AddToListDialog` (already built at `./add-to-list-dialog.tsx`) | Production-ready with toasts, error handling, multi-select |
| URL state management | `useState` + `useEffect` history push | `nuqs` `useQueryStates` (already used in `useSearch`) | Handles SSR hydration, back/forward, Next.js router integration |
| Checkbox group select-all | Custom logic | `useState<Set<string>>` with the pattern in ProspectCard | Simple and tested pattern already in use |
| Pagination display | Custom pagination component | Extend existing inline pagination in `search-content.tsx` | Already matches design spec with gold active state |

**Key insight:** The codebase already has most building blocks. Phase 8 is about wiring and restructuring, not building primitives.

---

## Common Pitfalls

### Pitfall 1: Two-Component Duplication for WealthTierBadge

**What goes wrong:** There are TWO `WealthTierBadge` components — one at `src/components/ui/wealth-tier-badge.tsx` (Phase 6 shared, with `Shield` icon) and one at `src/app/[orgId]/search/components/wealth-tier-badge.tsx` (local, no icon). They have different props and behavior.

**Why it happens:** Phase 6 created the canonical shared version. The existing search one was built earlier.

**How to avoid:** Phase 8 should update `prospect-result-card.tsx` to import from the shared `@/components/ui/wealth-tier-badge` and delete the local copy. The shared version accepts `tier: string | null | undefined`.

**Warning signs:** If two `wealth-tier-badge.tsx` files are both in scope.

### Pitfall 2: ProspectResultCard vs ProspectCard Duplication

**What goes wrong:** `ProspectResultCard` (in search components) and `ProspectCard` (in `src/components/prospect/`) implement the same visual design with slightly different prop interfaces. Maintaining both leads to drift.

**Why it happens:** `ProspectCard` was built in Phase 6 with the canonical interface (including `enrichmentSourceStatus`, `selected`, `onSelect` for checkbox). `ProspectResultCard` was built earlier from a different `ApolloPerson` shape.

**How to avoid:** Phase 8 should adapt `ProspectResultCard` to use `ProspectCard` internally (map `ApolloPerson` fields to `ProspectCard` props) OR replace `ProspectResultCard` usages with `ProspectCard` directly. The `ProspectCard` interface already covers everything needed.

**Key difference:** `ProspectCard` uses named fields (`fullName`, `firstName`, `lastName`, `title`, `company`, etc.) while `ApolloPerson` has different field names. A mapping adapter is needed.

### Pitfall 3: Slide-Over Opens But Profile Data is Empty

**What goes wrong:** Clicking a prospect opens the slide-over with the Apollo ID, but `ProspectSlideOver` tries to fetch the prospect from the `prospects` database table. Apollo search results are NOT saved to the database until "Add to List" is called.

**Why it happens:** The enrichment pipeline (Inngest) requires a `prospect_id` in the `prospects` table. Apollo search results are ephemeral until saved.

**How to avoid:** Phase 8 slide-over trigger should pass the full `ApolloPerson` data as well as the ID. The slide-over in Phase 8 scope shows only the data from Apollo (name, title, company, location, contact availability). Full enrichment (ContactOut, Exa, SEC, Claude) is Phase 9 territory. The slide-over should show "Add to List to enable full enrichment" if the prospect is not yet in the database.

**Warning signs:** 404 errors when slide-over tries to `GET /api/prospects/:id` for an Apollo search result that hasn't been saved yet.

### Pitfall 4: CSS Variable Hover States on Pills Break with Tailwind hover:

**What goes wrong:** Trying to write `hover:border-[var(--border-hover)]` in Tailwind — this does NOT work because Tailwind cannot generate utilities that reference CSS custom properties at hover time.

**Why it happens:** This is a fundamental Tailwind v3 limitation that affects all CSS-variable-based hover states.

**How to avoid:** Use `onMouseEnter`/`onMouseLeave` pattern to set `style` properties directly. This pattern is established throughout the codebase (nav items, list cards, prospect cards). Example:

```tsx
onMouseEnter={(e) => {
  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
  (e.currentTarget as HTMLElement).style.background = "var(--gold-bg)";
}}
onMouseLeave={(e) => {
  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
  (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
}}
```

### Pitfall 5: nuqs Param Collision with Existing `persona` Key

**What goes wrong:** Adding a `prospect` URL param while the existing `persona` param is already managed by `useSearch`. If Phase 8 creates a separate `useQueryStates` call for `prospect`, the two nuqs instances can conflict.

**Why it happens:** nuqs `useQueryStates` calls in the same component tree can interfere if they manage overlapping params.

**How to avoid:** Add `prospect: parseAsString.withDefault("")` directly to the EXISTING `useQueryStates` call in `use-search.ts`. Do not create a second `useQueryStates` instance.

### Pitfall 6: Search API Doesn't Accept Ad-Hoc Filter Overrides

**What goes wrong:** Advanced filters UI is built, but clicking "Apply Filters" does nothing because the search API route only accepts `personaId` (not arbitrary filter overrides).

**Why it happens:** `POST /api/search/apollo` only validates `{ personaId, page, pageSize }`. It fetches persona filters from the database internally.

**How to avoid:** Two approaches — planner must decide:
1. **Extend the API route** to accept optional `filterOverrides` body param, merge with persona filters in the route handler.
2. **Client-side filtering only** — don't pass filter overrides to Apollo, instead filter the returned results client-side. Limited but simpler.

**Recommended:** Option 1 (extend API) for real value — Apollo does the filtering at source. Low risk since the route already calls `translateFiltersToApolloParams()` which accepts `PersonaFilters`.

---

## Code Examples

### Slide-Over URL Param Integration

```typescript
// src/app/[orgId]/search/hooks/use-search.ts
// Add `prospect` to existing useQueryStates call:
const [searchState, setSearchState] = useQueryStates({
  persona: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  sortBy: parseAsString.withDefault("name"),
  sortOrder: parseAsString.withDefault("asc"),
  prospect: parseAsString.withDefault(""),  // NEW
});
```

### Persona Pill Component (translated to design system)

```tsx
// Persona pill — rest and active states
function PersonaPill({ persona, isActive, onSelect }) {
  return (
    <button
      onClick={() => onSelect(persona.id)}
      className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0"
      style={isActive ? {
        background: "var(--gold-bg)",
        border: "1px solid var(--border-gold)",
        color: "var(--gold-primary)",
      } : {
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        color: "var(--text-secondary-ds)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
          (e.currentTarget as HTMLElement).style.background = "var(--gold-bg)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
          (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
        }
      }}
    >
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: getPersonaColor(persona.id) }} />
      {persona.name}
    </button>
  );
}
```

### Bulk Actions Bar

```tsx
// Appears above results when selectedIds.size > 0
function BulkActionsBar({ selectedIds, results, onSelectAll, onAddToList, onExport, onEnrich }) {
  const allSelected = selectedIds.size === results.length && results.length > 0;

  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-4 py-3 mb-3"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          className="h-4 w-4 rounded cursor-pointer accent-[var(--gold-primary)]"
        />
        <span className="text-[13px]" style={{ color: "var(--text-secondary-ds)" }}>
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}
        </span>
      </div>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onAddToList}>
            <ListPlus className="h-4 w-4 mr-1.5" /> Add to List
          </Button>
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="gold" size="sm" onClick={onEnrich}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Enrich Selection
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Mapping ApolloPerson to ProspectCard Props

```typescript
// Adapter to use shared ProspectCard with Apollo search results
function mapApolloPersonToCardProps(person: ApolloPerson) {
  return {
    id: person.id,
    fullName: person.name || `${person.first_name} ${person.last_name}`,
    firstName: person.first_name,
    lastName: person.last_name,
    title: person.title || null,
    company: person.organization_name || person.organization?.name || null,
    location: [person.city, person.state, person.country].filter(Boolean).join(", ") || null,
    wealthTier: deriveWealthTier(person),  // from existing getWealthTier() logic
    workEmail: person.email || null,
    personalEmail: null,  // not from Apollo search
    phone: person.phone_numbers?.[0]?.raw_number || null,
    linkedinUrl: person.linkedin_url || null,
    aiSummary: person.headline || null,
    enrichmentSourceStatus: null,  // search results aren't enriched yet
  };
}
```

---

## What Exists vs What Needs Building

### Fully Built (reuse as-is)

| Component | Location | Status |
|-----------|----------|--------|
| `AddToListDialog` | `src/app/[orgId]/search/components/add-to-list-dialog.tsx` | Production-ready, no changes |
| `ProspectSlideOver` shell | `src/components/prospect/prospect-slide-over.tsx` | Built in Phase 6 — just needs triggering |
| `WealthTierBadge` | `src/components/ui/wealth-tier-badge.tsx` | Canonical shared version |
| `EnrichmentStatusDots` | `src/components/ui/enrichment-status-dots.tsx` | Production-ready |
| `ProspectCard` | `src/components/prospect/prospect-card.tsx` | Has checkbox, all fields |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Three variants already described in search.md |
| `useSearch` hook | `src/app/[orgId]/search/hooks/use-search.ts` | Just add `prospect` param |
| Apollo search API | `src/app/api/search/apollo/route.ts` | May need `filterOverrides` param |
| `PersonaCard` grid | `src/app/[orgId]/search/components/persona-card.tsx` | Keep for standalone persona page |

### Needs Building / Significant Update

| Component | Work Required |
|-----------|---------------|
| `search-content.tsx` | Major restructure: unified single-screen layout, wire all new components |
| `persona-pills.tsx` | NEW: horizontal pill row replacing full-page card grid in results context |
| `nl-search-bar.tsx` | NEW: NL textarea with search button (keyword passthrough) |
| `advanced-filters-panel.tsx` | NEW: collapsible filter panel, toggle button, filter inputs |
| `bulk-actions-bar.tsx` | NEW: select-all + bulk action buttons |
| `prospect-result-card.tsx` | ADAPT: use shared `ProspectCard`, add `onSelect` prop wiring, fix slide-over `onClick` |

### Needs Decision (planner must resolve)

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Ad-hoc filter overrides | (a) Extend search API, (b) client-side filtering | Extend API — more value, low risk |
| NL bar functionality | (a) Keyword passthrough, (b) Claude NL parsing | Keyword passthrough — Claude API not configured |
| ProspectCard duplication | (a) Use shared `ProspectCard` with adapter, (b) keep `ProspectResultCard` | Use shared + adapter |
| Persona grid view | (a) Remove it (pills only), (b) Keep as "no results" empty state | Keep as empty state with CTA link to personas page |

---

## State of the Art

| Old Approach | Current Approach | Changed In | Impact |
|--------------|------------------|------------|--------|
| Dropdown persona selector | Persona card grid + pills | Phase 5 redesign | More visual, shows filter tags |
| Table layout for results | Horizontal card stack | Design system rule (search.md) | Richer info, AI insight block |
| No slide-over | `ProspectSlideOver` Sheet | Phase 6 (built, not wired) | Slide-over exists but is disconnected |
| No URL slide-over state | `?prospect=<id>` nuqs param | Phase 8 (to build) | Shareable deep links to profiles |
| No bulk actions | Bulk select bar | Phase 8 (to build) | Power user workflow |

---

## Open Questions

1. **Ad-hoc filter overrides API extension**
   - What we know: The API route accepts `personaId` and fetches persona filters server-side. Advanced filter inputs in the UI currently have no way to influence the search.
   - What's unclear: Whether Phase 8 should extend the API to accept `filterOverrides`, or defer this to Phase 10 (Saved Personas) which is the natural home for filter editing.
   - Recommendation: Build the UI (filter inputs visible and functional) but mark the "Apply Filters" action as extending the search API — this is one discrete plan task.

2. **ProspectSlideOver content in Phase 8 vs Phase 9**
   - What we know: Phase 9 is explicitly "Prospect Profile (Screen D) — slide-over panel content." Phase 8's role is the trigger mechanism only.
   - What's unclear: How much of the slide-over shell should Phase 8 render vs Phase 9.
   - Recommendation: Phase 8 wires the open/close URL param and shows the `ProspectSlideOver` with basic Apollo data (name, title, company, contact circles). Phase 9 adds the full enrichment sections.

3. **Persona color dots in pills**
   - What we know: The stitch mockup shows colored dots beside persona names in pills (blue, purple, green).
   - What's unclear: Whether colors should be derived from persona ID hash (like avatar gradients) or stored in the database.
   - Recommendation: Derive from persona ID hash — no schema changes needed, consistent across sessions.

4. **Bulk "Enrich Selection" action**
   - What we know: The mockup has an "Enrich Selection" button. The enrichment pipeline (Inngest) requires prospects to be in the database first.
   - What's unclear: Whether "Enrich Selection" should (a) save to DB first then trigger enrichment, or (b) just show a "Save to list first" message.
   - Recommendation: "Enrich Selection" saves the selected prospects to a default "Enrichment Queue" list (or prompts for list selection via `AddToListDialog`) then triggers enrichment. This integrates with the existing pipeline without new infrastructure.

---

## Validation Architecture

Note: `workflow.nyquist_validation` is not present in `.planning/config.json` — treating as disabled. No automated test section required.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads of all source files — `src/app/[orgId]/search/**`, `src/components/prospect/prospect-card.tsx`, `src/components/ui/wealth-tier-badge.tsx`, `src/components/ui/enrichment-status-dots.tsx`, `src/lib/apollo/client.ts`, `src/lib/apollo/types.ts`
- `design-system/MASTER.md` — design system truth (typography, colors, surfaces, components)
- `design-system/pages/search.md` — search page overrides
- `stitch/elite_lead_discovery_search/code.html` — mockup HTML (structure and interaction reference)
- `.planning/phases/06-ui-redesign-foundation/06-SUMMARY.md` — confirmed Phase 6 deliverables
- `.planning/STATE.md` — confirmed Phase 7 complete, Phase 8 is next
- `.planning/ROADMAP.md` — phase scope definition

### Secondary (MEDIUM confidence)

- nuqs documentation patterns — inferred from existing `useSearch` hook usage (verified working in Phase 7)
- shadcn Sheet behavior — inferred from `ProspectSlideOver` existing usage

### Tertiary (LOW confidence, needs validation)

- Apollo API behavior for `filterOverrides` extension — untested, inferred from existing `translateFiltersToApolloParams()` code path

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and in use
- Architecture patterns: HIGH — derived directly from existing code + design spec
- Pitfalls: HIGH — identified from direct code inspection (duplicate components, no-op slide-over, missing API params)
- Open questions: MEDIUM — design decisions that need planner resolution

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — design system locked, no external API changes expected)
