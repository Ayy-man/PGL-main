// Phase 44 Plan 06 — Admin workspace (all lists + saved searches).
// Admin-gated server component: renders two tabs that list every list and
// persona across the tenant. Uses the getAllListsWithCreators / getAllPersonasWithCreators
// queries from Plan 44-02 and trusts RLS to yield all rows to admins (D-12 + D-05).
//
// Gate pattern mirrors src/app/[orgId]/team/page.tsx:57-60 — inline role check
// (NOT requireRole, which redirects agents to /login). Non-admins go to dashboard.

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getAllListsWithCreators } from "@/lib/lists/queries";
import { getAllPersonasWithCreators } from "@/lib/personas/queries";
import { WorkspaceListRow } from "./workspace-list-row";
import { WorkspacePersonaRow } from "./workspace-persona-row";
import { WorkspaceTabs } from "./workspace-tabs";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Inline admin check — PATTERNS.md Pattern 3. NOT requireRole (redirects to login).
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect(`/${orgId}/dashboard`);
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    redirect(`/${orgId}/dashboard`);
  }

  // RLS yields ALL tenant rows for admins (D-05 admin role clause).
  const [lists, personas] = await Promise.all([
    getAllListsWithCreators(tenantId),
    getAllPersonasWithCreators(tenantId),
  ]);

  const listsPane = (
    <div className="surface-admin-card rounded-[14px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="admin-thead">
            <tr>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Name
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Creator
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Visibility
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Members
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Updated
              </th>
              <th
                className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {lists.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary-ds)" }}
                >
                  No lists in this tenant yet.
                </td>
              </tr>
            )}
            {lists.map((list) => (
              <WorkspaceListRow key={list.id} list={list} orgId={orgId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const personasPane = (
    <div className="surface-admin-card rounded-[14px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="admin-thead">
            <tr>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Name
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Creator
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Visibility
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Filters
              </th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Updated
              </th>
              <th
                className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--admin-text-secondary)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {personas.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary-ds)" }}
                >
                  No saved searches in this tenant yet.
                </td>
              </tr>
            )}
            {personas.map((persona) => (
              <WorkspacePersonaRow key={persona.id} persona={persona} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${orgId}/team`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Team Workspace
          </h1>
          <p className="text-muted-foreground mt-1">
            All lists and saved searches across the tenant — including personal items.
          </p>
        </div>
      </div>

      <WorkspaceTabs
        defaultValue="lists"
        tabs={[
          {
            value: "lists",
            label: `Lists (${lists.length})`,
            content: listsPane,
          },
          {
            value: "personas",
            label: `Saved Searches (${personas.length})`,
            content: personasPane,
          },
        ]}
      />
    </div>
  );
}
