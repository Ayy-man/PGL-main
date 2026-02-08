# Requirements: PGL Luxury Buyer Finder

**Defined:** 2026-02-08
**Core Value:** Real estate teams can quickly find and qualify wealthy prospects by searching structured lead databases, enriching profiles with personal contact info and wealth signals, and organizing prospects into actionable lists.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Multi-Tenancy

- [x] **MT-01**: Database schema enforces tenant isolation via RLS on all tables
- [x] **MT-02**: Every table has `tenant_id` column with index, RLS policies filter by validated session
- [x] **MT-03**: Middleware extracts tenant context from URL path (`/[orgId]/...`) and injects into request
- [x] **MT-04**: Cache keys are always prefixed with `tenant:${tenantId}:` to prevent cross-tenant data bleed
- [x] **MT-05**: Tenant branding system stores logo URL and primary/secondary colors per tenant
- [x] **MT-06**: UI renders tenant branding (logo in sidebar, accent colors) from tenant config

### Authentication & Authorization

- [x] **AUTH-01**: Users sign in via Supabase Auth with email/password
- [x] **AUTH-02**: User session includes tenant context (`tenant_id` in `app_metadata`)
- [x] **AUTH-03**: Role-based access control with 4 roles: super_admin, tenant_admin, agent, assistant
- [x] **AUTH-04**: Assistant role is read-only (can view but not modify data)
- [x] **AUTH-05**: Session persists across browser refresh
- [x] **AUTH-06**: Protected routes redirect unauthenticated users to login

### Super Admin

- [x] **SA-01**: PGL super admin panel lists all tenants with status
- [x] **SA-02**: Super admin can create new tenants with name, slug, branding defaults
- [x] **SA-03**: Super admin can create/invite users to any tenant with assigned role
- [x] **SA-04**: Super admin can deactivate tenants or users
- [x] **SA-05**: Super admin panel is isolated from tenant UI (separate `/admin` route group)

### Persona Builder

- [x] **PB-01**: Tenant admin/agent can create named personas with search filter combinations
- [x] **PB-02**: Persona filters map to Apollo.io API parameters (title, seniority, industry, location, company size, keywords)
- [x] **PB-03**: 5 starter personas seeded for each new tenant: Finance Elite, Tech Execs, Startup Founders, BigLaw Partners, Crypto/Web3
- [x] **PB-04**: Personas are tenant-scoped (RLS enforced) and reusable across searches
- [x] **PB-05**: User can edit and delete custom personas
- [x] **PB-06**: Persona list view shows name, description, filter summary, last used date

### Search

- [x] **SRCH-01**: User can run persona-based search that calls Apollo.io API with mapped filters
- [x] **SRCH-02**: Search results display in paginated table (50 results per page)
- [x] **SRCH-03**: Results show: name, title, company, location, email status, phone status
- [x] **SRCH-04**: Search results are cached (Redis) with tenant-scoped keys to avoid redundant API calls
- [x] **SRCH-05**: User can sort results by name, company, title
- [x] **SRCH-06**: Search criteria persists in URL params (shareable/bookmarkable)
- [x] **SRCH-07**: Rate limiting on Apollo API calls via Upstash Redis (per tenant)

### Prospect Profile

- [ ] **PROF-01**: Clicking a prospect opens a profile view with consolidated data
- [ ] **PROF-02**: Profile view triggers lazy enrichment if data is missing or stale (>7 days)
- [ ] **PROF-03**: ContactOut integration enriches personal email and phone on profile view
- [ ] **PROF-04**: Exa.ai integration enriches web presence, news mentions, company data, wealth signals
- [ ] **PROF-05**: SEC EDGAR integration pulls insider transaction data (Form 4) for public company execs
- [ ] **PROF-06**: Claude AI generates a 2-3 sentence "Why Recommended" summary from enriched data
- [ ] **PROF-07**: Enrichment status indicators show loading/complete/failed state for each data source
- [ ] **PROF-08**: Enriched data is cached in database with timestamp for staleness checks
- [ ] **PROF-09**: User can add prospect to a list directly from profile view
- [ ] **PROF-10**: "Find Similar People" button triggers lookalike discovery flow (see LIKE-XX)

### List Management

- [x] **LIST-01**: User can create named lists with optional description
- [x] **LIST-02**: User can view all lists with member count and last updated date
- [ ] **LIST-03**: User can add/remove prospects to/from lists
- [x] **LIST-04**: List members have status tracking: New, Contacted, Responded, Not Interested
- [x] **LIST-05**: User can add inline notes on individual list members
- [x] **LIST-06**: User can view list members in a table with prospect data columns
- [x] **LIST-07**: Lists are tenant-scoped (RLS enforced)

### Export

- [ ] **EXP-01**: User can export list to CSV with all enriched data columns
- [ ] **EXP-02**: CSV export uses streaming (papaparse) to handle 1000+ prospects without OOM
- [ ] **EXP-03**: Export includes UTF-8 encoding for international names
- [ ] **EXP-04**: Export triggers activity log entry

### Activity Logging

- [ ] **ACT-01**: System logs 11 action types: login, search_executed, profile_viewed, profile_enriched, add_to_list, remove_from_list, status_updated, note_added, csv_exported, persona_created, lookalike_search
- [ ] **ACT-02**: Activity log entries include user, action type, target (prospect/list), timestamp, metadata (JSON)
- [ ] **ACT-03**: Activity log is viewable by tenant admin (tenant-scoped)
- [ ] **ACT-04**: Activity log supports filtering by action type, date range, and user
- [ ] **ACT-05**: Activity log API at `/api/activity` supports querying with filters

### Lookalike Discovery

- [ ] **LIKE-01**: "Find Similar People" button on prospect profile view
- [ ] **LIKE-02**: AI extracts key attributes from prospect (title, industry, seniority, company size, wealth signals)
- [ ] **LIKE-03**: Extracted attributes auto-generate a persona with Apollo.io-compatible filters
- [ ] **LIKE-04**: Generated persona triggers Apollo search and displays results
- [ ] **LIKE-05**: User can save generated lookalike persona for future reuse
- [ ] **LIKE-06**: Lookalike search triggers activity log entry (action_type: lookalike_search)

### Usage Metrics Dashboard

- [ ] **ANLY-01**: `usage_metrics_daily` table aggregates daily stats per user (logins, searches, profiles viewed, enrichments, exports)
- [ ] **ANLY-02**: Tenant admin dashboard at `/dashboard/analytics` shows team usage metrics
- [ ] **ANLY-03**: PGL super admin dashboard at `/admin/analytics` shows cross-tenant metrics
- [ ] **ANLY-04**: Metrics include: total logins, searches executed, profiles viewed, profiles enriched, CSV exports, lists created
- [ ] **ANLY-05**: Dashboard shows date range filter (7d, 30d, 90d) with basic charts
- [ ] **ANLY-06**: Analytics API at `/api/analytics` returns aggregated metrics by date range

### UI/UX

- [x] **UI-01**: Dark theme (#0a0a0a base) with gold accents (#d4af37 for non-text, #f4d47f for text) meeting WCAG AA contrast
- [x] **UI-02**: Playfair Display for headings, Inter for body text
- [x] **UI-03**: Responsive layout (desktop-first, mobile-friendly via responsive design)
- [x] **UI-04**: Sidebar navigation with tenant logo, main nav items: Search, Lists, Personas, Activity, Analytics
- [x] **UI-05**: Loading states and skeleton screens for async data
- [x] **UI-06**: Error boundaries with user-friendly error messages

### Infrastructure

- [x] **INFRA-01**: API keys stored server-side only (never exposed to client)
- [ ] **INFRA-02**: Inngest handles long-running enrichment workflows (bypasses Vercel 60s timeout)
- [x] **INFRA-03**: Rate limiting on all external API calls (Apollo, ContactOut, Exa, SEC EDGAR, Claude)
- [x] **INFRA-04**: Supabase connection pooling configured for serverless (transaction mode)
- [x] **INFRA-05**: Environment variables for all API keys and configuration

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: AI email draft generation from prospect summary data
- **ADV-02**: Saved search alerts — notify when new matches appear
- **ADV-03**: Wealth signal scoring (1-10 scale based on enrichment data)
- **ADV-04**: Property ownership cross-reference via ATTOM API
- **ADV-05**: Net worth estimation from multi-source signals
- **ADV-06**: PWA manifest for mobile-friendly installation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Stripe billing integration | PGL handles billing externally; not needed for initial launch |
| Email/SMS outreach | Luxury buyers expect white-glove human touch; separate tool |
| Crunchbase integration | Apollo + Exa + SEC provide sufficient data coverage |
| Mobile native app | Web-first; PWA for mobile, not native |
| CRM integration (Monday.com, HubSpot) | CSV export only; teams import themselves. Confirmed OUT in kickoff call |
| Cold Lead CRM | Separate product, not part of this build |
| Cross-tenant data sharing | Tenants must remain fully isolated for security |
| Real-time chat | High complexity, not core to prospecting workflow |
| Full property intelligence | Not competing with Reonomy/ATTOM; people-focused not building-focused |
| Automated email sequences | Anti-feature for luxury segment; dilutes positioning |
| Built-in CRM | Agents use Salesforce/LionDesk; focus on export/integration |
| Mass market lead gen | Quality over quantity for UHNWI targeting |
| Transaction management | Out of scope; end at "qualified list export" stage |
| Social media posting | Marketing, not prospecting |
| Predictive dialing | Volume play, not luxury approach |
| International data | Nice-to-have only if Apollo includes it free; not a requirement |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MT-01 | Phase 1 | Complete |
| MT-02 | Phase 1 | Complete |
| MT-03 | Phase 1 | Complete |
| MT-04 | Phase 1 | Complete |
| MT-05 | Phase 1 | Complete |
| MT-06 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| SA-01 | Phase 1 | Complete |
| SA-02 | Phase 1 | Complete |
| SA-03 | Phase 1 | Complete |
| SA-04 | Phase 1 | Complete |
| SA-05 | Phase 1 | Complete |
| PB-01 | Phase 2 | Complete |
| PB-02 | Phase 2 | Complete |
| PB-03 | Phase 2 | Complete |
| PB-04 | Phase 2 | Complete |
| PB-05 | Phase 2 | Complete |
| PB-06 | Phase 2 | Complete |
| SRCH-01 | Phase 2 | Complete |
| SRCH-02 | Phase 2 | Complete |
| SRCH-03 | Phase 2 | Complete |
| SRCH-04 | Phase 2 | Complete |
| SRCH-05 | Phase 2 | Complete |
| SRCH-06 | Phase 2 | Complete |
| SRCH-07 | Phase 2 | Complete |
| PROF-01 | Phase 3 | Pending |
| PROF-02 | Phase 3 | Pending |
| PROF-03 | Phase 3 | Pending |
| PROF-04 | Phase 3 | Pending |
| PROF-05 | Phase 3 | Pending |
| PROF-06 | Phase 3 | Pending |
| PROF-07 | Phase 3 | Pending |
| PROF-08 | Phase 3 | Pending |
| PROF-09 | Phase 3 | Pending |
| LIST-01 | Phase 2 | Complete |
| LIST-02 | Phase 2 | Complete |
| LIST-03 | Phase 2 | Complete |
| LIST-04 | Phase 2 | Complete |
| LIST-05 | Phase 2 | Complete |
| LIST-06 | Phase 2 | Complete |
| LIST-07 | Phase 2 | Complete |
| EXP-01 | Phase 3 | Pending |
| EXP-02 | Phase 3 | Pending |
| EXP-03 | Phase 3 | Pending |
| EXP-04 | Phase 3 | Pending |
| ACT-01 | Phase 3 | Pending |
| ACT-02 | Phase 3 | Pending |
| ACT-03 | Phase 3 | Pending |
| ACT-04 | Phase 3 | Pending |
| ACT-05 | Phase 3 | Pending |
| LIKE-01 | Phase 3 | Pending |
| LIKE-02 | Phase 3 | Pending |
| LIKE-03 | Phase 3 | Pending |
| LIKE-04 | Phase 3 | Pending |
| LIKE-05 | Phase 3 | Pending |
| LIKE-06 | Phase 3 | Pending |
| ANLY-01 | Phase 3 | Pending |
| ANLY-02 | Phase 3 | Pending |
| ANLY-03 | Phase 3 | Pending |
| ANLY-04 | Phase 3 | Pending |
| ANLY-05 | Phase 3 | Pending |
| ANLY-06 | Phase 3 | Pending |
| PROF-10 | Phase 3 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| UI-04 | Phase 1 | Complete |
| UI-05 | Phase 1 | Complete |
| UI-06 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 3 | Pending |
| INFRA-03 | Phase 2 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 79 total
- Mapped to phases: 79
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after kickoff call scope changes*
