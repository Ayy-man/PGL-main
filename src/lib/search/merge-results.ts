import type { ChannelResult } from "./channels";

/**
 * Normalizes a URL for deduplication purposes.
 * Lowercases, trims trailing slash, and removes query params/fragment.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.toLowerCase().trim());
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    // Fallback for non-standard URLs
    return url
      .toLowerCase()
      .trim()
      .split("?")[0]
      .split("#")[0]
      .replace(/\/$/, "");
  }
}

const RELEVANCE_SCORES: Record<"high" | "medium" | "low", number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Channel preference for tie-breaking during sort.
 * Higher number = higher priority.
 */
const CHANNEL_PRIORITY: Record<string, number> = {
  "edgar-efts": 6, // SEC filings most authoritative
  exa: 5,          // Web intelligence, broad coverage
  gnews: 4,        // News timeliness
  crunchbase: 3,   // Company/funding data
  opencorporates: 2, // Registration data
  attom: 1,        // Property data (niche)
};

/**
 * Deduplicates results by normalized source_url and sorts by:
 * 1. Relevance score (high > medium > low)
 * 2. Channel priority (tie-break)
 * 3. Event date (newer first, if both have dates)
 *
 * @param results - Flat array of ChannelResult from all channels
 * @param _query  - Original query string (reserved for future LLM re-rank)
 * @returns Deduplicated, ranked array of ChannelResult
 */
export function mergeAndRank(
  results: ChannelResult[],
  _query: string
): ChannelResult[] {
  // Deduplicate by normalized URL — keep the higher-scoring result for each URL
  const seen = new Map<string, ChannelResult>();

  for (const result of results) {
    const key = normalizeUrl(result.source_url);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, result);
      continue;
    }

    const existingScore = RELEVANCE_SCORES[existing.relevance] ?? 0;
    const newScore = RELEVANCE_SCORES[result.relevance] ?? 0;

    if (newScore > existingScore) {
      seen.set(key, result);
    } else if (newScore === existingScore) {
      // Tiebreak by channel priority
      const existingPriority = CHANNEL_PRIORITY[existing.channelId] ?? 0;
      const newPriority = CHANNEL_PRIORITY[result.channelId] ?? 0;
      if (newPriority > existingPriority) {
        seen.set(key, result);
      }
    }
  }

  const merged = Array.from(seen.values());

  // Sort: relevance desc -> channel priority desc -> event_date desc
  merged.sort((a, b) => {
    const relevanceDiff =
      (RELEVANCE_SCORES[b.relevance] ?? 0) -
      (RELEVANCE_SCORES[a.relevance] ?? 0);
    if (relevanceDiff !== 0) return relevanceDiff;

    const priorityDiff =
      (CHANNEL_PRIORITY[b.channelId] ?? 0) -
      (CHANNEL_PRIORITY[a.channelId] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;

    // Both have dates — newer first
    if (a.event_date && b.event_date) {
      return b.event_date.localeCompare(a.event_date);
    }
    // Result with a date ranks above one without
    if (a.event_date && !b.event_date) return -1;
    if (!a.event_date && b.event_date) return 1;

    return 0;
  });

  return merged;
}
