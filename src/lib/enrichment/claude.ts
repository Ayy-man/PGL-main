import Anthropic from "@anthropic-ai/sdk";

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

/**
 * Generate a 2-3 sentence AI summary explaining why this prospect is a qualified UHNWI buyer
 *
 * Uses Claude Haiku for cost efficiency (high-volume summaries)
 * Returns fallback message if enrichment data is sparse or API fails
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

    // Create Anthropic client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude Haiku for summary
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20250514",
      max_tokens: 500,
      system:
        "You are a luxury real estate prospect analyst. Generate concise 2-3 sentence summaries explaining why a prospect is a qualified UHNWI buyer. Focus on wealth signals, lifestyle indicators, and buying potential. Be specific — reference actual data points.",
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content[0];
    if (textContent.type === "text") {
      return textContent.text;
    }

    return "AI summary temporarily unavailable.";
  } catch (error) {
    console.error("Claude API error:", error);
    return "AI summary temporarily unavailable.";
  }
}
