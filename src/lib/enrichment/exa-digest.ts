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
  | "recognition"
  | "negative_signal";

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
  event_date?: string | null;  // ISO date from Exa publishDate — nullable
};

interface LLMDigestItem {
  index: number;
  relevant: boolean;
  category: SignalCategory;
  headline: string;
  summary: string;
  event_date: string | null; // ISO date (YYYY-MM-DD) extracted from content, or null if unknown
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
      "You are a wealth intelligence analyst. For each search result about a person, determine if it is relevant to the target individual, categorize it, and generate a clean headline and summary. " +
      "CRITICAL: Your response MUST be ONLY a JSON array starting with `[` and ending with `]`. " +
      "Do NOT include any prose, preamble, explanation, apology, or markdown fences. " +
      "If no results are relevant, return an empty JSON array `[]` — never refuse or apologize. " +
      "If a person's name looks garbled or incomplete, still return an array with every result marked `relevant: false`.";

    // Build user prompt with all mentions
    let userPrompt = `Target person: "${personName}" at "${companyName}"\n\n`;
    userPrompt += `For each result below, determine:\n`;
    userPrompt += `1. Is this result actually about "${personName}" at "${companyName}"? (relevant: true/false)\n`;
    userPrompt += `2. Category — pick the BEST fit from these definitions:\n`;
    userPrompt += `   - career_move: Job changes, promotions, board appointments, new roles\n`;
    userPrompt += `   - funding: Investment rounds, IPOs, SPACs, fundraising, capital raises\n`;
    userPrompt += `   - wealth_signal: Direct evidence of personal wealth — stock sales, option exercises, property purchases, luxury assets, compensation disclosures\n`;
    userPrompt += `   - company_intel: Company earnings, partnerships, acquisitions, product launches, strategic moves\n`;
    userPrompt += `   - media: Interviews, profiles, podcast appearances, keynote speeches, public visibility\n`;
    userPrompt += `   - recognition: Awards, honors, rankings, board nominations, philanthropy recognition\n`;
    userPrompt += `   - negative_signal: Lawsuits, regulatory actions, controversies, bankruptcies, divorces, investigations, terminations, sanctions\n`;
    userPrompt += `3. Headline: under 10 words, factual, no fluff\n`;
    userPrompt += `4. Summary: 1-2 sentences max, plain text only, no markdown, no HTML, no boilerplate phrases like "click here" or "read more"\n`;
    userPrompt += `5. event_date: the ISO date (YYYY-MM-DD) when the actual event occurred, extracted from the text. Use the most specific date mentioned (e.g. "April 2023" → "2023-04-01", "Q2 2021" → "2021-04-01", "2022" → "2022-01-01"). Return null if no date can be inferred from the content.\n\n`;
    userPrompt += `Return a JSON array with one object per result:\n`;
    userPrompt += `[{ "index": 0, "relevant": true, "category": "career_move", "headline": "...", "summary": "...", "event_date": "2023-04-01" }, ...]\n\n`;
    userPrompt += `Results:\n`;

    mentions.forEach((mention, i) => {
      userPrompt += `\n[${i}] Title: ${mention.title}\n`;
      userPrompt += `URL: ${mention.url}\n`;
      userPrompt += `Text: ${mention.snippet}\n`;
    });

    const response = await chatCompletion(systemPrompt, userPrompt, 1500);

    // Extract JSON from response. Claude Haiku occasionally wraps the JSON
    // array in markdown fences or prose ("Here's the analysis in JSON
    // format: [...]"), so we strip both defensively before parsing.
    const rawText = response.text.trim();
    let jsonText = rawText;
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }
    // Fall back to slicing from the first `[` to the last `]` when the model
    // adds prose preamble/postamble. Greedy match on a flat array is safe
    // because responses never contain nested top-level brackets.
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }

    let parsed: LLMDigestItem[];
    try {
      parsed = JSON.parse(jsonText) as LLMDigestItem[];
    } catch {
      // Log the raw response (not the post-extraction slice) so we can see
      // whether the model refused outright vs. produced malformed JSON.
      console.error(
        "[exa-digest] Failed to parse LLM JSON response:",
        rawText.slice(0, 300)
      );
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
        event_date: item.event_date || mention.publishDate || null,
      });
    }

    return digested;
  } catch (error) {
    console.error("[exa-digest] LLM digest failed, returning empty signals:", error);
    return [];
  }
}
