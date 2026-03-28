/**
 * Crunchbase channel adapter for multi-source search.
 *
 * Searches organization data using the Crunchbase Basic (free) API tier.
 * IMPORTANT: Limited to Basic tier fields only — does NOT request
 * funding_rounds, founders, or investors (403 on free tier).
 *
 * Returns empty results gracefully when CRUNCHBASE_API_KEY is not configured.
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
import { crunchbaseRateLimiter } from "@/lib/rate-limit/limiters";

// ─── Inline Response Types ────────────────────────────────────────────────────

type CrunchbaseEntity = {
  uuid: string;
  properties: {
    identifier: {
      value: string;      // org name
      permalink: string;  // slug for URL
    };
    short_description?: string;
    company_type?: string;
    founded_on?: { value: string };
    homepage_url?: string;
  };
};

type CrunchbaseSearchResponse = {
  entities: CrunchbaseEntity[];
};

// ─── Channel Implementation ───────────────────────────────────────────────────

async function searchCrunchbaseInternal(
  params: ChannelParams
): Promise<ChannelOutput> {
  const startMs = Date.now();

  // Check cache first
  const cached = await getChannelCache(
    "crunchbase",
    params.query,
    params.prospect.id,
    params.tenantId
  );
  if (cached) {
    return { ...cached, cached: true, latencyMs: Date.now() - startMs };
  }

  // Require API key
  const apiKey = process.env.CRUNCHBASE_API_KEY;
  if (!apiKey) {
    return {
      channelId: "crunchbase",
      results: [],
      cached: false,
      latencyMs: 0,
      error: "CRUNCHBASE_API_KEY not configured",
    };
  }

  // Need a company name to search
  if (!params.prospect.company) {
    return {
      channelId: "crunchbase",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: "No company name available for Crunchbase search",
    };
  }

  try {
    // Rate limit
    await crunchbaseRateLimiter.limit("crunchbase:global");

    const url = new URL(
      "https://api.crunchbase.com/api/v4/searches/organizations"
    );
    url.searchParams.set("user_key", apiKey);

    const body = {
      // Basic tier fields only — no funding_rounds/founders/investors
      field_ids: ["short_description", "company_type", "founded_on", "homepage_url"],
      query: [
        {
          type: "predicate",
          field_id: "identifier",
          operator_id: "contains",
          values: [params.prospect.company],
        },
      ],
      limit: 3,
    };

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        channelId: "crunchbase",
        results: [],
        cached: false,
        latencyMs: Date.now() - startMs,
        error: `Crunchbase API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as CrunchbaseSearchResponse;
    const entities = data?.entities ?? [];

    const results: ChannelResult[] = entities.map((entity) => {
      const props = entity.properties;
      const orgName = props.identifier?.value ?? "Unknown Organization";
      const permalink = props.identifier?.permalink ?? "";
      const description = props.short_description ?? "No description available";
      const companyType = props.company_type ?? "Unknown";
      const foundedOn = props.founded_on?.value ?? "Unknown";

      return {
        channelId: "crunchbase",
        headline: orgName,
        summary: `${description}. Company type: ${companyType}. Founded: ${foundedOn}.`,
        source_url: `https://www.crunchbase.com/organization/${permalink}`,
        source_name: "Crunchbase",
        event_date: props.founded_on?.value ?? null,
        category: "company_intel",
        relevance: "medium",
        raw_snippet: JSON.stringify(props),
        confidence_note: "Crunchbase Basic tier — limited fields available",
      };
    });

    const output: ChannelOutput = {
      channelId: "crunchbase",
      results,
      cached: false,
      latencyMs: Date.now() - startMs,
    };

    await setChannelCache(
      "crunchbase",
      params.query,
      params.prospect.id,
      params.tenantId,
      output
    );

    return output;
  } catch (error) {
    return {
      channelId: "crunchbase",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: String(error),
    };
  }
}

// ─── Export with Circuit Breaker ──────────────────────────────────────────────

export const searchCrunchbase = withCircuitBreaker(
  searchCrunchbaseInternal,
  { name: "crunchbase-channel", timeout: 10000 }
);

// ─── Self-Register ────────────────────────────────────────────────────────────

registerChannel("crunchbase", searchCrunchbase);
