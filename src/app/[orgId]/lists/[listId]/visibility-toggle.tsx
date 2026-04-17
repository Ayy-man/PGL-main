"use client";

// Phase 44 Plan 05 — List visibility toggle (client component).
//
// T-44-02 note: `canToggle` is a UX-only render gate. The real authorization
// boundary is the RLS UPDATE USING clause from Plan 44-01 (D-05) —
// `created_by = auth.uid() OR role IN ('tenant_admin','super_admin')`.
// A user who bypasses this UI (e.g., via DevTools POST) still fails at the
// DB layer silently (zero-row update). This mirrors D-09 "no parallel JS
// permission check" requirement.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Users, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { Visibility } from "@/types/visibility";
import { updateListVisibilityAction } from "../actions";

interface VisibilityToggleProps {
  listId: string;
  current: Visibility;
  canToggle: boolean;
}

export function ListVisibilityToggle({
  listId,
  current,
  canToggle,
}: VisibilityToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const Icon = current === "personal" ? Lock : Users;
  const label = current === "personal" ? "Private" : "Team shared";

  const isPersonal = current === "personal";
  const accent = isPersonal
    ? {
        background: "var(--gold-bg-strong, rgba(212,175,55,0.10))",
        border: "1px solid var(--border-gold, rgba(212,175,55,0.45))",
        color: "var(--gold-primary, #d4af37)",
      }
    : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "var(--text-primary-ds, rgba(255,255,255,0.92))",
      };

  const badge = (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full"
      style={accent}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );

  // Render-gate: non-creator, non-admin users see the badge only.
  // RLS is the trust boundary (T-44-02) — this is UX polish.
  if (!canToggle) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{badge}</span>
        </TooltipTrigger>
        <TooltipContent>
          {current === "personal"
            ? "Private — only you and admins"
            : "Team shared"}
        </TooltipContent>
      </Tooltip>
    );
  }

  const onSelect = (next: Visibility) => {
    if (next === current) return;
    startTransition(async () => {
      const result = await updateListVisibilityAction(listId, next);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to update visibility:", result.error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full cursor-pointer transition-colors hover:brightness-110"
          style={{
            ...accent,
            opacity: isPending ? 0.6 : 1,
          }}
          aria-label="Change list visibility"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onSelect("team_shared")}>
          <Users className="h-3.5 w-3.5 mr-2" />
          Team shared
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("personal")}>
          <Lock className="h-3.5 w-3.5 mr-2" />
          Personal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
