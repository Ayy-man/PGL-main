"use client";

import Link from "next/link";
import { List as ListIcon, ArrowRight } from "lucide-react";
import type { List } from "@/lib/lists/types";

interface RecentListsPreviewProps {
  lists: List[];
  orgId: string;
}

const MAX_LISTS = 5;

export function RecentListsPreview({ lists, orgId }: RecentListsPreviewProps) {
  const recent = lists.slice(0, MAX_LISTS);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-serif text-[22px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Recent Lists
        </h3>
        <Link
          href={`/${orgId}/lists`}
          className="inline-flex items-center gap-1 text-xs cursor-pointer transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--gold-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          View All
          <ArrowRight className="h-3 w-3 shrink-0" />
        </Link>
      </div>
      <div className="space-y-1">
        {recent.map((list) => (
          <Link
            key={list.id}
            href={`/${orgId}/lists/${list.id}`}
            className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 cursor-pointer transition-colors"
            style={{
              background: "transparent",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ListIcon
              className="h-4 w-4 shrink-0"
              style={{ color: "var(--text-secondary)" }}
            />
            <span className="flex-1 text-sm truncate">{list.name}</span>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              {list.member_count}{" "}
              {list.member_count === 1 ? "prospect" : "prospects"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
