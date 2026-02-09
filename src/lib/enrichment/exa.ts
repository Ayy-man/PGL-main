import { withCircuitBreaker } from '../circuit-breaker';

/**
 * Exa.ai API enrichment result
 */
export type ExaResult = {
  found: boolean;
  mentions: Array<{
    title: string;
    url: string;
    snippet: string;
    publishDate?: string;
  }>;
  wealthSignals: Array<{
    type: string;
    description: string;
    source: string;
  }>;
  error?: string;
  circuitOpen?: boolean;
};

/**
 * Exa.ai API response structure
 */
type ExaApiResponse = {
  results: Array<{
    title: string;
    url: string;
    text?: string;
    publishedDate?: string;
  }>;
};

/**
 * Wealth signal keywords to search for in content
 */
const WEALTH_KEYWORDS = [
  { keyword: 'funding', type: 'Funding Round' },
  { keyword: 'acquisition', type: 'Acquisition' },
  { keyword: 'IPO', type: 'IPO' },
  { keyword: 'exit', type: 'Company Exit' },
  { keyword: 'billion', type: 'Valuation' },
  { keyword: 'million', type: 'Valuation' },
  { keyword: 'net worth', type: 'Personal Wealth' },
  { keyword: 'board', type: 'Board Membership' },
  { keyword: 'investor', type: 'Investment Activity' },
  { keyword: 'raised', type: 'Capital Raise' },
] as const;

/**
 * Extract wealth signals from text snippets
 */
function extractWealthSignals(snippets: Array<{ text: string; url: string }>): ExaResult['wealthSignals'] {
  const signals: ExaResult['wealthSignals'] = [];

  for (const snippet of snippets) {
    const lowerText = snippet.text.toLowerCase();

    for (const { keyword, type } of WEALTH_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        // Extract surrounding context (up to 150 chars)
        const index = lowerText.indexOf(keyword.toLowerCase());
        const start = Math.max(0, index - 75);
        const end = Math.min(snippet.text.length, index + keyword.length + 75);
        const context = snippet.text.substring(start, end).trim();

        signals.push({
          type,
          description: context,
          source: snippet.url,
        });
      }
    }
  }

  return signals;
}

/**
 * Internal function to enrich using Exa.ai search API
 *
 * @param params - Person details to search for
 * @returns Exa enrichment result with mentions and wealth signals
 */
async function enrichExaInternal(params: {
  name: string;
  company: string;
  title?: string;
}): Promise<ExaResult> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    return {
      found: false,
      mentions: [],
      wealthSignals: [],
      error: 'Exa API key not configured',
    };
  }

  if (!params.name || !params.company) {
    return {
      found: false,
      mentions: [],
      wealthSignals: [],
      error: 'Name and company required',
    };
  }

  try {
    // Build search query with person context
    const query = `"${params.name}" "${params.company}" executive OR founder OR investor`;

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        type: 'auto',
        numResults: 5,
        contents: {
          text: {
            maxCharacters: 500,
          },
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          found: false,
          mentions: [],
          wealthSignals: [],
          error: 'Rate limit exceeded',
        };
      }

      return {
        found: false,
        mentions: [],
        wealthSignals: [],
        error: `Exa API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as ExaApiResponse;

    if (!data.results || data.results.length === 0) {
      return {
        found: false,
        mentions: [],
        wealthSignals: [],
      };
    }

    // Extract mentions
    const mentions = data.results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.text || '',
      publishDate: result.publishedDate,
    }));

    // Extract wealth signals from snippets
    const snippetsForSignals = data.results
      .filter((r) => r.text)
      .map((r) => ({ text: r.text!, url: r.url }));

    const wealthSignals = extractWealthSignals(snippetsForSignals);

    return {
      found: true,
      mentions,
      wealthSignals,
    };
  } catch (error) {
    return {
      found: false,
      mentions: [],
      wealthSignals: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enriches web presence and wealth signals using Exa.ai search
 * Wrapped with circuit breaker for resilience (15s timeout for slower searches)
 *
 * @param params - Person details to search for
 * @returns Exa enrichment result with news mentions and wealth indicators
 */
export const enrichExa = withCircuitBreaker(
  enrichExaInternal,
  { name: 'exa', timeout: 15000 }
);
