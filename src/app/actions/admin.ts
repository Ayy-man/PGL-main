"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { createTenantSchema, inviteUserSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

/**
 * Create a new tenant. Super admin only.
 */
export async function createTenant(formData: FormData) {
  await requireSuperAdmin();

  const validated = createTenantSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    logo_url: formData.get("logo_url") || null,
    primary_color: formData.get("primary_color") || "#d4af37",
    secondary_color: formData.get("secondary_color") || "#f4d47f",
  });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tenants")
    .insert(validated)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A tenant with this slug already exists");
    }
    throw new Error(`Failed to create tenant: ${error.message}`);
  }

  revalidatePath("/admin/tenants");
  return data;
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
