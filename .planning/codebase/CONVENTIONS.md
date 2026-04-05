# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- Components: kebab-case with descriptive names (`prospect-slide-over.tsx`, `market-intelligence-card.tsx`)
- Utilities/hooks: kebab-case (`use-count-up.ts`, `use-search.ts`)
- API routes: directories follow dynamic routing, handlers are `route.ts`
- Test files: collocated with source in `__tests__` directories (`src/lib/apollo/__tests__/client.test.ts`)

**Functions:**
- camelCase for all functions and methods
- Async functions clearly named with purpose: `enrichContactOut`, `logProspectActivity`, `executeResearch`
- Helper functions prefixed descriptively: `createCircuitBreaker`, `createClient`, `formatCurrency`
- Private/internal functions preceded by underscore in limited cases (see: `_isPublicCompany` in enrichment)

**Variables:**
- camelCase for all variables and parameters
- Boolean variables prefix with verb or state: `hasMore`, `isPublicCompany`, `circuitOpen`, `found`
- Constants in UPPER_SNAKE_CASE: `DEFAULT_BREAKER_OPTIONS`, `STALE_THRESHOLD_MS`, `CATEGORY_COLORS`
- TypeScript type parameters use generics consistently: `<T>`, `<TArgs>`, `<TResult>`

**Types:**
- PascalCase for all types, interfaces, and enums
- Interfaces for object shapes: `ButtonProps`, `MarketIntelligenceCardProps`, `ProspectActivity`
- Union types with descriptive names: `ApiErrorCode`, `ActivityCategory`, `EventType`
- Type inference with `z.infer<>` for Zod schemas: `type CreateTenantInput = z.infer<typeof createTenantSchema>`
- Database row types consistently capitalized: `ProspectActivity`, `CreateActivityParams`

## Code Style

**Formatting:**
- No explicit Prettier config in repo (uses Next.js defaults via ESLint)
- Imports use double quotes: `import { clsx, type ClassValue } from "clsx"`
- Line length implicitly ~100 characters based on existing code
- Trailing commas in multi-line structures
- Space before `{` in function declarations: `function formatCurrency(value: number): string {`

**Linting:**
- ESLint config in `.eslintrc.json` extends `next/core-web-vitals` and `next/typescript`
- Unused variable rule: underscore prefix pattern (`^_`) allowed
  - Example: `const { isPublicCompany: _isPublicCompany } = event.data` to silence warnings
- Type imports: explicit `import type { ... }` for type-only imports
- All TypeScript strict mode enabled (`"strict": true` in tsconfig.json)

## Import Organization

**Order:**
1. External packages (React, third-party libraries)
2. Sibling packages (@supabase, @anthropic-ai, etc.)
3. Internal absolute imports (`@/lib`, `@/types`, `@/components`)
4. Internal relative imports (rare)

**Path Aliases:**
- `@/*` → `./src/*` (configured in tsconfig.json)
- Always use `@/` prefix for imports from src directory
- Examples: `@/lib/utils`, `@/types/database`, `@/components/ui/button`

**Type-only imports:**
- Separate type imports: `import type { PersonaFilters } from '@/lib/personas/types'`
- Allows better tree-shaking and clearer intent

## Error Handling

**Patterns:**

**Fire-and-Forget Logging:**
- Activity and error logging never throws and never blocks
- Pattern: `.catch(() => {})` at call sites
- Example from `src/app/api/prospects/[prospectId]/notes/route.ts`:
  ```typescript
  logActivity({...}).catch(() => {});
  logProspectActivity({...}).catch(() => {});
  ```

**Structured API Errors:**
- Use `ApiError` class from `src/lib/api-error.ts` for consistent error responses
- Constructor: `new ApiError(message, code, status, details?)`
- Codes: `RATE_LIMITED`, `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `EXTERNAL_API_ERROR`, `INTERNAL_ERROR`
- Handler: `handleApiError(error)` converts to NextResponse with machine-readable code
- Example:
  ```typescript
  throw new ApiError(
    "Prospect not found",
    "NOT_FOUND",
    404
  );
  ```

**Null/Undefined Checks:**
- Explicit checks: `if (error)`, `if (!data)`, `if (!user)`
- Null coalescing for defaults: `value ?? fallback`
- Optional chaining for safe access: `user?.app_metadata?.tenant_id`
- Guard clauses at function start for early returns

**Promise Error Handling:**
- `.catch()` explicitly handling rejection (no silent failures)
- Try-catch blocks in async functions
- Functions marked "NEVER throws" use try-catch + return null pattern
- Example from `src/lib/activity.ts`:
  ```typescript
  try {
    const { data, error } = await supabase...
    if (error) {
      console.error("[logProspectActivity] Insert failed:", error);
      return null;
    }
    return data as ProspectActivity;
  } catch (error) {
    console.error("[logProspectActivity] Error:", error);
    return null;
  }
  ```

## Logging

**Framework:** Console methods (no dedicated logger library)

**Patterns:**
- Scope prefix in brackets: `console.error("[functionName]", message)`
- Used in every catch block and error path
- Example: `console.error("[CircuitBreaker] Circuit opened - requests will fail fast")`
- Structured logging with metadata objects in second parameter:
  ```typescript
  console.error("[handleApiError]", error);
  console.error("[Inngest] Enrichment workflow failed:", error);
  ```

**When to Log:**
- Error paths: always log in catch blocks
- Status changes: circuit breaker state transitions, enrichment steps
- API failures: external service errors with context
- Debug: parameter values and step progression in complex workflows

## Comments

**When to Comment:**
- Function-level JSDoc for public APIs and complex logic
- Complex business logic: enrichment workflows, filter relaxation, deduplication
- Non-obvious parameter handling: why a parameter is optional or has a default
- State machine transitions: step names in Inngest functions

**JSDoc/TSDoc:**
- Used extensively on exported functions and classes
- Documents purpose, parameters, return value, and side effects
- Example from `src/lib/activity.ts`:
  ```typescript
  /**
   * Log a prospect activity event to the prospect_activity table.
   *
   * Uses admin client to bypass RLS (called from server actions/API routes
   * that have already validated the user).
   *
   * NEVER throws -- fire-and-forget pattern. Returns null on failure.
   */
  ```

## Function Design

**Size:** Functions typically 30-100 lines; orchestrators (enrichment) up to 200+ lines

**Parameters:**
- Named parameters using destructuring for 2+ parameters
- API routes: `(request: NextRequest, context: { params: Promise<{ param: string }> })`
- Helper functions: `(params: { key1: type1; key2: type2 })`
- Generics for reusable utilities: `<T>`, `<TArgs extends unknown[]>`

**Return Values:**
- Explicit return types on all functions
- Async functions: `Promise<T>` or `Promise<T | null>`
- Fire-and-forget: `Promise<void>` (still awaited for sequencing)
- Objects with shape: `{ status: string; error?: string }`
- Type inference: use `satisfies` keyword for refinement without re-asserting
  - Example: `code: "INTERNAL_ERROR" satisfies ApiErrorCode`

## Module Design

**Exports:**
- Named exports preferred: `export function fn() {}`
- Default exports for page components in Next.js routes
- Type exports: `export type TypeName = ...`

**Barrel Files:**
- Not heavily used; imports are direct
- Example: `src/lib/search/channels/index.ts` exports registry for channels module

**File Organization:**
- One main export per file unless tightly coupled
- Utility files export multiple small functions: `src/lib/validations/schemas.ts`
- Type files are pure types: `src/types/activity.ts`, `src/lib/lists/types.ts`

## Async/Concurrency

**Patterns:**
- `async function` for all async operations
- `await` for sequential operations, explicit promises for concurrent
- React hooks use `useCallback` for stable function references in deps arrays
- `useEffect` with proper cleanup functions
- Inngest: `step.run(name, async () => { ... })` for durable steps

**Concurrency Management:**
- Circuit breakers wrap flaky external calls
- Inngest concurrency limits: `concurrency: [{ limit: 5 }]` to manage API rate limits
- Rate limiting at middleware level for auth endpoints
- Batch operations use Promise.all for true parallelism where safe

## Validation

**Framework:** Zod for schema validation

**Patterns:**
- Schemas defined in `src/lib/validations/schemas.ts`
- Type inference: `type LoginInput = z.infer<typeof loginSchema>`
- Schemas used in API routes for body validation
- Custom validators: `.refine()` for complex logic
- Example:
  ```typescript
  export const tenantSlugSchema = z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase alphanumeric with hyphens");
  ```

---

*Convention analysis: 2026-04-05*
