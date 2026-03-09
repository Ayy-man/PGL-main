import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface TenantRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  tenant_id: string;
}

interface TenantMetricsRow {
  tenant_id: string;
  searches_executed: number | null;
  profiles_enriched: number | null;
  csv_exports: number | null;
}

interface UserMetricsRow {
  user_id: string;
  searches_executed: number | null;
  profiles_enriched: number | null;
  csv_exports: number | null;
}

interface ActivityRow {
  tenant_id: string;
  created_at: string;
}

export async function GET() {
  try {
    // Guard: Only super admin can access tenant activity
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Fetch active tenants
    const { data: tenants, error: tenantsError } = await admin
      .from("tenants")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (tenantsError) {
      throw new Error(`Tenants query failed: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ tenants: [] });
    }

    const tenantIds = tenants.map((t: TenantRow) => t.id);

    // 2. Fetch users for active tenants
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, full_name, tenant_id")
      .in("tenant_id", tenantIds);

    if (usersError) {
      throw new Error(`Users query failed: ${usersError.message}`);
    }

    // 3. Fetch 7d usage metrics at TENANT level
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const { data: tenantMetrics, error: tenantMetricsError } = await admin
      .from("usage_metrics_daily")
      .select("tenant_id, searches_executed, profiles_enriched, csv_exports")
      .in("tenant_id", tenantIds)
      .gte("date", sevenDaysAgoStr);

    if (tenantMetricsError) {
      throw new Error(
        `Tenant metrics query failed: ${tenantMetricsError.message}`
      );
    }

    // 4. Fetch 7d usage metrics at USER level
    const userIds = (users ?? []).map((u: UserRow) => u.id);

    const { data: userMetrics, error: userMetricsError } =
      userIds.length > 0
        ? await admin
            .from("usage_metrics_daily")
            .select("user_id, searches_executed, profiles_enriched, csv_exports")
            .in("user_id", userIds)
            .gte("date", sevenDaysAgoStr)
        : { data: [], error: null };

    if (userMetricsError) {
      throw new Error(
        `User metrics query failed: ${userMetricsError.message}`
      );
    }

    // 5. Fetch last active per tenant (limit to 90 days to avoid full partition scan)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: lastActivity, error: lastActivityError } = await admin
      .from("activity_log")
      .select("tenant_id, created_at")
      .in("tenant_id", tenantIds)
      .gte("created_at", ninetyDaysAgo.toISOString());

    if (lastActivityError) {
      throw new Error(
        `Activity log query failed: ${lastActivityError.message}`
      );
    }

    // In-memory aggregation

    // Build tenant-level 7d metrics map
    const tenantMetricsMap = new Map<
      string,
      { searches7d: number; enrichments7d: number; exports7d: number }
    >();
    for (const row of tenantMetrics ?? []) {
      const m = row as TenantMetricsRow;
      const existing = tenantMetricsMap.get(m.tenant_id) ?? {
        searches7d: 0,
        enrichments7d: 0,
        exports7d: 0,
      };
      tenantMetricsMap.set(m.tenant_id, {
        searches7d: existing.searches7d + (m.searches_executed ?? 0),
        enrichments7d: existing.enrichments7d + (m.profiles_enriched ?? 0),
        exports7d: existing.exports7d + (m.csv_exports ?? 0),
      });
    }

    // Build user-level 7d metrics map
    const userMetricsMap = new Map<
      string,
      { searches7d: number; enrichments7d: number; exports7d: number }
    >();
    for (const row of userMetrics ?? []) {
      const m = row as UserMetricsRow;
      const existing = userMetricsMap.get(m.user_id) ?? {
        searches7d: 0,
        enrichments7d: 0,
        exports7d: 0,
      };
      userMetricsMap.set(m.user_id, {
        searches7d: existing.searches7d + (m.searches_executed ?? 0),
        enrichments7d: existing.enrichments7d + (m.profiles_enriched ?? 0),
        exports7d: existing.exports7d + (m.csv_exports ?? 0),
      });
    }

    // Build last active map per tenant
    const lastActiveMap = new Map<string, string>();
    for (const row of lastActivity ?? []) {
      const r = row as ActivityRow;
      const existing = lastActiveMap.get(r.tenant_id);
      if (!existing || r.created_at > existing) {
        lastActiveMap.set(r.tenant_id, r.created_at);
      }
    }

    // Build users per tenant map
    const tenantUsersMap = new Map<string, UserRow[]>();
    for (const user of users ?? []) {
      const u = user as UserRow;
      const arr = tenantUsersMap.get(u.tenant_id) ?? [];
      arr.push(u);
      tenantUsersMap.set(u.tenant_id, arr);
    }

    // Assemble final tenant list
    const result = tenants
      .map((tenant: TenantRow) => {
        const metrics = tenantMetricsMap.get(tenant.id) ?? {
          searches7d: 0,
          enrichments7d: 0,
          exports7d: 0,
        };
        const tenantUsers = tenantUsersMap.get(tenant.id) ?? [];

        const usersWithMetrics = tenantUsers.map((u) => {
          const um = userMetricsMap.get(u.id) ?? {
            searches7d: 0,
            enrichments7d: 0,
            exports7d: 0,
          };
          return {
            id: u.id,
            fullName: u.full_name ?? "Unknown",
            ...um,
          };
        });

        return {
          id: tenant.id,
          name: tenant.name,
          userCount: tenantUsers.length,
          ...metrics,
          lastActive: lastActiveMap.get(tenant.id) ?? null,
          users: usersWithMetrics,
        };
      })
      .sort((a, b) => b.searches7d - a.searches7d);

    return NextResponse.json({ tenants: result });
  } catch (error) {
    console.error("Tenant activity API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant activity" },
      { status: 500 }
    );
  }
}
