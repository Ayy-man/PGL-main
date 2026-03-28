/**
 * ATTOM property data channel adapter for multi-source search.
 *
 * OPTIONAL PREMIUM CHANNEL ($95/mo). Returns empty results with a clear
 * "not configured" message when ATTOM_API_KEY is absent — never throws.
 *
 * Searches property records by address when location data is available.
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

// ─── Inline Response Types ────────────────────────────────────────────────────

type ATTOMProperty = {
  identifier: { Id: number; fips: string; apn: string };
  lot: { lotSize1: number | null; lotSize2: number | null };
  address: {
    line1: string;
    line2: string;
    locality: string;
    countrySubd: string;
    postal1: string;
  };
  assessment: {
    assessed: { assdTtlValue: number | null };
    market: { mktTtlValue: number | null };
  };
  summary: {
    propclass: string | null;
    propsubtype: string | null;
    yearbuilt: number | null;
    propLandUse: string | null;
  };
};

type ATTOMSearchResponse = {
  property: ATTOMProperty[];
};

// ─── Address Parsing Helpers ──────────────────────────────────────────────────

/**
 * Attempt to extract a usable address from the prospect's location field.
 * Location may be a full address ("123 Main St, Miami, FL") or just city/state.
 *
 * Returns { addressLine, cityState } split at the first comma, or
 * falls back to using the full location as cityState.
 */
function parseLocation(location: string): { addressLine: string; cityState: string } {
  const trimmed = location.trim();
  const commaIdx = trimmed.indexOf(",");

  if (commaIdx > 0) {
    return {
      addressLine: trimmed.slice(0, commaIdx).trim(),
      cityState: trimmed.slice(commaIdx + 1).trim(),
    };
  }

  // No comma — treat the whole string as the city/state portion
  return { addressLine: "", cityState: trimmed };
}

// ─── Channel Implementation ───────────────────────────────────────────────────

async function searchAttomInternal(params: ChannelParams): Promise<ChannelOutput> {
  const startMs = Date.now();

  // Check cache first
  const cached = await getChannelCache(
    "attom",
    params.query,
    params.prospect.id,
    params.tenantId
  );
  if (cached) {
    return { ...cached, cached: true, latencyMs: Date.now() - startMs };
  }

  // Require API key — this is an optional premium channel
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey) {
    return {
      channelId: "attom",
      results: [],
      cached: false,
      latencyMs: 0,
      error: "ATTOM_API_KEY not configured (premium channel)",
    };
  }

  // Need address info to search — try prospect location first, then query as fallback
  const rawLocation = params.prospect.location ?? params.query;
  if (!rawLocation || rawLocation.trim().length === 0) {
    return {
      channelId: "attom",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: "No address information available for ATTOM search",
    };
  }

  const { addressLine, cityState } = parseLocation(rawLocation);

  try {
    const url = new URL(
      "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/address"
    );

    if (addressLine) {
      url.searchParams.set("address1", addressLine);
    }
    url.searchParams.set("address2", cityState);

    const response = await fetch(url.toString(), {
      headers: {
        apikey: apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        channelId: "attom",
        results: [],
        cached: false,
        latencyMs: Date.now() - startMs,
        error: `ATTOM API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as ATTOMSearchResponse;
    const properties = data?.property ?? [];

    const results: ChannelResult[] = properties.slice(0, 3).map((prop) => {
      const addr = prop.address;
      const assess = prop.assessment;
      const summ = prop.summary;

      const headlineAddress =
        addr?.line1
          ? `${addr.line1}, ${addr.locality}`
          : `Property at ${rawLocation}`;

      const assessedValue =
        assess?.assessed?.assdTtlValue != null
          ? `$${assess.assessed.assdTtlValue.toLocaleString()}`
          : "N/A";
      const marketValue =
        assess?.market?.mktTtlValue != null
          ? `$${assess.market.mktTtlValue.toLocaleString()}`
          : "N/A";

      return {
        channelId: "attom",
        headline: headlineAddress,
        summary: `Assessed value: ${assessedValue}. Market value: ${marketValue}. Type: ${summ?.propclass ?? "Unknown"}. Built: ${summ?.yearbuilt ?? "Unknown"}.`,
        source_url: "https://www.attomdata.com",
        source_name: "ATTOM Property",
        event_date: null,
        category: "property",
        relevance: "high",
        raw_snippet: JSON.stringify(prop),
      };
    });

    const output: ChannelOutput = {
      channelId: "attom",
      results,
      cached: false,
      latencyMs: Date.now() - startMs,
    };

    // 7-day TTL via CHANNEL_TTLS["attom"] = 604800
    await setChannelCache(
      "attom",
      params.query,
      params.prospect.id,
      params.tenantId,
      output
    );

    return output;
  } catch (error) {
    return {
      channelId: "attom",
      results: [],
      cached: false,
      latencyMs: Date.now() - startMs,
      error: String(error),
    };
  }
}

// ─── Export with Circuit Breaker ──────────────────────────────────────────────

export const searchAttom = withCircuitBreaker(searchAttomInternal, {
  name: "attom-channel",
  timeout: 10000,
});

// ─── Self-Register ────────────────────────────────────────────────────────────

registerChannel("attom", searchAttom);
