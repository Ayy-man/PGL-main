import type { OnboardingState, AdminChecklistState } from "@/types/onboarding";

/**
 * Canonical order for the 4 admin onboarding checklist items. The UI renders
 * items in this order; downstream analytics and telemetry can rely on the
 * tuple being stable.
 */
export const CHECKLIST_ITEM_KEYS = [
  "invite_team",
  "upload_logo",
  "pick_theme",
  "create_first_persona",
] as const;
export type ChecklistKey = (typeof CHECKLIST_ITEM_KEYS)[number];

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  complete: boolean;
  ctaHref: string;
}

interface DeriveInput {
  state: OnboardingState | null | undefined;
  tenant: { logo_url: string | null; theme: string | null };
  personaCount: number;
  orgId: string;
}

const DEFAULT_CHECKLIST: AdminChecklistState = {
  invite_team: false,
  upload_logo: false,
  pick_theme: false,
  create_first_persona: false,
};

/**
 * Pure derivation of the 4 checklist items for the admin dashboard.
 *
 * Self-healing rationale: we read `tenant.logo_url`, `tenant.theme`, and
 * `personaCount` in addition to the observer flags so that a tenant which
 * has already performed one of the gating actions (before this feature
 * shipped, or from a code path the observer missed) still sees the item as
 * complete. The observer flag is the primary signal; the observed data is
 * the fallback. No side effects, no env reads — safe to import anywhere.
 */
export function deriveChecklist(input: DeriveInput): ChecklistItem[] {
  const cl = input.state?.admin_checklist ?? DEFAULT_CHECKLIST;
  const { tenant, personaCount, orgId } = input;

  return [
    {
      key: "invite_team",
      label: "Invite your team",
      complete: cl.invite_team === true,
      ctaHref: `/${orgId}/team`,
    },
    {
      key: "upload_logo",
      label: "Upload your company logo",
      complete: cl.upload_logo === true || tenant.logo_url != null,
      ctaHref: `/${orgId}/settings/organization`,
    },
    {
      key: "pick_theme",
      label: "Pick a brand theme",
      complete:
        cl.pick_theme === true ||
        (tenant.theme != null && tenant.theme !== "gold"),
      ctaHref: `/${orgId}/settings/organization`,
    },
    {
      key: "create_first_persona",
      label: "Create your first saved search",
      complete: cl.create_first_persona === true || personaCount > 0,
      ctaHref: `/${orgId}/personas`,
    },
  ];
}

/**
 * True iff every item returned by `deriveChecklist` is complete. Used by the
 * dashboard to decide whether to render the `AdminOnboardingChecklist` card
 * at all (per CONTEXT: "reduce surface area" — hide entirely once done).
 */
export function isChecklistComplete(input: DeriveInput): boolean {
  return deriveChecklist(input).every((i) => i.complete);
}
