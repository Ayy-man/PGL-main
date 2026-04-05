# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Next.js 14 App Router with Supabase backend, multi-tenant architecture using dynamic segments for organization routing. Supports server-side rendering for auth-protected pages with progressive enrichment pipeline for prospect data.

**Key Characteristics:**
- Multi-tenant isolation via tenant-aware middleware and RLS policies
- Server-rendered layouts with client-rendered UI components (strategic boundary)
- API-driven data layer with Supabase as source of truth
- Asynchronous enrichment pipeline via Inngest for long-running operations
- Hierarchical routing: root → org → resource (lists, personas, prospects, search)
- Rate limiting and circuit breaking for external API dependencies (Apollo, Exa)
- Caching layer (Upstash Redis) for search results and enrichment data

## Layers

**Routing & Layout:**
- Purpose: Handle URL-based navigation, tenant resolution, authentication, and user context passing
- Location: `src/middleware.ts`, `src/app/layout.tsx`, `src/app/[orgId]/layout.tsx`, `src/app/(auth)/*`
- Contains: Next.js route handlers, layout components, redirect logic
- Depends on: Supabase Auth, tenant database queries
- Used by: All pages and API routes

**API Layer (Backend):**
- Purpose: Handle HTTP requests, business logic, and data persistence/retrieval
- Location: `src/app/api/*/route.ts`
- Contains: Route handlers (POST/GET/PUT/DELETE), request validation, response formatting
- Depends on: Supabase client, external API clients (Apollo, Exa, SEC EDGAR, OpenRouter)
- Used by: Client components via fetch, internal services

**Service/Library Layer:**
- Purpose: Encapsulate reusable logic for search, enrichment, authentication, rate limiting, caching
- Location: `src/lib/*/` organized by domain (apollo, search, enrichment, personas, prospects, lists, auth, supabase, cache, rate-limit, circuit-breaker, redis)
- Contains: Query functions, API clients, validators, helpers
- Depends on: External APIs, Supabase, Redis, database models
- Used by: API handlers, components, background jobs

**Component Layer (Frontend):**
- Purpose: Render UI and handle user interactions
- Location: `src/components/` organized by feature (prospect, search, research, dashboard, activity, admin, layout, ui, charts)
- Contains: React components (server-rendered pages + client-side interactive components)
- Depends on: UI primitives from `@radix-ui`, hooks, API layer
- Used by: Pages in `src/app/`

**Background Jobs/Async Processing:**
- Purpose: Long-running operations (enrichment, metrics aggregation, market data fetch)
- Location: `src/inngest/functions/`
- Contains: Inngest function definitions (enrich-prospect.ts, daily-metrics.ts)
- Depends on: Supabase, enrichment services, external APIs
- Used by: API triggers (e.g., POST to `/api/prospects/upsert` queues enrich-prospect job)

**Type & Validation Layer:**
- Purpose: Define TypeScript interfaces and Zod schemas for type safety
- Location: `src/types/`, `src/lib/validations/schemas.ts`, `src/lib/apollo/types.ts`, `src/lib/prospects/types.ts`
- Contains: Interface definitions, Zod validation schemas
- Depends on: Nothing (leaf of dependency tree)
- Used by: All other layers

## Data Flow

**Prospect Search Flow (Apollo):**

1. User submits search on `/[orgId]/search` page
2. Client calls `/api/search` with persona filters
3. `searchApollo()` normalizes filters, checks rate limit (Upstash), queries cache (Redis)
4. Cache miss → calls Apollo API via circuit breaker
5. Apollo returns obfuscated previews (no enrichment data, free tier)
6. Results cached for 24h, returned to client with `_enriched: false` flag
7. User clicks "Enrich Selection" button
8. Client calls `/api/prospects/upsert` with Apollo IDs
9. Prospect records created/upserted in Supabase
10. Enrich event queued to Inngest

**Prospect Enrichment Flow (Inngest):**

1. Inngest `enrich-prospect` function triggered by API route or scheduled
2. Initiates enrichment pipeline in strict sequence:
   - ContactOut (returns fake "Example Person" data in sandbox)
   - Exa search (market intelligence)
   - SEC EDGAR parsing (earnings, insider trades, holdings)
   - Claude AI synthesis (judgment, context, scoring)
3. Each step's output feeds next step
4. Final synthesized data upserted to `prospect_enrichment_data` table
5. `enrichment_status` marked complete or failed
6. Activity log entries created for audit trail

**Multi-Source Research Flow (Prospect Detail Page):**

1. User opens prospect detail page or clicks "Research" tab
2. Client calls `/api/prospects/[prospectId]/research`
3. Server initializes `executeResearch()` with prospect context
4. Exa search fired immediately in parallel with intent classifier
5. Classifier determines research intent (market intelligence, competitive intel, etc.)
6. Based on classification, fans out to additional channels in parallel (Edgar ETFs, etc.)
7. All channels complete via `Promise.allSettled()` (failures don't break pipeline)
8. Results deduplicated and ranked via `mergeAndRank()` heuristic
9. Telemetry recorded for each channel (latency, cache hit, error)
10. Merged results returned with per-channel metadata

**State Management:**

- **Server state:** Supabase database (prospects, lists, personas, activity logs, enrichment data)
- **Session state:** Supabase Auth (JWT in cookies, refreshed via middleware)
- **Cache state:** Upstash Redis (search results, enrichment data, circuit breaker state)
- **Client state:** React hooks (UI filters, form inputs, modal state), Nuqs URL state (pagination, filters persist in URL)
- **Async state:** Inngest durable execution state (retry, idempotency)

## Key Abstractions

**Persona:**
- Purpose: Reusable search filter template (filters + seniority + industries + locations)
- Examples: `src/lib/personas/types.ts`, `src/lib/personas/queries.ts`
- Pattern: Query function (`getPersonas()`) returns list; used to populate search UI dropdowns

**Prospect:**
- Purpose: Core business entity representing a target contact
- Examples: `src/lib/prospects/types.ts` (Prospect interface), `src/lib/prospects/queries.ts` (upsertProspectFromApollo)
- Pattern: Database-centric; enrichment status drives UI flow (loading → complete → error)

**List:**
- Purpose: Named collection of prospects for organization/segmentation
- Examples: `src/lib/lists/queries.ts`
- Pattern: Prospect membership via `prospect_list_members` join table; soft-delete via `deleted_at`

**Search Channel:**
- Purpose: Pluggable research data source (Exa, SEC EDGAR, etc.)
- Examples: `src/lib/search/channels/exa-channel.ts`, `src/lib/search/channels/edgar-efts-channel.ts`
- Pattern: Registered in `register-all.ts`; implements `ChannelOutput` interface; called via `getChannel(id)` factory

**Rate Limiter:**
- Purpose: Control API quota consumption (per tenant, per API)
- Examples: `src/lib/rate-limit/limiters.ts`, `apolloRateLimiter.limit(key)`
- Pattern: Upstash Redis Ratelimit client; throws `RateLimitError` on exhaustion; catches in API handlers

**Circuit Breaker:**
- Purpose: Prevent cascading failures to external APIs during outages
- Examples: `src/lib/circuit-breaker/apollo-breaker.ts`
- Pattern: Opossum library; wraps API calls; returns cached state or throws when open

**Cache Key:**
- Purpose: Standardized cache key generation with hashing for large identifier objects
- Examples: `src/lib/cache/keys.ts` (getCachedData, setCachedData)
- Pattern: Hash complex filters to short cache keys; versioned (e.g., `apollo:search:v3`)

## Entry Points

**Web (Server-Rendered Pages):**
- Location: `src/app/layout.tsx` (root) → `src/app/[orgId]/layout.tsx` (tenant) → feature pages
- Triggers: Browser navigation, direct URL
- Responsibilities: Verify auth, load tenant data, resolve user role, render layout with sidebar/topbar

**Auth:**
- Location: `src/app/(auth)/login`, `src/app/(auth)/signup`, `src/app/api/auth/callback`
- Triggers: User login/signup action, OAuth callback from Supabase
- Responsibilities: Handle Supabase Auth flow, redirect to dashboard or onboarding

**Onboarding:**
- Location: `src/app/onboarding/*`
- Triggers: New user with `onboarding_completed: false`
- Responsibilities: Confirm tenant, set password, initialize user in tenant

**Admin Panel:**
- Location: `src/app/admin/*`
- Triggers: Super admin accessing `/admin`
- Responsibilities: Tenant management, user administration, system monitoring

**API Search:**
- Location: `src/app/api/search/route.ts`
- Triggers: Client fetch from search page
- Responsibilities: Validate filters, call Apollo, return paginated results

**API Bulk Enrich:**
- Location: `src/app/api/apollo/bulk-enrich/route.ts`
- Triggers: User clicks "Enrich Selection" button
- Responsibilities: Call Apollo bulk enrich endpoint, queue Inngest jobs, return enriched data

**Prospect Upsert:**
- Location: `src/app/api/prospects/upsert/route.ts`
- Triggers: Search results → "Add to List" or enrichment pipeline
- Responsibilities: Insert or update prospect record, trigger enrichment job

**Research API:**
- Location: `src/app/api/prospects/[prospectId]/research/route.ts`
- Triggers: User clicks research tab on prospect detail
- Responsibilities: Execute multi-source research (Exa + SEC EDGAR + Claude synthesis)

**Inngest Enrich:**
- Location: `src/inngest/functions/enrich-prospect.ts`
- Triggers: Queued from upsert API, manual retry
- Responsibilities: Run enrichment pipeline (ContactOut → Exa → SEC EDGAR → Claude), persist results

## Error Handling

**Strategy:** Layered error handling with graceful degradation. Domain-specific error types thrown from service layer, caught and transformed to API responses at route handler level.

**Patterns:**

- **Custom Error Classes:** `RateLimitError`, `ApolloApiError` (thrown by Apollo client, caught by API handlers)
- **Circuit Breaker Errors:** Opossum throws when breaker open; caught and converted to 503 with user-friendly message
- **Validation Errors:** Zod schemas validated in API handlers; returns 400 with field-level errors
- **Not Found:** Next.js `notFound()` function used in layouts; renders default 404 page
- **Server Errors:** Caught in global error handler (`src/app/global-error.tsx`); logged via error logger

**Non-Fatal Failures:**

- Cache miss → continues with API call (not a failure, expected)
- Cache write failure → logged but doesn't break request (result still returned)
- Secondary research channels fail → `Promise.allSettled()` ensures primary channels don't block
- Inngest retries → up to 3 retries with exponential backoff (configured in function definition)

## Cross-Cutting Concerns

**Logging:** 
- Console-based logs with structured context (e.g., `console.info("[searchApollo] Cache HIT")`)
- Activity logger (`src/lib/activity-logger.ts`) for user action audit trail in database
- Error logger for exceptions (logs to Supabase or external service)

**Validation:**
- Zod schemas for request bodies and filters (`src/lib/validations/schemas.ts`)
- Type-level validation via TypeScript strict mode
- Apollo search result validation (check for expected fields before returning)

**Authentication:**
- Supabase Auth (JWT in secure cookies)
- Middleware verifies session and injects `x-tenant-id` header
- App metadata (role, tenant_id, onboarding_completed) stored in JWT
- RLS policies in Supabase enforce tenant isolation

**Authorization:**
- Role-based access control (RBAC) via `src/lib/auth/rbac.ts`
- Middleware checks role for `/admin` routes (super_admin only)
- Tenant isolation: users can only access their assigned tenant
- Per-API authorization checks (e.g., verify request user matches prospect's tenant)

**Performance:**
- Redis caching of search results (24h TTL)
- Suspense boundaries in React for lazy loading (e.g., SearchFallback skeleton)
- Rate limiting on Apollo searches to control quota
- Circuit breaker prevents retry storms
- Channel-level caching in research (each source has own cache key)

**Resilience:**
- Rate limiting + circuit breaker for Apollo
- Inngest durable execution handles retries and idempotency
- Promise.allSettled() in multi-source research prevents one failure from breaking all
- Fallback to cached data if fresh fetch fails (e.g., search results)

---

*Architecture analysis: 2026-04-05*
