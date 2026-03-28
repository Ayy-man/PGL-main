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
        numResults: 10,
        useAutoprompt: false,
        contents: {
          text: {
            maxCharacters: 3000,
            includeHtmlTags: false,
          },
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
