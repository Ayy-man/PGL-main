---
phase: 260409-rzz-apollo-safety
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/apollo/bulk-enrich/route.ts
  - src/app/api/prospects/[prospectId]/enrich/route.ts
  - src/lib/circuit-breaker/apollo-breaker.ts
autonomous: true
requirements:
  - RZZ-01
  - RZZ-02
  - RZZ-03

must_haves:
  truths:
    - "POST /api/apollo/bulk-enrich returns 429 with X-RateLimit-* headers when a tenant exceeds 100 calls/hour"
    - "POST /api/prospects/[prospectId]/enrich returns 429 with X-RateLimit-* headers when a tenant exceeds 100 calls/hour"
    - "bulkEnrichPeople is wrapped in its own opossum circuit breaker that trips after 5+ calls with 50% error rate and resets after 30s"
    - "The existing bulkEnrichPeople(apolloIds) → Promise<ApolloPerson[]> signature is unchanged for all callers"
    - "apolloSearchRequest and apolloBreaker behavior is untouched"
  artifacts:
    - path: "src/app/api/apollo/bulk-enrich/route.ts"
      provides: "Rate-limited bulk enrich endpoint"
      contains: "withRateLimit(apolloRateLimiter"
    - path: "src/app/api/prospects/[prospectId]/enrich/route.ts"
      provides: "Rate-limited single-prospect enrich endpoint"
      contains: "withRateLimit(apolloRateLimiter"
    - path: "src/lib/circuit-breaker/apollo-breaker.ts"
      provides: "Circuit breaker for bulk enrichment"
      contains: "apolloBulkEnrichBreaker"
  key_links:
    - from: "src/app/api/apollo/bulk-enrich/route.ts"
      to: "apolloRateLimiter"
      via: "withRateLimit + rateLimitResponse"
      pattern: "withRateLimit\\(apolloRateLimiter"
    - from: "src/app/api/prospects/[prospectId]/enrich/route.ts"
      to: "apolloRateLimiter"
      via: "withRateLimit + rateLimitResponse"
      pattern: "withRateLimit\\(apolloRateLimiter"
    - from: "bulkEnrichPeople export"
      to: "apolloBulkEnrichBreaker.fire"
      via: "wrapper function"
      pattern: "apolloBulkEnrichBreaker\\.fire"
---

<objective>
Harden the two Apollo credit-burning endpoints with per-tenant rate limiting and wrap the bulk enrichment network call in its own opossum circuit breaker.

Purpose: Prevent credit exhaustion from runaway clients (rate limit) and prevent hammering Apollo when it's flapping (circuit breaker). All infrastructure already exists — this is a three-edit wiring pass.

Output: Both enrich endpoints return 429 under load; bulkEnrichPeople trips a dedicated breaker on repeated failure without touching the existing search breaker.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Target files (read-before-edit)
@src/app/api/apollo/bulk-enrich/route.ts
@src/app/api/prospects/[prospectId]/enrich/route.ts
@src/lib/circuit-breaker/apollo-breaker.ts

# Infrastructure (already in place — do NOT modify, just import)
@src/lib/rate-limit/limiters.ts
@src/lib/rate-limit/middleware.ts

<interfaces>
<!-- Pre-extracted contracts the executor needs. No exploration required. -->

From src/lib/rate-limit/limiters.ts:
```typescript
export const apolloRateLimiter: Ratelimit; // 100 calls / 1 hour, sliding window
```

From src/lib/rate-limit/middleware.ts:
```typescript
export async function withRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;

export function rateLimitResponse(result: {
  limit: number; remaining: number; reset: number;
}): Response; // Returns 429 with X-RateLimit-* headers + JSON body
```

From src/lib/circuit-breaker/apollo-breaker.ts (current public API — MUST NOT change):
```typescript
export function bulkEnrichPeople(apolloIds: string[]): Promise<ApolloPerson[]>;
export const apolloBreaker: CircuitBreaker; // wraps apolloSearchRequest — DO NOT TOUCH
```

From src/app/api/prospects/[prospectId]/enrich/route.ts (tenant extraction pattern to mirror in bulk-enrich):
```typescript
const tenantId = user.app_metadata?.tenant_id as string | undefined;
if (!tenantId) {
  throw new ApiError("No tenant ID found in session", "UNAUTHORIZED", 401);
}
```

opossum CircuitBreaker generic (from @types/opossum):
```typescript
declare class CircuitBreaker<TI extends unknown[] = unknown[], TR = unknown> extends EventEmitter;
// Generics infer from the wrapped function's signature — no cast needed on .fire()
// Existing pattern in src/lib/apollo/client.ts:200:
//   const searchResponse = await apolloBreaker.fire(apolloParams); // no cast
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rate-limit POST /api/apollo/bulk-enrich</name>
  <files>src/app/api/apollo/bulk-enrich/route.ts</files>
  <action>
Add imports and a rate-limit guard between the auth check and the Zod parse in the existing POST handler. Do NOT touch the mock-mode branch, the Zod schema, the 402 insufficient-credits branch, or the catch block.

**Step 1 — Add two imports** near the top of the file, after the existing import block (after line 7, `import { isApolloMockMode } from "@/lib/platform-config";`):

```typescript
import { apolloRateLimiter } from "@/lib/rate-limit/limiters";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit/middleware";
```

**Step 2 — Insert tenant extraction + rate-limit block** inside `POST(request: Request)`, immediately AFTER the existing auth check (after the `if (authError || !user) { ... }` block ending at line 104) and BEFORE `const body = await request.json();` (line 106).

Before (lines 94–106):
```typescript
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
```

After:
```typescript
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await withRateLimit(apolloRateLimiter, `tenant:${tenantId}`);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();
```

**Rules:**
- Use the same 401 `NextResponse.json(...)` shape as the existing auth branch (this route does NOT use `ApiError`, unlike the prospects route).
- Rate limit MUST happen AFTER auth (we need the tenant ID) but BEFORE `request.json()`, the Zod parse, the mock-mode check, AND `bulkEnrichPeople`.
- Do NOT touch `requestSchema`, `previewSchema`, `generateMockPerson`, `FAKE_LAST_NAMES`, `FAKE_DOMAINS`, the useMock branch, the real-mode `bulkEnrichPeople(apolloIds)` call, or the catch block with its 402 / 500 branches.
- The `return rateLimitResponse(rateLimit)` returns a `Response` (not `NextResponse`) — this is fine because the Next.js route handler signature accepts either.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "bulk-enrich/route\.ts" || echo "OK: bulk-enrich/route.ts typechecks clean"</automated>
  </verify>
  <done>
- File imports `apolloRateLimiter`, `withRateLimit`, `rateLimitResponse` from the rate-limit modules.
- Auth check returns 401 when `!user` (unchanged).
- Tenant ID extraction returns 401 when missing.
- `withRateLimit(apolloRateLimiter, \`tenant:${tenantId}\`)` runs before `request.json()`.
- `rateLimitResponse(rateLimit)` is returned when `!rateLimit.success`.
- Mock-mode branch, Zod validation, `bulkEnrichPeople` call, and catch block are byte-for-byte unchanged.
- `npx tsc --noEmit` reports no errors in this file.
  </done>
</task>

<task type="auto">
  <name>Task 2: Rate-limit POST /api/prospects/[prospectId]/enrich</name>
  <files>src/app/api/prospects/[prospectId]/enrich/route.ts</files>
  <action>
Add a rate-limit guard immediately after the existing tenant extraction in the POST handler. Do NOT touch auth, UUID resolution, prospect fetch, staleness check, in-progress check, Inngest send, event-id update, or the catch block.

**Step 1 — Add two imports** after the existing import block (after line 6, `import { ApiError, handleApiError } from "@/lib/api-error";`):

```typescript
import { apolloRateLimiter } from "@/lib/rate-limit/limiters";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit/middleware";
```

**Step 2 — Insert rate-limit block** immediately AFTER the existing tenant null-check (after line 40, `}`) and BEFORE the `// Extract prospectId from route params` comment (line 42).

Before (lines 37–43):
```typescript
    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      throw new ApiError("No tenant ID found in session", "UNAUTHORIZED", 401);
    }

    // Extract prospectId from route params
    const { prospectId: rawProspectId } = await context.params;
```

After:
```typescript
    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      throw new ApiError("No tenant ID found in session", "UNAUTHORIZED", 401);
    }

    const rateLimit = await withRateLimit(apolloRateLimiter, `tenant:${tenantId}`);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    // Extract prospectId from route params
    const { prospectId: rawProspectId } = await context.params;
```

**Rules:**
- Rate limit runs BEFORE the prospect lookup (saves a DB round-trip for abusive callers).
- Returning `rateLimitResponse(rateLimit)` (a raw `Response`) from inside the try-block is fine — it short-circuits before reaching the Inngest send and is not caught by the catch block (Response returns are not thrown).
- Do NOT convert the existing `throw new ApiError(...)` calls to rate-limit returns — keep them as-is.
- Do NOT touch the UUID_REGEX resolution, the `.select("...")` prospect fetch, the tenant double-check, the `force` param, the staleness arithmetic, the in-progress check, the `inngest.send`, the `inngest_event_id` update, or the catch block with `handleApiError`.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "prospects/\[prospectId\]/enrich/route\.ts" || echo "OK: prospects enrich route typechecks clean"</automated>
  </verify>
  <done>
- File imports `apolloRateLimiter`, `withRateLimit`, `rateLimitResponse`.
- Auth + tenant extraction + existing 401 `throw new ApiError` are unchanged.
- `withRateLimit(apolloRateLimiter, \`tenant:${tenantId}\`)` runs immediately after tenant extraction.
- `rateLimitResponse(rateLimit)` is returned when `!rateLimit.success`, BEFORE the prospect DB lookup.
- UUID regex, prospect fetch, staleness check, in-progress check, Inngest send, event-id update, and catch block are byte-for-byte unchanged.
- `npx tsc --noEmit` reports no errors in this file.
  </done>
</task>

<task type="auto">
  <name>Task 3: Wrap bulkEnrichPeople in apolloBulkEnrichBreaker</name>
  <files>src/lib/circuit-breaker/apollo-breaker.ts</files>
  <action>
Add a second opossum circuit breaker around the bulk enrichment network call. The existing `apolloSearchRequest`, `apolloBreaker`, its three event listeners, and the `options` constant MUST remain untouched.

**Step 1 — Rename the existing `bulkEnrichPeople` implementation to a private helper.**

Change line 61:
```typescript
export async function bulkEnrichPeople(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
```

To:
```typescript
async function bulkEnrichPeopleImpl(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
```

(Remove the `export` keyword and rename to `bulkEnrichPeopleImpl`. Leave the entire function body — the `if (apolloIds.length === 0) return [];` check, the `apiKey` read, the `enrichUrl` fetch, the 429 handling, the non-OK handling, the JSON parse, and the `.map` return — byte-for-byte unchanged.)

**Step 2 — Add the new breaker + event listeners + exported wrapper** at the bottom of the file, AFTER the last existing `apolloBreaker.on("close", ...)` listener (after line 135). Append:

```typescript

/**
 * Circuit breaker for Apollo bulk enrichment.
 * Shares the same threshold/timeout config as apolloBreaker.
 * NO fallback — errors propagate so callers can return proper HTTP status codes.
 */
const apolloBulkEnrichBreaker = new CircuitBreaker(bulkEnrichPeopleImpl, options);

apolloBulkEnrichBreaker.on("open", () => {
  console.error("[Bulk Enrich Circuit Breaker] OPEN — Apollo bulk enrich tripped. Will retry after 30s.");
});

apolloBulkEnrichBreaker.on("halfOpen", () => {
  console.warn("[Bulk Enrich Circuit Breaker] HALF-OPEN — Testing if Apollo bulk enrich has recovered...");
});

apolloBulkEnrichBreaker.on("close", () => {
  console.info("[Bulk Enrich Circuit Breaker] CLOSED — Apollo bulk enrich recovered, normal operation resumed.");
});

/**
 * Public bulkEnrichPeople — wraps the implementation in a dedicated circuit breaker.
 * Signature unchanged from before: (apolloIds: string[]) => Promise<ApolloPerson[]>.
 */
export async function bulkEnrichPeople(
  apolloIds: string[]
): Promise<ApolloPerson[]> {
  return apolloBulkEnrichBreaker.fire(apolloIds);
}
```

**Rules:**
- Reuse the existing `options` const (`{ timeout: 15000, errorThresholdPercentage: 50, resetTimeout: 30000, volumeThreshold: 5 }`) — do NOT redefine options.
- Do NOT export `apolloBulkEnrichBreaker` (keep it private to this file, like the absence of fallback on `apolloBreaker`).
- Do NOT touch `apolloSearchRequest`, `apolloBreaker`, or any of the three `apolloBreaker.on(...)` listeners.
- Do NOT change the function body inside `bulkEnrichPeopleImpl` (same apiKey read, same fetch, same 429 check, same error message, same return shape).
- **No cast needed** on `.fire(apolloIds)` — opossum's `CircuitBreaker<TI, TR>` generic infers `TR = Promise<ApolloPerson[]>` from the wrapped function signature. This matches the existing pattern in `src/lib/apollo/client.ts:200` where `apolloBreaker.fire(apolloParams)` is called with no cast and the caller accesses `.people` directly on the inferred return type. (Task spec mentioned `as Promise<ApolloPerson[]>` but the actual codebase pattern is untyped/inferred — follow the codebase pattern.)
- The public `bulkEnrichPeople` export MUST keep the exact signature `(apolloIds: string[]) => Promise<ApolloPerson[]>` so `src/app/api/apollo/bulk-enrich/route.ts:3` and any other importers compile without changes.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "circuit-breaker/apollo-breaker\.ts|apollo/bulk-enrich/route\.ts" || echo "OK: apollo-breaker and its importers typecheck clean"</automated>
  </verify>
  <done>
- `apolloSearchRequest`, `apolloBreaker`, the `options` const, and all three `apolloBreaker.on(...)` listeners are untouched.
- A private `bulkEnrichPeopleImpl(apolloIds)` function exists with the original fetch body.
- A private `const apolloBulkEnrichBreaker = new CircuitBreaker(bulkEnrichPeopleImpl, options)` exists.
- Three new listeners on `apolloBulkEnrichBreaker` (open/halfOpen/close) log with `[Bulk Enrich Circuit Breaker]` prefix.
- The exported `bulkEnrichPeople(apolloIds: string[]): Promise<ApolloPerson[]>` wrapper calls `apolloBulkEnrichBreaker.fire(apolloIds)`.
- `src/app/api/apollo/bulk-enrich/route.ts` still imports and uses `bulkEnrichPeople` with no changes needed.
- `npx tsc --noEmit` reports zero errors in `apollo-breaker.ts` and its importers.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete, run:

```bash
npx tsc --noEmit -p tsconfig.json
```

Expect zero errors. Then spot-check the three files:

```bash
# Confirm both routes import the rate limiter
rg "apolloRateLimiter" src/app/api/apollo/bulk-enrich/route.ts src/app/api/prospects/\[prospectId\]/enrich/route.ts

# Confirm the new breaker exists
rg "apolloBulkEnrichBreaker" src/lib/circuit-breaker/apollo-breaker.ts

# Confirm the existing search breaker is still there
rg "apolloBreaker\.on" src/lib/circuit-breaker/apollo-breaker.ts
# Should print 3 lines (open, halfOpen, close)

# Confirm public API unchanged
rg "export async function bulkEnrichPeople|export const apolloBreaker" src/lib/circuit-breaker/apollo-breaker.ts
```
</verification>

<success_criteria>
1. `npx tsc --noEmit` passes with zero errors.
2. Both enrich routes call `withRateLimit(apolloRateLimiter, \`tenant:${tenantId}\`)` before any credit-burning work.
3. Both routes return `rateLimitResponse(result)` (a 429 with `X-RateLimit-*` headers) when the limit is exceeded.
4. `src/lib/circuit-breaker/apollo-breaker.ts` exports `bulkEnrichPeople` with the same signature as before, now routed through `apolloBulkEnrichBreaker.fire(...)`.
5. `apolloSearchRequest`, `apolloBreaker`, and its listeners are byte-for-byte unchanged.
6. No unrelated imports, no renamed variables outside the specified rename, no refactoring of surrounding code.
</success_criteria>

<output>
After completion, create `.planning/quick/260409-rzz-apollo-safety-retry-on-4xx-fix-rate-limi/260409-rzz-01-SUMMARY.md` with a short list of the three changes and the typecheck result.
</output>
