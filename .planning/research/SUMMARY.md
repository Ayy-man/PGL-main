# Research Summary: PGL Luxury Buyer Finder

**Domain:** Multi-tenant wealth intelligence SaaS for UHNWI real estate prospecting
**Research Completed:** 2026-02-08
**Files Synthesized:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

PGL Luxury Buyer Finder is a multi-tenant SaaS platform that enriches UHNWI prospect data for luxury real estate agents. Research across four domains reveals a clear technical path: **Next.js 14 App Router with Supabase RLS for multi-tenancy, path-based routing for simplicity, Inngest for long-running enrichment jobs, and lazy cache-aside pattern for on-demand data enrichment.** The platform sits in a unique market position between generalist lead enrichment tools (Apollo.io, ZoomInfo) and enterprise wealth intelligence platforms (Wealth-X at $50K+/year), offering AI-powered wealth insights at accessible pricing.

**Critical architectural insight:** Multi-tenancy must be designed from day one—Supabase RLS is disabled by default, and 83% of exposed databases involve RLS misconfigurations. The most common failure pattern is missing `tenant_id` in cache keys, causing cross-tenant data bleed. These mistakes cause security breaches that require complete rewrites.

**Key differentiators:** Persona-based UHNWI search (vs generic job titles), AI wealth summaries via Claude (vs raw data dumps), and SEC filing analysis (vs stale quarterly updates) position the platform as "concierge intelligence for relationship-driven sales, not commodity automation for high-volume transactions."

---

## Key Findings

### Technology Stack

**Recommended Core Stack:**
- **Framework:** Next.js 14.2.x (not 15—React 19 ecosystem still maturing)
- **Database:** Supabase PostgreSQL with RLS for tenant isolation
- **Auth:** Supabase Auth via `@supabase/ssr@0.8.0` (NOT deprecated `auth-helpers-nextjs`)
- **Background Jobs:** Inngest (required—Vercel 60s timeout too short for enrichment workflows)
- **Rate Limiting:** Upstash Redis with `@upstash/ratelimit@2.0.8` (HTTP-based, edge-compatible)
- **AI Integration:** `@anthropic-ai/sdk@0.73.0` (official Claude API client)
- **CSV Export:** papaparse@5.4.x (only library with Node.js streaming support)
- **UI:** shadcn/ui (Radix-based), Tailwind CSS 3.4.x, next-themes@0.3.x

**Key rationale:** Path-based multi-tenancy (`/[orgId]/dashboard`) over subdomain-based (simpler, no wildcard SSL). Inngest over Vercel Cron Jobs (enrichment workflows exceed 60s). Upstash Redis over Vercel KV (vendor-agnostic). Supabase RLS over app-level checks (database-level isolation is safer).

**Version confidence:** HIGH for all core dependencies, based on official docs and 2026 sources.

---

### Feature Landscape

**Table Stakes (must-have):**
- Contact search with filters (name, title, company, location)
- Basic profile data (name, email, phone, LinkedIn, company)
- List creation & management (CRUD operations, tagging)
- CSV export with UTF-8 encoding
- Email/phone verification (90%+ deliverability expected)
- Multi-user access with role-based permissions
- Data privacy compliance (GDPR/CCPA table stakes for SaaS)

**Differentiators (competitive advantage):**
1. **Persona-Based Search** (HIGH advantage) — Target "Finance Elite," "Founder Exited," "Inheritance" vs generic job titles
2. **AI Wealth Insights Summary** (HIGH advantage) — Claude synthesizes Exa + SEC EDGAR into narrative intelligence
3. **SEC Filing Analysis** (HIGH advantage) — Auto-extract insider transactions; Wealth-X charges $50K+/year for this
4. **Real-Time Web Enrichment** (MEDIUM advantage) — Exa pulls fresh press/funding vs stale database records
5. **Property Ownership Cross-Reference** (HIGH advantage) — Link Apollo person → ATTOM property records

**Anti-Features (deliberately avoid):**
- Full property intelligence (not competing with Reonomy/ATTOM)
- Automated email outreach (luxury buyers expect white-glove, human touch)
- Built-in CRM (agents use Salesforce/LionDesk; focus on export/integration)
- Mass market lead gen (emphasize quality over quantity)
- Transaction management (out of scope; end at "qualified list export")

**Philosophy:** "Concierge Intel, Not Commodity Volume" — PGL is intelligence for manual, relationship-driven sales, not automation for high-volume transactional sales.

---

### Architecture Patterns

**Component Boundaries:**

```
CLIENT LAYER (RSC + RCC)
  ↓
MIDDLEWARE LAYER (tenant identification, auth check, context injection)
  ↓
API/BFF LAYER (Route Handlers, API Proxy, Enrichment Service)
  ↓
DATA LAYER (Supabase PostgreSQL + RLS, Upstash Redis, External APIs)
```

**Critical Patterns:**

1. **Multi-Tenant RLS:**
   - Every table has `tenant_id` column with index
   - RLS policies filter all queries by `tenant_id` from validated session
   - NEVER accept `tenant_id` from client parameters (extract from JWT)
   - Store `tenant_id` in `app_metadata` (NOT `user_metadata`—it's user-editable)

2. **Lazy Enrichment (Cache-Aside Pattern):**
   - Check Redis cache on profile view
   - If cache miss or stale (>7 days) → trigger background enrichment
   - Return cached data immediately (don't block UI)
   - Background job updates database + cache when complete

3. **BFF (Backend-for-Frontend) Proxy:**
   - Route Handlers proxy external APIs (Apollo, Exa, ContactOut, SEC EDGAR)
   - Provide authentication, rate limiting, data transformation, error handling
   - Cache API responses with tenant-scoped keys (`tenant:${tenantId}:api:${params}`)

4. **State Management:**
   - Server Components (RSC) for initial data fetching
   - URL searchParams for shareable filters (search criteria, pagination)
   - Client Components (RCC) for interactivity (forms, modals, real-time updates)
   - Zustand ONLY for UI-only state (sidebar open/closed, theme); NEVER for server data

**Performance Optimizations:**
- Index all RLS-filtered columns (99.94% improvement)
- Wrap functions in SELECT statements in RLS policies (95% improvement)
- Add explicit `tenant_id` filters even with RLS (helps query planner, 95% improvement)
- Use Supabase transaction mode connection string for serverless (avoid pool exhaustion)

---

### Critical Pitfalls & Prevention

**CRITICAL (cause rewrites/breaches):**

1. **RLS Disabled by Default = Catastrophic Data Breach**
   - **Impact:** 83% of exposed Supabase databases involve RLS misconfigurations
   - **Prevention:** Enable RLS immediately: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
   - **Detection:** `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
   - **Phase:** Foundation (Week 1)

2. **Service Role Key in Client Code = God Mode for Attackers**
   - **Impact:** Complete database compromise across ALL tenants
   - **Prevention:** Use `anon` key in client, store `service_role` only in server-side secrets
   - **Detection:** Grep codebase: `grep -r "service_role" app/`
   - **Phase:** Foundation (Week 1)

3. **Missing `tenant_id` in Cache Keys = Cross-Tenant Data Bleed**
   - **Impact:** Most common multi-tenant cache failure pattern in 2026
   - **Prevention:** ALWAYS prefix cache keys with `tenant:${tenantId}:`
   - **Detection:** Login as two tenants, verify data isolation
   - **Phase:** Foundation (Week 2)

4. **RLS Policies Without Indexes = 100x Performance Degradation**
   - **Impact:** Queries slow from 50ms → 5+ seconds on 10K+ rows
   - **Prevention:** Create indexes immediately: `CREATE INDEX idx_prospects_tenant_id ON prospects(tenant_id);`
   - **Detection:** `EXPLAIN ANALYZE` should show "Index Scan" not "Seq Scan"
   - **Phase:** Foundation (Week 2)

5. **API Rate Limits Hit Without Circuit Breakers = $1000+ Bills**
   - **Impact:** Apollo/ContactOut/Exa quota exhausted in minutes, budget overrun
   - **Prevention:** Implement exponential backoff, track usage per tenant, use Claude Batch API (50% discount)
   - **Detection:** Monitor 429 responses, alert at 80% quota
   - **Phase:** Persona + Search (Week 3-4), Enrich + Ship (Week 5-6)

6. **Missing Tenant Context in Server Actions = Authorization Bypass**
   - **Impact:** Attackers modify request to access other tenants' data
   - **Prevention:** Extract `tenant_id` from validated session, NEVER from client parameters
   - **Detection:** Modify Network tab requests with different tenant_id—should fail
   - **Phase:** Foundation (Week 1-2)

**MODERATE (cause delays/debt):**

7. **Apollo.io Pagination Without Batching** → Incomplete results (shows 50 when 500 exist)
8. **Lazy Enrichment Without Status Tracking** → User confusion, duplicate API calls
9. **Stale Enrichment Data Without Refresh Strategy** → Outdated intelligence
10. **Vercel Function Timeouts on External API Calls** → Failed enrichments (10s Hobby, 60s Pro)
11. **Dark Theme with Poor Contrast** → WCAG violations (gold #d4af37 on black #0a0a0a fails)
12. **CSV Export Loads Entire Dataset into Memory** → OOM crash on 1000+ prospects
13. **SEC EDGAR API 30-Transaction Limit** → Incomplete insider data (multiple filings same date)
14. **ContactOut Data Accuracy Issues** → 15-25% inaccuracy for mid-market professionals
15. **Supabase Connection Pool Exhaustion** → "Too many connections" errors during traffic spikes

---

## Critical Decisions

### 1. Multi-Tenancy Routing: Path-Based vs Subdomain-Based

**Decision:** Path-based routing (`/[orgId]/dashboard`)

**Rationale:**
- Simpler than subdomain (no wildcard SSL, no Vercel wildcard domains)
- Works on any hosting platform
- Next.js dynamic routes + middleware make this straightforward
- Subdomain only valuable if per-tenant branding is core requirement

**Implementation:** Middleware extracts `orgId` from path, injects into request headers, validates session, rewrites to internal route.

---

### 2. Database ORM: Supabase Client vs Drizzle vs Prisma

**Decision:** Supabase Client (via `@supabase/ssr`)

**Rationale:**
- RLS integration is seamless (Drizzle/Prisma require manual RLS context injection)
- Built-in auth + realtime subscriptions
- Drizzle is 14x faster but requires more SQL knowledge
- Prisma has better DX for teams but slower (not critical for MVP with solo/small team)
- For multi-tenant SaaS, simplicity + safety > raw performance

---

### 3. Background Jobs: Inngest vs Vercel Cron vs waitUntil

**Decision:** Inngest for enrichment workflows, Vercel Cron for scheduled tasks

**Rationale:**
- Vercel Hobby timeout = 10s, Pro = 60s (insufficient for multi-API enrichment)
- ContactOut + Exa + SEC + Claude = 8+ seconds per prospect
- `waitUntil` doesn't guarantee completion (no retries)
- Inngest provides retries, step-based workflows, state management
- Free tier: 100K executions/month (sufficient for MVP)

**Implementation:** Inngest functions break enrichment into retryable steps (Apollo → Exa → ContactOut → Claude).

---

### 4. Rate Limiting: Upstash Redis vs Vercel KV

**Decision:** Upstash Redis with `@upstash/ratelimit@2.0.8`

**Rationale:**
- Connectionless (HTTP-based), designed for edge/serverless
- Vendor-agnostic (works beyond Vercel)
- Sliding window algorithm for smooth traffic (Apollo/Exa/ContactOut have strict limits)
- Free tier: 10K requests/day (sufficient for MVP)

---

### 5. CSV Export: papaparse vs json2csv vs fast-csv

**Decision:** papaparse@5.4.x

**Rationale:**
- ONLY library with Node.js streaming support (json2csv doesn't support streams)
- For 1000+ prospect exports, must stream to avoid OOM crash
- fast-csv is faster but papaparse has better isomorphic support (browser + Node.js)

---

### 6. Dark Theme Accessibility: Pure Black vs Dark Gray

**Decision:** Dark gray backgrounds (#121212) with lightened gold text (#f4d47f)

**Rationale:**
- Gold #d4af37 on black #0a0a0a = 2.8:1 contrast (FAILS WCAG AA)
- Gold #f4d47f on dark gray #121212 = 7.8:1 contrast (PASSES WCAG AA)
- Dark gray reduces eye strain vs pure black
- Reserve saturated gold for non-text elements (icons, borders)

---

### 7. Enrichment Strategy: Eager vs Lazy

**Decision:** Lazy enrichment (on profile view, not during search)

**Rationale:**
- Eager enrichment during search = 2-5s per API call × 50 prospects = unusable UX
- Lazy enrichment = instant search results, enrich only when viewed
- Cache aggressively (24hr TTL), refresh if stale (>7 days)
- Most prospects never viewed (pareto principle: 20% of prospects get 80% of attention)

---

## Risk Summary

### Top 5 Risks (by impact × likelihood)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **RLS misconfiguration exposes all tenant data** | CRITICAL | HIGH (83% of Supabase exposures) | Enable RLS on every table, add tests, monitor Performance Advisors |
| **API quota exhaustion burns budget** | HIGH | HIGH (no circuit breakers = guaranteed) | Implement rate limiting, exponential backoff, usage tracking per tenant |
| **Missing `tenant_id` in cache keys causes data bleed** | CRITICAL | MEDIUM (most common multi-tenant failure) | Prefix ALL cache keys with `tenant:${tenantId}:`, add integration tests |
| **Vercel function timeouts fail enrichments** | HIGH | MEDIUM (multi-API workflows = 8+s) | Use Inngest for orchestration, split into separate functions |
| **ContactOut data accuracy (15-25% wrong)** | MEDIUM | HIGH (documented in reviews) | Verify emails before storing, show confidence scores, allow manual overrides |

### Secondary Risks

- **Performance:** RLS without indexes → 100x slowdown (mitigate: create indexes with RLS policies)
- **UX:** Lazy enrichment without status tracking → user confusion (mitigate: add status columns, show loading states)
- **Accessibility:** Dark theme contrast violations → legal risk (mitigate: lighten gold text, test with contrast checker)
- **Memory:** CSV export OOM crash on large lists (mitigate: streaming CSV generation)
- **Security:** Service role key in client code → god mode for attackers (mitigate: grep pre-commit hook)

---

## Recommended Build Order

### Phase 1: Foundation (Week 1-2)
**Goal:** Multi-tenant infrastructure with secure data isolation

**Components:**
1. Database schema with RLS policies + indexes
2. Middleware for tenant identification (path-based routing)
3. Authentication (Supabase Auth via @supabase/ssr)
4. Tenant management (create tenant, invite users, role-based permissions)

**Validation:** User can sign up, create tenant, invite team members. RLS tests pass (Tenant A cannot see Tenant B's data).

**Critical pitfalls to avoid:**
- RLS disabled by default (enable immediately)
- Service role key in client code (use anon key)
- Missing `tenant_id` in cache keys (prefix all keys)
- Missing indexes on RLS columns (create with policies)

---

### Phase 2: Persona + Search (Week 3-4)
**Goal:** Persona-based search via Apollo.io with caching

**Components:**
1. Profiles table and RLS policies
2. Apollo.io API proxy with rate limiting (Upstash Redis)
3. Persona mapping ("Finance Elite" → Apollo filters)
4. SearchPage (RSC) + SearchResults (RCC) with URL state
5. Pagination handling (cursor-based, 50 results/page)

**Validation:** User can search for persona, see paginated results, filters persist in URL.

**Critical pitfalls to avoid:**
- Apollo pagination without batching (incomplete results)
- API rate limits without circuit breakers (quota exhaustion)
- Missing `tenant_id` in API cache keys (cross-tenant data bleed)

---

### Phase 3: Enrich + Ship (Week 5-6)
**Goal:** Lazy enrichment with ContactOut, Exa, SEC EDGAR, Claude summaries

**Components:**
1. Enrichment data table with status columns
2. ContactOut API integration (email/phone verification)
3. Exa API integration (web presence enrichment)
4. SEC EDGAR parser (basic transaction extraction)
5. Claude API integration (wealth insight summaries)
6. ProfilePage (RSC) with lazy enrichment trigger
7. ProfileDrawer (RCC) with enrichment display
8. CSV export with streaming (papaparse)

**Validation:** Viewing profile triggers enrichment if stale, data caches correctly, CSV export works for 1000+ prospects.

**Critical pitfalls to avoid:**
- Lazy enrichment without status tracking (duplicate API calls)
- Vercel function timeouts (split into separate functions, use Inngest)
- CSV export memory overflow (use streaming)
- ContactOut data accuracy (verify emails before storing)
- SEC EDGAR 30-transaction limit (fetch all filings)
- Dark theme contrast violations (lighten gold text)

---

### Post-MVP (v2+)
- Property ownership cross-reference (ATTOM API integration)
- Wealth signal scoring (heuristic or ML model)
- Buying intent signals (NLP on news/press)
- Net worth estimation (multi-source algorithm)
- Saved searches for re-use
- Data refresh for existing lists (batch job)

---

## Technology Stack Summary

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| **Framework** | Next.js | 14.2.x | Stable App Router; React 19 ecosystem still maturing |
| **Runtime** | Node.js | 20.x | LTS version, Vercel-recommended |
| **Language** | TypeScript | 5.7.x | Type safety for multi-tenant SaaS |
| **Database** | Supabase PostgreSQL | Latest | Managed PostgreSQL with built-in RLS |
| **Auth** | Supabase Auth | @supabase/ssr@0.8.0 | SSR-safe client for App Router |
| **ORM** | Supabase Client | Via @supabase/ssr | Seamless RLS integration |
| **Background Jobs** | Inngest | 3.x | Orchestrates long-running enrichment workflows |
| **Rate Limiting** | Upstash Redis | @upstash/ratelimit@2.0.8 | HTTP-based, edge-compatible |
| **Caching** | Upstash Redis | Via @upstash/redis | Connectionless Redis for serverless |
| **AI Integration** | Anthropic Claude | @anthropic-ai/sdk@0.73.0 | Official TypeScript SDK |
| **CSV Export** | papaparse | 5.4.x | Node.js streaming support |
| **Forms** | React Hook Form | 7.54.x | Standard for React forms |
| **Validation** | Zod | 4.3.6 | 14x faster than v3 |
| **State Management** | TanStack Query | @tanstack/react-query@5.x | Server state caching/invalidation |
| **UI Library** | shadcn/ui | Latest | Copy-paste components on Radix UI |
| **Styling** | Tailwind CSS | 3.4.x | Utility-first CSS framework |
| **Dark Mode** | next-themes | 0.3.x | Zero-flash dark mode |
| **Deployment** | Vercel | N/A | Serverless Next.js hosting |

**External APIs:**
- Apollo.io (contact search, company data)
- ContactOut (email/phone enrichment)
- Exa.ai (web search for online presence)
- SEC EDGAR (financial filings for public companies)
- ATTOM (property data, deferred to v2)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | All recommendations based on official docs and 2026 sources |
| **Features** | MEDIUM | Table stakes confirmed via competitor research; differentiators validated conceptually but need user research with The W Team |
| **Architecture** | HIGH | Patterns verified with official Next.js + Supabase docs + authoritative sources |
| **Pitfalls** | HIGH | Based on recent security advisories (CVE-2025-48757), incident reports, and 2026 best practices |

### Gaps to Address

**User Research Needed (validate with The W Team):**
- Persona definitions: What specific UHNWI personas do luxury agents target?
- Enrichment priorities: Is phone > email? Or vice versa?
- List size expectations: Lists of 50 or 500 contacts?
- Wealth thresholds: What net worth ranges matter ($5M+, $10M+, $30M+)?
- Workflow cadence: Search → enrich → export daily? Or build master lists monthly?
- Integration needs: Direct Salesforce/LionDesk integration? Or CSV sufficient?

**Technical Validation Needed (prototype during implementation):**
- SEC EDGAR parser complexity: Test with sample filings to validate 10-day estimate
- Exa.ai API behavior: Documentation sparse; may need trial-and-error
- ContactOut accuracy: Monitor bounce rates to validate 15-25% inaccuracy claim
- Claude API cost: Test token usage for prospect summaries to confirm budget

**Deferred to Phase-Specific Research:**
- Apollo.io webhook support for real-time updates (vs polling)
- Inngest vs Trigger.dev vs custom SQS (final decision during Phase 5)
- Property cross-reference matching accuracy (ATTOM API prototype, v2)
- Supabase Realtime for multi-user list collaboration (v2 feature)

---

## Research Sources

**Total Sources Reviewed:** 75+ authoritative sources across 4 research areas

**Stack Research (18 sources):**
- Next.js official docs, Supabase docs, Upstash docs
- Zod 4 evolution guide, Drizzle vs Prisma comparison
- Inngest for Vercel, background jobs guide
- shadcn/ui documentation, Radix vs Base UI analysis

**Features Research (15 sources):**
- Reonomy, Wealth-X, Apollo.io, ZoomInfo, PropertyShark reviews
- UHNWI buyer behavior studies, luxury real estate prospecting guides
- Lead enrichment tools comparison, AI enrichment guide
- Multi-tenant SaaS architecture guides

**Architecture Research (12 sources):**
- Next.js multi-tenant guide, Vercel Platforms Starter Kit
- Supabase RLS best practices, multi-tenant RLS patterns
- Upstash rate limiting, cache-aside pattern (AWS whitepaper)
- Zustand with Next.js 15, state management best practices

**Pitfalls Research (30 sources):**
- Supabase security flaw analysis (CVE-2025-48757), RLS performance optimization
- Next.js security advisories, multi-tenant security best practices
- API rate limiting strategies, Apollo.io rate limits docs
- Vercel function timeout troubleshooting, connection pooling guides
- Dark mode accessibility (WCAG 2.1), CSV streaming with Node.js
- Claude API pricing guide, API key security best practices

**Confidence Level by Source Type:**
- Official documentation (Next.js, Supabase, Vercel, Anthropic): HIGH
- Recent security research (2025-2026 CVEs, incident reports): HIGH
- Industry best practices (Medium, dev.to, authoritative blogs): MEDIUM
- Vendor-specific limitations (user reviews, community feedback): MEDIUM

---

## Ready for Roadmap Creation

This research summary provides sufficient context for roadmap creation with the following outputs:

**Recommended Phases:**
1. Foundation (Week 1-2) — Multi-tenant infrastructure + auth + RLS
2. Persona + Search (Week 3-4) — Apollo.io integration + persona mapping + search UI
3. Enrich + Ship (Week 5-6) — Lazy enrichment + Claude summaries + CSV export

**Research Flags:**
- Phase 1: No additional research needed (standard patterns)
- Phase 2: No additional research needed (Apollo.io well-documented)
- Phase 3: **Needs research**: SEC EDGAR parser complexity, Exa.ai API behavior

**Critical Path Dependencies:**
- Foundation → Persona + Search (requires auth + tenancy)
- Persona + Search → Enrich + Ship (requires profiles to enrich)
- No parallel work possible until Foundation complete (multi-tenancy is foundational)

**Validation Checkpoints:**
- Foundation: RLS tests pass, tenant isolation verified
- Persona + Search: Persona searches return expected results, pagination works
- Enrich + Ship: Enrichment triggers on profile view, CSV export handles 1000+ prospects

**Budget Constraints:**
- $3,100 total budget, 6-week timeline
- API costs: Apollo (tier TBD), ContactOut (per-seat), Exa (per-search), Claude (per-token)
- Monitor API usage aggressively; implement usage caps per tenant

**First Real Tenant:** The W Team using immediately post-MVP—prioritize reliability over features.

---

**Next Step:** Roadmapper agent can proceed to create ROADMAP.md with phase structure, dependencies, and validation criteria based on this synthesis.
