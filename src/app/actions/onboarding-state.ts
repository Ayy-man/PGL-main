"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeOnboardingState } from "@/lib/onboarding/merge-state";
import type {
  OnboardingState,
  OnboardingStatePartial,
} from "@/types/onboarding";

/**
 * Result shape returned by `updateOnboardingState`. Always a plain object —
 * NEVER throws. Callers discriminate on `ok`.
 */
export type UpdateOnboardingStateResult =
  | { ok: true; state: OnboardingState }
  | { ok: false; error: string };

/**
 * Phase 41 — Persist tour + admin-checklist progress into
 * `auth.users.app_metadata.onboarding_state`.
 *
 * Mirrors the write pattern established in `src/app/actions/onboarding.ts`
 * lines 111-119: service-role admin client + `updateUserById` with a
 * spread of the existing `user.app_metadata` to preserve sibling keys
 * (`tenant_id`, `role`, `onboarding_completed`, …).
 *
 * Purity guarantees:
 * - Unauthenticated callers get `{ ok: false, error: "Not authenticated" }` —
 *   the admin client is never instantiated in that branch.
 * - Admin-client errors are logged and returned as `{ ok: false, error }` —
 *   the function never throws.
 * - Merge logic lives in `@/lib/onboarding/merge-state` so it can be
 *   unit-tested without a Supabase session.
 */
export async function updateOnboardingState(
  partial: OnboardingStatePartial
): Promise<UpdateOnboardingStateResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  const current =
    (user.app_metadata?.onboarding_state as OnboardingState | undefined) ??
    undefined;
  const next = mergeOnboardingState(current, partial);

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        ...user.app_metadata,
        onboarding_state: next,
      },
    }
  );

  if (updateError) {
    console.error("[updateOnboardingState] Failed:", updateError);
    return { ok: false, error: "Failed to update onboarding state" };
  }

  return { ok: true, state: next };
}
