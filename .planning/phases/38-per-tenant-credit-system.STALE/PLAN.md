# [STALE — DO NOT EXECUTE] Per-Tenant Credit Limit System

> **Status: STALE as of 2026-04-15.** Deferred per Adrian on the 2026-04-13 call with Camila + Ayman:
> *"We don't have to do that right now because I want to get the tool to the client working ASAP."*
> Priority is shipping to Maggie (first real estate client), then re-evaluating credit metering once we
> scale to a second vertical. **Do not execute this phase without explicit user confirmation.** If the
> plan is revived, move the directory back (remove `.STALE` suffix) and add a ROADMAP entry.

## Context

PGL Luxury Buyer Finder is a multi-tenant prospect intelligence platform. Each tenant (real estate brokerage) searches for UHNWI prospects via Apollo, enriches them through 5+ external APIs, and runs AI-powered research. Currently, all tenants share a single pool of API keys with no per-tenant metering or limits beyond simple rate limiters. The client needs a credit system so tenants can be billed fairly, limits can be enforced, and overage can be auto-charged.

---

## 1. Credit Consumption Analysis: What Costs What

### Per-Search (Apollo People Search)
| Step | API Call | Cost | Notes |
|------|----------|------|-------|
| Apollo Search | `POST /api/v1/mixed_people/api_search` | **Free** | Returns obfuscated previews, no credits consumed |
| Apollo Bulk Enrich | `POST /api/v1/people/bulk_match` | **1 Apollo credit/person** | Explicit "Enrich Selection" button, max 25/batch |

**Search itself is free. Enrichment is the paid action.**

### Per-Enrichment (Inngest `enrich-prospect` pipeline, per prospect)
| Step | Provider | API Calls | External Cost |
|------|----------|-----------|---------------|
| ContactOut | ContactOut API | 1 call | 1 ContactOut credit |
| Exa.ai web search | Exa API | 1 call (10 results) | ~$0.01-0.025 per search |
| Exa digest (LLM) | OpenRouter (Claude 3.5 Haiku) | 1 call (~1500 tokens out) | ~$0.002 |
| CIK Lookup (LLM fallback) | OpenRouter (Claude 3.5 Haiku) | 0-1 calls (~80 tokens out) | ~$0.0005 |
| SEC EDGAR | SEC EDGAR API | 1-12 calls | **Free** (public API) |
| Market Data | Finnhub + Yahoo Finance | 2 calls | **Free** (free tiers) |
| AI Summary | OpenRouter (Claude 3.5 Haiku) | 1 call (~500 tokens out) | ~$0.001 |
| Intelligence Dossier | OpenRouter (Claude 3.5 Haiku) | 1 call (~1800 tokens out) | ~$0.003 |

**Total per enrichment: ~$0.017-0.032 in API costs** (plus 1 Apollo credit + 1 ContactOut credit)

### Per-Research Query (Research Scrapbook)
| Step | Provider | API Calls | External Cost |
|------|----------|-----------|---------------|
| Intent Classifier | OpenRouter (Claude 3.5 Haiku) | 1 call (~200 tokens) | ~$0.0005 |
| Exa neural search | Exa API | 1 call (10 results, 3000 chars each) | ~$0.025 |
| EDGAR EFTS (conditional) | SEC EDGAR | 0-5 calls | **Free** |

**Total per research query: ~$0.025**

### Per-Lookalike Search
| Step | Provider | Cost |
|------|----------|------|
| LLM persona generation | OpenRouter (Claude 3.5 Haiku) | ~$0.003 |
| Apollo search | Apollo Search API | Free |

---

## 2. Pricing Tier Analysis & Bottleneck Identification

### External Service Pricing

| Service | Plan | Included | Overage | Monthly Cost |
|---------|------|----------|---------|-------------|
| **Apollo.io** | Professional | 1,200 credits/yr (100/mo) | $0.50/credit | ~$99/mo |
| **Apollo.io** | Organization | 3,600 credits/yr (300/mo) | $0.40/credit | ~$149/mo |
| **ContactOut** | Sales | 500 credits/mo | ~$0.20/credit | ~$99/mo |
| **ContactOut** | Enterprise | 1,000+ credits/mo | Negotiated | ~$199+/mo |
| **Exa.ai** | Starter | 1,000 searches/mo | $0.025/search | $25/mo |
| **Exa.ai** | Pro | 10,000 searches/mo | $0.020/search | $100/mo |
| **OpenRouter** | Pay-as-you-go | N/A | Haiku: $0.80/M in, $4/M out | Variable |
| **Finnhub** | Free | 60 calls/min | N/A | Free |
| **SEC EDGAR** | Public | 10 req/sec | N/A | Free |
| **Upstash Redis** | Pro | 100K commands/day | $0.20/100K | ~$10/mo |

### The Bottleneck

```
                    Bottleneck Analysis
    +-------------------------------------------------+
    |          Apollo Credits = #1 Bottleneck          |
    |  =============================================   |
    |  100-300 credits/mo on typical plans             |
    |  1 credit per enriched person                    |
    |  Determines max enrichable prospects/mo          |
    |                                                  |
    |          ContactOut = #2 Bottleneck              |
    |  ---------------------------------------------   |
    |  500-1000 credits/mo                             |
    |  1 credit per person enriched                    |
    |  Parallel to Apollo but higher cap               |
    |                                                  |
    |          Exa.ai = #3 Bottleneck                  |
    |  ---------------------------------------------   |
    |  1000-10000 searches/mo                          |
    |  1 per enrichment + 1 per research query         |
    |  Higher cap, less constraining                   |
    +-------------------------------------------------+
```

**Apollo is the primary bottleneck.** Each enriched prospect costs 1 Apollo credit, and plans cap at 100-300/month. With multiple tenants sharing one Apollo API key, a single heavy tenant can exhaust credits for everyone.

**ContactOut is the secondary bottleneck** at 500-1000/month, consumed in parallel with Apollo.

Exa and OpenRouter are pay-as-you-go with higher limits and are less constraining.

---

## 3. Simplified Credit Model (for client call)

### Proposed: Unified "Prospect Credit" Model

Instead of exposing tenants to 6 different API costs, abstract everything into a single unit: **1 Prospect Credit = 1 full enrichment of 1 person**.

```
+-----------------------------------------------------------+
|                  1 PROSPECT CREDIT                         |
|                                                            |
|  What the tenant sees:     What happens behind the         |
|  "Enrich 1 prospect"       scenes:                         |
|                                                            |
|                             +- 1 Apollo credit              |
|                             +- 1 ContactOut credit          |
|                             +- 1 Exa search                 |
|                             +- 3-4 LLM calls (OpenRouter)   |
|                             +- SEC EDGAR lookups (free)      |
|                             +- Market data (free)            |
|                                                            |
|  Estimated real cost:  $0.03 - $0.05 per credit            |
|  (excluding Apollo & ContactOut subscription costs)         |
|                                                            |
|  Suggested retail price:  $0.50 - $1.00 per credit         |
|  (covers API costs + margin + platform value)               |
+-----------------------------------------------------------+
```

### Separate "Research Credit" for Scrapbook Queries

```
+-----------------------------------------------------------+
|                  1 RESEARCH CREDIT                         |
|                                                            |
|  What the tenant sees:     What happens:                   |
|  "Run 1 research query"    +- 1 Exa neural search          |
|                             +- 1 LLM intent classifier      |
|                             +- EDGAR EFTS (free)            |
|                                                            |
|  Real cost: ~$0.025     Retail: $0.10 - $0.25              |
+-----------------------------------------------------------+
```

### Suggested Tier Structure

| Tier | Prospect Credits/mo | Research Credits/mo | Searches (free) | Price/mo |
|------|--------------------|--------------------|-----------------|----------|
| **Starter** | 50 | 100 | Unlimited | $49 |
| **Professional** | 200 | 500 | Unlimited | $149 |
| **Enterprise** | 500+ | 1,000+ | Unlimited | $349+ |
| **Overage** | +$1.00/credit | +$0.25/credit | N/A | Auto-billed |

Apollo search (preview results) stays **free and unlimited** (it costs nothing on Apollo's side). Only enrichment and deep research consume credits.

---

## 4. Implementation Plan: Per-Tenant Credit Limits

### Architecture

```
    [Tenant Action] --> {Credit Check}
        |                    |                    |
    Has Credits         No Credits,           No Credits,
        |              Overage ON            Overage OFF
        v                    v                    v
    Execute Action     Execute + Bill      Return 402 +
        |              Overage              UI Warning
        v                    |
    Decrement Credits <------+
        |
    Log Usage Event
        |
    Daily Aggregation Cron

    Enforcement Points:
    - /api/apollo/bulk-enrich
    - Inngest enrich-prospect
    - /api/.../research/multi-source
    - /api/search/lookalike
```

### Database Changes

**New table: `tenant_credit_plans`** (stores each tenant's credit allocation)

```sql
CREATE TABLE tenant_credit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'starter',
  prospect_credits_limit INT NOT NULL DEFAULT 50,
  prospect_credits_used INT NOT NULL DEFAULT 0,
  research_credits_limit INT NOT NULL DEFAULT 100,
  research_credits_used INT NOT NULL DEFAULT 0,
  overage_enabled BOOLEAN NOT NULL DEFAULT false,
  overage_rate_prospect NUMERIC(10,2) DEFAULT 1.00,
  overage_rate_research NUMERIC(10,2) DEFAULT 0.25,
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_cycle_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);
```

**New table: `tenant_credit_ledger`** (audit trail of every credit transaction)

```sql
CREATE TABLE tenant_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('prospect', 'research')),
  delta INT NOT NULL,  -- negative = consumed, positive = allocated/refunded
  balance_after INT NOT NULL,
  reason TEXT NOT NULL, -- 'enrichment', 'research_query', 'plan_allocation', 'overage', 'manual_adjustment'
  reference_id TEXT,    -- prospect_id, research session id, etc.
  is_overage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_ledger_tenant ON tenant_credit_ledger(tenant_id, created_at DESC);
```

### New Backend Functions & Modules

**`src/lib/credits/check-credit.ts`** -- Core credit gate

```
checkAndDeductCredit(tenantId, creditType: 'prospect' | 'research') ->
  { allowed: boolean, remaining: number, isOverage: boolean, error?: string }
```

- Reads `tenant_credit_plans` for the tenant
- If `credits_used < credits_limit`: increment `credits_used`, insert ledger row, return allowed
- If `overage_enabled`: allow but flag `is_overage: true` in ledger
- If neither: return `allowed: false` with a descriptive error
- Uses a Supabase RPC with `SELECT ... FOR UPDATE` to prevent race conditions

**`src/lib/credits/get-credit-balance.ts`** -- Read current balance

```
getCreditBalance(tenantId) -> { prospect: { used, limit, remaining, overage }, research: { ... } }
```

**`src/lib/credits/reset-credits.ts`** -- Monthly reset (Inngest cron)

New Inngest function running on the 1st of each month (or per tenant's `billing_cycle_end`):
- Reset `prospect_credits_used` and `research_credits_used` to 0
- Insert a positive ledger entry for the new allocation
- Advance `billing_cycle_start` / `billing_cycle_end`

### Enforcement Points (where to add credit checks)

| File | Action | Credit Type | Change |
|------|--------|-------------|--------|
| `src/app/api/apollo/bulk-enrich/route.ts` | Bulk enrich N people | `prospect` x N | Add credit check before calling `bulkEnrichPeople()`. Deduct N credits (one per Apollo ID). Return 402 if insufficient. |
| `src/inngest/functions/enrich-prospect.ts` | Single prospect enrichment | `prospect` x 1 | Add credit check as Step 0.5 (after duplicate check, before mark-in-progress). Skip enrichment and return `{ blocked: true }` if no credits. |
| `src/app/api/prospects/[id]/research/multi-source/route.ts` | Research query | `research` x 1 | Add credit check before `executeResearch()`. Return 402 if insufficient. This replaces the current flat `researchRateLimiter`. |
| `src/app/api/search/lookalike/route.ts` | Lookalike generation | `research` x 1 | Add credit check before `generateLookalikePersona()`. |

### API Routes to Add

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/credits` | GET | Return current tenant's credit balance (for UI badge/meter) |
| `GET /api/admin/tenants/[id]/credits` | GET | Super-admin: view any tenant's credit plan & ledger |
| `PATCH /api/admin/tenants/[id]/credits` | PATCH | Super-admin: update a tenant's plan, limits, overage settings |
| `POST /api/admin/tenants/[id]/credits/adjust` | POST | Super-admin: manual credit adjustment (bonus, refund) |

### Frontend Changes

**Both sides (tenant UI + admin UI):**

| Component | Location | What it shows |
|-----------|----------|---------------|
| Credit meter badge | Tenant sidebar/header | "42/200 prospect credits used" with progress bar |
| Enrich button guard | Search results page | Disable "Enrich Selection" when credits exhausted, show upgrade CTA |
| Research input guard | Research scrapbook | Show remaining research credits, warn when low |
| Credit usage page | Tenant settings | Monthly usage breakdown, overage charges, history |
| Admin credit management | `/admin/tenants/[id]` panel | Set plan, adjust credits, toggle overage, view ledger |
| Overage toggle | Admin tenant settings | Enable/disable auto-billing for overage credits |

### Overage Auto-Billing

For auto-billing overage credits, the system needs:

1. **Stripe integration** (recommended) -- store a `stripe_customer_id` on the tenant
2. When `is_overage: true` ledger entries accumulate, a monthly Inngest cron job:
   - Sums all overage entries for the billing cycle
   - Creates a Stripe invoice line item: `overage_count * overage_rate`
   - Charges the customer's payment method on file
   - Logs the charge in the ledger as a billing event

Alternatively, for a simpler v1:
- Track overage in the ledger with `is_overage: true`
- Surface overage totals on the admin dashboard
- Invoice manually until Stripe integration is built

---

## 5. Verification Plan

1. **Unit tests**: `checkAndDeductCredit` with mocked Supabase -- test allow, deny, overage, race condition
2. **Integration test**: Trigger bulk-enrich with a tenant at limit -- verify 402 response
3. **Integration test**: Trigger enrichment via Inngest with a tenant at limit -- verify skip behavior
4. **Manual test**: Create a tenant with 2 prospect credits, enrich 3 people -- confirm third is blocked
5. **Admin UI test**: Update tenant plan, adjust credits, verify ledger entries
6. **Billing cycle test**: Run reset cron, verify counters zero and ledger has allocation entry

### Key Files to Modify
- `src/app/api/apollo/bulk-enrich/route.ts` -- add credit gate
- `src/inngest/functions/enrich-prospect.ts` -- add credit gate at step 0.5
- `src/app/api/prospects/[prospectId]/research/multi-source/route.ts` -- replace rate limiter with credit check
- `src/app/api/admin/tenants/[id]/route.ts` -- extend PATCH for credit plan fields
- `src/types/database.ts` -- add `TenantCreditPlan` and `CreditLedgerEntry` types

### New Files to Create
- `supabase/migrations/YYYYMMDD_tenant_credits.sql`
- `src/lib/credits/check-credit.ts`
- `src/lib/credits/get-credit-balance.ts`
- `src/inngest/functions/reset-credits.ts`
- `src/app/api/credits/route.ts`
- `src/app/api/admin/tenants/[id]/credits/route.ts`
- `src/app/api/admin/tenants/[id]/credits/adjust/route.ts`
