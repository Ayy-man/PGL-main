import {
  DEFAULT_ONBOARDING_STATE,
  type OnboardingState,
  type OnboardingStatePartial,
} from "@/types/onboarding";

/**
 * Pure reducer for onboarding state. Lives in its own module (not the
 * `"use server"` action file) because Next 14 Server Actions modules can
 * only export async functions.
 *
 * Contract:
 * - `current` may be `null` / `undefined` (new user with no prior state).
 *   In that case we clone `DEFAULT_ONBOARDING_STATE` and apply the partial.
 * - Top-level keys not in the known allow-list are filtered out. This
 *   prevents a buggy/malicious caller from leaking arbitrary keys (e.g.
 *   `tenant_id`, `role`) into `app_metadata.onboarding_state` by routing
 *   the same partial through `updateUserById`.
 * - `admin_checklist` is merged at depth 1: supplied inner keys overwrite,
 *   unsupplied inner keys are preserved from `current` (or DEFAULT).
 * - Inputs are never mutated. Safe to call with `Object.freeze`-d inputs.
 */
export function mergeOnboardingState(
  current: OnboardingState | null | undefined,
  partial: OnboardingStatePartial
): OnboardingState {
  const base: OnboardingState = current ?? DEFAULT_ONBOARDING_STATE;

  const allowedTop: ReadonlyArray<keyof OnboardingStatePartial> = [
    "tour_completed",
    "tour_skipped_at",
    "tour_completed_at",
    "admin_checklist",
  ];

  const filtered: OnboardingStatePartial = {};
  for (const key of allowedTop) {
    if (key in partial) {
      const value = (partial as Record<string, unknown>)[key];
      (filtered as Record<string, unknown>)[key] = value;
    }
  }

  return {
    ...base,
    ...filtered,
    admin_checklist: {
      ...base.admin_checklist,
      ...(filtered.admin_checklist ?? {}),
    },
  };
}
