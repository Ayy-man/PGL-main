"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import { deleteListAction } from "../actions";
import type { List } from "@/lib/lists/types";
import { useState } from "react";

interface ListGridProps {
  lists: List[];
}

export function ListGrid({ lists }: ListGridProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list? This cannot be undone.")) {
      return;
    }

    setDeletingId(listId);
    const result = await deleteListAction(listId);

    if (!result.success) {
      alert(result.error || "Failed to delete list");
    }

    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {lists.map((list) => (
        <div
          key={list.id}
          className="flex items-center justify-between p-6 px-7 rounded-xl transition-colors cursor-pointer group"
          style={{
            background: "var(--bg-card-gradient)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card-hover)";
            (e.currentTarget as HTMLDivElement).style.border = "1px solid var(--border-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card-gradient)";
            (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.04)";
          }}
        >
          {/* Left side */}
          <div className="flex-1 min-w-0 mr-6">
            <p className="font-serif text-[20px] font-semibold text-foreground truncate">
              {list.name}
            </p>
            {list.description && (
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {list.description}
              </p>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-6 shrink-0">
            {/* Member count */}
            <div className="flex flex-col items-center">
              <span
                className="font-serif text-[22px] font-bold leading-none"
                style={{ color: "var(--gold-primary)" }}
              >
                {list.member_count}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">members</span>
            </div>

            {/* Updated date */}
            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatDate(list.updated_at)}
            </span>

            {/* Export button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Export list"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={() => handleDelete(list.id)}
              disabled={deletingId === list.id}
              aria-label="Delete list"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            {/* View button */}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              style={{ color: "var(--gold-primary)" }}
            >
              <Link
                href={`/${orgId}/lists/${list.id}`}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold-primary)";
                }}
              >
                View →
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
