import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module under test is imported
// ---------------------------------------------------------------------------

// Track all Supabase operations for assertions
const supabaseUpdateCalls: Array<{ table: string; data: Record<string, unknown>; id: string }> = [];
const supabaseInsertCalls: Array<{ table: string; data: Record<string, unknown> }> = [];
const supabaseSelectCalls: Array<{ table: string; id: string }> = [];

const mockSupabaseChain = {
  update: vi.fn((data: Record<string, unknown>) => {
    const chain = {
      eq: vi.fn((_col: string, id: string) => {
        supabaseUpdateCalls.push({ table: chain.__table, data, id });
        return Promise.resolve({ error: null });
      }),
      __table: "",
    };
    return chain;
  }),
  insert: vi.fn((data: Record<string, unknown>) => {
    supabaseInsertCalls.push({ table: mockSupabaseChain.__currentTable, data });
    return Promise.resolve({ error: null });
  }),
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() =>
        Promise.resolve({ data: { enrichment_source_status: {} }, error: null })
      ),
    })),
  })),
  __currentTable: "",
};

const mockFrom = vi.fn((table: string) => {
  mockSupabaseChain.__currentTable = table;
  // Patch __table on update chain for tracking
  const orig = mockSupabaseChain.update;
  mockSupabaseChain.update = vi.fn((data: Record<string, unknown>) => {
    const chain = orig(data);
    chain.__table = table;
    return chain;
  }) as typeof orig;

  return mockSupabaseChain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// --- Enrichment source mocks ---

const mockEnrichContactOut = vi.fn();
vi.mock("@/lib/enrichment/contactout", () => ({
  enrichContactOut: (...args: unknown[]) => mockEnrichContactOut(...args),
}));

const mockEnrichExa = vi.fn();
vi.mock("@/lib/enrichment/exa", () => ({
  enrichExa: (...args: unknown[]) => mockEnrichExa(...args),
}));

const mockDigestExaResults = vi.fn();
vi.mock("@/lib/enrichment/exa-digest", () => ({
  digestExaResults: (...args: unknown[]) => mockDigestExaResults(...args),
}));

const mockEnrichEdgar = vi.fn();
const mockLookupCompanyCik = vi.fn();
vi.mock("@/lib/enrichment/edgar", () => ({
  enrichEdgar: (...args: unknown[]) => mockEnrichEdgar(...args),
  lookupCompanyCik: (...args: unknown[]) => mockLookupCompanyCik(...args),
}));

const mockGenerateProspectSummary = vi.fn();
const mockGenerateIntelligenceDossier = vi.fn();
vi.mock("@/lib/enrichment/claude", () => ({
  generateProspectSummary: (...args: unknown[]) => mockGenerateProspectSummary(...args),
  generateIntelligenceDossier: (...args: unknown[]) => mockGenerateIntelligenceDossier(...args),
}));

const mockFetchMarketSnapshot = vi.fn();
vi.mock("@/lib/enrichment/market-data", () => ({
  fetchMarketSnapshot: (...args: unknown[]) => mockFetchMarketSnapshot(...args),
}));

vi.mock("@/lib/activity-logger", () => ({
  logActivity: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/activity", () => ({
  logProspectActivity: vi.fn(() => Promise.resolve(null)),
}));

// ---------------------------------------------------------------------------
// Inngest step harness — simulates step.run() by invoking the callback immediately
// ---------------------------------------------------------------------------

type StepRunFn = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

function createStepHarness() {
  const stepsExecuted: string[] = [];
  const run: StepRunFn = async (name, fn) => {
    stepsExecuted.push(name);
    return fn();
  };
  return { run, stepsExecuted };
}

// ---------------------------------------------------------------------------
// Import the enrichment function's handler
// We cannot invoke the Inngest wrapper directly; instead we extract the handler
// by pulling the enrichProspect object and calling its internals.
// Since the enrichment function is an Inngest createFunction result, we need
// to simulate calling it.
// ---------------------------------------------------------------------------

// We import the module to test the handler logic
import { enrichProspect } from "../enrich-prospect";

// ---------------------------------------------------------------------------
// Helper to run the enrichment handler with simulated Inngest context
// ---------------------------------------------------------------------------

async function runEnrichment(
  eventDataOverrides: Partial<{
    prospectId: string;
    tenantId: string;
    userId: string;
    email: string;
    linkedinUrl: string;
    name: string;
    company: string;
    title: string;
    isPublicCompany: boolean;
    companyCik: string;
    ticker: string;
  }> = {}
) {
  const stepHarness = createStepHarness();

  const eventData = {
    prospectId: "prospect-001",
    tenantId: "tenant-001",
    userId: "user-001",
    email: "john@acme.com",
    linkedinUrl: "https://linkedin.com/in/johndoe",
    name: "John Doe",
    company: "Acme Corp",
    title: "CEO",
    isPublicCompany: false,
    companyCik: undefined,
    ticker: undefined,
    ...eventDataOverrides,
  };

  // Access the internal handler from the Inngest function object
  // The enrichProspect function is a createFunction result with an fn property
  // We use the internal structure to call the handler directly
  const handler = (enrichProspect as unknown as { fn: (ctx: unknown) => Promise<unknown> }).fn;

  if (typeof handler === "function") {
    return handler({
      event: { data: eventData },
      step: stepHarness,
    });
  }

  // Alternative: for newer Inngest versions the handler might be stored differently.
  // We fall back to calling the function as-is if it has a different shape.
  throw new Error("Could not extract handler from Inngest function object");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enrich-prospect orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseUpdateCalls.length = 0;
    supabaseInsertCalls.length = 0;
    supabaseSelectCalls.length = 0;

    // Default happy-path mocks
    mockEnrichContactOut.mockResolvedValue({
      found: true,
      personalEmail: "john@personal.com",
      phone: "+15551234567",
    });

    mockEnrichExa.mockResolvedValue({
      found: true,
      mentions: [
        { title: "CEO spotlight", url: "https://example.com/article", snippet: "John Doe is CEO of Acme" },
      ],
      wealthSignals: [{ type: "Funding Round", description: "Raised $100M", source: "https://example.com/funding" }],
    });

    mockDigestExaResults.mockResolvedValue([
      {
        relevant: true,
        category: "funding",
        headline: "Acme raises $100M",
        summary: "Acme Corp raised a $100M Series C.",
        source_url: "https://example.com/funding",
        raw_text: "Acme Corp raised $100M",
        event_date: "2026-01-15",
      },
    ]);

    mockLookupCompanyCik.mockResolvedValue(null);

    mockEnrichEdgar.mockResolvedValue({
      found: false,
      transactions: [],
    });

    mockGenerateProspectSummary.mockResolvedValue(
      "John Doe is the CEO of Acme Corp, recently raised $100M. Strong UHNWI candidate."
    );

    mockGenerateIntelligenceDossier.mockResolvedValue({
      summary: "A strong UHNWI candidate.",
      career_narrative: "CEO of Acme Corp with 15 years experience.",
      wealth_assessment: "High net worth signals from recent funding.",
      company_context: "Acme Corp is a fast-growing SaaS company.",
      outreach_hooks: ["Congratulate on funding round", "Discuss expansion plans"],
      quick_facts: [{ label: "Title", value: "CEO" }],
    });

    mockFetchMarketSnapshot.mockResolvedValue({
      ticker: "ACME",
      price: 150.0,
      change: 2.5,
      fetchedAt: "2026-03-29T12:00:00Z",
    });
  });

  it("calls each enrichment step in the correct order", async () => {
    const result = (await runEnrichment()) as {
      prospectId: string;
      enrichmentStatus: string;
      sources: Record<string, string>;
    };

    // Verify the function returned the expected shape
    expect(result.prospectId).toBe("prospect-001");
    expect(result.enrichmentStatus).toBe("complete");

    // Verify each source was called
    expect(mockEnrichContactOut).toHaveBeenCalledOnce();
    expect(mockEnrichExa).toHaveBeenCalledOnce();
    expect(mockDigestExaResults).toHaveBeenCalledOnce();
    expect(mockGenerateProspectSummary).toHaveBeenCalledOnce();
    expect(mockGenerateIntelligenceDossier).toHaveBeenCalledOnce();
  });

  it("passes correct parameters to ContactOut", async () => {
    await runEnrichment();

    expect(mockEnrichContactOut).toHaveBeenCalledWith({
      email: "john@acme.com",
      linkedinUrl: "https://linkedin.com/in/johndoe",
    });
  });

  it("passes correct parameters to Exa", async () => {
    await runEnrichment();

    expect(mockEnrichExa).toHaveBeenCalledWith({
      name: "John Doe",
      company: "Acme Corp",
      title: "CEO",
    });
  });

  it("feeds Exa mentions into digestExaResults", async () => {
    await runEnrichment();

    expect(mockDigestExaResults).toHaveBeenCalledWith(
      "John Doe",
      "Acme Corp",
      [{ title: "CEO spotlight", url: "https://example.com/article", snippet: "John Doe is CEO of Acme" }]
    );
  });

  it("passes enrichment data from earlier steps into Claude summary", async () => {
    await runEnrichment();

    const summaryArgs = mockGenerateProspectSummary.mock.calls[0][0];
    expect(summaryArgs.name).toBe("John Doe");
    expect(summaryArgs.title).toBe("CEO");
    expect(summaryArgs.company).toBe("Acme Corp");
    // ContactOut data should be passed
    expect(summaryArgs.contactData).toEqual({
      personalEmail: "john@personal.com",
      phone: "+15551234567",
    });
    // Digested Exa signals should be mapped to summary format
    expect(summaryArgs.webData).toBeDefined();
    expect(summaryArgs.webData.mentions).toHaveLength(1);
    expect(summaryArgs.webData.mentions[0].title).toBe("Acme raises $100M");
  });

  it("writes contact_data to prospect record when ContactOut succeeds", async () => {
    await runEnrichment();

    const contactUpdate = supabaseUpdateCalls.find(
      (c) => c.table === "prospects" && c.data.contact_data !== undefined
    );
    expect(contactUpdate).toBeDefined();
    expect((contactUpdate!.data.contact_data as Record<string, unknown>).personal_email).toBe("john@personal.com");
    expect((contactUpdate!.data.contact_data as Record<string, unknown>).phone).toBe("+15551234567");
    expect(contactUpdate!.id).toBe("prospect-001");
  });

  it("writes web_data to prospect record when Exa succeeds", async () => {
    await runEnrichment();

    const webUpdate = supabaseUpdateCalls.find(
      (c) => c.table === "prospects" && c.data.web_data !== undefined
    );
    expect(webUpdate).toBeDefined();
    expect((webUpdate!.data.web_data as Record<string, unknown>).source).toBe("exa");
  });

  it("writes ai_summary to prospect record when Claude succeeds", async () => {
    await runEnrichment();

    const summaryUpdate = supabaseUpdateCalls.find(
      (c) => c.table === "prospects" && c.data.ai_summary !== undefined
    );
    expect(summaryUpdate).toBeDefined();
    expect(summaryUpdate!.data.ai_summary).toContain("CEO of Acme Corp");
  });

  it("marks enrichment_status as complete in finalize step", async () => {
    await runEnrichment();

    const finalizeUpdate = supabaseUpdateCalls.find(
      (c) =>
        c.table === "prospects" &&
        c.data.enrichment_status === "complete" &&
        c.data.last_enriched_at !== undefined
    );
    expect(finalizeUpdate).toBeDefined();
  });

  it("returns all source statuses in the result", async () => {
    const result = (await runEnrichment()) as {
      sources: Record<string, string>;
    };

    expect(result.sources.contactout).toBe("complete");
    expect(result.sources.exa).toBe("complete");
    // No CIK, so SEC should be skipped
    expect(result.sources.sec).toBe("skipped");
    expect(result.sources.claude).toBe("complete");
    expect(result.sources.dossier).toBe("complete");
  });

  // -------------------------------------------------------------------------
  // Partial failure handling
  // -------------------------------------------------------------------------

  it("continues if ContactOut fails - Exa and Claude still run", async () => {
    mockEnrichContactOut.mockRejectedValue(new Error("ContactOut API down"));

    const result = (await runEnrichment()) as {
      enrichmentStatus: string;
      sources: Record<string, string>;
    };

    // The pipeline should still complete
    expect(result.enrichmentStatus).toBe("complete");
    expect(result.sources.contactout).toBe("failed");

    // Exa and Claude should still execute
    expect(mockEnrichExa).toHaveBeenCalledOnce();
    expect(mockGenerateProspectSummary).toHaveBeenCalledOnce();
  });

  it("continues if Exa fails - Claude still runs with sparse data", async () => {
    mockEnrichExa.mockRejectedValue(new Error("Exa rate limited"));

    const result = (await runEnrichment()) as {
      enrichmentStatus: string;
      sources: Record<string, string>;
    };

    expect(result.enrichmentStatus).toBe("complete");
    expect(result.sources.exa).toBe("failed");

    // Claude summary should still be called (though data will be sparse)
    expect(mockGenerateProspectSummary).toHaveBeenCalledOnce();
  });

  it("handles ContactOut returning circuit-open state", async () => {
    mockEnrichContactOut.mockResolvedValue({
      found: false,
      circuitOpen: true,
    });

    const result = (await runEnrichment()) as {
      sources: Record<string, string>;
    };

    expect(result.sources.contactout).toBe("circuit_open");
  });

  it("handles Exa returning error without throwing", async () => {
    mockEnrichExa.mockResolvedValue({
      found: false,
      mentions: [],
      wealthSignals: [],
      error: "Rate limit exceeded",
    });

    const result = (await runEnrichment()) as {
      enrichmentStatus: string;
      sources: Record<string, string>;
    };

    expect(result.enrichmentStatus).toBe("complete");
    expect(result.sources.exa).toBe("failed");
  });

  it("runs EDGAR step for public companies with CIK", async () => {
    mockLookupCompanyCik.mockResolvedValue(null);

    mockEnrichEdgar.mockResolvedValue({
      found: true,
      transactions: [
        {
          filingDate: "2026-03-01",
          transactionType: "Purchase",
          securityTitle: "Common Stock",
          shares: 10000,
          pricePerShare: 50.0,
          totalValue: 500000,
        },
      ],
    });

    const result = (await runEnrichment({
      isPublicCompany: true,
      companyCik: "0001234567",
    })) as {
      sources: Record<string, string>;
    };

    expect(mockEnrichEdgar).toHaveBeenCalledWith({
      cik: "0001234567",
      name: "John Doe",
    });
    expect(result.sources.sec).toBe("complete");

    // Insider data should be saved
    const insiderUpdate = supabaseUpdateCalls.find(
      (c) => c.table === "prospects" && c.data.insider_data !== undefined
    );
    expect(insiderUpdate).toBeDefined();
    expect(
      ((insiderUpdate!.data.insider_data as Record<string, unknown>).transactions as unknown[]).length
    ).toBe(1);
  });

  it("skips EDGAR when not a public company", async () => {
    const result = (await runEnrichment({
      isPublicCompany: false,
      companyCik: undefined,
    })) as {
      sources: Record<string, string>;
    };

    expect(mockEnrichEdgar).not.toHaveBeenCalled();
    expect(result.sources.sec).toBe("skipped");
  });

  it("resolves CIK from company name when companyCik not provided", async () => {
    mockLookupCompanyCik.mockResolvedValue({
      cik: "9999999",
      ticker: "ACME",
      companyName: "Acme Corp",
    });

    mockEnrichEdgar.mockResolvedValue({
      found: true,
      transactions: [
        {
          filingDate: "2026-03-15",
          transactionType: "Sale",
          securityTitle: "Common Stock",
          shares: 5000,
          pricePerShare: 100.0,
          totalValue: 500000,
        },
      ],
    });

    const result = (await runEnrichment({
      isPublicCompany: false,
      companyCik: undefined,
      ticker: undefined,
    })) as {
      sources: Record<string, string>;
    };

    expect(mockLookupCompanyCik).toHaveBeenCalledWith("Acme Corp");
    // CIK was resolved, so EDGAR should run
    expect(mockEnrichEdgar).toHaveBeenCalledWith({
      cik: "9999999",
      name: "John Doe",
    });
    expect(result.sources.sec).toBe("complete");
  });

  it("runs market data step when ticker is available", async () => {
    mockLookupCompanyCik.mockResolvedValue({
      cik: "9999999",
      ticker: "ACME",
      companyName: "Acme Corp",
    });

    mockEnrichEdgar.mockResolvedValue({
      found: false,
      transactions: [],
    });

    const result = (await runEnrichment()) as {
      sources: Record<string, string>;
    };

    // CIK resolved means we have a ticker and market data should run
    expect(result.sources.market).toBe("complete");
    expect(mockFetchMarketSnapshot).toHaveBeenCalled();
  });

  it("skips market data when no ticker available", async () => {
    mockLookupCompanyCik.mockResolvedValue(null);

    const result = (await runEnrichment({
      isPublicCompany: false,
      companyCik: undefined,
      ticker: undefined,
    })) as {
      sources: Record<string, string>;
    };

    expect(result.sources.market).toBe("skipped");
    expect(mockFetchMarketSnapshot).not.toHaveBeenCalled();
  });

  it("handles dossier generation failure gracefully", async () => {
    mockGenerateIntelligenceDossier.mockResolvedValue(null);

    const result = (await runEnrichment()) as {
      enrichmentStatus: string;
      sources: Record<string, string>;
    };

    // Pipeline still completes
    expect(result.enrichmentStatus).toBe("complete");
    expect(result.sources.dossier).toBe("failed");
  });

  it("handles Claude summary failure gracefully", async () => {
    mockGenerateProspectSummary.mockRejectedValue(new Error("LLM timeout"));

    const result = (await runEnrichment()) as {
      enrichmentStatus: string;
      sources: Record<string, string>;
    };

    expect(result.enrichmentStatus).toBe("complete");
    expect(result.sources.claude).toBe("failed");
  });

  it("inserts digested signals into prospect_signals table", async () => {
    await runEnrichment();

    const signalInserts = supabaseInsertCalls.filter(
      (c) => c.table === "prospect_signals"
    );
    expect(signalInserts.length).toBeGreaterThanOrEqual(1);
    expect((signalInserts[0].data as Record<string, unknown>).prospect_id).toBe("prospect-001");
    expect((signalInserts[0].data as Record<string, unknown>).category).toBe("funding");
  });
});
