# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Globals: true (describe, it, expect available without import)
- Environment: node

**Assertion Library:**
- Vitest built-in expect (compatible with Jest API)

**Run Commands:**
```bash
npm test                          # Run all tests with vitest
npm test -- --ui                 # Run with Vitest UI dashboard
npm test -- --coverage           # Run with coverage report
npm test -- --watch              # Watch mode
```

## Test File Organization

**Location:**
- Colocated in `__tests__` subdirectories next to source code
- Example: `src/lib/apollo/__tests__/client.test.ts` for `src/lib/apollo/client.ts`
- Convention: `__tests__` folder at same level as source being tested

**Naming:**
- `*.test.ts` suffix for test files
- Example: `enrich-prospect.test.ts`, `client.test.ts`, `execute-research.test.ts`

**Structure:**
```
src/
├── lib/
│   ├── apollo/
│   │   ├── client.ts
│   │   └── __tests__/
│   │       └── client.test.ts
│   ├── search/
│   │   ├── execute-research.ts
│   │   └── __tests__/
│   │       └── execute-research.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("module name", () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it("should do specific thing", () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = fn(input);
    
    // Assert
    expect(result).toEqual(...);
  });

  describe("nested suite", () => {
    it("nested test", () => {
      // ...
    });
  });
});
```

**Patterns:**

**Setup/Teardown:**
- `beforeEach()` for clearing mocks and resetting state
- `afterEach()` less common; cleanup usually happens in mocks
- No explicit teardown typically needed due to Vitest isolation

**Assertion Patterns:**
- `expect(value).toEqual(expectedObject)` for deep equality
- `expect(fn).toHaveBeenCalledOnce()` for call verification
- `expect(fn).toHaveBeenCalledWith(args)` for argument checking
- `expect(result).toBeDefined()` for existence checks
- `expect(result).toHaveLength(n)` for collections
- `expect(fn).not.toHaveBeenCalled()` for non-invocation

## Mocking

**Framework:** `vi` from Vitest (vi.fn, vi.mock, vi.hoisted)

**Patterns:**

**Module Mocking (vi.mock):**
```typescript
// Must be hoisted before module import
vi.mock("@/lib/enrichment/contactout", () => ({
  enrichContactOut: (...args: unknown[]) => mockEnrichContactOut(...args),
}));

// Defines behavior per test
mockEnrichContactOut.mockResolvedValue({
  found: true,
  personalEmail: "john@personal.com",
  phone: "+15551234567",
});
```

**Function Mocking (vi.fn):**
```typescript
const mockUpdateCalls: Array<{ table: string; data: Record<string, unknown> }> = [];
const mockUpdate = vi.fn((data: Record<string, unknown>) => {
  const chain = {
    eq: vi.fn((_col: string, id: string) => {
      mockUpdateCalls.push({ table: "prospects", data, id });
      return Promise.resolve({ error: null });
    }),
  };
  return chain;
});
```

**Hoisted Variables (vi.hoisted):**
- Declared before vi.mock for access within mock factories
- From `execute-research.test.ts`:
  ```typescript
  const {
    mockChannelRegistry,
    mockClassifyIntent,
    mockMergeAndRank,
  } = vi.hoisted(() => ({
    mockChannelRegistry: new Map<string, (params: unknown) => Promise<unknown>>(),
    mockClassifyIntent: vi.fn(),
    mockMergeAndRank: vi.fn(),
  }));
  ```

**What to Mock:**
- External API calls (Supabase, ContactOut, Exa, EDGAR)
- Service dependencies (activity logging, enrichment sources)
- Rate limiters and circuit breakers
- Side-effect operations (logging, telemetry)

**What NOT to Mock:**
- Core business logic functions (filter translation, enrichment orchestration)
- Data structure transformations
- Validation logic (Zod schemas)
- Utilities (currency formatting, date calculations)

## Fixtures and Factories

**Test Data:**
```typescript
function makeParams(overrides: Partial<ResearchParams> = {}): ResearchParams {
  return {
    query: "recent insider transactions",
    prospect: {
      id: "prospect-001",
      full_name: "Jane Smith",
      company: "Globex Corp",
      title: "CFO",
      publicly_traded_symbol: "GLBX",
      company_cik: "0001234567",
      location: "New York, NY",
    },
    tenantId: "tenant-001",
    ...overrides,
  };
}

function makeExaOutput(results: ChannelOutput["results"] = []): ChannelOutput {
  return {
    channelId: "exa",
    results,
    cached: false,
    latencyMs: 120,
  };
}
```

**Location:**
- Defined at top of test file, within describe block
- Reusable helpers for constructing test objects
- Override pattern: `makeParams({ query: "custom query" })` replaces defaults

## Coverage

**Requirements:** None enforced (no coverage threshold in vitest.config.ts)

**View Coverage:**
```bash
npm test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Single function or small module
- Examples: `calculatePagination()`, `translateFiltersToApolloParams()`
- Approach: Test input/output with multiple scenarios
- From `client.test.ts`:
  ```typescript
  it('maps all PersonaFilters fields to Apollo API parameters', () => {
    const filters: PersonaFilters = { ... };
    const result = translateFiltersToApolloParams(filters);
    expect(result).toEqual({ ... });
  });
  ```

**Integration Tests:**
- Scope: Multi-step workflows with mocked external dependencies
- Examples: Enrichment pipeline (enrich-prospect.test.ts), research execution
- Approach: Setup mocks, invoke orchestrator, verify all steps run in order
- From `enrich-prospect.test.ts`:
  ```typescript
  it("calls each enrichment step in the correct order", async () => {
    const result = await runEnrichment();
    
    expect(mockEnrichContactOut).toHaveBeenCalledOnce();
    expect(mockEnrichExa).toHaveBeenCalledOnce();
    expect(mockGenerateProspectSummary).toHaveBeenCalledOnce();
  });
  ```

**E2E Tests:**
- Framework: Not used (no end-to-end test suite in repo)
- Manual testing via Vercel preview deployments or local dev server

## Common Patterns

**Async Testing:**
```typescript
it("continues if ContactOut fails - Exa and Claude still run", async () => {
  mockEnrichContactOut.mockRejectedValue(new Error("ContactOut API down"));

  const result = await runEnrichment();

  expect(result.enrichmentStatus).toBe("complete");
  expect(result.sources.contactout).toBe("failed");
  expect(mockEnrichExa).toHaveBeenCalledOnce();
});
```

**Error Testing:**
```typescript
it("handles ContactOut returning circuit-open state", async () => {
  mockEnrichContactOut.mockResolvedValue({
    found: false,
    circuitOpen: true,
  });

  const result = await runEnrichment();

  expect(result.sources.contactout).toBe("circuit_open");
});
```

**Call Verification:**
```typescript
it("passes correct parameters to Exa", async () => {
  await runEnrichment();

  expect(mockEnrichExa).toHaveBeenCalledWith({
    name: "John Doe",
    company: "Acme Corp",
    title: "CEO",
  });
});
```

**State Tracking:**
From `enrich-prospect.test.ts`, tracking all Supabase calls:
```typescript
const supabaseUpdateCalls: Array<{ table: string; data: Record<string, unknown>; id: string }> = [];
const mockUpdate = vi.fn((data: Record<string, unknown>) => {
  // ... push to supabaseUpdateCalls ...
});

it("writes contact_data to prospect record when ContactOut succeeds", async () => {
  await runEnrichment();

  const contactUpdate = supabaseUpdateCalls.find(
    (c) => c.table === "prospects" && c.data.contact_data !== undefined
  );
  expect(contactUpdate).toBeDefined();
  expect((contactUpdate!.data.contact_data as Record<string, unknown>).personal_email).toBe("john@personal.com");
});
```

## Test Execution Strategy

**Inngest Function Testing:**
- Cannot call Inngest wrapper directly due to SDK architecture
- Extract handler via internal structure:
  ```typescript
  const handler = (enrichProspect as unknown as { fn: (ctx: unknown) => Promise<unknown> }).fn;
  if (typeof handler === "function") {
    return handler({
      event: { data: eventData },
      step: stepHarness,
    });
  }
  ```
- Create custom step harness to simulate `step.run()`:
  ```typescript
  function createStepHarness() {
    const stepsExecuted: string[] = [];
    const run: StepRunFn = async (name, fn) => {
      stepsExecuted.push(name);
      return fn();
    };
    return { run, stepsExecuted };
  }
  ```
- Verify step execution order through harness tracking

## Test Organization Examples

**Simple Unit Test (client.test.ts):**
- 174 lines total
- 2 describe blocks for 2 functions
- 11 test cases covering edge cases (empty filters, zero results, boundary conditions)
- No mocks (pure functions)
- Assertion-focused

**Complex Integration Test (enrich-prospect.test.ts):**
- 594 lines total
- 16 hoisted mocks for dependencies
- 1 describe block with 15 test cases
- Mock setup in beforeEach with default happy-path values
- Per-test overrides for different scenarios
- Verification of partial failures (one step fails, others continue)
- State tracking via call interception

**Medium Integration Test (execute-research.test.ts):**
- Hoisted variables for mock setup
- Channel registry mocking
- Intent classifier mocking
- Helper functions for creating test inputs and outputs
- Focuses on channel coordination and result merging

## Best Practices Observed

1. **Comprehensive happy path**: Every integration test includes success scenario
2. **Partial failure handling**: Tests verify resilience (some steps fail, pipeline continues)
3. **Argument verification**: Mock call assertions check exact parameters, not just that it was called
4. **Default mock resets**: `beforeEach(() => vi.clearAllMocks())` ensures test isolation
5. **Descriptive test names**: Use "should" language: "should do X when Y", "should handle Z gracefully"
6. **Skip optional behavior**: Tests confirm skipped steps when conditions aren't met
7. **Return value inspection**: Both happy path and error path results verified

---

*Testing analysis: 2026-04-05*
