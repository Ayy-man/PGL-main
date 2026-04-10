import { withCircuitBreaker } from '../circuit-breaker';
import { edgarRateLimiter } from '../rate-limit/limiters';
import { trackApiUsage } from '@/lib/enrichment/track-api-usage';
import { redis } from '@/lib/cache/redis';
import { chatCompletion } from '@/lib/ai/openrouter';

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
    /**
     * Stable SEC EDGAR URL for the underlying Form 4 filing. Populated when
     * the parser is called with a source URL — used to (a) enable the
     * prospect_signals unique index to dedup on re-enrichment, and (b) give
     * the UI a clickable source link. Optional because historical callers
     * didn't pass URLs.
     */
    sourceUrl?: string;
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
  'twitter': null, // X Corp went private Oct 2022 — no SEC filings
  'x corp': null,  // same reason, direct hit
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

  // Pass 4: LLM canonicalization — ask Claude Haiku to resolve the SEC legal entity name.
  // CRITICAL: Only returns a match when the LLM-resolved name can be verified against both
  // (a) the SEC company tickers list AND (b) a live SEC submissions API ping confirming the CIK exists.
  // This prevents hallucinated or incorrect CIK associations for private companies.
  try {
    const { text } = await chatCompletion(
      `You are an authoritative SEC EDGAR company resolver. Your job is to determine whether a given company name corresponds to a publicly traded company with SEC filings.

RULES:
1. Return "PRIVATE" if the company is privately held, a startup, a subsidiary, a non-profit, a government entity, or if you are not highly confident it is publicly traded on a US exchange.
2. Return "UNKNOWN" if you genuinely cannot determine the company's public status.
3. Only return the exact SEC EDGAR legal entity name (e.g. "Alphabet Inc", "Apple Inc", "JPMorgan Chase & Co") if you are CERTAIN the company is publicly traded on NYSE, NASDAQ, or another US exchange AND you know its SEC-registered legal name precisely.
4. Do NOT guess or hallucinate. A wrong answer corrupts financial data. If there is any doubt, return "PRIVATE" or "UNKNOWN".
5. Startups, biotech companies without IPOs, regional firms, and most companies with fewer than 500 employees are almost always private — return "PRIVATE" for these.
6. Return ONLY one of: the exact SEC legal name, "PRIVATE", or "UNKNOWN". No explanation, no punctuation, nothing else.`,
      `Company name: "${companyName}"`,
      80,
    );
    const llmName = text.trim().replace(/^["']|["']$/g, ''); // strip any surrounding quotes
    if (!llmName || llmName === 'PRIVATE' || llmName === 'UNKNOWN') {
      console.log(`[Edgar] LLM classified "${companyName}" as ${llmName || 'empty'} — skipping SEC lookup`);
      return null;
    }

    // Find matching entry in SEC tickers list
    const llmNorm = normalizeCompanyName(llmName);
    const llmCompact = llmNorm.replace(/\s+/g, '');
    let matchedEntry: CompanyTickerEntry | null = null;
    for (const entry of entries) {
      const entryNorm = normalizeCompanyName(entry.title);
      const entryCompact = entryNorm.replace(/\s+/g, '');
      if (entryNorm === llmNorm || entryNorm.startsWith(llmNorm) || llmNorm.startsWith(entryNorm) ||
          entryCompact.startsWith(llmCompact) || llmCompact.startsWith(entryCompact)) {
        matchedEntry = entry;
        break;
      }
    }

    if (!matchedEntry) {
      console.log(`[Edgar] LLM returned "${llmName}" for "${companyName}" but no match in SEC tickers list`);
      return null;
    }

    // Validate: ping SEC submissions API to confirm this CIK actually exists before storing it.
    // This catches cases where string matching produced a wrong entry.
    const candidateCik = String(matchedEntry.cik_str);
    try {
      await waitForRateLimit();
      const validationRes = await fetch(
        `https://data.sec.gov/submissions/CIK${candidateCik.padStart(10, '0')}.json`,
        { headers: { 'User-Agent': userAgent, Accept: 'application/json' } }
      );
      if (!validationRes.ok) {
        console.warn(`[Edgar] CIK ${candidateCik} validation failed (${validationRes.status}) for "${companyName}" → "${llmName}" — discarding match`);
        return null;
      }
    } catch (validationErr) {
      console.warn(`[Edgar] CIK validation request failed for ${candidateCik}:`, validationErr);
      return null;
    }

    console.log(`[Edgar] LLM canonicalized "${companyName}" → "${llmName}" → matched "${matchedEntry.title}" (CIK ${candidateCik}, validated)`);
    trackApiUsage('openrouter').catch(() => {});
    return { cik: candidateCik, ticker: matchedEntry.ticker, companyName: matchedEntry.title };
  } catch (llmErr) {
    // LLM call failed — don't block the rest of enrichment, but surface the
    // failure to logs so we can tell "every enrichment skipped SEC because
    // OpenRouter was down" apart from "every company was genuinely private".
    console.warn(
      `[Edgar] LLM canonicalization failed for "${companyName}":`,
      llmErr instanceof Error ? llmErr.message : llmErr,
    );
  }

  return null;
}

/**
 * SEC Form 4 transaction codes → human-readable labels.
 *
 * Source: https://www.sec.gov/about/forms/form4.pdf (Table II codes)
 *
 * Before this map existed the parser shipped codes like "F", "M", "X" directly
 * to the UI — users had no idea what they meant. Now the raw code is preserved
 * only as a fallback for codes we haven't mapped yet (or new SEC additions).
 */
const TRANSACTION_CODE_LABELS: Record<string, string> = {
  // Section 16 (b)(3) exempt transactions
  A: 'Grant/Award',
  D: 'Sale to Issuer',
  F: 'Tax Withholding', // Payment of exercise price or tax via share surrender
  I: 'Discretionary',
  M: 'Exercise', // Exercise/conversion of derivative
  // Open-market / private transactions
  P: 'Purchase',
  S: 'Sale',
  V: 'Voluntary Report',
  // Derivative-specific
  C: 'Conversion',
  E: 'Expiration (short)',
  H: 'Expiration (long)',
  O: 'Exercise (OOM)',
  X: 'Exercise (ITM)',
  // Other
  G: 'Gift',
  L: 'Small Acquisition',
  W: 'Will/Inheritance',
  Z: 'Trust Deposit',
  J: 'Other',
  K: 'Equity Swap',
  U: 'Tender',
};

function labelForCode(code: string): string {
  return TRANSACTION_CODE_LABELS[code] ?? code;
}

/**
 * Parse Form 4 XML for transaction details.
 *
 * Extracts BOTH non-derivative (common stock purchases/sales) AND derivative
 * (options, RSUs, warrants) transactions. For tech execs derivative grants
 * are often the primary compensation vehicle — prior to this, we were silently
 * dropping every RSU vest and option grant because we only parsed
 * <nonDerivativeTransaction> blocks.
 *
 * When ownerName is provided, filters filings by <rptOwnerName> using a
 * prefix-aware token overlap to handle nicknames (Tim↔Timothy, etc).
 *
 * Note: Full XML parsing would be more robust but adds dependencies. This
 * regex approach handles the common Form 4 structures as of the X0508 and
 * X0609 schema versions.
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

    // If ownerName filter is provided and no owner in this filing matches, skip all transactions.
    //
    // SEC Form 4 stores owner names as "LAST FIRST MIDDLE" (e.g. "COOK TIMOTHY D"),
    // while prospect names come in as "First Last" (e.g. "Tim Cook"). Token overlap
    // must handle (a) either token ordering and (b) nicknames vs formal first names
    // like Tim↔Timothy, Jeff↔Jeffrey, Bill↔William.
    //
    // Strategy: require at least 2 prospect tokens to match ANY owner token, where a
    // "match" is exact equality OR one token is a ≥3-char prefix of the other. The
    // length guard prevents single-letter initials from matching everything.
    if (ownerName && ownerNames.length > 0) {
      const normalizedOwner = ownerName
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 0);
      const matchesToken = (a: string, b: string): boolean => {
        if (a === b) return true;
        if (a.length >= 3 && b.startsWith(a)) return true;
        if (b.length >= 3 && a.startsWith(b)) return true;
        return false;
      };
      const ownerMatches = ownerNames.some(on => {
        const onTokens = on.split(/\s+/).filter(t => t.length > 0);
        const overlap = normalizedOwner.filter(t =>
          onTokens.some(o => matchesToken(t, o))
        );
        return overlap.length >= 2;
      });
      if (!ownerMatches) return []; // Not this person's filing
    }

    // Extract a single transaction block (used for both derivative and
    // non-derivative variants). The shares and price regexes accept optional
    // whitespace and negative/scientific-notation numbers defensively — SEC
    // schemas are mostly boring positive decimals but some filings have
    // whitespace around the <value> contents.
    const extractBlock = (txBlock: string, isDerivative: boolean) => {
      const codeMatch = txBlock.match(/<transactionCode>\s*([A-Z])\s*<\/transactionCode>/);
      const code = codeMatch?.[1];

      const titleMatch = txBlock.match(/<securityTitle>[\s\S]*?<value>\s*([\s\S]*?)\s*<\/value>/);
      const title = titleMatch?.[1]?.trim();

      const sharesMatch = txBlock.match(/<transactionShares>\s*<value>\s*([-\d.eE+]+)\s*<\/value>/);
      const shares = sharesMatch?.[1] ? parseFloat(sharesMatch[1]) : 0;

      const priceMatch = txBlock.match(/<transactionPricePerShare>\s*<value>\s*([-\d.eE+]+)\s*<\/value>/);
      const price = priceMatch?.[1] ? parseFloat(priceMatch[1]) : 0;

      if (!code || !title || !(shares > 0)) return;

      // Suffix derivative transactions with their security title so the UI
      // distinguishes e.g. "Exercise — Employee Stock Option" from
      // "Exercise — Common Stock".
      const label = labelForCode(code);
      const transactionType = isDerivative ? `${label} (Derivative)` : label;

      transactions.push({
        transactionType,
        securityTitle: title,
        shares,
        pricePerShare: price,
      });
    };

    // Non-derivative transactions (common stock purchases/sales)
    const nonDerivRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/g;
    for (const match of Array.from(xml.matchAll(nonDerivRegex))) {
      extractBlock(match[1], false);
    }

    // Derivative transactions (stock options, RSUs, warrants, convertibles).
    // For tech execs this is the PRIMARY compensation path — without this
    // branch we silently drop every RSU vest and every option exercise.
    const derivRegex = /<derivativeTransaction>([\s\S]*?)<\/derivativeTransaction>/g;
    for (const match of Array.from(xml.matchAll(derivRegex))) {
      extractBlock(match[1], true);
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

      // Build URL for Form 4 XML document.
      // Strip any XSLT rendering prefix (e.g. "xslF345X05/") — those paths return
      // rendered HTML instead of raw XML, which breaks the regex parser.
      const accessionNoSlash = accessionNumber.replace(/-/g, '');
      const rawDocument = primaryDocument.replace(/^xsl[^/]+\//, '');
      const documentUrl = `https://www.sec.gov/Archives/edgar/data/${params.cik}/${accessionNoSlash}/${rawDocument}`;

      // User-facing URL: use the ORIGINAL primaryDocument path (with the
      // xslF345X05/ prefix). SEC renders this as a styled HTML table —
      // much nicer than raw XML. Falls back to filing index page if no
      // XSLT prefix exists.
      const viewUrl = primaryDocument.startsWith('xsl')
        ? `https://www.sec.gov/Archives/edgar/data/${params.cik}/${accessionNoSlash}/${primaryDocument}`
        : `https://www.sec.gov/Archives/edgar/data/${params.cik}/${accessionNoSlash}/`;

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

        // Add filing date, calculate total value, and attach the
        // human-readable SEC viewer URL (not the raw XML we parsed).
        for (const tx of parsedTransactions) {
          allTransactions.push({
            filingDate,
            transactionType: tx.transactionType,
            securityTitle: tx.securityTitle,
            shares: tx.shares,
            pricePerShare: tx.pricePerShare,
            totalValue: tx.shares * tx.pricePerShare,
            sourceUrl: viewUrl,
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
    form?: string;         // actual field name in EFTS response (not form_type)
    root_forms?: string[]; // top-level form types for this filing
    adsh?: string;         // accession number (dashed) — use this, not _id (which has :filename suffix)
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

    // Search EFTS for Form 4/3/5 filings filed by this person as an insider.
    //
    // CRITICAL: use `entityName=` (not `q=`). Full-text search on doc_text is
    // unreliable for insider filings — Form 4 XML has no prose body, so the
    // insider's name rarely appears in the searchable plaintext. `entityName`
    // searches the `display_names` field which is explicitly indexed from the
    // filer's registered name ("LAST FIRST MIDDLE" in SEC's format). It's
    // order-independent per token, so passing "First Last" as-is works.
    const url = new URL('https://efts.sec.gov/LATEST/search-index');
    url.searchParams.set('q', '');
    url.searchParams.set('forms', '4,3,5');
    url.searchParams.set('entityName', params.name);

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

    // For Form 4 hits, try to fetch and parse XML (up to 5 filings).
    //
    // EXCLUDE Form 4/A amendments — including both the base filing and its
    // amendment double-counts every transaction in the amended block. SEC
    // stores these with `form === "4/A"` while the base filing is `"4"`, but
    // both share `root_forms: ["4"]`. We only want the exact base form.
    //
    // Prefer `_source.form` when present (exact form name); fall back to
    // `root_forms` only when `form` is missing (rare — legacy records).
    const form4Hits = hits
      .filter(h => {
        const exactForm = h._source.form;
        if (exactForm) return exactForm === '4';
        // Fallback: treat as base Form 4 only if root_forms has '4' and
        // there's no amendment variant in the array.
        return (
          h._source.root_forms?.includes('4') === true &&
          !h._source.root_forms?.some(f => f === '4/A')
        );
      })
      .slice(0, 5);
    const allTransactions: EdgarResult['transactions'] = [];

    for (const hit of form4Hits) {
      const filingDate = hit._source.file_date || 'unknown';
      // adsh is the clean dashed accession number; _id may have ":filename" suffix
      const accessionDashed = hit._source.adsh || hit._id.split(':')[0];

      // We need to construct the XML URL. EFTS doesn't give us primaryDocument directly,
      // so we fetch the filing index page to find the XML doc.
      await waitForRateLimit();

      const accessionNoSlash = accessionDashed.replace(/-/g, '');
      // SEC archive paths require undashed accession numbers
      const indexUrl = `https://www.sec.gov/Archives/edgar/data/${accessionNoSlash.slice(0, 10)}/${accessionNoSlash}/`;

      try {
        // Fetch filing index to find the XML document
        const indexResponse = await fetch(indexUrl, {
          headers: { 'User-Agent': userAgent, Accept: 'text/html' },
        });
        if (!indexResponse.ok) continue;

        const indexHtml = await indexResponse.text();

        // Find the Form 4 XML document for parsing AND any XSLT-rendered
        // version for the user-facing "View Source" link.
        const xmlMatch =
          indexHtml.match(/href="([^"]*form4[^"]*\.xml)"/i) ||
          indexHtml.match(/href="((?![^"]*(?:filing-summary|xsl[A-Z]))[^"]+\.xml)"/i);
        if (!xmlMatch) continue;

        // Also look for the XSLT-rendered HTML version (e.g. xslF345X05/form4.xml)
        // which SEC displays as a styled table — much nicer than raw XML.
        const xslMatch = indexHtml.match(/href="([^"]*xsl[^"]*\.xml)"/i);

        // Hrefs from the index page are absolute paths (/Archives/...) — prepend origin
        const rawHref = xmlMatch[1];
        const xmlFileName = rawHref.startsWith('/') ? rawHref : `/${rawHref}`;
        await waitForRateLimit();

        const xmlUrl = `https://www.sec.gov${xmlFileName}`;
        const xmlResponse = await fetch(xmlUrl, {
          headers: { 'User-Agent': userAgent, Accept: 'application/xml,text/xml,*/*' },
        });
        if (!xmlResponse.ok) continue;

        // User-facing URL: prefer XSLT-rendered HTML, fall back to filing index
        const viewUrl = xslMatch
          ? `https://www.sec.gov${xslMatch[1].startsWith('/') ? xslMatch[1] : `/${xslMatch[1]}`}`
          : indexUrl;

        const xmlContent = await xmlResponse.text();
        // No owner filter here — EFTS already matched by entityName, so every
        // filing in this loop is already known to be filed by the prospect.
        const parsedTransactions = parseForm4Xml(xmlContent);

        for (const tx of parsedTransactions) {
          allTransactions.push({
            filingDate,
            transactionType: tx.transactionType,
            securityTitle: tx.securityTitle,
            shares: tx.shares,
            pricePerShare: tx.pricePerShare,
            totalValue: tx.shares * tx.pricePerShare,
            sourceUrl: viewUrl,
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
