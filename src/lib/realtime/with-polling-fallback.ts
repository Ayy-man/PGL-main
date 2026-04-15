"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Realtime subscription status emitted by Supabase `.subscribe(onStatus)`.
 *
 * Docs: https://supabase.com/docs/guides/realtime/postgres-changes#status
 */
export type RealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED";

/** Options accepted by both the pure controller and the hook wrapper. */
export interface FallbackControllerOptions {
  /**
   * Async refetch invoked on every poll tick when the channel is in a degraded
   * state. Should fetch the same data the realtime channel normally delivers.
   * The caller is responsible for merging results — the controller just calls
   * this function and catches any rejection so the interval stays alive.
   */
  poll: () => void | Promise<void>;
  /** Default 10_000 ms per Phase 40 Plan 04 spec. */
  pollIntervalMs?: number;
  /**
   * Optional clock override for tests. Defaults to the global `setInterval` /
   * `clearInterval`. When `vi.useFakeTimers()` is active the default picks up
   * the faked implementations automatically, so most callers can skip this.
   */
  now?: {
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
  };
}

/**
 * Pure controller that manages the "channel dead → poll, channel alive → stop
 * polling" state machine without any React or Supabase coupling.
 *
 * Flow:
 *   handleStatus('CHANNEL_ERROR' | 'TIMED_OUT') → startPolling()
 *   handleStatus('SUBSCRIBED')                   → stopPolling()
 *   dispose()                                    → stopPolling() (idempotent)
 *
 * Every branch is testable with `vi.useFakeTimers()` + a plain `poll` spy.
 * The React hook below composes this with `useEffect`/`useState`.
 */
export function createFallbackController(options: FallbackControllerOptions) {
  const pollIntervalMs = options.pollIntervalMs ?? 10_000;
  const setIntervalFn = options.now?.setInterval ?? setInterval;
  const clearIntervalFn = options.now?.clearInterval ?? clearInterval;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let polling = false;

  function startPolling() {
    if (intervalId !== null) return; // already polling — idempotent
    polling = true;
    intervalId = setIntervalFn(() => {
      try {
        const result = options.poll();
        // Swallow rejections so one failing fetch doesn't kill the interval.
        if (result && typeof (result as Promise<void>).then === "function") {
          (result as Promise<void>).catch(() => {});
        }
      } catch {
        // Synchronous throw from poll — ignore so the interval keeps firing.
      }
    }, pollIntervalMs);
  }

  function stopPolling() {
    if (intervalId === null) return; // not polling — idempotent
    clearIntervalFn(intervalId);
    intervalId = null;
    polling = false;
  }

  return {
    /**
     * Feed a status event into the controller. Only three statuses mutate
     * state: errors start polling, a fresh SUBSCRIBED stops it. CLOSED is
     * intentionally ignored — it fires during normal unmount and on tab
     * backgrounding; the caller's cleanup path handles teardown directly.
     */
    handleStatus(status: RealtimeStatus) {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        startPolling();
      } else if (status === "SUBSCRIBED") {
        stopPolling();
      }
    },
    /** Tear down any running interval. Safe to call multiple times. */
    dispose() {
      stopPolling();
    },
    /** Inspectable for tests; not part of runtime contract. */
    get isPolling() {
      return polling;
    },
  };
}

/**
 * Hook params: the caller builds the Supabase channel inside `subscribe` so
 * this hook stays decoupled from any particular filter or table. The returned
 * cleanup function MUST call `supabase.removeChannel(channel)` — the hook
 * invokes it on unmount alongside clearing any active polling interval.
 */
export interface UseRealtimeWithFallbackParams {
  /**
   * Stable identifier — used as the effect dependency so the channel tears
   * down and re-subscribes when the logical scope changes (e.g. tenantId).
   */
  channelName: string;
  /**
   * Build and subscribe the Supabase channel. Must call `onStatus` with every
   * status event from `.subscribe(onStatus)` and return a cleanup fn that
   * runs `supabase.removeChannel(channel)`.
   */
  subscribe: (onStatus: (status: RealtimeStatus) => void) => () => void;
  /** See `FallbackControllerOptions.poll`. */
  poll: () => void | Promise<void>;
  /** See `FallbackControllerOptions.pollIntervalMs`. */
  pollIntervalMs?: number;
}

/**
 * React wrapper around `createFallbackController`.
 *
 * Why a hook AND a controller? The controller is pure and covered by Vitest
 * in node env (no jsdom, no RTL — locked by Phase 40 CONTEXT.md). The hook
 * is the thin glue layer that connects it to React's effect lifecycle and
 * is intentionally small so that "did I clean up the channel?" is obvious
 * by eye during code review.
 */
export function useRealtimeWithFallback({
  channelName,
  subscribe,
  poll,
  pollIntervalMs = 10_000,
}: UseRealtimeWithFallbackParams) {
  const [isPolling, setIsPolling] = useState(false);

  // Keep `poll` fresh without tearing down the channel on every render — the
  // controller reads through this ref on every interval tick.
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    const controller = createFallbackController({
      poll: () => pollRef.current(),
      pollIntervalMs,
    });

    const cleanupSubscribe = subscribe((status) => {
      controller.handleStatus(status);
      // Mirror the controller's polling flag to React state so callers can
      // render an offline indicator if they want one.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsPolling(true);
      } else if (status === "SUBSCRIBED") {
        setIsPolling(false);
      }
    });

    return () => {
      controller.dispose();
      cleanupSubscribe();
    };
    // `subscribe` / `poll` changes flow via refs + the channelName dep — we
    // deliberately don't resubscribe on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, pollIntervalMs]);

  return { isPolling };
}
