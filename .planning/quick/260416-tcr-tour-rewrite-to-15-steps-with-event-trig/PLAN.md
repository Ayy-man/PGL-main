---
quick_id: 260416-tcr
slug: tour-rewrite-to-15-steps-with-event-trig
status: in-progress
date: 2026-04-16
---

# Tour rewrite: 15 steps + event-triggered advances

## Goal
Rewrite the product tour (Phase 41) from 6 linear steps to 15 narrated steps
covering the full Discover → Enrich → Dossier journey, with 3 event-triggered
auto-advances (search submit, list add, enrichment complete), a 10s enrichment
timeout with "continue anyway" escape, and a shortened Assistant-role tour.

## 15 steps (locked)

| Step | Page | Anchor (data-tour-id) | Copy | Advance |
|---|---|---|---|---|
| A1 | dashboard | `dashboard-hero` | "Welcome to PGL. This is your hub — checklist, daily prospects, exports, team pulse all live here." | Next |
| A2 | dashboard | `onboarding-checklist` | "Finish your 4-step setup anytime: team, logo, theme, first search." | Next |
| A3 | dashboard | `discover-card` (sidebar Lead Discovery) | "Everything starts with finding leads. Let's go." | Next → /search |
| B1 | /search | hero title element (reuse existing or anchor the hero) | "Two ways to search: natural language, or structured saved searches. Both work." | Next |
| B2 | /search | `advanced-filters-toggle` (existing, repurposed to represent structured filters cluster) | "Quick filter pills for tweaks. Advanced Filters for full control. Saved Searches below for reusable recipes." | Next |
| B3 | /search | `new-search-cta` (+ New Search button, bumped to gold-solid) | "Build a saved search from scratch — pick industry, title, location. Saved for next time." | Next |
| B4 | /search | `nl-search-bar` (existing) | "Your turn — type a search or click + New Search. I'll follow." | Event: `search_submitted` OR `persona_created` → navigate to results |
| C1 | results | `results-header` | "Ranked results. All start as Preview Only — names redacted, search is free, enrichment costs credits." | Next |
| C2 | results | `bulk-actions` (existing `bulk-actions-bar` renamed) | "Pick prospects, then add to a list (existing or new)." | Event: `list_added` → navigate to dossier |
| D1 | dossier | `enrichment-status` | "Pulling contacts, wealth signals, SEC filings, news. ~5–15s." | Event: `enrichment_complete`. 10s timeout → "Continue anyway" |
| E1 | dossier | `dossier-contacts` | "Name, title, company — plus verified email, phone, LinkedIn." | Next |
| E2 | dossier | `ai-summary` | "One-paragraph AI digest. Your opening line." | Next |
| E3 | dossier | `wealth-signals` | "Wealth from SEC + property + news. Company ticker, market cap, recent events." | Next |
| E4 | dossier | `research-panel` | "Ask research questions in English. Tag, note, assign owner — syncs with team." | Next |
| E5 | list view | `export-csv` (existing on list-grid.tsx) | "Export any list as CSV for your CRM. You're set — happy prospecting." | Done |

## `hiddenForAssistant: true` on: C1, C2, D1, E1, E2, E3, E4, E5
Assistants see A1–B4 then a closing step: *"This is what your teammates will see. Enrichment and list work are handled by your admin."*

## Events taxonomy
- `search_submitted` — fired by NL search bar's submit handler after successful parse-query or Apollo search initiation
- `persona_created` — fired by persona-create-dialog.tsx (or wherever) after `createPersonaAction` resolves ok
- `list_added` — fired by add-to-list-dialog.tsx after `addToListAction` resolves ok; payload `{ prospectId }`
- `enrichment_complete` — fired by `prospects-enriched-handler.ts` when a prospect transitions to enriched; payload `{ prospectId }`

## Commits (5, atomic, pushed after each)
1. `feat(tour): rewrite tour-steps.ts to 15-step flow`
2. `feat(tour): add data-tour-id anchors + bump + New Search button to gold-solid`
3. `feat(tour): event bus + 4 emitters + context listens per step`
4. `feat(tour): 10s enrichment timeout + continue-anyway escape`
5. `feat(tour): assistant-role short tour variant`

## Hard constraints
- No DB migrations. No new deps.
- No RTL tests. Event bus tested as pure pub-sub via Vitest.
- React 18. No useOptimistic.
- `pnpm tsc --noEmit` clean after every commit.
- Spotlight overlay is a follow-up task, NOT included here.
