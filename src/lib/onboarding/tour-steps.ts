export type TourStepId =
  | "discover"
  | "search"
  | "enrich"
  | "list"
  | "profile"
  | "export";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  targetSelector: string; // `[data-tour-id="..."]`
  placement: "top" | "right" | "bottom" | "left";
  // Optional href the CTA can deep-link to if the user is on the wrong page
  suggestedHref?: (orgId: string) => string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "discover",
    title: "Start here: Discover leads",
    body: "This is your hub. Hit New Search anytime to find high-net-worth prospects matching your criteria.",
    targetSelector: '[data-tour-id="discover-card"]',
    placement: "bottom",
    suggestedHref: (o) => `/${o}`,
  },
  {
    id: "search",
    title: "Describe who you want to find",
    body: "Type in plain English — 'tech founders in Miami worth $5M+'. Advanced Filters fine-tune the search.",
    targetSelector: '[data-tour-id="nl-search-bar"]',
    placement: "bottom",
    suggestedHref: (o) => `/${o}/search`,
  },
  {
    id: "enrich",
    title: "Enrich to unlock contacts",
    body: "Select prospects, then hit Enrich Selection. We fetch emails, phones, wealth signals, and company news.",
    targetSelector: '[data-tour-id="bulk-actions-bar"]',
    placement: "top",
  },
  {
    id: "list",
    title: "Organize into Lists",
    body: "Save enriched prospects to a list. Pipeline-style tracking with notes and status.",
    targetSelector: '[data-tour-id="list-member-table"]',
    placement: "top",
    suggestedHref: (o) => `/${o}/lists`,
  },
  {
    id: "profile",
    title: "Every detail in one view",
    body: "Click any prospect to see wealth signals, recent filings, company news, and an AI summary.",
    targetSelector: '[data-tour-id="profile-summary"]',
    placement: "left",
  },
  {
    id: "export",
    title: "Export and go",
    body: "Export any list as CSV for your CRM or outreach tool. You're ready — happy prospecting.",
    targetSelector: '[data-tour-id="export-csv"]',
    placement: "top",
  },
];
