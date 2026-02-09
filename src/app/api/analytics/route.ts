import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Analytics API - GET handler
 *
 * Returns aggregated usage metrics from usage_metrics_daily table
 * with date range filtering and role-based access control.
 *
 * Query Parameters:
 * - range: '7d' | '30d' | '90d' (default: '30d')
 * - tenant_id: UUID (optional, super_admin only for cross-tenant queries)
 *
 * Returns:
 * - daily: Array of daily metrics
 * - totals: Aggregated totals across date range
 * - userBreakdown: Per-user metrics (tenant_admin only)
 *
 * Role-based access:
 * - agent/assistant: 403 Forbidden (no analytics access)
 * - tenant_admin: Own tenant metrics only
 * - super_admin: Cross-tenant metrics, optionally filtered by tenant_id
 *
 * Covers: ANLY-04, ANLY-05, ANLY-06
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Extract user role and tenant from app_metadata
    const role = user.app_metadata?.role as string | undefined;
    const userTenantId = user.app_metadata?.tenant_id as string | undefined;

    if (!role || !userTenantId) {
      return NextResponse.json(
        { error: "Invalid user metadata" },
        { status: 403 }
      );
    }

    // 2. Role-based access control
    if (role === "agent" || role === "assistant") {
      return NextResponse.json(
        { error: "Forbidden - Agents/assistants do not have analytics access" },
        { status: 403 }
      );
    }

    // 3. Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") || "30d") as "7d" | "30d" | "90d";
    const requestedTenantId = searchParams.get("tenant_id");

    // Validate range parameter
    if (!["7d", "30d", "90d"].includes(range)) {
      return NextResponse.json(
        { error: "Invalid range parameter. Must be 7d, 30d, or 90d" },
        { status: 400 }
      );
    }

    // 4. Calculate date range
    const now = new Date();
    const startDate = new Date(now);

    switch (range) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    const startDateString = startDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const endDateString = now.toISOString().split("T")[0];

    // 5. Determine which tenant(s) to query
    let targetTenantId: string | null = null;

    if (role === "tenant_admin") {
      // Tenant admins can only see their own tenant data
      targetTenantId = userTenantId;
    } else if (role === "super_admin") {
      // Super admins can optionally filter by tenant_id
      targetTenantId = requestedTenantId || null;
    }

    // 6. Build and execute query
    // Use admin client for super_admin (cross-tenant access)
    // Use session client for tenant_admin (RLS-scoped)
    const queryClient = role === "super_admin" ? createAdminClient() : supabase;

    let query = queryClient
      .from("usage_metrics_daily")
      .select("*")
      .gte("date", startDateString)
      .lte("date", endDateString)
      .order("date", { ascending: true });

    // Filter by tenant if specified
    if (targetTenantId) {
      query = query.eq("tenant_id", targetTenantId);
    }

    const { data: metrics, error: queryError } = await query;

    if (queryError) {
      console.error("Analytics query error:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch analytics data" },
        { status: 500 }
      );
    }

    if (!metrics || metrics.length === 0) {
      // No data for date range
      return NextResponse.json({
        data: {
          daily: [],
          totals: {
            totalLogins: 0,
            searchesExecuted: 0,
            profilesViewed: 0,
            profilesEnriched: 0,
            csvExports: 0,
            listsCreated: 0,
          },
          userBreakdown: [],
        },
        range,
        startDate: startDateString,
        endDate: endDateString,
      });
    }

    // 7. Aggregate metrics
    // Group by date for daily breakdown
    const dailyMap = new Map<
      string,
      {
        date: string;
        totalLogins: number;
        searchesExecuted: number;
        profilesViewed: number;
        profilesEnriched: number;
        csvExports: number;
        listsCreated: number;
      }
    >();

    // Track user-level aggregates for breakdown
    const userMap = new Map<
      string,
      {
        userId: string;
        totalLogins: number;
        searchesExecuted: number;
        profilesViewed: number;
        profilesEnriched: number;
        csvExports: number;
        listsCreated: number;
      }
    >();

    for (const metric of metrics) {
      // Daily aggregation
      const dateKey = metric.date;
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalLogins: 0,
          searchesExecuted: 0,
          profilesViewed: 0,
          profilesEnriched: 0,
          csvExports: 0,
          listsCreated: 0,
        });
      }

      const daily = dailyMap.get(dateKey)!;
      daily.totalLogins += metric.total_logins || 0;
      daily.searchesExecuted += metric.searches_executed || 0;
      daily.profilesViewed += metric.profiles_viewed || 0;
      daily.profilesEnriched += metric.profiles_enriched || 0;
      daily.csvExports += metric.csv_exports || 0;
      daily.listsCreated += metric.lists_created || 0;

      // User-level aggregation (for breakdown)
      if (!userMap.has(metric.user_id)) {
        userMap.set(metric.user_id, {
          userId: metric.user_id,
          totalLogins: 0,
          searchesExecuted: 0,
          profilesViewed: 0,
          profilesEnriched: 0,
          csvExports: 0,
          listsCreated: 0,
        });
      }

      const userStats = userMap.get(metric.user_id)!;
      userStats.totalLogins += metric.total_logins || 0;
      userStats.searchesExecuted += metric.searches_executed || 0;
      userStats.profilesViewed += metric.profiles_viewed || 0;
      userStats.profilesEnriched += metric.profiles_enriched || 0;
      userStats.csvExports += metric.csv_exports || 0;
      userStats.listsCreated += metric.lists_created || 0;
    }

    const daily = Array.from(dailyMap.values());

    // Calculate totals
    const totals = {
      totalLogins: 0,
      searchesExecuted: 0,
      profilesViewed: 0,
      profilesEnriched: 0,
      csvExports: 0,
      listsCreated: 0,
    };

    for (const d of daily) {
      totals.totalLogins += d.totalLogins;
      totals.searchesExecuted += d.searchesExecuted;
      totals.profilesViewed += d.profilesViewed;
      totals.profilesEnriched += d.profilesEnriched;
      totals.csvExports += d.csvExports;
      totals.listsCreated += d.listsCreated;
    }

    // 8. Build response
    // Include userBreakdown for tenant_admin (own team view)
    const userBreakdown = role === "tenant_admin"
      ? Array.from(userMap.values())
      : undefined;

    return NextResponse.json({
      data: {
        daily,
        totals,
        ...(userBreakdown && { userBreakdown }),
      },
      range,
      startDate: startDateString,
      endDate: endDateString,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
