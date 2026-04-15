"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createPersona,
  updatePersona,
  deletePersona,
} from "@/lib/personas/queries";
import type { PersonaFilters } from "@/lib/personas/types";
import { requireRole } from "@/lib/auth/rbac";
import { updateOnboardingState } from "@/app/actions/onboarding-state";

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
    filters
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
  const persona = await updatePersona(id, tenantId, {
    name: name?.trim(),
    description: description?.trim() || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined
  });

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
