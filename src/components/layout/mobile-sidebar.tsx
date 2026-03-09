"use client";

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

        {/* Right: User avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          title={userName}
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
            color: "var(--gold-primary)",
            border: "1px solid var(--border-gold)",
          }}
        >
          {userInitials}
        </div>
      </div>

      {/* Spacer to push content below fixed header */}
      <div className="h-14" />
    </div>
  );
}
