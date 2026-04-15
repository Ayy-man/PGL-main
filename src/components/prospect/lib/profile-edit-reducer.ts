/**
 * Pure orchestration helper for inline profile-field optimistic save.
 *
 * Extracted from inline-edit-field.tsx so the optimistic-save +
 * rollback-with-toast behavior is unit-testable per
 * .planning/phases/40-instant-ux-pass-demo-critical-slice/40-CONTEXT.md
 * test strategy (pure-helper fallback, no RTL).
 *
 * The component applies the optimistic display value inline before calling
 * this helper; the helper only handles the persist-and-rollback side.
 */

import type { toast as ToastFunction } from "@/hooks/use-toast";

// Match useToast's `toast` function signature directly so callers can pass
// the hook's toast without wrapping. Return type relaxed to `unknown` so
// tests can use vi.fn() without redeclaring the full return shape.
type ToastArgs = Parameters<typeof ToastFunction>[0];

export interface RunFieldSaveParams {
  newValue: string | null;
  previousValue: string | null;
  onSave: (newValue: string | null) => Promise<void>;
  onRevert: (previousValue: string | null) => void;
  toast: (args: ToastArgs) => unknown;
  /** Optional field label for a nicer toast title (e.g. "Email", "Title"). */
  label?: string;
}

export interface RunFieldSaveResult {
  committed: boolean;
  error?: string;
}

/**
 * Calls onSave with the new value. On rejection, fires onRevert with the
 * previousValue and shows a destructive toast. Never throws.
 */
export async function runFieldSave(
  params: RunFieldSaveParams
): Promise<RunFieldSaveResult> {
  const { newValue, previousValue, onSave, onRevert, toast, label } = params;

  try {
    await onSave(newValue);
    return { committed: true };
  } catch (err) {
    const description =
      err instanceof Error && err.message
        ? err.message
        : "Could not save your change. Please try again.";
    onRevert(previousValue);
    toast({
      title: label ? `Failed to save ${label}` : "Failed to save",
      description,
      variant: "destructive",
    });
    return { committed: false, error: description };
  }
}
