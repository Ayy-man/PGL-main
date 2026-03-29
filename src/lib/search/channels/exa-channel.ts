import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { trackApiUsage } from "@/lib/enrichment/track-api-usage";
import { getChannelCache, setChannelCache } from "../channel-cache";
import type { ChannelParams, ChannelOutput, ChannelResult } from "./index";
import { registerChannel } from "./index";

/**
 * Exa.ai API response shape (subset used by this channel).
 */
type ExaSearchResponse = {
  results: Array<{
    title?: string;
    url: string;
    text?: string;
    publishedDate?: string;
  }>;
};

/**
 * Internal Exa channel implementation.
 * Replicates the POST api.exa.ai/search pattern, returning ChannelResult[].
 */
async function searchExaInternal(
  params: ChannelParams
): Promise<ChannelOutput> {
  const startMs = Date.now();

  // Cache check
  const cached = await getChannelCache(
    "exa",
    params.query,
    params.prospect.id,
    params.tenantId
  );
  if (cached) {
    return { ...cached, cached: true, latencyMs: Date.now() - startMs };
  }

  // API key guard
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return {
      channelId: "exa",
      results: [],
      cached: false,
      latencyMs: 0,
      error: "EXA_API_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: params.query,
        type: "auto",
        numResults: 10,
        contents: {
          text: {
            maxCharacters: 500,
          },
        },
      }),
    });

    // Fire-and-forget usage tracking
    trackApiUsage("exa").catch(() => {});

    if (!response.ok) {
      return {
        channelId: "exa",
        results: [],
        cached: false,
        latencyMs: Date.now() - startMs,
        error: `Exa API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as ExaSearchResponse;
    const rawResults = Array.isArray(data.results) ? data.results : [];

    const results: ChannelResult[] = rawResults.map((result) => ({
      channelId: "exa" as const,
      headline: result.title || "Untitled",
      summary: (result.text || "").slice(0, 300),
      source_url: result.url,
      source_name: "Exa",
      event_date: result.publishedDate || null,
      category: "media" as const,
      relevance: "medium" as const,
      raw_snippet: result.text || "",
    }));

    const output: ChannelOutput = {
      channelId: "exa",
      results,
      cached: false,
      latencyMs: Date.now() - startMs,
    };

    await setChannelCache(
      "exa",
      params.query,
      params.prospect.id,
      params.tenantId,
      output
    );

    return output;
  } catch (error) {
    return {
      channelId: "exa",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: String(error),
    };
  }
}

/**
 * Exa channel adapter — wrapped with circuit breaker (10s timeout).
 */
export const searchExa = withCircuitBreaker(searchExaInternal, {
  name: "exa-channel",
  timeout: 10000,
});

// Self-register in CHANNEL_REGISTRY on module import
registerChannel("exa", searchExa);
