# Domain Pitfalls: Multi-Tenant Wealth Intelligence SaaS

**Project:** PGL Luxury Buyer Finder
**Domain:** Multi-tenant SaaS with external API integrations, data enrichment, Next.js App Router
**Researched:** 2026-02-08
**Context:** $3,100 budget, 6-week timeline, first real tenant (The W Team) using immediately

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or major architectural failures.

### 1. RLS Disabled by Default = Catastrophic Data Breach

**What goes wrong:** Supabase RLS is DISABLED by default when tables are created. If you forget to enable RLS before going live, every tenant can access every other tenant's data through auto-generated REST APIs. 83% of exposed Supabase databases involve RLS misconfigurations.

**Why it happens:** Developers prototype without RLS for speed, then forget to enable it. The CVE-2025-48757 vulnerability affected 170+ applications because AI code generators didn't include RLS policies.

**Consequences:**
- Complete tenant data exposure (contacts, lists, enrichment data, activity logs)
- Legal liability under data privacy laws
- Immediate loss of all tenant trust
- Requires notification of breach to all affected parties

**Prevention:**
- Enable RLS on EVERY table immediately after creation: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Create RLS policies BEFORE inserting any real data
- Add database migration tests that verify RLS is enabled on all tables
- Use Supabase's Performance Advisors to detect tables without RLS
- Never use `USING (true)` in policies — this allows any authenticated user to see all rows

**Detection:**
- Run: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
- If this returns any tables, RLS is not enabled
- Test with two different tenant users — if User A sees User B's data, RLS failed

**Phase:** Foundation (Week 1) — Must be resolved before any multi-tenant data exists

**Sources:**
- [Supabase Security Flaw: 170+ Apps Exposed](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Multi-Tenant Leakage in SaaS](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

### 2. Service Role Key in Client Code = God Mode for Attackers

**What goes wrong:** The `service_role` key bypasses ALL RLS policies. If exposed in client-side code (accidentally committed, in browser bundle, in environment variables visible to frontend), attackers gain full database access to all tenants.

**Why it happens:**
- Confusion between `anon` key (safe for client) vs `service_role` key (never safe for client)
- Copy-pasting code examples that use service_role for convenience
- AI coding assistants suggesting service_role for "fixing" RLS errors

**Consequences:**
- Complete database compromise across ALL tenants
- Attackers can read, modify, delete any data
- No audit trail of malicious activity (appears as legitimate service role usage)

**Prevention:**
- NEVER use `service_role` key in frontend code or environment variables exposed to client
- Use `anon` key for client-side Supabase client initialization
- Store `service_role` key only in server-side secrets manager (AWS Secrets Manager, Vercel env vars marked as server-only)
- Grep codebase for `service_role` before every deployment: `grep -r "service_role" app/`
- Add pre-commit hook to prevent committing files containing service_role key

**Detection:**
- Search your bundled JavaScript for the service_role key
- Check browser DevTools Network tab — service_role should NEVER appear in request headers
- Review `.env.local` and ensure it's in `.gitignore`

**Phase:** Foundation (Week 1) — Must be correct from day one

**Sources:**
- [Supabase Row Level Security Explained](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)
- [Best Practices for Supabase Security](https://www.leanware.co/insights/supabase-best-practices)

---

### 3. Missing `tenant_id` in Cache Keys = Cross-Tenant Data Bleed

**What goes wrong:** Caching systems (Redis, Next.js cache, in-memory) that don't prefix keys with `tenant_id` will serve Tenant A's cached data to Tenant B. This is the MOST COMMON multi-tenant cache failure pattern in 2026.

**Why it happens:**
- Developers cache by `prospect_id` or `list_id` without considering multi-tenancy
- Global cache key patterns copied from single-tenant examples
- Cache libraries that don't enforce namespace isolation

**Consequences:**
- Tenant A views dashboard, data cached under key `dashboard:stats`
- Tenant B views dashboard milliseconds later, receives Tenant A's cached stats
- Cross-tenant data exposure through caching layer (bypasses RLS entirely)
- Extremely difficult to detect without tenant-aware monitoring

**Real-world scenario for this project:**
```typescript
// WRONG: No tenant_id in cache key
const cacheKey = `prospect:${prospectId}`;

// RIGHT: Include tenant_id
const cacheKey = `tenant:${tenantId}:prospect:${prospectId}`;
```

**Prevention:**
- ALWAYS prefix cache keys with `tenant:${tenantId}:`
- Use cache helper functions that enforce tenant scoping:
  ```typescript
  function getCacheKey(tenantId: string, resource: string, id: string) {
    return `tenant:${tenantId}:${resource}:${id}`;
  }
  ```
- Add integration tests that verify cache isolation between tenants
- Use Redis namespaces or separate databases per tenant if budget allows

**Detection:**
- Login as Tenant A, view a prospect profile
- Login as Tenant B (different browser/session), view THEIR prospect
- If Tenant B sees Tenant A's data, cache keys lack tenant scoping
- Monitor cache hit rates by tenant — anomalous patterns indicate leakage

**Phase:** Foundation (Week 2) — Before implementing any caching

**Sources:**
- [Multi-Tenant Cache Leakage](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Supabase Multi-Tenant RLS Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

---

### 4. RLS Policies Without Indexes = 100x Performance Degradation

**What goes wrong:** RLS policies that filter on `tenant_id` or `user_id` execute on EVERY row unless those columns are indexed. On tables with 10K+ rows, queries slow from 50ms to 5+ seconds.

**Why it happens:**
- Developers enable RLS and create policies but forget to add indexes
- Assumption that PostgreSQL automatically indexes foreign key columns (it doesn't)
- Performance issues only appear after production data accumulates

**Consequences:**
- Search queries timeout (>8s target becomes 20s+ reality)
- List views hang (500+ prospects becomes unusable)
- Database CPU spikes, connection pool exhaustion
- User complaints about "slow" platform

**Real-world impact for this project:**
- `prospects` table with 50K rows across 10 tenants
- RLS policy: `tenant_id = current_setting('app.current_tenant')::uuid`
- Without index on `tenant_id`: Every query scans all 50K rows (5+ seconds)
- With index: Query scans only 5K tenant rows (50ms)

**Prevention:**
- Create indexes IMMEDIATELY after enabling RLS on filtered columns:
  ```sql
  CREATE INDEX idx_prospects_tenant_id ON prospects(tenant_id);
  CREATE INDEX idx_lists_tenant_id ON lists(tenant_id);
  CREATE INDEX idx_list_members_tenant_id ON list_members(tenant_id);
  CREATE INDEX idx_activity_log_tenant_id ON activity_log(tenant_id);
  ```
- Create composite indexes for common query patterns:
  ```sql
  CREATE INDEX idx_prospects_tenant_created ON prospects(tenant_id, created_at DESC);
  ```
- Use `EXPLAIN ANALYZE` on all multi-tenant queries to verify index usage

**Detection:**
- Run `EXPLAIN ANALYZE` on tenant-filtered queries
- Look for "Seq Scan" (sequential scan) instead of "Index Scan"
- Monitor query performance in Supabase dashboard — slow queries indicate missing indexes
- Add performance tests: assert queries complete in <500ms with realistic data volumes

**Phase:** Foundation (Week 2) — Create indexes with RLS policies

**Sources:**
- [Optimizing RLS Performance with Supabase](https://medium.com/@antstack/optimizing-rls-performance-with-supabase-postgres-fa4e2b6e196d)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

### 5. API Rate Limits Hit Without Circuit Breakers = $1000+ Bills

**What goes wrong:** External APIs (Apollo, ContactOut, Exa, SEC EDGAR) have rate limits. Without circuit breakers and backoff strategies, your app hammers the API during retries, burns through quota in minutes, and generates massive overage charges.

**Why it happens:**
- Naive retry logic without exponential backoff
- No rate limit tracking across concurrent requests
- Batch operations that don't respect API limits
- Missing 429 (Too Many Requests) error handling

**Consequences for this project:**
- Apollo.io: Fixed rate limits per subscription tier, hitting limit locks out searches for entire tenant
- ContactOut: Per-seat limits, exceeding quota = failed enrichments for high-value prospects
- Exa.ai: Cost per search, uncontrolled requests = budget overrun ($3,100 budget has zero margin)
- Claude API: $1 input / $5 output per million tokens (Haiku), bulk summaries without batching = unexpected costs

**Real-world scenario:**
- User searches for "Finance Elite" persona → returns 500 prospects
- Frontend eagerly fetches first 50 prospect profiles
- Each profile triggers lazy enrichment: ContactOut (email) + Exa (web presence) + SEC (transactions) + Claude (summary)
- 50 profiles × 4 API calls = 200 requests in 10 seconds
- All APIs hit rate limits, user sees errors, quota exhausted

**Prevention:**
- Implement API client wrapper with rate limiting:
  ```typescript
  class RateLimitedAPI {
    private queue: RequestQueue;
    private limiter: RateLimiter; // e.g., bottleneck library

    async call(endpoint, params) {
      return this.limiter.schedule(() => this.makeRequest(endpoint, params));
    }
  }
  ```
- Handle 429 responses with exponential backoff:
  ```typescript
  async function apiCallWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.status === 429) {
          const retryAfter = error.headers['retry-after'] || Math.pow(2, i) * 1000;
          await sleep(retryAfter);
        } else throw error;
      }
    }
  }
  ```
- Track API usage per tenant in database to prevent quota exhaustion
- Use Claude Batch API (50% discount) for prospect summaries generated overnight
- Implement request queuing: enrich profiles sequentially, not in parallel

**Detection:**
- Monitor API response codes — track 429 (rate limit) occurrences
- Alert when approaching 80% of rate limit quota
- Log all API errors with tenant context for debugging
- Add API cost tracking dashboard for real-time spend monitoring

**Phase:** Persona + Search (Week 3-4) AND Enrich + Ship (Week 5-6)

**Sources:**
- [How to Handle API Rate Limits Gracefully](https://apistatuscheck.com/blog/how-to-handle-api-rate-limits)
- [API Rate Limiting Best Practices](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies)
- [Apollo.io Rate Limits Documentation](https://docs.apollo.io/reference/rate-limits)
- [Claude API Pricing Guide 2026](https://www.aifreeapi.com/en/posts/claude-api-pricing-per-million-tokens)

---

### 6. Missing Tenant Context in Server Actions = Authorization Bypass

**What goes wrong:** Next.js App Router Server Actions don't automatically inherit tenant context from middleware. If server actions extract `tenant_id` from request without validation, attackers can forge tenant IDs and access other tenants' data.

**Why it happens:**
- Developers assume middleware tenant validation carries into server actions
- JWT claims used directly without re-validation
- Reliance on client-passed `tenant_id` parameter instead of session

**Consequences:**
- Attacker modifies request to include different tenant_id
- Server action processes request without validation
- Cross-tenant data access, modification, deletion
- RLS bypassed if server action uses service_role connection

**Real-world attack for this project:**
```typescript
// VULNERABLE: Trust client-passed tenantId
async function addToList(tenantId: string, listId: string, prospectId: string) {
  // Attacker passes another tenant's tenantId
  await supabase.from('list_members').insert({ tenant_id: tenantId, list_id: listId, prospect_id: prospectId });
}

// SECURE: Extract tenant from validated session
async function addToList(listId: string, prospectId: string) {
  const session = await getServerSession();
  const tenantId = session.user.tenant_id; // From validated JWT
  await supabase.from('list_members').insert({ tenant_id: tenantId, list_id: listId, prospect_id: prospectId });
}
```

**Prevention:**
- NEVER accept `tenant_id` as a parameter from client
- Always extract `tenant_id` from server-side session validation
- Create helper function for all server actions:
  ```typescript
  export async function requireTenantContext() {
    const session = await getServerSession();
    if (!session) throw new Error('Unauthorized');
    return { tenantId: session.user.tenant_id, userId: session.user.id };
  }
  ```
- Set PostgreSQL session variable in RLS policies: `current_setting('app.current_tenant')::uuid`
- Validate that resources belong to tenant before operations

**Detection:**
- Penetration test: modify Network tab requests to include different tenant_id values
- If operation succeeds with wrong tenant_id, authorization is broken
- Add integration tests that attempt cross-tenant operations

**Phase:** Foundation (Week 1-2) — Before building any server actions

**Sources:**
- [Next.js Multi-Tenant Authentication](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0)
- [Multi-Tenant Security Best Practices](https://qrvey.com/blog/multi-tenant-security/)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user experience problems.

### 7. Apollo.io Pagination Without Batching = Incomplete Results

**What goes wrong:** Apollo.io uses cursor-based pagination and returns max 50-100 results per request. If you don't implement pagination correctly, persona searches return partial results (shows 50 prospects when 500 exist).

**Why it happens:**
- Assumption that single API call returns all results
- Not handling `next_page_token` or cursor pagination
- Frontend displays "no more results" when pagination not implemented

**Consequences:**
- Users think persona searches have few results when hundreds exist
- Competitor analysis incomplete (missing key prospects)
- Revenue loss — fewer prospects = fewer deals

**Prevention:**
- Implement pagination wrapper:
  ```typescript
  async function fetchAllResults(searchParams, maxResults = 1000) {
    const results = [];
    let cursor = null;

    while (results.length < maxResults) {
      const response = await apolloAPI.search({ ...searchParams, cursor });
      results.push(...response.data);

      if (!response.pagination.next_page_token) break;
      cursor = response.pagination.next_page_token;
    }

    return results;
  }
  ```
- Show pagination UI: "Showing 1-50 of 500 results"
- Add "Load More" button for user-controlled pagination
- Respect Apollo rate limits: batch requests with delays

**Detection:**
- Perform persona search with broad criteria (should return 200+ results)
- If UI shows only 50-100 results and no pagination, implementation is broken
- Check API responses for `next_page_token` field

**Phase:** Persona + Search (Week 3-4)

**Sources:**
- [Apollo.io API Documentation](https://docs.apollo.io/)
- [Apollo API Essentials](https://rollout.com/integration-guides/apollo/api-essentials)

---

### 8. Lazy Enrichment Without Status Tracking = User Confusion

**What goes wrong:** Lazy enrichment triggers on profile view, but without status indicators ("enriching...", "complete", "failed"), users refresh repeatedly, causing duplicate API calls and quota waste.

**Why it happens:**
- Fire-and-forget enrichment without UI feedback
- No database status tracking for enrichment states
- Optimistic UI updates without confirmation

**Consequences:**
- Users don't know if enrichment is loading, completed, or failed
- Repeated profile views trigger duplicate enrichment API calls
- API quota wasted on redundant requests
- User frustration with "slow" or "incomplete" profiles

**Prevention:**
- Add enrichment status columns to prospects table:
  ```sql
  ALTER TABLE prospects ADD COLUMN contactout_status TEXT DEFAULT 'pending'; -- 'pending', 'enriching', 'complete', 'failed', 'skipped'
  ALTER TABLE prospects ADD COLUMN exa_status TEXT DEFAULT 'pending';
  ALTER TABLE prospects ADD COLUMN sec_status TEXT DEFAULT 'pending';
  ALTER TABLE prospects ADD COLUMN summary_status TEXT DEFAULT 'pending';
  ```
- Implement status-driven enrichment:
  ```typescript
  async function enrichProfile(prospectId: string) {
    // Check if already enriched
    const prospect = await supabase.from('prospects').select('contactout_status').eq('id', prospectId).single();
    if (prospect.contactout_status === 'complete') return; // Skip

    // Update status to 'enriching'
    await supabase.from('prospects').update({ contactout_status: 'enriching' }).eq('id', prospectId);

    // Perform enrichment
    const result = await contactoutAPI.enrich(prospect.email);

    // Update status to 'complete' or 'failed'
    await supabase.from('prospects').update({
      contactout_status: result.success ? 'complete' : 'failed',
      personal_email: result.email
    }).eq('id', prospectId);
  }
  ```
- Show spinner/skeleton UI for "enriching" status
- Display error message for "failed" status with retry option
- Cache enriched data aggressively to prevent redundant calls

**Detection:**
- View prospect profile, immediately refresh page
- If duplicate API calls appear in logs, status tracking is missing
- Check database for enrichment status columns

**Phase:** Enrich + Ship (Week 5-6)

**Sources:**
- [Data Enrichment Best Practices](https://www.firecrawl.dev/blog/complete-guide-to-data-enrichment)
- [Building Enrichment Pipelines](https://www.matillion.com/learn/blog/data-enrichment)

---

### 9. Stale Enrichment Data Without Refresh Strategy = Outdated Intelligence

**What goes wrong:** Enriched data (email, job title, company) becomes stale over time. Without refresh strategy, platform shows outdated information, reducing value proposition.

**Why it happens:**
- Assumption that enriched data is "set it and forget it"
- No timestamp tracking for last enrichment
- Budget constraints discourage re-enrichment

**Consequences:**
- Contact info outdated (emails bounce, phone numbers disconnected)
- Job titles wrong (prospect changed roles 6 months ago)
- Wealth signals stale (sold company, no longer relevant)
- Platform loses credibility with users

**Prevention:**
- Add timestamp columns:
  ```sql
  ALTER TABLE prospects ADD COLUMN enriched_at TIMESTAMPTZ;
  ALTER TABLE prospects ADD COLUMN last_refreshed_at TIMESTAMPTZ;
  ```
- Implement age-based refresh triggers:
  ```typescript
  function shouldRefreshEnrichment(enrichedAt: Date): boolean {
    const ageInDays = (Date.now() - enrichedAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > 90; // Refresh after 90 days
  }
  ```
- Add "Refresh Data" button in UI for manual refresh
- Schedule batch refresh job for high-value prospects (e.g., prospects in active lists)
- Show enrichment age in UI: "Last updated 45 days ago"

**Detection:**
- Query database for prospects enriched >90 days ago
- Check if contact info is outdated (email bounces, phone disconnected)
- Monitor user complaints about "old" data

**Phase:** Post-launch (v2) — Defer until usage patterns established

**Sources:**
- [Data Enrichment Best Practices](https://improvado.io/blog/what-is-data-enrichment)
- [Handling Data Freshness in Pipelines](https://www.matillion.com/learn/blog/data-enrichment)

---

### 10. Vercel Function Timeouts on External API Calls = Failed Enrichments

**What goes wrong:** Vercel Hobby plan functions timeout at 10 seconds. Pro plan defaults to 5 minutes but can timeout on slow external API responses. Failed enrichments leave prospects with incomplete data.

**Why it happens:**
- Multiple external API calls in single serverless function
- Network latency + API response time exceeds timeout
- No timeout handling or fallback logic

**Consequences:**
- ContactOut + Exa + SEC + Claude in single function = 8+ seconds (may timeout on Hobby plan)
- User sees "enrichment failed" without explanation
- Partial enrichment (only ContactOut succeeded, others failed)

**Prevention:**
- Use Vercel Fluid Compute with `maxDuration` config:
  ```typescript
  export const maxDuration = 60; // 60 seconds for enrichment function
  ```
- Split enrichment into separate functions with individual timeouts:
  - `/api/enrich/contactout` (max 15s)
  - `/api/enrich/exa` (max 20s)
  - `/api/enrich/sec` (max 30s)
  - `/api/enrich/summary` (max 15s)
- Implement timeout handling:
  ```typescript
  async function enrichWithTimeout(fn: () => Promise<any>, timeoutMs: number) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
    ]);
  }
  ```
- Use Vercel Workflow for long-running enrichment (offloads API calls, no function timeout risk)
- Add retry mechanism for failed enrichments

**Detection:**
- Monitor Vercel function logs for `FUNCTION_INVOCATION_TIMEOUT` errors
- Test enrichment with slow network conditions (throttle DevTools network)
- Check Supabase for prospects with partial enrichment (some fields populated, others null)

**Phase:** Enrich + Ship (Week 5-6)

**Sources:**
- [Vercel Functions Timeout Troubleshooting](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)
- [Vercel Function Limitations](https://vercel.com/docs/functions/limitations)
- [Solving Vercel Timeouts](https://upstash.com/blog/vercel-cost-workflow)

---

### 11. Dark Theme with Poor Contrast = Accessibility Violations

**What goes wrong:** Gold accents (#d4af37) on dark backgrounds (#0a0a0a) fail WCAG 2.1 AA contrast requirements (4.5:1 for text, 3:1 for large text). Users with visual impairments cannot read critical UI elements.

**Why it happens:**
- Prioritizing aesthetics ("luxury" dark theme) over accessibility
- Not testing with contrast checkers during design
- Assuming "looks good to me" means it's accessible

**Consequences:**
- Lawsuit risk under ADA/WCAG compliance requirements
- Users with low vision, color blindness cannot use platform
- Text appears washed out, buttons hard to see
- Platform reputation damaged ("not accessible")

**Real-world issue for this project:**
- Gold text (#d4af37) on dark background (#0a0a0a) = 2.8:1 contrast (FAILS WCAG AA)
- Minimum required: 4.5:1 for normal text, 3:1 for large text (18pt+)

**Prevention:**
- Use dark gray backgrounds (#121212) instead of pure black (#000000) to reduce eye strain
- Lighten gold accent for text to meet contrast requirements:
  - Test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
  - Gold #f4d47f on #121212 = 7.8:1 (PASSES WCAG AA)
- Reserve saturated gold (#d4af37) for non-text elements (icons, borders, backgrounds)
- Use heavier font weights (500-600) for dark mode to improve readability
- Add focus indicators (high-contrast outline) for keyboard navigation
- Test with Chrome DevTools Accessibility panel

**Detection:**
- Run automated accessibility audit (Lighthouse, axe DevTools)
- Manually test with contrast checker on all text elements
- Review with users who have visual impairments
- Check if text is readable in bright sunlight (mobile use case)

**Phase:** Foundation (Week 1-2) — Set design system colors correctly upfront

**Sources:**
- [Dark Mode Accessibility Best Practices](https://dubbot.com/dubblog/2023/dark-mode-a11y.html)
- [WCAG Color Contrast Requirements](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements)
- [Inclusive Dark Mode Design](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)

---

### 12. CSV Export Loads Entire Dataset into Memory = Out of Memory Crash

**What goes wrong:** Exporting 1000+ prospect lists to CSV by loading all rows into memory causes Node.js process to crash (V8 memory limit ~1.4GB). Users get "export failed" error.

**Why it happens:**
- Naive implementation: fetch all rows → convert to CSV → send file
- No streaming implementation
- Assumption that "1000 prospects" is small dataset

**Consequences:**
- CSV export fails for lists >500 prospects
- Serverless function runs out of memory and crashes
- User frustration: "Export worked yesterday, now it's broken"
- Memory leaks if export retried multiple times

**Prevention:**
- Use streaming CSV generation with Node.js streams:
  ```typescript
  import { stringify } from 'csv-stringify';
  import { Readable } from 'stream';

  export async function generateCSV(tenantId: string, listId: string) {
    const { data, error } = await supabase
      .from('list_members')
      .select('*, prospects(*)')
      .eq('tenant_id', tenantId)
      .eq('list_id', listId)
      .stream(); // Supabase streaming (if available) or implement pagination

    const csvStream = stringify({ header: true, columns: [...] });

    // Pipe database rows through CSV stringifier
    return Readable.from(data).pipe(csvStream);
  }
  ```
- Implement pagination for large datasets:
  ```typescript
  async function* fetchProspectsInBatches(listId: string, batchSize = 100) {
    let offset = 0;
    while (true) {
      const { data } = await supabase
        .from('list_members')
        .select('*, prospects(*)')
        .eq('list_id', listId)
        .range(offset, offset + batchSize - 1);

      if (data.length === 0) break;
      yield data;
      offset += batchSize;
    }
  }
  ```
- Set reasonable export limits (e.g., 5000 prospects max per export)
- Use Vercel Edge Functions for streaming responses

**Detection:**
- Test CSV export with 2000+ prospect list
- Monitor Vercel function memory usage (should stay below 500MB)
- Check logs for "Out of Memory" or "ENOMEM" errors
- Measure export time — should be <30 seconds for 5000 prospects

**Phase:** Enrich + Ship (Week 5-6)

**Sources:**
- [Handling Large Datasets in Node.js](https://www.mindfulchase.com/explore/troubleshooting-tips/handling-large-datasets-in-node-js-memory-efficient-strategies.html)
- [CSV Streaming with Node.js](https://www.digitalocean.com/community/tutorials/how-to-read-and-write-csv-files-in-node-js-using-node-csv)
- [Processing Large Files in Node.js](https://pkvpraveen.medium.com/how-to-process-large-csv-files-with-node-js-without-going-out-of-memory-e646202d3ecf)

---

### 13. SEC EDGAR API 30-Transaction Limit = Incomplete Insider Data

**What goes wrong:** SEC Form 4 filings are limited to 30 transactions per filing. Executives with >30 transactions on same date file multiple Form 4s. If your integration only fetches the first filing, you miss transactions.

**Why it happens:**
- Assumption that one Form 4 = complete transaction history
- Not checking for multiple filings on same date by same insider
- API returns "first 50 transactions" without pagination handling

**Consequences:**
- Incomplete insider trading data for high-activity executives
- Wealth signal calculations wrong (missing millions in stock transactions)
- Platform shows "no recent transactions" when dozens exist
- User loses trust in SEC data accuracy

**Prevention:**
- Fetch ALL Form 4 filings for an executive, not just the latest:
  ```typescript
  async function fetchAllForm4Filings(cik: string, since: Date) {
    const filings = await secAPI.getFilings({ cik, type: 'FORM-4', since });

    // Group by filing date to detect multiple filings same day
    const filingsByDate = groupBy(filings, f => f.filingDate);

    // Fetch and parse all filings
    const transactions = [];
    for (const filings of Object.values(filingsByDate)) {
      for (const filing of filings) {
        const parsed = await parseForm4(filing.url);
        transactions.push(...parsed.transactions);
      }
    }

    return transactions;
  }
  ```
- Handle SEC API pagination (max 50 transactions per response):
  ```typescript
  let offset = 0;
  while (true) {
    const response = await secAPI.getTransactions({ cik, offset, limit: 50 });
    transactions.push(...response.data);
    if (response.data.length < 50) break; // No more results
    offset += 50;
  }
  ```
- Parse footnotes — critical transaction details often in footnotes array
- Show "Last updated" timestamp for SEC data in UI

**Detection:**
- Find executive with >30 transactions on same date (e.g., stock split, option exercise)
- Verify your system captures all transactions, not just first 30
- Check SEC EDGAR directly to compare against your parsed data

**Phase:** Enrich + Ship (Week 5-6)

**Sources:**
- [SEC EDGAR API Documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [Insider Trading Data from SEC Filings](https://sec-api.io/docs/insider-ownership-trading-api)

---

### 14. ContactOut Data Accuracy Issues = Wasted Enrichment Budget

**What goes wrong:** ContactOut claims 99% accuracy but users report 15-25% inaccuracy for mid-market professionals. Enriching 1000 prospects means 150-250 have wrong emails/phones, wasting API credits and user trust.

**Why it happens:**
- ContactOut data sourced from web scraping and public records (not always current)
- Mid-market and startup executives less visible online than Fortune 500
- Email verification inconsistent during high-traffic periods

**Consequences:**
- Agent sends outreach to wrong email → bounces, damages sender reputation
- Phone numbers disconnected → wasted call attempts
- User blames platform for "bad data"
- API credits spent on inaccurate enrichments

**Prevention:**
- Implement email verification BEFORE storing enriched data:
  ```typescript
  async function enrichWithVerification(prospect: Prospect) {
    const contactoutData = await contactoutAPI.enrich(prospect.email);

    // Verify email before storing
    const verified = await verifyEmail(contactoutData.personal_email);

    if (!verified) {
      // Mark as unverified, don't overwrite existing data
      await supabase.from('prospects').update({
        contactout_status: 'failed',
        enrichment_notes: 'Email verification failed'
      }).eq('id', prospect.id);
    } else {
      // Store verified data
      await supabase.from('prospects').update({
        personal_email: contactoutData.personal_email,
        contactout_status: 'complete'
      }).eq('id', prospect.id);
    }
  }
  ```
- Show confidence scores in UI: "Email verified ✓" vs "Email unverified (use with caution)"
- Allow manual override: users can edit enriched data if incorrect
- Track enrichment accuracy per source to identify patterns
- Consider alternative data sources for verification (e.g., Hunter.io for email validation)

**Detection:**
- Manually verify sample of enriched emails (send test emails, check bounce rate)
- Survey users about data accuracy
- Monitor bounce rates from email outreach campaigns

**Phase:** Enrich + Ship (Week 5-6)

**Sources:**
- [ContactOut Review 2026](https://derrick-app.com/tools/contactout-review)
- [ContactOut Alternatives Comparison](https://sparkle.io/blog/contactout-alternatives/)
- [Data Enrichment Tool Accuracy](https://www.saleshandy.com/blog/data-enrichment-tools/)

---

### 15. Supabase Connection Pool Exhaustion in Serverless = Failed Queries

**What goes wrong:** Serverless functions create new database connections on every invocation. Without connection pooling, Supabase connection limit (default 60-100) exhausts quickly during traffic spikes, causing "too many connections" errors.

**Why it happens:**
- Each Vercel function invocation creates new Postgres connection
- Connections not reused across invocations
- Supabase connection limits based on plan tier (Pro = 200 max)
- Cold starts create connection spikes

**Consequences:**
- Users see "database error" during peak usage
- Enrichment jobs fail mid-execution
- Dashboard queries fail randomly
- Platform appears unstable/unreliable

**Prevention:**
- Use Supabase transaction mode connection string for serverless:
  ```typescript
  // Use pooler connection string (transaction mode) instead of direct connection
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: {
        schema: 'public',
        // Use pooler connection string: postgres://[host]:[port]/postgres?pgbouncer=true
      }
    }
  );
  ```
- Enable Supabase Supavisor (dedicated pooler) for Pro plan
- Limit connection pool size in serverless functions:
  ```typescript
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Only 1 connection per function (serverless best practice)
  });
  ```
- Close connections explicitly after use (though serverless functions terminate automatically)
- Monitor connection count in Supabase dashboard — alert at 80% capacity
- Use Supabase Edge Functions (Deno runtime) which have optimized connection handling

**Detection:**
- Load test with 50+ concurrent requests
- Monitor Supabase connection count during test
- If "too many connections" errors appear, pooling is insufficient
- Check Vercel function logs for connection errors

**Phase:** Foundation (Week 2) — Configure connection pooling early

**Sources:**
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)
- [Debugging Postgres Connection Pooling](https://jackymlui.medium.com/debugging-postgres-connection-pooling-with-aws-lambdas-1706bce8d8f0)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### 16. Next.js Middleware Tenant Context Not Available in Server Components

**What goes wrong:** Middleware extracts tenant slug from URL and adds to headers, but Server Components don't automatically receive middleware-modified headers. Developers manually re-extract tenant context in every Server Component.

**Why it happens:**
- Middleware runs on Edge Runtime with limited access to request context
- Server Components execute separately from middleware
- No built-in mechanism to pass middleware context to Server Components

**Prevention:**
- Use middleware to set cookies instead of headers:
  ```typescript
  // middleware.ts
  export function middleware(request: NextRequest) {
    const tenantSlug = request.nextUrl.pathname.split('/')[1];

    const response = NextResponse.next();
    response.cookies.set('tenant-slug', tenantSlug);
    return response;
  }
  ```
- Create helper function to extract tenant context:
  ```typescript
  // lib/tenant.ts
  import { cookies } from 'next/headers';

  export async function getTenantContext() {
    const cookieStore = cookies();
    const tenantSlug = cookieStore.get('tenant-slug')?.value;

    // Fetch tenant from database
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', tenantSlug)
      .single();

    return tenant;
  }
  ```
- Use in Server Components:
  ```typescript
  // app/[tenant]/dashboard/page.tsx
  export default async function DashboardPage() {
    const tenant = await getTenantContext();
    // Use tenant.id for queries
  }
  ```

**Detection:**
- If every Server Component manually extracts tenant slug, context passing is broken
- Look for duplicate tenant extraction logic across components

**Phase:** Foundation (Week 1-2)

**Sources:**
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Next.js Middleware Authentication](https://medium.com/@dreamworld420/nextjs-authentication-app-router-middleware-1eefeae1d687)

---

### 17. Dynamic Route Slug Injection Attacks

**What goes wrong:** Tenant slugs in dynamic routes (`/[tenant]/dashboard`) aren't validated. Attackers inject SQL or path traversal payloads like `../../../etc/passwd` or `'; DROP TABLE tenants;--`.

**Why it happens:**
- Trust that Next.js routing handles validation
- Direct use of slug parameter without sanitization
- No whitelist validation against database

**Prevention:**
- Validate slug format with regex:
  ```typescript
  function isValidTenantSlug(slug: string): boolean {
    return /^[a-z0-9-]{3,50}$/.test(slug);
  }
  ```
- Validate slug exists in database before processing:
  ```typescript
  export async function getTenantBySlug(slug: string) {
    if (!isValidTenantSlug(slug)) {
      throw new Error('Invalid tenant slug');
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }
  ```
- Use parameterized queries (Supabase client handles this automatically)
- Never construct SQL strings with template literals

**Detection:**
- Test with malicious slugs: `../../../etc/passwd`, `'; DROP TABLE tenants;--`, `<script>alert('xss')</script>`
- If application crashes or behaves unexpectedly, validation is missing

**Phase:** Foundation (Week 1-2)

**Sources:**
- [Next.js Dynamic Routes Security](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
- [Next.js Security Advisory CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478)

---

### 18. API Keys in Environment Variables Without Encryption

**What goes wrong:** API keys stored in plain-text `.env` files or Vercel environment variables. If `.env` committed to Git or Vercel account compromised, all API keys exposed.

**Why it happens:**
- Convenience of plain-text environment variables
- Not using secrets management services (AWS Secrets Manager, HashiCorp Vault)
- Assumption that "it's just a hobby project"

**Prevention:**
- Add `.env.local` to `.gitignore` immediately
- Use Vercel environment variables marked as "Sensitive" (encrypted at rest)
- For production, consider AWS Secrets Manager or HashiCorp Vault:
  ```typescript
  import { SecretsManager } from 'aws-sdk';

  async function getAPIKey(secretName: string) {
    const secretsManager = new SecretsManager();
    const secret = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    return JSON.parse(secret.SecretString);
  }
  ```
- Rotate API keys quarterly
- Use separate keys for development, staging, production
- Implement key rotation script for zero-downtime rotation

**Detection:**
- Search Git history: `git log -p | grep "APOLLO_API_KEY"`
- If API key found in commits, it's compromised (rotate immediately)
- Use tools like GitGuardian or TruffleHog to scan for secrets

**Phase:** Foundation (Week 1)

**Sources:**
- [API Key Security Best Practices 2026](https://dev.to/alixd/api-key-security-best-practices-for-2026-1n5d)
- [Claude API Key Best Practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure)
- [Serverless API Key Storage](https://medium.com/@sassenthusiast/serverless-strategies-with-openai-episode-1-secure-api-key-storage-and-access-00c91b74bc2a)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| **Foundation (Week 1-2)** | RLS disabled by default | Enable RLS + create policies + add indexes immediately after table creation |
| **Foundation (Week 1-2)** | Service role key in client code | Grep codebase for `service_role` before every commit, use pre-commit hooks |
| **Foundation (Week 1-2)** | Missing tenant context in server actions | Create `requireTenantContext()` helper, never accept tenant_id from client |
| **Foundation (Week 2)** | Connection pool exhaustion | Use transaction mode connection string, configure Supavisor |
| **Persona + Search (Week 3-4)** | Apollo.io pagination incomplete | Implement cursor-based pagination wrapper, show "Load More" UI |
| **Persona + Search (Week 3-4)** | API rate limits without circuit breakers | Wrap API clients with rate limiters, handle 429 responses with exponential backoff |
| **Enrich + Ship (Week 5-6)** | Lazy enrichment without status tracking | Add status columns to prospects table, show loading/complete/failed states in UI |
| **Enrich + Ship (Week 5-6)** | Vercel function timeouts | Use Fluid Compute with maxDuration, split enrichment into separate functions |
| **Enrich + Ship (Week 5-6)** | CSV export memory overflow | Use streaming CSV generation, paginate database queries |
| **Enrich + Ship (Week 5-6)** | ContactOut data accuracy | Verify emails before storing, show confidence scores, allow manual overrides |
| **Enrich + Ship (Week 5-6)** | SEC EDGAR 30-transaction limit | Fetch ALL Form 4 filings, handle pagination, parse footnotes |
| **All Phases** | Missing tenant_id in cache keys | Prefix ALL cache keys with `tenant:${tenantId}:` |
| **All Phases** | Dark theme contrast violations | Use #121212 background, lighten gold to #f4d47f for text, test with contrast checker |

---

## Sources

All findings verified with official documentation and industry sources from 2025-2026:

**Supabase RLS & Multi-Tenancy:**
- [Supabase Security Flaw: 170+ Apps Exposed](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Optimizing RLS Performance with Supabase](https://medium.com/@antstack/optimizing-rls-performance-with-supabase-postgres-fa4e2b6e196d)
- [Multi-Tenant Leakage: When RLS Fails](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Best Practices for Supabase Security](https://www.leanware.co/insights/supabase-best-practices)

**Next.js App Router & Multi-Tenancy:**
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Multi-Tenant Architecture in Next.js](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0)
- [Next.js Authentication in Middleware](https://medium.com/@dreamworld420/nextjs-authentication-app-router-middleware-1eefeae1d687)
- [Next.js Security Advisory CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478)

**API Rate Limiting & Error Handling:**
- [How to Handle API Rate Limits Gracefully](https://apistatuscheck.com/blog/how-to-handle-api-rate-limits)
- [API Rate Limiting at Scale](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies)
- [Apollo.io Rate Limits Documentation](https://docs.apollo.io/reference/rate-limits)
- [Apollo.io API Documentation](https://docs.apollo.io/)

**Data Enrichment Pipelines:**
- [What Is Data Enrichment? 2026 Guide](https://improvado.io/blog/what-is-data-enrichment)
- [Data Enrichment Best Practices](https://www.firecrawl.dev/blog/complete-guide-to-data-enrichment)
- [Data Enrichment Steps and Best Practices](https://www.matillion.com/learn/blog/data-enrichment)
- [ContactOut Review 2026](https://derrick-app.com/tools/contactout-review)
- [ContactOut Alternatives Comparison](https://sparkle.io/blog/contactout-alternatives/)

**Vercel Deployment & Functions:**
- [Vercel Functions Timeout Troubleshooting](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)
- [Vercel Function Limitations](https://vercel.com/docs/functions/limitations)
- [Solving Vercel Function Timeouts](https://upstash.com/blog/vercel-cost-workflow)
- [Vercel Function Invocation Timeout](https://vercel.com/docs/errors/FUNCTION_INVOCATION_TIMEOUT)

**Database Connection Pooling:**
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)
- [Debugging Postgres Connection Pooling](https://jackymlui.medium.com/debugging-postgres-connection-pooling-with-aws-lambdas-1706bce8d8f0)

**Dark Mode Accessibility:**
- [Dark Mode Accessibility Best Practices](https://dubbot.com/dubblog/2023/dark-mode-a11y.html)
- [WCAG Color Contrast Requirements](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements)
- [Inclusive Dark Mode Design](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)
- [Dark Mode Design Best Practices 2026](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/)

**CSV Export & Memory Management:**
- [Handling Large Datasets in Node.js](https://www.mindfulchase.com/explore/troubleshooting-tips/handling-large-datasets-in-node-js-memory-efficient-strategies.html)
- [CSV Streaming with Node.js](https://www.digitalocean.com/community/tutorials/how-to-read-and-write-csv-files-in-node-js-using-node-csv)
- [Processing Large CSV Files](https://pkvpraveen.medium.com/how-to-process-large-csv-files-with-node-js-without-going-out-of-memory-e646202d3ecf)
- [Loading Large Data with Node.js Streams](https://www.coreycleary.me/loading-tons-of-data-performantly-using-node-js-streams)

**SEC EDGAR API:**
- [SEC EDGAR API Documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [Insider Trading Data from SEC Filings](https://sec-api.io/docs/insider-ownership-trading-api)

**Claude API & Cost Management:**
- [Claude API Pricing Guide 2026](https://www.aifreeapi.com/en/posts/claude-api-pricing-per-million-tokens)
- [Claude API Pricing Calculator](https://costgoat.com/pricing/claude-api)
- [Anthropic Claude API Pricing](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration)

**API Key Security:**
- [API Key Security Best Practices 2026](https://dev.to/alixd/api-key-security-best-practices-for-2026-1n5d)
- [Stop Leaking API Keys: BFF Pattern](https://blog.gitguardian.com/stop-leaking-api-keys-the-backend-for-frontend-bff-pattern-explained/)
- [Serverless API Key Storage](https://medium.com/@sassenthusiast/serverless-strategies-with-openai-episode-1-secure-api-key-storage-and-access-00c91b74bc2a)
- [Claude API Key Best Practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure)

**Multi-Tenant Security:**
- [Multi-Tenant Security Best Practices](https://qrvey.com/blog/multi-tenant-security/)
- [Architecting Secure Multi-Tenant Data Isolation](https://medium.com/@justhamade/architecting-secure-multi-tenant-data-isolation-d8f36cb0d25e)
- [Maximizing Security in Multi-Tenant Cloud](https://bigid.com/blog/maximizing-security-in-multi-tenant-cloud-environments/)

---

## Research Confidence

**Overall Confidence:** HIGH

| Area | Confidence | Notes |
|------|------------|-------|
| Supabase RLS | HIGH | Official docs + recent security advisories (CVE-2025-48757) |
| Next.js App Router | HIGH | Official Next.js docs + 2026 community patterns |
| API Rate Limiting | HIGH | Multiple authoritative sources + vendor-specific docs |
| Data Enrichment | MEDIUM | Industry best practices, vendor-specific gotchas from user reviews |
| Vercel Functions | HIGH | Official Vercel docs + recent troubleshooting guides |
| Dark Mode Accessibility | HIGH | WCAG 2.1 standards + 2025-2026 design resources |
| CSV Export | HIGH | Node.js streaming best practices + serverless memory constraints |
| Multi-Tenant Security | HIGH | Recent security research (2026) + incident reports |

---

## Gaps to Address

**Areas requiring deeper investigation:**
- Exa.ai API limitations: Documentation sparse, may need trial-and-error testing
- Claude API rate limiting specifics: Batch API usage patterns for prospect summaries
- Supabase Edge Functions vs Vercel Functions: Performance/cost tradeoff for enrichment

**Deferred to phase-specific research:**
- SEC EDGAR XML parsing edge cases (once integration begins)
- ContactOut API webhook support for real-time enrichment (if available)
- Supabase Realtime subscriptions for multi-user list collaboration (v2 feature)
