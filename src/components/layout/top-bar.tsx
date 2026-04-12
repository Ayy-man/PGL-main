"use client";

import { Bell } from "lucide-react";
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

      {/* Right: Notification bell + Avatar */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary-ds)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary-ds)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary-ds)";
          }}
        >
          <Bell className="h-4 w-4 shrink-0" />
        </button>

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium cursor-pointer"
          title={userName}
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
        </div>
      </div>
    </header>
  );
}
