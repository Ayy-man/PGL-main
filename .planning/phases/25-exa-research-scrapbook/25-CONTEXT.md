# Phase 25: Exa Research Scrapbook - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Source:** PRD Express Path (user spec)

<domain>
## Phase Boundary

A first-class research workbench embedded in every prospect profile. The agent types a freeform question, Exa searches the live web, an LLM digests and validates the results, and each finding streams in as a rich card the agent can edit and pin to the prospect's permanent Intelligence Dossier.

**Delivers:**
- Research chat panel (Conversation + Message + PromptInput + Suggestion components)
- Multi-phase streaming UX (Reasoning → Tool → Shimmer → Cards → Sources)
- Result cards with category badges, relevance scoring, source attribution
- Pin-to-Dossier flow (3 targets: signal, outreach hook, note)
- Session history per-user per-prospect
- Rate limiting (100 searches/day/tenant via Upstash)
- Activity log integration for all research events
- Dossier/Research tab toggle on prospect profile

</domain>

<decisions>
## Implementation Decisions

### Component Library
- Install shadcn AI components BEFORE building: message, conversation, prompt-input, suggestion, sources, actions, reasoning, tool, loader, shimmer, confirmation
- URLs: `https://www.shadcn.io/r/{name}.json` for each component
- These integrate with Vercel AI SDK's `useChat` hook
- Restyle all components to match dark luxury design system (gold accents, correct typography, CSS variables)

### Restyling Rules
- Backgrounds: `--bg-card` / `--bg-surface` gradients
- Borders: `--border-subtle` / `--border-hover`
- Text: `--text-primary` / `--text-secondary` / `--text-tertiary`
- Accent: `--gold-primary` (#d4af37) everywhere (focus rings, active states, badges, icons)
- User messages: `--gold-bg-strong` background, `--border-gold` border, bottom-right less rounded
- Assistant messages: no bubble, full-width, left-aligned, markdown in `--text-secondary`
- Typography: `font-sans` (DM Sans) messages, `font-mono` (JetBrains Mono) timestamps/metadata, `font-serif` (Cormorant Garamond) section headers only
- Scrollbar: 4px thin, `rgba(255,255,255,0.08)` thumb on transparent track
- Hover transitions: 150ms ease
- Dual-shadow system on result cards (outer shadow for depth, inset highlight for surface sheen)

### Data Model
- `research_sessions` table: id, prospect_id, tenant_id, user_id, created_at, updated_at. Index on (prospect_id, updated_at DESC). RLS tenant isolation.
- `research_messages` table: id, session_id, tenant_id, role (user/assistant/system), content, metadata JSONB, result_cards JSONB. Index on (session_id, created_at ASC). RLS tenant isolation.
- `research_pins` table: id, message_id, prospect_id, tenant_id, user_id, card_index, pin_target (signal/dossier_hook/note), edited_headline, edited_summary, created_at. RLS tenant isolation.
- RLS policies use `current_setting('app.current_tenant_id')::uuid` (configured in Supabase dashboard, not migration files)

### Result Card Schema
- Fields: index, headline, summary, category (career_move|funding|media|wealth_signal|company_intel|recognition|sec_filing|market_event|other), source_url, source_name, source_favicon, event_date (ISO or null), event_date_precision (exact|approximate|unknown), relevance (high|medium|low), answer_relevance (direct|tangential|background), is_about_target (boolean), raw_snippet, confidence_note
- Sort: direct answers first, then tangential, then background
- Drop anything with is_about_target: false

### Tab Toggle (Dossier/Research)
- Two-tab pill toggle above Intelligence Dossier section
- Active tab: gold bottom border (2px `--gold-primary`), `--text-primary`
- Inactive: no border, `--text-tertiary`, hover → `--text-secondary`
- Crossfade transition: outgoing fades out (opacity 0, scale 0.98, 200ms ease-out), incoming fades in (opacity 1, translateY 8px→0, 250ms ease-out, 50ms delay)
- Wealth Signals section stays visible in both tabs. Only Dossier block swaps with Research panel.

### Prospect Context Strip
- Compact bar at top of Research panel only: avatar (32px initials/photo) + name (14px, 600 weight) + title/company (13px, `--text-secondary`) + location + wealth estimate
- Background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(212,175,55,0.04))`
- Bottom border: `1px solid --border-subtle`

### Research Chat Panel
- Built on shadcn `<Conversation>` as outer container (auto-scroll, scroll-to-bottom fab)
- User queries: `<Message role="user">` gold bubble, right-aligned
- Reasoning: `<Reasoning>` auto-open during reformulation, shimmer, auto-collapse with duration display
- Tool call: `<Tool>` with status badge (streaming→running→completed), collapsed after completion
- Shimmer: 3 card-shaped `<Shimmer>` blocks, gold-tinted, during LLM digest
- Result cards stream in one by one (120ms delay, fade + translateY(8px) entrance)
- Sources: `<Sources>` collapsible citation list at end of each response

### Result Card Design
- Category badge (colored pill matching Wealth Signal Timeline palette), relevance dot (gold=high, muted=medium, none=low), event date (font-mono 11px)
- Headline: 15px, 600 weight, `--text-primary`
- Summary: 13px, `--text-secondary`, line-clamp-3, "[read more]" to expand, markdown support
- Source + confidence footer: inset row, source as external link (`--gold-muted`), confidence note in italic `--text-tertiary`
- Action bar: Pin (opens dropdown), Copy (plain text), Flag (bad quality)
- Card surface: `--bg-card`, dual-shadow, hover → `--border-hover` + gold glow + translateY(-1px)
- Pinned state: gold left border 2px, "Pinned ✓" replaces pin button, 5-second undo window

### Pin Flow
- Dropdown with 3 targets: "Add as Wealth Signal", "Add as Outreach Hook", "Save as Research Note"
- On selection: inline edit mode (editable headline input + summary textarea, gold borders)
- For outreach hook: single text field pre-filled with suggested hook
- "Save & Pin" (gold gradient primary) + "Cancel" (ghost) buttons
- On save: gold pulse micro-animation (200ms), settles to gold left border
- "signal" → insert into prospect_signals + log prospect_activity (category: data, type: new_signal)
- "dossier_hook" → append to intelligence_dossier.outreach_hooks JSONB + log (category: data, type: ai_summary_updated)
- "note" → insert into research_pins + log (category: team, type: note_added)

### Low-Relevance Collapse
- Results with relevance: 'low' or answer_relevance: 'background' grouped behind: "N more results (background) [Show]"
- Expand with opacity: 0.6 and slideDown animation

### Chat Input (PromptInput)
- Auto-resizing textarea, max 3 lines
- Placeholder: "Ask about {first_name}..." (personalized)
- Enter to send, Shift+Enter for newline
- Gold focus ring (`--border-gold`, box-shadow: 0 0 0 2px rgba(212,175,55,0.15))
- Send button: 32px circle, gold gradient when text present, `--bg-card` when empty, SendHorizontal icon
- During search: disabled, placeholder "Researching...", gold pulse border
- Attachment support: paste/drag screenshots (uploaded, sent as context with Exa query)

### Smart Suggestions
- 4 contextual suggestion pills on empty session via `<Suggestion>` component
- Generated by fast Claude call using prospect name + title + company + existing dossier summary
- Disappear after first query
- Pill style: `--bg-card`, `--border-subtle`, 12px, hover → `--border-gold`

### Session History
- Clock icon button in panel header, right-aligned
- Dropdown: sessions grouped by date, each shows first query as label + result count
- Click loads full thread into Conversation
- "New research" option starts fresh session
- Sessions are per-user, per-prospect

### API Routes
- `POST /api/prospects/[prospectId]/research` — Main search: reformulate → Exa → digest → stream response. Creates session if session_id null. Streaming via Vercel AI SDK streamText with phases (reasoning, tool_call, card, sources, complete).
- `POST /api/prospects/[prospectId]/research/pin` — Pin card to signal/dossier_hook/note with optional edits + activity logging.
- `GET /api/prospects/[prospectId]/research/sessions` — List all sessions for user+prospect.
- `GET /api/prospects/[prospectId]/research/sessions/[sessionId]` — Full message thread with result_cards.
- `POST /api/prospects/[prospectId]/research/suggestions` — Generate 4 contextual suggestions via Claude.

### LLM Digest Prompt
- Process each Exa result: is it about the target person? Is it relevant to the question?
- Additional fields for scrapbook: answer_relevance (direct|tangential|background), confidence_note
- Use existing exa-digest.ts patterns as base, extend with scrapbook-specific fields

### Exa Search Config
- `type: "neural"`, `numResults: 10`, `useAutoprompt: false`, `contents: { text: { maxCharacters: 3000, includeHtmlTags: false } }`
- Cost: ~$0.007/search

### Rate Limiting
- Upstash Redis, key `research:{tenant_id}`, 100 searches/day/tenant
- On limit: gold-bordered notice "Daily research limit reached. Resets at midnight UTC."

### Activity Log Integration
- Tab open: `{ category: 'team', type: 'viewed', metadata: { section: 'research' } }` (deduplicated/hour)
- Search: `{ category: 'data', type: 'exa_updated', metadata: { source: 'research_scrapbook', query, results: count } }`
- Pin: logged per pin_target type

### Reactive Updates
- Dossier tab: pinned hooks show with 1-second gold highlight fade animation
- Signal Timeline: pinned signals show "NEW" badge + Search Lucide icon (distinguish from auto-enriched)

### Claude's Discretion
- Internal state management approach for streaming phases (useChat vs custom hooks)
- Error handling for Exa API failures, LLM timeouts
- Exact framer-motion vs CSS transition implementation for crossfade
- Image attachment upload mechanism (Supabase Storage vs base64)
- Session pagination strategy for users with many sessions
- Exact Upstash rate-limiting implementation (sliding window vs fixed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prospect Profile (where Research tab lives)
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — Prospect detail page
- `src/components/prospect/profile-view.tsx` — Profile view component (tab container)
- `src/components/prospect/profile-tabs.tsx` — Existing tab system
- `src/components/prospect/profile-header.tsx` — Profile header with prospect context

### Intelligence Dossier & Signals (pin targets)
- `src/components/prospect/intelligence-dossier.tsx` — Dossier component (hooks target)
- `src/components/prospect/signal-timeline.tsx` — Signal timeline (signal pin target)
- `src/components/prospect/wealth-signals.tsx` — Wealth signals display
- `supabase/migrations/20260329_intelligence_dossier_signals.sql` — Dossier/signals schema

### Existing Exa Integration (patterns to follow)
- `src/lib/enrichment/exa.ts` — Exa API client
- `src/lib/enrichment/exa-digest.ts` — Exa digest prompt and processing

### Activity System (log integration)
- `src/components/prospect/activity-timeline.tsx` — Activity timeline
- `src/components/prospect/timeline-feed.tsx` — Timeline feed rendering
- `src/app/api/prospects/[prospectId]/activity/route.ts` — Activity API
- `supabase/migrations/20260329_prospect_activity.sql` — Activity schema

### Signals API
- `src/app/api/prospects/[prospectId]/signals/route.ts` — Signals CRUD

### Types
- `src/types/database.ts` — Database types (prospect_signals, intelligence_dossier)

### UI Components
- `src/components/ui/` — Existing shadcn components (dropdown-menu, skeleton, etc.)

### Database Migrations
- `supabase/migrations/` — Migration file conventions

</canonical_refs>

<specifics>
## Specific Ideas

- Streaming response uses 4 distinct phases: reasoning → tool_call → card (one at a time) → sources+complete
- Query reformulation is a fast Claude call returning ONLY the search string
- Result cards stagger with 120ms delay, fade + translateY(8px) entrance
- Pinned state has 5-second undo window
- Outreach hook pre-fills: "Ask about their {headline.toLowerCase()}"
- Suggestions generated using prospect name + title + company + existing dossier summary
- Session history shows first query as label + result count per session
- Rate limit key format: `research:{tenant_id}`
- Activity log deduplication: tab views deduplicated per hour

</specifics>

<deferred>
## Deferred Ideas

- Image attachment upload for research context (spec mentions it but implementation is discretionary)
- Flagging bad results for future training (spec mentions Flag button, training pipeline is future work)

</deferred>

---

*Phase: 25-exa-research-scrapbook*
*Context gathered: 2026-03-29 via PRD Express Path*
