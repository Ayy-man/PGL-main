---
phase: quick
plan: 260327-rqs
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/prospect/profile-view.tsx
  - src/components/prospect/profile-header.tsx
  - src/components/prospect/market-intelligence-card.tsx
  - src/components/prospect/wealth-signals.tsx
  - src/components/prospect/activity-timeline.tsx
  - src/components/ui/breadcrumbs.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Enrichment status in right column is compact (~80px), not a tall card"
    - "Wealth signal cards have fixed max-height with overflow handling"
    - "No duplicate contact icon row in profile header"
    - "Market Intelligence section hidden when no ticker present"
    - "Company Context section only renders fields with data; hidden when no data"
    - "Activity log empty state shows decorative icon + descriptive text"
    - "Breadcrumb parent links are --text-secondary with gold hover"
  artifacts:
    - path: "src/components/prospect/profile-view.tsx"
      provides: "Collapsed enrichment status, conditional company context, spacing fixes"
    - path: "src/components/prospect/profile-header.tsx"
      provides: "Profile header without social links row"
    - path: "src/components/prospect/market-intelligence-card.tsx"
      provides: "Hidden section when no ticker"
    - path: "src/components/prospect/wealth-signals.tsx"
      provides: "Fixed-height signal cards with text cleanup"
    - path: "src/components/prospect/activity-timeline.tsx"
      provides: "Decorative empty state"
    - path: "src/components/ui/breadcrumbs.tsx"
      provides: "Proper breadcrumb styling with gold hover on parent links"
  key_links: []
---

<objective>
Fix 8 UI issues on the prospect profile page: collapse enrichment status to compact pills, clean wealth signal card rendering, remove redundant contact icon row from header, fix market intelligence empty state, make company context conditional, improve activity log empty state, fix breadcrumb styling, and correct spacing.

Purpose: Polish the prospect profile dossier view for production readiness.
Output: 6 updated component files.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/prospect/profile-view.tsx
@src/components/prospect/profile-header.tsx
@src/components/prospect/market-intelligence-card.tsx
@src/components/prospect/wealth-signals.tsx
@src/components/prospect/activity-timeline.tsx
@src/components/ui/breadcrumbs.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix layout, enrichment status, header, market intelligence, company context, spacing</name>
  <files>
    src/components/prospect/profile-view.tsx
    src/components/prospect/profile-header.tsx
    src/components/prospect/market-intelligence-card.tsx
  </files>
  <action>
**profile-view.tsx — Enrichment Status collapse (Fix 1):**
The enrichment status card in the right column (lines 528-614) currently uses `h-full flex flex-col justify-between` making it tall. Replace with a compact version:
- Remove `h-full` and `justify-between` from the outer div. Keep the same surface-card-like styling (rounded-[14px], bg-card-gradient, border-subtle).
- The header row stays: "ENRICHMENT STATUS" label + colored badge (COMPLETE/RUNNING/PENDING).
- The 2x2 grid of source pills stays (contactout, exa, sec, claude) but make each pill smaller: remove `justify-center`, use `text-[11px]`, `px-2 py-1` instead of `p-2`. Add a colored dot for each status:
  - complete: green dot (background: var(--success)), gold text
  - pending: gray dot (rgba(255,255,255,0.2)), secondary text
  - failed: red dot (var(--destructive)), secondary text
  - in_progress: gold dot (var(--gold-primary)), gold text
- Add `gap-1.5` instead of `gap-2` on the grid, `mt-2` instead of `mt-3`.
- Keep the "Last enriched" timestamp but use `mt-2` instead of `mt-3`.
- Remove the flex-1 / h-full behavior so the card is naturally sized (~80px).

**profile-view.tsx — Company Context conditional (Fix 5):**
Currently the Company Context section (lines 444-523) only checks `prospect.company`. Make it smarter:
- Compute `hasCompanyContext` boolean: true if any of `prospect.company`, `prospect.publicly_traded_symbol`, `prospect.company_cik`, `prospect.location`, `prospect.title` have values.
- If `!hasCompanyContext`, do not render the section at all.
- Inside the section, only render each field row if it has data. The "Details" column on the right should only render if `prospect.title || prospect.company_cik`.
- If only 1-2 fields have data, use a single-column layout instead of the 2-col grid. Specifically: if neither `prospect.title` nor `prospect.company_cik` exist, render just the left column fields without the grid wrapper.

**profile-view.tsx — Spacing (Fix 8):**
- The three-column layout grid already uses `gap-6`. Verify each column child uses consistent `p-6` for surface-card containers. The enrichment status card and activity log card should both have `p-5` (they already do, just confirm).
- Ensure the wealth signals gap between cards is `gap-4` — this is handled in wealth-signals.tsx (Task 2).

**profile-header.tsx — Remove contact icon row (Fix 3):**
Delete the entire "Social Links" section at the bottom of ProfileHeader (lines 233-297): the `div` with `mt-5 w-full pt-4 flex justify-center gap-6` and all its children (Mail, Phone, LinkedIn icon links). The Verified Contact section in profile-view.tsx already shows the actual contact data with labels. Keep all other parts of the header intact (avatar, name, title, company, enrichment source icons, location/wealth tier grid, CTA buttons).

**market-intelligence-card.tsx — Empty state (Fix 4):**
When `!ticker` (lines 172-179), instead of rendering a full surface-card with "Market intelligence requires a publicly traded symbol", either:
- Return `null` to hide the section entirely. This is the cleaner option since there is nothing to show.
- OR if we want a subtle hint, return a single line: `<p className="text-xs text-center" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>SEC filings available for publicly traded companies only</p>` without the surface-card wrapper.
Choose option 1 (return null) — cleaner, avoids clutter for non-public prospects.
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
- Enrichment status card is compact (~80px) with colored dots per source status
- Social links row removed from profile-header.tsx
- MarketIntelligenceCard returns null when no ticker
- Company Context only renders fields with data, hidden when no data at all
- TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix wealth signal cards, activity empty state, breadcrumb styling</name>
  <files>
    src/components/prospect/wealth-signals.tsx
    src/components/prospect/activity-timeline.tsx
    src/components/ui/breadcrumbs.tsx
  </files>
  <action>
**wealth-signals.tsx — Card styling fixes (Fix 2):**
Apply to the digested signal card div (lines 129-191):
- Add `max-h-[160px] overflow-hidden relative` to the outer card div.
- Strip markdown/HTML artifacts from `signal.headline` and `signal.summary` before rendering. Create a `cleanText(text: string): string` helper at the top of the file that:
  - Removes markdown headers: `/^#{1,3}\s+/gm` → ''
  - Removes HTML entities: `&amp;` → `&`, `&#x27;` → `'`, `&quot;` → `"`, `&lt;` → `<`, `&gt;` → `>`
  - Removes leading boilerplate like "Summary:" or "Key Points:" prefixes
  - Trims whitespace
- Title (h4 on line 164): Change from `text-sm font-bold` to `text-[16px] font-semibold font-serif`. Keep `text-foreground mb-2`.
- Body (p on line 168): Change from `text-xs text-muted-foreground mb-4 flex-1 leading-relaxed` to `text-[13px] font-sans leading-relaxed line-clamp-3 mb-3` with `style={{ color: "var(--text-secondary, rgba(232,228,220,0.5))" }}`.
- "View Source" link (a on line 172): Change from `text-[10px]` to `text-[12px]`. Already gold-colored, keep that.
- Add a category icon to the top-left of each card. The card already has the category icon + pill at the top (lines 147-161). Keep this existing pattern — it already shows the correct icon per category via `getCategoryIcon`. No keyword detection needed since the digested signals already have `category` typed.
- For timestamp: if `webData.enriched_at` exists, show it top-right of each card as `text-[11px]` with `style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}`. Add this inside the existing top row (the flex div with category icon + pill on line 147). Add a spacer `flex-1` between the pill and the timestamp.

**NOTE on backwards compatibility:** The current component already handles DigestedSignal[] format exclusively (no legacy mention format exists in the current code). The `cleanText` helper ensures any raw/dirty data from the enrichment pipeline renders cleanly.

**activity-timeline.tsx — Empty state (Fix 6):**
Replace the current empty state (lines 77-83) which shows plain "No activity recorded yet." with:
- Import `Activity` from lucide-react (the activity/pulse icon).
- Render a centered column:
  - `<div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>` containing `<Activity className="h-5 w-5" style={{ color: "var(--gold-primary)" }} />`
  - `<p className="font-serif text-base font-semibold text-foreground">No team activity yet</p>`
  - `<p className="text-[13px] mt-1" style={{ color: "var(--text-secondary, rgba(232,228,220,0.5))" }}>Profile views, outreach, and notes from your team will appear here.</p>`
- Keep `py-8 text-center` on the wrapper.

**breadcrumbs.tsx — Styling fixes (Fix 7):**
The breadcrumbs component (lines 16-60) is already close. Adjust:
- Parent link (non-last items with href, line 35-41): The Link already has `style={{ color: "var(--text-secondary-ds)" }}`. Add hover to gold: add `onMouseEnter` setting color to `var(--gold-primary)` and `onMouseLeave` resetting to `var(--text-secondary-ds)` — same pattern used throughout the codebase (CSS variable hover values cannot use Tailwind hover: classes).
- Remove the Tailwind `hover:text-[var(--text-primary-ds)]` class from the Link (line 38) since we are using onMouseEnter/Leave for CSS variable hover. Replace with just `transition-colors duration-150 cursor-pointer`.
- Current page (last item, line 32): Already uses `var(--text-primary-ds)`. Confirmed correct.
- Separator ChevronRight: Already `rgba(232,228,220,0.25)`. Confirmed correct.
- Text size: Already `text-[13px]` on nav. Confirmed correct.
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
- Wealth signal cards have max-h-[160px], cleaned text, proper typography (16px serif title, 13px sans body, line-clamp-3)
- Activity timeline empty state shows gold icon, serif heading, descriptive subtitle
- Breadcrumb parent links have gold hover via onMouseEnter/Leave
- TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
1. `npx tsc --noEmit` passes with no errors
2. `pnpm build` compiles successfully
3. Visual spot-check: Load a prospect profile page and verify:
   - Enrichment status is compact with colored dots
   - No contact icon row at bottom of profile header
   - Wealth signal cards are fixed-height with clean text
   - Activity log shows decorative empty state (if no activity)
   - Market Intelligence section hidden for non-public prospects
   - Breadcrumb parent links turn gold on hover
</verification>

<success_criteria>
- All 8 fixes implemented across 6 files
- TypeScript compiles with zero errors
- pnpm build passes
</success_criteria>

<output>
After completion, create `.planning/quick/260327-rqs-prospect-profile-ui-fixes-collapse-enric/260327-rqs-SUMMARY.md`
</output>
