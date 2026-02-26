# Roadmap: PGL Luxury Buyer Finder

**Project:** Multi-tenant wealth intelligence SaaS for UHNWI real estate prospecting
**Timeline:** 6 weeks (Weeks 1-6)
**First Tenant:** The W Team (NYC luxury real estate)
**Budget:** $3,100

---

## Overview

This roadmap delivers a production-ready multi-tenant SaaS platform in three phases aligned with a 6-week timeline. Phase 1 establishes secure multi-tenant infrastructure with authentication and super admin capabilities. Phase 2 implements persona-based search via Apollo.io with list management. Phase 3 adds lazy enrichment pipelines, AI-generated summaries, and CSV export capabilities. The platform enables real estate teams to identify and qualify UHNWI prospects through structured search, data enrichment, and list organization.

**Critical architectural principle:** Multi-tenancy is designed from day one using Supabase RLS for database-level isolation. Every table has `tenant_id` with RLS policies, all cache keys are tenant-scoped, and tenant context is extracted from validated sessions only (never from client parameters).

---

## Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Multi-tenant infrastructure with secure data isolation, authentication, super admin panel, and UI shell operational.

**Dependencies:** None (foundational phase)

**Requirements Covered:**
- **Multi-Tenancy:** MT-01, MT-02, MT-03, MT-04, MT-05, MT-06
- **Authentication:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
- **Super Admin:** SA-01, SA-02, SA-03, SA-04, SA-05
- **UI/UX:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
- **Infrastructure:** INFRA-01, INFRA-04, INFRA-05

**Total:** 26 requirements

**Key Deliverables:**

1. **Database Schema with RLS**
   - 9 core tables: tenants, users, personas, prospects, sec_transactions, prospect_summaries, lists, list_members, activity_log, usage_metrics_daily
   - RLS policies enabled on all tables with `tenant_id` filtering
   - Indexes on all RLS columns (`tenant_id`, foreign keys)
   - Test suite validates tenant isolation (Tenant A cannot query Tenant B's data)

2. **Multi-Tenant Middleware**
   - Path-based routing extracts `orgId` from `/[orgId]/...` URLs
   - Validates tenant exists and user has access
   - Injects tenant context into request headers for downstream consumption
   - Redirects to 404 if tenant not found or unauthorized

3. **Authentication System**
   - Supabase Auth with email/password via `@supabase/ssr@0.8.0`
   - User session includes `tenant_id` in `app_metadata` (immutable by client)
   - 4 roles: super_admin, tenant_admin, agent, assistant (read-only)
   - Session persistence across browser refresh
   - Protected route middleware redirects unauthenticated users to login

4. **Super Admin Panel**
   - Isolated at `/admin` route group (not tenant-scoped)
   - Create tenants with name, slug, branding (logo URL, primary/secondary colors)
   - Create/invite users to any tenant with role assignment
   - Deactivate tenants or users (soft delete with `is_active` flag)
   - View all tenants with status (active/inactive, user count, created date)

5. **UI Shell & Design System**
   - Dark theme (#121212 base, not pure black #0a0a0a for better contrast)
   - Gold accents: #f4d47f for text (7.8:1 contrast, WCAG AA compliant), #d4af37 for non-text elements
   - Playfair Display for headings, Inter for body text
   - Sidebar navigation with tenant logo, main nav: Search, Lists, Personas, Activity, Analytics
   - Responsive layout (desktop-first, mobile-friendly)
   - Loading states (skeleton screens) and error boundaries

6. **Infrastructure Foundation**
   - API keys stored server-side only (environment variables, never in client code)
   - Supabase connection pooling configured (transaction mode for serverless)
   - Cache key prefixing standard: `tenant:${tenantId}:${resource}:${params}`
   - Environment variable structure documented (.env.example)

**Success Criteria:**

1. **Tenant Isolation Verified:** Login as User A (Tenant 1) and User B (Tenant 2). User A cannot see User B's data in database queries, UI, or cache. RLS policies block cross-tenant queries.

2. **Authentication Flow Complete:** User can sign in with email/password, session persists across browser refresh, protected routes redirect to login when unauthenticated, logout clears session.

3. **Role-Based Access Works:** Assistant role user can view search results but cannot create lists. Tenant admin can manage users. Super admin can access `/admin` panel; tenant users cannot.

4. **Super Admin Can Provision:** Super admin creates new tenant "Test Org" with branding, invites user with agent role, new user receives invite and can log in to `/test-org/dashboard`.

5. **UI Shell Renders Correctly:** Dark theme applies on load with no flash, tenant logo displays in sidebar, navigation links work, WCAG AA contrast verified with Chrome DevTools Lighthouse.

6. **Cache Keys are Tenant-Scoped:** Inspect Redis keys (if using Upstash Redis CLI) or log cache operations—all keys prefixed with `tenant:${tenantId}:`.

**Critical Risks:**

1. **RLS Disabled by Default = Data Breach (CRITICAL)**
   - 83% of exposed Supabase databases involve RLS misconfigurations
   - Prevention: Run `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;` immediately after table creation
   - Detection: Query `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;` should return zero rows

2. **Service Role Key in Client Code = God Mode (CRITICAL)**
   - Complete database compromise across all tenants if service role key leaks
   - Prevention: Use `anon` key in client, store `service_role` only in server-side `.env.local` (not committed to git)
   - Detection: Run `grep -r "service_role" app/` should return zero matches in client code

3. **Missing `tenant_id` in Cache Keys = Cross-Tenant Data Bleed (CRITICAL)**
   - Most common multi-tenant cache failure pattern in 2026
   - Prevention: Establish cache key helper function that enforces `tenant:${tenantId}:` prefix
   - Detection: Login as two tenants, perform same action, verify cache keys are different

4. **RLS Policies Without Indexes = 100x Performance Degradation (CRITICAL)**
   - Queries slow from 50ms to 5+ seconds on 10K+ rows
   - Prevention: Create indexes on `tenant_id` immediately: `CREATE INDEX idx_table_tenant_id ON table_name(tenant_id);`
   - Detection: Run `EXPLAIN ANALYZE SELECT * FROM prospects WHERE tenant_id = 'uuid';` should show "Index Scan" not "Seq Scan"

5. **Missing Tenant Context in Server Actions = Authorization Bypass (CRITICAL)**
   - Attackers can modify requests to access other tenants' data
   - Prevention: Extract `tenant_id` from validated session via `supabase.auth.getUser()`, NEVER from client parameters
   - Detection: Modify Network tab request with different `tenant_id`—should return 403 Forbidden

**Dependencies:**
- None (this is the foundational phase)

**Plans:** 7 plans

Plans:
- [x] 01-01-PLAN.md — Color system fix, types, env validation, package installation
- [x] 01-02-PLAN.md — Supabase clients (browser/server/middleware/admin), Redis, cache keys
- [x] 01-03-PLAN.md — Database migration with all tables, RLS, indexes, auth hook
- [x] 01-04-PLAN.md — Auth system: session management, RBAC, login page
- [x] 01-05-PLAN.md — Multi-tenant middleware, validation schemas
- [x] 01-06-PLAN.md — UI shell: dark theme, sidebar, fonts, loading/error states
- [x] 01-07-PLAN.md — Super admin panel: tenant CRUD, user management

**Research Needed:**
- NO (standard Next.js + Supabase patterns well-documented)

---

### Phase 2: Persona + Search + Lists (Week 3-4)

**Goal:** Persona-based search via Apollo.io with list management operational.

**Plans:** 7 plans

Plans:
- [x] 02-01-PLAN.md — Infrastructure: Redis, rate limiting, circuit breaker, cache utilities, Apollo types
- [x] 02-02-PLAN.md — Persona Builder: types, queries, seed data, CRUD UI
- [x] 02-03-PLAN.md — Apollo.io Search API route with caching, rate limiting, circuit breaking (TDD)
- [x] 02-04-PLAN.md — List Management: CRUD, member status tracking, inline notes
- [x] 02-05-PLAN.md — Search Results UI: TanStack Table, URL state with nuqs, pagination
- [x] 02-06-PLAN.md — Search-to-Lists integration: prospect upsert, Add to List dialog
- [x] 02-07-PLAN.md — End-to-end verification checkpoint

**Dependencies:** Phase 1 complete (requires multi-tenant infrastructure, authentication, UI shell)

**Requirements Covered:**
- **Persona Builder:** PB-01, PB-02, PB-03, PB-04, PB-05, PB-06
- **Search:** SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07
- **List Management:** LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, LIST-07
- **Infrastructure:** INFRA-03

**Total:** 21 requirements

**Key Deliverables:**

1. **Persona Builder**
   - UI for creating personas with name, description, filter combinations
   - Filters map to Apollo.io API parameters: job titles, seniority levels, industries, locations, company size ranges, keywords
   - 5 starter personas seeded for each new tenant:
     - Finance Elite (C-suite at PE/VC firms, $100M+ AUM)
     - Tech Execs (VP+ at unicorns or public tech companies)
     - Startup Founders (Founder/CEO, Series B+, tech sector)
     - BigLaw Partners (Partner at Am Law 200 firms)
     - Crypto/Web3 (Founder/Executive at crypto/blockchain companies)
   - Persona CRUD operations (create, edit, delete) for custom personas
   - List view shows personas with filter summary and last used date

2. **Apollo.io Integration**
   - API Route Handler at `/api/search/apollo` proxies Apollo.io People Search API
   - Request validation (zod schema), rate limiting (Upstash Redis), error handling
   - Persona filters translate to Apollo API parameters (title, seniority, industry, location, organization_num_employees_ranges, keywords)
   - Response caching with tenant-scoped keys: `tenant:${tenantId}:apollo:${personaId}:${page}`
   - Cache TTL: 24 hours (balance freshness vs API cost)
   - Pagination handling (cursor-based, 50 results per page, batching for large result sets)

3. **Search Results UI**
   - Search page with persona selector dropdown
   - Paginated table (50 results per page) with columns: name, title, company, location, email status, phone status
   - Sortable columns (name, company, title)
   - Search criteria persists in URL params: `/[orgId]/search?persona=finance-elite&page=2` (shareable/bookmarkable)
   - Loading states (skeleton table rows), empty states, error states
   - Quick actions: View Profile, Add to List

4. **Rate Limiting System**
   - Upstash Redis with `@upstash/ratelimit@2.0.8` for sliding window algorithm
   - Per-tenant limits: 100 Apollo API calls per hour (prevents quota exhaustion)
   - Rate limit headers returned to client for feedback
   - Circuit breaker pattern: If 429 received from Apollo, exponential backoff (1s, 2s, 4s, 8s)
   - Usage tracking stored in `api_usage` table for billing/monitoring

5. **List Management System**
   - Create lists with name and optional description
   - View all lists in grid/table with member count, last updated date, actions (view, delete)
   - Add prospects to lists from search results or profile view
   - Remove prospects from lists
   - List member status tracking: New (default), Contacted, Responded, Not Interested
   - Inline notes on list members (stored in `list_members.notes` column)
   - List detail view shows members in table with prospect data columns + status + notes
   - Lists are tenant-scoped via RLS

6. **Prospects Data Model**
   - `prospects` table stores Apollo.io data: name, title, company, location, email, phone, LinkedIn URL
   - Data deduplicated by email or LinkedIn URL (unique constraint)
   - Upsert pattern on add to list (insert if new, update if exists)
   - Timestamps for created_at, updated_at for staleness checks in Phase 3

**Success Criteria:**

1. **Persona Search Works End-to-End:** Select "Finance Elite" persona, click Search, see paginated results from Apollo.io with correct filters applied (verified by inspecting API request in Network tab).

2. **Search Results are Cached:** Run same persona search twice. First call takes 2-5s (API call), second call takes <500ms (cache hit). Verify cache key in Redis contains `tenant:${tenantId}:apollo:finance-elite:1`.

3. **Pagination Functions Correctly:** Search returns 150 results. Page 1 shows 50 results, Page 2 shows next 50, Page 3 shows final 50. URL params update: `?page=1`, `?page=2`, `?page=3`.

4. **Rate Limiting Prevents Quota Exhaustion:** Trigger 100+ Apollo API calls rapidly (script or manual). After 100 calls within 1 hour, API returns 429 with message "Rate limit exceeded, try again in X seconds."

5. **List Management Flow Complete:** Create list "High Net Worth Prospects", search for persona, add 5 prospects to list, view list detail page shows 5 members, update member status to "Contacted", add note "Follow up next week", verify data persists.

6. **Cross-Tenant Isolation Maintained:** User A creates list "My List" with 3 prospects. User B (different tenant) logs in, cannot see User A's list or prospects in search results. Database queries with RLS return zero rows for cross-tenant data.

7. **URL State Persistence:** Search for persona, navigate to page 3, copy URL and open in new tab. New tab loads page 3 of same persona search (search criteria and pagination state preserved in URL).

**Critical Risks:**

1. **Apollo.io Rate Limits Hit Without Circuit Breakers = $1000+ Bills (HIGH)**
   - Apollo charges per API call; uncapped usage exhausts quota/budget in minutes
   - Prevention: Implement Upstash Redis rate limiting (100 calls/hour per tenant), exponential backoff on 429 responses
   - Detection: Monitor 429 response count, alert at 80% of quota threshold

2. **Apollo Pagination Without Batching = Incomplete Results (MODERATE)**
   - Apollo returns max 50 results per call; large result sets require multiple calls
   - Prevention: Implement cursor-based pagination, batch requests if total_results > 50
   - Detection: Search for broad persona (e.g., "Tech Execs"), verify result count matches `total_results` from API response

3. **Missing `tenant_id` in API Cache Keys = Cross-Tenant Data Bleed (CRITICAL)**
   - Same persona search for Tenant A and Tenant B would return same cached data
   - Prevention: Prefix all cache keys with `tenant:${tenantId}:`
   - Detection: Tenant A searches "Finance Elite", Tenant B searches same persona. Inspect cache keys—should be different.

4. **Stale Cache Without Invalidation = Outdated Search Results (MODERATE)**
   - Apollo data changes frequently (people switch jobs); stale cache returns outdated results
   - Prevention: Set cache TTL to 24 hours, add manual "Refresh" button for forced cache invalidation
   - Detection: Search for persona, wait >24 hours, search again—should trigger fresh API call

**Dependencies:**
- Phase 1 complete (requires multi-tenant infrastructure, authentication, UI shell)

**Research Needed:**
- NO (Apollo.io API well-documented, Next.js patterns standard)

---

### Phase 3: Enrich + Ship (Week 5-6)

**Goal:** Lazy enrichment pipeline with ContactOut, Exa.ai, SEC EDGAR, AI summaries, lookalike discovery, usage metrics dashboard, CSV export, and expanded activity logging operational.

**Dependencies:** Phase 2 complete (requires prospects data from search)

**Requirements Covered:**
- **Prospect Profile:** PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09, PROF-10
- **Export:** EXP-01, EXP-02, EXP-03, EXP-04
- **Activity Logging:** ACT-01, ACT-02, ACT-03, ACT-04, ACT-05
- **Lookalike Discovery:** LIKE-01, LIKE-02, LIKE-03, LIKE-04, LIKE-05, LIKE-06
- **Usage Metrics:** ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, ANLY-06
- **Infrastructure:** INFRA-02

**Total:** 32 requirements

**Plans:** 9 plans

Plans:
- [x] 03-01-PLAN.md — Inngest setup + Phase 3 database schema (activity_log, usage_metrics_daily, enrichment columns)
- [x] 03-02-PLAN.md — Activity logging helper + activity log API
- [x] 03-03-PLAN.md — Circuit breaker + enrichment clients (ContactOut, Exa, SEC EDGAR)
- [x] 03-04-PLAN.md — Claude AI summary client + Inngest enrichment workflow
- [x] 03-05-PLAN.md — Streaming CSV export system
- [x] 03-06-PLAN.md — Usage metrics aggregation (Inngest cron) + analytics API
- [x] 03-07-PLAN.md — Prospect profile view UI with enrichment status
- [x] 03-08-PLAN.md — Lookalike discovery (AI persona generation + search)
- [x] 03-09-PLAN.md — Usage metrics dashboards (tenant admin + super admin)

**Key Deliverables:**

1. **Lazy Enrichment Architecture**
   - Inngest functions handle long-running enrichment workflows (bypass Vercel 60s timeout)
   - Enrichment triggers on profile view if data is missing or stale (>7 days)
   - Enrichment status tracking: `pending`, `in_progress`, `complete`, `failed` per data source
   - Step-based workflow: Apollo (baseline) → ContactOut (email/phone) → Exa (web presence) → SEC (insider transactions) → Claude (AI summary)
   - Each step is retryable independently (Inngest built-in retry logic with exponential backoff)
   - Enriched data cached in `prospect_enrichment` table with `enriched_at` timestamp

2. **ContactOut Integration**
   - API Route Handler at `/api/enrich/contactout` proxies ContactOut API
   - Enriches personal email and phone numbers (Apollo provides work contact, ContactOut provides personal)
   - Triggered when user views profile and `enrichment.personal_email` is null or stale
   - Data accuracy: 75-85% (document expected accuracy in UI with confidence indicators)
   - Email verification before storing (basic regex + domain check)
   - Rate limiting: 10 enrichments per minute per tenant (ContactOut has strict limits)

3. **Exa.ai Integration**
   - API Route Handler at `/api/enrich/exa` proxies Exa.ai API
   - Enriches: web presence (personal website, social profiles), news mentions, company data, wealth signals (funding, exits, acquisitions)
   - Query strategy: `"{prospect.name}" + "{prospect.company}" + "executive OR founder OR investor"`
   - Parse top 5 results for relevant signals (funding announcements, board positions, speaking engagements, awards)
   - Cache results with 7-day TTL (web data changes less frequently than Apollo data)

4. **SEC EDGAR Integration**
   - API Route Handler at `/api/enrich/sec` queries SEC EDGAR API for Form 4 filings (insider transactions)
   - Target: Public company executives with stock transactions (indicator of wealth)
   - Parse XML responses for transaction data: transaction_date, security_title, transaction_shares, price_per_share, transaction_value
   - Handle 30-transaction limit (fetch all filings if multiple on same date)
   - Store in `sec_transactions` table with `prospect_id` foreign key
   - Only enrich if `prospect.company` is public (cross-reference with Apollo `publicly_traded_symbol`)

5. **Claude AI Summaries**
   - API Route Handler at `/api/enrich/claude` calls Anthropic Claude Haiku 4.5 via `@anthropic-ai/sdk@0.73.0`
   - Generates 2-3 sentence "Why Recommended" summary from enriched data (ContactOut + Exa + SEC)
   - Prompt template: "Based on this prospect data: [enriched_data], generate a concise 2-3 sentence summary explaining why this person is a qualified UHNWI prospect for luxury real estate. Focus on wealth signals, lifestyle indicators, and buying intent."
   - Store in `prospect_summaries` table with `generated_at` timestamp
   - Token usage tracking for cost monitoring (target: <500 tokens per summary)
   - Fallback: If enrichment data is sparse, return "Insufficient data for AI summary"

6. **Profile View UI**
   - Profile page displays consolidated prospect data: Apollo baseline + enriched data
   - Sections: Overview (name, title, company, location), Contact (emails, phones), Wealth Signals (SEC transactions, Exa funding/exits), AI Summary, Lists (which lists prospect belongs to)
   - Enrichment status indicators per section: loading spinner (in_progress), checkmark (complete), error icon (failed), "Enrich Now" button (pending)
   - Manual refresh button to force re-enrichment (invalidate cache, trigger Inngest workflow)
   - Quick actions: Add to List, Find Similar People (Lookalike), Export Profile

7. **CSV Export System**
   - Export list to CSV with all enriched data columns: name, title, company, location, work_email, work_phone, personal_email, personal_phone, linkedin_url, wealth_signals, ai_summary, list_status, notes
   - Streaming implementation using papaparse@5.4.x (handles 1000+ prospects without OOM)
   - UTF-8 encoding with BOM for Excel compatibility (international names render correctly)
   - Server action at `/api/export/csv` generates file, returns download URL
   - Trigger activity log entry on export

8. **Activity Logging System (Expanded)**
   - Log 11 action types: login, search_executed, profile_viewed, profile_enriched, add_to_list, remove_from_list, status_updated, note_added, csv_exported, persona_created, lookalike_search
   - Schema: `activity_log` table with columns: user_id, tenant_id, action_type, target_type (prospect/list/persona), target_id, metadata (JSON), created_at
   - Activity log view (tenant admin only) with filterable table: action type filter, date range picker, user filter
   - Activity API at `/api/activity` for querying with filters
   - Display: timestamp, user name, action description ("User A added Prospect B to List C"), target links

9. **Lookalike Discovery**
   - "Find Similar People" button on prospect profile view
   - AI (Claude) extracts key attributes from prospect: title patterns, industry, seniority, company size, wealth signals
   - Extracted attributes auto-generate Apollo.io-compatible persona filters
   - Generated persona triggers Apollo search and displays results inline
   - User can save generated lookalike persona for future reuse
   - API Route Handler at `/api/search/lookalike` orchestrates: extract → generate → search
   - Triggers activity log entry (action_type: lookalike_search)

10. **Usage Metrics Dashboard**
    - `usage_metrics_daily` table: aggregated daily stats per user (logins, searches, profiles viewed, enrichments, exports)
    - Tenant admin dashboard at `/[orgId]/dashboard/analytics` shows team usage metrics
    - PGL super admin dashboard at `/admin/analytics` shows cross-tenant usage metrics
    - Metrics tracked: total logins, searches executed, profiles viewed, profiles enriched, CSV exports, lists created
    - Date range filter (7d, 30d, 90d) with basic bar/line charts
    - Analytics API at `/api/analytics` returns aggregated metrics
    - Critical for 6-month renewal proof — demonstrates ROI to tenant admins

**Success Criteria:**

1. **Lazy Enrichment Triggers on Profile View:** Open prospect profile with no enrichment data. Enrichment status shows "pending" → "in_progress" → "complete" within 8-15 seconds. Refresh page—data persists (cached in database).

2. **ContactOut Enriches Personal Contact Info:** View profile for prospect with only work email. ContactOut enrichment adds personal email and phone (if available). Verify data stored in `prospects.personal_email` and `prospects.personal_phone`.

3. **Exa.ai Finds Wealth Signals:** View profile for known wealthy individual (e.g., startup founder with exit). Exa enrichment returns news mentions, funding announcements, or acquisition data. Wealth signals display in Profile UI.

4. **SEC EDGAR Pulls Insider Transactions:** View profile for public company executive (e.g., CEO of publicly traded company). SEC enrichment returns Form 4 filings with transaction data. Transactions display in table: date, shares, value.

5. **Claude Generates AI Summary:** After enrichment completes, "Why Recommended" section displays 2-3 sentence AI-generated summary. Summary references specific wealth signals from enriched data (e.g., "Recent $2M stock sale indicates liquidity for luxury purchase").

6. **CSV Export Handles 1000+ Prospects:** Create list with 1000+ prospects (seed data or batch import), click Export. CSV file downloads without OOM crash, opens in Excel with correct UTF-8 encoding (no garbled international characters).

7. **Activity Logging Tracks All 11 Action Types:** Perform sequence: login → search persona → view profile → add to list → update status → add note → export CSV. Navigate to Activity Log page. Log shows entries for each action type with correct timestamps, user names, and action descriptions.

8. **Enrichment Status Indicators Accurate:** View profile with partial enrichment (ContactOut complete, Exa pending). UI shows checkmark next to "Contact Info", loading spinner next to "Web Presence", error icon next to "SEC Data" (if prospect not at public company).

9. **Cross-Tenant Isolation for Enrichments:** Tenant A enriches Prospect X. Tenant B searches for same person, views profile. Tenant B's enrichment triggers independently (Tenant A's cached data not shared). Verify separate `prospect_enrichment` rows with different `tenant_id`.

10. **Lookalike Discovery Works End-to-End:** View enriched prospect profile, click "Find Similar People". AI extracts attributes, generates persona filters, Apollo search returns similar prospects. User can save generated persona for reuse.

11. **Usage Metrics Dashboard Shows Data:** Tenant admin navigates to `/dashboard/analytics`, sees team usage metrics (logins, searches, profiles viewed, exports) with date range filter. PGL super admin navigates to `/admin/analytics`, sees cross-tenant aggregate metrics.

12. **Usage Metrics Aggregate Correctly:** Perform 5 searches, 3 profile views, 1 export. Navigate to analytics dashboard. Metrics reflect correct counts for today. Change date range to 7d — shows cumulative totals.

**Critical Risks:**

1. **Vercel Function Timeouts on Enrichment = Failed Workflows (HIGH)**
   - Multi-API enrichment (ContactOut + Exa + SEC + Claude) takes 8-15 seconds, exceeds Vercel 60s timeout on Pro plan
   - Prevention: Use Inngest for orchestration, split enrichment into separate steps (each step <10s)
   - Detection: Monitor Inngest dashboard for timeout errors, set alert for >5% failure rate

2. **API Rate Limits Without Circuit Breakers = Quota Exhaustion (HIGH)**
   - ContactOut, Exa, SEC EDGAR, Claude all have strict rate limits
   - Prevention: Implement Upstash Redis rate limiting per API (ContactOut: 10/min, Exa: 20/min, Claude: 50/min), exponential backoff on 429 responses
   - Detection: Monitor 429 response count per API, alert at 80% of quota

3. **ContactOut Data Accuracy Issues = 15-25% Wrong Emails (MODERATE)**
   - ContactOut documented accuracy is 75-85%; expect 15-25% bounce rate
   - Prevention: Verify emails with regex + domain check before storing, show confidence indicators in UI, allow manual overrides
   - Detection: Monitor bounce rates if email outreach added in v2

4. **CSV Export Loads Entire Dataset into Memory = OOM Crash (MODERATE)**
   - Loading 1000+ prospects into memory at once causes Node.js OOM error
   - Prevention: Use papaparse streaming with Node.js streams (chunk by 100 rows)
   - Detection: Export list with 1000+ prospects, monitor memory usage (should stay <512MB)

5. **Lazy Enrichment Without Status Tracking = Duplicate API Calls (MODERATE)**
   - Without status tracking, clicking "Refresh" multiple times triggers duplicate enrichments
   - Prevention: Store enrichment status (`pending`, `in_progress`, `complete`, `failed`) in database, disable "Enrich Now" button when `in_progress`
   - Detection: Click "Enrich Now" 5 times rapidly, check Inngest logs—should show 1 workflow execution, not 5

6. **Stale Enrichment Data Without Refresh Strategy = Outdated Intelligence (MODERATE)**
   - Enriched data from 6 months ago is stale (people change jobs, companies get acquired)
   - Prevention: Set 7-day staleness threshold, show "Last updated X days ago" in UI, allow manual refresh
   - Detection: Enrich prospect, wait 8 days, view profile—should auto-trigger re-enrichment

7. **Dark Theme Contrast Violations = WCAG Failures (MODERATE)**
   - Gold #d4af37 on black #0a0a0a = 2.8:1 contrast (fails WCAG AA)
   - Prevention: Use #f4d47f for gold text (7.8:1 contrast), reserve saturated gold for non-text elements
   - Detection: Run Chrome DevTools Lighthouse accessibility audit—should pass WCAG AA

8. **SEC EDGAR 30-Transaction Limit = Incomplete Data (LOW)**
   - SEC API returns max 30 transactions per filing; executives with high activity require multiple filings
   - Prevention: Fetch all filings for date range (e.g., last 12 months), aggregate transactions
   - Detection: Test with known high-volume insider trader (e.g., Elon Musk), verify all transactions captured

**Dependencies:**
- Phase 2 complete (requires prospects data from search to enrich)

**Research Needed:**
- MODERATE (SEC EDGAR XML parsing complexity, Exa.ai API behavior documented but sparse—may need trial-and-error during implementation)

---

## Phase Dependencies

```
Phase 1: Foundation (Week 1-2)
    Multi-tenant infrastructure + auth + super admin + UI shell
    ↓
Phase 2: Persona + Search + Lists (Week 3-4)
    Persona builder + Apollo.io integration + list management
    ↓
Phase 3: Enrich + Ship (Week 5-6)
    Lazy enrichment + AI summaries + CSV export + activity logging
```

**Critical Path:** No parallel work possible until Phase 1 complete. Multi-tenancy is foundational—all subsequent features depend on secure tenant isolation. Phase 2 must complete before Phase 3 (cannot enrich prospects that don't exist yet).

---

## Post-MVP: v2 Requirements

Deferred to future releases after initial launch with The W Team.

### Advanced Features (v2)
- **ADV-01**: AI email draft generation from prospect summary data
- **ADV-02**: Saved search alerts — notify when new matches appear
- **ADV-03**: Wealth signal scoring (1-10 scale based on enrichment data)
- **ADV-04**: Property ownership cross-reference via ATTOM API
- **ADV-05**: Net worth estimation from multi-source signals
- **ADV-06**: PWA manifest for mobile-friendly installation

**Note:** CRM integration (Monday.com, HubSpot) confirmed OUT of scope — CSV export only, teams import themselves. Lookalike Discovery and Usage Metrics Dashboard moved to v1 after kickoff call.

---

## Timeline Summary

| Phase | Duration | Week | Requirements | Status |
|-------|----------|------|--------------|--------|
| **Phase 1: Foundation** | 2 weeks | Week 1-2 | 26 (MT, AUTH, SA, UI, INFRA) | Complete |
| **Phase 2: Persona + Search + Lists** | 2 weeks | Week 3-4 | 21 (PB, SRCH, LIST, INFRA) | Complete |
| **Phase 3: Enrich + Ship** | 2 weeks | Week 5-6 | 32 (PROF, EXP, ACT, LIKE, ANLY, INFRA) | Complete |
| **Total** | **6 weeks** | — | **79 requirements** | — |


**Milestones:**
- End of Week 2: Multi-tenant infrastructure operational, super admin can provision tenants/users
- End of Week 4: Persona-based search functional, list management operational
- End of Week 6: Full enrichment pipeline live, CSV export working, ready for The W Team launch

---

## Progress Tracking

| Phase | Planned | In Progress | Complete | Blocked |
|-------|---------|-------------|----------|---------|
| Phase 1: Foundation | 0 | 0 | 26 | 0 |
| Phase 2: Persona + Search + Lists | 0 | 0 | 21 | 0 |
| Phase 3: Enrich + Ship | 0 | 0 | 32 | 0 |
| **Total** | **0** | **0** | **79** | **0** |

**Overall Progress:** 100% (79/79 requirements complete)


---

## Risk Summary

### Critical Risks (require immediate mitigation)

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|------------|
| RLS disabled by default = data breach | Phase 1 | CRITICAL | Enable RLS on all tables immediately, add detection query to CI |
| Service role key in client code | Phase 1 | CRITICAL | Use anon key in client, grep pre-commit hook to detect leaks |
| Missing `tenant_id` in cache keys | Phase 1 | CRITICAL | Enforce cache key helper function, integration tests validate isolation |
| RLS policies without indexes | Phase 1 | CRITICAL | Create indexes on `tenant_id` immediately after table creation |
| Missing tenant context in server actions | Phase 1 | CRITICAL | Extract `tenant_id` from session only, never from client params |
| API rate limits without circuit breakers | Phase 2-3 | HIGH | Upstash Redis rate limiting, exponential backoff on 429 responses |
| Vercel function timeouts on enrichment | Phase 3 | HIGH | Use Inngest for orchestration, split into <10s steps |

### Moderate Risks (monitor during implementation)

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|------------|
| Apollo pagination without batching | Phase 2 | MODERATE | Implement cursor-based pagination, batch large result sets |
| Stale cache without invalidation | Phase 2 | MODERATE | 24-hour TTL, manual refresh button |
| ContactOut data accuracy (15-25% wrong) | Phase 3 | MODERATE | Email verification, confidence indicators, manual overrides |
| CSV export memory overflow | Phase 3 | MODERATE | Streaming with papaparse, chunk by 100 rows |
| Lazy enrichment duplicate API calls | Phase 3 | MODERATE | Status tracking, disable "Enrich Now" when in_progress |
| Dark theme contrast violations | Phase 3 | MODERATE | Use #f4d47f for gold text (7.8:1 contrast), Lighthouse audit |

---

## Validation Checkpoints

**Phase 1 Checkpoint (End of Week 2):**
- [ ] RLS enabled on all 9 tables
- [ ] RLS test suite passes (cross-tenant isolation verified)
- [ ] Super admin can create tenant and invite user
- [ ] New user can log in to tenant-scoped dashboard
- [ ] UI shell renders with dark theme and tenant branding
- [ ] Cache keys prefixed with `tenant:${tenantId}:`

**Phase 2 Checkpoint (End of Week 4):**
- [ ] Persona search returns Apollo.io results with correct filters
- [ ] Search results cached (second search <500ms)
- [ ] Pagination works (50 results per page, URL state persists)
- [ ] Rate limiting prevents quota exhaustion (429 after 100 calls/hour)
- [ ] User can create list, add prospects, view list detail
- [ ] Cross-tenant isolation maintained (User A cannot see User B's lists)

**Phase 3 Checkpoint (End of Week 6):**
- [ ] Profile view triggers lazy enrichment for stale data
- [ ] ContactOut, Exa, SEC, Claude enrichments complete within 15s
- [ ] AI summary displays with 2-3 sentence recommendation
- [ ] CSV export handles 1000+ prospects without OOM crash
- [ ] Activity log tracks all 11 action types
- [ ] Enrichment status indicators accurate (pending/in_progress/complete/failed)
- [ ] Lookalike discovery generates persona from prospect and returns search results
- [ ] Usage metrics dashboard shows tenant team stats (tenant admin) and cross-tenant stats (super admin)
- [ ] Analytics date range filter works (7d, 30d, 90d)

### Phase 4: Super admin health dashboard — platform pulse, tenant heatmap, enrichment pipeline, API quota tracking, funnel analytics, error feed

**Goal:** Transform the bare admin dashboard (4 count cards) into a live platform health command center with platform pulse stats, tenant activity heatmap, enrichment pipeline health chart, search-to-export funnel, API quota tracking, and error feed — all auto-refreshing every 60 seconds.
**Depends on:** Phase 3
**Plans:** 4/4 plans complete

Plans:
- [ ] 04-01-PLAN.md — Enrichment data capture: structured error objects in Inngest + Redis INCR API quota tracking
- [ ] 04-02-PLAN.md — 6 new admin API endpoints (dashboard, tenants/activity, enrichment/health, funnel, errors, quota shell)
- [ ] 04-03-PLAN.md — Dashboard UI components (stat cards, heatmap, charts, error feed)
- [ ] 04-04-PLAN.md — Dashboard assembly: refactor admin page to client component with 60s polling

### Phase 5: UI Revamp — Apply Design System (Dark Luxury Aesthetic, Gold Accents, Layered Glass Surfaces, Cormorant + DM Sans Typography, CSS Variable Token System)

**Goal:** Transform every page and component to match the comprehensive design system — dark luxury aesthetic with gold accents, layered glass surfaces, Cormorant Garamond + DM Sans typography, CSS variable token system, gradient sidebar, sticky top bar, ambient gold glow, and prospect slide-over panel.
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, SRCH-02, SRCH-03, SRCH-05, LIST-02, LIST-06, ANLY-02, ANLY-05, SA-01, PROF-01, PROF-07, PROF-09
**Depends on:** Phase 4
**Plans:** 3/7 plans executed

Plans:
- [ ] 05-01-PLAN.md — CSS variable tokens, font swap (DM Sans + Cormorant Garamond), tailwind.config.ts extensions
- [ ] 05-02-PLAN.md — Shared UI primitives (Button gold variant, Card surface treatment, Badge, EmptyState, Dialog)
- [ ] 05-03-PLAN.md — Layout shell (gradient sidebar, sticky top bar, ambient glow, page transitions)
- [ ] 05-04-PLAN.md — Search page rebuild (persona card grid + prospect result cards + wealth tier badges)
- [ ] 05-05-PLAN.md — Lists, Dashboard, Analytics, Admin Dashboard, Personas page updates
- [ ] 05-06-PLAN.md — Prospect slide-over panel (480px Sheet) + profile view token migration
- [ ] 05-07-PLAN.md — Admin chart hex-to-CSS-variable migration + visual verification checkpoint

---

*Roadmap created: 2026-02-08*
*Updated: 2026-02-08 after kickoff call scope changes (lookalike, analytics, expanded logging)*
*Phase 1 completed: 2026-02-08*
*Phase 2 completed: 2026-02-08*
*Phase 3 completed: 2026-02-25 -- comprehensive code review completed, all 9 plans implemented*
*All phases complete. 79/79 requirements delivered.*
