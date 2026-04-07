import { chatCompletion } from "@/lib/ai/openrouter";
import { trackApiUsage } from "@/lib/enrichment/track-api-usage";
import type { IntelligenceDossierData } from "@/types/database";

/**
 * Input for generating prospect summary
 */
export interface ProspectSummaryInput {
  name: string;
  title: string;
  company: string;
  contactData?: { personalEmail?: string; phone?: string } | null;
  webData?: {
    mentions: Array<{ title: string; snippet: string }>;
    wealthSignals: Array<{ type: string; description: string }>;
  } | null;
  insiderData?: {
    transactions: Array<{
      filingDate: string;
      transactionType: string;
      shares: number;
      totalValue: number;
    }>;
  } | null;
}

const SYSTEM_PROMPT =
  "You are a luxury real estate prospect analyst. Generate concise 2-3 sentence summaries explaining why a prospect is a qualified UHNWI buyer. Focus on wealth signals, lifestyle indicators, and buying potential. Be specific — reference actual data points.";

/**
 * Generate a 2-3 sentence AI summary explaining why this prospect is a qualified UHNWI buyer
 *
 * Uses OpenRouter (Claude Haiku) for cost efficiency on high-volume summaries.
 * Returns fallback message if enrichment data is sparse or API fails.
 */
export async function generateProspectSummary(
  params: ProspectSummaryInput
): Promise<string> {
  try {
    const { name, title, company, contactData, webData, insiderData } = params;

    // Check if we have sufficient data for meaningful summary
    const hasWebData = webData && webData.mentions.length > 0;
    const hasInsiderData = insiderData && insiderData.transactions.length > 0;

    if (!hasWebData && !hasInsiderData) {
      return "Insufficient enrichment data for AI summary. Enrich this prospect's profile for a detailed recommendation.";
    }

    // Build user message from enriched data
    let userMessage = `Generate a 2-3 sentence summary for:\n\nName: ${name}\nTitle: ${title}\nCompany: ${company}\n`;

    if (contactData?.personalEmail || contactData?.phone) {
      userMessage += `\nContact: ${contactData.personalEmail ? "Personal email available" : ""}${contactData.phone ? ", Phone available" : ""}`;
    }

    if (webData && webData.wealthSignals.length > 0) {
      userMessage += `\n\nWealth Signals:\n`;
      webData.wealthSignals.slice(0, 3).forEach((signal) => {
        userMessage += `- ${signal.type}: ${signal.description}\n`;
      });
    }

    if (webData && webData.mentions.length > 0) {
      userMessage += `\n\nWeb Mentions:\n`;
      webData.mentions.slice(0, 2).forEach((mention) => {
        userMessage += `- ${mention.title}: ${mention.snippet}\n`;
      });
    }

    if (insiderData && insiderData.transactions.length > 0) {
      const totalValue = insiderData.transactions.reduce(
        (sum, tx) => sum + tx.totalValue,
        0
      );
      userMessage += `\n\nSEC Insider Transactions: ${insiderData.transactions.length} transactions, total value: $${totalValue.toLocaleString()}`;
    }

    const response = await chatCompletion(SYSTEM_PROMPT, userMessage, 500);

    trackApiUsage("claude").catch(() => {});
    return response.text;
  } catch (error) {
    console.error("AI summary error:", error);
    return "AI summary temporarily unavailable.";
  }
}

export interface DossierInput {
  name: string;
  title: string;
  company: string;
  workEmail?: string | null;
  contactData?: { personalEmail?: string; phone?: string } | null;
  webSignals?: Array<{ category: string; headline: string; summary: string }> | null;
  insiderTransactions?: Array<{ filingDate: string; transactionType: string; shares: number; totalValue: number }> | null;
  stockSnapshot?: { ticker: string } | null;
}

const DOSSIER_SYSTEM_PROMPT = `You are a luxury real estate intelligence analyst preparing a structured profile brief for a high-net-worth prospect. Generate a JSON dossier with exactly these fields:
- summary: 2-3 sentences explaining why this person is a qualified UHNWI buyer
- career_narrative: 2-3 sentences about their career arc and current role
- wealth_assessment: 2-3 sentences about wealth signals and estimated tier
- company_context: 2-3 sentences about their company's health and position
- outreach_hooks: array of 3-5 specific conversation starters (strings)
- quick_facts: array of 4-6 objects with {label, value} for fast scanning

Return valid JSON only. No markdown. No code fences. No explanation.`;

/**
 * Generate a structured intelligence dossier for a prospect
 *
 * Uses OpenRouter (Claude Haiku) to synthesize all enrichment data into a
 * structured JSON brief. Returns null on failure (graceful degradation).
 */
export async function generateIntelligenceDossier(
  params: DossierInput
): Promise<IntelligenceDossierData | null> {
  try {
    const { name, title, company, workEmail, contactData, webSignals, insiderTransactions, stockSnapshot } = params;

    // When company is unknown, surface the email domain as a company signal
    const companyLine = company || (workEmail ? `Unknown (email domain: ${workEmail.split("@")[1]})` : "Unknown");

    // Build rich user message from ALL enrichment data
    let userMessage = `Generate a structured intelligence dossier for:\n\nName: ${name}\nTitle: ${title}\nCompany: ${companyLine}\n`;

    if (contactData?.personalEmail || contactData?.phone) {
      userMessage += `\nContact availability: ${contactData.personalEmail ? "Personal email found" : ""}${contactData.phone ? ", Phone found" : ""}\n`;
    }

    if (stockSnapshot?.ticker) {
      userMessage += `\nPublicly traded: ${stockSnapshot.ticker}\n`;
    }

    if (webSignals && webSignals.length > 0) {
      userMessage += `\nWeb Intelligence Signals:\n`;
      webSignals.forEach((s) => {
        userMessage += `- [${s.category}] ${s.headline}: ${s.summary}\n`;
      });
    }

    if (insiderTransactions && insiderTransactions.length > 0) {
      const totalValue = insiderTransactions.reduce((sum, tx) => sum + tx.totalValue, 0);
      userMessage += `\nSEC Insider Transactions (${insiderTransactions.length} total, $${totalValue.toLocaleString()}):\n`;
      insiderTransactions.slice(0, 5).forEach((tx) => {
        userMessage += `- ${tx.filingDate}: ${tx.transactionType} ${tx.shares.toLocaleString()} shares ($${tx.totalValue.toLocaleString()})\n`;
      });
    }

    const response = await chatCompletion(DOSSIER_SYSTEM_PROMPT, userMessage, 1800);
    trackApiUsage("claude").catch(() => {});

    // Strip code fences (same pattern as exa-digest.ts)
    let jsonText = response.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText) as IntelligenceDossierData;

    // Validate required fields exist
    if (
      !parsed.summary ||
      !parsed.career_narrative ||
      !parsed.wealth_assessment ||
      !parsed.company_context ||
      !Array.isArray(parsed.outreach_hooks) ||
      !Array.isArray(parsed.quick_facts)
    ) {
      console.error("[dossier] Missing required fields in parsed response");
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("[dossier] Intelligence dossier generation failed:", error);
    return null;
  }
}
