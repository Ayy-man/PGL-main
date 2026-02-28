# Roadmap: PGL Full UI Redesign (v2.0)

**Project:** Phronesis Growth Labs — Full frontend rebuild to match design system + stitch mockups
**Milestone:** v2.0 — UI Redesign
**Phases:** 9 (Phase 0–8)
**Constraint:** Preserve all business logic, API integrations, auth flows. UI layer only.

---

## Overview

Rebuild every page of the PGL platform to match the design system (design-system/MASTER.md) and stitch mockup UX direction. Six screens redesigned: Tenant Dashboard, Lead Search, Saved Personas, Prospect Profile, Export Log, Admin Dashboard. Phase 0 establishes shared components; Phases 1–7 build each screen; Phase 8 polishes and verifies.

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

### Phase 14.1: Admin Dashboard Rebuild — Match Stitch Mockup (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 14
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 14.1 to break down)
