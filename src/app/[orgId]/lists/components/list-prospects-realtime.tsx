"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  shouldApplyProspectUpdate,
  type ProspectsRow,
} from "@/lib/realtime/prospects-enriched-handler";
import { useRealtimeWithFallback } from "@/lib/realtime/with-polling-fallback";

interface Props {
  /** Current tenant id used in the Realtime filter. Stable per mount. */
  tenantId: string;
  /** Prospect IDs currently rendered on screen. Safe to change — the handler re-reads via ref. */
  visibleIds: string[];
  /**
   * Optional callback fired ONLY when a payload passes `shouldApplyProspectUpdate`.
   * When omitted, the component falls back to `router.refresh()` so the server
   * component re-fetches.
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
 * Degraded-path behaviour (Plan 40-04): when the WebSocket reports
 * `CHANNEL_ERROR` or `TIMED_OUT`, `useRealtimeWithFallback` kicks in a 10s
 * `router.refresh()` poll. When the channel recovers (`SUBSCRIBED` again),
 * polling stops automatically. This keeps Adrian's "goes green without
 * refresh" guarantee alive even on flaky wifi.
 *
 * Cleanup: `supabase.removeChannel(channel)` runs on unmount (the cleanup
 * returned from `subscribe` below). The polling interval clears via
 * `useRealtimeWithFallback`'s own teardown. Plan 40-04 audits both paths
 * via grep — do not remove either.
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

  useRealtimeWithFallback({
    channelName: `prospects-enriched-${tenantId}`,
    subscribe: (onStatus) => {
      if (!tenantId) return () => {};
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
        .subscribe(onStatus);

      return () => {
        supabase.removeChannel(channel);
      };
    },
    // Polling path when WS is degraded: trigger the same server re-fetch the
    // payload handler would have used. Consumers with a custom `onPayload`
    // still get a refresh when the channel dies — router.refresh() is cheap
    // and the SSR layer already has the enriched row fresh from Postgres.
    poll: () => {
      router.refresh();
    },
  });

  return null;
}
