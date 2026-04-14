import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { InviteDialog } from "./invite-dialog";
import { UserStatusToggle } from "./user-status-toggle";
import { TeamMemberActions } from "./team-member-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

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

const roleLabel = (role: string) =>
  ({ tenant_admin: "Admin", agent: "Agent", assistant: "Assistant", super_admin: "Super Admin" } as Record<string, string>)[role] ?? role;

const roleBadgeClasses = (role: string) =>
  ({
    tenant_admin: "bg-[var(--gold-bg)] text-[var(--gold-primary)] border-[var(--border-gold)]",
    agent: "bg-[var(--info-muted,#1e3a5f)] text-[var(--info,#60a5fa)] border-[var(--info,#60a5fa)]/30",
    assistant: "bg-muted text-muted-foreground border-border",
    super_admin: "bg-[var(--gold-primary)] text-[var(--bg-base,#0a0a0a)] border-[var(--gold-primary)] font-bold",
  } as Record<string, string>)[role] ?? "";

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
    .select("id, email, full_name, role, is_active, updated_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[TeamPage] Failed to fetch users:", error);
  }

  const teamMembers = (users || []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    role: string;
    is_active: boolean;
    updated_at: string | null;
    created_at: string | null;
    lastSignInAt?: string | null;
  }>;

  // Detect pending invites via auth.users last_sign_in_at — parallelized
  const admin = createAdminClient();
  const pendingUserIds = new Set<string>();

  const authResults = await Promise.all(
    teamMembers.map((m) => admin.auth.admin.getUserById(m.id))
  );
  authResults.forEach((res, i) => {
    const member = teamMembers[i];
    if (res.data?.user && !res.data.user.last_sign_in_at) {
      pendingUserIds.add(member.id);
    }
    // Capture last_sign_in_at for accurate "Last Active"
    member.lastSignInAt = res.data?.user?.last_sign_in_at ?? null;
  });

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

      {teamMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite your first agent or assistant to collaborate on saved searches and enrichment."
        >
          <InviteDialog orgId={orgId} />
        </EmptyState>
      ) : (
        <div className="surface-admin-card rounded-[14px] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="admin-thead sticky top-0 z-10 bg-[var(--bg-elevated)] backdrop-blur">
                <tr>
                  <th
                    className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Name
                  </th>
                  <th
                    className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Email
                  </th>
                  <th
                    className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Role
                  </th>
                  <th
                    className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Last Active
                  </th>
                  <th
                    className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="admin-row-hover"
                    style={{
                      borderBottom: "1px solid var(--admin-row-border)",
                    }}
                  >
                    <td
                      className="px-3 py-3 md:px-6 md:py-4 text-sm font-medium"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {member.full_name || "—"}
                    </td>
                    <td
                      className="px-3 py-3 md:px-6 md:py-4 text-sm"
                      style={{ color: "var(--text-primary-ds)" }}
                    >
                      {member.email}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          roleBadgeClasses(member.role)
                        )}
                      >
                        {roleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      {pendingUserIds.has(member.id) ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                          Pending
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            member.is_active
                              ? "bg-[var(--success-muted)] text-[var(--success)]"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-3 py-3 md:px-6 md:py-4 text-sm"
                      style={{ color: "var(--text-primary-ds)" }}
                      title={member.lastSignInAt ?? member.updated_at ?? undefined}
                    >
                      {relativeTime(member.lastSignInAt ?? member.updated_at)}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-2">
                        <UserStatusToggle
                          userId={member.id}
                          isActive={member.is_active}
                          orgId={orgId}
                        />
                        <TeamMemberActions
                          userId={member.id}
                          orgId={orgId}
                          currentUserId={user.id}
                          memberRole={member.role}
                          memberEmail={member.email ?? undefined}
                          isPending={pendingUserIds.has(member.id)}
                          isActive={member.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {teamMembers.map((member) => (
              <div key={member.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                      {member.full_name || "—"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                      {member.email}
                    </p>
                  </div>
                  <UserStatusToggle
                    userId={member.id}
                    isActive={member.is_active}
                    orgId={orgId}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase",
                      roleBadgeClasses(member.role)
                    )}
                  >
                    {roleLabel(member.role)}
                  </span>
                  {pendingUserIds.has(member.id) ? (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                      Pending
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        member.is_active
                          ? "bg-[var(--success-muted)] text-[var(--success)]"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  )}
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {relativeTime(member.lastSignInAt ?? member.updated_at)}
                  </span>
                </div>
                <TeamMemberActions
                  userId={member.id}
                  orgId={orgId}
                  currentUserId={user.id}
                  memberRole={member.role}
                  memberEmail={member.email ?? undefined}
                  isPending={pendingUserIds.has(member.id)}
                  isActive={member.is_active}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
