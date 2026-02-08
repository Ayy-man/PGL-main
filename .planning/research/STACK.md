# Technology Stack: PGL Luxury Buyer Finder

**Project:** Multi-tenant wealth intelligence SaaS platform
**Researched:** 2026-02-08
**Overall Confidence:** HIGH

---

## Executive Summary

The recommended stack for your multi-tenant wealth intelligence SaaS leverages Next.js 14 App Router with Supabase (PostgreSQL + Auth + RLS) for secure tenant isolation, TypeScript for type safety, and Vercel for serverless deployment. For background enrichment jobs that exceed Vercel's 60-second timeout, use **Inngest** as a task orchestration layer. For API rate limiting, **Upstash Redis** provides connectionless HTTP-based rate limiting designed for edge runtimes. CSV exports at scale require streaming using **papaparse** with Node.js streams. Integrate Claude AI via the official **@anthropic-ai/sdk** for prospect summaries.

**Key architectural decision:** Use path-based multi-tenancy (`/[orgId]/...`) over subdomain-based for simplicity, combined with Supabase RLS policies for database-level tenant isolation.

---

## Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | **14.2.x** | Full-stack React framework | **RECOMMENDED:** Next.js 14 is production-stable with proven App Router patterns. While Next.js 15 is stable (with Turbopack improvements and React 19 support), Next.js 14 remains the safer choice for greenfield SaaS projects prioritizing stability. Use Next.js 15 only if you need React 19 features or Turbopack's faster builds. | **HIGH** |
| **TypeScript** | **5.7.x** | Type safety | Industry standard for SaaS. Zod 4.3.6 (latest stable) provides runtime validation with 14x faster string parsing. | **HIGH** |
| **React** | **18.3.x** | UI library | React 18 remains the stable choice. React 19 support requires Next.js 15—defer upgrade until ecosystem stabilizes. | **HIGH** |

**Sources:**
- [Next.js 14 vs 15 Comparison](https://medium.com/@abdulsamad18090/next-js-14-vs-next-js-15-rc-a-detailed-comparison-d0160e425dc9)
- [Next.js Official Blog](https://nextjs.org/blog)
- [Zod 4 Evolution](https://peerlist.io/saxenashikhil/articles/zod-4--the-next-evolution-in-typescript-validation)

---

## Database & Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Supabase** | Latest | Hosted PostgreSQL + Auth + Realtime | Provides managed PostgreSQL with built-in Auth (JWT-based), RLS for tenant isolation, and Edge Functions. **Critical:** Use `@supabase/ssr@0.8.0` (not deprecated `@supabase/auth-helpers-nextjs`). | **HIGH** |
| **@supabase/ssr** | **0.8.0** | SSR-safe Supabase client | Required for Next.js App Router. Handles cookie-based session management in Server Components/Actions. Always use `supabase.auth.getUser()` in middleware (not `getSession()`) to revalidate tokens. | **HIGH** |
| **Drizzle ORM** *(Alternative)* | **0.36.x** | TypeScript-first ORM | **Consider for complex queries:** Drizzle is 14x faster than Prisma, uses raw SQL, and works well with Supabase. However, Prisma (stable at 6.x) has better DX for team collaboration. For a solo/small team prioritizing speed, use Drizzle. For larger teams, Prisma's schema-first approach reduces friction. | **MEDIUM** |

**Supabase RLS Best Practices:**
1. **Tenant Isolation:** Add `org_id` column to all tables. Store `org_id` in user's `app_metadata` (NOT `user_metadata`—it's user-editable).
2. **Policy Design:** Create separate RLS policies per operation (SELECT, INSERT, UPDATE, DELETE). Use custom JWT claims to avoid heavy subqueries.
3. **Indexing:** Always index `org_id` and `user_id` columns for RLS performance.
4. **Defense in Depth:** RLS provides baseline protection; add application-level checks for business logic.

**Sources:**
- [Supabase Multi-Tenant RLS](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [@supabase/ssr GitHub](https://github.com/supabase/ssr)
- [Drizzle vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/)

---

## Multi-Tenancy Architecture

| Approach | Implementation | Why | Confidence |
|----------|---------------|-----|------------|
| **Path-Based Routing** | `/[orgId]/dashboard` | **RECOMMENDED:** Simpler than subdomain-based. Works on any hosting. Next.js dynamic routes + middleware make this straightforward. | **HIGH** |
| **Middleware Tenant Context** | Extract `orgId` from path, inject into request headers | Middleware runs on Edge runtime—use it to identify tenant and rewrite requests. Store tenant context in headers for downstream Server Components/Actions. | **HIGH** |
| **Supabase RLS Enforcement** | `org_id` column + RLS policies | Database-level tenant isolation. Every query automatically scoped to `org_id` via RLS. | **HIGH** |

**Alternative (NOT RECOMMENDED):** Subdomain-based routing (`{tenant}.yourdomain.com`) requires wildcard SSL, Vercel wildcard domains, and more complex middleware. Only use if branding per tenant is a core requirement.

**Implementation Pattern:**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const orgId = request.nextUrl.pathname.split('/')[1]; // Extract from path
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-org-id', orgId);

  // Refresh Supabase session
  const { supabase, response } = await updateSession(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}
```

**Sources:**
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Multi-Tenant SaaS with Next.js 14](https://blog.devgenius.io/building-a-multi-tenant-saas-app-with-next-js-14-3df64e5a4cc4)

---

## API Integration & Rate Limiting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js Route Handlers** | (App Router) | API proxy for external services | Use Route Handlers (`/app/api/apollo/route.ts`) to proxy Apollo.io, Exa.ai, ContactOut, SEC EDGAR. Keeps API keys server-side, handles auth, transforms responses. | **HIGH** |
| **Upstash Redis + @upstash/ratelimit** | **@upstash/ratelimit@2.0.8** | Rate limiting for API routes | **RECOMMENDED:** Connectionless (HTTP-based) rate limiting designed for serverless/edge. Supports sliding window, token bucket algorithms. Free tier: 10K requests/day. | **HIGH** |
| **Vercel KV** *(Alternative)* | Latest | Vercel-native key-value store | Built-in to Vercel, but ties you to Vercel. Use Upstash for vendor flexibility. | **MEDIUM** |

**Rate Limiting Implementation:**
```typescript
// /app/api/apollo/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10s'), // 10 req per 10s per org
});

export async function POST(req: Request) {
  const orgId = req.headers.get('x-org-id');
  const { success } = await ratelimit.limit(orgId);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  // Proxy to Apollo.io
  const response = await fetch('https://api.apollo.io/v1/...', {
    headers: { 'X-Api-Key': process.env.APOLLO_API_KEY },
  });
  return NextResponse.json(await response.json());
}
```

**Sources:**
- [Upstash Rate Limiting Next.js](https://upstash.com/blog/nextjs-ratelimiting)
- [Rate Limiting Solutions 2024](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj)

---

## Background Jobs & Long-Running Tasks

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Inngest** | **3.x** (inngest npm package) | Background job orchestration | **REQUIRED:** Vercel has 60-second timeout (10s on Hobby). Inngest runs on Vercel but orchestrates long-running tasks by breaking them into retryable steps. Free tier: 100K executions/month. | **HIGH** |
| **QStash** *(Alternative)* | Latest | HTTP-based task queue | Upstash's job queue. Simpler than Inngest but less feature-rich. Use if you only need delayed job execution, not multi-step workflows. | **MEDIUM** |
| **Vercel Cron Jobs** *(Limited Use)* | Built-in | Scheduled tasks | **Only for simple cron jobs (≤60s).** Runs on production deployments only. For enrichment jobs (which may exceed 60s), use Inngest. | **MEDIUM** |

**When to Use Inngest:**
- Enrichment workflows that call multiple APIs (Apollo → Exa → ContactOut → Claude)
- Long-running CSV exports (streaming large datasets)
- Retry logic for external API failures
- Step-based workflows with state management

**Implementation Pattern:**
```typescript
// /app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [enrichProspectFunction],
});

// /lib/inngest/functions/enrich-prospect.ts
export const enrichProspectFunction = inngest.createFunction(
  { id: 'enrich-prospect' },
  { event: 'prospect.enrich' },
  async ({ event, step }) => {
    const apolloData = await step.run('fetch-apollo', async () => {
      return fetch('/api/apollo', { /* ... */ });
    });

    const exaData = await step.run('fetch-exa', async () => {
      return fetch('/api/exa', { /* ... */ });
    });

    const summary = await step.run('generate-summary', async () => {
      return fetch('/api/claude', { /* ... */ });
    });

    return { apolloData, exaData, summary };
  }
);
```

**Sources:**
- [Inngest for Vercel](https://vercel.com/marketplace/inngest)
- [Next.js Background Jobs](https://github.com/vercel/next.js/discussions/33989)
- [Background Jobs Guide](https://medium.com/@cyri113/background-jobs-for-node-js-using-next-js-inngest-supabase-and-vercel-e5148d094e3f)

---

## CSV Export at Scale

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **papaparse** | **5.4.x** | CSV parsing/generation with streaming | **RECOMMENDED:** Supports Node.js streams (unlike json2csv). For large exports, use `ReadableStream` to avoid loading entire dataset into memory. | **HIGH** |
| **fast-csv** *(Alternative)* | Latest | Node.js-native CSV streaming | More performant than papaparse for pure Node.js, but papaparse has better isomorphic support (works in browser + Node.js). | **MEDIUM** |

**Streaming CSV Export Pattern:**
```typescript
// /app/api/export/prospects/route.ts
import Papa from 'papaparse';
import { Readable } from 'stream';

export async function GET(req: Request) {
  const orgId = req.headers.get('x-org-id');
  const supabase = createClient();

  // Stream from Supabase
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('org_id', orgId)
    .stream(); // Use Supabase streaming API

  const csvStream = Papa.unparse(data, { header: true });

  return new Response(csvStream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="prospects.csv"',
    },
  });
}
```

**Key Principle:** Always use streaming for datasets > 1000 rows to avoid memory exhaustion and Vercel timeout.

**Sources:**
- [PapaParse Streaming](https://betterstack.com/community/guides/scaling-nodejs/parsing-csv-files-with-papa-parse/)
- [Node.js Streams CSV](https://dev.to/danielevilela/processing-1-million-sql-rows-to-csv-using-nodejs-streams-3in2)

---

## AI Integration (Anthropic Claude)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@anthropic-ai/sdk** | **0.73.0** | Official Claude API client | TypeScript-first SDK with streaming support. Use Claude Opus 4.6 for high-quality prospect summaries (Sonnet 4.5 for cost optimization). | **HIGH** |
| **Vercel AI SDK** *(Alternative)* | Latest | Multi-provider AI abstraction | Use if you plan to support multiple LLM providers (OpenAI, Claude, Gemini). For Claude-only, official SDK is simpler. | **MEDIUM** |

**Implementation Pattern:**
```typescript
// /app/api/claude/summarize/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { prospectData } = await req.json();

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Summarize this prospect: ${JSON.stringify(prospectData)}`
    }],
  });

  return NextResponse.json({ summary: message.content[0].text });
}
```

**Streaming for Real-Time Summaries:**
```typescript
const stream = await client.messages.stream({
  model: 'claude-opus-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
});

for await (const chunk of stream) {
  // Send to client via Server-Sent Events
}
```

**Sources:**
- [@anthropic-ai/sdk GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [Claude API Docs](https://docs.anthropic.com/en/docs/claude-code/sdk)

---

## UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Tailwind CSS** | **3.4.x** | Utility-first CSS | Standard for Next.js. Use custom theme for dark luxury + gold accents. | **HIGH** |
| **shadcn/ui** | Latest (copy-paste components) | Accessible React components | **RECOMMENDED:** Built on Radix UI primitives. Copy components into your codebase (not npm-installed). Supports both Radix and Base UI as of 2026. Use Radix for now (Base UI is newer, less battle-tested). | **HIGH** |
| **next-themes** | **0.3.x** | Dark mode toggle | Zero-flash dark mode for Next.js. Supports system preference. | **HIGH** |
| **Radix UI** | Latest | Headless UI primitives | Powers shadcn/ui. Provides ARIA-compliant, accessible components. **Note:** Radix maintenance has slowed as team focuses on Base UI. Monitor shadcn/ui's Base UI migration path. | **MEDIUM** |

**Dark Luxury Theme Configuration:**
```typescript
// tailwind.config.ts
export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          50: '#F9F5E8',
          // ... gold color scale
        },
        dark: {
          DEFAULT: '#0A0A0A',
          lighter: '#1A1A1A',
        },
      },
    },
  },
};
```

**Sources:**
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix vs shadcn/ui](https://workos.com/blog/what-is-the-difference-between-radix-and-shadcn-ui)
- [shadcn/ui Radix Concerns](https://x.com/shadcn/status/1936082723904565435)

---

## Forms & Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **React Hook Form** | **7.54.x** | Form state management | De facto standard for React forms. Use with Next.js Server Actions—not native form actions—for client-side validation + server mutations. | **HIGH** |
| **Zod** | **4.3.6** | Runtime schema validation | Zod 4 is 14x faster than v3. Use for both client-side (React Hook Form) and server-side (Server Actions) validation. | **HIGH** |

**Server Actions + React Hook Form Pattern:**
```typescript
// /app/actions/create-prospect.ts
'use server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function createProspect(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error };

  // Insert into Supabase
  const supabase = createClient();
  await supabase.from('prospects').insert(parsed.data);
  return { success: true };
}

// /components/ProspectForm.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function ProspectForm() {
  const form = useForm({ resolver: zodResolver(schema) });

  return (
    <form action={createProspect} onSubmit={form.handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

**Sources:**
- [React Hook Form with Next.js Server Actions](https://nehalist.io/react-hook-form-with-nextjs-server-actions/)
- [Next.js Forms Guide](https://nextjs.org/docs/app/guides/forms)

---

## State Management & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **TanStack Query** (React Query) | **@tanstack/react-query@5.x** | Server state management | **Use for client-side data fetching only.** With App Router, prefer Server Components for initial loads, then use TanStack Query for mutations/refetches. Supports streaming SSR via `HydrationBoundary`. | **HIGH** |
| **Server Components** | (Next.js built-in) | Server-side data fetching | **Default approach.** Fetch data in Server Components using `async/await`. No client-side JS overhead. | **HIGH** |
| **Zustand** *(If needed)* | Latest | Client-side global state | Use only for UI state (sidebar open/closed, filters). Avoid for server data—TanStack Query handles that. | **MEDIUM** |

**When to Use What:**
- **Server Components:** Initial page load, SEO-critical data
- **TanStack Query:** Client-side mutations (create/update/delete), polling, optimistic updates
- **Zustand:** UI-only state (theme, filters, modals)

**Sources:**
- [TanStack Query + Next.js App Router](https://tanstack.com/query/v5/docs/framework/react/examples/nextjs)
- [Next.js App Router Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)

---

## Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel** | N/A (hosting platform) | Serverless deployment | **REQUIRED for your stack.** Zero-config Next.js hosting, edge middleware, Vercel KV, Cron Jobs. 60s timeout for Hobby, 300s for Pro. Use Inngest for longer tasks. | **HIGH** |
| **Supabase Hosting** | N/A (BaaS) | PostgreSQL + Auth + Edge Functions | Managed backend. Use Edge Functions only if you need server-side logic outside Next.js (e.g., webhooks from external services). | **HIGH** |

**Alternatives (NOT RECOMMENDED for your stack):**
- **Render/Railway:** Longer timeouts, but requires self-hosting PostgreSQL. Supabase's RLS + Auth integration makes it superior for multi-tenant SaaS.
- **AWS Amplify/Cloud Run:** More complex than Vercel. Only use if you need VPC access or custom networking.

---

## Development Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **ESLint** | **9.x** | Linting | Use Next.js-recommended config (`next/core-web-vitals`). Add `@typescript-eslint` for stricter type checking. | **HIGH** |
| **Prettier** | **3.x** | Code formatting | Consistent formatting. Configure with `tailwindcss-prettier` plugin to sort Tailwind classes. | **HIGH** |
| **Turborepo** *(If monorepo)* | Latest | Build orchestration | **Only if you split code into packages** (e.g., `/packages/api`, `/packages/ui`). For single Next.js app, skip monorepo. | **MEDIUM** |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative | Confidence |
|----------|-------------|-------------|---------------------|------------|
| **Framework** | Next.js 14 | Next.js 15 | Next.js 15 is stable but React 19 ecosystem is still maturing. Stick with Next.js 14 unless you need Turbopack or React 19 features. | **HIGH** |
| **ORM** | Supabase Client | Drizzle ORM | Drizzle is faster but requires more SQL knowledge. For multi-tenant SaaS, Supabase client + RLS is simpler and safer. | **MEDIUM** |
| **Background Jobs** | Inngest | Vercel Cron Jobs | Vercel Cron Jobs have 60s timeout. Enrichment workflows need longer execution. | **HIGH** |
| **Rate Limiting** | Upstash Redis | Vercel KV | Vercel KV locks you into Vercel. Upstash works anywhere. | **MEDIUM** |
| **CSV Library** | papaparse | json2csv | json2csv doesn't support streaming. For large exports, streaming is mandatory. | **HIGH** |
| **AI SDK** | @anthropic-ai/sdk | Vercel AI SDK | Vercel AI SDK is overkill if you're only using Claude. Official SDK is simpler. | **MEDIUM** |
| **Component Library** | shadcn/ui (Radix) | shadcn/ui (Base UI) | Base UI is newer. Radix has more battle-testing. Monitor shadcn/ui's Base UI migration. | **MEDIUM** |

---

## Installation Commands

### Core Dependencies
```bash
npm install next@14.2 react@18.3 react-dom@18.3 typescript@5.7
npm install @supabase/ssr@0.8.0 @supabase/supabase-js
npm install @anthropic-ai/sdk@0.73.0
npm install inngest@3
npm install @upstash/ratelimit@2.0.8 @upstash/redis
npm install papaparse@5.4
npm install zod@4.3.6
npm install react-hook-form@7.54
npm install @tanstack/react-query@5
npm install tailwindcss@3.4 autoprefixer postcss
npm install next-themes@0.3
```

### UI Components
```bash
npx shadcn@latest init  # Choose Radix UI (default)
npx shadcn@latest add button card dialog table form
```

### Dev Dependencies
```bash
npm install -D @types/node @types/react @types/react-dom
npm install -D eslint@9 prettier@3 @typescript-eslint/parser
npm install -D tailwindcss-animate class-variance-authority clsx tailwind-merge
```

---

## What NOT to Use (and Why)

| Technology | Why Avoid | Confidence |
|------------|-----------|------------|
| **@supabase/auth-helpers-nextjs** | **DEPRECATED.** Use `@supabase/ssr` instead. Auth Helpers don't work properly with App Router SSR. | **HIGH** |
| **json2csv** | No streaming support. Will cause memory exhaustion on large exports. | **HIGH** |
| **Subdomain-based multi-tenancy** | Requires wildcard SSL, complex middleware, and Vercel wildcard domains. Path-based is simpler. | **HIGH** |
| **Vercel Cron Jobs for enrichment** | 60s timeout. Enrichment workflows (Apollo → Exa → ContactOut → Claude) will exceed this. Use Inngest. | **HIGH** |
| **Prisma** | Slower than Drizzle, but more team-friendly. For solo dev, use Drizzle. For team, Prisma is acceptable. | **MEDIUM** |
| **Next.js 15** | React 19 ecosystem is still stabilizing. Use Next.js 14 unless you need specific Next.js 15 features. | **MEDIUM** |
| **Zustand for server data** | Server data should live in TanStack Query (cache, invalidation, refetching). Zustand is for UI state only. | **HIGH** |

---

## Version Confidence Summary

| Library | Version | Last Verified | Source | Confidence |
|---------|---------|---------------|--------|------------|
| Next.js | 14.2.x | 2026-02-08 | [Next.js Releases](https://nextjs.org/blog) | **HIGH** |
| @supabase/ssr | 0.8.0 | 2025-11-26 | [npm](https://www.npmjs.com/package/@supabase/ssr) | **HIGH** |
| @anthropic-ai/sdk | 0.73.0 | 2026-02-06 | [npm](https://www.npmjs.com/package/@anthropic-ai/sdk) | **HIGH** |
| Zod | 4.3.6 | 2026-01-22 | [Zod 4 Release](https://peerlist.io/saxenashikhil/articles/zod-4--the-next-evolution-in-typescript-validation) | **HIGH** |
| @upstash/ratelimit | 2.0.8 | 2026-01 | [npm](https://www.npmjs.com/package/@upstash/ratelimit) | **HIGH** |
| inngest | 3.x | 2026-02-08 | [npm](https://www.npmjs.com/package/inngest) | **HIGH** |
| papaparse | 5.4.x | 2026-02-08 | WebSearch | **MEDIUM** |
| react-hook-form | 7.54.x | 2026-02-08 | WebSearch | **MEDIUM** |
| @tanstack/react-query | 5.x | 2026-02-08 | WebSearch | **HIGH** |
| next-themes | 0.3.x | 2026-01 | WebSearch | **MEDIUM** |

---

## Key Rationale Summary

1. **Next.js 14 over 15:** Stability > cutting-edge. React 19 ecosystem isn't mature yet.
2. **Path-based multi-tenancy:** Simpler than subdomains. Works everywhere.
3. **Supabase RLS:** Database-level tenant isolation is safer than app-level checks.
4. **Inngest for background jobs:** Vercel's 60s timeout is too short for enrichment workflows.
5. **Upstash Redis for rate limiting:** Connectionless (HTTP-based), works on edge runtime.
6. **papaparse for CSV:** Only library with Node.js streaming support for large exports.
7. **@anthropic-ai/sdk:** Official Claude SDK is simpler than Vercel AI SDK for Claude-only use.
8. **shadcn/ui (Radix):** Copy-paste components give you full control. Radix is more stable than Base UI (for now).

---

## Sources

**Multi-Tenancy:**
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Building Multi-Tenant SaaS with Next.js 14](https://blog.devgenius.io/building-a-multi-tenant-saas-app-with-next-js-14-3df64e5a4cc4)
- [Supabase RLS Multi-Tenant](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

**Supabase + Next.js:**
- [Supabase SSR Setup](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [@supabase/ssr GitHub](https://github.com/supabase/ssr)

**Background Jobs:**
- [Inngest for Vercel](https://vercel.com/marketplace/inngest)
- [Next.js Background Jobs Discussion](https://github.com/vercel/next.js/discussions/33989)

**Rate Limiting:**
- [Upstash Rate Limiting for Next.js](https://upstash.com/blog/nextjs-ratelimiting)
- [Rate Limiting Solutions 2024](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj)

**CSV Export:**
- [PapaParse Streaming](https://betterstack.com/community/guides/scaling-nodejs/parsing-csv-files-with-papa-parse/)
- [Node.js Streams for CSV](https://dev.to/danielevilela/processing-1-million-sql-rows-to-csv-using-nodejs-streams-3in2)

**Claude AI:**
- [@anthropic-ai/sdk GitHub](https://github.com/anthropics/anthropic-sdk-typescript)

**ORM Comparison:**
- [Drizzle vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/)

**Next.js Version Comparison:**
- [Next.js 14 vs 15](https://medium.com/@abdulsamad18090/next-js-14-vs-next-js-15-rc-a-detailed-comparison-d0160e425dc9)

**Forms:**
- [React Hook Form + Server Actions](https://nehalist.io/react-hook-form-with-nextjs-server-actions/)

**State Management:**
- [TanStack Query + Next.js](https://tanstack.com/query/v5/docs/framework/react/examples/nextjs)

**UI Components:**
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Radix vs shadcn/ui](https://workos.com/blog/what-is-the-difference-between-radix-and-shadcn-ui)

---

## Open Questions / Lower Confidence Areas

1. **Drizzle vs Prisma:** MEDIUM confidence. Both work. Drizzle is faster; Prisma has better DX. For solo dev, Drizzle. For team, Prisma.
2. **next-themes version:** MEDIUM confidence. Version 0.3.x is current based on WebSearch, but couldn't verify exact latest version via official docs.
3. **Base UI vs Radix:** MEDIUM confidence. shadcn/ui now supports both. Radix is battle-tested; Base UI is newer. Monitor shadcn/ui's guidance.
4. **Monorepo:** LOW confidence on whether you need it. If codebase stays simple (single Next.js app), skip Turborepo. If you extract shared packages, use Turborepo.

---

## Ready for Roadmap

This stack research is complete and ready to inform roadmap creation. All core decisions (framework, database, multi-tenancy, background jobs, rate limiting, CSV export, AI integration) are documented with HIGH confidence.
