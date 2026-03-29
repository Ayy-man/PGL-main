import { chatCompletion } from "@/lib/ai/openrouter";
import type { ChannelId } from "./channels";

export type IntentClassification = {
  channels: ChannelId[];
  reformulatedQuery: string;
  entityType: "person" | "company" | "property" | "general";
  reasoning: string;
};

const ALL_CHANNEL_IDS: ChannelId[] = [
  "exa",
  "edgar-efts",
  "attom",
];

const CLASSIFY_SYSTEM_PROMPT = `You are a search intent classifier for a wealth intelligence platform.

Given a user query and prospect context, return which search channels to use and a reformulated query.

Channel selection rules:
- Always include "exa" (general web search — always on)
- Add "edgar-efts" for queries about SEC filings, insider trading, Form 4, 13F, 8-K, 10-K, regulatory disclosures
- Add "attom" for queries about property, real estate, homes, address, owns property

Entity type rules:
- "person" — query is about an individual (default for most prospect queries)
- "company" — query is primarily about a company/organization
- "property" — query is about real estate or property ownership
- "general" — mixed or unclear

Return ONLY valid JSON in this exact format:
{
  "channels": ["exa", "edgar-efts"],
  "reformulatedQuery": "reformulated search query optimized for the selected channels",
  "entityType": "person",
  "reasoning": "brief explanation of channel selection"
}

Do not include any explanation outside the JSON object.`;

/**
 * Classify a search query into channels + reformulated query using an LLM.
 * Falls back gracefully to Exa-only on parse errors or API failures.
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

  try {
    const response = await chatCompletion(
      CLASSIFY_SYSTEM_PROMPT,
      userMessage,
      200
    );

    const parsed = JSON.parse(response.text) as Partial<IntentClassification>;

    // Validate channels array — only accept known channel IDs
    const rawChannels: string[] = Array.isArray(parsed.channels)
      ? parsed.channels
      : [];
    let channels = rawChannels.filter((c): c is ChannelId =>
      ALL_CHANNEL_IDS.includes(c as ChannelId)
    );

    // Filter out channels whose API keys are not configured
    channels = channels.filter((ch) => {
      switch (ch) {
        case "attom":
          return !!process.env.ATTOM_API_KEY;
        default:
          return true; // exa, edgar-efts are always available
      }
    });

    // Ensure exa is always present
    if (!channels.includes("exa")) {
      channels.unshift("exa");
    }

    return {
      channels,
      reformulatedQuery:
        typeof parsed.reformulatedQuery === "string"
          ? parsed.reformulatedQuery
          : query,
      entityType:
        parsed.entityType === "person" ||
        parsed.entityType === "company" ||
        parsed.entityType === "property" ||
        parsed.entityType === "general"
          ? parsed.entityType
          : "general",
      reasoning:
        typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  } catch {
    // Fallback: exa-only, original query
    return {
      channels: ["exa"],
      reformulatedQuery: query,
      entityType: "general",
      reasoning: "Parse failure, defaulting to exa",
    };
  }
}
