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
