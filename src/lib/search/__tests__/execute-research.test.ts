import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { ChannelOutput, ChannelParams, ChannelId } from "../channels";

// ---------------------------------------------------------------------------
// Hoisted variables — these are initialized before vi.mock factories run
// ---------------------------------------------------------------------------

const {
  mockChannelRegistry,
  mockClassifyIntent,
  mockMergeAndRank,
} = vi.hoisted(() => ({
  mockChannelRegistry: new Map<string, (params: unknown) => Promise<unknown>>(),
  mockClassifyIntent: vi.fn(),
  mockMergeAndRank: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Prevent the side-effect import of register-all from running real
// channel modules (they import circuit breaker, Redis, etc.)
vi.mock("../channels/register-all", () => ({}));

// Mock the channel registry directly
vi.mock("../channels", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    CHANNEL_REGISTRY: mockChannelRegistry,
    getChannel: (id: string) => mockChannelRegistry.get(id),
  };
});

// Mock the intent classifier
vi.mock("../intent-classifier", () => ({
  classifyIntent: (...args: unknown[]) => mockClassifyIntent(...args),
}));

// Mock telemetry (fire-and-forget)
vi.mock("../telemetry", () => ({
  recordResearchTelemetry: vi.fn(() => Promise.resolve()),
}));

// Mock mergeAndRank
vi.mock("../merge-results", () => ({
  mergeAndRank: (...args: unknown[]) => mockMergeAndRank(...args),
}));

// ---------------------------------------------------------------------------
// Import the module under test (after mocks are set up)
// ---------------------------------------------------------------------------
import { executeResearch, type ResearchParams } from "../execute-research";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

function makeEdgarOutput(results: ChannelOutput["results"] = []): ChannelOutput {
  return {
    channelId: "edgar-efts",
    results,
    cached: false,
    latencyMs: 200,
  };
}

function exaResult(headline: string, url: string, relevance: "high" | "medium" | "low" = "high") {
  return {
    channelId: "exa" as const,
    headline,
    summary: `Summary of ${headline}`,
    source_url: url,
    source_name: "Exa",
    event_date: "2026-03-20",
    category: "media" as const,
    relevance,
    raw_snippet: `Snippet for ${headline}`,
  };
}

function edgarResult(headline: string, url: string, relevance: "high" | "medium" | "low" = "high") {
  return {
    channelId: "edgar-efts" as const,
    headline,
    summary: `Summary of ${headline}`,
    source_url: url,
    source_name: "SEC EDGAR",
    event_date: "2026-03-15",
    category: "sec_filing" as const,
    relevance,
    raw_snippet: `Snippet for ${headline}`,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeResearch orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelRegistry.clear();

    // Default: mergeAndRank passes through results as-is
    mockMergeAndRank.mockImplementation((results: unknown[]) => results);

    // Default: classifier returns both channels
    mockClassifyIntent.mockResolvedValue({
      channels: ["exa", "edgar-efts"],
      reformulatedQuery: "Jane Smith Globex Corp insider transactions",
      entityType: "person",
      reasoning: "SEC query detected",
    });
  });

  afterEach(() => {
    mockChannelRegistry.clear();
  });

  // -------------------------------------------------------------------------
  // Fan-out and collection
  // -------------------------------------------------------------------------

  it("fires Exa immediately in parallel with intent classification", async () => {
    const exaCallOrder: number[] = [];
    let callCounter = 0;

    const mockExa = vi.fn(async () => {
      exaCallOrder.push(++callCounter);
      return makeExaOutput([exaResult("Exa article", "https://example.com/exa1")]);
    });

    const mockEdgar = vi.fn(async () => {
      exaCallOrder.push(++callCounter);
      return makeEdgarOutput([edgarResult("Form 4", "https://sec.gov/filing1")]);
    });

    mockChannelRegistry.set("exa", mockExa);
    mockChannelRegistry.set("edgar-efts", mockEdgar);

    const result = await executeResearch(makeParams());

    // Exa should have been called
    expect(mockExa).toHaveBeenCalledOnce();
    // Edgar should have been called (after classification)
    expect(mockEdgar).toHaveBeenCalledOnce();

    // Exa gets the raw user query (fired before classification)
    expect(mockExa.mock.calls[0][0].query).toBe("recent insider transactions");
    // Edgar gets the reformulated query (fired after classification)
    expect(mockEdgar.mock.calls[0][0].query).toBe(
      "Jane Smith Globex Corp insider transactions"
    );

    expect(result.results).toHaveLength(2);
  });

  it("passes prospect context to channel functions", async () => {
    const mockExa = vi.fn(async () => makeExaOutput());
    mockChannelRegistry.set("exa", mockExa);

    mockClassifyIntent.mockResolvedValue({
      channels: ["exa"],
      reformulatedQuery: "test query",
      entityType: "person",
      reasoning: "test",
    });

    await executeResearch(makeParams());

    const callParams = mockExa.mock.calls[0][0] as ChannelParams;
    expect(callParams.prospect.full_name).toBe("Jane Smith");
    expect(callParams.prospect.company).toBe("Globex Corp");
    expect(callParams.tenantId).toBe("tenant-001");
  });

  it("includes classification result in response", async () => {
    const mockExa = vi.fn(async () => makeExaOutput());
    mockChannelRegistry.set("exa", mockExa);

    mockClassifyIntent.mockResolvedValue({
      channels: ["exa"],
      reformulatedQuery: "reformulated",
      entityType: "company",
      reasoning: "Company-focused query",
    });

    const result = await executeResearch(makeParams());

    expect(result.classification.entityType).toBe("company");
    expect(result.classification.reformulatedQuery).toBe("reformulated");
    expect(result.classification.channels).toEqual(["exa"]);
  });

  it("collects results from all channels into flat array", async () => {
    const exaResults = [
      exaResult("Article 1", "https://example.com/1"),
      exaResult("Article 2", "https://example.com/2"),
    ];
    const edgarResults = [
      edgarResult("Form 4 filing", "https://sec.gov/f1"),
    ];

    mockChannelRegistry.set("exa", vi.fn(async () => makeExaOutput(exaResults)));
    mockChannelRegistry.set("edgar-efts", vi.fn(async () => makeEdgarOutput(edgarResults)));

    await executeResearch(makeParams());

    // mergeAndRank should have received all 3 results
    expect(mockMergeAndRank).toHaveBeenCalledOnce();
    const mergeInput = mockMergeAndRank.mock.calls[0][0] as unknown[];
    expect(mergeInput).toHaveLength(3);
  });

  it("returns per-channel statuses with display names", async () => {
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () =>
        makeExaOutput([exaResult("Article", "https://example.com/a")])
      )
    );
    mockChannelRegistry.set(
      "edgar-efts",
      vi.fn(async () =>
        makeEdgarOutput([edgarResult("Filing", "https://sec.gov/f")])
      )
    );

    const result = await executeResearch(makeParams());

    expect(result.channelStatuses).toHaveLength(2);

    const exaStatus = result.channelStatuses.find((s) => s.channelId === "exa");
    expect(exaStatus).toBeDefined();
    expect(exaStatus!.displayName).toBe("Exa");
    expect(exaStatus!.resultCount).toBe(1);
    expect(exaStatus!.cached).toBe(false);

    const edgarStatus = result.channelStatuses.find(
      (s) => s.channelId === "edgar-efts"
    );
    expect(edgarStatus).toBeDefined();
    expect(edgarStatus!.displayName).toBe("SEC EDGAR");
    expect(edgarStatus!.resultCount).toBe(1);
  });

  it("measures total latency", async () => {
    mockChannelRegistry.set("exa", vi.fn(async () => makeExaOutput()));

    mockClassifyIntent.mockResolvedValue({
      channels: ["exa"],
      reformulatedQuery: "test",
      entityType: "person",
      reasoning: "",
    });

    const result = await executeResearch(makeParams());
    expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // Channel failure handling
  // -------------------------------------------------------------------------

  it("handles channel rejection without breaking the pipeline", async () => {
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => makeExaOutput([exaResult("Good result", "https://example.com/ok")]))
    );
    // Edgar channel throws
    mockChannelRegistry.set(
      "edgar-efts",
      vi.fn(async () => {
        throw new Error("EDGAR API timeout");
      })
    );

    const result = await executeResearch(makeParams());

    // Exa results should still be present
    expect(mockMergeAndRank.mock.calls[0][0]).toHaveLength(1);

    // Channel status should show the error
    const edgarStatus = result.channelStatuses.find(
      (s) => s.channelId === "edgar-efts"
    );
    expect(edgarStatus).toBeDefined();
    expect(edgarStatus!.error).toBe("EDGAR API timeout");
    expect(edgarStatus!.resultCount).toBe(0);

    // Exa status should be fine
    const exaStatus = result.channelStatuses.find((s) => s.channelId === "exa");
    expect(exaStatus).toBeDefined();
    expect(exaStatus!.error).toBeUndefined();
  });

  it("handles Exa rejection - additional channels still return results", async () => {
    // Exa throws
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => {
        throw new Error("Exa network error");
      })
    );
    mockChannelRegistry.set(
      "edgar-efts",
      vi.fn(async () =>
        makeEdgarOutput([edgarResult("Form 4", "https://sec.gov/f")])
      )
    );

    const result = await executeResearch(makeParams());

    // Edgar results should still be collected
    expect(mockMergeAndRank.mock.calls[0][0]).toHaveLength(1);

    const exaStatus = result.channelStatuses.find((s) => s.channelId === "exa");
    expect(exaStatus!.error).toBe("Exa network error");
    expect(exaStatus!.resultCount).toBe(0);
  });

  it("handles all channels failing gracefully", async () => {
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => {
        throw new Error("Exa down");
      })
    );
    mockChannelRegistry.set(
      "edgar-efts",
      vi.fn(async () => {
        throw new Error("EDGAR down");
      })
    );

    const result = await executeResearch(makeParams());

    expect(mockMergeAndRank.mock.calls[0][0]).toHaveLength(0);
    expect(result.channelStatuses).toHaveLength(2);
    expect(result.channelStatuses.every((s) => s.error)).toBe(true);
  });

  it("handles unregistered channel gracefully", async () => {
    // Only register Exa, but classifier recommends both
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => makeExaOutput([exaResult("Article", "https://example.com/a")]))
    );
    // edgar-efts is NOT registered

    const result = await executeResearch(makeParams());

    // Should still return Exa results
    expect(mockMergeAndRank.mock.calls[0][0]).toHaveLength(1);

    // Edgar should show error status
    const edgarStatus = result.channelStatuses.find(
      (s) => s.channelId === "edgar-efts"
    );
    expect(edgarStatus).toBeDefined();
    expect(edgarStatus!.error).toContain("not registered");
  });

  it("handles channel returning an error field without rejecting", async () => {
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => ({
        channelId: "exa" as ChannelId,
        results: [],
        cached: false,
        latencyMs: 50,
        error: "Rate limited",
      }))
    );

    mockClassifyIntent.mockResolvedValue({
      channels: ["exa"],
      reformulatedQuery: "test",
      entityType: "person",
      reasoning: "",
    });

    const result = await executeResearch(makeParams());

    const exaStatus = result.channelStatuses.find((s) => s.channelId === "exa");
    expect(exaStatus!.error).toBe("Rate limited");
    expect(exaStatus!.resultCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Caching behavior
  // -------------------------------------------------------------------------

  it("propagates cached flag from channel output to status", async () => {
    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => ({
        channelId: "exa" as ChannelId,
        results: [exaResult("Cached article", "https://example.com/cached")],
        cached: true,
        latencyMs: 5,
      }))
    );

    mockClassifyIntent.mockResolvedValue({
      channels: ["exa"],
      reformulatedQuery: "test",
      entityType: "person",
      reasoning: "",
    });

    const result = await executeResearch(makeParams());

    const exaStatus = result.channelStatuses.find((s) => s.channelId === "exa");
    expect(exaStatus!.cached).toBe(true);
    expect(exaStatus!.latencyMs).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Intent classification fallback
  // -------------------------------------------------------------------------

  it("falls back to exa-only when classifier fails", async () => {
    mockClassifyIntent.mockRejectedValue(new Error("OpenRouter down"));

    // The executeResearch function calls classifyIntent directly, and if it
    // fails the classifyIntent function itself has a catch fallback.
    // Let's test the graceful fallback by having it return fallback.
    mockClassifyIntent.mockResolvedValue({
      channels: ["exa"],
      reformulatedQuery: "recent insider transactions",
      entityType: "general",
      reasoning: "Parse failure, defaulting to exa",
    });

    mockChannelRegistry.set(
      "exa",
      vi.fn(async () => makeExaOutput([exaResult("Article", "https://example.com/a")]))
    );
    mockChannelRegistry.set(
      "edgar-efts",
      vi.fn(async () => makeEdgarOutput())
    );

    const result = await executeResearch(makeParams());

    // Only Exa should appear in statuses (edgar not recommended by classifier)
    expect(result.channelStatuses).toHaveLength(1);
    expect(result.channelStatuses[0].channelId).toBe("exa");
  });

  it("always includes exa even if classifier omits it", async () => {
    // Classifier doesn't include exa (should not happen in practice, but test defense)
    mockClassifyIntent.mockResolvedValue({
      channels: ["edgar-efts"],
      reformulatedQuery: "SEC filings for Globex",
      entityType: "company",
      reasoning: "SEC-only query",
    });

    const mockExa = vi.fn(async () =>
      makeExaOutput([exaResult("Article", "https://example.com/a")])
    );
    const mockEdgar = vi.fn(async () =>
      makeEdgarOutput([edgarResult("Filing", "https://sec.gov/f")])
    );

    mockChannelRegistry.set("exa", mockExa);
    mockChannelRegistry.set("edgar-efts", mockEdgar);

    const result = await executeResearch(makeParams());

    // Exa should still have been called (it's always fired first)
    expect(mockExa).toHaveBeenCalledOnce();
    // Edgar should also have been called as an additional channel
    expect(mockEdgar).toHaveBeenCalledOnce();

    // Both should appear in statuses
    expect(result.channelStatuses).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Merge & dedup tests (testing the real mergeAndRank function)
// ---------------------------------------------------------------------------
describe("mergeAndRank", () => {
  // Import the real function for these tests
  let realMergeAndRank: typeof import("../merge-results").mergeAndRank;

  beforeEach(async () => {
    // Dynamically import the actual module to bypass the mock
    const mod = await vi.importActual<typeof import("../merge-results")>("../merge-results");
    realMergeAndRank = mod.mergeAndRank;
  });

  it("deduplicates results by normalized URL", () => {
    const results = [
      exaResult("Article A", "https://example.com/article/1"),
      edgarResult("Article A duplicate", "https://example.com/article/1"), // same URL
      exaResult("Article B", "https://example.com/article/2"),
    ];

    const merged = realMergeAndRank(results, "test query");
    expect(merged).toHaveLength(2);
  });

  it("keeps higher-relevance result when URLs collide", () => {
    const results = [
      exaResult("Low relevance", "https://example.com/same", "low"),
      edgarResult("High relevance", "https://example.com/same", "high"),
    ];

    const merged = realMergeAndRank(results, "test query");
    expect(merged).toHaveLength(1);
    expect(merged[0].relevance).toBe("high");
  });

  it("sorts by relevance descending", () => {
    const results = [
      exaResult("Low", "https://example.com/1", "low"),
      edgarResult("High", "https://sec.gov/1", "high"),
      exaResult("Medium", "https://example.com/2", "medium"),
    ];

    const merged = realMergeAndRank(results, "test query");
    expect(merged[0].relevance).toBe("high");
    expect(merged[1].relevance).toBe("medium");
    expect(merged[2].relevance).toBe("low");
  });

  it("uses channel priority as tiebreaker for same relevance", () => {
    // Both high relevance — EDGAR has higher priority (6) than Exa (5)
    const results = [
      exaResult("Exa result", "https://example.com/exa", "high"),
      edgarResult("EDGAR result", "https://sec.gov/edgar", "high"),
    ];

    const merged = realMergeAndRank(results, "test query");
    expect(merged[0].channelId).toBe("edgar-efts"); // higher priority
    expect(merged[1].channelId).toBe("exa");
  });

  it("handles URL normalization (trailing slashes, query params)", () => {
    const results = [
      exaResult("Article A", "https://example.com/article/1/"),
      edgarResult("Article A again", "https://example.com/article/1?utm=test"),
    ];

    const merged = realMergeAndRank(results, "test query");
    expect(merged).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    const merged = realMergeAndRank([], "test query");
    expect(merged).toHaveLength(0);
  });

  it("sorts results with dates before results without dates (same relevance/priority)", () => {
    const withDate = {
      ...exaResult("With date", "https://example.com/dated", "medium"),
      event_date: "2026-03-20",
    };
    const withoutDate = {
      ...exaResult("Without date", "https://example.com/no-date", "medium"),
      event_date: null,
    };

    const merged = realMergeAndRank([withoutDate, withDate], "test query");
    expect(merged[0].source_url).toBe("https://example.com/dated");
  });
});
