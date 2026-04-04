import { chatCompletion } from "@/lib/ai/openrouter";
import { z } from "zod";

/**
 * Zod schema for persona generation structured output
 */
const PersonaSchema = z.object({
  name: z.string().describe("Generated persona name"),
  jobTitles: z.array(z.string()).describe("Similar job titles"),
  seniorities: z.array(
    z.enum(["owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager", "senior", "entry", "intern"])
  ).describe("Seniority levels"),
  industries: z.array(z.string()).describe("Target industries"),
  companySizes: z.array(
    z.enum(["1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000", "10001,"])
  ).describe("Employee count ranges"),
  locations: z.array(z.string()).optional().describe("Target locations"),
  keywords: z.array(z.string()).describe("Keywords for this persona"),
  reasoning: z.string().describe("Why these attributes match"),
});

/**
 * Input data for lookalike persona generation
 */
export interface ProspectData {
  name: string;
  title: string | null;
  company: string | null;
  linkedin: string | null;
  webData?: {
    mentions?: Array<{ title: string; snippet: string }>;
    wealthSignals?: Array<{ type: string; description: string }>;
  } | null;
  insiderData?: {
    transactions?: Array<{
      filingDate: string;
      transactionType: string;
      shares: number;
      totalValue: number;
    }>;
  } | null;
  ai_summary?: string | null;
}

/**
 * Apollo.io search filters
 */
export interface ApolloFilters {
  person_titles?: string[];
  person_seniorities?: string[];
  q_organization_domains?: string[];
  organization_industry_tag_ids?: string[];
  organization_num_employees_ranges?: string[];
  person_locations?: string[];
  q_keywords?: string;
}

/**
 * Generated persona with Apollo filters
 */
export interface LookalikeResult {
  persona: {
    name: string;
    jobTitles: string[];
    seniority: string;
    industries: string[];
    companySize: string;
    locations?: string[];
    keywords: string[];
    reasoning: string;
  };
  apolloFilters: ApolloFilters;
}

const SYSTEM_PROMPT = `You are a lead research analyst. Your goal is to generate search filters that will find REAL similar people on Apollo.io. The filters must be broad enough to return results.

CRITICAL RULES:
- NEVER use the prospect's own name as the persona name. Use a descriptive label like "Quant Traders - Financial Services".
- Cast a WIDE net: use 3-5 job title VARIATIONS (e.g., "Quant Trader", "Quantitative Analyst", "Algorithmic Trader", "Portfolio Manager").
- Use BROAD industries (e.g., "Financial Services" not "Hedge Funds"). Apollo uses keyword tags, so keep them general.
- Include MULTIPLE seniority levels to avoid filtering out results.
- Only include locations if the prospect's location is known. Omit locations entirely if unknown.
- Keep keywords short and general (2-3 max). Avoid overly specific terms.
- Company size should cover a range — include 2-3 ranges.

Return ONLY a valid JSON object with this exact structure:
{
  "name": "Descriptive persona label (NEVER the prospect's name)",
  "jobTitles": ["3-5 related title variations"],
  "seniorities": ["include 2-3 levels to cast a wider net"],
  "industries": ["1-2 broad industries"],
  "companySizes": ["2-3 ranges from ONLY: 1,10 | 11,50 | 51,200 | 201,500 | 501,1000 | 1001,5000 | 5001,10000 | 10001,"],
  "locations": ["omit or leave empty if location unknown"],
  "keywords": ["2-3 broad keywords"],
  "reasoning": "Brief explanation"
}`;

/**
 * Generate a lookalike persona by extracting attributes from a prospect
 * using AI structured outputs.
 *
 * @param prospect - Prospect data including enrichment results
 * @returns Generated persona and Apollo-compatible search filters
 */
export async function generateLookalikePersona(
  prospect: ProspectData
): Promise<LookalikeResult> {
  // Build user message from prospect data
  let userMessage = `Extract professional attributes from this prospect to find similar people:\n\n`;
  userMessage += `Name: ${prospect.name}\n`;
  userMessage += `Title: ${prospect.title || "Unknown"}\n`;
  userMessage += `Company: ${prospect.company || "Unknown"}\n`;

  if (prospect.linkedin) {
    userMessage += `LinkedIn: ${prospect.linkedin}\n`;
  }

  if (prospect.ai_summary) {
    userMessage += `\nAI Summary: ${prospect.ai_summary}\n`;
  }

  if (prospect.webData?.wealthSignals && prospect.webData.wealthSignals.length > 0) {
    userMessage += `\nWealth Signals:\n`;
    prospect.webData.wealthSignals.forEach((signal) => {
      userMessage += `- ${signal.type}: ${signal.description}\n`;
    });
  }

  if (prospect.webData?.mentions && prospect.webData.mentions.length > 0) {
    userMessage += `\nWeb Mentions:\n`;
    prospect.webData.mentions.slice(0, 3).forEach((mention) => {
      userMessage += `- ${mention.title}: ${mention.snippet}\n`;
    });
  }

  if (prospect.insiderData?.transactions && prospect.insiderData.transactions.length > 0) {
    const totalValue = prospect.insiderData.transactions.reduce(
      (sum, tx) => sum + tx.totalValue,
      0
    );
    userMessage += `\nSEC Insider Transactions: ${prospect.insiderData.transactions.length} transactions, total value: $${totalValue.toLocaleString()}\n`;
  }

  // Call AI for structured persona extraction
  console.info("[lookalike] ── Generating persona ──", {
    prospect: prospect.name,
    title: prospect.title,
    company: prospect.company,
  });
  const llmStart = Date.now();

  const response = await chatCompletion(SYSTEM_PROMPT, userMessage, 2000);

  const llmMs = Date.now() - llmStart;
  console.info(`[lookalike] AI response (${llmMs}ms)`, {
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  });

  // Parse structured output
  console.info("[lookalike] Raw LLM output:", response.text);

  // Handle markdown code blocks
  let jsonStr = response.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const personaData = JSON.parse(jsonStr);
  // Map AI seniority strings to Apollo enum values
  const SENIORITY_MAP: Record<string, string> = {
    "owner": "owner", "founder": "founder", "c_suite": "c_suite", "c suite": "c_suite",
    "partner": "partner", "vp": "vp", "vice president": "vp", "head": "head",
    "director": "director", "manager": "manager", "senior": "senior",
    "entry": "entry", "entry level": "entry", "entry-level": "entry",
    "intern": "intern", "internship": "intern",
    "mid-senior level": "senior", "mid-senior": "senior", "mid level": "manager",
    "executive": "c_suite", "chief": "c_suite", "principal": "director",
    "lead": "head", "associate": "entry", "analyst": "entry", "junior": "entry",
  };
  const VALID_SENIORITIES = new Set(["owner","founder","c_suite","partner","vp","head","director","manager","senior","entry","intern"]);
  if (Array.isArray(personaData.seniorities)) {
    personaData.seniorities = personaData.seniorities
      .map((s: string) => SENIORITY_MAP[s.toLowerCase()] || s.toLowerCase())
      .filter((s: string) => VALID_SENIORITIES.has(s));
    if (personaData.seniorities.length === 0) {
      personaData.seniorities = ["senior", "manager", "director"];
    }
  }
  const persona = PersonaSchema.parse(personaData);

  console.info("[lookalike] ── Persona generated ──", {
    name: persona.name,
    titles: persona.jobTitles,
    seniorities: persona.seniorities,
    industries: persona.industries,
    companySizes: persona.companySizes,
    locations: persona.locations,
  });

  // Strip invalid/placeholder locations
  const validLocations = (persona.locations || []).filter(
    (l) => l && !["unknown", "n/a", "not specified", "undisclosed"].includes(l.toLowerCase())
  );

  // Convert to Apollo.io search filters
  const apolloFilters: ApolloFilters = {
    person_titles: persona.jobTitles,
    person_seniorities: persona.seniorities,
    q_organization_domains: [], // Optional, filled if company domain known
    organization_industry_tag_ids: persona.industries,
    organization_num_employees_ranges: persona.companySizes,
    person_locations: validLocations.length > 0 ? validLocations : undefined,
    q_keywords: persona.keywords.join(" OR "),
  };

  return {
    persona: {
      name: persona.name,
      jobTitles: persona.jobTitles,
      seniority: persona.seniorities.join(", "),
      industries: persona.industries,
      companySize: persona.companySizes.join(", "),
      locations: persona.locations,
      keywords: persona.keywords,
      reasoning: persona.reasoning,
    },
    apolloFilters,
  };
}
