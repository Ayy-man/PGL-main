import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTION_TYPES, type ActivityLogEntry } from "@/lib/activity-logger";

/**
 * GET /api/activity
 *
 * Query the activity log with optional filters.
 * Supports filtering by action_type, date range, and user_id.
 * Returns paginated results.
 *
 * Access: tenant_admin and super_admin only
 * Tenant scoping: Automatic via RLS (uses user's session client)
 *
 * Query params:
 * - action_type: comma-separated action types (optional)
 * - start_date: ISO date string (optional)
 * - end_date: ISO date string (optional)
 * - user_id: filter by specific user (optional)
 * - page: page number (default: 1)
 * - limit: results per page (default: 50, max: 100)
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check user role - only tenant_admin and super_admin can access
    const userRole = user.app_metadata?.role as string | undefined;
    if (userRole !== "tenant_admin" && userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // 3. Extract and validate query parameters
    const { searchParams } = new URL(request.url);

    // Action type filter (comma-separated)
    const actionTypeParam = searchParams.get("action_type");
    let actionTypeFilter: string[] | null = null;

    if (actionTypeParam) {
      actionTypeFilter = actionTypeParam.split(",").map((t) => t.trim());

      // Validate all action types
      const invalidTypes = actionTypeFilter.filter(
        (type) => !ACTION_TYPES.includes(type as (typeof ACTION_TYPES)[number])
      );

      if (invalidTypes.length > 0) {
        return NextResponse.json(
          {
            error: "Invalid action_type",
            details: `Invalid types: ${invalidTypes.join(", ")}`,
            valid_types: ACTION_TYPES,
          },
          { status: 400 }
        );
      }
    }

    // Date range filters
    const startDateParam = searchParams.get("start_date");
    const endDateParam = searchParams.get("end_date");

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start_date format. Use ISO date string." },
          { status: 400 }
        );
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid end_date format. Use ISO date string." },
          { status: 400 }
        );
      }
    }

    // User filter
    const userIdFilter = searchParams.get("user_id");

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const offset = (page - 1) * limit;

    // 4. Build query (RLS automatically scopes to user's tenant)
    let query = supabase
      .from("activity_log")
      .select("*", { count: "exact" });

    // Apply filters
    if (actionTypeFilter && actionTypeFilter.length > 0) {
      query = query.in("action_type", actionTypeFilter);
    }

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    if (userIdFilter) {
      query = query.eq("user_id", userIdFilter);
    }

    // Order and paginate
    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + limit - 1);

    // 5. Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error("Activity log query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity log" },
        { status: 500 }
      );
    }

    // 6. Return results
    return NextResponse.json({
      data: data as ActivityLogEntry[],
      total: count ?? 0,
      page,
      limit,
      has_more: count ? offset + limit < count : false,
    });
  } catch (error) {
    console.error("Activity log API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
