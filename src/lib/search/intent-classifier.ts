/**
 * Intent classifier for multi-source search.
 *
 * Uses an LLM to analyze a user query + prospect context and determine:
 * - Which search channels to activate
 * - A reformulated query optimized for those channels
 * - The entity type being searched
 */

import { chatCompletion } from "@/lib/ai/openrouter";
import type { ChannelId } from "./channels";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Result of intent classification.
 * Channels array always contains at least "exa".
 */
export type IntentClassification = {
  channels: ChannelId[];
  reformulatedQuery: string;
  entityType: "person" | "company" | "property" | "general";
  reasoning: string;
};

// ─── System Prompt ────────────────────────────────────────────────────────────

const CLASSIFY_SYSTEM_PROMPT = `You are a search intent classifier for a wealth intelligence platform.
Given a user query and prospect context, determine which data channels to activate.

Available channels:
- "exa": Semantic web search — ALWAYS include this channel
- "edgar-efts": SEC EDGAR full-text search — include for queries about SEC filings, insider trading, Form 4, Form 10-K, 10-Q, 8-K, stock options, executive compensation, regulatory filings
- "gnews": News aggregator — include for queries about news, recent announcements, press releases, media coverage, current events
- "opencorporates": Corporate registry — include for queries about company formation, registered companies, subsidiaries, corporate structure, officers
- "crunchbase": Startup/funding data — include for queries about funding rounds, investors, startup history, founded date, venture capital, acquisitions
- "attom": Property records — include for queries about real estate, property ownership, house, home, address, land records

Rules:
1. ALWAYS include "exa" in channels
2. Select additional channels based on query keywords and intent
3. Reformulate the query to be more precise and effective for the selected channels
4. Determine the entity type: "person", "company", "property", or "general"
5. Return ONLY valid JSON — no markdown, no explanation outside the JSON

Response format (JSON only):
{
  "channels": ["exa", ...],
  "reformulatedQuery": "optimized query string",
  "entityType": "person|company|property|general",
  "reasoning": "brief explanation of channel selection"
}`;

// ─── Available-Channel Filter ─────────────────────────────────────────────────

/**
 * Checks which optional channels have their API keys configured.
 * Exa and edgar-efts are always available (no runtime key check needed here).
 */
function getAvailableChannels(): Set<ChannelId> {
  const available = new Set<ChannelId>(["exa", "edgar-efts"]);

  if (process.env.GNEWS_API_KEY) {
    available.add("gnews");
  }
  if (process.env.OPENCORPORATES_API_TOKEN) {
    available.add("opencorporates");
  }
  if (process.env.CRUNCHBASE_API_KEY) {
    available.add("crunchbase");
  }
  if (process.env.ATTOM_API_KEY) {
    available.add("attom");
  }

  return available;
}

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classify user query intent and select appropriate search channels.
 *
 * Always includes "exa" in the channels array. Filters channels whose
 * API keys are not configured in the environment.
 *
 * @param query - The user's search query
 * @param prospect - Prospect context to aid classification
 * @returns IntentClassification with channels, reformulated query, and metadata
 */
export async function classifyIntent(
  query: string,
  prospect: {
    name: string;
    company: string | null;
    title?: string | null;
    publicly_traded_symbol?: string | null;
  }
): Promise<IntentClassification> {
  const userMessage = `Query: "${query}"
Person: ${prospect.name}
Company: ${prospect.company || "Unknown"}
Title: ${prospect.title || "Unknown"}
Public ticker: ${prospect.publicly_traded_symbol || "None"}`;

  const fallback: IntentClassification = {
    channels: ["exa"],
    reformulatedQuery: query,
    entityType: "general",
    reasoning: "Parse failure, defaulting to exa",
  };

  try {
    const response = await chatCompletion(
      CLASSIFY_SYSTEM_PROMPT,
      userMessage,
      200
    );

    let parsed: IntentClassification;
    try {
      parsed = JSON.parse(response.text) as IntentClassification;
    } catch {
      return fallback;
    }

    // Filter to only available channels
    const available = getAvailableChannels();
    const filteredChannels = (parsed.channels || []).filter((ch) =>
      available.has(ch as ChannelId)
    ) as ChannelId[];

    // Ensure "exa" is always present
    if (!filteredChannels.includes("exa")) {
      filteredChannels.unshift("exa");
    }

    return {
      channels: filteredChannels,
      reformulatedQuery: parsed.reformulatedQuery || query,
      entityType: parsed.entityType || "general",
      reasoning: parsed.reasoning || "",
    };
  } catch {
    return fallback;
  }
}
