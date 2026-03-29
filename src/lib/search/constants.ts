import type { ChannelId } from "./channels";

// ---------------------------------------------------------------------------
// Research pipeline constants — single source of truth for magic numbers
// ---------------------------------------------------------------------------

/** Max results returned per channel query */
export const CHANNEL_MAX_RESULTS = 10;

/** Max characters of text to fetch per Exa result (multi-source channel) */
export const EXA_CHANNEL_MAX_CHARS = 1000;

/** Max characters of text to fetch per Exa result (scrapbook deep search) */
export const EXA_SCRAPBOOK_MAX_CHARS = 3000;

/** Max filings to scan per CIK-based EDGAR lookup */
export const EDGAR_SCAN_LIMIT = 50;

/** Highlight sentences from Exa */
export const EXA_HIGHLIGHT_SENTENCES = 3;

/** Token budget for intent classifier LLM call */
export const INTENT_CLASSIFIER_MAX_TOKENS = 200;

/** Token budget for query reformulation LLM call */
export const REFORMULATION_MAX_TOKENS = 100;

/** Token budget for suggestion generation LLM call */
export const SUGGESTION_MAX_TOKENS = 300;

/**
 * Channel priority for tie-breaking during merge/rank sort.
 * Higher number = higher priority.
 */
export const CHANNEL_PRIORITY: Record<ChannelId, number> = {
  "edgar-efts": 6, // SEC filings most authoritative
  exa: 5,          // Web intelligence, broad coverage
};

/** Relevance label → numeric score for sorting */
export const RELEVANCE_SCORES: Record<"high" | "medium" | "low", number> = {
  high: 3,
  medium: 2,
  low: 1,
};
