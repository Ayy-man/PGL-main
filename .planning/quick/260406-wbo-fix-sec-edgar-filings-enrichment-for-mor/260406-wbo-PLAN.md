---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/enrichment/edgar.ts
  - src/inngest/functions/enrich-prospect.ts
autonomous: true
must_haves:
  truths:
    - "lookupCompanyCik resolves common brand names (Google, Facebook, Twitter, IBM) to their SEC legal entity names before fuzzy matching"
    - "company_tickers.json is fetched once and cached in Redis for 24h, not re-downloaded on every call"
    - "parseForm4Xml extracts rptOwnerName and filters transactions by owner name when ownerName param is provided"
    - "enrichEdgarByName searches EFTS by person name and returns EdgarResult with Form 4 transactions"
    - "enrichment pipeline falls back to EFTS name search when CIK-based EDGAR returns no transactions"
  artifacts:
    - path: "src/lib/enrichment/edgar.ts"
      provides: "Redis-cached ticker lookup, rebrand alias table, owner-filtered Form 4 parsing, EFTS name search"
    - path: "src/inngest/functions/enrich-prospect.ts"
      provides: "EFTS fallback wiring in fetch-edgar step"
  key_links:
    - from: "src/lib/enrichment/edgar.ts"
      to: "@upstash/redis via @/lib/cache/redis"
      via: "redis.get/redis.set for company_tickers.json cache"
      pattern: "redis\\.(get|set).*edgar:tickers"
    - from: "src/inngest/functions/enrich-prospect.ts"
      to: "src/lib/enrichment/edgar.ts"
      via: "import enrichEdgarByName, call when CIK-based result has 0 transactions"
      pattern: "enrichEdgarByName"
---

<objective>
Fix SEC EDGAR enrichment to find more matches and return more accurate results.

Purpose: Currently lookupCompanyCik re-downloads a ~10MB JSON on every call, can't resolve common brand names (Google, Facebook), returns other insiders' transactions without filtering by person, and has no fallback when company CIK lookup fails. These four issues cause missed or irrelevant EDGAR data for many prospects.

Output: Updated edgar.ts with Redis caching, rebrand aliases, owner-filtered Form 4 parsing, and EFTS name search. Updated enrich-prospect.ts with EFTS fallback wiring.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/enrichment/edgar.ts
@src/inngest/functions/enrich-prospect.ts
@src/lib/cache/redis.ts
@src/lib/rate-limit/limiters.ts
@src/lib/search/channels/edgar-efts-channel.ts

<interfaces>
<!-- Redis client (same one used by rate limiters) -->
From src/lib/cache/redis.ts:
```typescript
import { Redis } from "@upstash/redis";
export const redis: Redis; // Proxy to lazy singleton — supports .get(), .set(), etc.
```

From src/lib/enrichment/edgar.ts (current exports):
```typescript
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

export async function lookupCompanyCik(companyName: string): Promise<{
  cik: string; ticker: string; companyName: string;
} | null>;

export const enrichEdgar: (params: { cik: string; name: string }) => Promise<EdgarResult>;
```

From src/lib/search/channels/edgar-efts-channel.ts (EFTS search reference):
```typescript
// EFTS endpoint: https://efts.sec.gov/LATEST/search-index
// Query: ?q="person name"&forms=4,3,5,SC 13D,SC 13G
// Response: { hits: { hits: Array<{ _id, _source: { file_date, display_names, entity_name, form_type, ... } }> } }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redis cache, rebrand aliases, and owner-filtered Form 4 parsing in edgar.ts</name>
  <files>src/lib/enrichment/edgar.ts</files>
  <action>
Make four changes to `src/lib/enrichment/edgar.ts`:

**1a. Import Redis client** at the top:
```typescript
import { redis } from '@/lib/cache/redis';
```

**1b. Cache company_tickers.json in Redis (24h TTL).**
Replace the body of `lookupCompanyCik` to check Redis first. Key: `edgar:tickers:v1`. The cached value is the full parsed array of `CompanyTickerEntry[]` (Upstash serializes JSON automatically). If cache miss, fetch from SEC, store in Redis with `{ ex: 86400 }` (24h TTL), then proceed with matching. If Redis read fails (catch error), fall through to live fetch — never let cache failure block enrichment.

```typescript
const TICKERS_CACHE_KEY = 'edgar:tickers:v1';
const TICKERS_TTL_SECONDS = 86400; // 24 hours

// Inside lookupCompanyCik, replace the fetch block:
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
```
Remove the old `await waitForRateLimit()` + `fetch` + `const data` + `const entries` lines that this replaces. Keep the 3-pass matching logic unchanged after the `entries` variable is populated.

**1c. Add rebrand/alias map before fuzzy matching.**
Add a `const COMPANY_ALIASES` map at module level (after `normalizeCompanyName`):
```typescript
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
```

At the start of `lookupCompanyCik`, after the `if (!companyName) return null` guard, add:
```typescript
// Check rebrand/alias table
const normalizedInput = normalizeCompanyName(companyName);
const aliasKey = Object.keys(COMPANY_ALIASES).find(k => normalizedInput.includes(k));
if (aliasKey !== undefined) {
  const aliasValue = COMPANY_ALIASES[aliasKey];
  if (aliasValue === null) return null; // Private subsidiary — no SEC filings
  companyName = aliasValue; // Use SEC legal name for lookup
}
```
Note: `companyName` param must be changed from `const` to `let` (use the function parameter directly since it's already mutable in TS function params).

**1d. Add owner name extraction and filtering to parseForm4Xml.**
Change `parseForm4Xml` signature to accept an optional `ownerName` parameter:
```typescript
function parseForm4Xml(xml: string, ownerName?: string): Array<{ ... }>
```

Before the transaction regex matching, extract `<rptOwnerName>` from the XML:
```typescript
// Extract reporting owner name(s) from XML
const ownerNames: string[] = [];
const ownerRegex = /<rptOwnerName>([\s\S]*?)<\/rptOwnerName>/g;
for (const m of xml.matchAll(ownerRegex)) {
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
```

In `enrichEdgarInternal`, pass `params.name` through to `parseForm4Xml`:
Change line ~291 from:
```typescript
const parsedTransactions = parseForm4Xml(xmlContent);
```
to:
```typescript
const parsedTransactions = parseForm4Xml(xmlContent, params.name);
```
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && npx tsc --noEmit src/lib/enrichment/edgar.ts 2>&1 | head -30</automated>
  </verify>
  <done>
    - `lookupCompanyCik` reads from Redis cache key `edgar:tickers:v1` first, fetches from SEC only on miss, caches with 24h TTL
    - Redis failures fall through to live fetch (never blocks enrichment)
    - `COMPANY_ALIASES` map resolves Google->Alphabet, Facebook->Meta, Twitter->X Corp, etc. Returns null for private subsidiaries
    - `parseForm4Xml` extracts `rptOwnerName` from XML and filters transactions by owner name token overlap when `ownerName` param provided
    - `enrichEdgarInternal` passes `params.name` to `parseForm4Xml`
  </done>
</task>

<task type="auto">
  <name>Task 2: Add EFTS name search function and wire fallback into enrichment pipeline</name>
  <files>src/lib/enrichment/edgar.ts, src/inngest/functions/enrich-prospect.ts</files>
  <action>
**2a. Add `enrichEdgarByName` to edgar.ts.**
Add a new exported function at the bottom of `edgar.ts` (before the final `enrichEdgar` export). This function searches EFTS by person name for Form 4 filings, fetches the XML for each hit, and parses transactions filtered by the person's name. Re-implement the EFTS logic directly (do NOT import from edgar-efts-channel.ts — that module has channel-specific types/caching).

```typescript
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
```

**2b. Wire EFTS fallback into enrich-prospect.ts.**
In `src/inngest/functions/enrich-prospect.ts`:

1. Update the import on line 5 to also import `enrichEdgarByName`:
```typescript
import { enrichEdgar, lookupCompanyCik, enrichEdgarByName } from "@/lib/enrichment/edgar";
```

2. In the `fetch-edgar` step (around line 394), after the existing `enrichEdgar` call and status handling, add an EFTS fallback BEFORE the "Save insider data" section. Insert after line ~432 (after the status update block, before the `if (result.found && result.transactions.length > 0)` check):

```typescript
        // EFTS fallback: if CIK-based search found no transactions, try person name search
        if ((!result.found || result.transactions.length === 0) && name) {
          try {
            const eftsResult = await enrichEdgarByName({ name });
            if (eftsResult.found && eftsResult.transactions.length > 0) {
              // Merge EFTS results into main result
              result = {
                found: true,
                transactions: eftsResult.transactions,
              };
              sourceStatus = 'complete';
              await updateSourceStatus(prospectId, 'sec', {
                status: 'complete',
                at: new Date().toISOString(),
              });
            }
          } catch (eftsError) {
            console.warn('[Inngest] EFTS name search fallback failed:', eftsError);
            // Don't override the original result — this is best-effort
          }
        }
```

Note: The `result` variable (currently `const`) must be changed to `let` on the line where `enrichEdgar` is called (~line 405):
```typescript
let result = await enrichEdgar({ cik: effectiveCik, name });
```

Also change `let sourceStatus` declaration if needed — it's already `let` so just ensure the EFTS block can reassign it.

3. Additionally, add an EFTS-only path for prospects where `effectiveIsPublic` is false but we still have a name. Replace the early-return at the top of `fetch-edgar` step:

Change the skip condition (line ~396) from:
```typescript
if (!effectiveIsPublic || !effectiveCik) {
```
to:
```typescript
if (!effectiveIsPublic && !name) {
```

And restructure the step body so that when `effectiveIsPublic && effectiveCik`, it runs the existing CIK path (with EFTS fallback from above). When `!effectiveIsPublic && name`, it goes straight to EFTS name search:

```typescript
        // If no CIK, try EFTS name search directly
        if (!effectiveCik) {
          if (!name) {
            await updateSourceStatus(prospectId, 'sec', { status: 'skipped', at: new Date().toISOString() });
            return { found: false, transactions: [], status: 'skipped' };
          }
          try {
            const eftsResult = await enrichEdgarByName({ name });
            const eftsStatus = eftsResult.found ? 'complete' : 'failed';
            await updateSourceStatus(prospectId, 'sec', { status: eftsStatus, at: new Date().toISOString() });
            // Save insider data if found (same logic as CIK path below)
            if (eftsResult.found && eftsResult.transactions.length > 0) {
              await supabase.from('prospects').update({
                insider_data: {
                  transactions: eftsResult.transactions,
                  total_value: eftsResult.transactions.reduce((sum, tx) => sum + tx.totalValue, 0),
                  source: 'sec-edgar-efts',
                  enriched_at: new Date().toISOString(),
                },
              }).eq('id', prospectId);
              // Write to prospect_signals (same pattern as CIK path)
              for (const tx of eftsResult.transactions) {
                await supabase.from('prospect_signals').insert({
                  prospect_id: prospectId,
                  tenant_id: tenantId,
                  category: 'sec_filing',
                  headline: `${tx.transactionType} ${tx.shares.toLocaleString()} shares ($${tx.totalValue.toLocaleString()})`,
                  summary: `SEC Form 4: ${tx.transactionType} of ${tx.shares.toLocaleString()} shares at $${tx.pricePerShare.toFixed(2)}/share, total value $${tx.totalValue.toLocaleString()}. Filed ${tx.filingDate}.`,
                  source_url: null,
                  event_date: tx.filingDate || null,
                  raw_source: 'sec-edgar',
                  is_new: true,
                }).then(({ error: insertErr }) => {
                  if (insertErr && !insertErr.message.includes('duplicate')) {
                    console.error('[enrich] SEC EFTS signal insert error:', insertErr.message);
                  }
                });
              }
              logProspectActivity({ prospectId, tenantId, userId: null, category: 'data', eventType: 'sec_updated', title: 'SEC filings updated (EFTS)', metadata: { transactionCount: eftsResult.transactions.length } }).catch(() => {});
            }
            return { found: eftsResult.found, transactions: eftsResult.transactions, status: eftsStatus };
          } catch (error) {
            console.error('[Inngest] EFTS-only SEC enrichment failed:', error);
            await updateSourceStatus(prospectId, 'sec', { status: 'failed', error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
            return { found: false, transactions: [], status: 'failed' };
          }
        }
```

This block goes right after the early-return check and before the existing CIK-based `enrichEdgar` call.
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && npx tsc --noEmit src/lib/enrichment/edgar.ts src/inngest/functions/enrich-prospect.ts 2>&1 | head -30</automated>
  </verify>
  <done>
    - `enrichEdgarByName` exported from edgar.ts, searches EFTS by person name, fetches Form 4 XML, parses with owner filtering
    - enrich-prospect.ts imports `enrichEdgarByName`
    - fetch-edgar step tries EFTS name search as fallback when CIK-based search returns no transactions
    - fetch-edgar step runs EFTS-only path for non-public companies (when no CIK but name exists)
    - All EFTS results saved to `insider_data` and `prospect_signals` using same pattern as CIK path
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Redis cache read | Cached ticker data could be stale or corrupted |
| SEC EDGAR API responses | External API, untrusted XML/JSON payloads |
| EFTS search results | External search index, accession numbers used to construct URLs |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | T (Tampering) | Redis cache for tickers | accept | Low risk: tickers JSON is public data, worst case is stale company names. 24h TTL limits staleness. |
| T-quick-02 | D (Denial of Service) | Redis cache miss thundering herd | accept | Single-tenant app, concurrent enrichments limited to 5 by Inngest concurrency. No thundering herd risk. |
| T-quick-03 | T (Tampering) | EFTS accession number in URL construction | mitigate | Accession numbers are only used to construct sec.gov URLs — no path traversal risk since they're alphanumeric+dashes and we use string template literals to known SEC domains only. |
| T-quick-04 | I (Information Disclosure) | Owner name matching false positives | accept | Token overlap >= 2 is reasonable. False positives would show extra transactions, not leak data. |
</threat_model>

<verification>
1. TypeScript compiles: `npx tsc --noEmit src/lib/enrichment/edgar.ts src/inngest/functions/enrich-prospect.ts`
2. Manual spot check: Search for "COMPANY_ALIASES" in edgar.ts to confirm alias table exists
3. Manual spot check: Search for "enrichEdgarByName" in enrich-prospect.ts to confirm wiring
4. Manual spot check: Search for "rptOwnerName" in edgar.ts to confirm owner filtering
5. Manual spot check: Search for "edgar:tickers:v1" in edgar.ts to confirm Redis caching
</verification>

<success_criteria>
- lookupCompanyCik("Google") resolves to Alphabet Inc via alias table before fuzzy matching
- lookupCompanyCik("Instagram") returns null (private subsidiary skip)
- company_tickers.json is cached in Redis key `edgar:tickers:v1` with 24h TTL after first fetch
- parseForm4Xml filters transactions by owner name when provided (2+ token overlap)
- enrichEdgarByName searches EFTS and returns parsed, owner-filtered Form 4 transactions
- Enrichment pipeline uses EFTS fallback for both public companies (no transactions) and non-public companies (no CIK)
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260406-wbo-fix-sec-edgar-filings-enrichment-for-mor/260406-wbo-SUMMARY.md`
</output>
