cl# LLM Prompt Layers — PGL (Phronesis)

> Audit date: 2026-04-11
> Cross-verified: 2026-04-11 — all 10 layers confirmed LIVE via call-chain tracing. Zero dead code. No hidden 11th prompt found.

All LLM calls route through a single gateway: `src/lib/ai/openrouter.ts` → `chatCompletion()`.
Two models in use: **Claude 3.5 Haiku** (8/10 prompts) and **GPT-4o-mini** (2/10).

---

## Prompt Inventory

| # | File | Function / Endpoint | Purpose | Model | Max Tokens | Status |
|---|------|---------------------|---------|-------|------------|--------|
| 1 | `src/lib/ai/openrouter.ts` | `chatCompletion()` | Central gateway — every LLM call flows through here | Default: `claude-3.5-haiku` | configurable | LIVE — all 9 callers verified |
| 2 | `src/lib/enrichment/claude.ts` :91 | `generateProspectSummary()` | 2-3 sentence UHNWI buyer summary from enrichment data | `claude-3.5-haiku` | 500 | LIVE — Inngest step 5, 3 UI triggers |
| 3 | `src/lib/enrichment/claude.ts` :198 | `generateIntelligenceDossier()` | Structured JSON dossier (career, wealth, outreach hooks, quick facts) | `gpt-4o-mini` | 1800 | LIVE — Inngest step 5.5, same 3 UI triggers |
| 4 | `src/app/api/search/parse-query/route.ts` | `POST /api/search/parse-query` | NLP — natural language → Apollo.io structured search filters | `gpt-4o-mini` | 1000 | LIVE — NLSearchBar → useSearch hook |
| 5 | `src/lib/search/intent-classifier.ts` | `classifyIntent()` | Routes queries to channels (Exa, EDGAR-EFTS), classifies entity type | `claude-3.5-haiku` | 200 | LIVE — research panel → multi-source route → executeResearch |
| 6 | `src/lib/enrichment/exa-digest.ts` | `digestExaResults()` | Validates + categorizes Exa web mentions into typed signals | `claude-3.5-haiku` | 1500 | LIVE — Inngest enrich step 3 (background) |
| 7 | `src/lib/research/research-digest.ts` | `digestForScrapbook()` | Digests Exa results for Research Scrapbook UI with relevance scoring | `claude-3.5-haiku` | 4000 | LIVE — research streaming endpoint (interactive) |
| 8 | `src/lib/enrichment/edgar.ts` :188 | SEC company resolver | Canonicalizes company name → PUBLIC / PRIVATE / UNKNOWN | `claude-3.5-haiku` | 80 | LIVE — Inngest CIK resolve, pass 4 of 4 (~5% of lookups) |
| 9 | `src/lib/enrichment/lookalike.ts` :152 | `generateLookalikePersona()` | Extracts professional attributes → Apollo search filters for similar people | `claude-3.5-haiku` | 2000 | LIVE — "Find Similar People" button → /api/search/lookalike |
| 10 | `src/app/api/prospects/[prospectId]/research/route.ts` :168 | Query reformulator | Rewrites user question into optimized Exa web search query | `claude-3.5-haiku` | 100 | LIVE — research panel, every query, phase 1 |

---

## Verification Summary

All 10 prompt layers were cross-verified by tracing call chains from UI entry points down to the LLM call.

**Call chain map (UI → LLM):**

```
Enrich button (3 UI locations)
  → POST /api/prospects/[id]/enrich
    → Inngest "prospect/enrich.requested"
      → Step 3: Exa fetch → #6 digestExaResults()
      → Step "resolve-cik": #8 SEC company resolver (pass 4, ~5% of lookups)
      → Step 5: #2 generateProspectSummary()
      → Step 5.5: #3 generateIntelligenceDossier()

NLSearchBar (search page)
  → useSearch() hook
    → POST /api/search/parse-query → #4 NLP parser

Research panel (prospect profile)
  → POST /api/prospects/[id]/research
    → Phase 1: #10 Query reformulator
    → Phase 3: #7 digestForScrapbook()
  → POST /api/prospects/[id]/research/multi-source
    → executeResearch() → #5 classifyIntent()

"Find Similar People" button (prospect profile)
  → POST /api/search/lookalike → #9 generateLookalikePersona()
```

**Key verification findings:**
- **#6 and #7 are NOT duplicates** — separate pipelines (background enrichment vs interactive research), different inputs/outputs/persistence. Both required.
- **#8 is correctly last-resort** — 3 deterministic passes run first; LLM only fires for ~5% of CIK lookups. Post-LLM two-stage verification (ticker list + live SEC API) prevents hallucinated results.
- **No dead exports** found in any prompt file.
- **No hidden prompts** — fresh codebase sweep found zero additional `chatCompletion` imports or AI SDK usage beyond the 10 documented layers.

---

## Data Flow Per Prompt

### 1. `chatCompletion()` — Central Gateway

| | |
|---|---|
| **Location** | `src/lib/ai/openrouter.ts` |
| **Endpoint** | `https://openrouter.ai/api/v1/chat/completions` |
| **Timeout** | 15 seconds |
| **Tracking** | `trackApiUsage('openrouter')` per call |

**IN (function args):**
```
system:     string          — system prompt
userMessage: string         — user message
maxTokens:  number = 500    — cap on response length
model:      string = "anthropic/claude-3.5-haiku"
```

**OUT:**
```typescript
{ text: string; inputTokens?: number; outputTokens?: number }
```

---

### 2. `generateProspectSummary()`

| | |
|---|---|
| **Location** | `src/lib/enrichment/claude.ts` :36-99 |
| **Called by** | Inngest `enrich-prospect` step 6 |
| **Output format** | Plain text (2-3 sentences) |

**IN — `ProspectSummaryInput`:**
```typescript
{
  name: string;                    // required
  title: string;                   // required
  company: string;                 // required
  contactData?: {                  // optional
    personalEmail?: string;
    phone?: string;
  } | null;
  webData?: {                      // optional
    mentions: Array<{ title: string; snippet: string }>;
    wealthSignals: Array<{ type: string; description: string }>;
  } | null;
  insiderData?: {                  // optional
    transactions: Array<{
      filingDate: string;
      transactionType: string;
      shares: number;
      totalValue: number;
    }>;
  } | null;
}
```

**User message template (assembled conditionally):**
```
Generate a 2-3 sentence summary for:

Name: {name}
Title: {title}
Company: {company}
Contact: Personal email available, Phone available     ← if contactData
Wealth Signals:                                        ← up to 3
- {type}: {description}
Web Mentions:                                          ← up to 2
- {title}: {snippet}
SEC Insider Transactions: N cash transactions          ← aggregated
  aggregating $X, M grant/vest events
```

**System prompt:**
> You are a luxury real estate prospect analyst. Generate concise 2-3 sentence summaries explaining why a prospect is a qualified UHNWI buyer. Focus on wealth signals, lifestyle indicators, and buying potential. Be specific — reference actual data points.

**OUT:** `string` — plain text summary, or fallback `"AI summary temporarily unavailable."` on error. Early return `"Insufficient enrichment data..."` if sparse input.

**Post-processing:** None — returns `response.text` directly.

---

### 3. `generateIntelligenceDossier()`

| | |
|---|---|
| **Location** | `src/lib/enrichment/claude.ts` :143-228 |
| **Called by** | Inngest `enrich-prospect` step 7 |
| **Output format** | Structured JSON |
| **Model override** | `openai/gpt-4o-mini` |

**IN — `DossierInput`:**
```typescript
{
  name: string;                    // required
  title: string;                   // required
  company: string;                 // required
  workEmail?: string | null;
  contactData?: {
    personalEmail?: string;
    phone?: string;
  } | null;
  webSignals?: Array<{
    category: string;
    headline: string;
    summary: string;
  }> | null;
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
```

**User message template (assembled conditionally):**
```
Generate a structured intelligence dossier for:

Name: {name}
Title: {title}
Company: {company or "Unknown (email domain: {domain})"}
Contact availability: Personal email found, Phone found
Publicly traded: {ticker}

Web Intelligence Signals:
- [{category}] {headline}: {summary}

SEC Insider Transactions (N total, aggregate value $X):
- {date}: {type} {securityTitle} — N shares ($X)
```

**System prompt (with critical anti-hallucination rules):**
> You are a luxury real estate intelligence analyst... Generate a JSON dossier with exactly these fields...
> CRITICAL RULES — VIOLATIONS CORRUPT FINANCIAL DATA:
> 1. NEVER invent, estimate, or fabricate dollar amounts...
> 2. ONLY reference dollar amounts explicitly provided...
> 3. For wealth_assessment: if no SEC data, base on title/seniority only...
> 4. Do NOT hallucinate company valuations, revenue, funding rounds...

**OUT — `IntelligenceDossierData | null`:**
```typescript
{
  summary: string;              // 2-3 sentences
  career_narrative: string;     // 2-3 sentences
  wealth_assessment: string;    // 2-3 sentences
  company_context: string;      // 2-3 sentences
  outreach_hooks: string[];     // 3-5 conversation starters
  quick_facts: Array<{          // 4-6 items
    label: string;
    value: string;
  }>;
}
```

**Post-processing:**
1. Strip markdown code fences via regex
2. `JSON.parse()` the response
3. Validate all 6 required fields exist + arrays are arrays
4. Return `null` on any failure

---

### 4. `POST /api/search/parse-query`

| | |
|---|---|
| **Location** | `src/app/api/search/parse-query/route.ts` |
| **Called by** | Frontend search bar (NLP mode) |
| **Output format** | Structured JSON |
| **Rate limit** | 20 req/min per tenant |

**IN — HTTP request body:**
```typescript
{ query: string }   // max 1000 chars
```

**Short-circuit:** If query is 1-2 words, skips LLM entirely → returns `{ filters: { keywords: query }, parsed: false }`.

**User message:** The raw query string, trimmed.

**System prompt (large — includes full Apollo enum lists):**
> You are a search query parser for a lead generation platform. Convert natural language queries into structured Apollo.io search filters.
> [Contains 11 seniority values, 75+ industry names, 8 company size ranges, and mapping rules like "C-suite" → "c_suite", "biotech" → "Biotechnology"]

**OUT — HTTP response:**
```typescript
{
  filters: {
    organization_names?: string[];    // specific company names
    titles?: string[];                // job titles
    seniorities?: string[];           // validated against 11-value enum
    industries?: string[];            // validated against 75+ Apollo names
    locations?: string[];             // city, state, or country
    companySize?: string[];           // NOT validated (gap)
    keywords?: string;                // remaining terms (single string)
  },
  parsed: boolean   // true = LLM was called, false = bypassed or failed
}
```

**Post-processing:**
1. Strip markdown code fences
2. `JSON.parse()`
3. Validate `seniorities` against `VALID_SENIORITIES` Set — strip invalid, delete if empty
4. Validate `industries` against `VALID_INDUSTRIES` Set — strip invalid, delete if empty
5. `companySize` is **NOT** validated (passes through unchecked)
6. On any error → fallback: `{ filters: { keywords: query }, parsed: false }`

---

### 5. `classifyIntent()`

| | |
|---|---|
| **Location** | `src/lib/search/intent-classifier.ts` |
| **Called by** | `executeResearch()` in multi-source research flow |
| **Output format** | Structured JSON (4 fields) |

**IN:**
```typescript
query: string;
prospect: {
  name: string;
  company: string | null;
  title?: string | null;
  publicly_traded_symbol?: string | null;
}
```

**User message:**
```
Query: "{query}"
Person: {name}
Company: {company || "Unknown"}
Title: {title || "Unknown"}
Public ticker: {publicly_traded_symbol || "None"}
```

**System prompt:**
> You are a search intent classifier for a wealth intelligence platform.
> Channel selection rules:
> - Always include "exa" (general web search — always on)
> - Add "edgar-efts" for SEC filings, insider trading, Form 4, 13F, 8-K, 10-K queries
> Entity type rules: person / company / property / general

**OUT — `IntentClassification`:**
```typescript
{
  channels: ("exa" | "edgar-efts")[];   // always includes "exa"
  reformulatedQuery: string;
  entityType: "person" | "company" | "property" | "general";
  reasoning: string;
}
```

**Post-processing:**
1. `JSON.parse()` as `Partial<IntentClassification>`
2. Filter channels against `ALL_CHANNEL_IDS` whitelist — force-insert "exa" if missing
3. Coerce `reformulatedQuery` → original query if not a string
4. Coerce `entityType` → `"general"` if not in allowed set
5. Coerce `reasoning` → `""` if not a string
6. On any error → `{ channels: ["exa"], reformulatedQuery: query, entityType: "general", reasoning: "Parse failure" }`

---

### 6. `digestExaResults()`

| | |
|---|---|
| **Location** | `src/lib/enrichment/exa-digest.ts` |
| **Called by** | Inngest `enrich-prospect` step 3 (background enrichment) |
| **Output format** | JSON array of signals |

**IN:**
```typescript
personName: string;
companyName: string;
mentions: Array<{
  title: string;
  url: string;
  snippet: string;
  publishDate?: string;   // ISO date
}>;
```

**User message:**
```
Target person: "{personName}" at "{companyName}"

For each result below, determine:
1. Is this result actually about "{personName}" at "{companyName}"? (relevant: true/false)
2. Category: one of career_move, funding, media, wealth_signal, company_intel, recognition
3. Headline: under 10 words, factual
4. Summary: 1-2 sentences, plain text only
5. event_date: ISO date (YYYY-MM-DD) or null

Results:
[0] Title: ...
URL: ...
Text: ...
```

**System prompt:**
> You are a wealth intelligence analyst. For each search result about a person, determine if it is relevant...
> CRITICAL: Your response MUST be ONLY a JSON array starting with `[`...

**OUT — `DigestedSignal[]`:**
```typescript
{
  relevant: true;               // always true (irrelevant filtered out)
  category: "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition";
  headline: string;
  summary: string;
  source_url: string;           // from original mention
  raw_text: string;             // from original snippet
  event_date?: string | null;   // LLM date or fallback to publishDate
}
```

**Post-processing:**
1. Strip markdown fences
2. Greedy bracket extraction (`[...]`)
3. `JSON.parse()`
4. Filter out `relevant: false`
5. Map LLM indices back to original mentions for `source_url` and `raw_text`
6. Fallback `event_date`: LLM date → `publishDate` → `null`
7. On any error → return `[]`

---

### 7. `digestForScrapbook()`

| | |
|---|---|
| **Location** | `src/lib/research/research-digest.ts` |
| **Called by** | Research streaming endpoint (`POST /api/prospects/[id]/research`) |
| **Output format** | JSON array of scrapbook cards |

**IN:**
```typescript
personName: string;
companyName: string;
query: string;                    // user's research question
results: ExaSearchResult[];       // rich Exa objects with highlights, summary, author, image, favicon
```

**User message (per result):**
```
[0] Title: ...
URL: ...
Date: ...
Exa Summary: ...          ← or "Top Highlight: ..." or "Text: (first 2000 chars)"

---

[1] Title: ...
```

**System prompt (context-aware — interpolates personName, companyName, query):**
> You are a wealth intelligence research analyst. You are helping a luxury real estate agent research a prospect.
> For each search result, determine:
> 1. is_about_target (bool)
> 2. answer_relevance: direct / tangential / background
> 3. relevance: high / medium / low
> 4. headline, summary, category
> 5. event_date + event_date_precision
> 6. confidence_note

**OUT — `ScrapbookCard[]`:**
```typescript
{
  index: number;
  headline: string;
  summary: string;
  category: "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition" | "sec_filing" | "market_event" | "other";
  source_url: string;
  source_name: string;                    // domain without "www."
  source_favicon: string;
  event_date: string | null;
  event_date_precision: "exact" | "approximate" | "unknown";
  relevance: "high" | "medium" | "low";
  answer_relevance: "direct" | "tangential" | "background";
  is_about_target: true;                  // always true (filtered)
  raw_snippet: string;                    // first 500 chars
  confidence_note: string;
  exa_highlights?: string[];
  exa_highlight_scores?: number[];
  exa_summary?: string;
  exa_author?: string;
  exa_image?: string;
}
```

**Post-processing:**
1. Strip markdown fences
2. `JSON.parse()`
3. Filter out `is_about_target: false`
4. Validate all enums — coerce invalid to defaults (`"other"`, `"medium"`, `"background"`, `"unknown"`)
5. Enrich with Exa metadata (favicon, highlights, image, author)
6. Sort by `answer_relevance` (direct first → tangential → background)
7. On any error → return `[]`

**vs. `digestExaResults()` (prompt #6):**

| Difference | `digestExaResults` | `digestForScrapbook` |
|---|---|---|
| Categories | 6 | 9 + "other" |
| Has `answer_relevance` | No | Yes (direct/tangential/background) |
| Has `confidence_note` | No | Yes |
| Has `event_date_precision` | No | Yes |
| Receives user query | No | Yes |
| Max tokens | 1500 | 4000 |
| Sorting | None | By answer_relevance |
| Exa metadata preserved | No | Yes (highlights, author, image) |
| Use case | Background enrichment | Interactive research UI |

---

### 8. SEC Company Resolver

| | |
|---|---|
| **Location** | `src/lib/enrichment/edgar.ts` :188-257 |
| **Called by** | `lookupCompanyCik()` — pass 4 of 4 (last resort after string matching) |
| **Output format** | Plain text (one of 3 values) |

**IN:**
```typescript
companyName: string   // already normalized and alias-resolved
```

**User message:**
```
Company name: "{companyName}"
```

**System prompt (6 strict rules):**
> You are an authoritative SEC EDGAR company resolver...
> 1. Return "PRIVATE" for privately held, startups, subsidiaries, non-profits...
> 2. Return "UNKNOWN" if genuinely cannot determine...
> 3. Only return exact SEC legal entity name if CERTAIN...
> 4. Do NOT guess or hallucinate. A wrong answer corrupts financial data.
> 5. Startups, biotech without IPOs, regional firms → almost always "PRIVATE"
> 6. Return ONLY one of: exact SEC legal name, "PRIVATE", or "UNKNOWN"

**OUT:** `{ cik: string; ticker: string; companyName: string } | null`

**Post-processing (two-stage verification):**
1. Strip surrounding quotes from LLM response
2. If `"PRIVATE"` or `"UNKNOWN"` or empty → return `null`
3. **Stage 1:** Match LLM-returned name against SEC company tickers JSON (cached in Redis) using normalized prefix matching
4. **Stage 2:** Validate matched CIK via live `https://data.sec.gov/submissions/CIK{padded}.json` API ping
5. Only return a result if **both** stages pass
6. On any error → return `null`

---

### 9. `generateLookalikePersona()`

| | |
|---|---|
| **Location** | `src/lib/enrichment/lookalike.ts` :105-237 |
| **Called by** | Lookalike/targeting module |
| **Output format** | Structured JSON (Zod-validated) |

**IN — `ProspectData`:**
```typescript
{
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
```

**User message (assembled conditionally):**
```
Extract professional attributes from this prospect to find similar people:

Name: {name}
Title: {title || "Unknown"}
Company: {company || "Unknown"}
LinkedIn: {linkedin}                    ← if present
AI Summary: {ai_summary}               ← if present
Wealth Signals:                         ← if present
- {type}: {description}
Web Mentions:                           ← up to 3
- {title}: {snippet}
SEC Insider Transactions: N transactions, total value: $X
```

**System prompt (8 rules for broad net):**
> You are a lead research analyst...
> - NEVER use the prospect's own name as the persona name
> - Cast a WIDE net: 3-5 job title VARIATIONS
> - Use BROAD industries
> - Include MULTIPLE seniority levels
> - Only include locations if known
> - Keep keywords short (2-3 max)
> - Company size should cover 2-3 ranges

**OUT — `LookalikeResult`:**
```typescript
{
  persona: {
    name: string;               // descriptive label, NOT prospect's name
    jobTitles: string[];        // 3-5 variations
    seniority: string;          // comma-joined
    industries: string[];       // 1-2 broad
    companySize: string;        // comma-joined ranges
    locations?: string[];
    keywords: string[];
    reasoning: string;
  };
  apolloFilters: {
    person_titles: string[];
    person_seniorities: string[];     // validated via SENIORITY_MAP
    organization_industry_tag_ids: string[];
    organization_num_employees_ranges: string[];
    person_locations?: string[];
    q_keywords: string;               // joined with " OR "
  };
}
```

**Post-processing:**
1. Strip code fences or extract `{...}` block
2. **Seniority mapping:** 25+ aliases → 11 canonical values (e.g., `"c-suite"` → `"c_suite"`, `"analyst"` → `"entry"`)
3. Fallback if empty seniorities: `["senior", "manager", "director"]`
4. Filter locations — remove `"unknown"`, `"n/a"`, `"not specified"`
5. **Zod schema validation** — enforces types for all fields including enum values for seniorities and company sizes
6. Build `apolloFilters` object from validated persona

---

### 10. Query Reformulator

| | |
|---|---|
| **Location** | `src/app/api/prospects/[prospectId]/research/route.ts` :168 |
| **Called by** | Research streaming endpoint — phase 1 of pipeline |
| **Output format** | Plain text (search query string) |

**IN:**
```typescript
prospect: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
}
query: string;   // user's research question (1-500 chars)
```

**User message:**
```
Person: {full_name or first_name + last_name}, {title} at {company}.
User question: {query}
```

**System prompt:**
> You are a search query reformulator. Given a user question about a specific person, create an optimal web search query. Return ONLY the search query string, nothing else.

**OUT:** `string` — a web search query optimized for Exa.

**Post-processing:**
1. `response.text.trim()`
2. Fallback to original `query` if response is empty or LLM call fails

---

## Efficiency Observations

| Observation | Prompts affected | Notes |
|---|---|---|
| **Two prompts do near-identical work** | #6 `digestExaResults` + #7 `digestForScrapbook` | Both digest Exa results through an LLM. #7 is a superset of #6 with extra fields. Could potentially unify. |
| **Prompt #4 embeds 75+ industry names in every call** | #4 `parse-query` | ~2000 tokens of static enum list sent on every search. Could be moved to few-shot examples or a lookup table. |
| **No batching** | All prompts | Each call is 1:1 (one prompt, one response). No multi-turn or batch APIs used. |
| **`companySize` not validated** | #4 `parse-query` | Seniorities and industries are validated, but company size passes through unchecked. |
| **Two models used for similar tasks** | #2 (Haiku) vs #3 (GPT-4o-mini) | Summary is Haiku, dossier is GPT-4o-mini. Both are text synthesis from the same enrichment data. |
| **SEC resolver is LLM-last** | #8 | Good pattern — LLM only called after 3 deterministic passes fail. |
| **Query reformulator is very lightweight** | #10 | 100 max tokens, minimal prompt. Efficient. |
| **Intent classifier has strong fallbacks** | #5 | Every field has a safe default. Never fails. |
