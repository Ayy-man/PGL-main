import { chatCompletion } from "@/lib/ai/openrouter";
import type { ScrapbookCard, ScrapbookCardCategory } from "@/types/research";
import type { ExaSearchResult } from "./exa-search";

/**
 * Digest Exa search results for the Research Scrapbook.
 * Extends the enrichment pipeline digest with answer_relevance,
 * is_about_target, confidence_note, event_date_precision, source metadata.
 *
 * Single batch LLM call (same pattern as exa-digest.ts).
 * Returns filtered cards sorted: direct first, then tangential, then background.
 * Drops anything with is_about_target: false.
 * Never throws — returns empty array on failure.
 */
export async function digestForScrapbook(
  personName: string,
  companyName: string,
  query: string,
  results: ExaSearchResult[]
): Promise<ScrapbookCard[]> {
  if (!results || results.length === 0) return [];

  try {
    const systemPrompt = `You are a wealth intelligence research analyst. You are helping a luxury real estate agent research a prospect.

For each search result, determine:
1. Is this result actually about "${personName}" at "${companyName}"? (is_about_target)
2. How relevant is it to the user's question: "${query}"? (answer_relevance: direct/tangential/background)
3. Overall signal relevance (relevance: high/medium/low)
4. A clean headline (under 10 words)
5. A 1-2 sentence summary (no markdown, no HTML, no boilerplate)
6. Category: career_move, funding, media, wealth_signal, company_intel, recognition, sec_filing, market_event, or other
7. Event date if detectable (ISO format or null), and precision (exact/approximate/unknown)
8. A brief confidence note explaining your certainty (e.g., "Name match confirmed in article title" or "May refer to different person with same name")

Return a JSON array. Each element:
{
  "index": <0-based index matching input order>,
  "headline": "<under 10 words>",
  "summary": "<1-2 sentences>",
  "category": "<category>",
  "event_date": "<ISO date or null>",
  "event_date_precision": "exact|approximate|unknown",
  "relevance": "high|medium|low",
  "answer_relevance": "direct|tangential|background",
  "is_about_target": true|false,
  "confidence_note": "<brief explanation>"
}

Return ONLY the JSON array. No markdown fences. No explanation.`;

    const userMessage = results
      .map(
        (r, i) =>
          `[${i}] Title: ${r.title}\nURL: ${r.url}\nDate: ${r.publishedDate ?? "unknown"}\nText: ${r.text?.slice(0, 2000) ?? "(empty)"}`
      )
      .join("\n\n---\n\n");

    const response = await chatCompletion(systemPrompt, userMessage, 4000);

    // Parse JSON — strip markdown fences if present
    const cleaned = response.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed: Array<{
      index: number;
      headline: string;
      summary: string;
      category: string;
      event_date: string | null;
      event_date_precision: string;
      relevance: string;
      answer_relevance: string;
      is_about_target: boolean;
      confidence_note: string;
    }> = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    // Map to ScrapbookCard, filter out not-about-target, sort by answer_relevance
    const validCategories = new Set([
      "career_move",
      "funding",
      "media",
      "wealth_signal",
      "company_intel",
      "recognition",
      "sec_filing",
      "market_event",
      "other",
    ]);
    const relevanceOrder: Record<string, number> = {
      direct: 0,
      tangential: 1,
      background: 2,
    };

    const cards: ScrapbookCard[] = parsed
      .filter((item) => item.is_about_target !== false)
      .map((item, idx) => {
        const sourceUrl = results[item.index]?.url ?? "";
        const domain = (() => {
          try {
            return new URL(sourceUrl).hostname;
          } catch {
            return "";
          }
        })();

        return {
          index: idx,
          headline: item.headline ?? "Untitled",
          summary: item.summary ?? "",
          category: (
            validCategories.has(item.category) ? item.category : "other"
          ) as ScrapbookCardCategory,
          source_url: sourceUrl,
          source_name: domain.replace(/^www\./, ""),
          source_favicon: domain ? `https://${domain}/favicon.ico` : "",
          event_date: item.event_date ?? null,
          event_date_precision: (
            ["exact", "approximate", "unknown"].includes(
              item.event_date_precision
            )
              ? item.event_date_precision
              : "unknown"
          ) as "exact" | "approximate" | "unknown",
          relevance: (
            ["high", "medium", "low"].includes(item.relevance)
              ? item.relevance
              : "medium"
          ) as "high" | "medium" | "low",
          answer_relevance: (
            ["direct", "tangential", "background"].includes(
              item.answer_relevance
            )
              ? item.answer_relevance
              : "background"
          ) as "direct" | "tangential" | "background",
          is_about_target: true,
          raw_snippet: results[item.index]?.text?.slice(0, 500) ?? "",
          confidence_note: item.confidence_note ?? "",
        };
      })
      .sort(
        (a, b) =>
          (relevanceOrder[a.answer_relevance] ?? 2) -
          (relevanceOrder[b.answer_relevance] ?? 2)
      );

    return cards;
  } catch (err) {
    console.error("[research/research-digest] Digest failed:", err);
    return [];
  }
}
