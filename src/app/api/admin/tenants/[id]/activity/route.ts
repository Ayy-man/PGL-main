import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_ACTION_TYPES = [
  "tenant_created",
  "tenant_renamed",
  "tenant_settings_updated",
  "tenant_confirmed",
  "user_invited",
  "user_invite_accepted",
] as const;

interface ActivityRow {
  id: string;
  action_type: string;
  user_id: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only super admin can access tenant activity
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "5", 10))
    );
    const offset = (page - 1) * limit;

    // Build query
    let query = admin
      .from("activity_log")
      .select("id, action_type, user_id, target_type, target_id, metadata, created_at", {
        count: "exact",
      })
      .eq("tenant_id", id);

    // Apply tab filter
    if (tab === "admin") {
      query = query.in(
        "action_type",
        ADMIN_ACTION_TYPES as unknown as string[]
      );
    } else if (tab === "user") {
      // NOT IN: filter out admin action types
      // Supabase JS client does not have a direct `not.in` on a column,
      // so we use .not('action_type', 'in', (...))
      query = query.not(
        "action_type",
        "in",
        `(${ADMIN_ACTION_TYPES.join(",")})`
      );
    }
    // tab === 'all' has no action_type filter

    // Optional filters for expanded modal view
    const actionType = searchParams.get("action_type");
    if (actionType) {
      query = query.eq("action_type", actionType);
    }
    const startDate = searchParams.get("start_date");
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    const endDate = searchParams.get("end_date");
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    // Order and paginate
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: activities, error, count } = await query;

    if (error) {
      throw new Error(`Activity query failed: ${error.message}`);
    }

    // Collect unique user IDs to fetch names/emails
    const userIds = Array.from(
      new Set(
        (activities ?? []).map((a: ActivityRow) => a.user_id).filter(Boolean)
      )
    );

    // Fetch user details for display
    const usersMap = new Map<string, { full_name: string | null; email: string }>();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await admin
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);

      if (usersError) {
        console.error("Failed to fetch users for activity:", usersError);
        // Non-critical: continue without user details
      } else {
        for (const u of (users ?? []) as UserRow[]) {
          usersMap.set(u.id, { full_name: u.full_name, email: u.email });
        }
      }
    }

    // Enrich activity entries with user info
    const data = (activities ?? []).map((a: ActivityRow) => {
      const userData = usersMap.get(a.user_id);
      return {
        id: a.id,
        action_type: a.action_type,
        user_id: a.user_id,
        user_name: userData?.full_name ?? null,
        user_email: userData?.email ?? null,
        target_type: a.target_type,
        target_id: a.target_id,
        metadata: a.metadata,
        created_at: a.created_at,
      };
    });

    const total = count ?? 0;

    return NextResponse.json({
      data,
      total,
      has_more: offset + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch tenant activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant activity" },
      { status: 500 }
    );
  }
}
