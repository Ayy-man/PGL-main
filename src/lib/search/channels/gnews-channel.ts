import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { gNewsRateLimiter } from "@/lib/rate-limit/limiters";
import { getChannelCache, setChannelCache } from "../channel-cache";
import type { ChannelParams, ChannelOutput, ChannelResult } from "./index";
import { registerChannel } from "./index";

/**
 * GNews article shape from the API response.
 */
type GNewsArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string; // ISO date
  source: { name: string; url: string };
  image?: string;
};

type GNewsResponse = {
  totalArticles: number;
  articles: GNewsArticle[];
};

/**
 * Internal GNews channel implementation.
 * Fetches news articles from gnews.io with API key auth.
 */
async function searchGNewsInternal(
  params: ChannelParams
): Promise<ChannelOutput> {
  const startMs = Date.now();

  // Cache check
  const cached = await getChannelCache(
    "gnews",
    params.query,
    params.prospect.id,
    params.tenantId
  );
  if (cached) {
    return { ...cached, cached: true, latencyMs: Date.now() - startMs };
  }

  // API key guard
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    return {
      channelId: "gnews",
      results: [],
      cached: false,
      latencyMs: 0,
      error: "GNEWS_API_KEY not configured",
    };
  }

  try {
    // Rate limit check
    await gNewsRateLimiter.limit("gnews:global");

    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("q", params.query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("max", "5");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        channelId: "gnews",
        results: [],
        cached: false,
        latencyMs: Date.now() - startMs,
        error: `GNews API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as GNewsResponse;
    const articles = Array.isArray(data.articles) ? data.articles : [];

    const results: ChannelResult[] = articles.map((article) => ({
      channelId: "gnews" as const,
      headline: article.title,
      summary: article.description || "",
      source_url: article.url,
      source_name: article.source?.name || "GNews",
      event_date: article.publishedAt || null,
      category: "news" as const,
      relevance: "medium" as const,
      raw_snippet: article.description || "",
    }));

    const output: ChannelOutput = {
      channelId: "gnews",
      results,
      cached: false,
      latencyMs: Date.now() - startMs,
    };

    await setChannelCache(
      "gnews",
      params.query,
      params.prospect.id,
      params.tenantId,
      output
    );

    return output;
  } catch (error) {
    return {
      channelId: "gnews",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: String(error),
    };
  }
}

/**
 * GNews channel adapter — wrapped with circuit breaker (8s timeout).
 */
export const searchGNews = withCircuitBreaker(searchGNewsInternal, {
  name: "gnews-channel",
  timeout: 8000,
});

// Self-register in CHANNEL_REGISTRY on module import
registerChannel("gnews", searchGNews);
