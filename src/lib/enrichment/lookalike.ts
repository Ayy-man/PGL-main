import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Zod schema for persona generation structured output
 */
const PersonaSchema = z.object({
  name: z.string().describe("Generated persona name"),
  jobTitles: z.array(z.string()).describe("Similar job titles"),
  seniority: z.enum(["entry", "manager", "director", "vp", "c-level"]),
  industries: z.array(z.string()).describe("Target industries"),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1001-5000", "5001+"]),
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

/**
 * Apollo API search response structure
 */
export interface ApolloSearchResult {
  people: Array<{
    id: string;
    name: string;
    title: string;
    organization_name: string;
    city: string;
    state: string;
    country: string;
    linkedin_url: string;
    email: string;
  }>;
  pagination: {
    total_entries: number;
    total_pages: number;
    page: number;
    per_page: number;
  };
  error?: string;
}

/**
 * Generate a lookalike persona by extracting attributes from a prospect
 * using Claude's structured outputs
 *
 * @param prospect - Prospect data including enrichment results
 * @returns Generated persona and Apollo-compatible search filters
 */
export async function generateLookalikePersona(
  prospect: ProspectData
): Promise<LookalikeResult> {
  // Create Anthropic client
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

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

  // Call Claude for structured persona extraction
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20250514",
    max_tokens: 2000,
    system: `You are a lead research analyst. Extract key professional attributes from a prospect to find similar people. Focus on role seniority, industry, company characteristics, and wealth indicators.

Return ONLY a valid JSON object with this exact structure:
{
  "name": "Generated persona name",
  "jobTitles": ["array", "of", "job", "titles"],
  "seniority": "one of: entry, manager, director, vp, c-level",
  "industries": ["array", "of", "industries"],
  "companySize": "one of: 1-10, 11-50, 51-200, 201-1000, 1001-5000, 5001+",
  "locations": ["array", "of", "locations"],
  "keywords": ["array", "of", "keywords"],
  "reasoning": "Why these attributes match"
}`,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // Parse structured output
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response format from Claude");
  }

  const personaData = JSON.parse(content.text);
  const persona = PersonaSchema.parse(personaData);

  // Convert to Apollo.io search filters
  const apolloFilters: ApolloFilters = {
    person_titles: persona.jobTitles,
    person_seniorities: [persona.seniority],
    q_organization_domains: [], // Optional, filled if company domain known
    organization_industry_tag_ids: persona.industries,
    organization_num_employees_ranges: [persona.companySize],
    person_locations: persona.locations,
    q_keywords: persona.keywords.join(" OR "),
  };

  return {
    persona: {
      name: persona.name,
      jobTitles: persona.jobTitles,
      seniority: persona.seniority,
      industries: persona.industries,
      companySize: persona.companySize,
      locations: persona.locations,
      keywords: persona.keywords,
      reasoning: persona.reasoning,
    },
    apolloFilters,
  };
}

/**
 * Search Apollo.io for people matching the generated filters
 *
 * @param filters - Apollo-compatible search filters
 * @returns Search results with people array and pagination
 */
export async function searchApollo(
  filters: ApolloFilters
): Promise<ApolloSearchResult> {
  try {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      console.error("APOLLO_API_KEY not configured");
      return {
        people: [],
        pagination: { total_entries: 0, total_pages: 0, page: 1, per_page: 25 },
        error: "Apollo API key not configured",
      };
    }

    // Build request body
    const requestBody = {
      person_titles: filters.person_titles,
      person_seniorities: filters.person_seniorities,
      q_organization_domains: filters.q_organization_domains,
      organization_industry_tag_ids: filters.organization_industry_tag_ids,
      organization_num_employees_ranges: filters.organization_num_employees_ranges,
      person_locations: filters.person_locations,
      q_keywords: filters.q_keywords,
      page: 1,
      per_page: 25,
    };

    // Call Apollo API
    const response = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    // Handle error responses
    if (!response.ok) {
      if (response.status === 401) {
        console.error("Apollo API key invalid or expired");
        return {
          people: [],
          pagination: { total_entries: 0, total_pages: 0, page: 1, per_page: 25 },
          error: "Apollo API authentication failed",
        };
      }

      if (response.status === 422) {
        const errorBody = await response.text();
        console.error("Apollo search filter validation failed:", errorBody);
        return {
          people: [],
          pagination: { total_entries: 0, total_pages: 0, page: 1, per_page: 25 },
          error: "Invalid search filters",
        };
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        console.error("Apollo rate limit hit", { retryAfter });
        return {
          people: [],
          pagination: { total_entries: 0, total_pages: 0, page: 1, per_page: 25 },
          error: `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ""}`,
        };
      }

      console.error("Apollo API error:", response.status, response.statusText);
      return {
        people: [],
        pagination: { total_entries: 0, total_pages: 0, page: 1, per_page: 25 },
        error: "Apollo API error",
      };
    }

    // Parse response
    const data = await response.json();

    return {
      people: data.people || [],
      pagination: data.pagination || {
        total_entries: 0,
        total_pages: 0,
        page: 1,
        per_page: 25,
      },
    };
  } catch (error) {
    console.error("Network error calling Apollo API:", error);
    return {
      people: [],
      pagination: { total_entries: 0, total_pages: 0, page: 1, per_page: 25 },
      error: "Network error",
    };
  }
}
