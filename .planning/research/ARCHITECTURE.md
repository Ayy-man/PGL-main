# Architecture Patterns: Multi-Tenant Wealth Intelligence SaaS

**Domain:** Multi-tenant SaaS with external API integrations and enrichment pipelines
**Researched:** 2026-02-08
**Confidence:** HIGH (verified with official documentation and multiple authoritative sources)

## Executive Summary

A multi-tenant Next.js + Supabase SaaS with external API integrations requires careful architectural boundaries between tenant isolation, API orchestration, data enrichment, and UI state management. The recommended architecture leverages **Next.js 15 App Router** with subdomain-based multi-tenancy, **Supabase RLS** for database-level tenant isolation, **BFF (Backend-for-Frontend) proxy pattern** for external API integration, and **lazy cache-aside pattern** for enrichment pipelines.

**Critical insight:** Multi-tenancy must be designed from day one. Retrofitting tenant isolation into an existing codebase is like rebuilding the foundation of a house while people live in it—the structural changes are so fundamental that you're better off starting fresh.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ React Server │  │    Client    │  │   Shared UI  │         │
│  │  Components  │  │  Components  │  │  Components  │         │
│  │  (RSC)       │  │  (RCC)       │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    MIDDLEWARE LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  middleware.ts (Edge Runtime)                             │  │
│  │  • Tenant identification (subdomain/path)                 │  │
│  │  • Authentication check                                    │  │
│  │  • Context injection (tenant_id → headers)                │  │
│  │  • Request routing                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     API/BFF LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Route       │  │  API Proxy   │  │  Enrichment  │         │
│  │  Handlers    │  │  Layer       │  │  Service     │         │
│  │              │  │              │  │              │         │
│  │  /api/search │  │  • Apollo    │  │  • Lazy load │         │
│  │  /api/profile│  │  • Exa       │  │  • Cache-    │         │
│  │  /api/enrich │  │  • ContactOut│  │    aside     │         │
│  │              │  │  • SEC EDGAR │  │  • TTL mgmt  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     DATA LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Supabase    │  │  Upstash     │  │  External    │         │
│  │  PostgreSQL  │  │  Redis       │  │  APIs        │         │
│  │              │  │              │  │              │         │
│  │  • RLS       │  │  • Cache     │  │  • Apollo    │         │
│  │  • tenant_id │  │  • Rate      │  │  • Exa       │         │
│  │  • Indexes   │  │    limit     │  │  • ContactOut│         │
│  │              │  │  • Sessions  │  │  • SEC EDGAR │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. **Client Layer Components**

| Component Type | Responsibility | When to Use | Communicates With |
|---------------|----------------|-------------|-------------------|
| **React Server Components (RSC)** | Data fetching, tenant context access, initial rendering | Default for all components unless interactivity needed | Route Handlers, Supabase (direct), External APIs (via BFF) |
| **Client Components (RCC)** | Interactivity (onClick, useState, forms), browser APIs, real-time updates | Search filters, modals, drawers, forms | Route Handlers (via fetch), State stores (Zustand) |
| **Shared UI Components** | Reusable presentational components | Buttons, cards, typography, layouts | Props from parent (RSC or RCC) |

**Key Pattern:** "Container/Presenter" where RSC fetches data and passes to RCC presenter components for interaction.

**Example Structure:**
```typescript
// app/[tenant]/search/page.tsx (RSC - Container)
async function SearchPage({ params }) {
  const tenant = await getTenantFromParams(params)
  const initialResults = await searchProfiles({ tenant_id: tenant.id })

  return <SearchResults initialData={initialResults} tenantId={tenant.id} />
}

// components/SearchResults.tsx (RCC - Presenter)
'use client'
export function SearchResults({ initialData, tenantId }) {
  const [results, setResults] = useState(initialData)
  const [filters, setFilters] = useState({})

  // Handle client-side filtering, sorting, pagination
  return <div>...</div>
}
```

**Source:** [Next.js Server Components Documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components)

---

### 2. **Middleware Layer**

| Component | Responsibility | Runs On | Communicates With |
|-----------|---------------|---------|-------------------|
| `middleware.ts` | Tenant identification, auth check, context injection, routing | Edge Runtime | Supabase Auth, Route Handlers |

**Multi-Tenant Middleware Pattern:**

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // 1. Tenant identification (subdomain-based)
  const hostname = req.headers.get('host') || ''
  const tenant = extractTenant(hostname) // e.g., "acmecorp" from acmecorp.app.com

  // 2. Authentication check
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && !isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 3. Context injection - pass tenant_id to downstream components
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-tenant-id', tenant.id)
  requestHeaders.set('x-user-id', session?.user?.id || '')

  // 4. Routing - rewrite subdomain to path-based for internal routing
  const url = req.nextUrl.clone()
  url.pathname = `/${tenant.slug}${url.pathname}`

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders }
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Critical Security Notes:**
- Middleware runs at the Edge (not Node.js runtime as of Next.js 15)
- Cannot access full Node.js APIs (no fs, database drivers)
- Use for lightweight auth checks, routing, header injection only
- Heavy computation belongs in Route Handlers

**Source:** [Next.js Middleware Multi-Tenant Patterns](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0), [Vercel Platforms Starter Kit](https://github.com/vercel/platforms)

---

### 3. **API/BFF Layer**

#### 3.1 Route Handlers

| Route Handler | Responsibility | Method | Returns |
|--------------|----------------|--------|---------|
| `/api/search` | Search profiles across tenants (RLS-filtered) | POST | Profile[] |
| `/api/profile/[id]` | Get profile details, trigger enrichment if stale | GET | Profile + EnrichmentData |
| `/api/enrich/[id]` | Manual enrichment trigger | POST | EnrichmentJob |
| `/api/export` | Export search results | POST | CSV/PDF download |

**BFF (Backend-for-Frontend) Pattern:**

Route Handlers act as a proxy layer between the client and external services, providing:
- **Authentication/Authorization**: Verify tenant access before proxying
- **Rate limiting**: Protect external APIs from abuse
- **Data transformation**: Convert external API responses to internal schema
- **Error handling**: Normalize error responses
- **Caching**: Reduce external API calls

```typescript
// app/api/profile/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Extract tenant context from middleware-injected headers
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const userId = headersList.get('x-user-id')

  // 2. Verify authentication
  const supabase = createRouteHandlerClient({ headers: headersList })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Fetch profile (RLS automatically filters by tenant)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 4. Check if enrichment data is stale (lazy enrichment trigger)
  const enrichmentData = await getEnrichmentData(profile.id, tenantId)

  if (isStale(enrichmentData)) {
    // Fire-and-forget enrichment (use waitUntil for non-blocking)
    triggerEnrichmentJob(profile.id, tenantId).catch(console.error)
  }

  return NextResponse.json({ profile, enrichment: enrichmentData })
}
```

**Source:** [Next.js BFF Pattern Documentation](https://nextjs.org/docs/app/guides/backend-for-frontend)

---

#### 3.2 API Proxy Layer

**Purpose:** Centralize external API calls with rate limiting, caching, and error handling.

```typescript
// lib/api-proxy/apollo.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
  analytics: true,
})

export async function queryApollo(params: ApolloQueryParams, tenantId: string) {
  // 1. Rate limiting per tenant
  const { success, remaining } = await ratelimit.limit(`apollo:${tenantId}`)

  if (!success) {
    throw new Error('Apollo API rate limit exceeded')
  }

  // 2. Check cache first (cache-aside pattern)
  const cacheKey = `apollo:${tenantId}:${JSON.stringify(params)}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached as string)
  }

  // 3. Call external API
  const response = await fetch('https://api.apollo.io/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Apollo API error: ${response.statusText}`)
  }

  const data = await response.json()

  // 4. Cache result with TTL
  await redis.set(cacheKey, JSON.stringify(data), { ex: 3600 }) // 1 hour TTL

  return data
}
```

**Rate Limiting Strategies:**

| Strategy | Algorithm | Use Case | Example |
|----------|-----------|----------|---------|
| **Fixed Window** | Allow N requests per fixed time window | Simple quotas | 1000 requests/day |
| **Sliding Window** | Allow N requests per rolling time window | Smooth traffic | 100 requests/hour |
| **Token Bucket** | Refill tokens at fixed rate, consume on request | Handle bursts | 10 tokens/sec, bucket size 100 |

**Recommendation:** Use **Sliding Window** for Apollo, Exa, ContactOut (paid APIs with strict limits). Use **Token Bucket** for SEC EDGAR (public API, handle bursts).

**Source:** [Upstash Redis Rate Limiting](https://upstash.com/blog/nextjs-ratelimiting), [Next.js API Proxy Patterns](https://github.com/vercel/next.js/discussions/12134)

---

#### 3.3 Enrichment Service

**Lazy Enrichment Pattern:** Enrich profiles on-demand when viewed, not during search.

```typescript
// lib/enrichment/service.ts
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

interface EnrichmentData {
  profile_id: string
  apollo_data?: ApolloData
  exa_data?: ExaData
  contactout_data?: ContactOutData
  edgar_data?: EdgarData
  enriched_at: string
  expires_at: string
}

export async function getEnrichmentData(
  profileId: string,
  tenantId: string
): Promise<EnrichmentData | null> {
  // Cache-aside pattern: check cache first
  const cacheKey = `enrichment:${tenantId}:${profileId}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    const data = JSON.parse(cached as string) as EnrichmentData

    // Check if data is still fresh
    if (new Date(data.expires_at) > new Date()) {
      return data
    }
  }

  // Cache miss or stale: fetch from database
  const { data, error } = await supabase
    .from('enrichment_data')
    .select('*')
    .eq('profile_id', profileId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    return null
  }

  // Update cache with TTL
  const TTL = 24 * 60 * 60 // 24 hours
  await redis.set(cacheKey, JSON.stringify(data), { ex: TTL })

  return data
}

export function isStale(enrichmentData: EnrichmentData | null): boolean {
  if (!enrichmentData) return true

  const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  const enrichedAt = new Date(enrichmentData.enriched_at)
  const now = new Date()

  return now.getTime() - enrichedAt.getTime() > STALE_THRESHOLD
}

export async function triggerEnrichmentJob(
  profileId: string,
  tenantId: string
): Promise<void> {
  // Fire-and-forget: queue enrichment job
  // On Vercel, use external queue (Inngest, Trigger.dev, or AWS SQS)
  // For MVP, use simple fetch with long timeout

  const response = await fetch('/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, tenant_id: tenantId }),
  })

  if (!response.ok) {
    console.error('Enrichment job failed:', response.statusText)
  }
}
```

**Caching Strategy:** Cache-Aside (Lazy Loading)

**How it works:**
1. Check Redis cache on profile view
2. If cache hit and fresh → return cached data
3. If cache miss or stale → fetch from PostgreSQL
4. Update cache with TTL (24 hours)
5. If enrichment data is > 7 days old → trigger background re-enrichment

**Source:** [Cache-Aside Pattern](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html), [Lazy Loading Strategies](https://www.enjoyalgorithms.com/blog/cache-aside-caching-strategy/)

---

### 4. **Data Layer**

#### 4.1 Supabase PostgreSQL with RLS

**Multi-Tenant RLS Pattern:**

```sql
-- profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  company TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index critical columns for RLS performance
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their tenant's data
CREATE POLICY "Users access only their tenant's profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM user_tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- RLS Policy: Users can only insert profiles for their tenant
CREATE POLICY "Users create profiles for their tenant"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id
    FROM user_tenants
    WHERE user_id = (SELECT auth.uid())
  )
);

-- RLS Policy: Users can only update their tenant's profiles
CREATE POLICY "Users update only their tenant's profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM user_tenants
    WHERE user_id = (SELECT auth.uid())
  )
);
```

**Critical RLS Performance Optimizations:**

1. **Index all columns used in policies** (tenant_id, user_id)
   - Impact: ~99.94% performance improvement

2. **Wrap functions in SELECT statements**
   ```sql
   -- Bad (evaluated per row)
   auth.uid() = user_id

   -- Good (cached per query)
   (SELECT auth.uid()) = user_id
   ```
   - Impact: ~95% performance improvement

3. **Always add explicit filters in client queries**
   ```typescript
   // Even though RLS enforces this, explicit filters help query planner
   supabase
     .from('profiles')
     .select('*')
     .eq('tenant_id', tenantId) // Explicit filter
   ```
   - Impact: ~95% performance improvement

4. **Avoid complex joins in policies**
   - Use security-definer functions for complex authorization logic
   - Fetch authorization data into sets rather than joining tables

**Source:** [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security), [Multi-Tenant RLS Patterns](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

---

#### 4.2 Upstash Redis

**Use Cases:**

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| **API Response Cache** | `api:{service}:{tenant_id}:{params_hash}` | 1-24 hours |
| **Enrichment Cache** | `enrichment:{tenant_id}:{profile_id}` | 24 hours |
| **Rate Limiting** | `ratelimit:{service}:{tenant_id}` | Sliding window |
| **Session Data** | `session:{session_id}` | 30 days |

**Example Redis Cache Structure:**
```typescript
// Cache key patterns
const CACHE_KEYS = {
  apollo: (tenantId: string, params: any) =>
    `apollo:${tenantId}:${hashParams(params)}`,

  enrichment: (tenantId: string, profileId: string) =>
    `enrichment:${tenantId}:${profileId}`,

  rateLimit: (service: string, tenantId: string) =>
    `ratelimit:${service}:${tenantId}`,
}

// Set with TTL
await redis.set(CACHE_KEYS.apollo(tenantId, params), data, { ex: 3600 })

// Get
const data = await redis.get(CACHE_KEYS.apollo(tenantId, params))
```

---

#### 4.3 External APIs

| API | Purpose | Rate Limit | Caching Strategy | Enrichment Priority |
|-----|---------|-----------|------------------|---------------------|
| **Apollo** | Contact discovery, company data | 100/hour/tenant | 1 hour TTL | High (on profile view) |
| **Exa** | Web search for online presence | 1000/day/tenant | 24 hour TTL | Medium (on profile view) |
| **ContactOut** | Email/phone enrichment | 50/hour/tenant | 7 day TTL | High (on profile view) |
| **SEC EDGAR** | Financial filings (public companies) | No strict limit | 24 hour TTL | Low (on-demand) |

**Orchestration Pattern:**

```typescript
// lib/enrichment/orchestrator.ts
export async function enrichProfile(profileId: string, tenantId: string) {
  // Parallel enrichment from multiple sources
  const [apolloData, exaData, contactoutData, edgarData] = await Promise.allSettled([
    queryApollo({ person_id: profileId }, tenantId),
    queryExa({ person_id: profileId }, tenantId),
    queryContactOut({ person_id: profileId }, tenantId),
    queryEdgar({ person_id: profileId }, tenantId),
  ])

  // Handle partial failures gracefully
  const enrichmentData = {
    profile_id: profileId,
    apollo_data: apolloData.status === 'fulfilled' ? apolloData.value : null,
    exa_data: exaData.status === 'fulfilled' ? exaData.value : null,
    contactout_data: contactoutData.status === 'fulfilled' ? contactoutData.value : null,
    edgar_data: edgarData.status === 'fulfilled' ? edgarData.value : null,
    enriched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }

  // Save to database
  await supabase
    .from('enrichment_data')
    .upsert(enrichmentData, { onConflict: 'profile_id' })

  // Update cache
  const cacheKey = `enrichment:${tenantId}:${profileId}`
  await redis.set(cacheKey, JSON.stringify(enrichmentData), { ex: 24 * 60 * 60 })

  return enrichmentData
}
```

---

## Data Flow Patterns

### 1. **Search → Cache → Display**

```
User searches → Client Component (RCC) → Route Handler → Supabase (RLS) → Client Component → Display
```

**Step-by-step:**

1. **User enters search criteria** in SearchForm (Client Component)
2. **Client sends POST to `/api/search`** with filters
3. **Route Handler:**
   - Extracts tenant_id from middleware-injected headers
   - Queries Supabase with RLS (automatic tenant filtering)
   - Returns results
4. **Client Component updates state** with results
5. **Display results** in SearchResults component

**Code Example:**

```typescript
// components/SearchForm.tsx (RCC)
'use client'
export function SearchForm() {
  const [results, setResults] = useState([])

  async function handleSearch(filters: SearchFilters) {
    const response = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify(filters),
    })

    const data = await response.json()
    setResults(data.results)
  }

  return <form onSubmit={handleSearch}>...</form>
}

// app/api/search/route.ts (Route Handler)
export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const filters = await request.json()

  // RLS automatically filters by tenant
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId) // Explicit filter for query planner
    .ilike('name', `%${filters.name}%`)
    .limit(50)

  return NextResponse.json({ results: data })
}
```

---

### 2. **Profile View → Lazy Enrichment → Display**

```
User clicks profile → RSC fetches profile → Check enrichment cache → If stale, trigger background job → Display profile with cached enrichment
```

**Step-by-step:**

1. **User clicks profile** in search results
2. **Navigate to `/[tenant]/profile/[id]`** (RSC)
3. **RSC fetches profile from Supabase** (RLS-filtered)
4. **RSC checks enrichment cache** (Redis)
5. **If enrichment is stale (> 7 days):**
   - Trigger background enrichment job (fire-and-forget)
   - Return cached enrichment data
6. **Display profile with enrichment data**
7. **Background job completes:**
   - Updates database and cache
   - Client can refresh to see new data (or use real-time subscription)

**Code Example:**

```typescript
// app/[tenant]/profile/[id]/page.tsx (RSC)
export default async function ProfilePage({ params }: { params: { id: string } }) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  // Fetch profile (RLS-filtered)
  const profile = await getProfile(params.id, tenantId)

  // Check enrichment cache
  const enrichmentData = await getEnrichmentData(params.id, tenantId)

  // If stale, trigger background job (non-blocking)
  if (isStale(enrichmentData)) {
    triggerEnrichmentJob(params.id, tenantId).catch(console.error)
  }

  // Display with cached data
  return (
    <ProfileDrawer
      profile={profile}
      enrichment={enrichmentData}
    />
  )
}
```

---

### 3. **Background Enrichment Job (Vercel Limitations)**

**Problem:** Vercel serverless functions have strict time limits (10s Hobby, 60s Pro, 900s Enterprise).

**Workarounds:**

| Approach | Complexity | Cost | Use Case |
|----------|-----------|------|----------|
| **waitUntil (Edge Middleware)** | Low | Free | Non-critical tasks (logging, analytics) |
| **Vercel Cron Jobs** | Low | Free | Scheduled enrichment (nightly batch) |
| **External Queue (Inngest, Trigger.dev)** | Medium | Paid | Reliable background jobs with retries |
| **AWS SQS + Lambda** | High | Paid | Full control over job processing |

**Recommendation for MVP:** Use **Vercel Cron Jobs** for nightly batch enrichment + **waitUntil** for fire-and-forget single profile enrichment.

**Post-MVP:** Migrate to **Inngest** for reliable job queue with retries.

**Example with waitUntil:**

```typescript
// app/api/profile/[id]/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const profile = await getProfile(params.id)
  const enrichmentData = await getEnrichmentData(params.id)

  // If stale, enrich in background (non-blocking)
  if (isStale(enrichmentData)) {
    // Note: waitUntil only extends function lifetime, doesn't guarantee completion
    // Use for best-effort enrichment only
    const enrichPromise = enrichProfile(params.id, tenantId)

    // On Vercel Edge, use waitUntil to extend lifetime
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      waitUntil(enrichPromise)
    }
  }

  return NextResponse.json({ profile, enrichment: enrichmentData })
}
```

**Critical Limitations:**
- `waitUntil` does NOT guarantee completion (no retries)
- Function timeout still applies (10s-900s)
- Not suitable for critical business logic
- Use for analytics, logging, non-essential tasks only

**Source:** [Vercel Background Jobs Discussion](https://github.com/vercel/next.js/discussions/33989), [waitUntil Explained](https://www.inngest.com/blog/vercel-cloudflare-wait-until)

---

## Component Architecture for Complex UIs

### 1. **Persona Builder**

**Pattern:** Multi-step form with client-side state management.

```
PersonaBuilderPage (RSC) → PersonaBuilder (RCC) → PersonaStepForm (RCC) → FormFields (Shared UI)
```

**State Management:** Zustand (client-side state store)

```typescript
// stores/persona-builder.ts
import { create } from 'zustand'

interface PersonaState {
  step: number
  formData: PersonaFormData
  setStep: (step: number) => void
  updateFormData: (data: Partial<PersonaFormData>) => void
  reset: () => void
}

export const usePersonaBuilder = create<PersonaState>((set) => ({
  step: 1,
  formData: {},
  setStep: (step) => set({ step }),
  updateFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data }
  })),
  reset: () => set({ step: 1, formData: {} }),
}))

// components/PersonaBuilder.tsx (RCC)
'use client'
export function PersonaBuilder() {
  const { step, formData, setStep, updateFormData } = usePersonaBuilder()

  async function handleSubmit() {
    const response = await fetch('/api/persona', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
    // Handle response
  }

  return (
    <div>
      {step === 1 && <PersonaDetailsStep data={formData} onNext={updateFormData} />}
      {step === 2 && <PersonaCriteriaStep data={formData} onNext={updateFormData} />}
      {step === 3 && <PersonaReviewStep data={formData} onSubmit={handleSubmit} />}
    </div>
  )
}
```

---

### 2. **Search Results + Filters**

**Pattern:** URL-based state persistence for shareable filters.

```
SearchPage (RSC) → SearchResults (RCC) → SearchFilters (RCC) + ResultsGrid (RCC)
```

**State Management:** URL Query Parameters (searchParams)

```typescript
// components/SearchResults.tsx (RCC)
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchResults({ initialData }: { initialData: Profile[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read filters from URL
  const filters = {
    name: searchParams.get('name') || '',
    company: searchParams.get('company') || '',
    location: searchParams.get('location') || '',
  }

  function updateFilters(newFilters: Partial<typeof filters>) {
    const params = new URLSearchParams(searchParams)
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`?${params.toString()}`)
  }

  return (
    <div>
      <SearchFilters filters={filters} onChange={updateFilters} />
      <ResultsGrid results={initialData} />
    </div>
  )
}
```

**Benefits:**
- Shareable URLs (copy/paste filter state)
- Browser back/forward navigation works
- SEO-friendly (if using SSR)
- No external state library needed for filters

**Source:** [Next.js URL State Management](https://medium.com/@roman_j/mastering-state-in-next-js-app-router-with-url-query-parameters-a-practical-guide-03939921d09c)

---

### 3. **Profile Drawer**

**Pattern:** Modal/Drawer with responsive behavior (drawer on mobile, modal on desktop).

```
SearchPage (RSC) → SearchResults (RCC) → ProfileDrawer (RCC) → ProfileDetails (Shared UI)
```

**Implementation:**

```typescript
// components/ProfileDrawer.tsx (RCC)
'use client'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

export function ProfileDrawer({
  profile,
  enrichment,
  open,
  onClose
}: ProfileDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const content = <ProfileDetails profile={profile} enrichment={enrichment} />

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        {content}
      </DrawerContent>
    </Drawer>
  )
}
```

**Source:** [Drawer vs Modal Patterns](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da)

---

## State Management Patterns

### When to Use What

| State Type | Tool | Use Case | Example |
|-----------|------|----------|---------|
| **Server State** | React Server Components | Initial data fetching, tenant context | Profile data, search results |
| **URL State** | searchParams | Shareable filters, pagination | Search filters, sort order |
| **Component State** | useState | Local UI state | Form inputs, toggle states |
| **Client-Side Global State** | Zustand | Cross-component state | Multi-step forms, shopping cart |
| **Cached Server State** | React Query / SWR | Real-time data, polling | Live updates, notifications |

**Critical Rule:** **Never use Zustand or global state in React Server Components.** RSCs cannot use hooks or read from client-side stores. This violates Next.js architecture.

**Recommended Pattern:**

```typescript
// ✅ Good: RSC fetches data, passes to RCC
// app/[tenant]/search/page.tsx (RSC)
async function SearchPage() {
  const initialResults = await fetchResults()
  return <SearchResults initialData={initialResults} />
}

// components/SearchResults.tsx (RCC)
'use client'
export function SearchResults({ initialData }) {
  const [results, setResults] = useState(initialData)
  // Use Zustand, useState, etc. freely here
}

// ❌ Bad: RSC tries to use Zustand
// app/[tenant]/search/page.tsx (RSC)
async function SearchPage() {
  const { results } = useSearchStore() // ERROR: Can't use hooks in RSC
  return <SearchResults results={results} />
}
```

**Source:** [Zustand with Next.js App Router](https://www.dimasroger.com/blog/how-to-use-zustand-with-next-js-15), [State Management Best Practices](https://www.pronextjs.dev/tutorials/state-management)

---

## Build Order & Dependencies

### Phase 1: Foundation (Week 1-2)
**Goal:** Multi-tenant infrastructure and authentication

**Components to build:**
1. Database schema with RLS policies
2. Middleware for tenant identification
3. Authentication (Supabase Auth)
4. Basic tenant management (create tenant, invite users)

**Dependencies:** None (foundational)

**Validation:** User can sign up, create tenant, invite team members

---

### Phase 2: Core Search (Week 3-4)
**Goal:** Basic search functionality without enrichment

**Components to build:**
1. Profiles table and RLS policies
2. Search Route Handler (`/api/search`)
3. SearchPage (RSC) + SearchResults (RCC)
4. SearchFilters with URL state management
5. ResultsGrid display

**Dependencies:** Phase 1 (auth + tenancy)

**Validation:** User can search profiles by name, company, location

---

### Phase 3: API Proxy Layer (Week 5-6)
**Goal:** External API integration with rate limiting

**Components to build:**
1. API proxy modules (Apollo, Exa, ContactOut, SEC EDGAR)
2. Rate limiting with Upstash Redis
3. Cache-aside pattern implementation
4. Error handling and logging

**Dependencies:** Phase 1 (tenancy for rate limiting per tenant)

**Validation:** Can call external APIs with rate limiting, caching works

---

### Phase 4: Lazy Enrichment (Week 7-8)
**Goal:** Enrich profiles on view with caching

**Components to build:**
1. Enrichment data table
2. Enrichment service with cache-aside pattern
3. Profile Route Handler (`/api/profile/[id]`)
4. ProfilePage (RSC) with enrichment trigger
5. ProfileDrawer (RCC) with enrichment display

**Dependencies:** Phase 2 (profiles), Phase 3 (API proxies)

**Validation:** Viewing profile triggers enrichment if stale, data caches correctly

---

### Phase 5: Background Jobs (Week 9-10)
**Goal:** Reliable enrichment with job queue

**Components to build:**
1. Vercel Cron Job for nightly batch enrichment
2. Integration with Inngest (or alternative queue)
3. Job retry logic
4. Job status tracking

**Dependencies:** Phase 4 (enrichment service)

**Validation:** Stale profiles enrich overnight, failed jobs retry automatically

---

### Phase 6: Complex UI (Week 11-12)
**Goal:** Persona builder, advanced filters, export

**Components to build:**
1. Persona builder (multi-step form with Zustand)
2. Advanced search filters (multi-select, date ranges)
3. Export functionality (CSV, PDF)
4. Dashboard with analytics

**Dependencies:** Phase 2 (search), Phase 4 (enrichment)

**Validation:** User can build persona, export results, view analytics

---

## Scalability Considerations

| Concern | At 100 Profiles | At 10K Profiles | At 1M Profiles |
|---------|----------------|-----------------|----------------|
| **Database Queries** | Simple RLS, no optimization | Add indexes on search columns | Consider full-text search (pg_search) |
| **Enrichment Cache** | In-memory cache OK | Redis required | Redis with sharding |
| **API Rate Limiting** | Per-tenant limits sufficient | Need burst handling (token bucket) | Need API key rotation, multiple accounts |
| **Background Jobs** | waitUntil acceptable | Vercel Cron Jobs | Dedicated job queue (Inngest, SQS) |
| **Search Performance** | Full table scan OK | B-tree indexes required | Consider Elasticsearch or Typesense |

**Critical Scaling Thresholds:**
- **1,000 profiles**: Add database indexes
- **10,000 profiles**: Implement full-text search
- **100,000 profiles**: Consider dedicated search service (Algolia, Typesense)
- **1M profiles**: Consider database partitioning by tenant_id

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mixing RSC and Client State
**What:** Using Zustand or other client-side state in React Server Components

**Why bad:** RSCs cannot use hooks; this causes runtime errors

**Instead:** Fetch data in RSC, pass to RCC via props

---

### Anti-Pattern 2: Synchronous Enrichment
**What:** Enriching profiles during search (blocking user experience)

**Why bad:** External API calls take 2-5s each; search becomes unusably slow

**Instead:** Use lazy enrichment pattern—enrich on profile view, cache aggressively

---

### Anti-Pattern 3: Service Role Key in Client
**What:** Using Supabase service_role key in browser code to bypass RLS

**Why bad:** Service role key has full database access; exposing it compromises all tenant data

**Instead:** Use anon key in client, rely on RLS for authorization

---

### Anti-Pattern 4: Ignoring RLS Performance
**What:** Writing complex RLS policies without indexes

**Why bad:** Every query scans full table; queries take seconds at scale

**Instead:** Index all columns used in RLS policies, wrap functions in SELECT statements

---

### Anti-Pattern 5: Using waitUntil for Critical Jobs
**What:** Relying on waitUntil for important enrichment jobs

**Why bad:** No retries, no guarantees; jobs silently fail

**Instead:** Use external job queue (Inngest, Trigger.dev) for critical tasks

---

### Anti-Pattern 6: Not Using URL State for Filters
**What:** Storing search filters in Zustand or component state

**Why bad:** Filters reset on page refresh, can't share filtered results

**Instead:** Store filters in URL query parameters (searchParams)

---

### Anti-Pattern 7: Fetching Data in Client Components
**What:** Calling Route Handlers from Client Components for initial data

**Why bad:** Adds unnecessary round-trip, delays rendering

**Instead:** Fetch data in RSC, pass to RCC as props

---

## Sources

### Official Documentation (HIGH Confidence)
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Next.js Backend-for-Frontend Pattern](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vercel Platforms Starter Kit](https://github.com/vercel/platforms)

### Verified Patterns (MEDIUM Confidence)
- [Multi-Tenant Architecture in Next.js](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0)
- [Supabase RLS Multi-Tenant Patterns](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Upstash Redis Rate Limiting](https://upstash.com/blog/nextjs-ratelimiting)
- [Vercel Background Jobs Discussion](https://github.com/vercel/next.js/discussions/33989)
- [Cache-Aside Pattern (AWS)](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)

### Community Best Practices (MEDIUM Confidence)
- [Next.js State Management with Zustand](https://www.dimasroger.com/blog/how-to-use-zustand-with-next-js-15)
- [URL State Management in Next.js](https://medium.com/@roman_j/mastering-state-in-next-js-app-router-with-url-query-parameters-a-practical-guide-03939921d09c)
- [Drawer vs Modal Patterns](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da)
- [Vercel waitUntil Explained](https://www.inngest.com/blog/vercel-cloudflare-wait-until)

---

## Quality Gate Validation

- [x] **Components clearly defined with boundaries** (Client Layer, Middleware, API/BFF, Data Layer)
- [x] **Data flow direction explicit** (Search → Cache → Display, Profile View → Lazy Enrichment)
- [x] **Build order implications noted** (6 phases with dependencies)
- [x] **Multi-tenant patterns documented** (Subdomain routing, RLS, context injection)
- [x] **API proxy architecture defined** (BFF pattern, rate limiting, caching)
- [x] **Lazy enrichment strategy explained** (Cache-aside pattern, TTL management)
- [x] **State management patterns clarified** (RSC vs RCC, URL state, Zustand)
- [x] **Vercel limitations addressed** (Background job workarounds, waitUntil caveats)
- [x] **Performance optimizations included** (RLS indexes, cache strategies)
- [x] **Anti-patterns documented** (What to avoid and why)

---

## Open Questions for Phase-Specific Research

1. **Phase 3 (API Proxy)**: Which external APIs provide webhook support for real-time updates vs. polling?
2. **Phase 5 (Background Jobs)**: Should we use Inngest, Trigger.dev, or build custom SQS integration?
3. **Phase 6 (Complex UI)**: Which component library (shadcn/ui, Radix, Mantine) best supports dark luxury aesthetic?
4. **Scaling**: At what profile count should we migrate from PostgreSQL full-text search to Typesense/Algolia?

These questions require deeper research during their respective phases.
