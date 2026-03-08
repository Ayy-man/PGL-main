import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only super admin can access tenant health
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const now = new Date();

    // ---- Activity Frequency (30pts) ----
    // Count distinct days with activity in last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activityRows, error: activityError } = await admin
      .from("activity_log")
      .select("created_at")
      .eq("tenant_id", id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (activityError) {
      throw new Error(
        `Activity frequency query failed: ${activityError.message}`
      );
    }

    const distinctDays = new Set(
      (activityRows ?? []).map((row: { created_at: string }) =>
        row.created_at.split("T")[0]
      )
    );
    const activityScore = Math.round((distinctDays.size / 30) * 30);

    // ---- User Engagement (25pts) ----
    // Count users who logged in within last 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: totalUsers, error: usersError } = await admin
      .from("users")
      .select("id")
      .eq("tenant_id", id);

    if (usersError) {
      throw new Error(`Users query failed: ${usersError.message}`);
    }

    const totalUserCount = totalUsers?.length ?? 0;

    const { data: recentLogins, error: loginsError } = await admin
      .from("activity_log")
      .select("user_id")
      .eq("tenant_id", id)
      .eq("action_type", "login")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (loginsError) {
      throw new Error(`Login query failed: ${loginsError.message}`);
    }

    const activeUserIds = new Set(
      (recentLogins ?? []).map((row: { user_id: string }) => row.user_id)
    );
    const engagementScore =
      totalUserCount > 0
        ? Math.round((activeUserIds.size / totalUserCount) * 25)
        : 0;

    // ---- Feature Adoption (25pts) ----
    // Count distinct action_type values in last 30 days
    const { data: actionTypes, error: actionError } = await admin
      .from("activity_log")
      .select("action_type")
      .eq("tenant_id", id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (actionError) {
      throw new Error(`Action types query failed: ${actionError.message}`);
    }

    const distinctActionTypes = new Set(
      (actionTypes ?? []).map(
        (row: { action_type: string }) => row.action_type
      )
    );
    // Total possible action types = 11 (user-facing, excluding admin types)
    const adoptionScore = Math.round((distinctActionTypes.size / 11) * 25);

    // ---- Data Freshness (20pts) ----
    // Get most recent activity_log entry
    const { data: latestActivity, error: latestError } = await admin
      .from("activity_log")
      .select("created_at")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      throw new Error(`Latest activity query failed: ${latestError.message}`);
    }

    let freshnessScore = 0;
    if (latestActivity) {
      const lastActivityDate = new Date(latestActivity.created_at);
      const daysSinceActivity = Math.floor(
        (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity === 0) {
        freshnessScore = 20;
      } else if (daysSinceActivity <= 3) {
        freshnessScore = 15;
      } else if (daysSinceActivity <= 7) {
        freshnessScore = 10;
      } else if (daysSinceActivity <= 14) {
        freshnessScore = 5;
      } else {
        freshnessScore = 0;
      }
    }

    // ---- Total Score ----
    const score = Math.round(
      activityScore + engagementScore + adoptionScore + freshnessScore
    );

    let status: "healthy" | "warning" | "critical";
    if (score >= 60) {
      status = "healthy";
    } else if (score >= 30) {
      status = "warning";
    } else {
      status = "critical";
    }

    return NextResponse.json({
      score,
      breakdown: {
        activity: activityScore,
        engagement: engagementScore,
        adoption: adoptionScore,
        freshness: freshnessScore,
      },
      status,
    });
  } catch (error) {
    console.error("Failed to compute tenant health:", error);
    return NextResponse.json(
      { error: "Failed to compute tenant health" },
      { status: 500 }
    );
  }
}
