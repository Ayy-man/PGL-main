# Agent Workflow UX Polish Audit

Scope: Agent's core daily journey — Search → Save persona → Bulk select → Add to list → Enrich → Prospect detail → Export → Activity / Analytics.
Reviewed against existing primitives: `shimmer.tsx`, `skeleton.tsx`, `loader.tsx`, `toast.tsx`, `confirmation.tsx`, `tooltip.tsx`, `empty-state.tsx`, `wealth-tier-badge.tsx`, `enrichment-status-dots.tsx`.
Parked hover-preview-cards feature (post-demo backlog) excluded.

---

## /[orgId] (Dashboard home)

### Finding: Gold "Download New List" CTA has no button-loading state
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/page.tsx:236-246
- **Current**: `<Link>` with gold background, no hover affordance tracked; navigating slow pages appears frozen.
  ```
  <Link href={`/${orgId}/search`} className="card-interactive inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold cursor-pointer transition-colors" ...
  ```
- **Fix**: Use `Button asChild` with gold variant and apply `active:scale-[.98]` via `press-effect` utility already present elsewhere; add a subtle 120ms hover lift (`card-glow` class is already applied to list cards — reuse the same token pack here for parity).

### Finding: Dashboard sparkline / stat cards fade in without staggered entrance
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/components/dashboard/dashboard-stat-cards.tsx:23-60
- **Current**: Three `StatCard` components render simultaneously; no `animationDelay` like the `row-enter` pattern used in `metrics-cards.tsx:61-62`.
- **Fix**: Map with an `index` and apply the identical `row-enter` + `style={{ animationDelay: \`${index * 60}ms\` }}` pattern already used in `MetricsCards` to match the luxury-reveal feel across the product.

### Finding: "12,400+ prospects indexed · Updated 2 hours ago" is hard-coded
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/discover-tab.tsx:85-99
- **Current**: Hard-coded marketing stat in the Discover hero pill. Contradicts the "we have real-time data" positioning if an agent notices it never changes between sessions.
- **Fix**: Either pass a real `prospect_count` prop sourced from the same `getPersonas`/count query already running server-side in `search/page.tsx`, or remove the pill. Do not ship a fake wealth-intelligence product with a lie above the search bar.

---

## /[orgId]/search (Discover + Saved Searches tabs)

### Finding: Bulk select uses native `<input type="checkbox">` with white accent, not themed
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/bulk-actions-bar.tsx:38-44, src/app/[orgId]/search/components/prospect-results-table.tsx:91-97, 175-185
- **Current**: `<input type="checkbox" className="h-4 w-4 rounded cursor-pointer accent-[var(--gold-primary)]" />` — the `accent-color` CSS is applied but renders as a raw browser checkbox with no border, no focus ring, no indeterminate state for "some selected".
- **Fix**: Replace with the shadcn `Checkbox` already used in the Add-to-List dialog (`search-content.tsx:1356`). It supports `checked={"indeterminate"}` — wire that in when `selectedCount > 0 && selectedCount < totalCount` to match mid-range SaaS polish (Linear, Attio).

### Finding: Native `confirm()` used for dismiss-prospect in table row
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/search-content.tsx:784-787
- **Current**:
  ```
  onDismiss={isSavedSearchMode ? (id) => {
    if (!confirm("Dismiss this prospect? You can undo this later.")) return;
    handleDismiss([id]);
  } : undefined}
  ```
  Breaks the dark-theme aesthetic — browser's system chrome appears over the luxury UI.
- **Fix**: Reuse the existing dismissal `<Dialog>` at line 1415-1437 (already wired for bulk). Route the single-dismiss through `setPendingDismissIds([id]); setDismissDialogOpen(true);` — no new code, just delete the confirm() branch.

### Finding: Enrichment-status column is a static triple-grey-dot stub
- **Tag**: [MICRO-ANIMATION]
- **Severity**: significant
- **File**: src/app/[orgId]/search/components/prospect-results-table.tsx:289-310
- **Current**: Three static `rgba(255,255,255,0.15)` circles with text "Not enriched". No pulse, no transition, no re-use of `EnrichmentStatusDots` primitive.
  ```
  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
  ```
- **Fix**: Replace with `<EnrichmentStatusDots sourceStatus={null} />` from `src/components/ui/enrichment-status-dots.tsx` (returns null when null, so the cell shows "Not enriched" text). Then for in-progress rows, pass the real `prospect.enrichment_source_status` so the glow (`boxShadow: 0 0 6px rgba(96,165,250,0.6)`) appears. This makes the enrichment dots across the app consistent.

### Finding: EnrichmentStatusDots `in_progress` / `pending` states have no animation
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: src/components/ui/enrichment-status-dots.tsx:20-33
- **Current**: `in_progress` gets a static blue glow — no pulse. Pending gets flat grey. The agent has no visual cue that enrichment is actively running after they click "Enrich Selection".
- **Fix**: Add `animate-pulse` (Tailwind built-in) when status === `"in_progress"`; add a slower custom `animate-breathe` for `"pending"`. Put the animation on the outer wrapper so the inner dot keeps its colored shadow. This is a 1-line change in `getDotStyle` + a className branch.

### Finding: Wealth Tier column is a static em-dash placeholder
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/prospect-results-table.tsx:237-245
- **Current**:
  ```
  <td className="whitespace-nowrap px-3 py-5">
    <span className="text-sm" style={{ color: "var(--text-ghost)" }}>—</span>
  </td>
  ```
  Unconditional em-dash. There is an existing `WealthTierBadge` primitive specifically sized for this table cell that's never imported.
- **Fix**: For enriched rows, render `<WealthTierBadge tier={prospect._savedSearchMeta?.wealth_tier} />`. For unenriched rows, render a "Locked — enrich to reveal" tooltip state. If wealth_tier isn't yet on the ApolloPerson shape, at minimum emit a Shimmer placeholder instead of an em-dash so the enrichment lifecycle is visible.

### Finding: "Save this search →" ghost link has no entrance — appears abruptly
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/discover-tab.tsx:124-145
- **Current**: Conditional render `{keywords.trim() && (<button>...)}` pops in with no transition.
- **Fix**: Wrap in a `<div className="animate-in fade-in slide-in-from-bottom-1 duration-250">` (same utility used for dossier crossfade on profile-view.tsx:640). One class.

### Finding: NLSearchBar has no debounce on live parameters — every keystroke hits child `onChange`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/nl-search-bar.tsx:33-42
- **Current**: `onChange` fires on every keystroke; parent receives them directly. The underlying search hook has its own 100ms debounce but parent `setSearchState` still fires per-keystroke, causing URL param writes.
- **Fix**: The underlying `use-search.ts` already debounces at line 244 — but `handleNLSearch` in search-content.tsx:380 fires on `Enter` only, so this is fine. What IS missing: onChange prop is wired in discover-tab.tsx but never used to update state. Either remove the unused `onChange` prop from NLSearchBar's interface (line 11) or actually debounce the call-site. Choose removal — simpler.

### Finding: Pagination buttons use `opacity-30 disabled:cursor-not-allowed` — no disabled focus ring
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/search-content.tsx:831-838, 864-872, 898-909, 997-1008
- **Current**: Four nearly-identical pagination button implementations with inline styles and no focus ring. Keyboard-only power agents (ctrl+arrow tab through pagination) can't see where focus lives.
- **Fix**: Extract to a local `<PageNavButton>` helper and add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-primary)]`. Also add `aria-current="page"` on the active page button (currently aria-less).

### Finding: "Jump to page" input reveal has no transition, looks like a glitch
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/search-content.tsx:944-996
- **Current**: The `...` button hard-swaps to a numeric input with no crossfade. On blur it snaps back just as abruptly.
- **Fix**: Wrap both branches in `<AnimatePresence>`-style approach using the `animate-in fade-in duration-150` Tailwind utility on the input; use `data-[state=open]` styling since it's controlled state. One-class change.

### Finding: `SkeletonRow` in search-content.tsx hand-rolls inline-styled pulse divs
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/search-content.tsx:41-52
- **Current**: Four hard-coded `<div style={{ background: "rgba(255,255,255,0.06)" }} />` with class `animate-pulse`. Doesn't use the real `Skeleton` or `ShimmerLine` primitive, so if the team later tunes the shimmer keyframes globally these won't move.
- **Fix**: Replace each `<div>` with `<Skeleton className="h-4 w-28 rounded" />` — the Skeleton primitive already carries the `shimmer-skeleton` class. Reduces 50 lines of inline style to 6.

### Finding: Saved-search table "Enriched" pill is unthemed grey square
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/prospect-results-table.tsx:167-174, 364-370
- **Current**:
  ```
  <span className="text-[10px] px-1.5 py-0.5 rounded"
    style={{ color: "var(--text-tertiary)", background: "rgba(255,255,255,0.05)" }}>
    Enriched
  </span>
  ```
  Looks like a disabled dev-debug badge, not the premium "we unlocked this prospect" moment. Not gold, not branded.
- **Fix**: Use a small gold-tinted badge: `background: rgba(212,175,55,0.1); color: var(--gold-text); border: 1px solid rgba(212,175,55,0.2)` — mirrors the existing `NEW` pill pattern on lines 208-214. Add a `CheckCircle2` icon (already imported elsewhere) for visual closure.

### Finding: FilterPillsRow pills have no selected-value preview in the pill label
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/filter-pills-row.tsx:103-136
- **Current**: Even after applying `industries = ["Finance", "Tech"]`, the pill still says just "Industry" with gold styling — the user has to click again to see what was applied.
- **Fix**: Show count when active: `{pill.label}{hasValue[pill.key] ? ` · ${count}` : ""}` — e.g. "Industry · 2". Pattern matches Linear / Attio filter pills.

### Finding: Advanced-filters `FilterInput` uses `;`-delimited raw strings — no tag chips
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/advanced-filters-panel.tsx:168-196
- **Current**: User types `"CEO; VP Finance; Director"` as a single string; no visual tokens. If they mistype the delimiter (comma vs semicolon) their filter is wrong with no feedback.
- **Fix**: Replace `<input>` with the existing `tag-input.tsx` primitive — chips on each `Enter` with X to remove. The primitive already exists; this screen just doesn't use it.

### Finding: Advanced-filters panel has no unsaved-changes warning when collapsing mid-edit
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/advanced-filters-panel.tsx:77-99 (toggle button)
- **Current**: User types 3 industries, clicks the toggle to collapse the panel — the unapplied text stays in local state but on `Clear` vs `Apply` the intent is lost. No guardrail.
- **Fix**: If the current input values differ from `currentFilters`, disable the collapse toggle OR show a tiny "• Unapplied" gold dot next to "Advanced Filters" label. Single `diffDetected` boolean.

### Finding: Filter pill dropdowns close on outside-click without applying pending text
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/search/components/filter-pills-row.tsx:46-56
- **Current**: `onMouseDown` outside closes the pill AND discards the typed text. User types "Finance" in the Industry pill, clicks outside to check another filter, their Industry entry vanishes with no toast.
- **Fix**: On outside-click with non-empty value, either auto-apply (intent is clear) or persist the local text and keep the pill visually "pending" (gold ring). Intent-apply is less surprising.

### Finding: `BulkActionsBar` has no disabled-state + tooltip for Assistant (read-only) role
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: src/app/[orgId]/search/components/bulk-actions-bar.tsx:18-82
- **Current**: `onAddToList`, `onExport`, `onEnrich`, `onDismiss` all render as active buttons regardless of role. Assistant users can click → hit 403 → confused.
- **Fix**: Accept `canEdit?: boolean` prop; wrap each write button in `<Tooltip><TooltipContent>Assistants cannot add to lists or trigger enrichment.</TooltipContent></Tooltip>` and set `disabled={!canEdit}`. Export CSV stays enabled (it's a read-operation on the client). Thread `canEdit` down from `search-content.tsx` — currently that file has zero role checks (confirmed via grep).

### Finding: Bulk Add-to-List dialog has no search/filter for long list libraries
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/search-content.tsx:1342-1386
- **Current**: `max-h-[300px] overflow-y-auto` scroll of all lists. A tenant with 50+ lists has to scroll blindly.
- **Fix**: Add a small `<Input placeholder="Search lists..." />` above the list array and filter client-side. Trivial `useState` + `.filter(l => l.name.toLowerCase().includes(q))`.

### Finding: Create-new-list inline input has no Esc / Cmd+Enter affordance hint
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/search-content.tsx:1263-1322
- **Current**: Enter/Escape work but there's no visual cue — `<kbd>Enter</kbd>` hints are common in premium tools.
- **Fix**: Add tiny `<kbd>` helper row under the input: `<span className="text-[10px] text-muted-foreground"><kbd>↵</kbd> to create · <kbd>Esc</kbd> to cancel</span>`.

### Finding: `row-hover-gold` on prospect rows has no press state
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/search/components/prospect-results-table.tsx:155-164
- **Current**: `className="row-hover-gold group transition-colors duration-150 cursor-pointer"` — hover works but clicking feels dead until the slide-over opens (noticeable on slower connections).
- **Fix**: Add `active:bg-[var(--gold-bg)]` or `press-effect` utility (used on PersonaCard). Instant feedback on pointerdown before the slide-over animation starts.

---

## /[orgId]/personas (Saved Searches library)

### Finding: `PersonaCard` deletion not gated for Assistant
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/personas/components/persona-card-grid.tsx:26-37
- **Current**: `handleDeletePersona` is always available; PersonaCard doesn't receive `canEdit`. Assistant deletes -> server action rejects -> UI reverts. Confusing.
- **Fix**: Fetch `role` in `personas/page.tsx` (already available via `user.app_metadata.role`), pass `canEdit` prop into `PersonaCardGrid` → `PersonaCard`. Hide the delete button (or render disabled with tooltip) for assistants.

### Finding: Persona delete action has NO confirmation dialog — one click destroys
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: src/app/[orgId]/personas/components/persona-card-grid.tsx:26-37
- **Current**:
  ```
  const handleDeletePersona = useCallback(async (personaId: string) => {
    const previousPersonas = personas;
    setPersonas(prev => prev.filter(p => p.id !== personaId));
    toast({ title: "Saved search deleted" });
    try { await deletePersonaAction(personaId); } catch { ... rollback ... }
  }
  ```
  No `confirm()`, no dialog. A saved search can represent thousands of scraped prospect records. Optimistic deletion is fine but there must be user intent confirmation.
- **Fix**: Use the existing `<Confirmation>` primitive inside a `<Dialog>` (or match the pattern at search-content.tsx:1415 for bulk dismiss). Title: "Delete saved search?", destructive variant, with "Cancel / Delete" buttons. The rollback path stays.

### Finding: Persona grid entrance is simultaneous — no stagger despite premium feel
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/personas/components/persona-card-grid.tsx:58-61
- **Current**: `.map((persona) => <PersonaCard ...>)` — all cards mount at once.
- **Fix**: Wrap card with an `animate-stagger-in` (utility already used at lists/components/list-grid.tsx:80-82) and `style={{ animationDelay: \`${index * 50}ms\` }}`. Existing utility, zero new CSS.

---

## /[orgId]/lists (Lists index)

### Finding: Delete-list uses native `confirm()` (luxury break)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-grid.tsx:25-39
- **Current**:
  ```
  if (!confirm("Are you sure you want to delete this list? This cannot be undone.")) return;
  ```
  Same pattern violation as the search dismiss — browser chrome, not themed.
- **Fix**: Use `<Confirmation>` primitive inside a `<Dialog>` with `isDestructive`, wire `handleDelete` to the `onConfirm` prop. Existing pattern; the primitive was built for exactly this.

### Finding: Delete list has no optimistic member-count or undo toast
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-grid.tsx:25-39
- **Current**: Success toast is just `title: "List deleted"` — no restore button. A mis-click loses a list containing hundreds of enriched prospects.
- **Fix**: Use the toast's `action` slot (Radix toast supports it in `toast.tsx`) with an Undo button that calls a restore API. If no restore API exists, at minimum increase the destructive confirmation's friction (type-to-confirm: "type the list name").

### Finding: List cards don't gate edit actions by role
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-grid.tsx:114-137
- **Current**: Export (OK for assistants) + Delete (NOT OK) render the same regardless of role.
- **Fix**: Pass `canEdit` from `lists/page.tsx` (role is already in `user.app_metadata`). Hide Delete for assistants; keep Export.

### Finding: `CreateListDialog` trigger has no disabled-state for Assistant
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/lists-page-client.tsx:34, 43
- **Current**: Two `<CreateListDialog>` triggers — one in the header, one in the empty state. Both always clickable.
- **Fix**: Accept `canEdit` → render the trigger as a disabled Button with `<Tooltip>Only agents and admins can create lists</Tooltip>` when false.

---

## /[orgId]/lists/[listId] (List detail, bulk enrich, export)

### Finding: No bulk selection on list members — cannot bulk-remove or bulk-re-enrich
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:186-331
- **Current**: Each row has individual Re-enrich + Delete buttons. No "Select All" header checkbox, no `BulkActionsBar`. A list of 500 prospects requires 500 individual clicks to re-enrich stale data.
- **Fix**: Add a leading checkbox column + re-use `BulkActionsBar` from search. Actions: Bulk Re-enrich, Bulk Remove, Bulk Status Change. The primitive + patterns exist — just wire the state (`Set<string>` of member IDs, same approach as `search-content.tsx:122-127`).

### Finding: Remove from list uses native `confirm()`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:156-168
- **Current**: `if (!confirm("Remove this prospect from the list?")) return;` — browser chrome.
- **Fix**: Replace with `<Confirmation>` dialog. Alternatively, since removal is already optimistic + has rollback, just drop the confirm() entirely and rely on the toast's undo action (which should be added).

### Finding: List member table has no sticky header on long lists
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:188-200
- **Current**: `<Table>` header scrolls out of view. Lists with 200+ members lose column context.
- **Fix**: Add `<TableHeader className="sticky top-0 z-10 bg-background">` — mirroring what's done in `prospect-results-table.tsx:81-84`.

### Finding: `EnrichmentDot` uses raw colored divs, doesn't use `EnrichmentStatusDots` primitive
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:65-102
- **Current**: A local `EnrichmentDot` renders a single green/red/grey dot per row. Doesn't show the 5-source breakdown (ContactOut / Exa / SEC / Market / Claude) that the primitive exposes, and has no pulse on `in_progress`.
- **Fix**: Replace with `<EnrichmentStatusDots sourceStatus={member.prospect.enrichment_source_status} />` (already fetched on the prospect detail page — add to the query on `lists/queries.ts`). Gives per-source visibility without extra UI weight.

### Finding: Re-enrich button shows spinner for exactly 2 seconds then snaps — not tied to real status
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:170-183
- **Current**:
  ```
  setTimeout(() => setEnrichingId(null), 2000);
  ```
  The spinner has nothing to do with actual enrichment completion. If the Inngest job takes 30s (common), the UI lies. If it finishes in 500ms, the UI still spins for 1.5s.
- **Fix**: Remove the `setTimeout`. Listen to the same Supabase Realtime UPDATE pattern used in `profile-view.tsx:243-261` — subscribe to the `prospects` table, filter on `id=eq.${prospect.id}`, clear the spinner when `enrichment_status` transitions to `complete` or `failed`.

### Finding: CopyButton success state has no toast, only in-button color change
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:104-142
- **Current**: Click email icon → icon turns green for 1.5s. No toast. No announce. Screen readers miss the action entirely.
- **Fix**: Call `toast({ title: "Email copied", description: text })` on copy. Existing `useToast` hook is already imported at line 28.

### Finding: Removed-member toast has no Undo action
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/lists/components/list-member-table.tsx:156-168
- **Current**: `toast({ title: "Prospect removed from list" })` — no way back unless you remember the name and re-add from search.
- **Fix**: Use toast `action` slot with an Undo button that restores to local state and re-calls the `addToListAction`. Optimistic member order can be preserved via the `previousMembers` snapshot already captured at line 159.

---

## /[orgId]/prospects/[prospectId] (Prospect detail / dossier)

### Finding: Internal Notes textarea not gated by canEdit
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/components/prospect/profile-view.tsx:580-624
- **Current**: `canEdit` is passed to `ProfileHeader` but the notes textarea + Save button always accept input. Assistant types notes → PATCH 403 → content lost.
- **Fix**: Set `readOnly={!canEdit}` on the textarea; render the Save button as disabled with a `<Tooltip>Assistants cannot edit notes</Tooltip>`.

### Finding: `handleSaveNote` has no optimistic state — button waits for round-trip
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/components/prospect/profile-view.tsx:319-345
- **Current**: Saving shows `Loader2` + "Saving..." for the full network duration. Fine for slow nets, but there's no "Saved ✓" transient state.
- **Fix**: After success, briefly flip the button label to "Saved ✓" with `CheckCircle2` icon for 1.5s before returning to "Save Note". Matches the ghost copy-button pattern on lists.

### Finding: Activity-feed panel has no optimistic row when user logs an activity
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: src/components/prospect/profile-view.tsx:221-224 (handleActivityCreated)
- **Current**: `setRefreshTrigger(prev => prev + 1)` forces a full re-fetch. The user sees the composer clear → ~300ms gap → row appears. No prepend animation.
- **Fix**: Before the refetch, prepend the new activity entry optimistically to the feed state with a `row-enter` className. Then reconcile when the real refresh returns.

### Finding: Wealth-tier badge entrance has no pulse-on-appear
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/components/ui/wealth-tier-badge.tsx:39-56
- **Current**: Badge renders flat when `enrichment_status === "complete"`. The reveal of "this prospect is a $500M+ target" should feel like a reward.
- **Fix**: Add a one-shot animation on mount using the existing `animate-in fade-in zoom-in-95` utilities (already in use for tooltips). Add a subtle 1-second gold ring pulse at mount — a bespoke `@keyframes gold-pulse` in globals.css, 1 iteration only.

### Finding: SECFilingsTable uses plain `rounded-md border` — developer-default
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/components/prospect/sec-filings-table.tsx:58-80
- **Current**:
  ```
  <div className="overflow-hidden rounded-md border">
    <table className="w-full">
      <thead>
        <tr className="bg-background">
  ```
  No gold accent, no surface-card, no subtle gradient background. Looks like a shadcn demo, not a luxury wealth product.
- **Fix**: Apply `className="surface-card overflow-hidden rounded-[14px]"` to the wrapper (matches the other panels on this page) and use `var(--bg-card-gradient)` on the `<thead>` instead of `bg-background`.

### Finding: Prospect detail `text-muted-foreground` contrast is low on secondary fields
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/components/prospect/profile-view.tsx:486, 510, 523, 586-588
- **Current**: Multiple `text-muted-foreground` uses where the actual CSS variable resolves to ~40% opacity (see `var(--text-tertiary, rgba(232,228,220,0.4))` pattern elsewhere). Reading tenant notes metadata and timestamps feels washed out.
- **Fix**: Audit and bump secondary timestamps / "Verified" tags to `var(--text-secondary-ds)` (~55% opacity) and reserve `text-muted-foreground` for true tertiary ghost text. One-shot find/replace on this file.

### Finding: Find Lookalikes button uses inline hover listeners instead of CSS hover
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/components/prospect/profile-view.tsx:374-395
- **Current**: 12 lines of `onMouseEnter`/`onMouseLeave` DOM manipulation for a simple border color change. Fights React, breaks if the parent re-renders mid-hover.
- **Fix**: Move to Tailwind arbitrary hover: `hover:border-[rgba(212,175,55,0.15)] transition-colors`. Delete the handlers.

### Finding: ProspectSlideOver (used from search) has no canEdit gating
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/components/prospect/prospect-slide-over.tsx (confirmed no canEdit prop)
- **Current**: `onEnrich`, `onAddToList`, Re-enrich button — all render for assistants.
- **Fix**: Accept `canEdit?: boolean` prop from the caller (search-content thread). Gate the Enrich / Add-to-List / Re-enrich CTAs with disabled state + tooltip.

---

## /[orgId]/exports (Export log)

### Finding: No empty-state guidance when filters return zero rows
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/exports/components/export-log-client.tsx:42-103 (fetch logic), rendering below
- **Current**: The `ExportLogClient` renders the bare EmptyState primitive with default props only when there are truly no entries for the tenant, but filtered zero-result states look identical. User can't tell "no exports this month" from "broken API".
- **Fix**: When `total === 0 && (startDate || endDate)`, render `EmptyState` with description "No exports match the selected dates. Try widening the range." and an explicit "Clear filters" button (child) that resets `startDate`/`endDate`.

No other export-screen findings.

---

## /[orgId]/dashboard/activity (Activity log — admin only)

### Finding: Activity filters have no Clear button and no date preset shortcuts
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/components/activity/activity-log-viewer.tsx:87-136
- **Current**: Action Type + Start Date + End Date inputs, no "Last 7d / 30d" preset chips, no "Clear" action. Power-users filter manually every time.
- **Fix**: Add a row of preset chips: `[Today] [7d] [30d] [Clear]` that call `setStartDate` / `setEndDate`. Match the segmented toggle pattern on `dashboard/analytics/page.tsx:105-130`.

### Finding: Loading / empty state uses plain `<p>` centered text instead of `EmptyState`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/components/activity/activity-log-viewer.tsx:140-147
- **Current**:
  ```
  <div className="flex h-64 items-center justify-center">
    <p className="text-muted-foreground">Loading activity log...</p>
  </div>
  ```
- **Fix**: Use `<Skeleton>` rows during loading (match analytics page pattern at `dashboard/analytics/page.tsx:141-153`), and `<EmptyState icon={Activity} title="No activity found" description={...} />` for zero state.

### Finding: Activity table row user is a truncated UUID, not a name
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/components/activity/activity-log-viewer.tsx:173-175
- **Current**: `<td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.user_id.slice(0, 8)}...</td>` — shows `a1b2c3d4...`. Admins can't tell who did what.
- **Fix**: Resolve user display names same way `page.tsx` (dashboard) does via `userMap` (`users` table join on unique user_ids). Fall back to the truncated id only if the name isn't resolvable. Pattern is already in `exports/page.tsx:50-62`.

### Finding: Expanded-metadata `<pre>` has no syntax highlighting or copy button
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/components/activity/activity-log-viewer.tsx:199-203
- **Current**: Raw JSON dump in a grey `<pre>`. Useful for debug; bad for the admin quickly reading a reason.
- **Fix**: Add a small copy-to-clipboard icon on the `<pre>` (reuse the CopyButton primitive concept from list-member-table.tsx:104-142). Truncate long values with hover reveal.

---

## /[orgId]/dashboard/analytics (Analytics — admin only)

### Finding: MetricsCards large numbers have no count-up animation
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/components/charts/metrics-cards.tsx:69-79
- **Current**:
  ```
  <p className="font-serif font-bold leading-none" style={{ fontSize: "36px", ... }}>
    {value.toLocaleString()}
  </p>
  ```
  Big 36px gold "12,345" just appears. Every premium analytics dashboard (Linear, Vercel, Stripe) animates count-up.
- **Fix**: Add a small `useCountUp(value, 600ms)` hook (or framer-motion's `useSpring`/`animate`). Triggered inside the existing `row-enter` animation window so both effects happen together.

### Finding: User Breakdown table uses inline onMouseEnter handlers for row hover
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/dashboard/analytics/page.tsx:200-232
- **Current**: 8 lines of `onMouseEnter`/`onMouseLeave` per row just to set `background: rgba(255,255,255,0.02)`.
- **Fix**: `className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"`. Delete both handlers. Same pattern applied throughout the profile-view audit item.

### Finding: User breakdown shows user_id slice — not user name
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/dashboard/analytics/page.tsx:214-216
- **Current**: `<td className="px-4 py-3 font-mono text-xs text-foreground">{user.userId.slice(0, 8)}...</td>` — same UUID anti-pattern as the activity log.
- **Fix**: Resolve names via a `users` table join and display `full_name || user.userId.slice(0, 8)`. Mirror the dashboard home pattern.

### Finding: Analytics loading skeletons are plain grey blocks — no shimmer
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/dashboard/analytics/page.tsx:141-153
- **Current**: `<div className="h-28 animate-pulse surface-card rounded-[14px]" />` — just `animate-pulse`, no shimmer gradient.
- **Fix**: Use `<ShimmerBlock height="h-28" />` or `<ShimmerCard />` from `shimmer.tsx` — those use the shimmer-skeleton class (skeleton.tsx:9) which is tuned globally. Keep the surface-card wrap for the matched card shape.

### Finding: Date-range segmented toggle has no keyboard arrow-key navigation
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/dashboard/analytics/page.tsx:106-131
- **Current**: Three `<button>` elements; tab to each, Enter to activate. Radix `RadioGroup` would provide arrow keys + proper aria semantics.
- **Fix**: Convert to a small `<div role="radiogroup">` with `role="radio"` buttons + arrow-key handler, or adopt `@radix-ui/react-toggle-group` (already a transitive dep via shadcn). ~20 line rewrite.

---

## Top 15 impact-to-effort picks

1. **Replace native `confirm()` calls** (search dismiss, list delete, list member remove) with existing `<Confirmation>` + `<Dialog>` pattern. Three files, luxury-critical. (src/app/[orgId]/search/components/search-content.tsx:785, src/app/[orgId]/lists/components/list-grid.tsx:26, src/app/[orgId]/lists/components/list-member-table.tsx:157)
2. **Add confirmation to persona delete** — currently a one-click destroyer of saved searches that contain thousands of prospects. (src/app/[orgId]/personas/components/persona-card-grid.tsx:26)
3. **Use `EnrichmentStatusDots` primitive in search results table + list member table** — today both files render local static dots, losing the multi-source intelligence story. (prospect-results-table.tsx:289, list-member-table.tsx:65)
4. **Animate `in_progress` state in `EnrichmentStatusDots` primitive** — one-line `animate-pulse` addition; immediately makes "enrichment is running" visible everywhere. (src/components/ui/enrichment-status-dots.tsx:20-33)
5. **Thread `canEdit` through BulkActionsBar, ProspectSlideOver, ListGrid, PersonaCardGrid, Notes textarea** — Assistant role currently sees write buttons that 403 on click. Five files, mostly prop plumbing. (see findings above)
6. **Fix fake "Re-enrich" spinner timing** in list-member-table.tsx:182 — subscribe to Realtime instead of `setTimeout(2000)`. Eliminates the lying UI.
7. **Add bulk selection + actions bar to list-member-table** — today bulk re-enrich on a 500-member list is impossible without 500 clicks. Reuse BulkActionsBar. (src/app/[orgId]/lists/components/list-member-table.tsx:186)
8. **Use `Checkbox` primitive (with indeterminate) in BulkActionsBar and ProspectResultsTable** — current native `<input type=checkbox>` looks unpolished and lacks indeterminate. (bulk-actions-bar.tsx:38, prospect-results-table.tsx:91)
9. **Resolve user names** in activity log + analytics user breakdown — admins currently see `a1b2c3d4...` UUID slices. Pattern exists in dashboard/page.tsx. (activity-log-viewer.tsx:173, dashboard/analytics/page.tsx:214)
10. **Add undo to "Prospect removed from list" toast** — destructive action with no recovery path. Use toast action slot. (list-member-table.tsx:161)
11. **Stagger stat-cards + persona-cards entrance** — `row-enter` + `animationDelay` already works on MetricsCards and ListGrid; two screens lag behind. (dashboard-stat-cards.tsx:23, persona-card-grid.tsx:58)
12. **Show applied filter count inside FilterPillsRow pill labels** — users can't tell which pills are active without reopening them. (filter-pills-row.tsx:103-136)
13. **Replace `text-muted-foreground` (which resolves to ~40%) with `--text-secondary-ds` (~55%)** on prospect-detail timestamps and metadata — current contrast feels low-budget. (profile-view.tsx:486, 510, 523, 586-588)
14. **Animate wealth-tier badge on first appearance** — this is the "reveal the whale" moment; flat render wastes the narrative. (wealth-tier-badge.tsx:39)
15. **Count-up animation on analytics MetricsCards large numbers** — premium analytics expectation (Linear, Stripe). Small helper hook, large perceived-quality lift. (metrics-cards.tsx:69)
