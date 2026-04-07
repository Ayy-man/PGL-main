# Phase 29: Lead Discovery UI Redesign — Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the Lead Discovery page (`/[orgId]/search`) from its current single-column stacked layout into a two-tab experience:

1. **Discover tab** (default) — a clean search/create entry point with the NL search bar, filters, and a preview of existing saved searches.
2. **Saved Searches tab** — a two-column layout with a collapsible sidebar rail listing saved searches on the left and the selected search's results on the right.

This is a **frontend-only restructuring**. No new API routes, no schema changes. All existing backend endpoints (`/api/search/[id]/prospects`, `/api/search/[id]/refresh`, `/api/search/[id]/dismiss`, etc.) and Supabase queries are reused as-is.

</domain>

<decisions>
## Implementation Decisions

### Page-level navigation
- **D-01:** Two tab buttons at the top of the page: `Discover` and `Saved Searches` (exact labels).
- **D-02:** `Discover` is the default tab on page load.
- **D-03:** Tabs are rendered within the page content area (not the global nav). Tab switching is client-side state — no route change needed.

### Discover tab (Tab 1)
- **D-04:** Centered layout. Headline: "Find high-net-worth prospects" (or similar — Claude's discretion on exact copy).
- **D-05:** NL search bar below the headline, full-width.
- **D-06:** Collapsible filters panel below the NL bar (the existing `AdvancedFiltersPanel` component — keep as-is, just reposition).
- **D-07:** Two action buttons below filters: `[Search]` and `[Save as new search]`.
- **D-08:** Below the search form, show a shortcut preview list of existing saved searches (name + prospect count). Clicking one navigates to the Saved Searches tab with that search selected.
- **D-09:** Results NEVER appear on Tab 1. Submitting a search (or selecting a saved search shortcut) navigates to the Saved Searches tab.

### Saved Searches tab (Tab 2) — sidebar rail
- **D-10:** Two-column layout: left sidebar rail + right results panel.
- **D-11:** Sidebar expanded width: ~240px. Lists all saved searches by name, each with a colored dot (using the existing `getPersonaColor` hashing logic from `persona-pills.tsx`).
- **D-12:** Sidebar collapsed width: ~48px. Shows colored dots only — no text. Tooltip on hover shows the full search name.
- **D-13:** Collapse is **manually toggled** by the user (not auto-triggered by search selection). A toggle button (chevron) at the top or edge of the sidebar controls expand/collapse.
- **D-14:** A `+ New` button at the bottom of the sidebar opens the create-new-search flow (same `PersonaFormDialog` as before).
- **D-15:** Active/selected search is highlighted with gold accent (`--border-gold`, `--gold-bg`) — consistent with existing pill active state.

### Saved Searches tab (Tab 2) — view header
- **D-16:** When a saved search is selected, the main content area shows the **saved search name as the primary `h1`** (not "Lead Discovery"). The page title "Lead Discovery" is only visible as the tab label.
- **D-17:** Immediately below the h1: a subtitle line — `{N} prospects • Last refreshed: {X} ago [↺ Refresh]`. The refresh button (circular arrow icon, `RefreshCw` from lucide) is inline in this subtitle.
- **D-18:** When no saved search is selected (user switches to Tab 2 with nothing active): show an empty state prompting the user to select a search from the sidebar, or a "No saved searches yet" empty state if the list is empty.

### NL search behavior
- **D-19:** Any search submission (saved or ad-hoc NL keyword search) navigates to Tab 2 and shows results in the right panel.
- **D-20:** Ad-hoc NL keyword searches (not saved) show results in the right panel without a saved search being highlighted in the sidebar. The sidebar remains visible.

### Design system consistency
- **D-21:** All existing CSS variables apply unchanged: `--gold-primary`, `--gold-bg`, `--border-gold`, `--bg-elevated`, `--bg-card-gradient`, `--border-default`, `--border-subtle`, `--text-primary-ds`, `--text-secondary-ds`, `--text-tertiary`.
- **D-22:** Sidebar item hover states follow the existing pill hover pattern (`--gold-bg` background on hover, `--border-hover` border).
- **D-23:** Sidebar collapse/expand animation: CSS transition on width (200ms ease) — same pattern used elsewhere in the app.

### Claude's Discretion
- Exact empty-state copy and icon when no saved search is selected in Tab 2
- Whether to persist sidebar collapse state in `localStorage`
- Exact padding/spacing within the sidebar items
- Whether the "Discover" tab shows saved search shortcuts as cards or a compact list (user said "list preview" — Claude decides the visual density)
- Transition animation between Tab 1 and Tab 2

</decisions>

<specifics>
## Specific Ideas

- User specifically wants a "button to go to saved searches, with a list preview" on the Discover tab — not just a tab button, but an actual preview shortcut visible on Tab 1.
- The sidebar dot colors use the existing `getPersonaColor(id)` hashing function from `persona-pills.tsx` — reuse exactly.
- Collapsed sidebar shows dots only — no names, no counts. Hover tooltip reveals the full name.
- The refresh button (`↺`) lives inline in the subtitle of the view header, not as a standalone toolbar row like the current implementation.
- "Saved Searches" was already renamed from "Personas" in Phase 28 (user-facing strings only — keep DB/API names as-is).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current search page (to be refactored)
- `src/app/[orgId]/search/components/search-content.tsx` — The 800+ line main component. The entire render tree, state management, and event handlers need to be restructured into the two-tab layout.
- `src/app/[orgId]/search/page.tsx` — Server component that loads personas + lists and passes to SearchContent.

### Components to reuse as-is (no logic changes)
- `src/app/[orgId]/search/components/advanced-filters-panel.tsx` — Collapsible filters panel. Reuse on Tab 1.
- `src/app/[orgId]/search/components/nl-search-bar.tsx` — NL search bar. Reuse on Tab 1.
- `src/app/[orgId]/search/components/prospect-results-table.tsx` — Results table. Reuse in Tab 2 right panel.
- `src/app/[orgId]/search/components/bulk-actions-bar.tsx` — Bulk actions. Reuse in Tab 2 right panel.

### Components to replace/refactor
- `src/app/[orgId]/search/components/persona-pills.tsx` — Horizontal pills. Replace with vertical sidebar rail in Tab 2. Reuse `getPersonaColor` color logic.
- `src/app/[orgId]/search/components/search-toolbar.tsx` — May contain refresh/dismiss UI. Functionality moves into the view header subtitle (D-17) and the saved search toolbar within the right panel.

### Phase 28 context (saved search logic — must be preserved)
- `.planning/phases/28-saved-search-incremental-refresh-dismiss-and-delete/28-CONTEXT.md` — All Phase 28 saved search behaviors (dismiss, refresh, NEW badge, show dismissed toggle, enriched status) must work unchanged within the new layout.

### Design system
- `/Users/aymanbaig/.claude/projects/-Users-aymanbaig-Desktop-Manual-Library-noSync-PGL-main/memory/MEMORY.md` — Common CSS variable gotchas, CardContent padding overrides.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getPersonaColor(id)` in `persona-pills.tsx` — Deterministic color from persona ID. Copy or import for the new sidebar rail.
- `formatRefreshedAgo(dateStr)` in `search-content.tsx` — Relative time formatting. Move to a shared util or keep in the refactored component.
- `savedProspectToApolloPerson()` in `search-content.tsx` — Type mapping helper. Must be preserved.
- `SkeletonRow` in `search-content.tsx` — Skeleton for loading state. Reuse in Tab 2 results panel.
- `PersonaFormDialog` (imported from `personas/components`) — Create new search dialog. Reuse from the sidebar `+ New` button.

### Established Patterns
- Active state styling: `background: var(--gold-bg); border: 1px solid var(--border-gold); color: var(--gold-primary)` — already used in persona pills, carry into sidebar.
- Saved search mode detection: `isSavedSearchMode` boolean state drives which results to show. This pattern stays — just moves into Tab 2.
- `useSearch` hook manages search state and Apollo calls. Continue using it; the hook interface doesn't change.

### Integration Points
- Tab 2 receives `personas`, `lists`, `orgId` as props (same as current SearchContent).
- The `useSearch` hook returns `searchState`, `setSearchState`, `results`, `pagination`, `isLoading`, `error`, `executeSearch`, `setFilterOverrides` — all still needed in Tab 2.
- Saved search state (`savedProspects`, `dismissedCount`, `lastRefreshedAt`, `totalApolloResults`, `showDismissed`, `isRefreshing`, `isSavedSearchMode`) — all move to Tab 2.
- The `PersonaSlideOver` for viewing prospect profiles stays in Tab 2.

</code_context>

<deferred>
## Deferred Ideas

- Initial discussion explored a "collapsible top section" (vertically collapsing the NL bar + pills inline) — abandoned in favor of the two-tab layout.
- Advanced filter state visible in the collapsed sidebar (showing active filter chips) — consider for a future polish phase.
- Persisting the active saved search across page navigation (URL-based routing for Tab 2's selected search) — future phase.

</deferred>

---

*Phase: 29-lead-discovery-ui-redesign-collapsible-search-rail-and-view-*
*Context gathered: 2026-04-07*
