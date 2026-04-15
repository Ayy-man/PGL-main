import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Shape of a row emitted by the `public.prospects` Realtime channel.
 * Only the fields we patch on the client are typed strictly; everything
 * else is passed through via the index signature so consumers can accept
 * additional columns without a breaking change here.
 */
export type ProspectsRow = {
  id: string;
  tenant_id: string;
  enriched_at: string | null;
  enrichment_status: string | null;
  photo_url: string | null;
  title: string | null;
  full_name: string | null;
  [key: string]: unknown;
};

/**
 * Fields we copy from payload.new into the matching in-memory member row.
 * Kept narrow on purpose: anything that is NOT in this list is ignored,
 * even if Supabase emits it. This prevents runaway patches from schema drift.
 */
const PATCHABLE_FIELDS = [
  "enriched_at",
  "enrichment_status",
  "photo_url",
  "title",
  "full_name",
] as const;

/**
 * Gate: should this payload be applied to the UI at all?
 *
 * Realtime filter is `tenant_id=eq.<uuid>` (the `id=in.(...)` filter breaks
 * past ~3 UUIDs due to Supabase's ~100-char filter-string cap). We therefore
 * receive every prospect UPDATE for the tenant and reconcile client-side:
 * only apply if the updated id is currently rendered on screen.
 */
export function shouldApplyProspectUpdate(
  payload: RealtimePostgresChangesPayload<ProspectsRow>,
  visibleIds: Set<string>
): boolean {
  const row = payload?.new as ProspectsRow | undefined;
  if (!row || !row.id) return false;
  return visibleIds.has(row.id);
}

/**
 * Pure reducer: given a payload and the current member array, return the
 * next member array with the matched row's patchable fields updated.
 *
 * Returns the SAME REFERENCE when:
 *   - `shouldApplyProspectUpdate` returns false (not visible)
 *   - no member matches `payload.new.id` by `prospect_id`
 *   - none of the patchable fields actually changed
 *
 * This lets React's `setState(prev => reduce(prev))` short-circuit
 * and avoid unnecessary re-renders when an off-screen prospect churns.
 */
export function reduceProspectsEnrichedPayload<T extends { prospect_id: string }>(
  payload: RealtimePostgresChangesPayload<ProspectsRow>,
  currentMembers: T[],
  visibleIds: Set<string>
): T[] {
  if (!shouldApplyProspectUpdate(payload, visibleIds)) return currentMembers;
  const row = payload.new as ProspectsRow;
  const idx = currentMembers.findIndex((m) => m.prospect_id === row.id);
  if (idx === -1) return currentMembers;

  const current = currentMembers[idx] as unknown as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  let changed = false;
  for (const field of PATCHABLE_FIELDS) {
    const incoming = row[field];
    if (incoming !== undefined && incoming !== current[field]) {
      patch[field] = incoming;
      changed = true;
    }
  }
  if (!changed) return currentMembers;

  const next = currentMembers.slice();
  next[idx] = { ...(currentMembers[idx] as unknown as object), ...patch } as T;
  return next;
}
