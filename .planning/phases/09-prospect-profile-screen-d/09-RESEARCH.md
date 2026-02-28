# Phase 9: Prospect Profile (Screen D) — Research

**Researched:** 2026-03-01
**Domain:** Slide-over panel redesign + full profile page redesign (React/Next.js 15, Radix UI Sheet, Tailwind CSS variables)
**Confidence:** HIGH

---

## Summary

Phase 9 is a UI redesign of two surfaces that already exist with working business logic: the `ProspectSlideOver` component (480px Sheet panel) and the `ProfileView` component (full page at `/[orgId]/prospects/[prospectId]`). All data fetching, enrichment triggering, activity logging, and API wiring is already complete from Phase 3. This phase is strictly cosmetic — no new routes, no new API endpoints, no schema changes.

The slide-over panel (`src/components/prospect/prospect-slide-over.tsx`) was already rebuilt in Phase 5 using the Radix UI Sheet with design system tokens, matching the 7-section spec from `design-system/pages/prospect-detail.md`. The full profile page (`src/components/prospect/profile-view.tsx`) also uses design tokens but predates the Phase 5/7 design system pass and still carries some structural inconsistencies (uses `bg-card` instead of `surface-card` utility, mixed token usage, lacks the tab bar and two-column layout specified in the design system).

The primary work is: (1) audit and clean up the slide-over panel against the `prospect-detail.md` spec, (2) rebuild the full profile page to match the two-column layout + tab bar + breadcrumb spec, and (3) wire the slide-over into the Phase 8 search results page (if that page renders ProspectCard clicks without a slide-over today).

**Primary recommendation:** Do not rebuild from scratch. Refactor the existing ProspectSlideOver and ProfileView components section by section against the design-system spec. The data shapes, types, and enrichment logic are already correct.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROF-01 | Clicking a prospect opens a profile view with consolidated data | ProspectSlideOver already exists; Phase 9 redesigns its visual layer |
| PROF-02 | Profile view triggers lazy enrichment if data is missing or stale (>7 days) | Already implemented in page.tsx fire-and-forget; no changes needed |
| PROF-03 | ContactOut integration enriches personal email and phone on profile view | contact_data JSONB field already renders in ProfileView; needs token cleanup |
| PROF-04 | Exa.ai integration enriches web presence, news mentions, company data, wealth signals | web_data renders in WealthSignals component; needs visual redesign as "intelligence cards" |
| PROF-05 | SEC EDGAR integration pulls insider transaction data (Form 4) for public company execs | insider_data renders in both views; needs SEC Filings tab on full page + improved table |
| PROF-06 | Claude AI generates a 2-3 sentence "Why Recommended" summary from enriched data | ai_summary field renders in both views with gold left-border; already matches spec |
| PROF-07 | Enrichment status indicators show loading/complete/failed state for each data source | EnrichmentStatus (full page) and slide-over enrichment progress section already built; needs Enrichment Tab on full page |
| PROF-08 | Enriched data is cached in database with timestamp for staleness checks | Already implemented (last_enriched_at, staleness check in page.tsx) |
| PROF-09 | User can add prospect to a list directly from profile view | "Add to List" in ProfileView uses DropdownMenu; needs proper "+ Add to List" pill in slide-over Lists section |
| PROF-10 | "Find Similar People" button triggers lookalike discovery flow | LookalikeDiscovery component exists; needs "Find Lookalikes" button in full profile header per design spec |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-dialog` | via shadcn | Sheet (slide-over) primitive | Already powering ProspectSlideOver via `src/components/ui/sheet.tsx` |
| `lucide-react` | installed | Icons throughout both views | Only icon source per MASTER.md |
| `next/navigation` | Next.js 15 | `useRouter`, `usePathname`, `useSearchParams` | URL state for `?prospect=<id>` query param |
| `nuqs` | installed | URL search param syncing | Already used for search URL state; use for `?prospect=<id>` |
| Tailwind CSS | installed | All styling via CSS variables | CSS variable tokens already defined in globals.css |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-tabs` | via shadcn | Tab bar on full profile page | Tab bar with 6 tabs (Overview, Activity, SEC Filings, Enrichment, Notes, Lists) |
| shadcn `Sheet` | installed at `src/components/ui/sheet.tsx` | Slide-over primitive | Already wired in ProspectSlideOver |
| shadcn `Badge` | installed at `src/components/ui/badge.tsx` | Status badges on profile header | Already design-token compliant post Phase 6 |

### No New Installs Required

All dependencies are in place. This is a pure UI refactor phase.

---

## Architecture Patterns

### Recommended Structure

```
src/
├── components/
│   ├── prospect/
│   │   ├── prospect-slide-over.tsx     ← REFACTOR: audit against 7-section spec
│   │   ├── profile-view.tsx            ← REFACTOR: add tab bar + two-column layout
│   │   ├── profile-header.tsx          ← NEW: extract profile header (avatar, name, badges, action buttons)
│   │   ├── profile-tabs.tsx            ← NEW: tab bar component (sticky, 6 tabs, gold underline active)
│   │   ├── enrichment-status.tsx       ← REFACTOR: redesign as "Enrichment Tab" grid layout
│   │   ├── wealth-signals.tsx          ← REFACTOR: redesign as intelligence signal cards with source links
│   │   ├── activity-timeline.tsx       ← NEW: left column timeline (vertical line + event circles + content)
│   │   ├── sec-filings-table.tsx       ← NEW: full sortable SEC filings table for SEC tab + slide-over rows
│   │   ├── prospect-card.tsx           ← NO CHANGE (built in Phase 6)
│   │   └── lookalike-discovery.tsx     ← NO CHANGE (business logic intact)
│   └── ui/
│       └── (all shared components — NO CHANGE)
└── app/
    └── [orgId]/
        └── prospects/
            └── [prospectId]/
                └── page.tsx            ← MINOR EDIT: pass orgId to ProfileView for breadcrumb back-link
```

### Pattern 1: Sheet (Slide-Over) with URL State

The slide-over must sync its open/closed state with `?prospect=<id>` URL param so direct links work.

**Current state:** ProspectSlideOver receives `open` + `onClose` as props — URL sync is the parent's responsibility. The Phase 8 search page will need to wire this.

**Phase 9 concern:** The slide-over itself is self-contained. Phase 9 only needs to verify that `orgId` and `prospectId` are threaded correctly for the "View Full Profile" link (already implemented in the component).

```tsx
// Source: existing src/components/prospect/prospect-slide-over.tsx
// URL param pattern — parent manages this, slide-over renders content
<Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
  <SheetContent
    side="right"
    style={{
      width: "min(480px, 90vw)",
      background: "#0d0d10",
      borderLeft: "1px solid rgba(212,175,55,0.1)",
      boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
    }}
    className="p-0 overflow-y-auto"
  >
```

**Important:** The existing `SheetContent` uses hardcoded `width: "min(480px, 90vw)"` via inline style because the shadcn sheet variant only supports `w-3/4 sm:max-w-sm` — the inline override is correct and intentional (matches design spec exactly).

### Pattern 2: Full Profile Page — Two-Column Layout + Tab Bar

The design-system spec calls for:
- Breadcrumb bar (top)
- Profile header (avatar 64px, name 28px Cormorant, title+company, metadata badges, collaborator overlapping avatars, action buttons)
- Sticky tab bar (Overview / Activity / SEC Filings / Enrichment / Notes / Lists)
- Two-column layout: Left `w-[340px]` activity timeline + Right `flex-1` tab content

```tsx
// Pattern from design-system/pages/prospect-detail.md Section 4c
<div className="flex gap-8 p-14">
  {/* Left: Activity Timeline — always visible regardless of active tab */}
  <div className="w-[340px] shrink-0">
    <ActivityTimeline events={activityEvents} />
  </div>
  {/* Right: Tab Content */}
  <div className="flex-1 min-w-0">
    {activeTab === "overview" && <OverviewTab prospect={prospect} />}
    {activeTab === "activity" && <ActivityTab events={activityEvents} />}
    {activeTab === "sec-filings" && <SECFilingsTab transactions={transactions} />}
    {activeTab === "enrichment" && <EnrichmentTab sourceStatus={enrichmentSourceStatus} />}
    {activeTab === "notes" && <NotesTab prospectId={prospect.id} />}
    {activeTab === "lists" && <ListsTab memberships={listMemberships} />}
  </div>
</div>
```

### Pattern 3: Tab State — React useState (not URL)

The design system does not specify URL-synced tabs. Use `useState` for tab selection — simpler, no URL pollution.

```tsx
const [activeTab, setActiveTab] = useState<"overview" | "activity" | "sec-filings" | "enrichment" | "notes" | "lists">("overview");
```

### Pattern 4: Activity Timeline

Left column uses position-relative vertical line with absolute-positioned event circles:

```tsx
// Source: design-system/pages/prospect-detail.md — Left Column: Activity Timeline
<div className="relative">
  {/* Vertical line */}
  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
  {events.map((event) => (
    <div key={event.id} className="relative pl-8 pb-6">
      {/* Event circle on the line */}
      <div
        className="absolute left-[13px] top-0 h-[10px] w-[10px] rounded-full"
        style={{ background: getEventColor(event.type) }}
      />
      {/* Event content */}
      <p className="text-sm text-foreground">{event.title}</p>
      <p className="text-xs text-muted-foreground">{event.timestamp}</p>
    </div>
  ))}
</div>
```

Event circle colors per spec:
- Search: `var(--info)` (blue)
- Enrich: `var(--gold-primary)` (gold)
- Note: `var(--text-muted)` (muted gray)
- List: `var(--success)` (green)

### Pattern 5: `surface-card` Utility

All card/panel containers on the full profile page must use the `surface-card` CSS utility (defined in globals.css) rather than inline `background: var(--bg-card-gradient)`:

```tsx
// CORRECT
<div className="surface-card rounded-[14px] p-6">

// INCORRECT (inline style bypasses hover transitions)
<div className="rounded-[14px] border bg-card p-6" style={{ background: "var(--bg-card-gradient)" }}>
```

Note: The existing `profile-view.tsx` uses the inline style approach. Phase 9 replaces these with `surface-card`.

### Anti-Patterns to Avoid

- **Raw zinc-* classes:** `prospect-detail.md` has a migration table — `bg-zinc-950` → `bg-background`, `border-zinc-800` → `border`, `text-zinc-400` → `text-muted-foreground`, etc. The existing profile-view does not use zinc classes, but WealthSignals and EnrichmentStatus (older components) may.
- **Inline style for gradients when CSS utility exists:** The `surface-card` utility is the canonical approach per Phase 5 decisions.
- **Scale transforms on hover:** Only border/opacity transitions. MASTER.md explicitly forbids scale transforms.
- **`font-cormorant` class:** Must use `font-serif` only (Phase 5 decision logged in STATE.md).
- **Custom Sheet panel implementation:** shadcn Sheet is the standard. Do not hand-roll a slide-over panel.
- **Table-row layouts for prospects:** Already using ProspectCard horizontal cards from Phase 6/8.
- **Duplicate ambient glow divs:** Root layout owns ambient glows. Do not add them to page or profile components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-over panel | Custom fixed-position div with animation | shadcn `Sheet` (already in place) | Accessibility, focus management, keyboard dismiss, aria-dialog — all handled by Radix |
| Tab bar | Custom tab switching with border tricks | shadcn `Tabs` (`@radix-ui/react-tabs`) or simple `useState` | Keyboard nav (arrow keys), aria-selected, focus management |
| Progress bar | SVG or complex gradient div | Single div with inline `width` percent + Tailwind gradient class | Already done correctly in ProspectSlideOver |
| Currency formatting | Custom formatCurrency() | Keep existing `formatCurrency()` in prospect-slide-over.tsx — it already handles $M/$K/$raw | Works correctly, no edge cases missed |
| Relative date formatting | Custom logic | Keep existing `formatRelativeDate()` in prospect-slide-over.tsx | Already correct |
| Avatar initials | Custom | Keep existing `getInitials()` + `getAvatarGradient()` from prospect-card.tsx | Already correct |

**Key insight:** All data-handling utilities already exist and are correct. Phase 9 touches only the rendering layer.

---

## Common Pitfalls

### Pitfall 1: Sheet Width Override Not Working

**What goes wrong:** The shadcn SheetContent default variant uses `w-3/4 sm:max-w-sm` which caps at ~384px. If the inline style is removed or overridden by a className, the panel will be too narrow.

**Why it happens:** The Tailwind class variant takes precedence over inline styles in some configurations, or a className is added that conflicts.

**How to avoid:** Keep the existing `style={{ width: "min(480px, 90vw)" }}` on SheetContent. Do not add `w-*` Tailwind classes to SheetContent. This is the established pattern from Phase 5.

**Warning signs:** Panel is noticeably narrower than 480px on desktop.

### Pitfall 2: Sticky Header + Sticky Tab Bar Z-Index Collision

**What goes wrong:** The profile header is sticky, the tab bar is sticky, and the TopBar is also sticky (z-20). If z-indices are not coordinated, headers overlap or flicker.

**Why it happens:** Multiple `position: sticky` elements in the same scroll container fight for z-index.

**How to avoid:** Use this z-index scale:
- TopBar: `z-20` (already set)
- Profile header: `z-10`
- Tab bar: `z-10`
- Slide-over panel header: `z-10` (within the sheet's own scroll context — not competing with page z-indices)

**Warning signs:** Tab bar disappears behind the profile header when scrolling.

### Pitfall 3: Activity Data Not Available on Profile Page

**What goes wrong:** The activity timeline requires activity log entries. The page.tsx currently only fetches `prospects` and `list_members`. If no activity query is added, the timeline will always be empty.

**Why it happens:** The design spec shows an activity timeline, but the current page.tsx does not query `activity_logs`.

**How to avoid:** Add a Supabase query to `page.tsx` to fetch recent activity entries for this prospect:

```typescript
const { data: activityEntries } = await supabase
  .from("activity_logs")
  .select("id, action_type, user_id, created_at, metadata")
  .eq("target_id", prospectId)
  .eq("target_type", "prospect")
  .order("created_at", { ascending: false })
  .limit(20);
```

Pass this to ProfileView as `activityEntries` prop. If the query returns null/empty, render an empty state in the timeline.

**Warning signs:** Activity timeline is always empty even after enrichment/views.

### Pitfall 4: `bg-card` vs `surface-card` Inconsistency

**What goes wrong:** The existing profile-view.tsx uses both `bg-card` (Tailwind class from shadcn) and `style={{ background: "var(--bg-card-gradient)" }}`. These produce different visual results: `bg-card` is an OKLCH solid color, not the gradient.

**Why it happens:** Phase 3 was built before the gradient card system was established in Phase 5.

**How to avoid:** Replace all card containers in profile-view.tsx with `surface-card` utility class. Audit WealthSignals and EnrichmentStatus components for the same issue.

**Warning signs:** Some cards look flat (solid color) while others have the subtle gradient.

### Pitfall 5: nuqs for `?prospect=<id>` URL Param Conflicts

**What goes wrong:** The slide-over's `?prospect=<id>` URL param and the search page's `?page=`, `?sort=`, `?persona=` params can conflict if nuqs is not carefully scoped. Closing the slide-over should not wipe out search filters.

**Why it happens:** nuqs `useQueryState` with `{ history: 'push' }` replaces the entire URL. Closing (setting to null) will clear other params if a shallow approach is not used.

**How to avoid:** Use nuqs `useQueryState("prospect", { shallow: true })` for the prospect ID param. The `shallow: true` option preserves other params. However, since Phase 8 (search page) handles this wiring, this pitfall is primarily for the Phase 8 planner. Phase 9 only needs to ensure the slide-over renders correctly when passed the props.

**Warning signs:** Closing the slide-over resets page number or clears filters.

### Pitfall 6: ProfileView Already Has `"use client"` — Server Component Pattern Lost

**What goes wrong:** The full page at `page.tsx` is a Server Component that fetches data server-side. It renders `<ProfileView>` which is a client component. If tab-switching state is added to ProfileView, the component correctly stays client-side. But if someone tries to move data fetching into ProfileView itself to avoid prop drilling, they'd lose the server-side fetch.

**How to avoid:** Keep `page.tsx` as Server Component — data flows down as props. ProfileView and all sub-components stay client components for interactivity. The activity timeline data query belongs in `page.tsx`, not inside a client component fetch.

---

## Code Examples

### Enrichment Progress Bar (Slide-Over Section 3)

```tsx
// Source: existing src/components/prospect/prospect-slide-over.tsx
// Already correctly implemented — preserve this pattern
<div className="h-2 w-full rounded-full bg-muted">
  <div
    className="h-2 rounded-full bg-gradient-to-r from-[var(--gold-muted)] to-[var(--gold-primary)] transition-all duration-500"
    style={{ width: `${enrichmentPct}%` }}
  />
</div>
```

### Enrichment Source Tag Pills (Slide-Over Section 3)

```tsx
// Source: design-system/pages/prospect-detail.md Section 4b — Enrichment Progress
// Status-driven pill style
function getSourceTagStyle(status: SourceStatus): string {
  switch (status) {
    case "complete":
      return "bg-success-muted text-success border border-success/30";
    case "failed":
      return "bg-destructive/15 text-destructive border border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}
// Usage
<span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${getSourceTagStyle(status)}`}>
  <EnrichmentIcon status={status} />
  {SOURCE_LABELS[key] ?? key}
</span>
```

### Gold Left-Border AI Summary Block

```tsx
// Source: design-system/pages/prospect-detail.md Section 4b — AI Summary
// + design-system/MASTER.md component patterns (gold left-border for AI content)
<div className="border-l-2 pl-4 py-3" style={{ borderColor: "var(--border-gold)" }}>
  <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gold-primary)" }}>
    AI INSIGHT
  </p>
  {prospect.ai_summary ? (
    <p className="text-sm leading-relaxed text-foreground">{prospect.ai_summary}</p>
  ) : (
    <button
      className="mt-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
      style={{ borderColor: "rgba(212,175,55,0.3)", color: "var(--gold-primary)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--gold-bg)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      Generate Summary
    </button>
  )}
</div>
```

### Quick Info Grid (Slide-Over Section 2)

```tsx
// Source: design-system/pages/prospect-detail.md Section 4b — Quick Info Grid
// Already implemented correctly in prospect-slide-over.tsx
<div
  className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border"
  style={{ background: "var(--bg-card-gradient)" }}
>
  <div className="border-b border-r border-border p-4">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">Title</p>
    <p className="mt-1 text-sm font-medium text-foreground">{prospect.title ?? "—"}</p>
  </div>
  {/* ... other cells ... */}
</div>
```

### SEC Transaction Row (Profile Page)

```tsx
// Source: design-system/pages/prospect-detail.md — SEC Filings Tab
// Transaction type colored pills
function getTransactionTypeStyle(type: string) {
  if (type.toLowerCase().includes("purchase")) return "bg-success-muted text-success border border-success/30";
  if (type.toLowerCase().includes("sale")) return "bg-destructive/15 text-destructive border border-destructive/30";
  return "bg-info-muted text-info border border-info/30"; // Grant
}

// Amount display
<span className="font-mono text-sm font-semibold text-right" style={{ color: "var(--gold-primary)" }}>
  {formatCurrency(tx.totalValue)}
</span>
```

### Tab Bar with Gold Active Underline

```tsx
// Source: design-system/pages/prospect-detail.md — Tab Bar
const TABS = ["overview", "activity", "sec-filings", "enrichment", "notes", "lists"] as const;

<div
  className="sticky z-10 flex gap-0 border-b border-border px-14"
  style={{ background: "var(--background)" }}
>
  {TABS.map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="relative pb-3 pt-4 text-sm capitalize transition-colors duration-200 cursor-pointer mr-6"
      style={{
        color: activeTab === tab ? "var(--text-primary-ds)" : "var(--text-secondary-ds)",
        fontWeight: activeTab === tab ? 500 : 400,
      }}
    >
      {tab.replace("-", " ")}
      {activeTab === tab && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: "var(--gold-primary)" }}
        />
      )}
    </button>
  ))}
</div>
```

### Profile Header Action Buttons

```tsx
// Source: design-system/pages/prospect-detail.md — Profile Header
// Ghost button style for Mail / Phone / More
<button
  aria-label="Send email"
  className="flex h-9 items-center gap-2 rounded-[8px] border border-border px-3 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
>
  <Mail className="h-4 w-4 shrink-0" />
  Mail
</button>
```

---

## Current Component Audit

### ProspectSlideOver (`src/components/prospect/prospect-slide-over.tsx`)

| Section | Status | Notes |
|---------|--------|-------|
| Panel container (480px, dark bg, gold border, shadow) | COMPLETE | Matches spec exactly |
| Sticky header (close + "View Full Profile") | COMPLETE | Correct |
| 1. Identity block (avatar, name, email, action circles) | COMPLETE | work_email shown; action circles are decorative (no real actions wired) |
| 2. Quick info grid (2x2, Title/Company/Location/Wealth Tier) | COMPLETE | Correct pattern |
| 3. Enrichment progress (sparkle icon, bar, source tags) | COMPLETE | Correct |
| 4. AI Summary (gold left-border block) | COMPLETE | Correct |
| 5. SEC insider transactions (top 5, "View All") | COMPLETE | Correct |
| 6. Notes | PARTIAL | "+ Add Note" is a non-functional button; no textarea/submit for adding notes |
| 7. Lists membership (pills + dashed "+ Add to List") | PARTIAL | "+ Add to List" button is non-functional; no AddToListDialog wired |
| Loading state (Loader2 spinner) | COMPLETE | Correct |
| Stale data warning | NOT PRESENT | Design spec mentions inline stale warning; not in slide-over currently |

**Key gap:** Notes add functionality and Add to List functionality are not wired in the slide-over. Phase 9 must decide: implement these in the slide-over, or only provide a "View Full Profile" link for those actions. Given this is a UI redesign phase (not feature addition), these should remain decorative stubs with the "View Full Profile" link as the escape hatch.

### ProfileView (`src/components/prospect/profile-view.tsx`)

| Element | Status | Notes |
|---------|--------|-------|
| Two-column layout (340px left + flex-1 right) | NOT PRESENT | Linear vertical stack instead |
| Breadcrumb | NOT PRESENT | Missing — `Breadcrumbs` component exists but not used here |
| Profile header (64px avatar, 28px Cormorant name, badges) | PARTIAL | 32px `text-3xl` name; no badge row; no collaborator avatars; no proper action buttons |
| Sticky tab bar (6 tabs, gold underline) | NOT PRESENT | No tabs — all sections are in a single scroll |
| Activity timeline (left column) | NOT PRESENT | No activity timeline — activityEntries not fetched in page.tsx |
| bg-card gradient consistency | INCONSISTENT | Mix of `bg-card` and inline `--bg-card-gradient` |
| Stale data warning | PRESENT | Correctly implemented inline warning |
| Lists section | PRESENT | Uses table layout — design spec calls for card grid |
| Lookalike Discovery | PRESENT | Toggle button shows/hides LookalikeDiscovery |

**Key conclusion:** ProfileView needs a significant structural rewrite — not cosmetic cleanup. The tab bar, two-column layout, and activity timeline are all missing. The approach is to extract a new `ProfileHeader` component, add a `ProfileTabs` component, and refactor the ProfileView wrapper to apply the two-column grid with activity timeline in the left column.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playfair Display for headings | Cormorant Garamond (`font-serif`) | Phase 5 | All heading typography migrated; prospect name uses `font-serif` class |
| Inline hex/rgba values | CSS variable tokens | Phase 5 | Use `var(--gold-primary)` not `#d4af37`; use `var(--border-gold)` not `rgba(212,175,55,0.25)` |
| Custom panel animation | shadcn Sheet (Radix) | Phase 5 | Accessibility-compliant; keyboard dismissal; focus management built-in |
| `bg-card` OKLCH token | `surface-card` utility (gradient) | Phase 5 | Cards now have the gradient glass treatment, not flat OKLCH color |
| Inter for body text | DM Sans (`font-sans`) | Phase 5 | All body text uses DM Sans via CSS variable `--font-sans` |
| Raw zinc-* Tailwind classes | CSS variable classes | Phase 5 | `text-zinc-400` → `text-muted-foreground`, `bg-zinc-900` → `bg-card` |

**Deprecated patterns (must not use):**
- `font-cormorant` class: use `font-serif` only
- `text-zinc-*` / `bg-zinc-*`: use CSS variable classes
- Scale hover transforms: use border/opacity transitions only
- Inline hex colors in className or style: use CSS variables only
- Ambient glow divs in page components: root layout.tsx owns them

---

## Open Questions

1. **Activity timeline data source**
   - What we know: `activity_logs` table exists; `logActivity()` is called on profile_viewed; data is there
   - What's unclear: The page.tsx does not query it; adding a query has a minimal latency cost
   - Recommendation: Add the query to page.tsx, limit to 20 most recent entries for this `target_id` + `target_type = 'prospect'`. Pass as `activityEntries?: ActivityEntry[]` prop to ProfileView.

2. **Notes add functionality in slide-over**
   - What we know: "+ Add Note" button exists but is non-functional; no notes API route or server action for slide-over context
   - What's unclear: Should this be wired in Phase 9, or left as a stub pointing to "View Full Profile"?
   - Recommendation: Leave as decorative stub in Phase 9 (this is a UI redesign phase, not a feature phase). Add a tooltip "Add notes on the full profile page".

3. **Add to List in slide-over**
   - What we know: The dashed "+ Add to List" pill exists but is non-functional; the AddToListDialog exists on the search page
   - What's unclear: Lists data is not currently fetched in the search/slide-over context
   - Recommendation: Wire the existing AddToListDialog from Phase 5/8. The modal already has the API wiring; it needs `lists` and `orgId` props passed through to the slide-over. This is a one-day addition that improves UX significantly.

4. **Collaborator overlapping avatars in profile header**
   - What we know: Design spec mentions "overlapping 24px avatar circles" for collaborators on the right side of the profile header
   - What's unclear: There is no "collaborator" data model in the schema — this appears to be a v2 concept from the stitch mockup
   - Recommendation: Skip the collaborator avatars entirely for Phase 9. Render only the action buttons (Mail / Phone / MoreHorizontal) in the header right side.

5. **"Draft Outreach" button**
   - What we know: The stitch mockup (`stitch/prospect_intelligence_dossier/`) shows a prominent gold "Draft Outreach" CTA button; the REQUIREMENTS.md has `ADV-01` (AI email draft generation) but it is marked v2
   - What's unclear: Should this button be rendered as a disabled/coming-soon state in Phase 9?
   - Recommendation: Include the "Draft Outreach" button in the profile header as a gold variant button that is disabled (or opens a "Coming Soon" state). This preserves the visual spec without building unscoped functionality.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (only `workflow.research`, `workflow.plan_check`, `workflow.verifier` are set). Skipping Validation Architecture section.

---

## Sources

### Primary (HIGH confidence)

- `design-system/pages/prospect-detail.md` — Complete spec for slide-over (Section 4b) and full profile page (Section 4c), enrichment status icons, migration table
- `design-system/MASTER.md` — Global design tokens, component patterns, anti-patterns
- `src/components/prospect/prospect-slide-over.tsx` — Current implementation of slide-over; confirms what is already built
- `src/components/prospect/profile-view.tsx` — Current implementation of full profile page; identifies structural gaps
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — Server component data fetching; activity query gap identified
- `src/app/globals.css` — All CSS variable tokens confirmed (bg-card-gradient, surface-card utility, gold tokens, etc.)
- `.planning/STATE.md` — All accumulated decisions from Phases 1-7; confirms font, token, and pattern decisions

### Secondary (MEDIUM confidence)

- `stitch/prospect_intelligence_dossier/code.html` — Reference mockup showing the 3-column layout (left sidebar, center intelligence, right activity); informs the full page layout direction but the design-system spec takes precedence
- `src/components/prospect/prospect-card.tsx` — Phase 6 ProspectCard; confirms CSS variable patterns used in prospect components

### Tertiary (LOW confidence)

- None — all findings are backed by codebase inspection and official design system documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, no unknowns
- Architecture: HIGH — design spec is detailed and exhaustive; current implementation gaps are clearly identified
- Pitfalls: HIGH — based on direct code inspection of existing components and cross-referencing with Phase 5 decisions in STATE.md

**Research date:** 2026-03-01
**Valid until:** Stable — no fast-moving external dependencies. Valid until design system changes.
