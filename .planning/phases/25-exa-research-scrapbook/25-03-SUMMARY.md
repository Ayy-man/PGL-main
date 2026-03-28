---
phase: 25-exa-research-scrapbook
plan: "03"
subsystem: api-routes
tags: [research, streaming, ai-sdk-v6, rate-limiting, sessions, pins]
dependency_graph:
  requires:
    - "25-01: research types, DB migration"
    - "25-02: exa-search, research-digest, research-rate-limit lib functions"
  provides:
    - "POST /api/prospects/[prospectId]/research — streaming research endpoint"
    - "POST /api/prospects/[prospectId]/research/pin — pin card to signal/dossier/note"
    - "GET /api/prospects/[prospectId]/research/sessions — session list"
    - "GET /api/prospects/[prospectId]/research/sessions/[sessionId] — session thread"
    - "POST /api/prospects/[prospectId]/research/suggestions — 4 suggestion pills"
  affects:
    - "25-04: research panel UI consumes all 5 routes"
tech_stack:
  added:
    - "AI SDK v6 createUIMessageStream + createUIMessageStreamResponse"
  patterns:
    - "DataUIMessageChunk (data-* type prefix) for custom stream parts"
    - "zod body validation on all POST routes"
    - "createClient() for auth + createAdminClient() for DB writes"
    - "fire-and-forget logProspectActivity pattern"
    - "fetch-then-update pattern for JSONB array append"
key_files:
  created:
    - "src/app/api/prospects/[prospectId]/research/route.ts"
    - "src/app/api/prospects/[prospectId]/research/pin/route.ts"
    - "src/app/api/prospects/[prospectId]/research/sessions/route.ts"
    - "src/app/api/prospects/[prospectId]/research/sessions/[sessionId]/route.ts"
    - "src/app/api/prospects/[prospectId]/research/suggestions/route.ts"
  modified: []
decisions:
  - "Used DataUIMessageChunk (data-{NAME}) types instead of plan pseudocode generic types — plan used type:'reasoning'/'data'/'tool-call' which are invalid in SDK v6; correct types are data-reasoning, data-tool, data-shimmer, data-card, data-sources"
  - "Streamed data-message-id twice: first with user message ID (for early client capture), second with assistant message ID (for pin operations)"
  - "Used as-cast (Parameters<typeof writer.write>[0]) to bypass TypeScript strict generic inference on untyped UIDataTypes"
metrics:
  duration: "~4 min (253s)"
  completed: "2026-03-28T23:42:40Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 25 Plan 03: API Routes for Research Scrapbook Summary

**One-liner:** Five Next.js API routes powering the research scrapbook with AI SDK v6 multi-phase streaming, rate-limited search, pin-to-dossier writes, and session management.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Main streaming research route + pin route | bdfe6af | route.ts, pin/route.ts |
| 2 | Session listing + thread + suggestions routes | e25cdda | sessions/route.ts, sessions/[sessionId]/route.ts, suggestions/route.ts |

## What Was Built

### POST /research (route.ts)
The core streaming endpoint. Flow:
1. Auth check + rate limit (429 with friendly message if exceeded)
2. Fetch prospect context (name, title, company)
3. Create session if session_id not provided; insert user message
4. `createUIMessageStream` with 6-phase data stream:
   - `data-session` (session_id for client session tracking)
   - `data-message-id` (user message ID)
   - `data-reasoning` (status: reformulating → complete)
   - `data-tool` (status: running → completed with count)
   - `data-shimmer` (active true/false around digest)
   - `data-card` (one per ScrapbookCard)
   - `data-sources` (deduplicated URLs)
   - `data-message-id` (assistant message ID for pin operations)
5. Saves assistant message with result_cards JSONB to DB
6. Fire-and-forget activity log (research_scrapbook_search)

### POST /pin (pin/route.ts)
Pin handler for 3 targets:
- **signal**: inserts into prospect_signals with raw_source="research"
- **dossier_hook**: fetch-then-update appends to intelligence_dossier.outreach_hooks[]
- **note**: saves pin record only (research_pins)
All targets: insert research_pins record + log research_scrapbook_pin activity

### GET /sessions (sessions/route.ts)
Lists up to 20 sessions for user+prospect, enriched with first_query (first user message content) and result_count (assistant message count via head query).

### GET /sessions/[sessionId] (sessions/[sessionId]/route.ts)
Returns `{ session_id, messages[] }` with full message thread in chronological order.

### POST /suggestions (suggestions/route.ts)
Generates 4 contextual suggestion pills via fast Claude call. Falls back to 4 generic suggestions if LLM call fails or JSON parsing fails.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected AI SDK v6 stream chunk types**
- **Found during:** Task 1
- **Issue:** Plan pseudocode used `type: "reasoning"`, `type: "data"`, `type: "tool-call"`, `type: "tool-result"` which do not exist in AI SDK v6 `UIMessageChunk`. Valid types are `reasoning-delta`, `tool-input-available`, etc. For custom data, the pattern is `DataUIMessageChunk` with `type: "data-{NAME}"`.
- **Fix:** Used `data-reasoning`, `data-tool`, `data-shimmer`, `data-card`, `data-sources` matching the exact types expected by the Plan 04 client (documented in 25-04-PLAN.md interfaces)
- **Files modified:** src/app/api/prospects/[prospectId]/research/route.ts
- **Commit:** bdfe6af

**2. [Rule 2 - Missing critical] Added data-session and data-message-id stream parts**
- **Found during:** Task 1
- **Issue:** Plan 04 client requires `data-session` to capture session_id for follow-up queries and `data-message-id` to capture message_id for pin operations. Without these the client cannot function.
- **Fix:** Streamed `data-session` and user `data-message-id` before processing, then assistant `data-message-id` after saving assistant message
- **Files modified:** src/app/api/prospects/[prospectId]/research/route.ts
- **Commit:** bdfe6af

**3. [Rule 2 - Missing critical] chatCompletion returns object not string**
- **Found during:** Task 1
- **Issue:** Plan pseudocode called `chatCompletion(...)` directly as a string but the actual function returns `{ text: string, inputTokens?, outputTokens? }`
- **Fix:** Used `response.text` after chatCompletion calls
- **Files modified:** route.ts, suggestions/route.ts
- **Commit:** bdfe6af, e25cdda

## Verification

```bash
# All 5 routes present
ls src/app/api/prospects/[prospectId]/research/
# route.ts  pin/  sessions/  suggestions/

# Build succeeded with all routes listed
pnpm build --no-lint  # ✓ exit 0

# TypeScript clean
pnpm tsc --noEmit     # ✓ no errors
```

## Known Stubs

None — all routes are fully wired to their DB tables and lib functions.

## Self-Check: PASSED

All 5 route files exist. Both task commits (bdfe6af, e25cdda) found in git log. Build succeeds with all routes listed. No TypeScript errors.
