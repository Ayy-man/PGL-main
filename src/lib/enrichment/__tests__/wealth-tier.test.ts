import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the module under test is imported so vitest hoists
// them above the import. Tests must never hit OpenRouter or Redis.
// ---------------------------------------------------------------------------

const mockChatCompletion = vi.fn();
vi.mock("@/lib/ai/openrouter", () => ({
  chatCompletion: (...args: unknown[]) => mockChatCompletion(...args),
}));

// Fire-and-forget — nothing to test about this path beyond it-doesn't-throw.
vi.mock("@/lib/enrichment/track-api-usage", () => ({
  trackApiUsage: vi.fn(() => Promise.resolve()),
}));

import { estimateWealthTier, type WealthTierInput } from "../wealth-tier";

const baseInput: WealthTierInput = {
  name: "Test Prospect",
  title: "VP Engineering",
  company: "Example Corp",
  secTransactions: null,
  webSignals: null,
  stockSnapshot: null,
};

describe("estimateWealthTier", () => {
  beforeEach(() => {
    mockChatCompletion.mockReset();
  });

  it("returns ultra_high for SEC cash aggregate > $50M", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "ultra_high",
        confidence: "high",
        primary_signal: "sec_cash",
        reasoning: "SEC cash aggregate $75M across 12 transactions.",
      }),
    });
    const result = await estimateWealthTier({
      ...baseInput,
      title: "CEO",
      company: "Acme Inc",
      secTransactions: [
        {
          filingDate: "2024-01-15",
          transactionType: "S-Sale",
          shares: 100000,
          totalValue: 75_000_000,
        },
      ],
      stockSnapshot: { ticker: "ACME" },
    });
    expect(result).toEqual({
      tier: "ultra_high",
      confidence: "high",
      primary_signal: "sec_cash",
      reasoning: "SEC cash aggregate $75M across 12 transactions.",
    });
  });

  it("returns very_high for SEC cash aggregate in $10M-$50M", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "very_high",
        confidence: "high",
        primary_signal: "sec_cash",
        reasoning: "SEC cash aggregate $23M.",
      }),
    });
    const result = await estimateWealthTier({
      ...baseInput,
      secTransactions: [
        {
          filingDate: "2024-02-01",
          transactionType: "S-Sale",
          shares: 50000,
          totalValue: 23_000_000,
        },
      ],
    });
    expect(result?.tier).toBe("very_high");
    expect(result?.confidence).toBe("high");
    expect(result?.primary_signal).toBe("sec_cash");
  });

  it("returns high for SEC cash aggregate in $5M-$10M", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "high",
        confidence: "high",
        primary_signal: "sec_cash",
        reasoning: "SEC cash aggregate $7.5M.",
      }),
    });
    const result = await estimateWealthTier({
      ...baseInput,
      secTransactions: [
        {
          filingDate: "2024-02-15",
          transactionType: "S-Sale",
          shares: 30000,
          totalValue: 7_500_000,
        },
      ],
    });
    expect(result?.tier).toBe("high");
    expect(result?.confidence).toBe("high");
  });

  it("returns emerging for SEC cash aggregate in $1M-$5M", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "emerging",
        confidence: "high",
        primary_signal: "sec_cash",
        reasoning: "SEC cash aggregate $3.2M.",
      }),
    });
    const result = await estimateWealthTier({
      ...baseInput,
      secTransactions: [
        {
          filingDate: "2024-03-01",
          transactionType: "S-Sale",
          shares: 10000,
          totalValue: 3_200_000,
        },
      ],
    });
    expect(result?.tier).toBe("emerging");
    expect(result?.confidence).toBe("high");
  });

  it("returns very_high with medium confidence for public-co C-suite + RSU grants", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "very_high",
        confidence: "medium",
        primary_signal: "sec_equity",
        reasoning:
          "Public-co CEO at ACME (NASDAQ: ACME) with recurring RSU grants on file — rule 5.",
      }),
    });
    const result = await estimateWealthTier({
      ...baseInput,
      title: "CEO",
      company: "Acme Inc",
      stockSnapshot: { ticker: "ACME" },
      secTransactions: [
        {
          filingDate: "2024-02-01",
          transactionType: "A-Award",
          securityTitle: "RSU",
          shares: 20000,
          totalValue: 0,
        },
      ],
    });
    expect(result?.tier).toBe("very_high");
    expect(result?.confidence).toBe("medium");
    expect(result?.primary_signal).toBe("sec_equity");
  });

  it("returns high/medium for partner at accounting firm with no SEC data (career_inference)", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "high",
        confidence: "medium",
        primary_signal: "career_inference",
        reasoning:
          "Partner at Sax LLP, established accounting firm — typical HNW compensation for role.",
      }),
    });
    const result = await estimateWealthTier({
      ...baseInput,
      title: "Partner",
      company: "Sax LLP",
    });
    expect(result?.primary_signal).toBe("career_inference");
    expect(["high", "emerging"]).toContain(result?.tier);
    expect(["medium", "low"]).toContain(result?.confidence);
  });

  it("returns unknown with low confidence for thin data (no signals at all)", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "unknown",
        confidence: "low",
        primary_signal: "insufficient",
        reasoning: "No SEC, Exa, or career signals — insufficient data to classify.",
      }),
    });
    const result = await estimateWealthTier(baseInput);
    expect(result?.tier).toBe("unknown");
    expect(result?.confidence).toBe("low");
    expect(result?.primary_signal).toBe("insufficient");
  });

  it("strips markdown code fences from LLM response", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text:
        "```json\n" +
        JSON.stringify({
          tier: "high",
          confidence: "medium",
          primary_signal: "career_inference",
          reasoning: "Fenced response.",
        }) +
        "\n```",
    });
    const result = await estimateWealthTier(baseInput);
    expect(result?.tier).toBe("high");
    expect(result?.reasoning).toBe("Fenced response.");
  });

  it("returns null when LLM returns malformed JSON", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: "{ this is not valid JSON",
    });
    const result = await estimateWealthTier(baseInput);
    expect(result).toBeNull();
  });

  it("normalizes uppercase tier and confidence to lowercase snake_case", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "Very_High",
        confidence: "HIGH",
        primary_signal: "sec_cash",
        reasoning: "Normalization test.",
      }),
    });
    const result = await estimateWealthTier(baseInput);
    expect(result?.tier).toBe("very_high");
    expect(result?.confidence).toBe("high");
  });

  it("normalizes spaces in tier to underscores (\"Very High\" -> \"very_high\")", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "Very High",
        confidence: "medium",
        primary_signal: "career_inference",
        reasoning: "Space normalization.",
      }),
    });
    const result = await estimateWealthTier(baseInput);
    expect(result?.tier).toBe("very_high");
  });

  it("returns null when LLM returns invalid tier enum value", async () => {
    mockChatCompletion.mockResolvedValueOnce({
      text: JSON.stringify({
        tier: "mega_rich",
        confidence: "high",
        primary_signal: "sec_cash",
        reasoning: "Invalid tier.",
      }),
    });
    const result = await estimateWealthTier(baseInput);
    expect(result).toBeNull();
  });

  it("never throws on LLM network error — returns null instead", async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error("OpenRouter API error 500"));
    await expect(estimateWealthTier(baseInput)).resolves.toBeNull();
  });
});
