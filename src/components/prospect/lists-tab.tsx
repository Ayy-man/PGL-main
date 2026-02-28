"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

interface ListMembership {
  listId: string;
  listName: string;
  status: string;
  addedAt: string;
}

interface ListsTabProps {
  memberships: ListMembership[];
  orgId: string;
  onAddToList?: () => void;
}

export function ListsTab({ memberships, orgId, onAddToList }: ListsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {/* Existing list membership cards */}
      {memberships.map((membership) => (
        <Link
          key={membership.listId}
          href={`/${orgId}/lists/${membership.listId}`}
          className="surface-card cursor-pointer p-4 hover:bg-accent no-underline block"
        >
          <p className="text-sm font-semibold text-foreground">
            {membership.listName}
          </p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">
            {membership.status}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Added {new Date(membership.addedAt).toLocaleDateString()}
          </p>
        </Link>
      ))}

      {/* Add to List dashed card */}
      <button
        onClick={onAddToList}
        aria-label="Add to list"
        className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed p-4 transition-colors"
        style={{
          borderColor: "rgba(212,175,55,0.3)",
          color: "var(--gold-primary)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--gold-bg)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">Add to List</span>
      </button>
    </div>
  );
}
