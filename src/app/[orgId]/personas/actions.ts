"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createPersona,
  updatePersona,
  updatePersonaVisibility,
  deletePersona,
} from "@/lib/personas/queries";
import type { PersonaFilters, UpdatePersonaInput } from "@/lib/personas/types";
import { requireRole } from "@/lib/auth/rbac";
import { updateOnboardingState } from "@/app/actions/onboarding-state";
import type { Visibility } from "@/types/visibility";
import { isVisibility } from "@/types/visibility";

export async function createPersonaAction(formData: FormData) {
  const supabase = await createClient();

  // Get authenticated user and tenant ID from session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in user metadata");
  }

  // Server-side role guard — phase 42. Per 42-01-PLAN.md Pattern A.
  await requireRole("agent");

  // Parse form data
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  // NEW (Phase 44 D-09): read + validate visibility from formData.
  // Default to 'team_shared' when unset. Invalid values reject BEFORE
  // any DB call.
  const visibilityRaw = formData.get("visibility") as string | null;
  let visibility: Visibility = "team_shared";
  if (visibilityRaw != null && visibilityRaw !== "") {
    if (!isVisibility(visibilityRaw)) {
      throw new Error("Invalid visibility value");
    }
    visibility = visibilityRaw;
  }

  // Parse filter fields
  const organizationNamesStr = formData.get("organization_names") as string;
  const titlesStr = formData.get("titles") as string;
  const senioritiesStr = formData.get("seniorities") as string;
  const industriesStr = formData.get("industries") as string;
  const locationsStr = formData.get("locations") as string;
  const companySizeStr = formData.get("companySize") as string;
  const keywords = formData.get("keywords") as string;

  // Build filters object
  const filters: PersonaFilters = {};

  if (organizationNamesStr) {
    filters.organization_names = organizationNamesStr.split("|").map(n => n.trim()).filter(Boolean);
  }
  if (titlesStr) {
    filters.titles = titlesStr.split("|").map(t => t.trim()).filter(Boolean);
  }
  if (senioritiesStr) {
    filters.seniorities = senioritiesStr.split("|").map(s => s.trim()).filter(Boolean);
  }
  if (industriesStr) {
    filters.industries = industriesStr.split("|").map(i => i.trim()).filter(Boolean);
  }
  if (locationsStr) {
    filters.locations = locationsStr.split("|").map(l => l.trim()).filter(Boolean);
  }
  if (companySizeStr) {
    filters.companySize = companySizeStr.split("|").map(c => c.trim()).filter(Boolean);
  }
  if (keywords) {
    filters.keywords = keywords;
  }

  // Validate
  if (!name || name.trim().length === 0) {
    throw new Error("Name is required");
  }

  const hasAtLeastOneFilter = Object.keys(filters).some(key => {
    const value = filters[key as keyof PersonaFilters];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  if (!hasAtLeastOneFilter) {
    throw new Error("At least one filter is required");
  }

  // Create persona
  const persona = await createPersona(tenantId, user.id, {
    name: name.trim(),
    description: description?.trim() || undefined,
    filters,
    visibility
  });

  // Phase 41-04 — flip admin_checklist.create_first_persona to true. Observer
  // is idempotent (the Server Action merges into existing metadata) so we can
  // safely flip on every successful create. Errors are swallowed so the
  // primary action still returns the persona cleanly.
  try {
    await updateOnboardingState({
      admin_checklist: { create_first_persona: true },
    });
  } catch (err) {
    console.error("[onboarding] create_first_persona observer failed:", err);
  }

  // Revalidate personas page
  revalidatePath(`/[orgId]/personas`, "page");

  return persona;
}

export async function updatePersonaAction(id: string, formData: FormData) {
  const supabase = await createClient();

  // Get authenticated user and tenant ID from session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in user metadata");
  }

  // Server-side role guard — phase 42. Per 42-01-PLAN.md Pattern A.
  await requireRole("agent");

  // Parse form data
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  // NEW (Phase 44 D-09): read + validate visibility from formData.
  // Only applies if caller explicitly sent the field — omitting it means
  // "don't change visibility" (consistent with updatePersona's partial-update semantics).
  const visibilityRaw = formData.get("visibility") as string | null;
  let visibility: Visibility | undefined;
  if (visibilityRaw != null && visibilityRaw !== "") {
    if (!isVisibility(visibilityRaw)) {
      throw new Error("Invalid visibility value");
    }
    visibility = visibilityRaw;
  }

  // Parse filter fields
  const organizationNamesStr = formData.get("organization_names") as string;
  const titlesStr = formData.get("titles") as string;
  const senioritiesStr = formData.get("seniorities") as string;
  const industriesStr = formData.get("industries") as string;
  const locationsStr = formData.get("locations") as string;
  const companySizeStr = formData.get("companySize") as string;
  const keywords = formData.get("keywords") as string;

  // Build filters object
  const filters: PersonaFilters = {};

  if (organizationNamesStr) {
    filters.organization_names = organizationNamesStr.split("|").map(n => n.trim()).filter(Boolean);
  }
  if (titlesStr) {
    filters.titles = titlesStr.split("|").map(t => t.trim()).filter(Boolean);
  }
  if (senioritiesStr) {
    filters.seniorities = senioritiesStr.split("|").map(s => s.trim()).filter(Boolean);
  }
  if (industriesStr) {
    filters.industries = industriesStr.split("|").map(i => i.trim()).filter(Boolean);
  }
  if (locationsStr) {
    filters.locations = locationsStr.split("|").map(l => l.trim()).filter(Boolean);
  }
  if (companySizeStr) {
    filters.companySize = companySizeStr.split("|").map(c => c.trim()).filter(Boolean);
  }
  if (keywords) {
    filters.keywords = keywords;
  }

  // Update persona
  const updates: UpdatePersonaInput = {
    name: name?.trim(),
    description: description?.trim() || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined
  };
  if (visibility !== undefined) {
    updates.visibility = visibility;
  }
  const persona = await updatePersona(id, tenantId, updates);

  // Revalidate pages that display persona data
  revalidatePath(`/[orgId]/personas`, "page");
  revalidatePath(`/[orgId]/search`, "page");

  return persona;
}

export async function deletePersonaAction(id: string) {
  const supabase = await createClient();

  // Get authenticated user and tenant ID from session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    throw new Error("No tenant ID found in user metadata");
  }

  // Server-side role guard — phase 42. Per 42-01-PLAN.md Pattern A.
  await requireRole("agent");

  // Delete persona
  await deletePersona(id, tenantId);

  // Revalidate personas page
  revalidatePath(`/[orgId]/personas`, "page");
}

/**
 * Updates a persona's visibility. Phase 44 D-09.
 *
 * Trust boundary: RLS is the authorization gate. The UPDATE USING clause
 * on `personas` enforces `created_by = auth.uid() OR role IN (tenant_admin, super_admin)`
 * (D-05). NO parallel JS permission check — a compromised client that POSTs
 * this action bypassing the UI gate silently updates zero rows (safe).
 *
 * Input validation (isVisibility) runs here to reject garbage BEFORE the
 * query layer sees it — Postgres enum violation would otherwise surface
 * as an opaque 500.
 *
 * Mirrors lists/updateListVisibilityAction shape but with inline auth (this file
 * uses inline supabase.auth.getUser() instead of the shared getAuthenticatedUser
 * helper per PATTERNS.md #7).
 */
export async function updatePersonaVisibilityAction(
  personaId: string,
  visibility: Visibility
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      throw new Error("No tenant ID found in user metadata");
    }

    // Server-side role guard — phase 42. Per 42-01-PLAN.md Pattern A.
    await requireRole("agent");

    if (!isVisibility(visibility)) {
      throw new Error("Invalid visibility value");
    }

    await updatePersonaVisibility(personaId, tenantId, visibility);

    revalidatePath(`/[orgId]/personas`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to update persona visibility:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update persona visibility"
    };
  }
}
