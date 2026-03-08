# Roadmap: PGL Full UI Redesign (v2.0)

**Project:** Phronesis Growth Labs — Full frontend rebuild to match design system + stitch mockups
**Milestone:** v2.0 — UI Redesign
**Phases:** 11 (Phase 6–15, including 14.1)
**Constraint:** Preserve all business logic, API integrations, auth flows. UI layer only (Phases 6–14.1). Phase 15 adds new functionality.

---

## Overview

Rebuild every page of the PGL platform to match the design system (design-system/MASTER.md) and stitch mockup UX direction. Six screens redesigned: Tenant Dashboard, Lead Search, Saved Personas, Prospect Profile, Export Log, Admin Dashboard. Foundation → screen builds → polish → admin rebuild → tenant management redesign.

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
