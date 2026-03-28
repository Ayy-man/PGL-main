import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { edgarRateLimiter } from "@/lib/rate-limit/limiters";
import { getChannelCache, setChannelCache } from "../channel-cache";
import type { ChannelParams, ChannelOutput, ChannelResult } from "./index";
import { registerChannel } from "./index";

/**
 * EFTS full-text search hit shape (subset used by this channel).
 */
type EftsHit = {
  _source: {
    file_date?: string;
    entity_name?: string;
    form_type?: string;
    period_of_report?: string;
  };
};

type EftsResponse = {
  hits: {
    hits: EftsHit[];
    total: { value: number };
  };
};

/**
 * Internal EDGAR EFTS (full-text search) channel implementation.
 * Distinct from enrichEdgar (CIK-based submissions) — this searches filing content.
 */
async function searchEdgarEftsInternal(
  params: ChannelParams
): Promise<ChannelOutput> {
  const startMs = Date.now();

  // Cache check
  const cached = await getChannelCache(
    "edgar-efts",
    params.query,
    params.prospect.id,
    params.tenantId
  );
  if (cached) {
    return { ...cached, cached: true, latencyMs: Date.now() - startMs };
  }

  // User-Agent guard (SEC requirement)
  const userAgent = process.env.SEC_EDGAR_USER_AGENT;
  if (!userAgent) {
    return {
      channelId: "edgar-efts",
      results: [],
      cached: false,
      latencyMs: 0,
      error: "SEC_EDGAR_USER_AGENT not configured",
    };
  }

  try {
    // Shared rate limiter with enrichEdgar
    const rateLimitResult = await edgarRateLimiter.limit("sec-edgar:global");
    if (!rateLimitResult.success) {
      const waitMs = Math.max(rateLimitResult.reset - Date.now(), 100);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      // Retry once
      const retryResult = await edgarRateLimiter.limit("sec-edgar:global");
      if (!retryResult.success) {
        return {
          channelId: "edgar-efts",
          results: [],
          cached: false,
          latencyMs: Date.now() - startMs,
          error: "SEC EDGAR rate limit exceeded",
        };
      }
    }

    // Build search terms from prospect context
    const searchTerms = `"${params.prospect.full_name}" "${params.prospect.company || ""}"`.trim();

    // One-year lookback date
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split("T")[0]; // YYYY-MM-DD

    const url = new URL("https://efts.sec.gov/LATEST/search-index");
    url.searchParams.set("q", searchTerms);
    url.searchParams.set("forms", "4,13F,8-K,10-K,10-Q");
    url.searchParams.set("dateRange", "custom");
    url.searchParams.set("startdt", startDate);
    url.searchParams.set(
      "_source",
      "period_of_report,file_date,entity_name,form_type"
    );

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        channelId: "edgar-efts",
        results: [],
        cached: false,
        latencyMs: Date.now() - startMs,
        error: `EDGAR EFTS error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as EftsResponse;
    const hits = data?.hits?.hits ?? [];

    const results: ChannelResult[] = hits.slice(0, 10).map((hit) => {
      const src = hit._source;
      const formType = src.form_type || "Filing";
      const entityName = src.entity_name || params.prospect.company || "Unknown Entity";

      return {
        channelId: "edgar-efts" as const,
        headline: `${formType} Filing — ${entityName}`,
        summary: `Filed on ${src.file_date || "N/A"}. Period: ${src.period_of_report || "N/A"}.`,
        source_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(
          params.prospect.company || ""
        )}&type=${encodeURIComponent(formType)}&dateb=&owner=include&count=10`,
        source_name: "SEC EDGAR",
        event_date: src.file_date || null,
        category: "wealth_signal" as const,
        relevance: "high" as const,
        raw_snippet: JSON.stringify(src),
      };
    });

    const output: ChannelOutput = {
      channelId: "edgar-efts",
      results,
      cached: false,
      latencyMs: Date.now() - startMs,
    };

    await setChannelCache(
      "edgar-efts",
      params.query,
      params.prospect.id,
      params.tenantId,
      output
    );

    return output;
  } catch (error) {
    return {
      channelId: "edgar-efts",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: String(error),
    };
  }
}

/**
 * EDGAR EFTS channel adapter — wrapped with circuit breaker (10s timeout).
 */
export const searchEdgarEfts = withCircuitBreaker(searchEdgarEftsInternal, {
  name: "edgar-efts-channel",
  timeout: 10000,
});

// Self-register in CHANNEL_REGISTRY on module import
registerChannel("edgar-efts", searchEdgarEfts);
