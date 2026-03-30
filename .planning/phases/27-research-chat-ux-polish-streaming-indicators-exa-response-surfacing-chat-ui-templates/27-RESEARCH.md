# Phase 27: Research Chat UX Polish — Research

**Researched:** 2026-03-29
**Domain:** Chat streaming UX, Exa API field surfacing, AI loading state patterns
**Confidence:** HIGH

## Summary

Phase 27 polishes the existing research chat panel (`research-panel.tsx`) and its underlying data pipeline. The panel already has a sophisticated multi-phase stream (reasoning → tool → shimmer → cards → sources) and a well-structured `ScrapbookCard` type. The gaps fall into three buckets:

1. **Exa field surfacing gap.** `exa-search.ts` (the scrapbook variant) requests only `text` content. Exa also supports `highlights` (LLM-extracted relevant snippets with cosine scores), `summary` (LLM page summary), `author`, `image`, and `favicon` — none of which are fetched or plumbed through to the card UI. The exa-channel.ts (Phase 26) already fetches highlights but does not use `highlightScores` or `summary`. There is no `score` field on Exa search results — only `highlightScores` per highlight.

2. **Streaming phase labeling gap.** The server emits `data-reasoning` (reformulating / complete) and `data-tool` (running / completed) but the client-side `ToolStatus` component shows a single static string. There are no contextual phase labels like "Thinking about your question…", "Searching the web…", "Analyzing 10 results…". The `streamPhase` state machine has room to drive richer label sequences without server changes.

3. **shadcn/ui AI components are copy-paste.** The shadcn.io AI library (`/ai`) provides 25+ purpose-built components (Reasoning collapsible, Tool call display with inputs/outputs, Sources expandable list, Shimmer skeleton, Loader). These are not installable as an npm package — they follow shadcn/ui's copy-paste pattern. The existing components in `research-panel.tsx` (ReasoningBlock, ToolStatus, ShimmerCard, SourcesList) overlap heavily with these; the decision to adapt vs. copy-paste shadcn components is a planning choice.

**Primary recommendation:** Enhance the Exa request in `exa-search.ts` to fetch `highlights` + `highlightScores` + `summary` + `author` + `image` + `favicon`. Add these fields to `ExaSearchResult` and `ScrapbookCard`. Wire highlights/scores into the `research-digest.ts` prompt. Surface the best highlight per card in `ResearchResultCard` as a quoted pull-quote. Add multi-label streaming phase text in `ResearchPanel`. Skip copying shadcn AI components — the existing sub-components are structurally equivalent and match the project's CSS variable design system.

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | 6.0.141 | `createUIMessageStream`, SSE transport | Already in use for research route |
| `@ai-sdk/react` | 3.0.143 | `useChat` hook (not currently used in panel) | Already in project |
| `lucide-react` | 0.563.0 | Icons (Clock, SendHorizontal, etc.) | Already in use in panel |
| `vitest` | 4.0.18 | Unit tests | Already configured |

### No New Packages Required

The entire phase can be completed without adding any npm dependencies. The Exa API fields (`highlights`, `summary`, `image`, `favicon`) are returned by the existing REST endpoint with different request body parameters. The loading state improvements are pure React/CSS. The shadcn AI components are reference patterns, not installable packages.

**Alternatives considered:**

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom streaming parser | `readUIMessageStream` from `ai` | Custom parser already works and is leaner; readUIMessageStream requires restructuring around useChat hook |
| Inline shadcn AI components | Copy-paste from shadcn.io/ai | shadcn components use their own CSS token system that conflicts with this project's CSS variables; custom components already exist |
| exa-js SDK | Bare fetch | Project uses bare fetch consistently; exa-js SDK is 2.10.2 but adds bundle weight with no functional benefit for this phase |

## Architecture Patterns

### Current Stream Architecture

```
POST /api/prospects/[prospectId]/research
  createUIMessageStream → JsonToSseTransformStream → SSE response

Wire format (per event):
  data: {"type":"data-session","data":{"session_id":"..."}}
  data: {"type":"data-reasoning","data":{"status":"reformulating","query":"..."}}
  data: {"type":"data-reasoning","data":{"status":"complete","reformulated":"..."}}
  data: {"type":"data-tool","id":"exa-search","data":{"status":"running","query":"..."}}
  data: {"type":"data-tool","id":"exa-search","data":{"status":"completed","count":10}}
  data: {"type":"data-shimmer","data":{"active":true},"transient":true}
  data: {"type":"data-card","data":{...ScrapbookCard}}  × N
  data: {"type":"data-shimmer","data":{"active":false},"transient":true}
  data: {"type":"data-sources","data":{"urls":[...]}}
  data: [DONE]
```

The client (`research-panel.tsx`) parses this with a manual SSE reader (no useChat hook). This is intentional — the panel has custom streaming card state that doesn't fit useChat's message model. **Do not change the transport layer.** All UX improvements can be made within the existing SSE parse loop.

### Recommended Project Structure (no changes to file tree)

```
src/
├── lib/research/
│   ├── exa-search.ts        # Add highlights/summary/image/favicon to request + ExaSearchResult type
│   └── research-digest.ts   # Accept ExaSearchResult with highlights; feed highlights into prompt
├── types/research.ts        # Add exa_highlights, exa_scores, exa_summary, exa_image to ScrapbookCard
└── components/prospect/
    ├── research-panel.tsx   # Add phase label map, richer ToolStatus, "Analyzing N results..." text
    └── research-result-card.tsx  # Add ExaHighlightQuote sub-component, author chip, image thumbnail
```

### Pattern 1: Exa Highlights Request

**What:** Request `highlights` in Exa API body alongside existing `text`
**When to use:** All research panel searches (not the enrichment pipeline — separate concern)

```typescript
// Source: https://exa.ai/docs/reference/get-contents (verified 2026-03-29)
body: JSON.stringify({
  query,
  type: "neural",
  numResults: CHANNEL_MAX_RESULTS,
  useAutoprompt: false,
  contents: {
    text: {
      maxCharacters: EXA_SCRAPBOOK_MAX_CHARS,
      includeHtmlTags: false,
    },
    highlights: {
      maxCharacters: 600, // ~3 sentences at ~200 chars each
    },
    summary: {
      query: "Key facts about this person and their activities",
    },
  },
}),
```

Return type extension:
```typescript
// src/lib/research/exa-search.ts
export interface ExaSearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
}
```

### Pattern 2: Streaming Phase Label Map

**What:** Map each `streamPhase` to a contextual human-readable label
**When to use:** Replace the raw `toolStatus` string with dynamic labels in `ToolStatus` component

```typescript
// research-panel.tsx — add inside component
const PHASE_LABELS: Record<StreamPhase, string> = {
  idle: "",
  reasoning: "Thinking about your question...",
  tool: "Searching the web...",     // overridden by toolStatus with result count
  shimmer: "Analyzing results...",
  cards: "Building research cards...",
  sources: "Collecting sources...",
  complete: "",
};
```

The server already emits `data-tool` with `status: "completed"` and `count: N`. The client can interpolate: "Analyzing 10 results..." when transitioning from `tool` → `shimmer`.

### Pattern 3: ExaHighlightQuote Sub-component

**What:** Render the best Exa highlight as a styled pull-quote below the summary
**When to use:** When `card.exa_highlights` is non-empty with score > 0.7

```typescript
// research-result-card.tsx — new sub-component
function ExaHighlightQuote({ highlight, score }: { highlight: string; score: number }) {
  if (score < 0.7) return null;
  return (
    <blockquote
      className="mt-2 pl-3 text-xs font-sans italic leading-relaxed"
      style={{
        borderLeft: "2px solid rgba(212,175,55,0.3)",
        color: "var(--text-tertiary, rgba(232,228,220,0.4))",
      }}
    >
      {highlight}
    </blockquote>
  );
}
```

Only show the top-scored highlight (index 0, since Exa returns them sorted). Do not show if `highlightScores[0] < 0.7` (low-relevance highlight clutters the card).

### Pattern 4: Exa Summary Usage in Digest Prompt

**What:** Pass Exa's LLM-generated summary alongside raw text to the `digestForScrapbook` function
**When to use:** When `summary` field is returned from Exa (not always present)

The digest LLM prompt currently gets `r.text.slice(0, 2000)`. With highlights + summary, the improved input is:
```
[0] Title: ...
URL: ...
Date: ...
Exa Summary: <summary from Exa, if present>
Top Highlight: <highlights[0], if present>
Text: <text slice if no summary>
```

This reduces the raw text the LLM must process while providing higher-signal input.

### Anti-Patterns to Avoid

- **Switching to `useChat` hook for the research panel.** The panel uses manual SSE parsing to support streaming cards into React state; `useChat` assumes text-streaming message model. Refactoring would be large, risky, and unnecessary.
- **Fetching `livecrawl: "always"` on Exa.** Livecrawl forces fresh content fetching for every query — dramatically increases latency and cost. Use default (cached) for research panel.
- **Fetching `numSentences` highlights parameter.** Deprecated since February 2026. Use `maxCharacters` instead.
- **Installing exa-js SDK.** Adds bundle weight. The bare fetch pattern is working and testable without SDK overhead.
- **Copying shadcn/ui AI components wholesale.** They use shadcn CSS token system (`--primary`, `--muted-foreground`) that doesn't match this project's CSS variables (`--gold-primary`, `--text-secondary`, `--bg-card`). Adapt the pattern, not the code.
- **Showing `highlightScores` numerically in the UI.** These are cosine similarity floats (e.g., 0.823). Users don't understand float similarity scores. Use them only as a gate (score > 0.7 = show highlight).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM-extracted highlights | Custom JS snippet extractor | Exa `highlights` field | Exa's highlights are LLM-generated with cosine scoring — JS regex cannot match context relevance |
| Streaming SSE parse | `ReadableStream` reader from scratch | Existing pattern in `research-panel.tsx` | Already working; copy the parse loop, don't rewrite |
| Animated loading sequence | CSS keyframe state machine | React state + `transition-all duration-200` | Simple string swap in render is sufficient |
| Source favicons | DNS lookup or scraping | Exa `favicon` field | Exa returns domain favicons directly |
| Page-level summarization | Full-text LLM summarization | Exa `summary` field | Exa already runs an LLM pass to summarize; requesting it costs no extra latency |

**Key insight:** Exa is already running LLM processing on results server-side. Requesting `highlights`, `summary`, and `favicon` fields adds them to the same API call with no latency penalty — they are computed as part of the search response, not separate round-trips.

## Common Pitfalls

### Pitfall 1: `numSentences` Highlights Parameter is Deprecated

**What goes wrong:** Using `highlights: { numSentences: 3 }` in the Exa request body causes a deprecation warning and will break in a future API version.
**Why it happens:** The `exa-channel.ts` (Phase 26) still uses `numSentences: EXA_HIGHLIGHT_SENTENCES`. This is fine for Phase 26 but should not be replicated.
**How to avoid:** Use `maxCharacters` instead: `highlights: { maxCharacters: 600 }`. February 2026 changelog confirms `numSentences` and `highlightsPerUrl` are deprecated and scheduled for removal.
**Warning signs:** Response from Exa includes a deprecation notice in headers or response body.

### Pitfall 2: Exa Summary Field Not Always Present

**What goes wrong:** Code assumes `result.summary` is always a string, causing TypeScript errors or runtime `.slice()` on undefined.
**Why it happens:** The `summary` field is optional — some pages may not return it (e.g., very short pages, paywalled content).
**How to avoid:** Type `summary?: string` in `ExaSearchResult`. In digest: `const summaryText = r.summary ?? r.text?.slice(0, 2000) ?? ""`.

### Pitfall 3: `streamPhase` Race Between `tool` and `shimmer`

**What goes wrong:** The client shows "Searching the web..." even after Exa returns, because the `data-shimmer` event lags behind `data-tool completed`.
**Why it happens:** The route fires `data-tool completed`, then immediately starts the LLM digest (synchronous `await`), then fires `data-shimmer active:true`. Between those two events there is no client UI update.
**How to avoid:** After receiving `data-tool` with `status: "completed"` and `count: N`, immediately update the label to `"Analyzing N results..."` before the shimmer phase begins. Store `exaResultCount` in local state from the tool-completed event.

```typescript
// In the SSE parse loop:
} else if (type === "tool_call") {
  setStreamPhase("tool");
  if (event.status === "completed" && typeof event.count === "number") {
    setToolStatus(`Analyzing ${event.count} results...`);
    // Don't wait for shimmer event to update label
  } else {
    setToolStatus(event.status ?? "Searching web...");
  }
}
```

Note: The current client maps `data-tool` events to a simple `event.status` string. The server emits `{status: "running"}` and `{status: "completed", count: N}`. The client needs to read `event.count`.

### Pitfall 4: `cardFadeIn` Animation Defined Inside Component JSX

**What goes wrong:** The `<style>` tag with `@keyframes cardFadeIn` is defined inside `ResearchResultCard` and re-injected on every card render. With 10 cards, this creates 10 identical `<style>` tags in the DOM.
**Why it happens:** The animation was added inline for convenience.
**How to avoid:** Move `@keyframes cardFadeIn` and `@keyframes slideDown` to `globals.css`. Remove the `<style>` tag from `ResearchResultCard`. This is a quick cleanup that should accompany Phase 27.

### Pitfall 5: `image` Field from Exa May Be Low Quality

**What goes wrong:** Showing `result.image` as a thumbnail can display social sharing Open Graph images (company logos, generic stock photos) rather than prospect-relevant images.
**Why it happens:** Exa's `image` field returns the page's `og:image` or first image — often generic.
**How to avoid:** Only show images when `card.category` is `media` or `recognition` (article thumbnails are usually relevant). Skip for `company_intel`, `sec_filing`, `funding`. Add a `onError` fallback that hides the `<img>` if it 404s.

### Pitfall 6: ScrapbookCard Type Changes Are DB-Stored

**What goes wrong:** Adding new fields to `ScrapbookCard` changes the shape of `result_cards` JSONB stored in `research_messages` table. Old sessions will have cards without the new fields.
**Why it happens:** Cards are persisted as JSONB in Supabase and loaded back via `loadSession()`.
**How to avoid:** All new fields must be optional (`?`) in `ScrapbookCard`. Access them with null-coalescing in the UI: `card.exa_highlights?.[0]`. No DB migration needed.

## Code Examples

Verified patterns from official sources:

### Exa Highlights + Summary Request (Full Body)

```typescript
// Source: https://exa.ai/docs/reference/get-contents (verified 2026-03-29)
// src/lib/research/exa-search.ts — updated body
body: JSON.stringify({
  query,
  type: "neural",
  numResults: CHANNEL_MAX_RESULTS,
  useAutoprompt: false,
  contents: {
    text: {
      maxCharacters: EXA_SCRAPBOOK_MAX_CHARS,
      includeHtmlTags: false,
    },
    highlights: {
      maxCharacters: 600,
    },
    summary: {
      query: "Key facts about this person and their recent activities",
    },
  },
}),
```

### Updated ExaSearchResult Type

```typescript
// src/lib/research/exa-search.ts
export interface ExaSearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
}
```

### ScrapbookCard Extensions (all optional)

```typescript
// src/types/research.ts — additions to ScrapbookCard interface
export interface ScrapbookCard {
  // ... existing fields unchanged ...
  // New optional Exa-sourced fields
  exa_highlights?: string[];         // LLM-extracted relevant snippets
  exa_highlight_scores?: number[];   // Cosine similarity scores per highlight
  exa_summary?: string;              // LLM page summary from Exa
  exa_author?: string;               // Page author if available
  exa_image?: string;                // og:image or first page image
}
```

### Richer ToolStatus with Phase Labels

```typescript
// research-panel.tsx — replace existing ToolStatus usage in streaming section
const STREAMING_LABELS: Partial<Record<StreamPhase, string>> = {
  reasoning: "Thinking about your question...",
  tool: "Searching the web...",
  shimmer: "Analyzing results...",
  cards: "Building intelligence cards...",
  sources: "Collecting sources...",
};

// In the JSX streaming indicator section:
{isSearching && streamPhase !== "idle" && STREAMING_LABELS[streamPhase] && (
  <ToolStatus status={toolStatus || STREAMING_LABELS[streamPhase]!} />
)}
```

### Digest Prompt Enhancement (highlights as input)

```typescript
// src/lib/research/research-digest.ts — updated userMessage construction
const userMessage = results
  .map((r, i) => {
    const highestHighlight = r.highlights?.[0];
    const summarySection = r.summary
      ? `Exa Summary: ${r.summary}`
      : highestHighlight
      ? `Top Highlight: ${highestHighlight}`
      : `Text: ${r.text?.slice(0, 2000) ?? "(empty)"}`;
    return `[${i}] Title: ${r.title}\nURL: ${r.url}\nDate: ${r.publishedDate ?? "unknown"}\n${summarySection}`;
  })
  .join("\n\n---\n\n");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `highlights: { numSentences: N }` | `highlights: { maxCharacters: N }` | Feb 2026 | Breaking in future Exa version |
| Static "Searching..." label | Phase-aware label sequence | Best practice 2025+ | Perplexity/Claude pattern: show what the AI is doing |
| Single spinner during AI calls | Skeleton + phase labels | 2024–2025 | Streaming improves perceived performance dramatically |

**Deprecated/outdated:**
- `highlights.numSentences`: Deprecated Feb 2026. Use `highlights.maxCharacters`.
- `highlights.highlightsPerUrl`: Same deprecation timeline.
- `useAutoprompt` response field: Removed from Exa SDK October 2025 (not a concern for bare fetch).

## Open Questions

1. **Should `exa_image` be surfaced in cards?**
   - What we know: Exa returns `image` (og:image). For media/recognition categories it's usually an article image.
   - What's unclear: Whether luxury prospect research cards benefit from images or just add noise.
   - Recommendation: Implement but gate on category (`media`, `recognition` only) and add onError fallback. Makes it optional to enable/disable per card.

2. **Should the `exa_summary` field replace the LLM digest entirely for simple queries?**
   - What we know: Exa already runs an LLM pass to generate `summary`. The `research-digest.ts` runs a second LLM pass.
   - What's unclear: Whether Exa's summary quality is sufficient to skip the second-pass digest for "background" category results.
   - Recommendation: Keep the two-pass approach for Phase 27. The digest adds relevance scoring (`is_about_target`, `answer_relevance`) that Exa's summary cannot provide.

3. **How many extra tokens does adding `highlights` + `summary` to the Exa request cost?**
   - What we know: Exa's highlights and summary are computed server-side; the caller is billed for API calls not tokens.
   - What's unclear: Whether requesting both significantly changes response latency.
   - Recommendation: Add both and measure. Latency impact is likely minimal since they are part of the same backend processing pass.

## Environment Availability

Step 2.6: This phase is code-only (no new external dependencies, no new CLI tools). The Exa API key is already configured (`EXA_API_KEY` confirmed in .env.local and Vercel per project memory). The `ai` SDK v6 is already installed. No environment audit needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test --reporter=verbose --run` |
| Full suite command | `pnpm test --run` |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|--------------|
| REQ-27-01 | `ExaSearchResult` includes `highlights`, `highlightScores`, `summary`, `author`, `image`, `favicon` optional fields | unit | `pnpm test --run src/lib/research/__tests__/exa-search.test.ts` | Wave 0 |
| REQ-27-02 | `digestForScrapbook` uses Exa summary/highlights as input when present, falls back to raw text | unit | `pnpm test --run src/lib/research/__tests__/research-digest.test.ts` | Wave 0 |
| REQ-27-03 | `ScrapbookCard` new optional fields are all optional (old persisted cards without them do not break) | unit | `pnpm test --run src/types/__tests__/research.test.ts` | Wave 0 |
| REQ-27-04 | `ToolStatus` renders phase label when `toolStatus` is empty | manual | n/a — render test in browser | manual-only |
| REQ-27-05 | `ExaHighlightQuote` renders when `score >= 0.7`, does not render when `score < 0.7` | unit (optional) | `pnpm test --run` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test --run`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full suite green + `pnpm build` (no lint errors) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/research/__tests__/exa-search.test.ts` — mock Exa API response with highlights/summary/image fields, assert they are returned
- [ ] `src/lib/research/__tests__/research-digest.test.ts` — assert digest uses `r.summary` when present, falls back to `r.text`
- [ ] No framework install needed — Vitest already configured

## Sources

### Primary (HIGH confidence)
- Exa API docs `https://exa.ai/docs/reference/search` — available fields: `highlights`, `highlightScores`, `summary`, `author`, `image`, `favicon`; confirmed `maxCharacters` replaces `numSentences`
- Exa February 2026 changelog `https://exa.ai/docs/changelog/february-2026-api-updates` — deprecation of `numSentences`, introduction of `maxCharacters`
- Vercel AI SDK v6 source `node_modules/.pnpm/ai@6.0.141_zod@4.3.6/node_modules/ai/src/ui-message-stream/` — confirmed wire format is `data: {type, data}\n\n` SSE; `data-*` custom types; `transient` flag behavior
- Vercel AI SDK v6 source `json-to-sse-transform-stream.ts` — confirmed serialization as `JSON.stringify(part)` per event

### Secondary (MEDIUM confidence)
- shadcn.io/ai component catalog `https://www.shadcn.io/ai` — confirmed 25+ components exist (Reasoning, Tool, Sources, Shimmer, Loader); confirmed copy-paste philosophy not npm install
- ShapeOfAI streaming patterns `https://www.shapeof.ai/patterns/stream-of-thought` — confirmed phase sequence: queued → running → analyzing → completed; Perplexity/ChatGPT/Grok patterns documented

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Exa API fields: HIGH — verified against official docs and cross-checked with live installed version
- Streaming wire format: HIGH — read directly from installed `ai@6.0.141` source
- shadcn AI components: MEDIUM — confirmed via official page; component internals not audited (copy-paste, not installed)
- Loading state UX patterns: MEDIUM — confirmed via ShapeOfAI patterns page; specific label copy is discretionary

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (Exa deprecation timelines for `numSentences` are not yet set; AI SDK v6 is stable)
