"use client";

import { useState } from "react";
import { Search, Bell } from "lucide-react";

interface TopBarProps {
  userName?: string;
  userInitials?: string;
  avatarUrl?: string;
}

export function TopBar({ userName, userInitials = "?", avatarUrl }: TopBarProps) {
  const [searchValue, setSearchValue] = useState("");

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
      <div className="relative w-full max-w-[320px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Search prospects, lists..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-9 w-full rounded-[8px] pl-9 pr-16 text-[13px] font-sans text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-hover)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-subtle)";
          }}
        />
        <kbd
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] font-mono"
          style={{
            color: "var(--text-ghost)",
            borderColor: "var(--border-subtle)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          Cmd+K
        </kbd>
      </div>

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
            background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
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
