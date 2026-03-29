import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { trackApiUsage } from "@/lib/enrichment/track-api-usage";
import { getChannelCache, setChannelCache } from "../channel-cache";
import type { ChannelParams, ChannelOutput, ChannelResult } from "./index";
import { registerChannel } from "./index";

type ExaSearchResponse = {
  results: Array<{
    title?: string;
    url: string;
    text?: string;
    highlights?: string[];
    publishedDate?: string;
  }>;
};

/**
 * Build a contextual Exa query that includes the prospect's name, company,
 * and the user's search intent. Much better results than raw query alone.
 */
function buildExaQuery(params: ChannelParams): string {
  const { prospect, query } = params;
  const name = prospect.full_name;
  const company = prospect.company;

  // If user query already mentions the prospect by name, use it as-is with company context
  const queryLower = query.toLowerCase();
  const nameLower = name.toLowerCase();
  if (queryLower.includes(nameLower.split(" ")[0].toLowerCase())) {
    return company ? `${query} "${company}"` : query;
  }

  // Otherwise inject prospect context into the query
  return company
    ? `"${name}" "${company}" ${query}`
    : `"${name}" ${query}`;
}

/**
 * Classify a result's category based on content keywords.
 */
function classifyCategory(
  title: string,
  text: string
): ChannelResult["category"] {
  const combined = `${title} ${text}`.toLowerCase();

  if (/\b(sec |filing|form 4|insider|shares sold|shares purchased)\b/.test(combined)) return "sec_filing";
  if (/\b(funding|raised|series [a-f]|valuation|ipo|acquisition)\b/.test(combined)) return "funding";
  if (/\b(appointed|hired|promoted|joined|named|ceo|cfo|board)\b/.test(combined)) return "career_move";
  if (/\b(net worth|billion|million|estate|property|yacht|jet)\b/.test(combined)) return "wealth_signal";
  if (/\b(award|honor|recognition|top \d|best|distinguished)\b/.test(combined)) return "recognition";
  if (/\b(revenue|growth|expansion|launched|merged|pivot)\b/.test(combined)) return "company_intel";
  if (/\b(interview|podcast|spoke|keynote|conference|article)\b/.test(combined)) return "media";
  return "media";
}

/**
 * Score relevance based on content quality signals.
 */
function scoreRelevance(
  title: string,
  text: string,
  prospectName: string
): ChannelResult["relevance"] {
  const combined = `${title} ${text}`.toLowerCase();
  const nameParts = prospectName.toLowerCase().split(" ");

  // High: both first and last name appear in text
  const nameHits = nameParts.filter((p) => combined.includes(p)).length;
  if (nameHits >= 2) return "high";

  // Medium: at least one name part
  if (nameHits >= 1) return "medium";

  return "low";
}

async function searchExaInternal(params: ChannelParams): Promise<ChannelOutput> {
  const startMs = Date.now();

  const cached = await getChannelCache("exa", params.query, params.prospect.id, params.tenantId);
  if (cached) return { ...cached, cached: true, latencyMs: Date.now() - startMs };

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return { channelId: "exa", results: [], cached: false, latencyMs: 0, error: "EXA_API_KEY not configured" };
  }

  try {
    const exaQuery = buildExaQuery(params);

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: exaQuery,
        type: "auto",
        useAutoprompt: true,
        numResults: 10,
        contents: {
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 3 },
        },
      }),
    });

    trackApiUsage("exa").catch(() => {});

    if (!response.ok) {
      return { channelId: "exa", results: [], cached: false, latencyMs: Date.now() - startMs, error: `Exa API error: ${response.status}` };
    }

    const data = (await response.json()) as ExaSearchResponse;
    const rawResults = Array.isArray(data.results) ? data.results : [];

    const results: ChannelResult[] = rawResults.map((result) => {
      const title = result.title || "Untitled";
      const text = result.text || "";
      const highlight = result.highlights?.join(" ") || "";
      const bestSummary = highlight || text.slice(0, 300);

      return {
        channelId: "exa" as const,
        headline: title,
        summary: bestSummary,
        source_url: result.url,
        source_name: "Exa",
        event_date: result.publishedDate || null,
        category: classifyCategory(title, text),
        relevance: scoreRelevance(title, text, params.prospect.full_name),
        raw_snippet: text.slice(0, 500),
      };
    });

    const output: ChannelOutput = { channelId: "exa", results, cached: false, latencyMs: Date.now() - startMs };
    await setChannelCache("exa", params.query, params.prospect.id, params.tenantId, output);
    return output;
  } catch (error) {
    return { channelId: "exa", results: [], cached: false, latencyMs: Date.now() - startMs, error: String(error) };
  }
}

export const searchExa = withCircuitBreaker(searchExaInternal, { name: "exa-channel", timeout: 10000 });
registerChannel("exa", searchExa);
