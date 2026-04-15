/**
 * Pure reducer + orchestration helper for optimistic search-result dismiss.
 *
 * Extracted from search-content.tsx to keep the mutation logic unit-testable
 * without a DOM. See .planning/phases/40-instant-ux-pass-demo-critical-slice/
 * 40-CONTEXT.md "Test strategy (LOCKED)" — pure-helper fallback.
 *
 * The component owns React state; this module owns the state-transition logic
 * and the fetch+toast orchestration so both can be tested with mocked inputs.
 */

import type { ToastActionElement } from "@/components/ui/toast";
import type { toast as ToastFunction } from "@/hooks/use-toast";

export interface DismissProspect {
  apollo_person_id: string;
  // Keep the shape minimal so tests don't have to fabricate full
  // SavedSearchProspect rows. Callers pass their real row type; this module
  // only reads apollo_person_id.
}

export interface DismissState {
  prospects: DismissProspect[];
  dismissedCount: number;
}

/**
 * Remove the given apolloPersonIds from the visible prospects list and bump
 * the dismissed counter. Pure — safe to use inside a React setState updater.
 *
 * NOTE: dismissedCount increments by the number of ids passed in, not by the
 * number of actual removals. This matches existing component behavior
 * (counter reflects server-side state which trusts the request payload).
 */
export function applyDismiss(
  state: DismissState,
  apolloPersonIds: string[]
): DismissState {
  const dismissSet = new Set(apolloPersonIds);
  return {
    prospects: state.prospects.filter((p) => !dismissSet.has(p.apollo_person_id)),
    dismissedCount: state.dismissedCount + apolloPersonIds.length,
  };
}

/**
 * Decrement dismissedCount after an undo. Clamped at zero.
 */
export function applyUndoDismiss(state: DismissState): DismissState {
  return {
    prospects: state.prospects,
    dismissedCount: Math.max(0, state.dismissedCount - 1),
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

// Match useToast's `toast` function signature directly so callers can pass
// the hook's toast without wrapping. Return type is relaxed to `unknown` so
// tests can use vi.fn() without redeclaring the full return shape.
type ToastArgs = Parameters<typeof ToastFunction>[0];
type ToastFn = (args: ToastArgs) => unknown;

export interface RunOptimisticDismissParams {
  previous: DismissState;
  apolloPersonIds: string[];
  searchId: string;
  fetchImpl: typeof fetch;
  setState: (next: DismissState) => void;
  toast: ToastFn;
  /** Optional rendered Undo action — injected by the component so this
   *  module stays free of JSX/React component deps. Typed as ToastActionElement
   *  to match the shadcn toast action slot; tests pass a mock sentinel cast
   *  through `unknown as React.ReactNode` since they don't render. */
  undoAction?: ToastActionElement;
  /** Optional display name for a nicer toast title when dismissing a single id. */
  displayName?: string;
}

export interface RunOptimisticDismissResult {
  committed: boolean;
  error?: string;
}

/**
 * Fire-and-settle: applies optimistic state, fires a toast with optional
 * undo affordance, then POSTs to /api/search/{id}/dismiss. On failure
 * rolls back to `previous` and fires a destructive toast. Never throws.
 */
export async function runOptimisticDismiss(
  params: RunOptimisticDismissParams
): Promise<RunOptimisticDismissResult> {
  const {
    previous,
    apolloPersonIds,
    searchId,
    fetchImpl,
    setState,
    toast,
    undoAction,
    displayName,
  } = params;

  // 1. Optimistic update
  const next = applyDismiss(previous, apolloPersonIds);
  setState(next);

  // 2. Toast with Undo affordance
  const count = apolloPersonIds.length;
  const title =
    count === 1 && displayName
      ? `Dismissed ${displayName}`
      : `${count} prospect${count > 1 ? "s" : ""} dismissed`;
  toast({ title, action: undoAction });

  // 3. Server call
  try {
    const resp = await fetchImpl(`/api/search/${searchId}/dismiss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: count > 1 ? "bulk-dismiss" : "dismiss",
        apolloPersonIds,
      }),
    });

    if (!resp.ok) {
      const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
      const description = errBody.error || "Could not dismiss prospect(s).";
      setState(previous);
      toast({
        title: "Dismiss failed",
        description,
        variant: "destructive",
      });
      return { committed: false, error: description };
    }

    return { committed: true };
  } catch (err) {
    const description = err instanceof Error ? err.message : "Network error";
    setState(previous);
    toast({
      title: "Dismiss failed",
      description,
      variant: "destructive",
    });
    return { committed: false, error: description };
  }
}
