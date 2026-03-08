import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteDialog } from "./invite-dialog";
import { UserStatusToggle } from "./user-status-toggle";

export const dynamic = "force-dynamic";

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  // Get current user and verify role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect(`/${orgId}/dashboard`);
  }

  // Fetch users for this tenant (RLS auto-scopes to tenant)
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, last_active_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[TeamPage] Failed to fetch users:", error);
  }

  const teamMembers = users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Team
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and send invitations
          </p>
        </div>
        <InviteDialog orgId={orgId} />
      </div>

      <div className="surface-admin-card rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="admin-thead">
              <tr>
                <th
                  className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Name
                </th>
                <th
                  className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Email
                </th>
                <th
                  className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Role
                </th>
                <th
                  className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Last Active
                </th>
                <th
                  className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--admin-text-secondary)" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                  >
                    No team members found. Invite your first team member to get
                    started.
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="admin-row-hover"
                    style={{
                      borderBottom: "1px solid var(--admin-row-border)",
                    }}
                  >
                    <td
                      className="px-6 py-4 text-sm font-medium"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {member.full_name || "—"}
                    </td>
                    <td
                      className="px-6 py-4 text-sm"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {member.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-[var(--gold-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--gold-primary)]">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          member.is_active
                            ? "bg-[var(--success-muted)] text-[var(--success)]"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-sm"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {relativeTime(member.last_active_at)}
                    </td>
                    <td className="px-6 py-4">
                      <UserStatusToggle
                        userId={member.id}
                        isActive={member.is_active}
                        orgId={orgId}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
