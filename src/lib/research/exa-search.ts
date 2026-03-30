import { CHANNEL_MAX_RESULTS, EXA_SCRAPBOOK_MAX_CHARS } from "@/lib/search/constants";

/**
 * Exa.ai search for the Research Scrapbook.
 * Uses neural search with higher text limits than the enrichment pipeline.
 * Never throws — returns empty array on failure.
 */

export interface ExaSearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
}

export async function searchExaForResearch(
  query: string
): Promise<ExaSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.error("[research/exa-search] EXA_API_KEY not set");
    return [];
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        type: "neural",
        numResults: CHANNEL_MAX_RESULTS,
        useAutoprompt: false,
        contents: {
          text: {
            maxCharacters: EXA_SCRAPBOOK_MAX_CHARS,
            includeHtmlTags: false,
          },
          highlights: { maxCharacters: 600 },
          summary: { query: "Key facts about this person and their recent activities" },
        },
      }),
    });

    if (!response.ok) {
      console.error(
        "[research/exa-search] API error:",
        response.status,
        await response.text()
      );
      return [];
    }

    const data = (await response.json()) as { results: ExaSearchResult[] };
    return data.results ?? [];
  } catch (err) {
    console.error("[research/exa-search] Fetch failed:", err);
    return [];
  }
}
