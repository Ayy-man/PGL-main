import { chatCompletion } from "@/lib/ai/openrouter";
import type { ChannelId } from "./channels";
import { INTENT_CLASSIFIER_MAX_TOKENS } from "./constants";

export type IntentClassification = {
  channels: ChannelId[];
  reformulatedQuery: string;
  entityType: "person" | "company" | "property" | "general";
  reasoning: string;
};

const ALL_CHANNEL_IDS: ChannelId[] = [
  "exa",
  "edgar-efts",
];

const CLASSIFY_SYSTEM_PROMPT = `You are a search intent classifier for a wealth intelligence platform.

Given a user query and prospect context, return which search channels to use and a reformulated query.

Channel selection rules:
- Always include "exa" (general web search — always on)
- Add "edgar-efts" for queries about SEC filings, insider trading, Form 4, 13F, 8-K, 10-K, regulatory disclosures

Return ONLY valid JSON in this exact format:
{
  "channels": ["exa", "edgar-efts"],
  "reformulatedQuery": "reformulated search query optimized for the selected channels",
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
      INTENT_CLASSIFIER_MAX_TOKENS
    );

    const parsed = JSON.parse(response.text) as Partial<IntentClassification>;

    // Validate channels array — only accept known channel IDs
    const rawChannels: string[] = Array.isArray(parsed.channels)
      ? parsed.channels
      : [];
    const channels = rawChannels.filter((c): c is ChannelId =>
      ALL_CHANNEL_IDS.includes(c as ChannelId)
    );

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
      entityType: "general" as const,
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
