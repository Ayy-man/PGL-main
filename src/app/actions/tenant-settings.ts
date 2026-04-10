"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";
import { tenantSlugSchema } from "@/lib/validations/schemas";
import { isValidTheme } from "@/lib/tenant-theme";
import { revalidatePath } from "next/cache";

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

  // Fetch current tenant data for before/after logging
  const { data: oldTenant, error: fetchError } = await admin
    .from("tenants")
    .select("name, slug, theme")
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

  revalidatePath(`/${slug}/settings/organization`);
  return { success: true, slug };
}
