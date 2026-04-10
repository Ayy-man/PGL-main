"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/site-url";

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  full_name: z.string().max(100).optional().default(""),
  role: z.enum(["agent", "assistant"], {
    error: "Role must be agent or assistant",
  }),
});

export async function inviteTeamMember(formData: FormData) {
  // 1. Get session user and verify role
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return { error: "Insufficient permissions" };
  }

  // 2. Get tenant_id from app_metadata
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return { error: "No tenant assigned" };
  }

  // 3. Validate input
  const raw = {
    email: formData.get("email"),
    full_name: formData.get("full_name") || "",
    role: formData.get("role"),
  };

  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const validated = parsed.data;

  const admin = createAdminClient();

  try {
    // 4. Invite user via Supabase Auth
    const redirectTo = `${getSiteUrl()}/api/auth/callback`;

    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(validated.email, {
        data: { full_name: validated.full_name },
        redirectTo,
      });

    if (inviteError) {
      if (
        inviteError.message.includes("already been registered") ||
        inviteError.message.includes("already exists")
      ) {
        return {
          error: `A user with email ${validated.email} already exists`,
        };
      }
      return { error: `Failed to send invitation: ${inviteError.message}` };
    }

    if (!inviteData?.user) {
      return { error: "Failed to create invitation" };
    }

    const invitedUserId = inviteData.user.id;

    // 5. Set app_metadata (role, tenant_id, onboarding_completed)
    const { error: metaError } = await admin.auth.admin.updateUserById(
      invitedUserId,
      {
        app_metadata: {
          role: validated.role,
          tenant_id: tenantId,
          onboarding_completed: false,
        },
      }
    );

    if (metaError) {
      console.error("Failed to set invited user metadata:", metaError);
      return {
        error: "Invitation sent but failed to configure user role",
      };
    }

    // 6. Create public.users row
    const { error: profileError } = await admin.from("users").insert({
      id: invitedUserId,
      email: validated.email,
      full_name: validated.full_name,
      role: validated.role,
      tenant_id: tenantId,
      is_active: true,
    });

    if (profileError) {
      console.error("Failed to create user profile:", profileError);
      return {
        error: "Invitation sent but failed to create user profile",
      };
    }

    // 7. Log user_invited activity
    await logActivity({
      tenantId,
      userId: user.id,
      actionType: "user_invited",
      targetType: "user",
      targetId: invitedUserId,
      metadata: {
        email: validated.email,
        role: validated.role,
        invited_by: user.id,
      },
    });

    // 8. Get orgId for revalidation path
    const orgId = formData.get("org_id") as string;
    if (orgId) {
      revalidatePath(`/${orgId}/team`);
    }

    // 9. Return success
    return { success: true, email: validated.email };
  } catch (error) {
    console.error("Invite team member error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Toggle a team member's active status. Tenant admin or super admin only.
 * Scoped to the current tenant — cannot toggle users outside the tenant.
 */
export async function toggleTeamMemberStatus(userId: string, orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return { error: "Insufficient permissions" };
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return { error: "No tenant assigned" };
  }

  const admin = createAdminClient();

  // Verify target user belongs to same tenant
  const { data: targetUser, error: fetchError } = await admin
    .from("users")
    .select("is_active, tenant_id")
    .eq("id", userId)
    .single();

  if (fetchError || !targetUser) {
    return { error: "User not found" };
  }

  if (targetUser.tenant_id !== tenantId) {
    return { error: "Cannot modify users outside your organization" };
  }

  // Toggle status
  const { error: updateError } = await admin
    .from("users")
    .update({ is_active: !targetUser.is_active })
    .eq("id", userId);

  if (updateError) {
    return { error: `Failed to update user: ${updateError.message}` };
  }

  revalidatePath(`/${orgId}/team`);
  return { success: true };
}

/**
 * Resend an invite to a pending team member.
 */
export async function resendInvite(userId: string, orgId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return { error: "Insufficient permissions" };
  }

  const admin = createAdminClient();

  // Get target user email
  const { data: targetUser } = await admin
    .from("users")
    .select("email, tenant_id")
    .eq("id", userId)
    .single();

  if (!targetUser) return { error: "User not found" };
  if (targetUser.tenant_id !== user.app_metadata?.tenant_id) {
    return { error: "Cannot modify users outside your organization" };
  }

  const redirectTo = `${getSiteUrl()}/api/auth/callback`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    targetUser.email,
    { redirectTo }
  );

  if (inviteError) {
    return { error: `Failed to resend: ${inviteError.message}` };
  }

  revalidatePath(`/${orgId}/team`);
  return { success: true };
}

/**
 * Revoke a pending invite — deletes both public.users and auth.users records.
 */
export async function revokeInvite(userId: string, orgId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return { error: "Insufficient permissions" };
  }

  const admin = createAdminClient();

  // Verify target belongs to same tenant
  const { data: targetUser } = await admin
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (!targetUser) return { error: "User not found" };
  if (targetUser.tenant_id !== user.app_metadata?.tenant_id) {
    return { error: "Cannot modify users outside your organization" };
  }

  // Delete public.users row first
  await admin.from("users").delete().eq("id", userId);
  // Delete auth.users record
  await admin.auth.admin.deleteUser(userId);

  revalidatePath(`/${orgId}/team`);
  return { success: true };
}

/**
 * Change a team member's role (agent <-> assistant). Tenant admin only.
 */
export async function changeUserRole(
  userId: string,
  newRole: "agent" | "assistant",
  orgId: string
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return { error: "Insufficient permissions" };
  }

  if (userId === user.id) {
    return { error: "Cannot change your own role" };
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) return { error: "No tenant assigned" };

  const admin = createAdminClient();

  // Verify target belongs to same tenant and isn't a tenant_admin
  const { data: targetUser } = await admin
    .from("users")
    .select("role, tenant_id")
    .eq("id", userId)
    .single();

  if (!targetUser) return { error: "User not found" };
  if (targetUser.tenant_id !== tenantId) {
    return { error: "Cannot modify users outside your organization" };
  }
  if (targetUser.role === "tenant_admin") {
    return { error: "Cannot change a tenant admin's role" };
  }

  // Update public.users
  const { error: updateError } = await admin
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (updateError) {
    return { error: `Failed to update role: ${updateError.message}` };
  }

  // Update auth.users app_metadata
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (authUser?.user) {
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...authUser.user.app_metadata, role: newRole },
    });
  }

  revalidatePath(`/${orgId}/team`);
  return { success: true };
}

/**
 * Fully remove a team member (delete from both public.users and auth.users).
 */
export async function removeTeamMember(userId: string, orgId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return { error: "Insufficient permissions" };
  }

  if (userId === user.id) {
    return { error: "Cannot remove yourself" };
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) return { error: "No tenant assigned" };

  const admin = createAdminClient();

  // Verify target belongs to same tenant
  const { data: targetUser } = await admin
    .from("users")
    .select("role, tenant_id, email, full_name")
    .eq("id", userId)
    .single();

  if (!targetUser) return { error: "User not found" };
  if (targetUser.tenant_id !== tenantId) {
    return { error: "Cannot modify users outside your organization" };
  }

  // Cannot remove the last tenant_admin
  if (targetUser.role === "tenant_admin") {
    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role", "tenant_admin")
      .eq("is_active", true);

    if (count !== null && count <= 1) {
      return { error: "Cannot remove the last tenant admin" };
    }
  }

  // Log before deletion
  await logActivity({
    tenantId,
    userId: user.id,
    actionType: "user_invited", // reuse closest action type
    targetType: "user",
    targetId: userId,
    metadata: {
      action: "removed",
      removed_email: targetUser.email,
      removed_name: targetUser.full_name,
    },
  });

  // Delete public.users row
  await admin.from("users").delete().eq("id", userId);
  // Delete auth.users record
  await admin.auth.admin.deleteUser(userId);

  revalidatePath(`/${orgId}/team`);
  return { success: true };
}
