# Phase 1: Foundation - Research

**Researched:** 2026-02-08
**Domain:** Multi-tenant SaaS infrastructure with Next.js 14 App Router + Supabase
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational infrastructure for a multi-tenant B2B SaaS application using Next.js 14 App Router, Supabase (auth + database with RLS), Upstash Redis (caching), and Vercel (deployment). The research confirms that the chosen tech stack represents current best practices for 2026, with strong ecosystem support and mature patterns.

**Critical finding:** Supabase RLS is disabled by default and represents the #1 security vulnerability in Supabase applications. 83% of exposed Supabase databases involve RLS misconfigurations. The January 2026 Moltbook breach (1.5M users exposed) reinforces the importance of enabling RLS on all tables from day one.

**Architecture approach:** Path-based multi-tenancy (`/[orgId]/...`) with middleware extracting tenant context, Supabase RLS enforcing data isolation at the database level, and tenant-scoped cache keys preventing cross-tenant data bleed. Supabase's `@supabase/ssr` package replaces deprecated auth-helpers for Next.js 14 App Router SSR.

**Primary recommendation:** Enable RLS on all 9 tables immediately upon creation with proper indexes on `tenant_id` columns, use `@supabase/ssr` with `getClaims()` (never `getSession()` in server code), implement Auth Hooks for custom JWT claims (roles stored in `app_metadata`), and use transaction mode pooling (port 6543) for Vercel serverless functions.

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | Latest | Supabase SSR for Next.js App Router | Official replacement for deprecated auth-helpers; handles cookie-based session management |
| `@supabase/supabase-js` | Latest | Supabase JavaScript client | Official client library; works with `@supabase/ssr` |
| `@upstash/redis` | Latest | Serverless Redis client | HTTP-based, edge-compatible, no connection pooling needed |
| `next` | 14.x | React framework with App Router | Production-ready App Router with RSC, Server Actions |
| `react` | 18.x | UI library | Required for Next.js 14 |
| `tailwindcss` | 3.x | Utility-first CSS | Already configured with shadcn/ui |
| `zod` | Latest | Schema validation | Runtime validation for Server Actions, API routes, RLS policies |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jwt-decode` | Latest | Decode JWT tokens client-side | Accessing custom claims (roles) in Client Components |
| `@edge-csrf/nextjs` | Latest | CSRF protection middleware | Additional CSRF protection beyond Next.js built-in |
| `react-error-boundary` | Latest | Error boundary utilities | Optional helper for error.js patterns |

### Already Configured

- **shadcn/ui**: New York style, RSC-enabled, components.json configured
- **Tailwind CSS**: v3 with shadcn color system
- **TypeScript**: Configured with src/ directory structure

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Path-based routing (`/[orgId]/...`) | Subdomain routing | Subdomains require DNS wildcards, SSL cert management, more complex middleware. Path-based is simpler for v1. |
| Supabase transaction mode (port 6543) | Session mode (port 5432) | Session mode supports prepared statements but creates persistent connections unsuitable for serverless. Transaction mode is recommended for Vercel. |
| `@supabase/ssr` | Deprecated `@supabase/auth-helpers-nextjs` | Auth-helpers deprecated; @supabase/ssr is the official Next.js 14 App Router solution. |
| OKLCH colors | HSL colors | OKLCH offers wider color gamut (93% browser support); Tailwind 4.1+ includes automatic fallbacks. Stick with OKLCH from tweakcn theme. |

**Installation:**

```bash
# Core Supabase packages (if not already installed)
npm install @supabase/supabase-js @supabase/ssr

# Redis caching
npm install @upstash/redis

# Validation and utilities
npm install zod jwt-decode

# Optional: Enhanced CSRF protection
npm install @edge-csrf/nextjs
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/              # Unauthenticated routes (login, signup)
│   ├── [orgId]/             # Tenant-scoped routes
│   │   ├── layout.tsx       # Tenant context provider
│   │   ├── loading.tsx      # Tenant route loading states
│   │   ├── error.tsx        # Tenant route error boundary
│   │   └── ...              # Feature routes
│   ├── admin/               # Super admin panel (isolated from tenant routes)
│   │   ├── layout.tsx       # Admin-only layout
│   │   └── ...              # Admin routes
│   ├── api/                 # API routes
│   │   └── auth/            # Supabase auth callback
│   ├── global-error.tsx     # Root-level error boundary
│   ├── layout.tsx           # Root layout
│   └── middleware.ts        # Tenant extraction, auth refresh
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # createBrowserClient() for Client Components
│   │   ├── server.ts        # createServerClient() for Server Components
│   │   └── middleware.ts    # createServerClient() for middleware
│   ├── redis/
│   │   └── client.ts        # Redis.fromEnv() singleton
│   ├── auth/
│   │   ├── session.ts       # getCurrentUser(), requireRole()
│   │   └── rbac.ts          # Role checking utilities
│   ├── cache/
│   │   └── keys.ts          # Tenant-scoped cache key helpers
│   └── validations/
│       └── schemas.ts       # Zod schemas
├── components/
│   ├── ui/                  # shadcn components
│   └── ...                  # App components
└── types/
    ├── database.ts          # Supabase generated types
    └── ...                  # App types
```

### Pattern 1: Multi-Tenant Middleware

**What:** Next.js middleware extracts `orgId` from path, validates auth session, and passes tenant context to Server Components via headers.

**When to use:** Every tenant-scoped request to `/[orgId]/...` routes.

**Example:**

```typescript
// src/middleware.ts
import { createServerClient } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Initialize Supabase client for middleware
  const supabase = createServerClient(request, response);

  // CRITICAL: Refresh auth session (updates cookies)
  // Never use getSession() - always use getClaims() in server code
  const { user } = await supabase.auth.getClaims();

  // Extract orgId from path-based routing
  const pathname = request.nextUrl.pathname;
  const orgIdMatch = pathname.match(/^\/([^\/]+)\//);
  const orgId = orgIdMatch?.[1];

  // Pass tenant context to Server Components via header
  if (orgId) {
    response.headers.set("x-tenant-id", orgId);
  }

  // Protect authenticated routes
  if (!user && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Source:** [Supabase Next.js SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs), [Next.js Middleware Docs](https://nextjs.org/docs/14/app/building-your-application/routing/middleware)

### Pattern 2: Supabase Client Creation (Three Contexts)

**What:** Three separate client initialization patterns for different Next.js contexts (Client Components, Server Components, Middleware).

**When to use:** Every time you need to interact with Supabase.

**Example:**

```typescript
// src/lib/supabase/client.ts (Client Components)
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// src/lib/supabase/server.ts (Server Components, Route Handlers)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore: setAll called from Server Component
          }
        },
      },
    }
  );
}

// src/lib/supabase/middleware.ts (Middleware only)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export function createClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
```

**Source:** [Supabase Next.js Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pattern 3: Tenant-Scoped RLS Policies

**What:** PostgreSQL Row-Level Security policies that enforce data isolation using `tenant_id` from JWT claims or table joins.

**When to use:** Every table containing tenant-specific data.

**Example:**

```sql
-- Enable RLS on table (MUST DO FIRST)
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Create index on tenant_id (CRITICAL for performance)
CREATE INDEX idx_prospects_tenant_id ON prospects(tenant_id);

-- Policy: Users can only access their tenant's data
CREATE POLICY "Tenant isolation policy"
  ON prospects
  FOR ALL
  USING (
    tenant_id = (
      SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );

-- Alternative: More explicit with auth check
CREATE POLICY "Tenant isolation with auth check"
  ON prospects
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );

-- For foreign key relationships (better performance)
-- Assumes users table has tenant_id
CREATE POLICY "User can access own tenant data"
  ON prospects
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM users
      WHERE id = auth.uid()
    )
  );
```

**Key points:**
- Always index `tenant_id` columns (99.94% performance improvement documented)
- Use `app_metadata` for tenant_id (secure, user cannot modify)
- Never trust `user_metadata` for authorization
- Test policies with different users in Supabase dashboard
- Use `auth.uid() IS NOT NULL` for explicit authentication checks

**Source:** [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)

### Pattern 4: RBAC with Auth Hooks and Custom Claims

**What:** Use Supabase Auth Hooks to inject role claims into JWT tokens, then enforce role-based access in RLS policies.

**When to use:** Authorization beyond tenant isolation (admin, agent, assistant roles).

**Example:**

```sql
-- 1. Create role enum
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'agent', 'assistant');

-- 2. Add role to users table
ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'assistant';
CREATE INDEX idx_users_role ON users(role);

-- 3. Create Auth Hook (runs before token issued)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Fetch user role
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  -- Inject role into JWT claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

  -- Return modified event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- 4. Create RLS policy using custom claim
CREATE POLICY "Admins can access all prospects"
  ON prospects
  FOR ALL
  USING (
    (auth.jwt() -> 'user_role')::text = 'tenant_admin'
    OR (auth.jwt() -> 'user_role')::text = 'super_admin'
  );

-- 5. Create authorize helper function (reusable)
CREATE OR REPLACE FUNCTION public.authorize(
  required_role user_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role >= required_role
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$;

-- 6. Use in policies
CREATE POLICY "Only admins can delete"
  ON prospects
  FOR DELETE
  USING (authorize('tenant_admin'));
```

**Client-side role access:**

```typescript
// Decode JWT to access custom claims
import { jwtDecode } from "jwt-decode";

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

if (token) {
  const claims = jwtDecode<{ user_role: string }>(token);
  console.log(claims.user_role); // "tenant_admin"
}
```

**Source:** [Supabase RBAC Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)

### Pattern 5: Tenant-Scoped Cache Keys

**What:** Prefix all cache keys with `tenant_id` to prevent cross-tenant data leakage.

**When to use:** All Redis caching operations.

**Example:**

```typescript
// src/lib/cache/keys.ts
export function getTenantCacheKey(
  tenantId: string,
  resource: string,
  identifier?: string
): string {
  const parts = ["tenant", tenantId, resource];
  if (identifier) parts.push(identifier);
  return parts.join(":");
}

// Usage examples:
// "tenant:123e4567:prospects:list"
// "tenant:123e4567:persona:abc-def"
// "tenant:123e4567:usage:2024-01"

// src/lib/redis/client.ts
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

// Cache-aside pattern with tenant isolation
export async function getCachedData<T>(
  tenantId: string,
  resource: string,
  identifier: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const redis = getRedisClient();
  const key = getTenantCacheKey(tenantId, resource, identifier);

  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await redis.set(key, data, { ex: ttlSeconds });

  return data;
}
```

**Source:** [Upstash Redis Next.js Tutorial](https://upstash.com/docs/redis/tutorials/nextjs_with_redis)

### Pattern 6: Error Boundaries (error.js + global-error.js)

**What:** File-system based error boundaries for graceful error handling in App Router.

**When to use:** Every major route segment, plus root-level global error handler.

**Example:**

```typescript
// src/app/[orgId]/error.tsx
"use client"; // MUST be Client Component

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error("Tenant route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

// src/app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-semibold">Application Error</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
```

**Key rules:**
- `error.tsx` must be Client Component (`"use client"`)
- `error.tsx` does NOT catch errors in `layout.tsx` of same segment
- Use `global-error.tsx` for root layout errors (must include `<html>` and `<body>`)
- `reset()` re-renders error boundary (doesn't reload page)
- Production mode strips sensitive error details from client

**Source:** [Next.js Error Handling](https://nextjs.org/docs/14/app/building-your-application/routing/error-handling)

### Pattern 7: Loading States (loading.js + Suspense)

**What:** File-system based loading UI with instant feedback during navigation.

**When to use:** Route segments with data fetching, plus granular Suspense boundaries for components.

**Example:**

```typescript
// src/app/[orgId]/prospects/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-[250px]" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px]" />
        ))}
      </div>
    </div>
  );
}

// src/app/[orgId]/prospects/page.tsx
import { Suspense } from "react";
import { ProspectList } from "@/components/prospects/list";
import { ProspectFilters } from "@/components/prospects/filters";

export default function ProspectsPage({ params }: { params: { orgId: string } }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prospects</h1>

      {/* Filters load instantly (no async) */}
      <ProspectFilters />

      {/* List loads with Suspense boundary */}
      <Suspense fallback={<ProspectListSkeleton />}>
        <ProspectList orgId={params.orgId} />
      </Suspense>
    </div>
  );
}
```

**Best practices:**
- Use `loading.tsx` for entire route segments
- Use `<Suspense>` for granular component-level loading
- Keep fallback UI lightweight (skeletons > spinners)
- Reserve space to prevent layout shift
- `loading.tsx` wraps `page.tsx` automatically in `<Suspense>`

**Source:** [Next.js Loading UI and Streaming](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming)

### Pattern 8: Environment Variables (Server-Side API Keys)

**What:** Secure environment variable handling with separation between client and server.

**When to use:** All API keys, database URLs, secrets.

**Example:**

```typescript
// .env.local (NEVER commit to git)
# Supabase (anon key is safe for client)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase (service role MUST be server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:6543/postgres

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYKoAAI...

# Apollo.io (server-only)
APOLLO_API_KEY=abc123...

# Anthropic Claude (server-only)
ANTHROPIC_API_KEY=sk-ant-...

// src/lib/env.ts (validation with Zod)
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DB_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  APOLLO_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
});

// Validate at startup (fails fast)
export const env = envSchema.parse(process.env);

// Usage: import { env } from "@/lib/env"
// env.APOLLO_API_KEY (type-safe, validated)
```

**Security rules:**
- **NEVER** prefix server-only keys with `NEXT_PUBLIC_`
- **NEVER** use service role key in Client Components
- Validate all env vars at startup (fail fast)
- Use separate keys per environment (dev, staging, prod)
- Regenerate keys after suspected exposure

**Vercel deployment:**
- Add env vars in Project Settings > Environment Variables
- Set per environment (Production, Preview, Development)
- Redeploy after adding new variables

**Source:** [Next.js Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables), [Next.js Security Guide](https://nextjs.org/blog/security-nextjs-server-components-actions)

### Anti-Patterns to Avoid

- **Using `getSession()` in server code**: Always use `getClaims()` in middleware, Server Components, Route Handlers. `getSession()` doesn't revalidate the token.
- **Missing RLS indexes**: Policies on `tenant_id` without indexes cause 100x performance degradation. Always `CREATE INDEX idx_table_tenant_id ON table(tenant_id)`.
- **Storing roles in `user_metadata`**: Users can modify `user_metadata`. Use `app_metadata` for authorization data.
- **Heavy middleware logic**: Middleware runs on Edge Runtime (no Node.js APIs, no database queries). Keep it lightweight.
- **Missing tenant_id in cache keys**: Leads to cross-tenant data bleed. Always prefix: `tenant:{tenantId}:{resource}:{id}`.
- **Exposing service role key**: Never use in Client Components or commit to git. Service role bypasses RLS.
- **Using `USING (true)` in RLS policies**: Allows access to all rows. Always filter by `tenant_id` or `auth.uid()`.
- **Prefix server-only env vars with `NEXT_PUBLIC_`**: Makes them visible in browser bundle.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT token validation | Custom JWT parsing/verification | `@supabase/ssr` with `getClaims()` | Handles token refresh, signature verification, edge cases |
| Multi-tenant data isolation | Application-level filtering | Supabase RLS policies | Database-level enforcement prevents bypass, defense-in-depth |
| CSRF protection for Server Actions | Custom token system | Next.js built-in Origin header validation | Automatic POST-only enforcement, Same-Site cookies |
| Input validation for Server Actions | Manual type checking | Zod schemas | Runtime validation, type inference, detailed errors |
| Session management | Custom cookie handling | `@supabase/ssr` cookie utilities | Handles cookie size limits, expiration, security flags |
| Cache key generation | String concatenation | Helper functions with prefixing | Prevents typos, enforces tenant isolation pattern |
| Error boundaries | try/catch in components | `error.tsx` file convention | Automatic error boundary wrapping, better UX |
| Loading states | Manual loading flags | `loading.tsx` + Suspense | Automatic streaming, non-blocking navigation |
| Role-based authorization | If/else chains | Auth Hooks + custom claims | Centralized in JWT, reusable in RLS policies |

**Key insight:** Supabase RLS + Next.js App Router conventions eliminate the need for custom solutions in 90% of common patterns. Focus implementation effort on business logic, not infrastructure plumbing.

## Common Pitfalls

### Pitfall 1: RLS Disabled by Default

**What goes wrong:** Tables created in Supabase have RLS **disabled** by default. Data is fully exposed via REST API if RLS is not explicitly enabled.

**Why it happens:** Developers assume RLS is enabled or forget the activation step. 83% of Supabase data breaches involve RLS misconfigurations.

**Real-world impact:** Moltbook breach (January 2026) exposed 1.5M users' emails, auth tokens, and API keys because RLS was disabled.

**How to avoid:**
```sql
-- ALWAYS run these commands immediately after creating a table:
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_table_tenant_id ON table_name(tenant_id);

CREATE POLICY "Tenant isolation"
  ON table_name
  FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

**Warning signs:**
- Supabase Security Advisor reports "RLS disabled" (lint 0013)
- Direct API queries return all tenant data
- Missing `ALTER TABLE ... ENABLE` statements in migration files

**Source:** [Supabase Security Advisors](https://supabase.com/docs/guides/database/database-advisors), [Moltbook Security Analysis](https://bastion.tech/blog/moltbook-security-lessons-ai-agents)

### Pitfall 2: Missing Indexes on RLS Policy Columns

**What goes wrong:** RLS policies that filter by `tenant_id` without an index cause full table scans, resulting in 100x performance degradation.

**Why it happens:** Developers enable RLS and create policies but forget that policy conditions execute on every query.

**How to avoid:**
```sql
-- ALWAYS create indexes on columns used in RLS policies
CREATE INDEX idx_prospects_tenant_id ON prospects(tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_personas_tenant_id ON personas(tenant_id);

-- Also index foreign keys (Performance Advisor lint 0001)
CREATE INDEX idx_list_members_list_id ON list_members(list_id);
CREATE INDEX idx_list_members_prospect_id ON list_members(prospect_id);
```

**Warning signs:**
- Slow query performance as data grows
- Supabase Performance Advisor reports missing indexes (lint 0001)
- EXPLAIN ANALYZE shows sequential scans instead of index scans

**Performance data:** Official Supabase docs report 99.94% performance improvement after adding index.

**Source:** [Supabase RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Pitfall 3: Using `getSession()` in Server Code

**What goes wrong:** `supabase.auth.getSession()` returns cached session data without revalidating the JWT token, allowing expired or revoked tokens to appear valid.

**Why it happens:** `getSession()` is easier to call and works on the client. Developers copy client patterns to server code.

**How to avoid:**

```typescript
// ❌ WRONG: Never use in Server Components, middleware, Route Handlers
const { data: { session } } = await supabase.auth.getSession();

// ✅ CORRECT: Always use getClaims() in server code
const { user } = await supabase.auth.getClaims();
```

**Warning signs:**
- Logged-out users still have access
- Revoked sessions remain active
- JWT expiration not enforced

**Official warning:** "Never trust `supabase.auth.getSession()` inside server code such as Proxy. It isn't guaranteed to revalidate the Auth token."

**Source:** [Supabase Next.js Auth Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pitfall 4: Storing Authorization Data in `user_metadata`

**What goes wrong:** `user_metadata` can be modified by authenticated users via `supabase.auth.updateUser()`, allowing privilege escalation.

**Why it happens:** Both `user_metadata` and `app_metadata` are in auth.users table. Developers confuse them.

**How to avoid:**

```typescript
// ❌ WRONG: Users can modify their own user_metadata
await supabase.auth.updateUser({
  data: { role: "admin" } // This writes to user_metadata!
});

// ✅ CORRECT: Use app_metadata (server-only, requires service role)
await supabase.auth.admin.updateUserById(userId, {
  app_metadata: {
    tenant_id: "123e4567-e89b-12d3-a456-426614174000",
    role: "agent"
  }
});

// ✅ CORRECT: Access in RLS policies
CREATE POLICY "Check tenant via app_metadata"
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

**Warning signs:**
- Users gaining unauthorized access
- Security Advisor reports policies using `user_metadata` for authorization (lint 0015)

**Source:** [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Pitfall 5: Heavy Computation in Middleware

**What goes wrong:** Middleware runs on Edge Runtime with no Node.js APIs, no database queries, and limited npm packages. Heavy logic causes errors or timeouts.

**Why it happens:** Developers treat middleware like Express.js middleware (full Node.js runtime).

**How to avoid:**

```typescript
// ❌ WRONG: Database queries, heavy computation
export async function middleware(request: NextRequest) {
  const supabase = createClient(request, response);
  const { data: user } = await supabase.from("users").select("*").single(); // ❌
  const hasAccess = await checkComplexPermissions(user); // ❌
  // ...
}

// ✅ CORRECT: Lightweight operations only
export async function middleware(request: NextRequest) {
  // Only: auth refresh, header injection, simple redirects
  const supabase = createClient(request, response);
  await supabase.auth.getClaims(); // This just refreshes session

  const orgId = request.nextUrl.pathname.match(/^\/([^\/]+)\//)?.[1];
  if (orgId) response.headers.set("x-tenant-id", orgId);

  return response;
}
```

**Warning signs:**
- "Edge Runtime does not support" errors
- `jsonwebtoken` package failures (uses Node.js crypto)
- Middleware timeout errors

**Source:** [Next.js Middleware Limitations](https://nextjs.org/blog/security-nextjs-server-components-actions)

### Pitfall 6: Missing Tenant Scope in Cache Keys

**What goes wrong:** Cache keys without `tenant_id` prefix cause cross-tenant data leakage (Tenant A sees Tenant B's cached data).

**Why it happens:** Developers forget multi-tenancy applies to caching, not just database.

**How to avoid:**

```typescript
// ❌ WRONG: No tenant isolation
const cached = await redis.get(`persona:${personaId}`);

// ✅ CORRECT: Tenant-scoped keys
const cached = await redis.get(`tenant:${tenantId}:persona:${personaId}`);

// ✅ BEST: Use helper function
import { getTenantCacheKey } from "@/lib/cache/keys";
const key = getTenantCacheKey(tenantId, "persona", personaId);
const cached = await redis.get(key);
```

**Warning signs:**
- Users seeing data from other tenants
- Cache invalidation affecting wrong tenants
- Inconsistent data across tenant UIs

**Critical risk:** Roadmap identifies this as one of 5 critical risks in Phase 1.

### Pitfall 7: Service Role Key in Client Code

**What goes wrong:** Service role key bypasses RLS entirely ("god mode"). Exposing it in browser bundle gives full database access to attackers.

**Why it happens:** Developers use service role key for testing and forget to switch to anon key.

**How to avoid:**

```typescript
// ❌ WRONG: Service role key in Client Component
"use client";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ❌ Exposed in browser bundle
);

// ✅ CORRECT: Anon key in Client Components
"use client";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ✅ Safe for client
);

// ✅ CORRECT: Service role in Server Components/Route Handlers only
// src/app/api/admin/route.ts (Server-side only)
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ Server-only
);
```

**Warning signs:**
- `SUPABASE_SERVICE_ROLE_KEY` in `.env` without server-only comment
- Service role key in files with `"use client"` directive
- Service role key prefixed with `NEXT_PUBLIC_`

**Source:** [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)

### Pitfall 8: Connection Pooling Mode Mismatch

**What goes wrong:** Using session mode (port 5432) for serverless functions creates persistent connections that exhaust connection limits.

**Why it happens:** Session mode is the default, and developers copy connection strings without understanding pooling modes.

**How to avoid:**

```bash
# ❌ WRONG: Session mode for Vercel serverless functions (port 5432)
DATABASE_URL="postgres://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"

# ✅ CORRECT: Transaction mode for serverless (port 6543)
DATABASE_URL="postgres://postgres:[PASSWORD]@db.xxx.supabase.co:6543/postgres"

# Also disable prepared statements for transaction mode
DATABASE_URL="postgres://postgres:[PASSWORD]@db.xxx.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
```

**Important:** Port 6543 session mode was deprecated on Feb 28, 2025. Now port 6543 = transaction mode only.

**Warning signs:**
- "Too many connections" errors
- Connection pool exhaustion
- Slow cold starts

**Source:** [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)

### Pitfall 9: OKLCH Colors Without Fallbacks (Pre-Tailwind 4.1)

**What goes wrong:** OKLCH colors display as transparent/broken in older browsers (Safari < 15, Chrome < 111), affecting ~7% of global users.

**Why it happens:** Tailwind 4.0 migrated to OKLCH without automatic fallbacks. Tailwind 4.1+ added fallbacks.

**How to avoid:**

```typescript
// Check Tailwind version
// package.json
{
  "tailwindcss": "^3.x" // Still using v3
}

// If using Tailwind 3 + OKLCH colors:
// Option 1: Stay with HSL colors (current mismatch in project)
// Option 2: Add PostCSS plugin for fallbacks
// npm install @csstools/postcss-oklab-function

// postcss.config.js
module.exports = {
  plugins: {
    '@csstools/postcss-oklab-function': { preserve: true },
    tailwindcss: {},
    autoprefixer: {},
  },
};

// Option 3: Upgrade to Tailwind 4.1+ (automatic fallbacks)
// npm install tailwindcss@latest
```

**Current project status:**
- `tailwind.config.ts` uses `hsl(var(...))` wrappers
- `globals.css` uses `oklch(...)` values from tweakcn
- **Mismatch needs resolution:** Either convert globals.css to HSL or remove `hsl()` wrappers and add OKLCH fallbacks

**Browser support:** OKLCH = ~93% global (drops to 70% in some regions), HSL = 100%

**Warning signs:**
- Colors appear transparent in older browsers
- Safari < 16 users report missing backgrounds
- Opacity modifiers not working in Firefox < 105

**Source:** [Tailwind OKLCH Colors](https://ui.shadcn.com/docs/tailwind-v4), [OKLCH Browser Support](https://github.com/tailwindlabs/tailwindcss/issues/16351)

## Code Examples

Verified patterns from official sources.

### Fetching User in Server Component

```typescript
// src/app/[orgId]/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Always use getClaims() in server code
  const { user, claims } = await supabase.auth.getClaims();

  if (!user) {
    redirect("/login");
  }

  const tenantId = claims?.app_metadata?.tenant_id;
  const role = claims?.user_role;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>User: {user.email}</p>
      <p>Role: {role}</p>
    </div>
  );
}
```

**Source:** [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Server Action with Validation

```typescript
// src/app/actions/prospects.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const createProspectSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
});

export async function createProspect(
  tenantId: string,
  formData: FormData
) {
  // 1. Validate input
  const validated = createProspectSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    company: formData.get("company"),
  });

  // 2. Verify authentication
  const supabase = await createClient();
  const { user } = await supabase.auth.getClaims();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 3. Verify tenant access (from JWT claims)
  const userTenantId = (await supabase.auth.getClaims())
    .claims?.app_metadata?.tenant_id;

  if (userTenantId !== tenantId) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // 4. Insert with tenant_id (RLS enforces isolation)
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      tenant_id: tenantId,
      ...validated,
    })
    .select()
    .single();

  if (error) throw error;

  // 5. Revalidate cache
  revalidatePath(`/${tenantId}/prospects`);

  return data;
}
```

**Source:** [Next.js Server Actions Security](https://nextjs.org/blog/security-nextjs-server-components-actions)

### Tenant Context Provider

```typescript
// src/app/[orgId]/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  const supabase = await createClient();

  // Verify tenant exists and user has access
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, logo_url, primary_color")
    .eq("id", params.orgId)
    .single();

  if (error || !tenant) {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar with tenant branding */}
      <aside className="w-64 border-r bg-card">
        <div className="p-4">
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} className="h-8" />
          )}
          <h2 className="mt-2 font-semibold">{tenant.name}</h2>
        </div>
        {/* Navigation */}
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

### Cache-Aside Pattern with Tenant Isolation

```typescript
// src/lib/cache/prospects.ts
import { getRedisClient } from "@/lib/redis/client";
import { getTenantCacheKey } from "@/lib/cache/keys";
import { createClient } from "@/lib/supabase/server";

export async function getProspectsList(
  tenantId: string,
  options: { page: number; limit: number }
) {
  const redis = getRedisClient();
  const cacheKey = getTenantCacheKey(
    tenantId,
    "prospects",
    `list:${options.page}:${options.limit}`
  );

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached as string);
  }

  // Fetch from database (RLS enforces tenant isolation)
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("tenant_id", tenantId)
    .range(
      options.page * options.limit,
      (options.page + 1) * options.limit - 1
    );

  if (error) throw error;

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });

  return data;
}

// Cache invalidation
export async function invalidateProspectsCache(tenantId: string) {
  const redis = getRedisClient();
  const pattern = getTenantCacheKey(tenantId, "prospects", "*");

  // Note: Upstash Redis doesn't support SCAN, use specific key deletion
  // For pattern-based deletion, maintain a set of cache keys
  const keysSet = await redis.smembers(`${tenantId}:cache-keys:prospects`);
  if (keysSet.length > 0) {
    await redis.del(...keysSet);
    await redis.del(`${tenantId}:cache-keys:prospects`);
  }
}
```

**Source:** [Upstash Redis Caching](https://upstash.com/docs/redis/tutorials/nextjs_with_redis)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Simpler API, better cookie handling, official Next.js 14 support |
| `getSession()` for server auth | `getClaims()` | 2024 | Enforced token validation, prevents stale session attacks |
| Manual JWT parsing | Auth Hooks for custom claims | 2024 | Centralized claim injection, automatic JWT updates |
| Supabase session mode (port 6543) | Transaction mode (port 6543) | Feb 2025 | Port 6543 now transaction-only, better serverless support |
| Manual CSRF tokens | Next.js Origin header validation | Next.js 14 | Built-in protection for Server Actions |
| HSL colors in Tailwind | OKLCH colors with fallbacks | Tailwind 4.0/4.1 | Wider color gamut, Tailwind 4.1+ includes fallbacks |
| React 17 error boundaries | File-based error.tsx | Next.js 13+ | Automatic boundary creation, better DX |
| Manual loading states | loading.tsx + Suspense | Next.js 13+ | Streaming SSR, instant feedback |

**Deprecated/outdated:**

- **@supabase/auth-helpers-nextjs**: Replaced by `@supabase/ssr`. Do not use in new projects.
- **supabase.auth.getSession() in server code**: Use `getClaims()` instead. `getSession()` doesn't revalidate tokens.
- **Port 6543 session mode**: As of Feb 28, 2025, port 6543 only supports transaction mode.
- **Manual multi-tenant middleware patterns**: Use official Next.js multi-tenant guide patterns (path-based routing).
- **Storing tenant_id in cookies/localStorage**: Use JWT `app_metadata` for server-side access, more secure.

## Open Questions

Things that couldn't be fully resolved:

1. **OKLCH vs HSL Color Mismatch in Current Project**
   - **What we know:**
     - `tailwind.config.ts` wraps colors with `hsl(var(...))`
     - `globals.css` uses `oklch(...)` values from tweakcn theme
     - Tailwind 3 requires PostCSS plugin for OKLCH fallbacks
     - Tailwind 4.1+ includes automatic fallbacks
   - **What's unclear:**
     - Whether current config works (likely broken)
     - Best migration path (convert to HSL vs add fallbacks vs upgrade Tailwind)
   - **Recommendation:**
     - **Option A (Quick Fix):** Convert `globals.css` OKLCH values to HSL to match `tailwind.config.ts` wrappers
     - **Option B (Modern):** Remove `hsl()` wrappers in tailwind config, add `@csstools/postcss-oklab-function` plugin
     - **Preferred:** Test current config first, then choose based on browser support requirements

2. **Dynamic Tenant Branding Runtime Updates**
   - **What we know:**
     - Tenant branding stored in database (logo_url, primary_color)
     - Can fetch and apply via layout
   - **What's unclear:**
     - Whether to use CSS variables for runtime color updates
     - How to override Tailwind theme colors per tenant
     - Performance impact of dynamic CSS injection
   - **Recommendation:**
     - Fetch tenant branding in `[orgId]/layout.tsx`
     - Use CSS custom properties for dynamic colors: `style={{ '--tenant-primary': tenant.primary_color }}`
     - Apply tenant logo via `<img>` tag in sidebar
     - For color system integration, use Tailwind arbitrary values: `bg-[var(--tenant-primary)]`

3. **Super Admin Authentication Strategy**
   - **What we know:**
     - Super admin panel at `/admin` route
     - Should be isolated from tenant routes
     - User has `super_admin` role in JWT claims
   - **What's unclear:**
     - Whether super admins also have tenant context
     - If `/admin` needs separate authentication flow
     - How to prevent super admins from accidentally acting as tenant users
   - **Recommendation:**
     - Use role-based middleware: check for `super_admin` role in `/admin` routes
     - Super admins can have `tenant_id: null` in app_metadata
     - Create separate RLS policies for super_admin role that bypass tenant checks
     - Use separate layout for `/admin` (no tenant context provider)

4. **Usage Metrics Aggregation Strategy**
   - **What we know:**
     - `usage_metrics_daily` table tracks API calls, enrichments, summaries
     - Needs tenant isolation via RLS
   - **What's unclear:**
     - Whether to aggregate daily in background job vs real-time
     - Cache strategy for dashboard metrics
     - How to handle timezone differences across tenants
   - **Recommendation:**
     - Real-time inserts via Server Actions (no aggregation)
     - Aggregate in Postgres views for dashboard queries
     - Cache aggregated metrics per tenant with 5-minute TTL
     - Store timestamps in UTC, convert to tenant timezone in UI

## Sources

### Primary (HIGH confidence)

- [Supabase Next.js Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official `@supabase/ssr` setup
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS patterns and performance
- [Supabase RBAC with Custom Claims](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - Auth Hooks implementation
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors) - Security and performance lints
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres) - Transaction vs session mode
- [Next.js 14 Middleware](https://nextjs.org/docs/14/app/building-your-application/routing/middleware) - Edge Runtime patterns
- [Next.js 14 Error Handling](https://nextjs.org/docs/14/app/building-your-application/routing/error-handling) - error.js and global-error.js
- [Next.js 14 Loading UI and Streaming](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming) - loading.js and Suspense
- [Next.js Security Guide](https://nextjs.org/blog/security-nextjs-server-components-actions) - Server Actions security
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) - Official multi-tenant patterns
- [Upstash Redis Next.js Tutorial](https://upstash.com/docs/redis/tutorials/nextjs_with_redis) - Redis setup and patterns
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) - OKLCH migration
- [shadcn/ui Tailwind v4 Docs](https://ui.shadcn.com/docs/tailwind-v4) - OKLCH implementation

### Secondary (MEDIUM confidence)

- [Supabase RLS Multi-Tenant Guide (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) - Multi-tenant RLS patterns
- [Supabase Best Practices (Leanware)](https://www.leanware.co/insights/supabase-best-practices) - Security and scaling
- [Moltbook Security Analysis (Bastion)](https://bastion.tech/blog/moltbook-security-lessons-ai-agents) - Real-world breach case study
- [Next.js Server Actions Security (Makerkit)](https://makerkit.dev/blog/tutorials/secure-nextjs-server-actions) - 5 vulnerabilities
- [Next.js Middleware Performance (LogRocket)](https://blog.logrocket.com/next-js-middleware-crash-course/) - Edge Runtime limitations
- [Tailwind OKLCH Browser Support (GitHub Issues)](https://github.com/tailwindlabs/tailwindcss/issues/16351) - Browser compatibility discussion

### Tertiary (LOW confidence - marked for validation)

- [Next.js Environment Variables Best Practices (TheLinuxCode)](https://thelinuxcode.com/nextjs-environment-variables-2026-build-time-vs-runtime-security-and-production-patterns/) - 2026 guide
- [Supabase Security Misconfigurations (ModernPentest)](https://modernpentest.com/blog/supabase-security-misconfigurations) - 10 common mistakes
- [Building Multi-Brand Websites with Next.js (Medium)](https://medium.com/@mohantaankit2002/building-multi-brand-websites-with-a-single-next-js-codebase-a-scalable-approach-93376411b929) - Dynamic branding patterns

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All libraries verified via official docs and Context7
- Architecture patterns: **HIGH** - Official Next.js and Supabase docs, verified code examples
- RLS security: **HIGH** - Official Supabase docs + real-world breach analysis (Moltbook 2026)
- Pitfalls: **HIGH** - Official security advisors, documented CVEs, official warnings
- OKLCH migration: **MEDIUM** - Recent change (Tailwind 4.0), some uncertainty about current project config
- Dynamic branding: **LOW** - Limited official guidance, needs experimentation

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days for stable infrastructure patterns)

**Critical decisions validated:**
- ✅ `@supabase/ssr` is current standard (replaces auth-helpers)
- ✅ Transaction mode (port 6543) for Vercel serverless
- ✅ `getClaims()` not `getSession()` in server code
- ✅ RLS must be manually enabled (disabled by default)
- ✅ Indexes required on tenant_id columns
- ✅ `app_metadata` for authorization, not `user_metadata`
- ✅ Path-based routing simpler than subdomains for v1
- ⚠️ OKLCH/HSL mismatch needs resolution before implementation

**Unresolved for planning:**
1. OKLCH vs HSL color system (test current config, then migrate if needed)
2. Dynamic tenant branding implementation (CSS variables approach recommended)
3. Super admin tenant context (null tenant_id recommended)
4. Usage metrics aggregation timing (real-time inserts + cached views recommended)
