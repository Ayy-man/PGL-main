# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
PGL-main/
├── src/
│   ├── app/                          # Next.js App Router (pages, layouts, API routes)
│   │   ├── (auth)/                   # Auth group route (login, signup)
│   │   ├── [orgId]/                  # Dynamic tenant segment (main app)
│   │   │   ├── dashboard/            # Dashboard feature (activity, analytics)
│   │   │   ├── lists/                # List management feature
│   │   │   ├── personas/             # Persona management feature
│   │   │   ├── prospects/            # Prospect detail page
│   │   │   ├── search/               # Search UI feature
│   │   │   ├── team/                 # Team management feature
│   │   │   ├── exports/              # CSV export feature
│   │   │   ├── layout.tsx            # Tenant layout (sidebar, topbar, auth check)
│   │   │   ├── page.tsx              # Dashboard home page (org overview)
│   │   │   └── error.tsx             # Tenant-level error boundary
│   │   ├── admin/                    # Super admin panel (tenant mgmt, users)
│   │   ├── api/                      # Backend API routes
│   │   │   ├── auth/                 # OAuth callback
│   │   │   ├── prospects/            # Prospect CRUD + enrichment
│   │   │   │   ├── upsert/           # POST: create/update prospect
│   │   │   │   ├── add-to-list/      # POST: add to list
│   │   │   │   ├── [prospectId]/     # Prospect detail operations
│   │   │   │   │   ├── research/     # Multi-source research
│   │   │   │   │   ├── market-data/  # Market intelligence fetch
│   │   │   │   │   ├── activity/     # Activity log CRUD
│   │   │   │   │   ├── signals/      # Signal mark-seen
│   │   │   │   │   ├── tags/         # Tag management
│   │   │   │   │   ├── notes/        # Notes CRUD
│   │   │   │   │   ├── profile/      # Profile read
│   │   │   │   │   ├── photo/        # Photo fetch
│   │   │   │   │   └── enrich/       # Manual enrich trigger
│   │   │   ├── apollo/               # Apollo API operations
│   │   │   │   └── bulk-enrich/      # Apollo bulk enrich
│   │   │   ├── search/               # Apollo search
│   │   │   ├── inngest/              # Inngest event listener
│   │   │   ├── activity/             # Activity log fetch
│   │   │   ├── analytics/            # Analytics aggregation
│   │   │   ├── export/               # CSV export
│   │   │   ├── onboarding/           # Onboarding flow
│   │   │   ├── tenant-branding/      # Tenant config fetch
│   │   │   └── upload/               # File upload
│   │   ├── onboarding/               # Onboarding pages
│   │   ├── layout.tsx                # Root layout (fonts, metadata, NuqsAdapter)
│   │   ├── page.tsx                  # Root redirect to login
│   │   └── globals.css               # Tailwind + custom CSS
│   ├── components/                   # React components
│   │   ├── layout/                   # Layout components (sidebar, topbar, mobile nav)
│   │   ├── prospect/                 # Prospect-related components
│   │   ├── search/                   # Search UI components
│   │   ├── research/                 # Research display components
│   │   ├── dashboard/                # Dashboard components
│   │   ├── activity/                 # Activity log components
│   │   ├── charts/                   # Recharts components
│   │   ├── admin/                    # Admin panel components
│   │   └── ui/                       # Radix UI + base UI primitives
│   │       ├── data-table/           # TanStack React Table wrapper
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       └── ... (other Radix UI components)
│   ├── lib/                          # Reusable services, helpers, utilities
│   │   ├── apollo/                   # Apollo API client + search logic
│   │   │   ├── client.ts             # searchApollo(), bulkEnrich(), rate limit + cache
│   │   │   ├── types.ts              # ApolloSearchParams, ApolloPerson, etc.
│   │   │   └── __tests__/            # Apollo client tests
│   │   ├── search/                   # Multi-source research orchestration
│   │   │   ├── execute-research.ts   # Main orchestrator (channels + classifier)
│   │   │   ├── intent-classifier.ts  # Intent classification
│   │   │   ├── merge-results.ts      # Deduplication + ranking
│   │   │   ├── telemetry.ts          # Per-channel metrics
│   │   │   ├── channel-cache.ts      # Channel-level caching
│   │   │   ├── constants.ts          # Config (max results, timeouts)
│   │   │   ├── channels/             # Individual research sources
│   │   │   │   ├── index.ts          # Channel registry + factory
│   │   │   │   ├── register-all.ts   # Side-effect: registers channels
│   │   │   │   ├── exa-channel.ts    # Exa search implementation
│   │   │   │   └── edgar-efts-channel.ts # SEC EDGAR ETF lookup
│   │   │   └── __tests__/
│   │   ├── enrichment/               # Enrichment pipeline services
│   │   │   ├── contactout.ts         # ContactOut API client
│   │   │   ├── exa.ts                # Exa search wrapper
│   │   │   ├── edgar.ts              # SEC EDGAR parsing
│   │   │   ├── claude.ts             # Claude AI synthesis
│   │   │   ├── exa-digest.ts         # Exa result summarization
│   │   │   ├── market-data.ts        # Market data fetch
│   │   │   ├── lookalike.ts          # Lookalike search logic
│   │   │   └── track-api-usage.ts    # API quota tracking
│   │   ├── prospects/                # Prospect database operations
│   │   │   ├── queries.ts            # upsertProspectFromApollo, getProspects, etc.
│   │   │   ├── types.ts              # Prospect interface
│   │   │   └── resolve-fields.ts     # Field resolution (manual override logic)
│   │   ├── personas/                 # Persona management
│   │   │   ├── queries.ts            # getPersonas, CRUD
│   │   │   └── types.ts              # PersonaFilters interface
│   │   ├── lists/                    # List management
│   │   │   ├── queries.ts            # getLists, addProspectToList, etc.
│   │   │   └── types.ts              # List interface
│   │   ├── supabase/                 # Supabase client initialization
│   │   │   ├── server.ts             # Server-side client (createClient)
│   │   │   ├── client.ts             # Client-side browser client
│   │   │   ├── admin.ts              # Admin client (service role key)
│   │   │   └── middleware.ts         # Middleware client (request/response)
│   │   ├── auth/                     # Authentication + authorization
│   │   │   ├── session.ts            # getSession helper
│   │   │   └── rbac.ts               # Role-based access control checks
│   │   ├── cache/                    # Caching layer
│   │   │   ├── redis.ts              # Upstash Redis client instance
│   │   │   └── keys.ts               # getCachedData, setCachedData, SHA256 hashing
│   │   ├── redis/                    # Redis utilities
│   │   │   └── client.ts             # Upstash Redis init
│   │   ├── rate-limit/               # Rate limiting
│   │   │   ├── limiters.ts           # apolloRateLimiter instance
│   │   │   └── middleware.ts         # Middleware-level rate limit
│   │   ├── circuit-breaker/          # Fault tolerance
│   │   │   ├── apollo-breaker.ts     # Apollo circuit breaker (Opossum)
│   │   │   └── index.ts              # Breaker utilities
│   │   ├── circuit-breaker.ts        # Generic circuit breaker wrapper
│   │   ├── ai/                       # AI/LLM integrations
│   │   │   └── (OpenRouter, Anthropic SDK configs)
│   │   ├── research/                 # Research-related utilities
│   │   ├── validations/              # Zod schemas
│   │   │   └── schemas.ts            # Request body validation
│   │   ├── types/                    # Global type definitions
│   │   ├── utils.ts                  # General utilities (clsx, formatters, etc.)
│   │   ├── api-error.ts              # ApiError class + handler
│   │   ├── error-logger.ts           # Error logging
│   │   ├── activity-logger.ts        # User activity audit trail
│   │   ├── avatar.ts                 # Avatar URL builder
│   │   ├── csv-export.ts             # CSV generation
│   │   └── tenant-theme.ts           # Theme CSS variable builder
│   ├── inngest/                      # Inngest async job definitions
│   │   ├── client.ts                 # Inngest client init
│   │   ├── types.ts                  # Event type definitions
│   │   └── functions/
│   │       ├── enrich-prospect.ts    # Main enrichment pipeline
│   │       ├── daily-metrics.ts      # Daily metrics aggregation
│   │       └── __tests__/
│   ├── middleware.ts                 # Next.js middleware (auth, routing, tenant resolution)
│   ├── types.ts                      # Global types
│   └── hooks/                        # Custom React hooks
├── next.config.mjs                   # Next.js configuration
├── tsconfig.json                     # TypeScript config (path alias: @/*)
├── package.json                      # Dependencies, scripts
└── vitest.config.ts                  # Test runner configuration
```

## Directory Purposes

**`src/app`**
- Purpose: Next.js App Router structure; maps URL paths to pages and API routes
- Contains: Page components, layout components, route handlers
- Key files: `middleware.ts` (auth, tenant routing), `layout.tsx` (root setup)

**`src/app/(auth)`**
- Purpose: Grouped route for login/signup (hidden from URL)
- Contains: Login, signup, password reset pages
- Key files: `src/app/(auth)/login/page.tsx`

**`src/app/[orgId]`**
- Purpose: Dynamic tenant segment; all authenticated app features live under this route
- Contains: Tenant-specific layouts, pages, API routes
- Key files: `layout.tsx` (tenant context, sidebar/topbar), `page.tsx` (dashboard home)

**`src/app/api`**
- Purpose: Backend API routes (RESTful endpoints)
- Contains: Request handlers, business logic, external API calls
- Pattern: Each route is a separate handler; no shared route file

**`src/components`**
- Purpose: Reusable React components (both server and client)
- Contains: UI components, feature-specific containers
- Organization: By feature (prospect, search, research) then by layer (cards, forms, tables)

**`src/components/ui`**
- Purpose: Base UI primitives (Radix UI components + wrappers)
- Contains: Button, Dialog, Dropdown, Label, Select, Toast, etc.
- Key files: Styled wrappers around Radix primitives using Tailwind

**`src/lib`**
- Purpose: Service layer; encapsulates business logic and external API clients
- Contains: Database queries, API clients, validators, cache/rate-limit logic
- Organization: By domain (apollo, search, enrichment, prospects, personas, lists, auth)

**`src/lib/apollo`**
- Purpose: Apollo.io API client and search orchestration
- Contains: `searchApollo()` (free search + caching), rate limiting, circuit breaking
- Key functions: `searchApollo()`, `translateFiltersToApolloParams()`, `calculatePagination()`

**`src/lib/search`**
- Purpose: Multi-source research pipeline (unified across Exa, SEC EDGAR, other sources)
- Contains: Channel registry, orchestrator, intent classifier, result merging
- Key function: `executeResearch()` orchestrates all channels in parallel

**`src/lib/enrichment`**
- Purpose: Long-running enrichment tasks (ContactOut, Exa, SEC EDGAR, Claude synthesis)
- Contains: Individual API client wrappers for each enrichment source
- Pattern: Each module exports a function (e.g., `enrichViaContactOut()`)

**`src/lib/supabase`**
- Purpose: Supabase client initialization for different contexts
- Contains: Server client (SSR), browser client, admin client, middleware client
- Key exports: `createClient()` (server), `createBrowserClient()` (client)

**`src/lib/cache`**
- Purpose: Redis-backed caching with standardized key generation
- Contains: `getCachedData()`, `setCachedData()` with SHA256 hashing for large keys
- Pattern: `cacheKey = { tenantId, resource, identifier }` → versioned hash

**`src/lib/rate-limit`**
- Purpose: API quota control and throttling
- Contains: Upstash Ratelimit instances per API (apolloRateLimiter)
- Pattern: `rateLimiter.limit(key)` throws `RateLimitError` on exhaustion

**`src/inngest/functions`**
- Purpose: Long-running async job definitions (Inngest durable functions)
- Contains: `enrich-prospect.ts` (enrichment pipeline), `daily-metrics.ts` (aggregation)
- Pattern: Each function triggered by event or scheduled; retries up to 3x with backoff

**`src/types`**
- Purpose: Global TypeScript type definitions
- Contains: Shared interfaces not tied to specific domains

**`src/middleware.ts`**
- Purpose: Request-level middleware for auth, routing, and tenant resolution
- Responsibilities: Check auth, resolve tenant by slug/UUID, enforce role permissions, inject headers
- Public routes: `/login`, `/signup`, `/auth/callback`

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx` - Root layout (fonts, metadata, NuqsAdapter, Toaster)
- `src/app/[orgId]/layout.tsx` - Tenant layout (theme, sidebar, topbar, RLS check)
- `src/app/page.tsx` - Root redirects to login
- `src/middleware.ts` - Request routing, auth check, tenant resolution

**Configuration:**

- `tsconfig.json` - Path aliases (@/* → src/*)
- `next.config.mjs` - Next.js runtime config
- `package.json` - Dependencies, build/dev scripts
- `vitest.config.ts` - Test configuration

**Core Logic:**

- `src/lib/apollo/client.ts` - Apollo search + caching + rate limiting
- `src/lib/search/execute-research.ts` - Multi-source research orchestrator
- `src/inngest/functions/enrich-prospect.ts` - Enrichment pipeline (ContactOut → Exa → SEC EDGAR → Claude)
- `src/lib/supabase/server.ts` - Server-side database client
- `src/lib/cache/keys.ts` - Cache key generation with SHA256 hashing

**Database/API:**

- `src/lib/prospects/queries.ts` - Prospect CRUD, upsert from Apollo
- `src/lib/personas/queries.ts` - Persona CRUD, retrieval
- `src/lib/lists/queries.ts` - List CRUD, membership management
- `src/app/api/prospects/upsert/route.ts` - Prospect upsert endpoint

**Testing:**

- `src/lib/search/__tests__/execute-research.test.ts` - Research orchestrator tests
- `src/lib/apollo/__tests__/client.test.ts` - Apollo client tests
- `src/inngest/functions/__tests__/enrich-prospect.test.ts` - Enrichment pipeline tests

## Naming Conventions

**Files:**

- `route.ts` - API route handlers (Next.js pattern)
- `page.tsx` - Page components (Next.js pattern)
- `layout.tsx` - Layout components (Next.js pattern)
- `*.test.ts` or `*.spec.ts` - Vitest test files
- `queries.ts` - Database query functions
- `types.ts` - TypeScript interface definitions
- `client.ts` - API client implementations
- `[bracket-name].ts` - Dynamic route segments (Next.js convention)

**Directories:**

- `[orgId]` - Dynamic segment for tenant/organization ID
- `[prospectId]` - Dynamic segment for prospect UUID
- `[sessionId]` - Dynamic segment for research session
- `__tests__` - Vitest test directory (co-located with source)
- `(group)` - Route group (auth) — parentheses hidden from URL

**Functions:**

- `get*()` - Query/fetch functions (e.g., `getPersonas()`)
- `add*()` - Insert/create operations (e.g., `addProspectToList()`)
- `upsert*()` - Insert or update (e.g., `upsertProspectFromApollo()`)
- `translate*()` - Transform/map functions (e.g., `translateFiltersToApolloParams()`)
- `create*()` - Initialization (e.g., `createClient()`)
- `search*()` - Query operations (e.g., `searchApollo()`)
- `execute*()` - Orchestration (e.g., `executeResearch()`)

**Variables:**

- `tenantId` - Tenant UUID
- `orgId` - Organization identifier (UUID or slug from URL)
- `personaId` - Persona UUID
- `prospectId` - Prospect UUID
- `*Filters` - Filter objects (e.g., `PersonaFilters`)
- `*Response` - API response types (e.g., `ApolloSearchResponse`)

**Types:**

- PascalCase for interfaces/types (e.g., `Prospect`, `ApolloPerson`, `PersonaFilters`)
- `*Params` for function parameters (e.g., `ApolloSearchParams`)
- `*Input` for request bodies (e.g., `UpsertProspectInput`)

## Where to Add New Code

**New Feature (e.g., "Leads Analysis"):**

1. **Primary code:** `src/lib/[feature]/` for service logic (queries, API clients)
   - Example: `src/lib/leads-analysis/queries.ts`, `src/lib/leads-analysis/types.ts`
2. **Components:** `src/components/[feature]/` for UI
   - Example: `src/components/leads-analysis/leads-card.tsx`
3. **Pages:** `src/app/[orgId]/[feature]/page.tsx`
   - Example: `src/app/[orgId]/leads-analysis/page.tsx`
4. **API routes:** `src/app/api/[feature]/route.ts`
   - Example: `src/app/api/leads-analysis/route.ts`
5. **Tests:** Co-located `__tests__/` folder
   - Example: `src/lib/leads-analysis/__tests__/queries.test.ts`

**New Component/Module:**

- Implementation: Create folder under `src/components/[feature]/`
- Export from `src/components/[feature]/index.ts` if frequently imported
- Use `"use client"` only at boundaries (hooks, interactivity)
- Prefer server components by default (better performance, no JS sent to client)

**New Utility/Helper:**

- Shared helpers: `src/lib/utils.ts` (for general utilities)
- Domain-specific: Create `src/lib/[domain]/[helper].ts`
- Example: `src/lib/search/constants.ts` for search-specific constants

**New Query Function:**

- Location: `src/lib/[entity]/queries.ts`
- Pattern: Async function, takes filters/ID, returns typed result
- Example:
  ```typescript
  export async function getProspectsInList(listId: string): Promise<Prospect[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .eq("list_id", listId);
    return data || [];
  }
  ```

**New API Route:**

- Location: `src/app/api/[resource]/[action]/route.ts` or `src/app/api/[resource]/route.ts`
- Pattern: `export async function POST(request: Request) { ... }`
- Include error handling: wrap in try/catch, return `handleApiError()` responses
- Example:
  ```typescript
  export async function POST(request: Request) {
    try {
      const body = await request.json();
      // Validation, business logic, database ops
      return Response.json({ success: true, data });
    } catch (error) {
      return handleApiError(error);
    }
  }
  ```

**New Inngest Function:**

- Location: `src/inngest/functions/[function-name].ts`
- Pattern: Define event type in `types.ts`, then handler in functions/
- Auto-registered by `src/app/api/inngest/route.ts`
- Example:
  ```typescript
  import { inngest } from "@/inngest/client";
  export const analyzeLeads = inngest.createFunction(
    { id: "analyze-leads" },
    { event: "app/leads.analyze" },
    async ({ event }) => {
      // Long-running work
    }
  );
  ```

## Special Directories

**`src/app/api`**
- Purpose: Backend API routes
- Generated: No (manually created)
- Committed: Yes
- Pattern: Each route is a separate `route.ts` file

**`src/inngest/functions`**
- Purpose: Async job definitions
- Generated: No (manually created)
- Committed: Yes
- Auto-discovery: Inngest SDK registers functions from this directory

**`.next`**
- Purpose: Next.js build output
- Generated: Yes (during build)
- Committed: No (in .gitignore)

**`node_modules`**
- Purpose: npm/pnpm dependencies
- Generated: Yes (pnpm install)
- Committed: No (in .gitignore)
- Lock file: `pnpm-lock.yaml` (committed)

---

*Structure analysis: 2026-04-05*
