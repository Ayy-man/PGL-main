---
phase: quick-260404-uia
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/prospect/prospect-slide-over.tsx
  - src/app/[orgId]/search/components/search-content.tsx
autonomous: true
requirements: [SLIDE-OVER-DUAL-STATE, FIX-DEAD-BUTTONS]

must_haves:
  truths:
    - "Preview prospects show only avatar, name, title, company, and a prominent Enrich CTA"
    - "Preview prospects do NOT show action buttons, AI Insight, Notes, Lists, Enrichment bar, Location, or Wealth Tier"
    - "Enriched prospects show working Email (mailto:) and Phone (tel:) buttons when data exists"
    - "Enriched prospects show 4-cell grid: Title, Company, Location, Email"
    - "Enriched prospects do NOT show AI Insight, Notes, Lists, or Enrichment progress bar"
    - "View Full Profile link only appears for enriched prospects"
    - "Chat and More buttons are completely removed from both states"
  artifacts:
    - path: "src/components/prospect/prospect-slide-over.tsx"
      provides: "Dual-state slide-over component"
      contains: "_enriched"
    - path: "src/app/[orgId]/search/components/search-content.tsx"
      provides: "slideOverProspect mapping with _enriched and phone fields"
      contains: "_enriched"
  key_links:
    - from: "search-content.tsx slideOverProspect mapping"
      to: "ProspectSlideOver component"
      via: "_enriched boolean prop and phone field"
      pattern: "_enriched.*selectedProspect"
---

<objective>
Redesign the prospect slide-over sidebar to have two distinct states: a minimal preview state for unenriched Apollo search results, and a functional enriched state with working contact buttons. Remove all dead/broken UI elements from both states.

Purpose: Currently the slide-over shows identical layout for previews and enriched prospects, with many dead buttons and meaningless data fields. This creates a broken UX where users click buttons that do nothing.

Output: A clean dual-state ProspectSlideOver component and updated slideOverProspect mapping in search-content.tsx.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/prospect/prospect-slide-over.tsx
@src/app/[orgId]/search/components/search-content.tsx
@src/lib/apollo/types.ts

<interfaces>
<!-- Key types the executor needs -->

From src/lib/apollo/types.ts:
```typescript
export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  headline?: string;
  organization_name?: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string;
  email_status?: string;
  phone_numbers?: ApolloPhoneNumber[];
  linkedin_url?: string;
  photo_url?: string;
  _enriched?: boolean;
}

export interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number?: string;
  type?: string;
}
```

From search-content.tsx slideOverProspect mapping (line ~380):
```typescript
const slideOverProspect = selectedProspect
  ? {
      id: selectedProspect.id,
      full_name: selectedProspect.name || `${selectedProspect.first_name} ${selectedProspect.last_name}`,
      first_name: selectedProspect.first_name,
      last_name: selectedProspect.last_name,
      title: selectedProspect.title || null,
      company: selectedProspect.organization_name || selectedProspect.organization?.name || null,
      location: [selectedProspect.city, selectedProspect.state, selectedProspect.country].filter(Boolean).join(", ") || null,
      work_email: selectedProspect.email || null,
      ai_summary: selectedProspect.headline || null,
      enrichment_source_status: null,
      insider_data: null,
    }
  : null;
```

From search-content.tsx slide-over rendering (line ~812):
```typescript
<ProspectSlideOver
  open={Boolean(searchState.prospect)}
  onClose={handleSlideOverClose}
  prospectId={searchState.prospect || null}
  prospect={slideOverProspect}
  orgId={orgId}
/>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update slideOverProspect mapping to pass _enriched and phone</name>
  <files>src/app/[orgId]/search/components/search-content.tsx</files>
  <action>
Update the `slideOverProspect` mapping object (around line 380) to include two new fields:

1. `_enriched: selectedProspect._enriched ?? false` -- passes the enrichment status through
2. `phone: selectedProspect.phone_numbers?.[0]?.raw_number || selectedProspect.phone_numbers?.[0]?.sanitized_number || null` -- extracts the first phone number as a string

Remove these fields from the mapping since they are no longer used:
- `ai_summary` (was mapped from headline)
- `enrichment_source_status` (was always null)
- `insider_data` (was always null)

The resulting mapping should be:
```typescript
const slideOverProspect = selectedProspect
  ? {
      id: selectedProspect.id,
      full_name: selectedProspect.name || `${selectedProspect.first_name} ${selectedProspect.last_name}`,
      first_name: selectedProspect.first_name,
      last_name: selectedProspect.last_name,
      title: selectedProspect.title || null,
      company: selectedProspect.organization_name || selectedProspect.organization?.name || null,
      location: [selectedProspect.city, selectedProspect.state, selectedProspect.country].filter(Boolean).join(", ") || null,
      work_email: selectedProspect.email || null,
      phone: selectedProspect.phone_numbers?.[0]?.raw_number || selectedProspect.phone_numbers?.[0]?.sanitized_number || null,
      _enriched: selectedProspect._enriched ?? false,
    }
  : null;
```

No other changes to search-content.tsx.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>slideOverProspect mapping passes `_enriched` boolean and `phone` string to the slide-over component. Removed unused fields (ai_summary, enrichment_source_status, insider_data).</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite ProspectSlideOver with dual preview/enriched states</name>
  <files>src/components/prospect/prospect-slide-over.tsx</files>
  <action>
Complete rewrite of the ProspectSlideOver component. The new component is dramatically simpler.

**1. Update the Prospect interface:**
```typescript
interface Prospect {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  phone: string | null;
  _enriched: boolean;
}
```
Remove: `wealth_tier`, `ai_summary`, `enrichment_source_status`, `insider_data`.
Add: `phone`, `_enriched`.

**2. Remove unused interfaces and helpers entirely:**
- Remove `SourceStatus` type
- Remove `Transaction` interface
- Remove `Note` interface
- Remove `ListMembership` interface
- Remove `SOURCE_LABELS` constant
- Remove `getEnrichmentPercentage` function
- Remove `getSourceTagStyle` function
- Remove `EnrichmentIcon` component
- Remove `formatCurrency` function
- Remove `formatRelativeDate` function

**3. Update ProspectSlideOverProps:**
```typescript
interface ProspectSlideOverProps {
  open: boolean;
  onClose: () => void;
  prospectId: string | null;
  prospect?: Prospect | null;
  orgId?: string;
}
```
Remove: `listMemberships`, `notes` props.

**4. Remove unused imports:**
Keep only: `Sheet`, `SheetContent` from ui/sheet, `X`, `Mail`, `Phone`, `Sparkles` from lucide-react, `Link` from next/link, `Loader2` from lucide-react.
Remove: `MessageSquare`, `MoreHorizontal`, `Circle`, `CheckCircle2`, `XCircle`, `Minus`.

**5. Component body — derive `isEnriched`:**
```typescript
const isEnriched = prospect?._enriched ?? false;
```

**6. Panel Header — conditional "View Full Profile" link:**
- If `isEnriched && orgId && prospectId`: render the Link to `/${orgId}/prospects/${prospectId}` (keep existing style).
- If NOT enriched: do NOT render "View Full Profile" at all — just render the close button on the left.

**7. Panel Body — PREVIEW STATE (`!isEnriched`):**
Render in order:
- **Avatar + obfuscated name:** Same initials circle + `prospect.full_name` as h2. No email underneath.
- **2-cell grid** (same visual style as current grid, but only 2 cells, no bottom row):
  ```
  | Title    | Company  |
  ```
  Use a single-row grid (grid-cols-2), each cell with border-r on the first, no border-b on either. Same padding/typography as current grid.
- **"Enrich & Save" CTA block:** A prominent call-to-action section with gold styling:
  ```html
  <div className="rounded-[10px] border p-5 text-center space-y-3" style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.04)" }}>
    <Sparkles className="h-5 w-5 mx-auto" style={{ color: "var(--gold-primary)" }} />
    <p className="text-sm font-medium text-foreground">Unlock Full Profile</p>
    <p className="text-xs text-muted-foreground">Enrich to get verified contact info, wealth signals, AI analysis, and more.</p>
    <p className="text-xs text-muted-foreground/60 mt-1">Select this prospect in the table and click "Save &amp; Enrich"</p>
  </div>
  ```
  This is informational only — the actual enrich action happens via the bulk actions bar in the table. This CTA just explains what enrichment unlocks and guides the user.

**8. Panel Body — ENRICHED STATE (`isEnriched`):**
Render in order:
- **Avatar + full name + email (if exists):** Same as current identity block.
- **Contact buttons row:** Only render buttons that have data. Use `flex items-center gap-3`:
  - If `prospect.work_email`: render an `<a href={`mailto:${prospect.work_email}`}>` styled as the current circle button with `<Mail>` icon and aria-label "Send email".
  - If `prospect.phone`: render an `<a href={`tel:${prospect.phone}`}>` styled as the current circle button with `<Phone>` icon and aria-label "Call prospect".
  - If neither exists, do not render the contact buttons row at all.
- **4-cell grid** (keep current visual style exactly):
  ```
  | Title    | Company  |
  | Location | Email    |
  ```
  Location cell: `prospect.location ?? "---"`.
  Email cell: `prospect.work_email ?? "---"`. Use `truncate` class on the email value `<p>` tag.

That's it. NO AI Insight section. NO Notes section. NO Lists section. NO Enrichment progress bar. NO SEC transactions. The enriched slide-over is just identity + contact buttons + info grid + "View Full Profile" link in the header.

**9. Loading state:** Keep the existing Loader2 spinner for when `prospect` is null/undefined (already exists).

**10. Keep existing Sheet/SheetContent wrapper and styling** (dark background, gold border, shadow, width, sticky header, etc.) exactly as-is.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
- Preview state shows: avatar, obfuscated name, 2-cell grid (Title, Company), and an informational Enrich CTA
- Enriched state shows: avatar, full name, email, working mailto/tel buttons, 4-cell grid (Title, Company, Location, Email), View Full Profile link
- Removed from both states: Chat button, More button, AI Insight, Notes, Lists, Enrichment progress bar, Wealth Tier, SEC transactions
- All dead buttons eliminated — remaining buttons (Email, Phone) are functional anchor tags
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit` passes with no errors
2. Dev server loads: `npm run dev` starts without runtime errors
3. Visual check: Search for prospects, click an unenriched result row — slide-over shows minimal preview with Enrich CTA, no dead buttons
4. Visual check: Click an enriched result row — slide-over shows contact buttons (if data exists), 4-cell grid, View Full Profile link
</verification>

<success_criteria>
- Zero dead buttons in the slide-over (every visible button does something)
- Preview state is clearly distinct from enriched state
- TypeScript compiles cleanly
- No removed sections (AI Insight, Notes, Lists, Enrichment bar) appear in either state
</success_criteria>

<output>
After completion, create `.planning/quick/260404-uia-redesign-prospect-slide-over-dual-state-/260404-uia-SUMMARY.md`
</output>
