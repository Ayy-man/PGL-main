"use client";

import { Search } from "lucide-react";

interface MobileHeaderProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
  userName: string;
  userInitials: string;
}

export function MobileHeader({
  orgId: _orgId,
  tenantName,
  logoUrl,
  userName,
  userInitials,
}: MobileHeaderProps) {
  const initials = tenantName.charAt(0).toUpperCase();

  return (
    <div className="lg:hidden">
      {/* Fixed mobile header bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between px-4 pl-safe"
        style={{
          background: "rgba(8,8,10,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Left: Org logo + name */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-serif font-bold overflow-hidden"
            style={{
              background: "var(--gold-bg-strong)",
              color: "var(--gold-primary)",
              border: "1px solid var(--border-gold)",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={`${tenantName} logo`} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span
            className="font-serif text-sm font-semibold truncate max-w-[180px]"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {tenantName}
          </span>
        </div>

        {/* Right: Search button + User avatar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary-ds)",
            }}
            onClick={() => window.dispatchEvent(new CustomEvent("command-search:open"))}
          >
            <Search className="h-4 w-4 shrink-0" />
          </button>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
            title={userName}
            style={{
              background: "var(--gold-bg, rgba(var(--gold-primary-rgb), 0.08))",
              color: "var(--gold-primary)",
              border: "1px solid var(--border-gold)",
            }}
          >
            {userInitials}
          </div>
        </div>
      </div>

      {/* Spacer to push content below fixed header */}
      <div className="h-14" />
    </div>
  );
}
