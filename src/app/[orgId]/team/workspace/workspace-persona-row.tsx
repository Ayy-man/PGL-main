"use client";

// Phase 44 Plan 06 — Admin workspace persona (saved search) row.
// Mirrors workspace-list-row but fires updatePersonaVisibilityAction.
// T-44-02: render-only UX; RLS is the authorization boundary.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePersonaVisibilityAction } from "@/app/[orgId]/personas/actions";
import type { PersonaWithCreator } from "@/lib/personas/types";

interface Props {
  persona: PersonaWithCreator;
}

export function WorkspacePersonaRow({ persona }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filterCount = persona.filters
    ? Object.values(persona.filters).filter((v) => {
        if (v == null) return false;
        if (typeof v === "string") return v.length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length
    : 0;

  const toggle = () => {
    const next = persona.visibility === "personal" ? "team_shared" : "personal";
    startTransition(async () => {
      const result = await updatePersonaVisibilityAction(persona.id, next);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to update persona visibility:", result.error);
      }
    });
  };

  const Icon = persona.visibility === "personal" ? Lock : Users;
  const badgeLabel = persona.visibility === "personal" ? "Personal" : "Team shared";

  return (
    <tr
      className="admin-row-hover"
      style={{ borderTop: "1px solid var(--border-default)" }}
    >
      <td className="px-4 py-3" style={{ color: "var(--text-primary-ds)" }}>
        {persona.name}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-secondary-ds)" }}>
        {persona.creator?.full_name || persona.creator?.email || "—"}
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
        {filterCount}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-secondary-ds)" }}>
        {new Date(persona.updated_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          disabled={isPending || persona.is_starter}
          title={persona.is_starter ? "Starter personas are always team shared" : undefined}
        >
          {persona.visibility === "personal" ? "Share with team" : "Make personal"}
        </Button>
      </td>
    </tr>
  );
}
