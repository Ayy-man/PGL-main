---
quick_id: 260416-tcr
slug: tour-rewrite-to-15-steps-with-event-trig
status: complete
date: 2026-04-16
commits:
  - e505541 feat(tour): rewrite tour-steps.ts to 15-step full journey
  - 937160c feat(tour): add data-tour-id anchors + bump + New Search to gold-solid
  - 00d2502 feat(tour): event bus + 4 emitters + context listens per step
  - 0508ca3 feat(tour): 10s enrichment timeout + continue-anyway escape
  - 7bbd482 feat(tour): assistant-role short tour variant
---

# Tour rewrite to 15 steps

## Shipped

Five atomic commits, all pushed to main:

1. **Tour flow (15 steps)** — dashboard (3) → search (4) → results (2) → dossier-enriching (1) → dossier-enriched (4) → export (1). 3 event-triggered advance points (`search-try`, `results-bulk-actions`, `dossier-enriching`). 8 `hiddenForAssistant` steps.

2. **Anchors + button prominence** — 11 `data-tour-id` anchors wired to new targets across dashboard, search, results, and dossier pages. + New Search button bumped from dashed-ghost to gold-solid with hover lift (tenant-theme aware via `var(--gold-primary)`).

3. **Event bus + emitters** — `src/lib/onboarding/tour-event-bus.ts` (pure pub-sub, 15 Vitest tests). Emitters: `search_submitted` (nl-search-bar), `persona_created` (persona-form-dialog), `list_added` (search/add-to-list-dialog, with prospectId payload), `enrichment_complete` (list-prospects-realtime via Phase 40 Realtime). Context subscribes per step.

4. **10s enrichment timeout** — `dossier-enriching` step hides Next while waiting. After 10s, swap body to "Enrichment didn't complete — we'll retry in the background. Continue anyway?" and surface a "Continue anyway" Next button.

5. **Assistant short tour** — filters out the 8 write-gated steps for role='assistant'. They see steps A1 through B4 only. All step transitions (next/previous/restart/initial-find) operate on the filtered list.

## Metrics

- **5 commits** across 11 files
- **80/80** onboarding tests pass (15 new event-bus cases)
- **0 tsc errors** in touched files
- **0 DB migrations**, **0 new deps** (event bus is pure code)
- Tour step count: 6 → **15** (assistants: 7)

## Known deferred

- Spotlight overlay (darken-everything-except-target) — parked as follow-up
- Optional dedicated "this is your teammates' view" closing step for assistants — trivial add if user wants it
- Manual UAT post-deploy against live tenant

## Verification status

Pending human UAT on live deploy — all automated gates green.
