import { chatCompletion } from "@/lib/ai/openrouter";

/**
 * Signal categories for digested Exa results
 */
export type SignalCategory =
  | "career_move"
  | "funding"
  | "media"
  | "wealth_signal"
  | "company_intel"
  | "recognition";

/**
 * A single digested intelligence signal, validated and categorized by LLM.
 * Only `relevant: true` signals are stored; raw_text is kept for debugging only.
 */
export type DigestedSignal = {
  relevant: boolean;
  category: SignalCategory;
  headline: string;   // Under 10 words
  summary: string;    // 1-2 sentences, no markdown/HTML/boilerplate
  source_url: string;
  raw_text: string;   // Kept for debugging, never displayed in UI
};

interface LLMDigestItem {
  index: number;
  relevant: boolean;
  category: SignalCategory;
  headline: string;
  summary: string;
}

/**
 * Digest raw Exa search results using LLM validation and categorization.
 *
 * Sends all mentions to Claude Haiku in a single batch request.
 * Filters out irrelevant results. Maps parsed output back to DigestedSignal[].
 * Never throws — returns empty array on any failure (graceful degradation).
 *
 * @param personName - Full name of the target person
 * @param companyName - Company name of the target person
 * @param mentions - Raw Exa mentions to digest
 * @returns Filtered, categorized, and summarized signals
 */
export async function digestExaResults(
  personName: string,
  companyName: string,
  mentions: Array<{ title: string; url: string; snippet: string; publishDate?: string }>
): Promise<DigestedSignal[]> {
  if (!mentions || mentions.length === 0) {
    return [];
  }

  try {
    const systemPrompt =
      "You are a wealth intelligence analyst. For each search result about a person, determine if it is relevant to the target individual, categorize it, and generate a clean headline and summary. Return valid JSON only.";

    // Build user prompt with all mentions
    let userPrompt = `Target person: "${personName}" at "${companyName}"\n\n`;
    userPrompt += `For each result below, determine:\n`;
    userPrompt += `1. Is this result actually about "${personName}" at "${companyName}"? (relevant: true/false)\n`;
    userPrompt += `2. Category: one of career_move, funding, media, wealth_signal, company_intel, recognition\n`;
    userPrompt += `3. Headline: under 10 words, factual, no fluff\n`;
    userPrompt += `4. Summary: 1-2 sentences max, plain text only, no markdown, no HTML, no boilerplate phrases like "click here" or "read more"\n\n`;
    userPrompt += `Return a JSON array with one object per result:\n`;
    userPrompt += `[{ "index": 0, "relevant": true, "category": "career_move", "headline": "...", "summary": "..." }, ...]\n\n`;
    userPrompt += `Results:\n`;

    mentions.forEach((mention, i) => {
      userPrompt += `\n[${i}] Title: ${mention.title}\n`;
      userPrompt += `URL: ${mention.url}\n`;
      userPrompt += `Text: ${mention.snippet}\n`;
    });

    const response = await chatCompletion(systemPrompt, userPrompt, 1500);

    // Extract JSON from response (may be wrapped in markdown code fences)
    let jsonText = response.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    let parsed: LLMDigestItem[];
    try {
      parsed = JSON.parse(jsonText) as LLMDigestItem[];
    } catch {
      console.error("[exa-digest] Failed to parse LLM JSON response:", jsonText.slice(0, 200));
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.error("[exa-digest] LLM response is not an array");
      return [];
    }

    // Map parsed results back to DigestedSignal[], filtering irrelevant ones
    const digested: DigestedSignal[] = [];
    for (const item of parsed) {
      if (!item.relevant) continue;
      const mention = mentions[item.index];
      if (!mention) continue;
      digested.push({
        relevant: true,
        category: item.category,
        headline: item.headline,
        summary: item.summary,
        source_url: mention.url,
        raw_text: mention.snippet,
      });
    }

    return digested;
  } catch (error) {
    console.error("[exa-digest] LLM digest failed, returning empty signals:", error);
    return [];
  }
}
