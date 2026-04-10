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
): Promise<{ cards: ScrapbookCard[]; hasDirectResults: boolean }> {
  if (!results || results.length === 0) return { cards: [], hasDirectResults: false };

  try {
    const systemPrompt = `You are a wealth intelligence research analyst. You are helping a luxury real estate agent research a prospect.

For each search result, determine:
1. Is this result actually about "${personName}" at "${companyName}"? (is_about_target)
2. How relevant is it to the user's question: "${query}"? Use these STRICT definitions:
   - "direct": Directly answers the user's question with specific information (e.g., user asks "net worth" -> article states a dollar figure or asset)
   - "tangential": Related to the topic but doesn't directly answer (e.g., user asks "net worth" -> article about their company's funding round)
   - "background": General information about the person/company not related to the question (e.g., user asks "net worth" -> article is their LinkedIn profile summary)
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
      .map((r, i) => {
        const summarySection = r.summary
          ? `Exa Summary: ${r.summary}`
          : r.highlights?.[0]
          ? `Top Highlight: ${r.highlights[0]}`
          : `Text: ${r.text?.slice(0, 2000) ?? "(empty)"}`;
        return `[${i}] Title: ${r.title}\nURL: ${r.url}\nDate: ${r.publishedDate ?? "unknown"}\n${summarySection}`;
      })
      .join("\n\n---\n\n");

    const response = await chatCompletion(systemPrompt, userMessage, 6000);

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

    if (!Array.isArray(parsed)) return { cards: [], hasDirectResults: false };

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
          source_favicon:
            results[item.index]?.favicon ??
            (domain ? `https://${domain}/favicon.ico` : ""),
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
          exa_highlights: results[item.index]?.highlights,
          exa_highlight_scores: results[item.index]?.highlightScores,
          exa_summary: results[item.index]?.summary,
          exa_author: results[item.index]?.author,
          exa_image: results[item.index]?.image,
        };
      })
      .sort(
        (a, b) =>
          (relevanceOrder[a.answer_relevance] ?? 2) -
          (relevanceOrder[b.answer_relevance] ?? 2)
      );

    // Post-processing: filter background results when direct results exist
    const directCards = cards.filter(c => c.answer_relevance === "direct");
    const hasDirectResults = directCards.length > 0;

    // If direct results exist, drop background-only results to reduce noise
    const filteredCards = hasDirectResults
      ? cards.filter(c => c.answer_relevance !== "background")
      : cards;

    return { cards: filteredCards, hasDirectResults };
  } catch (err) {
    console.error("[research/research-digest] Digest failed:", err);
    return { cards: [], hasDirectResults: false };
  }
}
