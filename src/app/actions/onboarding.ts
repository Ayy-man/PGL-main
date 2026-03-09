"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";
import { tenantSlugSchema } from "@/lib/validations/schemas";
import { isValidTheme } from "@/lib/tenant-theme";

const confirmOnboardingSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    slug: tenantSlugSchema,
    theme: z.string().optional().default("gold"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export async function confirmTenantOnboarding(formData: FormData) {
  // 1. Get authenticated user session
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // 2. Validate user has onboarding_completed: false
  if (user.app_metadata?.onboarding_completed === true) {
    return { error: "Onboarding already completed" };
  }

  // 3. Get tenant_id from app_metadata
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return { error: "No tenant assigned" };
  }

  // 4. Validate form data
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    theme: formData.get("theme") || "gold",
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  };

  const parsed = confirmOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const { name, slug, theme, password } = parsed.data;

  const admin = createAdminClient();

  try {
    // 5. Fetch current tenant data for before/after logging
    const { data: oldTenant, error: fetchError } = await admin
      .from("tenants")
      .select("name, slug, logo_url, theme")
      .eq("id", tenantId)
      .single();

    if (fetchError || !oldTenant) {
      return { error: "Tenant not found" };
    }

    // 6. Update tenant record (logo is uploaded directly via LogoUpload component)
    const newValues = {
      name,
      slug,
      theme: isValidTheme(theme || "gold") ? theme : "gold",
    };

    const { data: updatedTenant, error: updateError } = await admin
      .from("tenants")
      .update(newValues)
      .eq("id", tenantId)
      .select("slug")
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return { error: "A tenant with this slug already exists" };
      }
      console.error("Failed to update tenant:", updateError);
      return { error: "Failed to update tenant settings" };
    }

    // 7. Update user password
    const { error: passwordError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (passwordError) {
      console.error("Failed to update password:", passwordError);
      return { error: "Failed to set password" };
    }

    // 8. Set onboarding_completed: true
    const { error: metadataError } = await admin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          onboarding_completed: true,
        },
      }
    );

    if (metadataError) {
      console.error("Failed to update onboarding status:", metadataError);
      return { error: "Failed to complete onboarding" };
    }

    // 9. Log tenant_confirmed activity
    await logActivity({
      tenantId,
      userId: user.id,
      actionType: "tenant_confirmed",
      metadata: {
        tenant_id: tenantId,
        changes: {
          before: oldTenant,
          after: newValues,
        },
      },
    });

    // 10. Log user_invite_accepted activity
    await logActivity({
      tenantId,
      userId: user.id,
      actionType: "user_invite_accepted",
      metadata: {
        email: user.email,
      },
    });

    // 11. Return success with slug for redirect
    return { success: true, slug: updatedTenant.slug };
  } catch (error) {
    console.error("Onboarding confirmation error:", error);
    return { error: "An unexpected error occurred" };
  }
}

// --- User Onboarding (for invited non-admin users) ---

const userOnboardingSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

/**
 * Complete onboarding for an invited (non-admin) user.
 * Sets password and marks onboarding_completed = true.
 */
export async function completeUserOnboarding(formData: FormData) {
  // 1. Get authenticated user session
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // 2. Validate onboarding_completed is false
  if (user.app_metadata?.onboarding_completed === true) {
    return { error: "Onboarding already completed" };
  }

  // 3. Get tenant_id from app_metadata
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return { error: "No tenant assigned" };
  }

  // 4. Validate form data
  const raw = {
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  };

  const parsed = userOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const { password } = parsed.data;

  const admin = createAdminClient();

  try {
    // 5. Update password
    const { error: passwordError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (passwordError) {
      console.error("Failed to update password:", passwordError);
      return { error: "Failed to set password" };
    }

    // 6. Set onboarding_completed: true in app_metadata
    const { error: metadataError } = await admin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          onboarding_completed: true,
        },
      }
    );

    if (metadataError) {
      console.error("Failed to update onboarding status:", metadataError);
      return { error: "Failed to complete onboarding" };
    }

    // 7. Log user_invite_accepted activity
    await logActivity({
      tenantId,
      userId: user.id,
      actionType: "user_invite_accepted",
      metadata: {
        email: user.email,
      },
    });

    // 8. Get tenant slug for redirect
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("Failed to fetch tenant slug:", tenantError);
      return { error: "Onboarding completed but could not determine redirect" };
    }

    // 9. Return success with slug
    return { success: true, slug: tenant.slug };
  } catch (error) {
    console.error("User onboarding error:", error);
    return { error: "An unexpected error occurred" };
  }
}
