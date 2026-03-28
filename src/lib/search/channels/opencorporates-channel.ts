/**
 * OpenCorporates channel adapter for multi-source search.
 *
 * Searches US company registration data by company name.
 * Returns empty results gracefully when OPENCORPORATES_API_TOKEN is not configured.
 */

import {
  type ChannelParams,
  type ChannelOutput,
  type ChannelResult,
  registerChannel,
} from "./index";
import {
  getChannelCache,
  setChannelCache,
} from "../channel-cache";
import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { openCorporatesRateLimiter } from "@/lib/rate-limit/limiters";

// ─── Inline Response Types ────────────────────────────────────────────────────

type OCCompany = {
  company: {
    name: string;
    company_number: string;
    jurisdiction_code: string;
    incorporation_date: string | null;
    dissolution_date: string | null;
    registered_address_in_full: string | null;
    current_status: string | null;
    opencorporates_url: string;
  };
};

type OCSearchResponse = {
  results: {
    companies: OCCompany[];
  };
};

// ─── Channel Implementation ───────────────────────────────────────────────────

async function searchOpenCorporatesInternal(
  params: ChannelParams
): Promise<ChannelOutput> {
  const startMs = Date.now();

  // Check cache first
  const cached = await getChannelCache(
    "opencorporates",
    params.query,
    params.prospect.id,
    params.tenantId
  );
  if (cached) {
    return { ...cached, cached: true, latencyMs: Date.now() - startMs };
  }

  // Require API token
  const apiToken = process.env.OPENCORPORATES_API_TOKEN;
  if (!apiToken) {
    return {
      channelId: "opencorporates",
      results: [],
      cached: false,
      latencyMs: 0,
      error: "OPENCORPORATES_API_TOKEN not configured",
    };
  }

  // Need a company name to search
  if (!params.prospect.company) {
    return {
      channelId: "opencorporates",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: "No company name available for OpenCorporates search",
    };
  }

  try {
    // Rate limit
    await openCorporatesRateLimiter.limit("opencorporates:global");

    // Build URL
    const url = new URL("https://api.opencorporates.com/v0.4/companies/search");
    url.searchParams.set("q", params.prospect.company);
    url.searchParams.set("api_token", apiToken);
    url.searchParams.set("jurisdiction_code", "us");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        channelId: "opencorporates",
        results: [],
        cached: false,
        latencyMs: Date.now() - startMs,
        error: `OpenCorporates API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as OCSearchResponse;
    const companies = data?.results?.companies ?? [];

    const results: ChannelResult[] = companies.slice(0, 5).map((item) => {
      const c = item.company;
      return {
        channelId: "opencorporates",
        headline: `${c.name} (${c.jurisdiction_code})`,
        summary: `Company #${c.company_number} in ${c.jurisdiction_code}. Status: ${c.current_status ?? "Unknown"}. Incorporated: ${c.incorporation_date ?? "Unknown"}.`,
        source_url: c.opencorporates_url,
        source_name: "OpenCorporates",
        event_date: c.incorporation_date ?? null,
        category: "corporate",
        relevance: "medium",
        raw_snippet: JSON.stringify(c),
      };
    });

    const output: ChannelOutput = {
      channelId: "opencorporates",
      results,
      cached: false,
      latencyMs: Date.now() - startMs,
    };

    await setChannelCache(
      "opencorporates",
      params.query,
      params.prospect.id,
      params.tenantId,
      output
    );

    return output;
  } catch (error) {
    return {
      channelId: "opencorporates",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: String(error),
    };
  }
}

// ─── Export with Circuit Breaker ──────────────────────────────────────────────

export const searchOpenCorporates = withCircuitBreaker(
  searchOpenCorporatesInternal,
  { name: "opencorporates-channel", timeout: 10000 }
);

// ─── Self-Register ────────────────────────────────────────────────────────────

registerChannel("opencorporates", searchOpenCorporates);
