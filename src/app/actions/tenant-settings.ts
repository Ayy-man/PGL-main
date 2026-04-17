"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";
import { tenantSlugSchema } from "@/lib/validations/schemas";
import { isValidTheme } from "@/lib/tenant-theme";
import { revalidatePath } from "next/cache";
import { updateOnboardingState } from "./onboarding-state";

const updateTenantSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: tenantSlugSchema,
  theme: z.string().optional().default("gold"),
});

export async function updateTenantSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "tenant_admin" && role !== "super_admin") {
    return { error: "Only tenant admins can update organization settings" };
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return { error: "No tenant assigned" };
  }

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    theme: formData.get("theme") || "gold",
  };

  const parsed = updateTenantSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, slug, theme } = parsed.data;
  const admin = createAdminClient();

  // Fetch current tenant data for before/after logging + onboarding observer
  // (logo_url read lets us flip admin_checklist.upload_logo idempotently when
  // a save happens after a prior logo upload).
  const { data: oldTenant, error: fetchError } = await admin
    .from("tenants")
    .select("name, slug, theme, logo_url")
    .eq("id", tenantId)
    .single();

  if (fetchError || !oldTenant) {
    return { error: "Tenant not found" };
  }

  const newValues = {
    name,
    slug,
    theme: isValidTheme(theme) ? theme : "gold",
  };

  const { error: updateError } = await admin
    .from("tenants")
    .update(newValues)
    .eq("id", tenantId);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "A tenant with this slug already exists" };
    }
    return { error: "Failed to update tenant settings" };
  }

  await logActivity({
    tenantId,
    userId: user.id,
    actionType: "tenant_settings_updated",
    metadata: {
      before: oldTenant,
      after: newValues,
    },
  });

  // Phase 41-04 — admin checklist observer. Flip pick_theme when the saved
  // theme is non-default; flip upload_logo whenever the tenant already has a
  // logo_url persisted (the observer is idempotent). The dedicated upload
  // endpoint (`/api/upload/logo`) also flips upload_logo directly on first
  // successful upload — this branch catches the "save settings after a prior
  // upload" path and self-heals stale flags.
  // Saving any settings = user visited the org settings page = both branding
  // steps are considered done, regardless of which theme or logo they chose.
  const checklistPartial: { pick_theme?: boolean; upload_logo?: boolean } = {
    pick_theme: true,
  };
  if (oldTenant.logo_url) {
    checklistPartial.upload_logo = true;
  }
  if (Object.keys(checklistPartial).length > 0) {
    try {
      await updateOnboardingState({ admin_checklist: checklistPartial });
    } catch (err) {
      console.error("[onboarding] tenant-settings observer failed:", err);
    }
  }

  revalidatePath(`/${slug}/settings/organization`);
  return { success: true, slug };
}
