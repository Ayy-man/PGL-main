"use client";

// Phase 44 Plan 06 — Admin workspace list row.
// Each row shows a tenant-wide list plus a creator/visibility toggle.
// T-44-02 note: this page is admin-gated server-side in page.tsx. The row's
// toggle fires updateListVisibilityAction, which relies on RLS for authorization
// (the admin role clause in the UPDATE USING policy allows cross-user mutation
// for tenant_admin / super_admin). No parallel JS authz check here.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateListVisibilityAction } from "@/app/[orgId]/lists/actions";
import type { ListWithCreator } from "@/lib/lists/types";

interface Props {
  list: ListWithCreator;
  orgId: string;
}

export function WorkspaceListRow({ list, orgId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = list.visibility === "personal" ? "team_shared" : "personal";
    startTransition(async () => {
      const result = await updateListVisibilityAction(list.id, next);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to update list visibility:", result.error);
      }
    });
  };

  const Icon = list.visibility === "personal" ? Lock : Users;
  const badgeLabel = list.visibility === "personal" ? "Personal" : "Team shared";

  return (
    <tr
      className="admin-row-hover"
      style={{ borderTop: "1px solid var(--border-default)" }}
    >
      <td className="px-4 py-3">
        <Link
          href={`/${orgId}/lists/${list.id}`}
          className="hover:underline"
          style={{ color: "var(--text-primary-ds)" }}
        >
          {list.name}
        </Link>
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-secondary-ds)" }}>
        {list.creator?.full_name || list.creator?.email || "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-[5px]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-ghost)",
          }}
        >
          <Icon className="h-3 w-3" />
          {badgeLabel}
        </span>
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-secondary-ds)" }}>
        {list.member_count}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-secondary-ds)" }}>
        {new Date(list.updated_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          disabled={isPending}
        >
          {list.visibility === "personal" ? "Share with team" : "Make personal"}
        </Button>
      </td>
    </tr>
  );
}
