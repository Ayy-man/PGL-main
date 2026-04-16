import { chatCompletion } from "@/lib/ai/openrouter";
import { trackApiUsage } from "@/lib/enrichment/track-api-usage";

/**
 * Wealth tier taxonomy — aligned with manual_wealth_tier enum (CONTEXT.md D-01).
 */
export type WealthTier = "ultra_high" | "very_high" | "high" | "emerging" | "unknown";
export type WealthConfidence = "high" | "medium" | "low";
export type WealthPrimarySignal =
  | "sec_cash"
  | "sec_equity"
  | "web_signals"
  | "career_inference"
  | "insufficient";

export interface WealthTierInput {
  name: string;
  title: string;
  company: string;
  secTransactions: Array<{
    filingDate: string;
    transactionType: string;
    securityTitle?: string;
    shares: number;
    pricePerShare?: number;
    totalValue: number;
  }> | null;
  webSignals: Array<{ category: string; headline: string; summary: string }> | null;
  stockSnapshot: { ticker: string } | null;
}

export interface WealthTierResult {
  tier: WealthTier;
  confidence: WealthConfidence;
  primary_signal: WealthPrimarySignal;
  reasoning: string;
}

// NOTE: rubric rule 5 collapses CONTEXT.md D-05's two C-suite rules into one,
// because the market-cap field referenced in D-05 is absent from the current
// StockSnapshot type (see RESEARCH.md Pitfall 1). Using presence-of-ticker +
// RSU grants as the public-co-C-suite signal instead.
//
// 2026-04-17 rubric rebalance: original rubric was too conservative and
// defaulted real insiders / partners to `unknown` (Maria Lisa @ Sax LLP
// accounting, Harold Ford family-office manager w/ $553K SEC cash). Goal of
// this classifier is to qualify leads for luxury RE outreach — an educated
// guess at `emerging low` beats `unknown` every time. Expanded title allowlist,
// added sub-$1M SEC insider rule, made `unknown` a genuine last resort.
const SYSTEM_PROMPT = `You are a wealth intelligence analyst classifying a prospect's wealth tier for luxury real estate outreach.

Return STRICT JSON with these fields only:
{
  "tier": "ultra_high" | "very_high" | "high" | "emerging" | "unknown",
  "confidence": "high" | "medium" | "low",
  "primary_signal": "sec_cash" | "sec_equity" | "web_signals" | "career_inference" | "insufficient",
  "reasoning": "<1 sentence citing specific numbers or role from the input>"
}

TIER DEFINITIONS:
- ultra_high: $50M+ net worth (UHNW)
- very_high: $10M-$50M (VHNW)
- high: $5M-$10M (HNW)
- emerging: $1M-$5M (Affluent entry)
- unknown: genuinely insufficient data — use ONLY as a last resort

CORE PHILOSOPHY — PREFER AN EDUCATED GUESS OVER "unknown":
This classifier exists to qualify leads for a luxury real estate firm. Senior
professionals at real firms are almost always affluent. If you have any signal
at all (title, company, SEC filings, web mentions), commit to a tier with the
appropriate confidence level instead of defaulting to "unknown". Use low
confidence when you're inferring from career alone — do not use that as an
excuse to opt out. "unknown" is only correct when you have essentially nothing
to work with (missing title, missing company, no signals).

SCORING RUBRIC — apply in order, first match wins:

Hard signals (high confidence):
1. SEC cash-transaction aggregate > $50M -> ultra_high, high confidence
2. SEC cash-transaction aggregate $10M-$50M -> very_high, high confidence
3. SEC cash-transaction aggregate $5M-$10M -> high, high confidence
4. SEC cash-transaction aggregate $1M-$5M -> emerging, high confidence

Web signals (medium confidence):
5. Exa "funding" or "wealth_signal" with explicit Forbes/Bloomberg wealth-list mention -> ultra_high, medium confidence
6. Exa explicit company IPO or exit mention -> very_high, medium confidence

SEC insider inference (medium confidence — any Form 4 at all means public-co insider):
7. Any SEC filings AND public-company ticker AND title contains "CEO"/"CFO"/"CTO"/"COO"/"President"/"Chairman"/"Chief" -> very_high, medium confidence
8. Any SEC filings (cash or grants) present, regardless of aggregate size -> high, medium confidence (public-co insider is a meaningful wealth signal)

Career inference (low-medium confidence — title + company patterns):
9. Title contains "Managing Partner" / "Managing Director" / "General Partner" / "Senior Partner" at ANY firm -> high, medium confidence
10. Title contains "Partner" (standalone) at law firm / accounting firm / consulting firm / investment bank / PE / VC / hedge fund -> high, medium confidence
11. Title contains "Family Office" (Manager/Director/Principal/Partner/Head) -> high, medium confidence (family office roles manage UHNW capital and typically share in it)
12. Title contains "Founder" / "Co-Founder" / "Owner" at any private company -> high, low confidence
13. Title contains "Partner" at any other professional-services firm -> emerging, medium confidence
14. Title contains "Principal" / "Director" / "VP" / "Vice President" / "Head of" at any established firm -> emerging, low confidence
15. Senior exec title (anything above Manager) at a recognizable firm -> emerging, low confidence

Last resort:
16. Missing title OR missing company OR title is generic ("Employee", "Associate", "Analyst") with no other signals -> unknown, low confidence

ANTI-HALLUCINATION RULES:
- NEVER invent dollar amounts not present in the input.
- NEVER cite Forbes/Bloomberg list unless explicitly in Exa signals.
- Use the FIRST matching rule. Do NOT pick a higher tier just because it could be justified.
- Cite specific numbers in the reasoning (e.g. "SEC cash aggregate $12.3M") when you use a numeric rule.
- For career inference (rules 9-15), cite the role and company in the reasoning (e.g. "Partner at established accounting firm").
- You are NOT guessing blindly — low confidence simply means the signal is title/company rather than hard financials.

Return JSON only. No markdown. No code fences. No prose.`;

const MODEL = "openai/gpt-4o-mini";
const MAX_TOKENS = 300;
const VALID_TIERS: WealthTier[] = ["ultra_high", "very_high", "high", "emerging", "unknown"];
const VALID_CONFIDENCE: WealthConfidence[] = ["high", "medium", "low"];
const VALID_PRIMARY: WealthPrimarySignal[] = [
  "sec_cash",
  "sec_equity",
  "web_signals",
  "career_inference",
  "insufficient",
];

/**
 * Build the user message given pre-computed aggregates on the input bundle.
 * Mirrors the dossier prompt pattern: title/company/ticker, SEC tx split
 * (cash vs grant), top-3 cash transactions, and up to 5 wealth-tagged
 * web signals. Renders "none" sentinels when a category has no data so
 * the LLM can apply rule 10 unambiguously.
 */
function buildUserMessage(input: WealthTierInput): string {
  const { name, title, company, secTransactions, webSignals, stockSnapshot } = input;

  const cashTxs = (secTransactions ?? []).filter((tx) => tx.totalValue > 0);
  const grantTxs = (secTransactions ?? []).filter((tx) => tx.totalValue === 0);
  const cashAggregate = cashTxs.reduce((sum, tx) => sum + tx.totalValue, 0);
  const wealthExaSignals = (webSignals ?? []).filter(
    (s) => s.category === "wealth_signal" || s.category === "funding"
  );

  let msg = `Classify wealth tier for:\n\n`;
  msg += `Name: ${name}\nTitle: ${title}\nCompany: ${company}\n`;
  if (stockSnapshot?.ticker) {
    msg += `Publicly traded: ${stockSnapshot.ticker}\n`;
  }

  if (secTransactions && secTransactions.length > 0) {
    msg += `\nSEC Form 4 Transactions (${secTransactions.length} total):\n`;
    msg += `- Cash transactions: ${cashTxs.length}, aggregate $${cashAggregate.toLocaleString()}\n`;
    msg += `- Grant/vest events (RSU/options): ${grantTxs.length}\n`;
    const topCash = [...cashTxs].sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);
    if (topCash.length > 0) {
      msg += `Top cash transactions:\n`;
      topCash.forEach((tx) => {
        msg += `  - ${tx.filingDate} ${tx.transactionType}: $${tx.totalValue.toLocaleString()}\n`;
      });
    }
  } else {
    msg += `\nSEC Form 4 Transactions: none on record.\n`;
  }

  if (wealthExaSignals.length > 0) {
    msg += `\nWeb Intelligence (wealth-related):\n`;
    wealthExaSignals.slice(0, 5).forEach((s) => {
      msg += `- [${s.category}] ${s.headline}: ${s.summary}\n`;
    });
  } else {
    msg += `\nWeb Intelligence: no wealth_signal or funding signals found.\n`;
  }

  return msg;
}

/**
 * Estimate a prospect's wealth tier by synthesizing SEC transactions, Exa
 * wealth signals, and career context through a structured-output LLM call.
 *
 * Returns null on ANY error path (network, JSON parse, fence-strip failure,
 * invalid enum, empty reasoning). Never throws — callers rely on null-sentinel
 * to mark the enrichment source as `failed` and continue the pipeline
 * (see RESEARCH.md Pitfall 4 / dossier pattern).
 *
 * The output tier/confidence/primary_signal are lowercased + space-normalized
 * before enum validation to defensively handle LLM casing drift (Pitfall 2).
 */
export async function estimateWealthTier(
  params: WealthTierInput
): Promise<WealthTierResult | null> {
  try {
    const userMessage = buildUserMessage(params);

    const response = await chatCompletion(SYSTEM_PROMPT, userMessage, MAX_TOKENS, MODEL);
    trackApiUsage("openrouter").catch(() => {});

    // Strip code fences (same pattern as claude.ts / exa-digest.ts)
    let jsonText = response.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    const raw = JSON.parse(jsonText);

    // Normalize casing defensively (Pitfall 2 — LLM may return "Very_High" / "VERY HIGH")
    const tier = String(raw.tier ?? "").toLowerCase().replace(/\s+/g, "_") as WealthTier;
    const confidence = String(raw.confidence ?? "").toLowerCase() as WealthConfidence;
    const primary_signal = String(raw.primary_signal ?? "").toLowerCase() as WealthPrimarySignal;
    const reasoning = typeof raw.reasoning === "string" ? raw.reasoning.trim() : "";

    if (
      !VALID_TIERS.includes(tier) ||
      !VALID_CONFIDENCE.includes(confidence) ||
      !VALID_PRIMARY.includes(primary_signal) ||
      !reasoning
    ) {
      console.error("[wealth-tier] Invalid LLM response:", raw);
      return null;
    }

    return { tier, confidence, primary_signal, reasoning };
  } catch (error) {
    console.error("[wealth-tier] Estimation failed:", error);
    return null;
  }
}
