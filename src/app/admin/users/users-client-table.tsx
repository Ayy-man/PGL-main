"use client";

import { useState, useMemo, useTransition } from "react";
import { UserPlus, MoreHorizontal, Copy, Check } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { UserStatusToggle } from "./user-status-toggle";
import { useToast } from "@/hooks/use-toast";
import { toggleUserStatus } from "@/app/actions/admin";
import Link from "next/link";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string | null;
  tenants: { name: string } | null;
}

interface UsersClientTableProps {
  users: UserRow[];
}

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "super_admin":
      return <Badge variant="gold-solid">Super Admin</Badge>;
    case "tenant_admin":
      return <Badge variant="gold">Admin</Badge>;
    case "agent":
      return <Badge variant="default">Agent</Badge>;
    case "assistant":
      return <Badge variant="outline">Assistant</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: email });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-sm text-muted-foreground">{email}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40"
        aria-label="Copy email"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[var(--success)]" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Email copied to clipboard" : ""}
      </span>
    </div>
  );
}

function UserActionsDropdown({ user }: { user: UserRow }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const handleToggleStatus = () => {
    const newStatus = !user.is_active;
    startTransition(async () => {
      try {
        await toggleUserStatus(user.id);
        toast({
          title: "User updated",
          description: `${user.full_name ?? user.email} is now ${newStatus ? "active" : "inactive"}.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to update user",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 rounded-[6px] transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40"
          aria-label="User actions"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            toast({ title: "Resend invite", description: `Invite resent to ${user.email}.` });
          }}
        >
          Resend invite
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleToggleStatus}>
          {user.is_active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DropdownMenuItem disabled>
                Edit role
              </DropdownMenuItem>
            </div>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersClientTable({ users }: UsersClientTableProps) {
  const [tenantFilter, setTenantFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Derive unique tenant names for filter
  const tenantNames = useMemo(() => {
    const names = new Set<string>();
    users.forEach((u) => {
      const t = u.tenants as { name: string } | null;
      if (t?.name) names.add(t.name);
    });
    return Array.from(names).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const tenant = user.tenants as { name: string } | null;
      const matchesTenant = tenantFilter === "all" || tenant?.name === tenantFilter;
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (user.full_name ?? "").toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      return matchesTenant && matchesRole && matchesSearch;
    });
  }, [users, tenantFilter, roleFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All tenants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tenants</SelectItem>
            {tenantNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="tenant_admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="assistant">Assistant</SelectItem>
          </SelectContent>
        </Select>

        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 rounded-[8px] border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gold-primary)]/40 w-56"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary-ds)",
          }}
        />
      </div>

      <div className="surface-admin-card overflow-hidden rounded-[14px]">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ background: "var(--bg-elevated)" }}>
              <tr className="admin-thead">
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Name
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Email
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Role
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Tenant
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Status
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--admin-text-secondary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--admin-row-border)" }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={UserPlus}
                      title="No users yet"
                      description="Invite your first agent or assistant."
                    >
                      <Button asChild variant="gold">
                        <Link href="/admin/users/new">Invite User</Link>
                      </Button>
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const tenant = user.tenants as { name: string } | null;
                  return (
                    <tr key={user.id} className="admin-row-hover">
                      <td className="px-3 py-3 md:px-6 md:py-4 text-sm font-medium">
                        {user.full_name || "—"}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <CopyEmailButton email={user.email} />
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-sm text-muted-foreground">
                        {tenant?.name || "—"}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.is_active
                              ? "bg-[var(--success-muted)] text-[var(--success)]"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <div className="flex items-center gap-2">
                          <UserStatusToggle userId={user.id} isActive={user.is_active} />
                          <UserActionsDropdown user={user} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No users yet"
              description="Invite your first agent or assistant."
            >
              <Button asChild variant="gold">
                <Link href="/admin/users/new">Invite User</Link>
              </Button>
            </EmptyState>
          ) : (
            filteredUsers.map((user) => {
              const tenant = user.tenants as { name: string } | null;
              return (
                <div key={user.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                        {user.full_name || "Unnamed"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserStatusToggle userId={user.id} isActive={user.is_active} />
                      <UserActionsDropdown user={user} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <RoleBadge role={user.role} />
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        user.is_active
                          ? "bg-[var(--success-muted)] text-[var(--success)]"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>{tenant?.name || "—"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
