import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { edgarRateLimiter } from "@/lib/rate-limit/limiters";
import { lookupCompanyCik } from "@/lib/enrichment/edgar";
import { getChannelCache, setChannelCache } from "../channel-cache";
import type { ChannelParams, ChannelOutput, ChannelResult } from "./index";
import { registerChannel } from "./index";

/**
 * EDGAR EFTS full-text search response shape.
 */
type EftsResponse = {
  hits: {
    hits: Array<{
      _id: string;
      _source: {
        file_date?: string;
        display_names?: string[];
        entity_name?: string;
        form_type?: string;
        period_of_report?: string;
        file_num?: string;
      };
    }>;
    total: { value: number };
  };
};

/**
 * EDGAR submissions response for CIK-based lookup.
 */
type SubmissionsResponse = {
  cik: string;
  name: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
    };
  };
};

async function waitForRateLimit(): Promise<void> {
  const result = await edgarRateLimiter.limit("sec-edgar:global");
  if (!result.success) {
    const waitMs = Math.max(result.reset - Date.now(), 100);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/**
 * Build a direct link to the specific filing on SEC.gov.
 */
function buildFilingUrl(accessionNumber: string, primaryDoc: string): string {
  const accFormatted = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${accFormatted}/${accessionNumber}/${primaryDoc}`;
}

/**
 * Format Form 4 type with human-readable labels.
 */
function describeFormType(formType: string): string {
  const labels: Record<string, string> = {
    "4": "Insider Transaction (Form 4)",
    "3": "Initial Ownership Statement (Form 3)",
    "5": "Annual Ownership Changes (Form 5)",
    "13F-HR": "Institutional Holdings (13F)",
    "13D": "Beneficial Ownership >5% (13D)",
    "13G": "Beneficial Ownership Passive (13G)",
    "8-K": "Current Report (8-K)",
    "10-K": "Annual Report (10-K)",
    "10-Q": "Quarterly Report (10-Q)",
    "SC 13D": "Beneficial Ownership >5% (Schedule 13D)",
    "SC 13G": "Beneficial Ownership Passive (Schedule 13G)",
    "DEF 14A": "Proxy Statement (DEF 14A)",
  };
  return labels[formType] || `SEC Filing (${formType})`;
}

/**
 * Strategy 1: CIK-based submissions lookup (most reliable for public companies).
 * Uses the existing lookupCompanyCik from the enrichment pipeline.
 */
async function searchByCik(
  params: ChannelParams
): Promise<ChannelResult[]> {
  if (!params.prospect.company) return [];

  const cikResult = await lookupCompanyCik(params.prospect.company);
  if (!cikResult) return [];

  await waitForRateLimit();

  const paddedCik = cikResult.cik.padStart(10, "0");
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  const userAgent = process.env.SEC_EDGAR_USER_AGENT!;

  const response = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as SubmissionsResponse;
  const recent = data.filings?.recent;
  if (!recent) return [];

  // Filter to relevant form types, last 20 filings
  const relevantForms = ["4", "3", "5", "13F-HR", "SC 13D", "SC 13G", "8-K"];
  const results: ChannelResult[] = [];

  for (let i = 0; i < Math.min(recent.form.length, 50); i++) {
    if (!relevantForms.includes(recent.form[i])) continue;
    if (results.length >= 10) break;

    const formType = recent.form[i];
    const filingDate = recent.filingDate[i];
    const accession = recent.accessionNumber[i];
    const primaryDoc = recent.primaryDocument[i];
    const entityName = data.name || params.prospect.company || "Unknown";

    results.push({
      channelId: "edgar-efts",
      headline: `${describeFormType(formType)} — ${entityName}`,
      summary: `Filed ${filingDate}. ${cikResult.ticker ? `Ticker: ${cikResult.ticker}.` : ""} Accession: ${accession}.`,
      source_url: buildFilingUrl(accession, primaryDoc),
      source_name: "SEC EDGAR",
      event_date: filingDate,
      category: "sec_filing",
      relevance: formType === "4" || formType === "SC 13D" ? "high" : "medium",
      raw_snippet: `${formType} | ${filingDate} | ${entityName} | ${accession}`,
    });
  }

  return results;
}

/**
 * Strategy 2: EFTS full-text search by person name (fallback when no CIK).
 * Searches the EDGAR full-text search index for mentions of the prospect.
 */
async function searchByName(
  params: ChannelParams
): Promise<ChannelResult[]> {
  await waitForRateLimit();

  const userAgent = process.env.SEC_EDGAR_USER_AGENT!;
  const searchTerms = params.prospect.full_name;

  // EDGAR full-text search API
  const url = new URL("https://efts.sec.gov/LATEST/search-index");
  url.searchParams.set("q", `"${searchTerms}"`);
  url.searchParams.set("forms", "4,3,5,SC 13D,SC 13G");

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as EftsResponse;
  const hits = data?.hits?.hits ?? [];

  return hits.slice(0, 10).map((hit) => {
    const src = hit._source;
    const formType = src.form_type || "Filing";
    const entityName = src.entity_name || src.display_names?.[0] || params.prospect.company || "Unknown";

    return {
      channelId: "edgar-efts" as const,
      headline: `${describeFormType(formType)} — ${entityName}`,
      summary: `Filed ${src.file_date || "N/A"}. ${src.period_of_report ? `Period: ${src.period_of_report}.` : ""} ${src.file_num ? `File #${src.file_num}.` : ""}`,
      source_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(entityName)}&type=${encodeURIComponent(formType)}&dateb=&owner=include&count=10`,
      source_name: "SEC EDGAR",
      event_date: src.file_date || null,
      category: "sec_filing" as const,
      relevance: (formType === "4" || formType === "SC 13D" ? "high" : "medium") as ChannelResult["relevance"],
      raw_snippet: JSON.stringify(src),
    };
  });
}

/**
 * Main EDGAR channel: tries CIK-based lookup first (direct filing links),
 * falls back to full-text name search.
 */
async function searchEdgarEftsInternal(params: ChannelParams): Promise<ChannelOutput> {
  const startMs = Date.now();

  const cached = await getChannelCache("edgar-efts", params.query, params.prospect.id, params.tenantId);
  if (cached) return { ...cached, cached: true, latencyMs: Date.now() - startMs };

  const userAgent = process.env.SEC_EDGAR_USER_AGENT;
  if (!userAgent) {
    return { channelId: "edgar-efts", results: [], cached: false, latencyMs: 0, error: "SEC_EDGAR_USER_AGENT not configured" };
  }

  try {
    // Strategy 1: CIK-based (best results for public companies)
    let results = await searchByCik(params);

    // Strategy 2: fallback to name search if CIK found nothing
    if (results.length === 0) {
      results = await searchByName(params);
    }

    const output: ChannelOutput = { channelId: "edgar-efts", results, cached: false, latencyMs: Date.now() - startMs };
    await setChannelCache("edgar-efts", params.query, params.prospect.id, params.tenantId, output);
    return output;
  } catch (error) {
    return { channelId: "edgar-efts", results: [], cached: false, latencyMs: Date.now() - startMs, error: String(error) };
  }
}

export const searchEdgarEfts = withCircuitBreaker(searchEdgarEftsInternal, { name: "edgar-efts-channel", timeout: 15000 });
registerChannel("edgar-efts", searchEdgarEfts);
