---
phase: quick
plan: 260327-rhx
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/enrichment/exa.ts
  - src/lib/enrichment/exa-digest.ts
  - src/inngest/functions/enrich-prospect.ts
  - src/components/prospect/wealth-signals.tsx
  - src/components/prospect/profile-view.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Exa search returns results for the correct person, not unrelated matches"
    - "Raw Exa results are digested by LLM into categorized, clean signals before storage"
    - "Wealth Signals UI renders digested signals with category icons, headlines, and summaries"
    - "No raw HTML/markdown/boilerplate text is ever displayed in the UI"
  artifacts:
    - path: "src/lib/enrichment/exa.ts"
      provides: "Targeted Exa search with exact-match query and post-filter"
    - path: "src/lib/enrichment/exa-digest.ts"
      provides: "LLM digest function that validates, categorizes, and summarizes Exa results"
    - path: "src/inngest/functions/enrich-prospect.ts"
      provides: "Updated Exa step wiring digest into pipeline, storing DigestedSignal[] in web_data"
    - path: "src/components/prospect/wealth-signals.tsx"
      provides: "Renders digested signals with category icons, bold headlines, summaries, source links"
    - path: "src/components/prospect/profile-view.tsx"
      provides: "Updated web_data type on Prospect interface to match new DigestedSignal shape"
  key_links:
    - from: "src/lib/enrichment/exa.ts"
      to: "src/lib/enrichment/exa-digest.ts"
      via: "enrichExa returns raw results, digestExaResults processes them"
    - from: "src/inngest/functions/enrich-prospect.ts"
      to: "src/lib/enrichment/exa-digest.ts"
      via: "fetch-exa step calls digestExaResults after enrichExa"
    - from: "src/components/prospect/wealth-signals.tsx"
      to: "src/components/prospect/profile-view.tsx"
      via: "ProfileView passes prospect.web_data to WealthSignals"
---

<objective>
Fix Exa enrichment pipeline: make search queries specific to avoid wrong-person results, add an LLM digest step to validate/categorize/summarize results before storage, and update the Wealth Signals UI to render clean digested signals instead of raw mentions.

Purpose: Current Exa search returns irrelevant results for wrong people. Raw HTML/markdown snippets display poorly in the UI. This fix produces accurate, clean, categorized intelligence signals.
Output: Updated enrichment pipeline (exa.ts + new exa-digest.ts), updated Inngest function, updated UI components.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/enrichment/exa.ts
@src/lib/ai/openrouter.ts
@src/inngest/functions/enrich-prospect.ts
@src/components/prospect/wealth-signals.tsx
@src/components/prospect/profile-view.tsx

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/lib/ai/openrouter.ts:
```typescript
export async function chatCompletion(
  system: string,
  userMessage: string,
  maxTokens?: number,
  model?: string
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }>;
```

From src/lib/enrichment/exa.ts (current ExaResult — will be modified):
```typescript
export type ExaResult = {
  found: boolean;
  mentions: Array<{ title: string; url: string; snippet: string; publishDate?: string }>;
  wealthSignals: Array<{ type: string; description: string; source: string }>;
  error?: string;
  circuitOpen?: boolean;
};
```

From src/lib/enrichment/track-api-usage.ts:
```typescript
export function trackApiUsage(provider: string): Promise<void>;
```

From src/lib/circuit-breaker.ts:
```typescript
export function withCircuitBreaker<T>(fn: (...args: any[]) => Promise<T>, opts: { name: string; timeout: number }): typeof fn;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Exa search query, create digest module, update Inngest wiring</name>
  <files>src/lib/enrichment/exa.ts, src/lib/enrichment/exa-digest.ts, src/inngest/functions/enrich-prospect.ts</files>
  <action>
**1. Fix `src/lib/enrichment/exa.ts` — Specific search query + post-filter:**

- Change the search query on line 114 from:
  `"${params.name}" "${params.company}" executive OR founder OR investor`
  to simply:
  `"${params.name}" "${params.company}"`
  The quoted exact matching ensures only results mentioning BOTH the person and company appear. Remove the role keywords — they bias results toward wrong people with similar titles.

- Increase `numResults` from 5 to 10 (more candidates before filtering).

- After `const data = await response.json()` and BEFORE building the `mentions` array, add a post-filter step:
  ```typescript
  const nameLower = params.name.toLowerCase();
  const companyLower = params.company.toLowerCase();
  const filtered = data.results.filter((r) => {
    const text = ((r.title || '') + ' ' + (r.text || '')).toLowerCase();
    return text.includes(nameLower) || text.includes(companyLower);
  });
  ```
  Use `filtered` instead of `data.results` for building mentions and wealth signals.

- Keep the existing `ExaResult` type, `extractWealthSignals`, circuit breaker wrapping, and `trackApiUsage` call unchanged.

**2. Create NEW `src/lib/enrichment/exa-digest.ts` — LLM digest function:**

Define the `DigestedSignal` type (exported):
```typescript
export type SignalCategory = "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition";

export type DigestedSignal = {
  relevant: boolean;
  category: SignalCategory;
  headline: string;    // Under 10 words
  summary: string;     // 1-2 sentences, no markdown/HTML/boilerplate
  source_url: string;
  raw_text: string;    // Kept for debugging, not displayed
};
```

Create `digestExaResults` function:
```typescript
export async function digestExaResults(
  personName: string,
  companyName: string,
  mentions: Array<{ title: string; url: string; snippet: string; publishDate?: string }>
): Promise<DigestedSignal[]>
```

Implementation:
- If `mentions` is empty, return `[]`.
- Build a single batch prompt for Claude Haiku via `chatCompletion` from `@/lib/ai/openrouter`:
  - System prompt: "You are a wealth intelligence analyst. For each search result about a person, determine if it is relevant to the target individual, categorize it, and generate a clean headline and summary. Return valid JSON only."
  - User prompt: Include the target `personName` and `companyName`, then list each mention with its index, title, url, and snippet text.
  - Ask the LLM to return a JSON array where each element has: `{ index: number, relevant: boolean, category: SignalCategory, headline: string, summary: string }`.
  - Set `maxTokens` to 1500 (enough for 10 results).
- Parse the JSON response. Use `JSON.parse` wrapped in try/catch — if parsing fails, return an empty array (graceful degradation).
- Map parsed results back to `DigestedSignal[]`, attaching `source_url` and `raw_text` from the original mention. Filter out items where `relevant === false`.
- If the LLM call throws, log the error and return empty array (never block enrichment).

**3. Update `src/inngest/functions/enrich-prospect.ts` — Wire digest into Exa step:**

- Add import: `import { digestExaResults, type DigestedSignal } from "@/lib/enrichment/exa-digest";`

- In the `"fetch-exa"` step (around line 185-249), after getting `result` from `enrichExa`:
  - If `result.found && result.mentions.length > 0`, call `digestExaResults(name, company, result.mentions)`.
  - Store the digested signals instead of raw mentions in `web_data`:
    ```typescript
    web_data: {
      signals: digestedSignals,  // DigestedSignal[]
      source: "exa",
      enriched_at: new Date().toISOString(),
    }
    ```
  - Update the step return to include `signals` instead of separate `mentions`/`wealthSignals`.
  - The `exaData` variable shape changes — also update the Step 5 (generate-summary) call where it reads `exaData.mentions` and `exaData.wealthSignals`. Instead, pass `{ signals: exaData.signals }` for webData, or map signals back to a summary-friendly format (headline + summary pairs).

- Keep all error handling, source status updates, and circuit breaker behavior unchanged.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && npx tsc --noEmit --pretty 2>&1 | head -40</automated>
  </verify>
  <done>Exa search uses exact-match quoted query, post-filters irrelevant results, new exa-digest.ts module exists and is wired into the Inngest enrich-prospect function. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Update Wealth Signals UI and ProfileView interface for digested signals</name>
  <files>src/components/prospect/wealth-signals.tsx, src/components/prospect/profile-view.tsx</files>
  <action>
**1. Update `src/components/prospect/profile-view.tsx` — Change `web_data` type on `Prospect` interface:**

Replace the current `web_data` type (lines 56-66):
```typescript
web_data?: {
  mentions: Array<{ title: string; snippet: string; url: string; publishedDate?: string }>;
  wealth_signals?: string[];
  source?: string;
  enriched_at?: string;
} | null;
```
With the new digested shape:
```typescript
web_data?: {
  signals: Array<{
    relevant: boolean;
    category: "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition";
    headline: string;
    summary: string;
    source_url: string;
    raw_text: string;
  }>;
  source?: string;
  enriched_at?: string;
} | null;
```

The rest of ProfileView passes `prospect.web_data` to `<WealthSignals>` on line 429 — this wiring stays the same, but WealthSignals props must also update.

**2. Rewrite `src/components/prospect/wealth-signals.tsx` — Render digested signals:**

Update the `WealthSignalsProps` interface. Replace `ExaMention` and `ExaResult` with:
```typescript
interface DigestedSignal {
  relevant: boolean;
  category: "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition";
  headline: string;
  summary: string;
  source_url: string;
  raw_text: string;
}

interface WealthSignalsProps {
  webData?: {
    signals: DigestedSignal[];
    source?: string;
    enriched_at?: string;
  } | null;
  insiderData?: EdgarResult | null;
}
```

Add a category icon mapping function using lucide-react icons:
```typescript
import { Briefcase, DollarSign, Mic2, Gem, Building2, Trophy, ExternalLink, Diamond, Landmark } from "lucide-react";

function getCategoryIcon(category: DigestedSignal["category"]) {
  switch (category) {
    case "career_move": return Briefcase;
    case "funding": return DollarSign;
    case "media": return Mic2;
    case "wealth_signal": return Gem;
    case "company_intel": return Building2;
    case "recognition": return Trophy;
    default: return Diamond;
  }
}
```

Add a category label mapping:
```typescript
function getCategoryLabel(category: DigestedSignal["category"]): string {
  switch (category) {
    case "career_move": return "Career Move";
    case "funding": return "Funding";
    case "media": return "Media";
    case "wealth_signal": return "Wealth Signal";
    case "company_intel": return "Company Intel";
    case "recognition": return "Recognition";
    default: return "Signal";
  }
}
```

Update the signals presence check:
```typescript
const hasSignals = webData?.signals && webData.signals.length > 0;
const hasTransactions = insiderData?.transactions && insiderData.transactions.length > 0;
const hasAny = hasSignals || hasTransactions;
```

Replace the web mention cards grid. For each signal in `webData.signals`:
- Render in the existing 2-col grid layout (keep `grid grid-cols-1 md:grid-cols-2 gap-4 mb-6`).
- Each card: category icon (from `getCategoryIcon`) in the top-left with the category label as a small pill badge next to it.
- **Headline** in bold (`text-sm font-bold text-foreground font-serif`).
- **Summary** in body text (`text-xs text-muted-foreground leading-relaxed`).
- **Source link** at the bottom using the existing gold link pattern (`View Source` with ExternalLink icon, `style={{ color: "var(--gold-primary)" }}`).
- Keep the existing card styling: `rounded-[8px] p-4`, `background: "rgba(255,255,255,0.02)"`, border with gold hover via onMouseEnter/onMouseLeave (same pattern as current mention cards).
- NEVER display `raw_text`.
- The last-card-spans-full-width logic stays: if odd number of signals, last card gets `md:col-span-2`.

Keep the SEC Filings table section completely unchanged (it reads from `insiderData` which is not affected).

Remove the old `ExaMention`, `ExaResult` interfaces and any references to `webData.mentions` or `webData.wealth_signals`.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library.noSync/PGL-main" && npx tsc --noEmit --pretty 2>&1 | head -40</automated>
  </verify>
  <done>WealthSignals renders digested signals with per-category icons (Briefcase, DollarSign, Mic2, Gem, Building2, Trophy), bold headlines, clean summaries, and source links. No raw text displayed. ProfileView Prospect interface matches new web_data shape. TypeScript compiles clean.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors across all modified files
2. `pnpm build` completes successfully (exit 0)
3. Visual check: exa-digest.ts exports `DigestedSignal` type and `digestExaResults` function
4. Visual check: exa.ts query uses `"${params.name}" "${params.company}"` (no role keywords)
5. Visual check: exa.ts has post-filter checking name OR company in result text
6. Visual check: enrich-prospect.ts calls `digestExaResults` and stores `{ signals, source, enriched_at }` in web_data
7. Visual check: wealth-signals.tsx renders category icons, headlines, summaries — never raw_text
</verification>

<success_criteria>
- Exa search query is specific: exact quoted name + company, no broad role keywords
- Post-filter removes results that mention neither the prospect name nor company
- LLM digest step validates relevance, categorizes, and generates clean headline/summary
- Digested signals stored in web_data.signals (not raw mentions)
- UI renders category-appropriate icons, bold headlines, 1-2 sentence summaries
- No raw text, markdown, or HTML ever displayed in the UI
- TypeScript compiles, build passes
</success_criteria>

<output>
After completion, create `.planning/quick/260327-rhx-fix-exa-enrichment-specific-search-queri/260327-rhx-SUMMARY.md`
</output>
