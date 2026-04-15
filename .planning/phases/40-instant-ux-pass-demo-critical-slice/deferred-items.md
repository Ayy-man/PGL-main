# Phase 40 — Deferred Items

Items discovered during executor runs that are out-of-scope for the current plan.

## Pre-existing build prerender errors — auth/admin SSG pages

**Discovered:** Plan 40-04 execution (2026-04-15)
**Symptom:** `pnpm build` completes compilation (`✓ Compiled successfully`) but fails at
static export with `TypeError: Cannot read properties of undefined (reading 'trim')` on
auth pages (`/login`, `/reset-password`, `/forgot-password`), admin pages (`/admin/*`),
and onboarding pages. Root cause is almost certainly `process.env.NEXT_PUBLIC_SUPABASE_*`
being undefined in the worktree's SSG build (no `.env.local` loaded → `.trim()` on undefined
inside the Supabase client env-parse).
**Confirmed pre-existing at base commit:** `f52a9ca` — same failure, same pages, identical stack.
**Impact on Plan 40-04:** none — `list-prospects-realtime.tsx` is a `"use client"` component
and compiles cleanly. Type-check passes for every file touched by this plan. The 13 new
vitest cases plus all existing realtime tests pass.
**Fix path:** load the real `.env.local` into the worktree for local builds, or gate the
affected env-reads behind a typeof-check. Vercel production builds have the env vars so
this doesn't affect deploy.

## Pre-existing test failures — enrich-prospect.test.ts (22 tests)

**Discovered:** Plan 40-04 execution (2026-04-15)
**Location:** `src/inngest/functions/__tests__/enrich-prospect.test.ts`
**Symptom:** `TypeError: supabase.rpc is not a function` — 22 tests fail because the mocked Supabase client in the test harness is missing `.rpc()`. The test file was added when `enrich-prospect.ts` started calling `supabase.rpc("merge_enrichment_source_status", ...)` but the mock client factory wasn't updated.
**Confirmed pre-existing at base commit:** `f52a9ca` (post-40-03) — failures reproduce on clean checkout, no changes from this plan touch them.
**Impact on Plan 40-04:** none — these tests live in a completely separate subsystem (Inngest enrichment orchestrator). All Plan 40-04 tests (13 in `with-polling-fallback.test.ts`) pass.
**Fix path:** Update the mock in `src/inngest/functions/__tests__/enrich-prospect.test.ts` to include an `.rpc` stub returning `{ data: null, error: null }`. Should be a small targeted fix in a separate chore commit.
