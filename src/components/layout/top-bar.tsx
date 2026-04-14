"use client";

import Link from "next/link";
import { CommandSearch } from "./command-search";

interface TopBarProps {
  userName?: string;
  userInitials?: string;
  avatarUrl?: string;
  orgId?: string;
}

export function TopBar({ userName, userInitials = "?", avatarUrl, orgId }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-20 hidden lg:flex h-14 items-center justify-between px-6"
      style={{
        background: "rgba(8,8,10,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Left: Search input */}
      <CommandSearch orgId={orgId} />

      {/* Right: Avatar (bell removed — no notifications feature) */}
      <div className="flex items-center gap-3">
        <Link
          href={orgId ? `/${orgId}/settings` : "/settings"}
          title={userName}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
          style={{
            background: "var(--gold-bg, rgba(212,175,55,0.08))",
            color: "var(--gold-primary)",
            border: "1px solid var(--border-gold)",
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName ?? "User"} className="h-full w-full rounded-full object-cover" />
          ) : (
            userInitials
          )}
        </Link>
      </div>
    </header>
  );
}
