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

const SYSTEM_PROMPT = `You are a wealth intelligence analyst writing a 2-3 sentence prospect brief for luxury real estate agents.

CRITICAL RULES:
1. NEVER fabricate data. If a wealth signal, transaction, or dollar amount is not explicitly provided in the input below, do NOT mention it.
2. If the input data is thin (e.g., only a job title and company), say so honestly: "Limited enrichment data available. Based on their role as [title] at [company]..."
3. Do NOT assume wealth from job title alone. A "VP" at a 20-person startup is different from a VP at Goldman Sachs.
4. Reference SPECIFIC data points from the input (e.g., "SEC filings show $2.3M in stock sales" -- only if that number appears below).
5. If enrichment sources are missing, note the gap: "No SEC filing data available" or "Web presence data pending."
6. NEVER use vague wealth phrases like "significant net worth" or "substantial holdings" unless backed by a specific number from the input.

Return 2-3 sentences only. No markdown. No bullet points.`;

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

    // Trigger early return only when BOTH sources are missing (&&, not ||).
    // When only one source is missing, the system prompt rule 5 instructs the LLM to note the gap.
    if (!hasWebData && !hasInsiderData) {
      return "Limited enrichment data -- web presence and SEC filing data not yet available. Enrich this prospect's profile for a detailed assessment.";
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
      const cashTxCount = insiderData.transactions.filter(
        (tx) => tx.totalValue > 0
      ).length;
      const grantTxCount = insiderData.transactions.length - cashTxCount;
      // Render separately: cash transactions (with aggregate $) and
      // grants/vests (no cash value — RSUs, option awards). Before this
      // we reported "30 transactions, total value: $0" for a prospect whose
      // 30 filings were all quarterly RSU vests, which made the LLM think
      // nothing had happened.
      const parts: string[] = [];
      if (cashTxCount > 0) parts.push(`${cashTxCount} cash transactions aggregating $${totalValue.toLocaleString()}`);
      if (grantTxCount > 0) parts.push(`${grantTxCount} grant/vest events (RSU/options)`);
      userMessage += `\n\nSEC Insider Transactions: ${parts.join(", ")}`;
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
  insiderTransactions?: Array<{
    filingDate: string;
    transactionType: string;
    securityTitle?: string;
    shares: number;
    pricePerShare?: number;
    totalValue: number;
  }> | null;
  stockSnapshot?: { ticker: string } | null;
}

const DOSSIER_SYSTEM_PROMPT = `You are a luxury real estate intelligence analyst preparing a structured profile brief for a high-net-worth prospect. Generate a JSON dossier with exactly these fields:
- summary: 2-3 sentences explaining why this person is a qualified UHNWI buyer
- career_narrative: 2-3 sentences about their career arc and current role
- wealth_assessment: 2-3 sentences about wealth signals and estimated tier
- company_context: 2-3 sentences about their company's health and position
- outreach_hooks: array of 3-5 specific conversation starters (strings)
- quick_facts: array of 4-6 objects with {label, value} for fast scanning

CRITICAL RULES — VIOLATIONS CORRUPT FINANCIAL DATA:
1. NEVER invent, estimate, or fabricate dollar amounts, share counts, transaction values, net worth figures, or any other numerical financial data. If no SEC transaction data or wealth signal data is provided in the user message, do NOT mention any dollar amounts in wealth_assessment. Say "Insufficient data for financial assessment" or describe qualitative signals only.
2. ONLY reference dollar amounts, share counts, or transaction details that are EXPLICITLY provided in the user message under "SEC Insider Transactions" or "Web Intelligence Signals". If those sections are absent, there is NO financial data — do not guess.
3. For wealth_assessment: if no SEC data and no wealth signals are provided, base your assessment ONLY on job title, company, and career seniority. Use phrases like "likely high-net-worth based on senior executive tenure" — NEVER a specific dollar figure.
4. Do NOT hallucinate company valuations, revenue figures, funding rounds, or market caps unless they appear verbatim in the provided signals.

Return valid JSON only. No markdown. No code fences. No explanation.`;

const DOSSIER_MODEL = "openai/gpt-4o-mini";

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
      // Sort by filing date DESC so the top 5 rendered are the MOST RECENT
      // transactions, not whatever order they arrived in. Without this sort
      // we'd show the 5 oldest filings — which is the opposite of what the
      // dossier LLM needs to build a current wealth narrative.
      const sortedTx = [...insiderTransactions].sort((a, b) =>
        b.filingDate.localeCompare(a.filingDate),
      );
      userMessage += `\nSEC Insider Transactions (${insiderTransactions.length} total, aggregate value $${totalValue.toLocaleString()}):\n`;
      sortedTx.slice(0, 5).forEach((tx) => {
        // Render zero-price awards/grants as qualitative rather than "$0" —
        // RSU vests and option grants have totalValue=0 on the filing but
        // represent real compensation the LLM should reason about.
        const valueStr =
          tx.totalValue > 0
            ? `($${tx.totalValue.toLocaleString()})`
            : `(grant/vest, no cash value reported)`;
        const security = tx.securityTitle ? ` ${tx.securityTitle}` : '';
        userMessage += `- ${tx.filingDate}: ${tx.transactionType}${security} — ${tx.shares.toLocaleString()} shares ${valueStr}\n`;
      });
    } else if (stockSnapshot?.ticker) {
      // Only note "no filings" when we actually looked (ie. the company IS public).
      // Otherwise we'd tell the LLM "no SEC data" for every private-company
      // prospect which just adds noise.
      userMessage += `\nSEC Insider Transactions: No Form 4 filings on record for this person at ${stockSnapshot.ticker}.\n`;
    }

    const response = await chatCompletion(DOSSIER_SYSTEM_PROMPT, userMessage, 1800, DOSSIER_MODEL);
    trackApiUsage("openrouter").catch(() => {});

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
