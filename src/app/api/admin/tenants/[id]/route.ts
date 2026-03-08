import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only super admin can access tenant details
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    // Fetch tenant record
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch users for this tenant
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, email, full_name, role, is_active, created_at")
      .eq("tenant_id", id);

    if (usersError) {
      throw new Error(`Users query failed: ${usersError.message}`);
    }

    // Enrich users with last_sign_in_at from auth admin API
    const enrichedUsers = await Promise.all(
      (users ?? []).map(async (u) => {
        let lastSignInAt: string | null = null;
        try {
          const { data: authUser } = await admin.auth.admin.getUserById(u.id);
          lastSignInAt = authUser?.user?.last_sign_in_at ?? null;
        } catch {
          // Auth lookup failure is non-critical; leave as null
        }
        return {
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          last_sign_in_at: lastSignInAt,
        };
      })
    );

    return NextResponse.json({ tenant, users: enrichedUsers });
  } catch (error) {
    console.error("Failed to fetch tenant details:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only super admin can update tenant
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();
    const body = await request.json();

    // Only allow updating name for now
    const { name } = body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const { data: tenant, error } = await admin
      .from("tenants")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error || !tenant) {
      return NextResponse.json(
        { error: "Failed to update tenant" },
        { status: 500 }
      );
    }

    // Log tenant_renamed activity
    await logActivity({
      tenantId: id,
      userId: user.id,
      actionType: "tenant_renamed",
      metadata: { new_name: name.trim() },
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Failed to update tenant:", error);
    return NextResponse.json(
      { error: "Failed to update tenant" },
      { status: 500 }
    );
  }
}
