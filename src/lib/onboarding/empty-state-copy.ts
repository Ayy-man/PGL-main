/**
 * Phase 41-04 — Wave 3 coordination stub.
 *
 * The full `emptyStateCopy` helper ships in Plan 41-05 with 4 surface keys
 * ("dashboard", "lists", "personas", "activity") and a safe fallback. Plan
 * 41-05 runs in the same wave as 41-04 and also modifies dashboard-adjacent
 * surfaces, so 41-04 Task 3 must consume the helper from a concrete module
 * path at build time. This file is the MINIMAL "dashboard"-key stub 41-04
 * creates; 41-05's executor extends it with the remaining 3 surface keys +
 * the fallback + the unit tests.
 *
 * Amendment: the must_haves truth "Dashboard EmptyState (no-personas slot)
 * uses emptyStateCopy('dashboard') from Plan 41-05's helper" was absorbed
 * into 41-04 on 2026-04-15 to resolve the Wave 3 `[orgId]/page.tsx`
 * collision between plans 04 and 05.
 */

export type EmptyStateSurface = "dashboard" | "lists" | "personas" | "activity";

export interface EmptyStateCopyEntry {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: (orgId: string) => string;
}

/**
 * Concrete entry for the "dashboard" surface. Agent-friendly copy per
 * CONTEXT — no "persona" jargon without definition.
 */
const DASHBOARD: EmptyStateCopyEntry = {
  title: "Welcome — create your first saved search",
  body: "Start with a saved search — describe who you want to reach in plain English, then enrich for contacts and wealth signals.",
  ctaLabel: "New saved search",
  ctaHref: (orgId) => `/${orgId}/personas`,
};

const FALLBACK: EmptyStateCopyEntry = {
  title: "Nothing to show yet",
  body: "Get started by creating your first item.",
  ctaLabel: "Get started",
  ctaHref: (orgId) => `/${orgId}`,
};

/**
 * Returns the canonical empty-state copy for a given surface. Stub scope
 * covers "dashboard" only; Plan 41-05 extends to the other 3 surfaces.
 * Never returns null, never throws — unknown surfaces fall through to a
 * safe FALLBACK.
 */
export function emptyStateCopy(
  surface: EmptyStateSurface | string
): EmptyStateCopyEntry {
  if (surface === "dashboard") return DASHBOARD;
  return FALLBACK;
}

/**
 * Exported for Plan 41-05's extension — the target executor will rewrite
 * this object to include all 4 surface keys and restore the proper helper
 * signature.
 */
export const EMPTY_STATE_COPY: Partial<
  Record<EmptyStateSurface, EmptyStateCopyEntry>
> = {
  dashboard: DASHBOARD,
};
