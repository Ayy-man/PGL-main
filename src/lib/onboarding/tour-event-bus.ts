import type { TourAdvanceEvent } from "./tour-steps";

/**
 * Module-scoped pub-sub for tour advance events. Exists outside React so
 * any component (server-action caller, realtime handler, UI event handler)
 * can emit without prop-drilling or context wrapping. Tour context
 * subscribes to the current step's advanceOn.event and calls next() on fire.
 *
 * Why a module singleton vs React context:
 * - Emitters are often inside one-shot callbacks (post-action `.then(...)`)
 *   where pulling in a context would require useContext at the call-site.
 * - Listeners should survive across provider remounts.
 * - Pure + trivially unit-testable.
 *
 * Side-effect-free module load: the Map is empty until first subscribe.
 */

type Listener<P = unknown> = (payload: P | undefined) => void;

const listeners = new Map<TourAdvanceEvent, Set<Listener>>();

/**
 * Subscribe to a tour event. Returns an unsubscribe function — MUST be
 * called on unmount to avoid leaked handlers.
 */
export function subscribeTourEvent<P = unknown>(
  event: TourAdvanceEvent,
  handler: Listener<P>
): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(handler as Listener);
  return () => {
    const s = listeners.get(event);
    if (!s) return;
    s.delete(handler as Listener);
    if (s.size === 0) listeners.delete(event);
  };
}

/**
 * Emit a tour event. All subscribers fire synchronously, in subscription
 * order. Never throws — handler exceptions are caught and logged so one
 * broken listener cannot block others or the emitter's happy path.
 */
export function emitTourEvent<P = unknown>(
  event: TourAdvanceEvent,
  payload?: P
): void {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;
  // Snapshot to allow listeners to unsubscribe inside their handler without
  // mutating the set during iteration.
  const snapshot = Array.from(set);
  for (const h of snapshot) {
    try {
      h(payload);
    } catch (err) {
      // Non-fatal: tour is UX polish, not a correctness-critical subsystem.
      // eslint-disable-next-line no-console
      console.error("[tour-event-bus] listener threw:", err);
    }
  }
}

/**
 * Test helper — clears ALL listeners. NOT exported for production use.
 * Used only in Vitest tests between cases to prevent cross-test leakage.
 */
export function __resetTourEventBusForTests(): void {
  listeners.clear();
}

/**
 * Test helper — inspect current listener count for a given event.
 */
export function __listenerCountForTests(event: TourAdvanceEvent): number {
  return listeners.get(event)?.size ?? 0;
}
