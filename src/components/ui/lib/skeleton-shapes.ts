/**
 * Skeleton shape conventions + enrichingIds Set reducers.
 *
 * Pure-helper module so the logic is unit-testable without DOM.
 * Per Phase 40 CONTEXT "Test strategy (LOCKED)": no RTL, no render(), no jsdom.
 *
 * Shape conventions (Phase 14-polish, project memory):
 *   - row-shape skeletons use `rounded-lg`
 *   - card-shape skeletons use `rounded-[14px]`
 *
 * The `enrichingIds` reducers back the bulk-enrich skeleton state in
 * list-member-table.tsx. A row whose prospect_id is in the Set renders a
 * skeleton cell layout instead of its normal content, until either the
 * enrichment request resolves or the Realtime payload lands with a terminal
 * enrichment_status.
 */

export const ROW_SKELETON_SHAPE = "rounded-lg" as const;
export const CARD_SKELETON_SHAPE = "rounded-[14px]" as const;

/**
 * Return a new Set with the given ids added. Pure — never mutates `prev`.
 * Safe to use inside a React setState updater.
 */
export function addEnrichingIds(prev: Set<string>, ids: readonly string[]): Set<string> {
  const next = new Set(prev);
  for (const id of ids) next.add(id);
  return next;
}

/**
 * Return a new Set with the given ids removed. Pure — never mutates `prev`.
 * Safe to use inside a React setState updater.
 */
export function removeEnrichingIds(prev: Set<string>, ids: readonly string[]): Set<string> {
  const next = new Set(prev);
  for (const id of ids) next.delete(id);
  return next;
}

/**
 * Enrichment statuses that should clear the skeleton. "enriched" matches the
 * Plan 02/03 saved_search_prospects channel contract; "complete"/"failed"
 * match the existing per-prospect re-enrich channel in list-member-table.tsx
 * (already in production at src/app/[orgId]/lists/components/list-member-table.tsx:193).
 */
const TERMINAL_ENRICHMENT_STATUSES = new Set<string>(["enriched", "complete", "failed"]);

export interface EnrichedPayload {
  id: string;
  enrichment_status?: string;
}

/**
 * Belt-and-suspenders cleanup: when a Realtime UPDATE arrives on prospects
 * (or saved_search_prospects) with a terminal enrichment_status, clear that
 * id from the skeleton Set so the real content renders.
 *
 * Returns `prev` unchanged when the id is not tracked or the status is
 * non-terminal, avoiding unnecessary re-renders.
 */
export function reconcileEnrichedPayload(
  prev: Set<string>,
  payload: EnrichedPayload
): Set<string> {
  if (!payload.enrichment_status) return prev;
  if (!TERMINAL_ENRICHMENT_STATUSES.has(payload.enrichment_status)) return prev;
  if (!prev.has(payload.id)) return prev;
  return removeEnrichingIds(prev, [payload.id]);
}
