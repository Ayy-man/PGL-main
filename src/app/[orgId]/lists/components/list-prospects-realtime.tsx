"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  shouldApplyProspectUpdate,
  type ProspectsRow,
} from "@/lib/realtime/prospects-enriched-handler";

interface Props {
  /** Current tenant id used in the Realtime filter. Stable per mount. */
  tenantId: string;
  /** Prospect IDs currently rendered on screen. Safe to change — the handler re-reads via ref. */
  visibleIds: string[];
  /**
   * Optional callback fired ONLY when a payload passes `shouldApplyProspectUpdate`.
   * When omitted, the component falls back to `router.refresh()` so the server
   * component re-fetches. Plan 40-02 / later wiring can pass a real setMembers
   * reducer once list-member-table.tsx owns lifted state.
   */
  onPayload?: (payload: RealtimePostgresChangesPayload<ProspectsRow>) => void;
}

/**
 * Headless Realtime subscriber for `public.prospects` UPDATE events.
 *
 * Filter is `tenant_id=eq.${tenantId}` — NOT `id=in.(...)`. Supabase caps
 * filter strings at ~100 chars so we receive every prospect update for the
 * tenant and reconcile client-side against `visibleIds`.
 *
 * Cleanup: `supabase.removeChannel(channel)` runs on unmount. Plan 40-08
 * audits this by grep — do not remove.
 */
export function ListProspectsRealtime({ tenantId, visibleIds, onPayload }: Props) {
  const router = useRouter();
  const visibleIdsRef = useRef<Set<string>>(new Set(visibleIds));
  const onPayloadRef = useRef(onPayload);

  // Keep the ref fresh without resubscribing the channel when the list membership
  // shrinks/grows. The tenant filter is stable so there's no need to tear down.
  useEffect(() => {
    visibleIdsRef.current = new Set(visibleIds);
  }, [visibleIds]);

  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`prospects-enriched-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prospects",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const typed = payload as unknown as RealtimePostgresChangesPayload<ProspectsRow>;
          if (!shouldApplyProspectUpdate(typed, visibleIdsRef.current)) return;
          const cb = onPayloadRef.current;
          if (cb) {
            cb(typed);
          } else {
            // No explicit consumer — fall back to a server re-fetch so the page
            // still reflects the new enriched fields without a manual refresh.
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // visibleIds / onPayload changes flow via refs above; resubscribing on every
    // list scroll would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, router]);

  return null;
}
