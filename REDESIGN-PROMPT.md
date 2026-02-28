# Phronesis Growth Labs — Full UI Redesign

You are redesigning the entire frontend of Phronesis Growth Labs (PGL), a multi-tenant white-label SaaS platform for luxury real estate teams to identify and enrich ultra-high-net-worth (UHNW) prospects.

## Your Primary References

### 1. `design-system/MASTER.md` — THE source of truth for design language
Read this first. It defines every color variable, typography rule, surface treatment, component pattern, interaction state, and anti-pattern. Every component you build MUST comply with this file. Key rules to internalize:
- All colors via CSS custom properties (never raw Tailwind classes like `zinc-*`, `gray-*`)
- All surfaces use gradient backgrounds (never flat solid colors)
- Fonts: Cormorant Garamond (headings only), DM Sans (body/UI), JetBrains Mono (data)
- Icons: Lucide React exclusively. No emojis. No Heroicons.
- Cards use gradient bg + subtle border + hover transition. Always.
- Prospect results render as horizontal cards, NOT table rows
- Prospect detail opens in a 480px slide-over panel from the right
- Two ambient gold radial gradients on root background

### 2. `design-system/pages/*.md` — Per-page overrides
Read `search.md`, `dashboard.md`, `prospect-detail.md`, `lists.md`. These document what differs from the Master for each page. If a file doesn't override a property, the Master applies.

### 3. `stitch/` — UI Mockup Screenshots
This folder contains 6 refined UI mockup images. These represent the UX direction. Extract from them:
- **Component inventory**: What components exist on each screen, where they're positioned, how they relate
- **Information architecture**: What data is shown where, what the user flow is, what actions are available
- **UX patterns**: Navigation structure, filter placement, bulk actions, card layouts, data density

Do NOT pixel-copy the mockup UI. The mockups use a slightly different visual style. Your implementation must follow `design-system/MASTER.md` for all visual decisions (colors, fonts, borders, shadows, radii). The mockups tell you WHAT to build and WHERE. The design system tells you HOW it looks.

### 4. `src/` — Existing Codebase
The current codebase is a Next.js 14 app with Supabase, deployed on Vercel. Read the existing components, pages, types, and lib files. Preserve all business logic, API integrations, data fetching, and auth flows. You are redesigning the UI layer — not rewriting the backend or data layer.

### 5. `phronesis-feature-requirements.jsx` — Feature Checklist
This file lists every feature with status (built/verify/not_built), phase (MVP/Post-MVP/Out of Scope), and implementation notes. Reference it to know what exists vs what needs to be created.

---

## What You're Building

Six screens, redesigned to match the design system and mockup UX:

### Screen A: Tenant Dashboard (Home)
The logged-in user's home screen. Must include:
- Greeting with user name
- Stat cards: Total Prospects, Active Lists, Total Exports (gold-emphasized — this is THE value metric), Searches This Month
- "New Prospects Found" alert banner when saved personas find fresh matches (the stickiness feature)
- Recent Exports mini-table: last 5 exports with timestamp, list name, row count, re-download action
- Quick-access persona pills with match counts
- Live activity feed distinguishing "viewed" vs "contacted" actions (different icons, not just text)
- Target Personas section at bottom with small card chips showing name + match count

### Screen B: Lead Search
The primary prospecting interface. The hero feature. Must include:
- **Natural Language Search bar** as the dominant element at top. Large, prominent, with sparkle/AI icon and placeholder "Describe your ideal prospect... (e.g., 'Tech founders in Miami with over $5M looking for investment properties')". This is the key differentiator: NL query → Claude parses → Apollo filters → Exa enrichment.
- Saved Personas as horizontal pill chips below the search bar (not a dropdown). Clicking one fills the filters.
- "Advanced Filters" collapsible section below pills — Apollo fields: industry, title, seniority, location, company size. Collapsed by default.
- Results as **horizontal prospect cards** (per MASTER.md — NOT table rows). Each card: avatar, name, title, company, location, wealth tier badge (shield/gem icon with tier text), enrichment status dots (green/yellow/gray), contact availability icons, "Lookalike" action button.
- Bulk action bar appears when 1+ cards selected: Select All checkbox, "X selected" count, Add to List, Export CSV, Enrich Selected.
- Pagination at bottom.

### Screen C: Saved Personas ("Living Data")
Persona management. Personas are living data streams, not static filters. Must include:
- Grid of persona cards. Each card: persona name, filter criteria tags, last run date, total matches, new match count badge ("+124 New Matches"), sparkline trend, user avatars of who uses this persona.
- "Suggested" ribbon/tag on starter personas (Finance Elite, Tech Execs, Startup Founders, BigLaw Partners, Crypto/Web3)
- "Create New Persona" card with + icon
- "Search" and "Explore" actions per card
- Left sidebar: Library Stats (active personas count, new leads today), Filter by Industry checkboxes, Data Freshness radio (Live/Past Week)
- Right sidebar: Live Data Stream — real-time feed of new matches, enrichment updates, lookalike findings, high-value alerts

### Screen D: Prospect Profile (Slide-Over + Full Page)
Two modes: slide-over panel (480px, triggered from search results) and full page (navigated directly).

Slide-over must include (top to bottom):
1. Identity header: avatar, name, title, company, green online dot
2. Verified Contact section: email with DELIVERABLE badge, phone with type
3. Who Viewed: tabs for "Viewed" and "Contacted" (prevents duplicate outreach)
4. Internal Notes: tenant-specific, Save Note button
5. Quick info grid: location, enrichment status icons (ContactOut/Exa/SEC/Claude with color status)

Full page (center column) must include:
1. Wealth Signals & Intelligence: cards from Exa showing news, promotions, podcast mentions, M&A — each with source link, timestamp, and tagged category
2. SEC Filings table: date, type (Purchase/Sale/Grant with color coding), shares, value, filing link. Only shown for public company execs.
3. Company Context: funding info, tech stack tags, headquarters
4. "Draft Outreach" button — triggers AI email generation (user enters prompt, Claude drafts personalized email using enriched data)
5. "Find Lookalikes" button — generates persona from this prospect's attributes, redirects to Lead Search

Right column (full page):
1. Lead Status badge (Active/Inactive)
2. Lead Owner with avatar
3. Activity Log: timeline of team touchpoints (emails sent + opened count, LinkedIn connections, website visits, list additions)

### Screen E: Export Log
Export history and usage analytics. No CRM integration UI (out of scope). Must include:
- Stat cards: Total Monthly Exports (with trend %), Unique Prospects Exported (with trend %), Top Exporter (avatar + name + stats)
- Export table: timestamp, list name, row count, format badge (CSV/XLSX), exported by (avatar + name), re-download button
- "Export All Logs" CTA at top right
- Filters button for date range, user, format
- Credit Usage indicator (progress bar with count/limit)
- Pagination at bottom
- Empty state with guidance if no exports

### Screen F: Admin Dashboard (Super Admin Only)
PGL's command center. Must include:
- System status bar: OPERATIONAL badge, version, search tenants input
- Platform Pulse: total users, prospects scraped, success rate (progress bars)
- Enrichment Health (CB): circuit breaker status for Apollo (CLOSED), Exa (HALF-OPEN), ContactOut (CLOSED) — with colored badges
- Unit Economics: per-source cost (Apollo $/rec, Exa $/query, ContactOut $/email, avg blended cost)
- Export Activity: 24h sparkline chart
- Tenant Management table: client name + ID, plan tier badge + revenue + billing cycle, seats (used/total), status dot (Active/Restricted), action icons (login-as, refresh, disable/suspend)
- "Provision New Tenant" gold CTA
- Live Error Feed with severity levels: critical (red), warning (yellow), info (blue). Each entry: title, description, tenant link, tags, timestamp.
- System Actions: Rotate Master Keys, Flush Cache, Broadcast Alert, Export System Logs
- Left sidebar nav: Platform Control (Command Center, Tenant Registry, Usage Metrics), System Config (Global API Keys, Master Data Schema, Security Policies, Integrations)

---

## GSD Phases

Execute these phases in order. Each phase must be fully complete and tested before moving to the next.

### Phase 0: Foundation (Do First)
1. Read `design-system/MASTER.md` completely. Internalize every rule.
2. Read all files in `design-system/pages/`.
3. Read all images in `stitch/` — extract the component inventory and UX patterns.
4. Read `phronesis-feature-requirements.jsx` for feature status.
5. Audit `src/app/globals.css` and `tailwind.config.ts` — verify CSS custom properties match the design system. If they don't, update them to match MASTER.md exactly (color variables, font stack, border radius tokens, shadows).
6. Verify Google Fonts import includes Cormorant Garamond and DM Sans.
7. Add ambient background gradients to the root layout if not present.
8. Add custom scrollbar CSS if not present.
9. Add page transition animation CSS if not present.
10. Create/update shared UI components that will be reused across all pages:
    - `Button` (ghost + gold variants per MASTER.md)
    - `Card` (gradient bg + border + hover transition)
    - `Badge` (status badges with icon + color + label)
    - `EmptyState` (icon circle + heading + description + optional CTA)
    - `DataTable` (header style, row hover, sort indicators, mono currency)
    - `SlideOverPanel` (480px, backdrop, escape-to-close, URL param sync)
    - `Sidebar` (220px, gradient bg, gold accent line, nav items)
    - `TopBar` (56px sticky, blur bg, search input, notification bell, avatar)
    - `Breadcrumbs`
    - `WealthTierBadge` (shield/gem icon with graduated gold intensity)
    - `EnrichmentStatusDots` (green/yellow/gray for each source)
    - `ProspectCard` (horizontal card layout per MASTER.md, NOT table row)

### Phase 1: Layout Shell + Navigation
1. Implement the app shell: Sidebar (220px) + TopBar (56px) + main content area.
2. Sidebar nav items matching the mockup structure: Dashboard, Lead Discovery/Search, Personas/Library, Prospects, Export Log, Settings/Team.
3. Active nav state with gold styling per MASTER.md.
4. Mobile responsive: sidebar collapses to hamburger on < 1024px.
5. Ensure all existing routes still work. Don't break routing.
6. Wire up tenant branding (logo, colors from tenant table) in the sidebar header.

### Phase 2: Lead Search (Screen B)
This is the most complex and most important screen. Build it first after layout.
1. Natural Language Search bar component — large, prominent, AI icon, placeholder text.
2. Saved Persona horizontal pill chips — data from personas table, clickable to fill filters.
3. Advanced Filters collapsible section — Apollo fields wired to existing search logic.
4. Prospect result cards (horizontal card layout per MASTER.md) — wired to existing Apollo search results.
5. Wealth tier badges, enrichment status dots, contact icons on each card.
6. Click card → open SlideOverPanel with prospect detail.
7. Bulk selection: checkboxes, Select All, bulk action bar (Add to List, Export CSV, Enrich Selected).
8. Pagination component wired to existing pagination logic.
9. "Lookalike" button per card — wired to existing lookalike search.
10. Empty state for no results.

### Phase 3: Prospect Profile (Screen D)
1. Slide-over panel (480px) — identity header, verified contact, who viewed (viewed/contacted tabs), internal notes, quick info grid.
2. Full page profile — wealth signals cards (from Exa data), SEC filings table, company context section, activity log timeline.
3. "Draft Outreach" button wired to Claude AI email generation.
4. "Find Lookalikes" button wired to existing lookalike logic.
5. Enrichment source status pills (ContactOut/Exa/SEC/Claude) with color indicators.
6. Note save functionality (tenant-isolated).

### Phase 4: Saved Personas (Screen C)
1. Persona card grid with all metadata (last run, matches, new count, sparkline trend, user avatars).
2. "Suggested" tag on starter personas.
3. "Create New Persona" card → modal with Apollo filter fields.
4. Search/Explore actions per card.
5. Left sidebar: Library Stats, industry filter, data freshness radio.
6. Right sidebar: Live Data Stream feed (new matches, enrichments, lookalikes, alerts).
7. Wire to existing persona CRUD and search execution.

### Phase 5: Dashboard (Screen A)
1. Stat cards with the export card gold-emphasized.
2. New Prospects Found alert banner (even if placeholder data for now).
3. Recent Exports mini-table with re-download.
4. Persona pills with match counts.
5. Live activity feed with viewed/contacted distinction.
6. Wire to existing analytics/metrics queries.

### Phase 6: Export Log (Screen E)
1. Stat cards: monthly exports, unique prospects, top exporter.
2. Export history table with all columns.
3. Re-download functionality.
4. Credit usage indicator.
5. Filters and pagination.
6. Wire to existing export/activity_log data.

### Phase 7: Admin Dashboard (Screen F)
1. Platform Pulse stats.
2. Enrichment Health with circuit breaker states.
3. Unit Economics cost breakdown.
4. Export Activity sparkline.
5. Tenant Management table with all columns and actions.
6. Live Error Feed with severity levels.
7. System Actions grid.
8. Left sidebar with admin-specific nav.
9. Wire to existing admin queries and super_admin role gate.

### Phase 8: Polish + Verification
1. Run through every screen at 375px, 768px, 1024px, 1440px.
2. Verify all hover states, focus indicators, transitions match MASTER.md.
3. Verify no raw Tailwind color classes leaked in (grep for `zinc-`, `gray-`, `emerald-`, `yellow-`).
4. Verify all surfaces use gradients, never flat solid colors.
5. Verify keyboard navigation works (Tab order, Escape closes panels).
6. Verify empty states exist for every list/table/feed.
7. Verify all icon-only buttons have `aria-label`.
8. Verify page transitions (fade-in) on every route.
9. Verify dark mode is forced (`<html class="dark">`).
10. Verify tenant branding (logo, colors) applies correctly.
11. Run `pnpm build` — no errors, no warnings.
12. Run `pnpm test` — all existing tests pass.

---

## Critical Rules

1. **Design system is law.** If a mockup shows something that contradicts `design-system/MASTER.md`, the design system wins. The mockups inform UX and component placement. The design system dictates visual treatment.
2. **Preserve all business logic.** You are reskinning, not rewriting. Existing API calls, data fetching, auth, RLS, enrichment pipelines, Inngest jobs — all stay untouched. Only the UI layer changes.
3. **No new dependencies** without explicit approval. Use what's already in `package.json`.
4. **Card layout for prospects, not tables.** The MASTER.md explicitly says: "prospect search results are displayed as horizontal cards, not table rows." This is non-negotiable.
5. **CSS variables for all colors.** If you need a new color, define it as a CSS variable first, map it in tailwind.config.ts, then use the Tailwind class. Never inline hex/rgba.
6. **Test at every phase.** Don't stack phases without verifying the previous one builds and renders correctly.
7. **CRM integration is out of scope.** No HubSpot/Monday.com connection UI anywhere. CSV export is the bridge.
8. **Slide-over panel for prospect detail.** Not a full page navigation from search results. Click card → slide-over from right. The full page view is for direct navigation only.

---

## Stack Reference

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (with CSS custom properties)
- Supabase (PostgreSQL + Auth + RLS)
- Lucide React (icons)
- Recharts (charts)
- TanStack Table (data tables)
- Radix UI primitives (where already used)
- Vercel (deployment)
