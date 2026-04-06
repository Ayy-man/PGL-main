import { withCircuitBreaker } from '../circuit-breaker';
import { edgarRateLimiter } from '../rate-limit/limiters';
import { trackApiUsage } from '@/lib/enrichment/track-api-usage';
import { redis } from '@/lib/cache/redis';

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
 * Check SEC EDGAR rate limit via Upstash Redis.
 * Throws if rate limit is exceeded (10 requests per second).
 */
async function waitForRateLimit(): Promise<void> {
  const result = await edgarRateLimiter.limit('sec-edgar:global');
  if (!result.success) {
    const waitMs = Math.max(result.reset - Date.now(), 100);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

type CompanyTickerEntry = {
  cik_str: number;
  ticker: string;
  title: string;
};

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]/g, '')
    .replace(/\b(inc|incorporated|corp|corporation|company|co|ltd|limited|llc|lp|plc|group|holdings|the|&)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rebrand / subsidiary alias table.
 * Maps common brand names → SEC legal entity names.
 * null = private subsidiary with no SEC filings (skip lookup).
 */
const COMPANY_ALIASES: Record<string, string | null> = {
  'google': 'alphabet inc',
  'facebook': 'meta platforms inc',
  'meta': 'meta platforms inc',
  'twitter': 'x corp',
  'ibm': 'international business machines corp',
  'hewlett packard': 'hp inc',
  'hp enterprise': 'hewlett packard enterprise co',
  'instagram': null, // private subsidiary — skip
  'whatsapp': null,  // private subsidiary — skip
  'youtube': null,   // private subsidiary — skip
  'aws': 'amazon com inc',
  'azure': 'microsoft corp',
  'gcp': 'alphabet inc',
  'jpmorgan': 'jpmorgan chase  co',
  'jp morgan': 'jpmorgan chase  co',
  'goldman': 'goldman sachs group inc',
  'morgan stanley': 'morgan stanley',
  'wells fargo': 'wells fargo  co',
  'bank of america': 'bank of america corp',
  'bofa': 'bank of america corp',
};

const TICKERS_CACHE_KEY = 'edgar:tickers:v1';
const TICKERS_TTL_SECONDS = 86400; // 24 hours

/**
 * Look up a company's CIK and ticker from SEC EDGAR's company tickers registry.
 * Uses fuzzy company name matching against SEC's public tickers JSON.
 * company_tickers.json is cached in Redis for 24h to avoid re-downloading ~10MB on every call.
 */
export async function lookupCompanyCik(companyName: string): Promise<{
  cik: string;
  ticker: string;
  companyName: string;
} | null> {
  if (!companyName) return null;

  // Check rebrand/alias table
  const normalizedInput = normalizeCompanyName(companyName);
  const aliasKey = Object.keys(COMPANY_ALIASES).find(k => normalizedInput.includes(k));
  if (aliasKey !== undefined) {
    const aliasValue = COMPANY_ALIASES[aliasKey];
    if (aliasValue === null) return null; // Private subsidiary — no SEC filings
    companyName = aliasValue; // Use SEC legal name for lookup
  }

  const userAgent = process.env.SEC_EDGAR_USER_AGENT;
  if (!userAgent) return null;

  let entries: CompanyTickerEntry[];
  try {
    const cached = await redis.get<CompanyTickerEntry[]>(TICKERS_CACHE_KEY);
    if (cached) {
      entries = cached;
    } else {
      await waitForRateLimit();
      const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': userAgent, 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const data = await response.json() as Record<string, CompanyTickerEntry>;
      entries = Object.values(data);
      // Fire-and-forget cache write
      redis.set(TICKERS_CACHE_KEY, entries, { ex: TICKERS_TTL_SECONDS }).catch(() => {});
    }
  } catch {
    // Redis failure — fall back to live fetch
    await waitForRateLimit();
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': userAgent, 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, CompanyTickerEntry>;
    entries = Object.values(data);
  }

  const normalized = normalizeCompanyName(companyName);
  const compact = normalized.replace(/\s+/g, '');

  // Pass 1: exact normalized match
  for (const entry of entries) {
    if (normalizeCompanyName(entry.title) === normalized) {
      return { cik: String(entry.cik_str), ticker: entry.ticker, companyName: entry.title };
    }
  }

  // Pass 2: starts-with match (either direction)
  for (const entry of entries) {
    const entryNorm = normalizeCompanyName(entry.title);
    if (entryNorm.startsWith(normalized) || normalized.startsWith(entryNorm)) {
      return { cik: String(entry.cik_str), ticker: entry.ticker, companyName: entry.title };
    }
  }

  // Pass 3: compact match (removes spaces — handles "JP Morgan" vs "JPMORGAN")
  for (const entry of entries) {
    const entryCompact = normalizeCompanyName(entry.title).replace(/\s+/g, '');
    if (entryCompact.startsWith(compact) || compact.startsWith(entryCompact)) {
      return { cik: String(entry.cik_str), ticker: entry.ticker, companyName: entry.title };
    }
  }

  return null;
}

/**
 * Parse Form 4 XML for transaction details.
 * Simplified version - extracts key fields using regex.
 *
 * When ownerName is provided, filters filings by rptOwnerName using
 * token overlap (>= 2 matching tokens required — first + last name).
 *
 * Note: Full XML parsing would be more robust but adds dependencies.
 * This approach handles common Form 4 structures.
 */
function parseForm4Xml(xml: string, ownerName?: string): Array<{
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
    // Extract reporting owner name(s) from XML
    const ownerNames: string[] = [];
    const ownerRegex = /<rptOwnerName>([\s\S]*?)<\/rptOwnerName>/g;
    const ownerMatches = Array.from(xml.matchAll(ownerRegex));
    for (const m of ownerMatches) {
      ownerNames.push(m[1].trim().toLowerCase());
    }

    // If ownerName filter is provided and no owner in this filing matches, skip all transactions
    if (ownerName && ownerNames.length > 0) {
      const normalizedOwner = ownerName.toLowerCase().split(/\s+/);
      const ownerMatches = ownerNames.some(on => {
        const onTokens = on.split(/\s+/);
        // Token overlap: at least 2 tokens must match (first + last name)
        const overlap = normalizedOwner.filter(t => onTokens.includes(t));
        return overlap.length >= 2;
      });
      if (!ownerMatches) return []; // Not this person's filing
    }

    // Extract all nonDerivativeTransaction blocks
    const transactionRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/g;
    const transactionMatches = Array.from(xml.matchAll(transactionRegex));

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
        const parsedTransactions = parseForm4Xml(xmlContent, params.name);

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

    trackApiUsage("edgar").catch(() => {});

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

/**
 * EFTS full-text search response shape (subset needed for enrichment).
 */
type EftsHit = {
  _id: string;
  _source: {
    file_date?: string;
    display_names?: string[];
    entity_name?: string;
    form_type?: string;
    file_num?: string;
  };
};

type EftsResponse = {
  hits: {
    hits: EftsHit[];
    total: { value: number };
  };
};

/**
 * Search EDGAR EFTS by person name for Form 4 filings, fetch XML,
 * parse and filter transactions by owner name.
 *
 * Used as a fallback when CIK-based enrichEdgar finds no transactions
 * (e.g. the person is an insider at a company we couldn't resolve via CIK).
 */
async function enrichEdgarByNameInternal(params: { name: string }): Promise<EdgarResult> {
  const userAgent = process.env.SEC_EDGAR_USER_AGENT;
  if (!userAgent || !params.name) {
    return { found: false, transactions: [], error: !userAgent ? 'SEC_EDGAR_USER_AGENT not configured' : 'Name required' };
  }

  try {
    await waitForRateLimit();

    // Search EFTS for person name in Form 4 filings
    const url = new URL('https://efts.sec.gov/LATEST/search-index');
    url.searchParams.set('q', `"${params.name}"`);
    url.searchParams.set('forms', '4,3,5');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
    });

    if (!response.ok) {
      return { found: false, transactions: [], error: `EFTS search failed: ${response.status}` };
    }

    const data = await response.json() as EftsResponse;
    const hits = data?.hits?.hits ?? [];

    if (hits.length === 0) {
      return { found: false, transactions: [] };
    }

    // For Form 4 hits, try to fetch and parse XML (up to 5 filings)
    const form4Hits = hits.filter(h => h._source.form_type === '4').slice(0, 5);
    const allTransactions: EdgarResult['transactions'] = [];

    for (const hit of form4Hits) {
      const filingDate = hit._source.file_date || 'unknown';

      // EFTS _id is the accession number (format: XXXXXXXXXX-XX-XXXXXX)
      // We need to construct the XML URL. EFTS doesn't give us primaryDocument directly,
      // so we fetch the filing index page to find the XML doc.
      await waitForRateLimit();

      const accessionNoSlash = hit._id.replace(/-/g, '');
      const indexUrl = `https://www.sec.gov/Archives/edgar/data/${accessionNoSlash.slice(0, 10)}/${hit._id}/`;

      try {
        // Fetch filing index to find the XML document
        const indexResponse = await fetch(indexUrl, {
          headers: { 'User-Agent': userAgent, Accept: 'text/html' },
        });
        if (!indexResponse.ok) continue;

        const indexHtml = await indexResponse.text();

        // Find the primary XML document (usually ends in .xml and contains "primary_doc")
        const xmlMatch = indexHtml.match(/href="([^"]+\.xml)"/i);
        if (!xmlMatch) continue;

        const xmlFileName = xmlMatch[1];
        await waitForRateLimit();

        const xmlUrl = `${indexUrl}${xmlFileName}`;
        const xmlResponse = await fetch(xmlUrl, {
          headers: { 'User-Agent': userAgent, Accept: 'application/xml,text/xml,*/*' },
        });
        if (!xmlResponse.ok) continue;

        const xmlContent = await xmlResponse.text();
        const parsedTransactions = parseForm4Xml(xmlContent, params.name);

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
        console.warn(`[Edgar EFTS] Failed to parse Form 4 for ${hit._id}:`, error);
        continue;
      }
    }

    if (allTransactions.length > 0) {
      allTransactions.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
      trackApiUsage('edgar').catch(() => {});
    }

    return {
      found: allTransactions.length > 0,
      transactions: allTransactions.slice(0, 30),
    };
  } catch (error) {
    return {
      found: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const enrichEdgarByName = withCircuitBreaker(
  enrichEdgarByNameInternal,
  { name: 'sec-edgar-efts', timeout: 20000, resetTimeout: 60000 }
);
