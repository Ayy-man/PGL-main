export type TourStepId =
  | "dashboard-welcome"
  | "dashboard-checklist"
  | "nav-discover"
  | "search-hero"
  | "search-filters"
  | "search-new-cta"
  | "search-try"
  | "results-header"
  | "results-bulk-actions"
  | "dossier-enriching"
  | "dossier-contacts"
  | "dossier-ai-summary"
  | "dossier-wealth"
  | "dossier-research"
  | "export-done";

export type TourAdvanceEvent =
  | "search_submitted"
  | "persona_created"
  | "results_ready"
  | "list_added"
  | "enrichment_complete";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  targetSelector: string; // `[data-tour-id="..."]`
  placement: "top" | "right" | "bottom" | "left";
  /** Optional href the CTA can deep-link to if the user is on the wrong page */
  suggestedHref?: (orgId: string) => string;
  /** If set, tour advances automatically when this event fires (from tour-event-bus) */
  advanceOn?: { event: TourAdvanceEvent };
  /** If true, hide for role='assistant' (they can't perform the action) */
  hiddenForAssistant?: boolean;
}

export const TOUR_STEPS: readonly TourStep[] = [
  // ─── PART A — DASHBOARD ───────────────────────────────────────────
  {
    id: "dashboard-welcome",
    title: "Welcome to PGL",
    body: "This is your hub: checklist, daily prospects, exports, and team pulse all live here.",
    targetSelector: '[data-tour-id="dashboard-hero"]',
    placement: "bottom",
    suggestedHref: (o) => `/${o}`,
  },
  {
    id: "dashboard-checklist",
    title: "Your setup checklist",
    body: "Finish these 4 steps anytime: invite your team, upload a logo, pick a theme, create your first search.",
    targetSelector: '[data-tour-id="onboarding-checklist"]',
    placement: "bottom",
    suggestedHref: (o) => `/${o}`,
  },
  {
    id: "nav-discover",
    title: "Find your leads here",
    body: "Everything starts with Lead Discovery. Let's go.",
    targetSelector: '[data-tour-id="discover-card"]',
    placement: "right",
    suggestedHref: (o) => `/${o}/search`,
  },

  // ─── PART B — LEAD DISCOVERY ──────────────────────────────────────
  {
    id: "search-hero",
    title: "Two ways to search",
    body: "Describe who you want in plain English, or build a structured saved search. Both work. Pick your style.",
    targetSelector: '[data-tour-id="nl-search-bar"]',
    placement: "bottom",
    suggestedHref: (o) => `/${o}/search`,
  },
  {
    id: "search-filters",
    title: "Filters for fine-tuning",
    body: "Quick filter pills for tweaks. Advanced Filters for full control. Saved Searches below for reusable recipes.",
    targetSelector: '[data-tour-id="advanced-filters-toggle"]',
    placement: "top",
    suggestedHref: (o) => `/${o}/search`,
  },
  {
    id: "search-new-cta",
    title: "+ New Search",
    body: "Build a saved search from scratch: industry, title, location, seniority, company size. It's saved for next time.",
    targetSelector: '[data-tour-id="new-search-cta"]',
    placement: "left",
    suggestedHref: (o) => `/${o}/search`,
  },
  {
    id: "search-try",
    title: "Your turn",
    body: "Type a search in the NL bar, or click + New Search. I'll pick up from there.",
    targetSelector: '[data-tour-id="nl-search-bar"]',
    placement: "bottom",
    suggestedHref: (o) => `/${o}/search`,
    // Advance only when leads actually render — not on submit (results take
    // 1-2s to load, so advancing on submit puts step 8 over a loading state).
    advanceOn: { event: "results_ready" },
  },

  // ─── PART C — SEARCH RESULTS ──────────────────────────────────────
  {
    id: "results-header",
    title: "Your results",
    body: "Ranked by relevance. All start as Preview Only: names redacted, no contacts. Search is free; only enrichment costs credits.",
    targetSelector: '[data-tour-id="results-header"]',
    // top-placed so it appears above the header (in the filter pills / search
    // area) instead of overlapping the results table below.
    placement: "top",
    hiddenForAssistant: true,
  },
  {
    id: "results-bulk-actions",
    title: "Open a prospect",
    body: "Click on any prospect row to view their full dossier. You can also select multiple with checkboxes to enrich or export in bulk.",
    targetSelector: '[data-tour-id="bulk-actions"]',
    placement: "top",
    hiddenForAssistant: true,
  },

  // ─── PART D — DOSSIER ─────────────────────────────────────────────
  {
    id: "dossier-enriching",
    title: "The dossier",
    body: "Everything we know about this prospect: contacts, wealth signals, SEC filings, and recent news. Enrichment pulls it all automatically.",
    targetSelector: '[data-tour-id="enrichment-status"]',
    placement: "bottom",
    hiddenForAssistant: true,
  },

  // ─── PART E — DOSSIER ENRICHED ────────────────────────────────────
  {
    id: "dossier-contacts",
    title: "Direct contact info",
    body: "Name, title, company, plus verified email, phone, and LinkedIn. Copy, dial, compose.",
    targetSelector: '[data-tour-id="dossier-contacts"]',
    placement: "right",
    hiddenForAssistant: true,
  },
  {
    id: "dossier-ai-summary",
    title: "AI-written summary",
    body: "One-paragraph digest of everything we know about this prospect.",
    targetSelector: '[data-tour-id="ai-summary"]',
    placement: "left",
    hiddenForAssistant: true,
  },
  {
    id: "dossier-wealth",
    title: "Wealth signals + company",
    body: "Wealth from SEC, property, and news. Plus the company they work at: ticker, market cap, recent events.",
    targetSelector: '[data-tour-id="wealth-signals"]',
    placement: "left",
    hiddenForAssistant: true,
  },
  {
    id: "dossier-research",
    title: "Ask and organize",
    body: "Ask research questions in plain English. Tag, note, assign owner. Everything syncs with your team.",
    targetSelector: '[data-tour-id="research-panel"]',
    placement: "left",
    hiddenForAssistant: true,
  },

  // ─── CLOSE — EXPORT ───────────────────────────────────────────────
  {
    id: "export-done",
    title: "You're ready",
    body: "Export any list as CSV for your CRM or outreach tool. We'll keep enriching in the background. Happy prospecting.",
    targetSelector: '[data-tour-id="export-csv"]',
    placement: "top",
    suggestedHref: (o) => `/${o}/lists`,
    hiddenForAssistant: true,
  },
];
