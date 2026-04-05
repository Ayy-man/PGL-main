# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript 5.x - All source code, strict mode enabled
- JavaScript (ES2020+) - Configuration files, build scripts

**Secondary:**
- XML - Parsed from SEC EDGAR Form 4 documents
- JSON - API payloads, configuration

## Runtime

**Environment:**
- Node.js (via Next.js 14.2.35)

**Package Manager:**
- pnpm 10.28.0 (specified in package.json)
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core:**
- Next.js 14.2.35 - App Router, TypeScript-first
- React 18.x - UI components, hooks

**UI & Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS with theme variables
- Radix UI - Headless component library:
  - `@radix-ui/react-checkbox` 1.3.3
  - `@radix-ui/react-dialog` 1.1.15
  - `@radix-ui/react-dropdown-menu` 2.1.16
  - `@radix-ui/react-label` 2.1.8
  - `@radix-ui/react-select` 2.2.6
  - `@radix-ui/react-separator` 1.1.8
  - `@radix-ui/react-slot` 1.2.4
  - `@radix-ui/react-toast` 1.2.15
  - `@radix-ui/react-tooltip` 1.2.8
- lucide-react 0.563.0 - Icon library
- recharts 3.7.0 - Chart/data visualization library
- tailwindcss-animate 1.0.7 - Tailwind animation plugin
- class-variance-authority 0.7.1 - CSS-in-JS variant pattern library
- tailwind-merge 3.4.0 - Merge Tailwind classes intelligently
- clsx 2.1.1 - Conditional CSS class builder

**Data Fetching & State:**
- TanStack React Table 8.21.3 - Table component library with advanced sorting/filtering
- nuqs 2.8.8 - Next.js URL state management
- AI SDK 6.0.141 - OpenRouter integration layer
- `@ai-sdk/react` 3.0.143 - React hooks for AI SDK (useChat, etc)

**Background Jobs:**
- Inngest 3.52.6 - Event-driven background job orchestration
- `inngest/next` integration for App Router

**Testing:**
- Vitest 4.0.18 - Unit/integration test framework, Node environment
- `@vitest/ui` 4.0.18 - Test UI dashboard

**Build & Dev:**
- PostCSS 8.x - CSS processing pipeline
- `@csstools/postcss-oklab-function` 5.0.1 - OKLAB color space support
- ESLint 8.x - Code linting
- `eslint-config-next` 14.2.35 - Next.js ESLint rules

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.95.3 - PostgreSQL DB + Auth (client)
- `@supabase/ssr` 0.8.0 - Supabase SSR middleware
- `@upstash/redis` 1.36.2 - Serverless Redis client for caching + rate limiting
- `@upstash/ratelimit` 2.0.8 - Rate limiting utility
- Inngest 3.52.6 - Event orchestration for enrichment pipeline
- `@anthropic-ai/sdk` 0.74.0 - Legacy (replaced by OpenRouter for cost efficiency)
- `@openrouter/ai-sdk-provider` 2.3.3 - OpenRouter provider for AI SDK

**Resilience & Circuit Breaking:**
- opossum 9.0.0 - Circuit breaker pattern (handles external API failures gracefully)
- `@types/opossum` 8.1.9 - TypeScript support for circuit breaker

**Utilities & Validation:**
- zod 4.3.6 - TypeScript-first schema validation
- jwt-decode 4.0.0 - JWT token parsing
- csv-stringify 6.6.0 - CSV export generation
- source-map-js 1.2.1 - Source map handling

## Configuration

**Environment:**
- `.env.local` - Local development secrets (not committed)
- `.env.example` - Template with all required variables
- Environment variables are prefixed:
  - `NEXT_PUBLIC_*` - Accessible in browser
  - Others - Server-only
- Next.js automatic env file loading via dotenv

**Build:**
- `next.config.mjs` - Next.js configuration with security headers
- `tsconfig.json` - TypeScript compiler options, path aliases (`@/*`)
- `tailwind.config.ts` - Tailwind theme + content paths
- `postcss.config.mjs` - PostCSS plugin chain
- `vitest.config.ts` - Vitest configuration with path aliases

## Platform Requirements

**Development:**
- Node.js 18+ (recommended)
- pnpm 10.28.0 (pinned in package.json)
- TypeScript 5.x (strict mode)

**Production:**
- Vercel deployment (auto-deploys on push to main)
- Environment variables configured in Vercel project settings
- Inngest app registered (app ID: `phronesis`)
- API endpoint: `https://pgl-main.vercel.app/api/inngest`

## Security Headers

Configured in `next.config.mjs`:
- X-Frame-Options: DENY - Prevent clickjacking
- X-Content-Type-Options: nosniff - Prevent MIME-type sniffing
- Referrer-Policy: strict-origin-when-cross-origin - Control referrer exposure
- X-DNS-Prefetch-Control: on - Enable DNS prefetching

---

*Stack analysis: 2026-04-05*
