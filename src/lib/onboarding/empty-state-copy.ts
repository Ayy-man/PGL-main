/**
 * Empty-state copy map for Phase 41 onboarding polish.
 *
 * Agent-friendly language: no product jargon like "persona" without explaining
 * it means "saved search". Every entry carries its own CTA so consumers render
 * a single Button-as-Link via the existing EmptyState `children` slot.
 *
 * Coordination note: this file was seeded by Plan 41-04 (dashboard-only stub)
 * to unblock Plan 04's dashboard EmptyState absorb in Wave 3, then extended by
 * Plan 41-05 to the full 4-surface map. Conflict resolved 2026-04-15 by taking
 * Plan 41-05's complete version.
 */

export type EmptyStateSurface = "dashboard" | "lists" | "personas" | "activity";

export interface EmptyStateCopyEntry {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: (orgId: string) => string;
}

export const EMPTY_STATE_COPY: Record<EmptyStateSurface, EmptyStateCopyEntry> = {
  dashboard: {
    title: "Find your first prospects",
    body: "Start with a saved search — describe who you want to reach in plain English, then enrich for contacts and wealth signals.",
    ctaLabel: "Create your first saved search",
    ctaHref: (orgId) => `/${orgId}/personas`,
  },
  lists: {
    title: "No lists yet",
    body: "Save enriched prospects into a list to track outreach, take notes, and export when you're ready.",
    ctaLabel: "Create your first list",
    ctaHref: (orgId) => `/${orgId}/lists`,
  },
  personas: {
    title: "Save a search to reuse it",
    body: "A saved search remembers your criteria so you can re-run it anytime. Think of it as a reusable search recipe.",
    ctaLabel: "Create your first saved search",
    ctaHref: (orgId) => `/${orgId}/personas`,
  },
  activity: {
    title: "No activity yet",
    body: "Complete your first search and enrichment to see activity tracked here — every search, every enrichment, every list change.",
    ctaLabel: "Start a search",
    ctaHref: (orgId) => `/${orgId}/search`,
  },
};

const FALLBACK: EmptyStateCopyEntry = {
  title: "Nothing to show yet",
  body: "Get started by creating your first item.",
  ctaLabel: "Get started",
  ctaHref: (orgId) => `/${orgId}`,
};

/**
 * Returns the copy entry for a known surface, or a safe fallback for anything else.
 * Never throws. Never returns null.
 */
export function emptyStateCopy(
  surface: EmptyStateSurface | string,
): EmptyStateCopyEntry {
  return (
    (EMPTY_STATE_COPY as Record<string, EmptyStateCopyEntry>)[surface] ?? FALLBACK
  );
}
