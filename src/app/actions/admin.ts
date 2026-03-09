"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { createTenantSchema, inviteUserSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { isValidTheme } from "@/lib/tenant-theme";

/**
 * Create a new tenant with optional admin invite. Super admin only.
 *
 * If `admin_email` is provided in the form data, the function will:
 * 1. Create the tenant
 * 2. Invite the admin user via Supabase Auth
 * 3. Set app_metadata (role, tenant_id, onboarding_completed)
 * 4. Create the public.users row
 *
 * If tenant creation succeeds but invite fails, returns success with a warning.
 */
export async function createTenant(formData: FormData) {
  const currentUser = await requireSuperAdmin();

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    logo_url: formData.get("logo_url") || null,
    theme: formData.get("theme") || "gold",
    admin_email: formData.get("admin_email") || undefined,
  };

  const validated = createTenantSchema.parse(raw);

  // Extract admin_email before inserting tenant (it's not a DB column)
  const adminEmail = validated.admin_email || undefined;
  const { admin_email: _removed, theme: rawTheme, ...tenantFields } = validated;
  const tenantData = {
    ...tenantFields,
    theme: isValidTheme(rawTheme || "gold") ? rawTheme : "gold",
  };

  const supabase = createAdminClient();

  // 1. Create the tenant
  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert(tenantData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A tenant with this slug already exists");
    }
    throw new Error(`Failed to create tenant: ${error.message}`);
  }

  // 2. Log tenant_created activity
  await logActivity({
    tenantId: tenant.id,
    userId: currentUser.id,
    actionType: "tenant_created",
    metadata: {
      tenant_name: tenant.name,
      ...(adminEmail ? { admin_email: adminEmail } : {}),
    },
  });

  // 3. If admin_email provided, invite the admin user
  let warning: string | undefined;

  if (adminEmail) {
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/callback`;

      // a. Invite user via Supabase Auth
      const { data: inviteData, error: inviteError } =
        await supabase.auth.admin.inviteUserByEmail(adminEmail, {
          data: { full_name: "" },
          redirectTo,
        });

      if (inviteError) {
        if (
          inviteError.message.includes("already been registered") ||
          inviteError.message.includes("already exists")
        ) {
          warning = `Tenant created, but invite failed: a user with email ${adminEmail} already exists.`;
        } else {
          warning = `Tenant created, but invite failed: ${inviteError.message}`;
        }
      } else if (inviteData?.user) {
        const invitedUserId = inviteData.user.id;

        // b. Update app_metadata via updateUserById
        const { error: metaError } =
          await supabase.auth.admin.updateUserById(invitedUserId, {
            app_metadata: {
              role: "tenant_admin",
              tenant_id: tenant.id,
              onboarding_completed: false,
            },
          });

        if (metaError) {
          warning = `Tenant created and invite sent, but failed to set admin metadata: ${metaError.message}`;
        }

        // c. Create public.users row
        const { error: profileError } = await supabase.from("users").insert({
          id: invitedUserId,
          email: adminEmail,
          full_name: "",
          role: "tenant_admin",
          tenant_id: tenant.id,
          is_active: true,
        });

        if (profileError) {
          warning = `Tenant created and invite sent, but failed to create user profile: ${profileError.message}`;
        }

        // d. Log user_invited activity
        await logActivity({
          tenantId: tenant.id,
          userId: currentUser.id,
          actionType: "user_invited",
          metadata: {
            email: adminEmail,
            role: "tenant_admin",
            invited_by: currentUser.id,
          },
        });
      }
    } catch (inviteErr) {
      warning = `Tenant created, but admin invite failed: ${inviteErr instanceof Error ? inviteErr.message : "Unknown error"}`;
    }
  }

  revalidatePath("/admin/tenants");
  return { ...tenant, warning };
}

/**
 * Invite/create a user for a tenant. Super admin only.
 * Uses Supabase Admin API to create user in auth.users
 * and then creates the public.users row.
 */
export async function inviteUser(formData: FormData) {
  await requireSuperAdmin();

  const validated = inviteUserSchema.parse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    tenant_id: formData.get("tenant_id"),
  });

  const supabase = createAdminClient();

  // 1. Create user in Supabase Auth with temporary password
  const tempPassword = `Temp${Date.now()}!`; // User will need to reset
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: validated.email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm email
    app_metadata: {
      role: validated.role,
      tenant_id: validated.tenant_id,
    },
    user_metadata: {
      full_name: validated.full_name,
    },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      throw new Error("A user with this email already exists");
    }
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  // 2. Create public.users row
  const { error: profileError } = await supabase
    .from("users")
    .insert({
      id: authData.user.id,
      email: validated.email,
      full_name: validated.full_name,
      role: validated.role,
      tenant_id: validated.tenant_id,
      is_active: true,
    });

  if (profileError) {
    // Rollback: delete auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create user profile: ${profileError.message}`);
  }

  revalidatePath("/admin/users");
  return { id: authData.user.id, email: validated.email, tempPassword };
}

/**
 * Toggle tenant active status. Super admin only.
 */
export async function toggleTenantStatus(tenantId: string) {
  await requireSuperAdmin();

  const supabase = createAdminClient();

  // Get current status
  const { data: tenant, error: fetchError } = await supabase
    .from("tenants")
    .select("is_active")
    .eq("id", tenantId)
    .single();

  if (fetchError || !tenant) {
    throw new Error("Tenant not found");
  }

  // Toggle
  const { error: updateError } = await supabase
    .from("tenants")
    .update({ is_active: !tenant.is_active })
    .eq("id", tenantId);

  if (updateError) {
    throw new Error(`Failed to update tenant: ${updateError.message}`);
  }

  revalidatePath("/admin/tenants");
}

/**
 * Toggle user active status. Super admin only.
 */
export async function toggleUserStatus(userId: string) {
  await requireSuperAdmin();

  const supabase = createAdminClient();

  // Get current status
  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    throw new Error("User not found");
  }

  // Toggle
  const { error: updateError } = await supabase
    .from("users")
    .update({ is_active: !user.is_active })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to update user: ${updateError.message}`);
  }

  revalidatePath("/admin/users");
}
