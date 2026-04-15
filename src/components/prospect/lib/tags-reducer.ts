/**
 * Pure helpers for optimistic prospect-tag mutations.
 *
 * computeTagDiff: given current tags + next tags, return added/removed lists.
 * applyTagDiff: orchestrates the per-tag POST/DELETE calls and fires
 * per-failure callbacks so the caller can revert UI state and show a toast.
 *
 * Testing strategy per .planning/phases/40-instant-ux-pass-demo-critical-slice/
 * 40-CONTEXT.md: pure-helper fallback (no RTL, vitest node env).
 */

export interface TagDiff {
  added: string[];
  removed: string[];
}

/**
 * Compute the set difference for tag transitions. Pure — safe to call during render.
 */
export function computeTagDiff(current: string[], next: string[]): TagDiff {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return {
    added: next.filter((t) => !currentSet.has(t)),
    removed: current.filter((t) => !nextSet.has(t)),
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface ApplyTagDiffParams {
  prospectId: string;
  added: string[];
  removed: string[];
  fetchImpl: typeof fetch;
  /** Called when a tag-add POST fails. Receives the tag and the resolved error message. */
  onAddFail: (tag: string, error: string) => void;
  /** Called when a tag-remove DELETE fails. Receives the tag and the resolved error message. */
  onRemoveFail: (tag: string, error: string) => void;
}

/**
 * Walks added then removed, firing per-tag POST/DELETE requests. Never throws.
 * Calls onAddFail / onRemoveFail for each individual failure so the caller
 * can revert only the tags that didn't stick and surface separate toasts.
 */
export async function applyTagDiff(params: ApplyTagDiffParams): Promise<void> {
  const { prospectId, added, removed, fetchImpl, onAddFail, onRemoveFail } = params;

  for (const tag of added) {
    try {
      const resp = await fetchImpl(`/api/prospects/${prospectId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!resp.ok) {
        const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
        onAddFail(tag, errBody.error || "Please try again");
      }
    } catch (err) {
      onAddFail(tag, err instanceof Error ? err.message : "Network error");
    }
  }

  for (const tag of removed) {
    try {
      const resp = await fetchImpl(`/api/prospects/${prospectId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!resp.ok) {
        const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
        onRemoveFail(tag, errBody.error || "Please try again");
      }
    } catch (err) {
      onRemoveFail(tag, err instanceof Error ? err.message : "Network error");
    }
  }
}
