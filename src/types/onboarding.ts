/**
 * Phase 41 — Onboarding state shapes.
 *
 * Persisted in `auth.users.app_metadata.onboarding_state`. See
 * `.planning/phases/41-tutorial-onboarding-flows/41-CONTEXT.md` for the
 * rationale (no DB migration, server-trusted + client-readable via JWT,
 * mirrors the existing `onboarding_completed` flag).
 */

export interface AdminChecklistState {
  invite_team: boolean;
  upload_logo: boolean;
  pick_theme: boolean;
  create_first_persona: boolean;
}

export interface OnboardingState {
  tour_completed: boolean;
  /** ISO timestamp, set when the user explicitly dismisses the tour. */
  tour_skipped_at?: string;
  /** ISO timestamp, set when the user completes the final tour step. */
  tour_completed_at?: string;
  admin_checklist: AdminChecklistState;
}

/**
 * Canonical "nothing happened yet" state. New users and users who have never
 * interacted with the tour or checklist start here.
 */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  tour_completed: false,
  admin_checklist: {
    invite_team: false,
    upload_logo: false,
    pick_theme: false,
    create_first_persona: false,
  },
};

/**
 * Shape accepted by `updateOnboardingState` / `mergeOnboardingState`. Deep
 * partial at depth 1 — top-level keys are optional, and when
 * `admin_checklist` is supplied, its inner keys are independently optional.
 */
export type OnboardingStatePartial = {
  tour_completed?: boolean;
  tour_skipped_at?: string;
  tour_completed_at?: string;
  admin_checklist?: Partial<AdminChecklistState>;
};
