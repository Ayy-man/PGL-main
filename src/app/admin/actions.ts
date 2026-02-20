"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/rbac";

// Guard: Ensure super admin access
async function guardSuperAdmin() {
  await requireSuperAdmin();
}

// Create Tenant Action
export async function createTenantAction(formData: FormData) {
  try {
    await guardSuperAdmin();

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const logoUrl = formData.get("logo_url") as string | null;
    const primaryColor = formData.get("primary_color") as string;
    const secondaryColor = formData.get("secondary_color") as string;

    if (!name || name.trim().length === 0) {
      throw new Error("Tenant name is required");
    }

    if (!slug || slug.trim().length === 0) {
      throw new Error("Tenant slug is required");
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tenants")
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        logo_url: logoUrl?.trim() || null,
        primary_color: primaryColor || "#d4af37",
        secondary_color: secondaryColor || "#f4d47f",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/tenants");
    return { success: true, tenant: data };
  } catch (error) {
    console.error("Failed to create tenant:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create tenant",
    };
  }
}

// Toggle Tenant Status Action
export async function toggleTenantStatusAction(tenantId: string, isActive: boolean) {
  try {
    await guardSuperAdmin();

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("tenants")
      .update({ is_active: isActive })
      .eq("id", tenantId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/tenants");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle tenant status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle tenant status",
    };
  }
}

// Create User Action
export async function createUserAction(formData: FormData) {
  try {
    await guardSuperAdmin();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    const role = formData.get("role") as string;
    const tenantId = formData.get("tenant_id") as string | null;

    if (!email || email.trim().length === 0) {
      throw new Error("Email is required");
    }

    if (!fullName || fullName.trim().length === 0) {
      throw new Error("Full name is required");
    }

    if (!role) {
      throw new Error("Role is required");
    }

    // super_admin doesn't need tenant_id
    if (role !== "super_admin" && (!tenantId || tenantId === "null")) {
      throw new Error("Tenant is required for non-super-admin users");
    }

    const supabase = createAdminClient();

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      app_metadata: {
        role: role,
        tenant_id: role === "super_admin" ? null : tenantId,
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
      id: authUser.user.id,
      tenant_id: role === "super_admin" ? null : tenantId,
      email: email.trim(),
      full_name: fullName.trim(),
      role: role as "super_admin" | "admin" | "agent",
      is_active: true,
    });

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(profileError.message);
    }

    revalidatePath("/admin/users");
    return { success: true, user: authUser.user };
  } catch (error) {
    console.error("Failed to create user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

// Toggle User Status Action
export async function toggleUserStatusAction(userId: string, isActive: boolean) {
  try {
    await guardSuperAdmin();

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle user status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle user status",
    };
  }
}
