import { withCircuitBreaker } from '../circuit-breaker';

/**
 * SEC EDGAR API enrichment result
 */
export type EdgarResult = {
  found: boolean;
  transactions: Array<{
    filingDate: string;
    transactionType: string;
    securityTitle: string;
    shares: number;
    pricePerShare: number;
    totalValue: number;
  }>;
  error?: string;
  circuitOpen?: boolean;
};

/**
 * SEC EDGAR submissions API response
 */
type EdgarSubmissionsResponse = {
  cik: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
    };
  };
};

/**
 * Rate limiter for SEC EDGAR API (max 10 requests per second)
 * SEC requires respectful rate limiting - we use 150ms between requests
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 150; // 150ms = ~6.67 requests per second (well under 10/sec limit)

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Parse Form 4 XML for transaction details
 * Simplified version - extracts key fields using regex
 *
 * Note: Full XML parsing would be more robust but adds dependencies.
 * This approach handles common Form 4 structures.
 */
function parseForm4Xml(xml: string): Array<{
  transactionType: string;
  securityTitle: string;
  shares: number;
  pricePerShare: number;
}> {
  const transactions: Array<{
    transactionType: string;
    securityTitle: string;
    shares: number;
    pricePerShare: number;
  }> = [];

  try {
    // Extract all nonDerivativeTransaction blocks
    const transactionRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/g;
    const transactionMatches = xml.matchAll(transactionRegex);

    for (const match of transactionMatches) {
      const txBlock = match[1];

      // Extract transaction code (P = Purchase, S = Sale, A = Award, etc.)
      const codeMatch = txBlock.match(/<transactionCode>([A-Z])<\/transactionCode>/);
      const code = codeMatch?.[1];

      // Extract security title
      const titleMatch = txBlock.match(/<securityTitle>(.*?)<\/securityTitle>/);
      const title = titleMatch?.[1]?.trim();

      // Extract shares
      const sharesMatch = txBlock.match(/<transactionShares>\s*<value>([\d.]+)<\/value>/);
      const shares = sharesMatch?.[1] ? parseFloat(sharesMatch[1]) : 0;

      // Extract price per share
      const priceMatch = txBlock.match(/<transactionPricePerShare>\s*<value>([\d.]+)<\/value>/);
      const price = priceMatch?.[1] ? parseFloat(priceMatch[1]) : 0;

      if (code && title && shares > 0) {
        const transactionType = code === 'P' ? 'Purchase' : code === 'S' ? 'Sale' : code === 'A' ? 'Award' : code;

        transactions.push({
          transactionType,
          securityTitle: title,
          shares,
          pricePerShare: price,
        });
      }
    }
  } catch (error) {
    // If parsing fails, return empty array
    console.warn('[Edgar] Failed to parse Form 4 XML:', error);
  }

  return transactions;
}

/**
 * Internal function to enrich using SEC EDGAR API
 *
 * @param params - CIK (Central Index Key) and person name
 * @returns SEC EDGAR enrichment result with Form 4 insider transactions
 */
async function enrichEdgarInternal(params: {
  cik: string;
  name: string;
}): Promise<EdgarResult> {
  const userAgent = process.env.SEC_EDGAR_USER_AGENT;

  if (!userAgent) {
    return {
      found: false,
      transactions: [],
      error: 'SEC EDGAR User-Agent not configured (required by SEC)',
    };
  }

  if (!params.cik) {
    return {
      found: false,
      transactions: [],
      error: 'CIK required',
    };
  }

  try {
    // Respect SEC rate limits
    await waitForRateLimit();

    // Pad CIK to 10 digits as required by SEC API
    const paddedCik = params.cik.padStart(10, '0');

    // Fetch company submissions
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
    const submissionsResponse = await fetch(submissionsUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
      },
    });

    if (submissionsResponse.status === 404) {
      return {
        found: false,
        transactions: [],
        error: 'CIK not found - company may not be public',
      };
    }

    if (!submissionsResponse.ok) {
      return {
        found: false,
        transactions: [],
        error: `SEC API error: ${submissionsResponse.status} ${submissionsResponse.statusText}`,
      };
    }

    const submissionsData = await submissionsResponse.json() as EdgarSubmissionsResponse;

    // Find Form 4 filings (insider transactions)
    const form4Indices: number[] = [];
    submissionsData.filings.recent.form.forEach((form, index) => {
      if (form === '4') {
        form4Indices.push(index);
      }
    });

    if (form4Indices.length === 0) {
      return {
        found: true,
        transactions: [],
      };
    }

    // Fetch up to 10 most recent Form 4 filings
    const form4sToFetch = form4Indices.slice(0, 10);
    const allTransactions: EdgarResult['transactions'] = [];

    for (const index of form4sToFetch) {
      const filingDate = submissionsData.filings.recent.filingDate[index];
      const accessionNumber = submissionsData.filings.recent.accessionNumber[index];
      const primaryDocument = submissionsData.filings.recent.primaryDocument[index];

      // Respect rate limits between requests
      await waitForRateLimit();

      // Build URL for Form 4 XML document
      const accessionNoSlash = accessionNumber.replace(/-/g, '');
      const documentUrl = `https://www.sec.gov/Archives/edgar/data/${params.cik}/${accessionNoSlash}/${primaryDocument}`;

      try {
        const documentResponse = await fetch(documentUrl, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'application/xml,text/xml,*/*',
          },
        });

        if (!documentResponse.ok) {
          console.warn(`[Edgar] Failed to fetch Form 4 document: ${documentUrl}`);
          continue;
        }

        const xmlContent = await documentResponse.text();
        const parsedTransactions = parseForm4Xml(xmlContent);

        // Add filing date and calculate total value
        for (const tx of parsedTransactions) {
          allTransactions.push({
            filingDate,
            transactionType: tx.transactionType,
            securityTitle: tx.securityTitle,
            shares: tx.shares,
            pricePerShare: tx.pricePerShare,
            totalValue: tx.shares * tx.pricePerShare,
          });
        }
      } catch (error) {
        console.warn(`[Edgar] Failed to parse Form 4: ${error}`);
        continue;
      }
    }

    // Sort by filing date DESC and limit to 30 transactions
    allTransactions.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
    const limitedTransactions = allTransactions.slice(0, 30);

    return {
      found: true,
      transactions: limitedTransactions,
    };
  } catch (error) {
    return {
      found: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enriches SEC Form 4 insider transaction data using SEC EDGAR API
 * Wrapped with circuit breaker for resilience (15s timeout, 60s reset)
 *
 * Note: SEC API requires User-Agent header with contact information
 * Set SEC_EDGAR_USER_AGENT env var to: "AppName admin@email.com"
 *
 * @param params - CIK and person name
 * @returns SEC EDGAR enrichment result with insider transactions
 */
export const enrichEdgar = withCircuitBreaker(
  enrichEdgarInternal,
  { name: 'sec-edgar', timeout: 15000, resetTimeout: 60000 }
);
