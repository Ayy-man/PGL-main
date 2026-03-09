import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ExportLogClient } from "./components/export-log-client";
import type { ActivityLogEntry } from "@/lib/activity-logger";

interface ExportsPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ExportsPage({ params }: ExportsPageProps) {
  const { orgId } = await params;

  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Check role — only admins may view the export log
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect(`/${orgId}`);
  }

  // 3. Fetch this month's csv_exported entries directly (no HTTP round-trip)
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const { data: exports, count } = await supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .eq("action_type", "csv_exported")
    .gte("created_at", firstOfMonth.toISOString())
    .order("created_at", { ascending: false })
    .range(0, 19);

  const safeExports = (exports ?? []) as ActivityLogEntry[];

  // 4. Resolve display names for user IDs found in results
  const userIds = Array.from(new Set(safeExports.map((e) => e.user_id)));
  let userMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", userIds);

    userMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; full_name: string | null }) => [
        u.id,
        u.full_name ?? u.id.slice(0, 8),
      ])
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: `/${orgId}` },
          { label: "Export Log" },
        ]}
      />

      {/* Page header */}
      <div>
        <h1
          className="font-serif font-semibold"
          style={{
            fontSize: "38px",
            letterSpacing: "-0.5px",
            color: "var(--text-primary-ds)",
          }}
        >
          Export Log
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary-ds)" }}
        >
          Monitor your team&apos;s data extraction history and access previous
          downloads.
        </p>
      </div>

      {/* Table + filters + pagination (ExportLogClient renders stat cards internally) */}
      <ExportLogClient
        orgId={orgId}
        initialExports={safeExports}
        initialTotal={count ?? 0}
        userMap={userMap}
      />
    </div>
  );
}
