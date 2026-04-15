# Roadmap: PGL Full UI Redesign (v2.0)

**Project:** Phronesis Growth Labs — Full frontend rebuild to match design system + stitch mockups
**Milestone:** v2.0 — UI Redesign
**Phases:** 15 (Phase 6–19, including 14.1)
**Constraint:** Preserve all business logic, API integrations, auth flows. UI layer only (Phases 6–14.1). Phases 15–18 add new functionality.

---

## Overview

Rebuild every page of the PGL platform to match the design system (design-system/MASTER.md) and stitch mockup UX direction. Six screens redesigned: Tenant Dashboard, Lead Search, Saved Personas, Prospect Profile, Export Log, Admin Dashboard. Foundation → screen builds → polish → admin rebuild → tenant management redesign → tenant branding → mobile optimization → mobile bottom navigation → admin automations dashboard.

---

## Phases

### Phase 6: Foundation — Design System Audit + Shared Components

**Goal:** Verify CSS/Tailwind tokens match MASTER.md, create/update all shared UI components that will be reused across screens.

**Dependencies:** None

**Deliverables:**
- Verified globals.css + tailwind.config.ts compliance
- TopBar, Breadcrumbs, WealthTierBadge, EnrichmentStatusDots, ProspectCard components
- Updated Badge component with CSS variable compliance

---

### Phase 7: Layout Shell + Navigation — COMPLETE

**Goal:** Implement the app shell (Sidebar 220px + TopBar 56px + main content area) with navigation matching mockup structure, mobile responsive.

**Dependencies:** Phase 6

**Status:** All 5 plans complete (07-01 through 07-05). NavItems, AdminNavLinks, Sidebar, MobileSidebar, AdminMobileSidebar, TopBar all built and wired. Build verified, design system compliance audited (13/13 pass), all nav routes confirmed.

---

### Phase 8: Lead Search (Screen B)

**Goal:** Natural Language Search bar, persona pills, advanced filters, horizontal prospect result cards, bulk actions, pagination, slide-over integration.

**Dependencies:** Phase 7

**Status:** COMPLETE — All 7 plans executed (08-01 through 08-07). All gaps closed.

**Plans:** 7/7 complete

Plans:
- [x] 08-01-PLAN.md — useSearch hook + PersonaPills + API filterOverrides schema
- [x] 08-02-PLAN.md — NLSearchBar + AdvancedFiltersPanel components
- [x] 08-03-PLAN.md — BulkActionsBar + ProspectResultCard with checkbox
- [x] 08-04-PLAN.md — SearchContent unified layout + WealthTierBadge cleanup
- [x] 08-05-PLAN.md — Build verification + design system compliance audit
- [x] 08-06-PLAN.md — Gap closure: Wire advanced filter fields through to Apollo API
- [x] 08-07-PLAN.md — Gap closure: Implement bulk action handlers (Add to List, Export CSV, Enrich)

---

### Phase 9: Prospect Profile (Screen D)

**Goal:** Slide-over panel (480px) + full page profile with wealth signals, SEC filings, activity log, Draft Outreach, Find Lookalikes.

**Dependencies:** Phase 8

---

### Phase 10: Saved Personas (Screen C)

**Goal:** Persona card grid with sparklines, suggested tags, create modal, library stats sidebar, live data stream.

**Dependencies:** Phase 7

---

### Phase 11: Dashboard (Screen A)

**Goal:** Tenant home with stat cards, new prospects alert, recent exports, persona pills, live activity feed.

**Dependencies:** Phase 7

**Plans:** 4/4 plans complete

Plans:
- [x] 11-01-PLAN.md — Build StatPills (Server), PersonaPillRow (Client), RecentListsPreview (Client)
- [x] 11-02-PLAN.md — Build ActivityFeed (Client) with /api/activity fetch and refresh
- [x] 11-03-PLAN.md — Rewrite /[orgId]/page.tsx: greeting, alert banner, stat pills, search hero, persona row, lists + activity feed grid
- [ ] 11-04-PLAN.md — Build verification + design system compliance audit

---

### Phase 12: Export Log (Screen E)

**Goal:** Export history table, stat cards, credit usage, filters, re-download, pagination.

**Dependencies:** Phase 7

**Requirements:** EXP-01, EXP-02, EXP-03, EXP-04, ACT-01, ACT-03

**Plans:** 2/2 plans complete

Plans:
- [x] 12-01-PLAN.md — Build Export Log page: nav item, server component, stat cards, client table with filters/pagination/re-download
- [x] 12-02-PLAN.md — Build verification + design system compliance audit

---

### Phase 13: Admin Dashboard (Screen F)

**Goal:** Platform pulse, enrichment health, unit economics, tenant management, error feed, system actions, admin sidebar nav.

**Dependencies:** Phase 7

---

### Phase 14: Polish + Verification — COMPLETE

**Goal:** Responsive testing (375/768/1024/1440px), raw Tailwind class audit, surface gradient verification, keyboard nav, empty states, accessibility, build + test pass.

**Dependencies:** Phases 8–13

**Status:** COMPLETE — All 2 plans executed. Global design system audit, accessibility fixes, loading state skeletons, error boundary polish, build verification.

**Plans:** 2/2 plans complete

Plans:
- [x] 14-01-PLAN.md — Cross-cutting fixes: prefers-reduced-motion, raw color violations, error boundary polish, loading.tsx stubs
- [x] 14-02-PLAN.md — Build verification + comprehensive design system compliance audit + STATE/ROADMAP update

### Phase 14.1: Admin Dashboard Rebuild — Match Stitch Mockup — COMPLETE

**Goal:** Rebuild the `/admin` Command Center page to match the `stitch/executive_strategy_dashboard_2` mockup — multi-metric Platform Pulse card, circuit-breaker Enrichment Health card, Unit Economics cost table, Export Activity mini chart, rich Tenant Management table, card-feed Error Feed, 2x2 System Actions grid, and two-section sidebar nav with styled user card.

**Requirements:** SA-01, SA-02, SA-03, SA-04, SA-05, ANLY-03
**Depends on:** Phase 14
**Status:** COMPLETE — All 5 plans executed. Admin dashboard rebuilt to match stitch mockup. Build verified (exit 0). All 9 design system compliance checks pass.
**Plans:** 5/5 plans complete

Plans:
- [x] 14.1-01-PLAN.md — Sidebar nav 2 sections (Platform Control + System Config stubs) + footer user card
- [x] 14.1-02-PLAN.md — PlatformPulse (multi-metric card) + EnrichmentHealthChart (circuit-breaker dots)
- [x] 14.1-03-PLAN.md — Unit Economics card + Export Activity mini chart + Tenant Management table
- [x] 14.1-04-PLAN.md — ErrorFeed card-feed + SystemActions grid + page.tsx layout assembly
- [x] 14.1-05-PLAN.md — Build verification + design system compliance audit + STATE/ROADMAP update

---

### Phase 15: Tenant Management Redesign — Invite Flows, Onboarding, Detail Drawer, Team Management

**Goal:** Redesign tenant management with email-based invite flows (Supabase Auth), admin onboarding confirmation step, rich tenant detail slide-over drawer (health score, usage stats, seat utilization, activity tabs with 3-level drill-down), and tenant-scoped team management page for tenant admins to invite their own users.

**Dependencies:** Phase 14.1

**Deliverables:**
- Email-based admin invite flow (Supabase `inviteUserByEmail` + custom onboarding redirect)
- `/onboarding/confirm-tenant` page — invited admin confirms/edits tenant name, slug, colors, sets password
- `onboarding_completed` metadata flag with middleware redirect logic
- Tenant detail slide-over drawer on `/admin/tenants` — header, seat utilization, health score, usage sparklines, top personas, growth trend, quota/limits, tabbed activity card
- 3-level drill-down: table → drawer → centered modal (full activity log viewer)
- `/[orgId]/team` page — tenant admin invites users via email, manages team members
- Email-based user invite flow (tenant admin scope, `agent`/`assistant` roles only)
- New activity log action types: `tenant_created`, `tenant_renamed`, `tenant_settings_updated`, `tenant_confirmed`, `user_invited`, `user_invite_accepted`
- Audit trail for all tenant name/setting changes with before/after metadata

**Requirements:** Multi-tenant admin UX, invite-based onboarding, tenant detail visibility, team self-management

**Status:** COMPLETE — All 8 plans executed. Build verified (pnpm build exit 0). Design system compliance audit: 10/15 files pass (remaining are acceptable SVG rgba patterns per Phase 05 decision).

**Plans:** 8/8 plans complete

Plans:
- [x] 15-01-PLAN.md — Activity logger updates + new action types + middleware onboarding redirect
- [x] 15-02-PLAN.md — Refactor Create Tenant + admin invite flow (form + server action + inviteUserByEmail)
- [x] 15-03-PLAN.md — Onboarding page /onboarding/confirm-tenant (confirm tenant settings + set password)
- [x] 15-04-PLAN.md — Tenant detail API endpoints (details, usage, health, personas, activity)
- [x] 15-05-PLAN.md — Tenant detail slide-over drawer (header, seats, health, usage, personas, growth, quota)
- [x] 15-06-PLAN.md — Tabbed activity card with 3-level drill-down modal
- [x] 15-07-PLAN.md — Team management page /[orgId]/team + user invite flow + simple user onboarding
- [x] 15-08-PLAN.md — Build verification + design system compliance audit

---

### Phase 16: Tenant Branding — Logo Upload, Curated Themes, Per-Tenant Theming

**Goal:** Replace unused free-form hex color inputs with 8 curated pre-paired color themes that override CSS variables at the layout level, enabling per-tenant theming across the entire app. Add logo upload to Supabase Storage (replacing URL text input). Display logos in sidebar, login page, and CSV exports.

**Dependencies:** Phase 15

**Deliverables:**
- `src/lib/tenant-theme.ts` — Theme map constant (8 themes: Gold, Sapphire, Emerald, Rose, Amber, Slate, Violet, Coral) with CSS variable computation helper
- DB migration: add `theme` column (text, default `'gold'`), drop `primary_color` + `secondary_color`
- `src/components/ui/theme-picker.tsx` — Visual theme selection grid (8 color swatches with hover preview + checkmark)
- `src/components/ui/logo-upload.tsx` — Drop zone upload component (Supabase Storage `general/tenant-logos/{tenantId}.*`, 2MB max, PNG/JPG/SVG/WebP)
- `src/app/[orgId]/layout.tsx` — Inject `<style>` tag overriding `--gold-primary`, `--gold-bright`, `--gold-text`, `--gold-bg`, `--gold-bg-strong` with tenant theme values
- Updated onboarding form (`/onboarding/confirm-tenant`) — ThemePicker + LogoUpload replace hex inputs + URL input
- Updated admin tenant detail drawer — ThemePicker + LogoUpload for admin override
- Upgraded sidebar logo display (36x36 rounded square, fallback initial tinted with tenant theme)
- Tenant-aware login page (show tenant logo + themed sign-in button when arriving from tenant context)
- Admin pages (`/admin/*`) always use Gold theme regardless of tenant

**Requirements:** Per-tenant CSS variable theming, curated palette (no ugly choices), logo upload to Supabase Storage, logo shown in sidebar + login + exports

**Status:** COMPLETE — All 8 plans executed. Theme map, logo upload, theme picker, per-tenant CSS variable injection, onboarding/admin forms updated, tenant-aware login page, stale reference cleanup done.

**Plans:** 8/8 plans complete

Plans:
- [x] 16-01-PLAN.md — Theme map constant + DB migration (add `theme`, drop color columns) + type updates
- [x] 16-02-PLAN.md — Logo upload API route (Supabase Storage) + LogoUpload drop zone component
- [x] 16-03-PLAN.md — ThemePicker component (8 curated color swatches with gradient preview)
- [x] 16-04-PLAN.md — CSS variable override in org layout (`<style>` tag injection per tenant)
- [x] 16-05-PLAN.md — Update tenant creation form + onboarding page (ThemePicker + LogoUpload replace hex/URL inputs)
- [x] 16-06-PLAN.md — Admin tenant detail drawer (ThemePicker + LogoUpload for admin override)
- [x] 16-07-PLAN.md — Tenant-aware login page + upgraded sidebar logo (rounded square)
- [x] 16-08-PLAN.md — Build verification + stale reference cleanup + STATE/ROADMAP update

---

### Phase 17: Mobile Optimization — Beautiful Responsive UI

**Goal:** Transform the entire app into a best-in-class mobile experience. Fix all 120+ mobile responsiveness issues across Super Admin and Tenant views: layout-breaking grids, undersized touch targets (WCAG 44px minimum), hover-only interactions, fixed typography, non-responsive dialogs/drawers/tables, missing safe area handling, and desktop-first spacing. Implement mobile-first card layouts for all data tables, responsive typography scale, touch-aware hover states (`@media (hover: hover)`), full-screen mobile dialogs, stacked form layouts, mobile search access, and consistent responsive spacing (`p-4 md:p-6` pattern).

**Dependencies:** Phase 16

**Deliverables:**
- **Phase 1 — Critical Layout Fixes:** Fix personas 3-column grid, tenant detail drawer (680px→responsive), dialog component (full-screen mobile), persona form dialog, prospect table hover-only actions, bulk actions bar stacking, pagination mobile variant
- **Phase 2 — Touch Targets + Hover States:** All buttons/nav items to 44px minimum, wrap all CSS hover with `@media (hover: hover)`, replace all inline `onMouseEnter/onMouseLeave` with CSS classes per MASTER.md drill-down hover pattern
- **Phase 3 — Responsive Typography:** Convert all fixed `text-[Xpx]` and inline `fontSize` to Tailwind responsive scale (`text-2xl md:text-4xl`), responsive stat card numbers, responsive card/dialog titles
- **Phase 4 — Table Mobile Variants:** Card-based fallback layout for 6 data tables (admin users, admin tenants, team members, prospect results, export log, list members), responsive column hiding, horizontal scroll indicators
- **Phase 5 — Spacing & Components:** Responsive padding on Card/Dialog/Sheet/EmptyState (`p-4 md:p-6`), mobile-optimized form button stacking (`flex-col sm:flex-row`), chart responsive heights, safe area insets for notched devices
- **Phase 6 — Mobile Feature Parity:** Mobile search access (in mobile header or bottom bar), ambient glow GPU optimization (hide below md:), scroll affordance indicators, `prefers-reduced-motion` on all spinners, loading skeleton mobile alignment

**Requirements:** WCAG 2.1 Level AA touch targets, mobile-first responsive design, design system MASTER.md compliance, zero horizontal overflow on 375px viewport

**Status:** COMPLETE — All 7 plans executed. Build verified (pnpm build exit 0). Design system audit: 32/39 files pass (7 pre-existing violations from prior phases, zero new violations introduced).

**Plans:** 7/7 plans complete

Plans:
- [x] 17-01-PLAN.md — Critical layout fixes (personas grid, tenant drawer, dialog, list grid, sheet)
- [x] 17-02-PLAN.md — Touch targets + hover states (@media hover:hover, 44px buttons, visible actions)
- [x] 17-03-PLAN.md — Responsive typography (page titles, stat numbers, section headings)
- [x] 17-04-PLAN.md — Table mobile variants (6 tables with card-based mobile layout)
- [x] 17-05-PLAN.md — Spacing & components (responsive padding, form stacking, safe area)
- [x] 17-06-PLAN.md — Mobile feature parity (search access, ambient glow GPU, reduced motion)
- [x] 17-07-PLAN.md — Build verification + design system compliance audit

---

### Phase 18: Mobile Bottom Navigation — ClickUp-Style Tab Bar + Quick Actions

**Goal:** Replace the hamburger-menu mobile navigation with a native-app-style bottom tab bar (Home, Search, Personas, More) plus a "+" floating action button for quick creates. Follows ClickUp's mobile app patterns: bottom dock for primary navigation, bottom sheet drawers for secondary nav ("More") and quick actions ("+"), simplified mobile header (no hamburger).

**Dependencies:** Phase 17

**Deliverables:**
- `MobileBottomNav` component — fixed bottom tab bar with 4 labeled tabs (Home, Search, Personas, More) + circular "+" action button
- "More" bottom sheet — 2-column grid of secondary nav tiles (Lists, Exports, Activity, Analytics, Team) with colored icon backgrounds
- "+" Quick Actions bottom sheet — vertical action list (Search Prospects, Create Persona, Export Data) with descriptions
- Simplified mobile header — org logo + name (left), user avatar (right), no hamburger menu, no search icon
- Layout updates — bottom content padding to clear fixed tab bar, pass user props to mobile header
- Route-aware active tab highlighting with gold-tinted pill indicator
- Safe area inset handling on bottom nav

**Requirements:** ClickUp mobile pattern compliance, bottom tab bar with 4+1 layout, bottom sheet drawers for secondary nav and quick actions, no hamburger menu on mobile, design system MASTER.md compliance

**Status:** PLANNED — 3 plans ready for execution

**Plans:** 0/3 complete

Plans:
- [ ] 18-01-PLAN.md — MobileBottomNav component (tab bar + "More" sheet + "+" sheet)
- [ ] 18-02-PLAN.md — Mobile header rewrite + layout integration + create persona trigger
- [ ] 18-03-PLAN.md — Build verification + design system compliance audit

### Phase 21: Depth & Polish — Visual Refinement Pass — COMPLETE

**Goal:** Wire existing depth/polish CSS utility classes (row-enter, card-glow, press-effect, row-hover-lift, surface-card-featured) to all remaining tenant and admin components that lack them. Add backdrop blur to elevated surfaces (Sheet overlay, DropdownMenu). Verify build and audit box-shadow consistency.

**Requirements:** VR-01, VR-02, VR-03, VR-04, VR-05, VR-06, VR-07
**Depends on:** Phase 20
**Status:** COMPLETE — All 3 plans executed. Build verified (pnpm build --no-lint exit 0). Box-shadow audit: zero regressions. All 7 target components confirmed with depth CSS classes. Both elevated surfaces (sheet.tsx, dropdown-menu.tsx) confirmed with backdrop-blur-sm.

**Plans:** 3/3 plans complete

Plans:
- [x] 21-01-PLAN.md — Wire depth classes to tenant components (search cards, persona cards, list grid, activity feed, export log, stat cards)
- [x] 21-02-PLAN.md — Backdrop blur on elevated surfaces (Sheet, DropdownMenu) + admin automation runs table wiring
- [x] 21-03-PLAN.md — Build verification + box-shadow consistency audit

### Phase 22: Lead Profile Editing — Inline Edit, Tags, Photo Upload, Lead Owner

**Goal:** Add inline editing to prospect profiles: manual_* override columns on prospects table, InlineEditField component (pencil-on-hover, input mode, gold flash save), AvatarUpload for photo, LeadOwnerSelect dropdown, TagInput wired to prospect_tags table, RBAC gating (assistant canEdit=false). Display logic: manual_field ?? enriched_field ?? null.

**Requirements:** EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-10
**Depends on:** Phase 21
**Plans:** 5/5 plans complete

Plans:
- [x] 22-01-PLAN.md — DB migration (manual_* columns, prospect_tags, prospect_custom_fields) + TypeScript types + activity logger
- [x] 22-02-PLAN.md — InlineEditField, AvatarUpload, LeadOwnerSelect components + resolveField helper
- [x] 22-03-PLAN.md — API routes: PATCH profile, GET/POST/DELETE tags, POST photo
- [x] 22-04-PLAN.md — Wire editing into page.tsx, ProfileView, ProfileHeader (RBAC gate)
- [x] 22-05-PLAN.md — Build verification + design system compliance audit

### Phase 23: Intelligence Dossier & Wealth Signal Timeline — Split Enrichment Display

**Goal:** Split the existing "Wealth Signals & Intelligence" section into two distinct features: (1) Intelligence Dossier — a structured, AI-generated prose brief stored as JSONB on prospects, generated at end of enrichment pipeline; (2) Wealth Signal Timeline — a vertical event feed backed by a new prospect_signals table with per-user seen tracking via signal_views. New Inngest step 5.5 generates dossier, dual-write signals to prospect_signals alongside existing JSONB blobs.
**Requirements:** DOSS-01, DOSS-02, DOSS-03, DOSS-04, DOSS-05, SIG-01, SIG-02, SIG-03, SIG-04, SIG-05, SIG-06, SIG-07, SIG-08, SIG-09, SIG-10, SIG-11, SIG-12
**Depends on:** Phase 22
**Plans:** 5/5 plans complete

Plans:
- [x] 23-01-PLAN.md — DB migration (prospect_signals, signal_views tables, prospects dossier columns) + TypeScript types
- [x] 23-02-PLAN.md — generateIntelligenceDossier() function + exa-digest event_date propagation
- [x] 23-03-PLAN.md — Enrichment pipeline update (signal writes in fetch-exa/fetch-edgar + dossier Step 5.5)
- [x] 23-04-PLAN.md — IntelligenceDossier + SignalTimeline components + signals/mark-seen API routes
- [x] 23-05-PLAN.md — Wire into profile-view.tsx + page.tsx (replace WealthSignals) + build verification

### Phase 24: Activity Log — Full Build: prospect_activity table, quick action bar, timeline feed, filter bar, system event triggers, auto-status upgrade, note tooltips

**Goal:** Create a dedicated prospect_activity table with CRUD API, build Quick Action Bar (6 outreach/note/custom buttons with inline inputs), Timeline Feed (color-coded by category, date-grouped, collapsible), Filter Bar (category checkboxes, system events toggle), wire system event triggers across enrichment pipeline and all existing flows, implement auto-status upgrade on outreach events, and add note tooltips to list member table rows.

**Requirements:** ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06, ACT-07, ACT-08, ACT-09, ACT-10
**Depends on:** Phase 23
**Plans:** 2/5 plans executed

Plans:
- [x] 24-01-PLAN.md — prospect_activity table DDL + data migration + TypeScript types + logProspectActivity utility
- [ ] 24-02-PLAN.md — CRUD API routes (GET/POST/PATCH/DELETE) for prospect activity
- [ ] 24-03-PLAN.md — QuickActionBar + ActivityFilter + TimelineFeed components
- [ ] 24-04-PLAN.md — Profile page integration + system event triggers + auto-status upgrade
- [x] 24-05-PLAN.md — List view note tooltip + build verification

### Phase 25: Exa Research Scrapbook

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 24
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 25 to break down)

### Phase 26: Targeted Multi-Source Search — Intent-Routed Channels (SEC, ATTOM, News, OpenCorporates, Crunchbase)

**Goal:** Add intent-routed multi-source search channels alongside Exa. LLM classifies query intent, fires specialized APIs in parallel (SEC EDGAR EFTS, GNews, OpenCorporates, Crunchbase, ATTOM), merges/deduplicates/ranks into unified feed. Each channel is isolated with circuit breaker, rate limiter, and per-channel TTL caching. Graceful degradation when API keys are missing. UI shows channel source badges, status indicators, and filter chips.

**Requirements:** MSS-01, MSS-02, MSS-03, MSS-04, MSS-05, MSS-06, MSS-07, MSS-08, MSS-09, MSS-10, MSS-11, MSS-12, MSS-13, MSS-14, MSS-15
**Depends on:** Phase 25
**Status:** PLANNED — 5 plans ready for execution

**Plans:** 5/5 plans complete

Plans:
- [x] 26-01-PLAN.md — Type contracts + channel registry + intent classifier + rate limiters + channel cache
- [x] 26-02-PLAN.md — Exa adapter + EDGAR EFTS + GNews channel implementations
- [x] 26-03-PLAN.md — OpenCorporates + Crunchbase + ATTOM channel implementations
- [x] 26-04-PLAN.md — Orchestrator (executeResearch) + merge/dedup + channel registration barrel
- [x] 26-05-PLAN.md — API route + UI components (channel status bar, filter chips, result card) + build verification


### Phase 27: Research Chat UX Polish — Streaming indicators, Exa response surfacing, chat UI templates

**Goal:** Enhance the research chat panel with contextual streaming phase labels (thinking, searching, analyzing N results, building cards), surface richer Exa API response data (highlights, summary, author, favicon) in result cards, improve empty states, and clean up inline CSS animations. No new dependencies — pure code-level UX polish of existing research panel.
**Requirements:** RCH-01, RCH-02, RCH-03, RCH-04, RCH-05, RCH-06, RCH-07, RCH-08
**Depends on:** Phase 26
**Status:** PLANNED — 3 plans ready for execution

**Plans:** 2/3 plans executed

Plans:
- [x] 27-01-PLAN.md — Type contracts + Exa API request enhancement + digest prompt upgrade
- [x] 27-02-PLAN.md — Streaming phase labels + ExaHighlightQuote + keyframe cleanup + empty state
- [ ] 27-03-PLAN.md — Build verification + design system compliance audit

### Phase 28: Saved Search Incremental Refresh, Dismiss, and Delete

**Goal:** Add persistent memory layer to saved searches so they track which Apollo prospects have been seen, dismissed, or enriched. On refresh, show only genuinely new results. Dismiss individual or bulk prospects, undo dismissals, prevent dismissed from reappearing. Keep enrichment status synced across searches. Rename user-facing "Persona" to "Saved Search".
**Requirements**: TBD
**Depends on:** Phase 27
**Status:** PLANNED — 4 plans ready for execution

**Plans:** 4/4 plans complete

Plans:
- [x] 28-01-PLAN.md — DB migration (saved_search_prospects table + personas columns) + types + schema push
- [x] 28-02-PLAN.md — Refresh diff algorithm + API routes (refresh, prospects, dismiss) + enrichment sync hook
- [x] 28-03-PLAN.md — UI integration (search-content, results table, bulk actions bar)
- [x] 28-04-PLAN.md — UI rename (Persona -> Saved Search) + build verification

### Phase 32: Discover Tab v2 — Layout Tightening, Search Depth, Filter Pills, Suggested Personas, Stats Bar, Nav Badges

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 31
**Plans:** 3/3 plans complete

Plans:
- [x] TBD (run /gsd-plan-phase 32 to break down) (completed 2026-04-07)

### Phase 36: Fix NLP search flow issues (25 bugs from 5-agent audit)

**Goal:** Fix 25 bugs identified by a 5-agent audit of the NLP search flow. Server-side hardening (rate limiting, query length guard, timeout, enum validation), core hook fixes (double API call, parse cache, stale filter clearing, pageSize mismatch), Discover tab UX (auto-submit, loading states, width consistency, clear button), and search orchestrator fixes (save dialog pre-fill, mode guards, auto-scroll, pagination).

**Requirements**: PHASE-36
**Depends on:** Phase 35
**Status:** PLANNED -- 4 plans ready for execution

**Plans:** 4/4 plans complete

Plans:
- [x] 36-01-PLAN.md -- Server-side hardening: rate limiter, query length guard, OpenRouter timeout, enum validation, max_tokens increase
- [x] 36-02-PLAN.md -- Core hook + filter panel fixes: single-fire search, parse cache, filter clearing, pageSize constant, net_worth clear
- [x] 36-03-PLAN.md -- Discover tab + NL search bar: auto-submit on prefill, loading guard, spinner, hide discovery sections, width, clear button
- [x] 36-04-PLAN.md -- Search orchestrator: save dialog pre-fill, mode guards, auto-scroll, pagination display, currentFilters wiring

### Phase 37: LLM Prompt Overhaul — fix hallucination, model selection, weak prompting across all 10 LLM layers

**Goal:** Swap all 10 LLM prompts from Claude 3.5 Haiku to GPT-4o-mini, add anti-hallucination guardrails to prospect summary and dossier, add defined categories with negative_signal to Exa digest, add few-shot examples to NLP parser, add companySize validation, rewrite query reformulator with Exa-specific rules, add relevance filtering to scrapbook digest, simplify intent classifier, and fix lookalike hallucination amplification.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10
**Depends on:** Phase 36
**Status:** PLANNED — 5 plans ready for execution

**Plans:** 5/5 plans complete

Plans:
- [x] 37-01-PLAN.md — Model swap to GPT-4o-mini + 25s timeout + SEC resolver heuristic cleanup
- [x] 37-02-PLAN.md — Exa digest defined categories + negative_signal type + Signal Timeline UI
- [x] 37-03-PLAN.md — Summary anti-hallucination rules + lookalike input cleanup + dossier range tightening
- [x] 37-04-PLAN.md — NLP parser few-shot examples + companySize validation + query reformulator rewrite
- [x] 37-05-PLAN.md — Scrapbook digest relevance filtering + intent classifier entityType cleanup

### Phase 38: Issue report timeline audit log with right-rail event history on admin detail page

**Goal:** Add an append-only event history for `issue_reports` and surface it as a right-rail timeline card next to Admin Actions on the admin report detail page. New `issue_report_events` table with backfill, 5 event types (reported, status_changed, note_added, viewed_by_admin, screenshot_expired), close-requires-note enforcement on both client and server, and TimelineCard UI rendered in a 2:1 grid beside the existing Admin Actions form on lg: screens.
**Requirements**: PHASE-38-SCHEMA, PHASE-38-TYPES, PHASE-38-BACKFILL, PHASE-38-WRITERS-TENANT, PHASE-38-WRITERS-ADMIN, PHASE-38-CLOSE-GUARD-SERVER, PHASE-38-CLOSE-GUARD-CLIENT, PHASE-38-VIEW-DEDUP, PHASE-38-SCREENSHOT-EXPIRED, PHASE-38-TIMELINE-UI, PHASE-38-LAYOUT, PHASE-38-UAT
**Depends on:** Phase 37
**Plans:** 4/4 plans complete

Plans:
- [x] 38-01-PLAN.md — Schema + backfill migration + TypeScript types + [BLOCKING] schema push
- [x] 38-02-PLAN.md — Event writers: tenant POST reported + admin PATCH status_changed/note_added with close-requires-note 400 + GET viewed_by_admin dedup + screenshot_expired + events[] response
- [x] 38-03-PLAN.md — TimelineCard component (5 variants) + 2:1 grid layout split + close-requires-note UX + server loader threads events
- [x] 38-04-PLAN.md — UAT: 7-scenario end-to-end verification against CONTEXT.md success criteria

### Phase 39: UX Polish Pass - Luxury Consistency and Keystone Primitives

**Goal:** Close the 242 findings from the 5-agent UX audit (`.planning/audits/ux-polish-2026-04-14/`) so every role — Super Admin, Tenant Admin, Agent, Assistant — feels consistently luxury-grade. Ship in 5 PRs per the audit's suggested order: (1) 10 keystone primitive edits that cascade across the app (toast auto-dismiss + limit, `<Toaster/>` + `<TooltipProvider>` mounts, `Button` default → `gold-solid`, Toast/Tooltip/DropdownMenu restyle to `--bg-floating-elevated`, Input/Textarea/Select focus → `var(--gold-bg-strong)`, Badge/Button gold → token-based, `EnrichmentStatusDots` rollout + `animate-pulse`, `src/app/not-found.tsx`, Checkbox + Table selected-row → gold) that alone closes ~60 findings; (2) destructive-action safety sweep onto the existing `<Confirmation>` primitive (native `confirm()` + unguarded delete flows across search, lists, personas, team, system actions, API-key rotation); (3) Assistant read-only role gating threaded through BulkActionsBar + ProspectSlideOver + ListGrid + PersonaCardGrid + Notes (today Assistants see every write button and 403 on click); (4) tenant-theme leak fix — replace hard-coded `#d4af37` / `rgba(212,175,55,*)` with `var(--gold-*)` tokens in 9 primitive files so sapphire/emerald/coral tenants theme correctly; (5) per-screen polish working through the five per-area audit files. No architectural changes, no new features, no scope additions — polish only.
**Requirements:** PHASE-39-K1 through PHASE-39-K10, PHASE-39-T1-DESTRUCTIVE-SWEEP, PHASE-39-T2-ROLE-GATING, PHASE-39-T3-THEME-LEAK, PHASE-39-T5-LOADING-SHAPE, PHASE-39-T6-SAAS-TELLS, PHASE-39-SCREEN-ADMIN, PHASE-39-SCREEN-AUTH, PHASE-39-SCREEN-AGENT, PHASE-39-SCREEN-SHELL, PHASE-39-SCREEN-TOKENS
**Depends on:** Phase 38
**Plans:** 9/9 plans complete

Plans:
- [x] 39-01-PLAN.md — Keystone primitives (K1-K10): toast timing + Toaster admin mount + TooltipProvider + Button default gold-solid + floating-elevated surfaces + focus-shadow token + badge/button gold-var + EnrichmentStatusDots rollout + not-found.tsx + checkbox/table selected gold
- [x] 39-02-PLAN.md — Destructive-action safety sweep (T1): 7 surfaces onto Confirmation primitive (search dismiss, list delete, list-member remove, persona delete, SystemActions, mock-mode flip, team Remove member)
- [x] 39-03-PLAN.md — Assistant read-only role gating (T2): canEdit threaded through BulkActionsBar, ProspectSlideOver, ListGrid, PersonaCardGrid, Notes
- [x] 39-04-PLAN.md — Tenant-theme hex leak fix (T3): 8 primitive files + grep-zero verification
- [x] 39-05-PLAN.md — Admin screen polish (01-super-admin.md residuals): themed Selects, Breadcrumbs, EmptyState rollout, sticky headers, visibility-guarded polling, heatmap ghost buttons
- [x] 39-06-PLAN.md — Auth + onboarding + team + settings polish (02-tenant-admin-auth.md residuals): Loader2 spinners, ambient glow, password strength, Input primitive, team Promise.all, role differentiation
- [x] 39-07-PLAN.md — Agent workflow polish (03-agent-workflow.md + T5 loading + T6 saas-tells): Checkbox indeterminate, TagInput, Realtime re-enrich, user-name resolution, count-up, 3 new loading.tsx
- [x] 39-08-PLAN.md — Shell cross-cutting polish (04-shell-cross-cutting.md): sidebar unification, NavItems gold pill + Bookmark, TopBar avatar Link, CommandSearch onOpenAutoFocus, Dialog/Sheet backdrop-blur + font-serif, error-page consolidation, .focus-ring-gold utility
- [x] 39-09-PLAN.md — Design system typography + token cleanup (05-design-system.md residuals): Button motion, Input bg-input-custom, Select gold focus, Badge semantic tokens, Shimmer shimmer-skeleton, Dialog inline-style, color leak cleanup, EmptyState batch rollout (10 sites)

---

### Phase 40: Instant UX Pass — Optimistic Mutations + Supabase Realtime for Enrichment

**Goal:** Eliminate every user-visible "waiting for server" moment. Audit every mutating action in the app (server actions, fetch POST/PATCH/DELETE calls to `/api/*`, Supabase writes) and resolve each one of three ways: (a) **optimistic update** — write to UI state immediately, then reconcile on server response (rename list, toggle favorite, add/remove tag, edit inline field, delete row, reorder, mark-seen, add-to-list, note save, status change); (b) **Supabase Realtime** — subscribe to the table and let the server push truth (enrichment_status transitions on `saved_search_prospects` + `prospects.enriched_at`, so green checks appear without browser refresh — the exact complaint Adrian raised on the 2026-04-13 call); (c) **fast skeleton** — when neither optimistic nor realtime fits (multi-step flows, external API calls), show a skeleton immediately and never a blank screen. Deliverable is a written audit spreadsheet of every mutating surface with its chosen strategy, then the actual implementation. Constraints: no regressions to RLS, no memory leaks from uncleaned Realtime channels, gracefully degrade to polling when WS fails, preserve toast/error UX on rollback.

**Requirements:** PHASE-40-MUTATION-AUDIT, PHASE-40-OPTIMISTIC-LISTS, PHASE-40-OPTIMISTIC-PERSONAS, PHASE-40-OPTIMISTIC-PROSPECT-EDIT, PHASE-40-OPTIMISTIC-NOTES, PHASE-40-OPTIMISTIC-TAGS, PHASE-40-REALTIME-ENRICHMENT, PHASE-40-REALTIME-CHANNEL-CLEANUP, PHASE-40-SKELETON-FALLBACK, PHASE-40-ROLLBACK-UX, PHASE-40-RLS-SAFETY, PHASE-40-UAT
**Depends on:** Phase 39
**Status:** Not started

---

### Phase 41: Tutorial & Onboarding Flows — First-Run Experience for Non-Technical Users

**Goal:** Ship the onboarding path for real estate agents (non-technical users per Adrian's 2026-04-13 call: *"they don't want to spend time understanding crazy interfaces and tools"*). Deliverable: (1) **first-run product tour** — dismissible multi-step coachmark/spotlight overlay triggered on first login to tenant app that walks through Discover → New Search → Enrich Selection → List → Prospect Profile → Export CSV (the core value journey); (2) **empty-state tutorials** — contextual "how to get started" cards on Dashboard, Lists, Personas, Activity when empty (not just decorative emptiness, an actual prompt with a CTA); (3) **embedded 2–3 min overview video** — Loom or self-hosted, accessible from a persistent Help button in the top bar; (4) **tooltip-style inline help** — on dense controls (Advanced Filters, enrichment status dots, bulk actions bar); (5) **"Replay tour" entry** in user settings so they can re-trigger the walkthrough; (6) **admin-side onboarding checklist** — for Tenant Admins on first login (invite team, upload logo, pick theme, create first persona) with progress bar that persists across sessions. Progress state stored per-user in Supabase. No architectural changes to existing surfaces — tutorial lives as an overlay + empty-state copy + help affordances. Success criterion: a real estate agent with zero prior context can complete their first enriched search without asking for help.

**Requirements:** PHASE-41-TOUR-ENGINE, PHASE-41-TOUR-CONTENT-TENANT, PHASE-41-TOUR-CONTENT-ADMIN, PHASE-41-EMPTY-STATE-TUTORIALS, PHASE-41-OVERVIEW-VIDEO, PHASE-41-HELP-BUTTON, PHASE-41-TOOLTIP-HELP, PHASE-41-REPLAY-TOUR, PHASE-41-ADMIN-CHECKLIST, PHASE-41-PROGRESS-PERSISTENCE, PHASE-41-UAT
**Depends on:** Phase 39 (Phase 40 not a hard dep — can ship in parallel)
**Status:** Not started

---

### Phase 38 [STALE]: Per-Tenant Credit Limit System — DEFERRED

**Status:** STALE as of 2026-04-15. Directory renamed to `.planning/phases/38-per-tenant-credit-system.STALE/`. Do not execute without explicit user confirmation.

**Why deferred:** On the 2026-04-13 call with Camila + Ayman, Adrian said: *"We don't have to do that right now because I want to get the tool to the client working ASAP."* Priority is shipping to Maggie (first real estate client), collecting 2–3 weeks of real feedback, then re-evaluating whether credit metering matters when scaling to other verticals. Existing Apollo rate limits + the Maggie agreement are sufficient for now.

**When to revisit:** (a) Adrian revives it explicitly, (b) a second tenant with different consumption profile onboards, or (c) usage exceeds what the current flat-fee agreement covers.

---

### Phase 19: Admin Automations Dashboard — Inngest Monitoring

**Goal:** Add an Automations tab to the admin panel that displays health, invocation history, and per-source status for all Inngest background functions (enrich-prospect, aggregate-daily-metrics). Clicking a run opens a detail sidebar with timing, source breakdown, error messages, and re-enrich action. Built from existing DB data (prospects, activity_log) supplemented by Inngest REST API for run-level details.

**Dependencies:** Phase 14.1

**Deliverables:**
- `enrichment_started_at` timestamp column on prospects table (enables duration calculation)
- `metrics_aggregated` activity_log entry from daily-metrics Inngest function (enables cron run history)
- Store Inngest event ID on prospect when firing enrichment (enables Inngest API drill-down)
- `GET /api/admin/automations` — summary stats + per-function health aggregation
- `GET /api/admin/automations/runs` — recent runs list (enrichment from prospects, cron from activity_log)
- `GET /api/admin/automations/runs/[id]` — single run detail (DB data + lazy Inngest API fetch)
- `/admin/automations` page — summary stat cards, automation health cards (one per function), recent runs table
- `AutomationDetailDrawer` — right-side Sheet with status banner, timing grid, source breakdown, prospect context, re-enrich action
- Admin sidebar nav update — add "Automations" link under Platform Control
- Design system compliant (CSS variables, surface-card, gold accents, responsive mobile cards)

**Requirements:** No new DB tables. Hybrid data strategy: existing DB columns + Inngest REST API. Mobile responsive.

**Status:** COMPLETE — All 5 plans executed. Build verified (pnpm build exit 0). Design system compliance audit: all structural rules pass.

**Plans:** 5/5 complete

Plans:
- [x] 19-01-PLAN.md — Data foundation (enrichment_started_at, inngest_event_id, metrics_aggregated activity logging)
- [x] 19-02-PLAN.md — API endpoints (summary, runs list, run detail with Inngest API)
- [x] 19-03-PLAN.md — Admin nav + page + stat cards + health cards
- [x] 19-04-PLAN.md — Recent runs table + detail drawer sidebar
- [x] 19-05-PLAN.md — Build verification + design system compliance audit

### Phase 20: Platform Pulse Detail Modal — Expandable Analytics Overlay

**Goal:** Click the Platform Pulse card on the admin Command Center to open a premium modal with larger interactive charts (14-day Active Users + Prospects Scraped with hover tooltips, average reference lines), enrichment source success rate breakdown table (ContactOut, Exa, SEC EDGAR, Claude AI), and top 5 tenants by activity. Fade+scale animation from card position.

**Scope:**
- Modal overlay with backdrop blur, fade+scale animation (200ms ease-out), close via X/overlay/Escape
- Summary stat pills row (Active Users, Prospects Scraped, Success Rate)
- Two large SVG charts (side-by-side, stacked mobile) with hover tooltip + average dashed line + day labels
- Enrichment source breakdown table: source name, colored status dot (green/amber/red), success %, total runs
- Top 5 tenants by activity: ranked list from activity_log grouped by tenant_id
- Dashboard API extended: add `sourceStats` and `topTenants` fields (parallel queries, no new endpoints)
- Pure React + SVG + CSS transitions, no charting library

**Requirements:** No new dependencies. No new API endpoints. Mobile responsive (stacked layout). Design system compliant.

**Status:** COMPLETE -- All 3 plans executed. Build verified (pnpm build exit 0). Design system compliance audit: all 12 checks pass.

**Plans:** 3/3 complete

Plans:
- [x] 20-01-PLAN.md -- Dashboard API: add sourceStats + topTenants queries
- [x] 20-02-PLAN.md -- PlatformPulseModal component (charts, tables, animation)
- [x] 20-03-PLAN.md -- Build verification + design system compliance

### Phase 24: Activity Log Full Build — Prospect Activity Table, Quick Action Bar, Timeline Feed, Filter Bar, System Event Triggers, Auto Status Upgrade, Note Tooltips

**Goal:** Build a complete per-prospect activity log system: prospect_activity DB table with category/event_type hierarchy, TypeScript types, shared logging utility, Timeline Feed UI component, Quick Action Bar for manual activity entry, Filter Bar by category, system event triggers wired to existing enrichment/editing flows, auto status upgrade logic, and note tooltips.

**Requirements:** ACT-01, ACT-02
**Depends on:** Phase 22

**Status:** EXECUTING — Plan 1 of N complete

**Plans:** 1/N complete

Plans:
- [x] 24-01-PLAN.md -- prospect_activity table DDL + data migration from activity_log + TypeScript types + logProspectActivity utility
- [ ] 24-02-PLAN.md -- (pending)
- [ ] 24-03-PLAN.md -- (pending)
- [ ] 24-04-PLAN.md -- (pending)
- [ ] 24-05-PLAN.md -- (pending)

### Phase 34: SaaS Critical — Auth, Security & Audit Fix

**Goal:** Fix critical SaaS delivery gaps: activity_log CHECK constraint blocking 13 action types, password reset flow, user profile/settings page, deactivated tenant enforcement, and session expiry handling.

**Requirements:** AUTH-01 extension, SA-04 enforcement, multi-tenant operational readiness
**Depends on:** Phase 33
**Status:** COMPLETE — All 5 plans executed (2026-04-10)

**Plans:** 5/5 plans complete

Plans:
- [x] 34-01-PLAN.md — Fix activity_log CHECK constraint (DB migration to allow all 24 action types)
- [x] 34-02-PLAN.md — Password Reset / Forgot Password (forgot-password + reset-password pages + auth callback)
- [x] 34-03-PLAN.md — User Profile / Account Settings page (name, password, account info)
- [x] 34-04-PLAN.md — Deactivated Tenant Gate (middleware check + /suspended page + API guard)
- [x] 34-05-PLAN.md — Session/Token Expiry Handling (SessionGuard component + root layout mount)

### Phase 35: Team & Tenant Operations

**Goal:** Complete multi-tenant team management: tenant settings page, seat limits/quotas, pending invite visibility, role changes, user removal, and simplified non-admin onboarding.

**Requirements:** Multi-tenant operational readiness, team self-management
**Depends on:** Phase 34
**Status:** PLANNED — 6 plans ready for execution

**Plans:** 6/6 plans complete

Plans:
- [x] 35-01-PLAN.md — Tenant Settings Page (org name, slug, logo, theme for tenant admins)
- [x] 35-02-PLAN.md — Seat Limits / Usage Quotas (max_seats column, invite enforcement, admin config)
- [x] 35-03-PLAN.md — Pending Invite Visibility (status badges, resend/revoke actions)
- [x] 35-04-PLAN.md — Role Change by Tenant Admin (agent <-> assistant role switching)
- [x] 35-05-PLAN.md — User Removal (full delete, not just deactivate)
- [x] 35-06-PLAN.md — Non-Admin Onboarding (simplified set-password page for agents/assistants)