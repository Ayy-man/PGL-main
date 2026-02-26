import { NavItems } from "./nav-items";
import { MobileSidebar } from "./mobile-sidebar";

interface SidebarProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
}

export function SidebarContent({
  orgId,
  tenantName,
  logoUrl,
}: SidebarProps) {
  const initials = tenantName.charAt(0).toUpperCase();

  return (
    <>
      {/* Team header */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif font-bold text-sm"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
            color: "var(--gold-primary)",
            border: "1px solid var(--border-gold)",
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={`${tenantName} logo`} className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {tenantName}
          </span>
          <span
            className="text-[11px] uppercase tracking-wider"
            style={{ color: "var(--gold-text)" }}
          >
            PGL
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <NavItems orgId={orgId} />
      </div>

      {/* Footer */}
      <div className="mt-auto px-5 py-4">
        <p
          className="text-[11px]"
          style={{ color: "var(--text-ghost)" }}
        >
          Phronesis <span className="ml-1">v1.0</span>
        </p>
      </div>
    </>
  );
}

export function Sidebar({ orgId, tenantName, logoUrl }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — hidden below lg */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0"
        style={{
          width: "220px",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
        }}
      >
        <SidebarContent orgId={orgId} tenantName={tenantName} logoUrl={logoUrl} />
      </aside>

      {/* Mobile sidebar — visible below lg */}
      <MobileSidebar orgId={orgId} tenantName={tenantName} logoUrl={logoUrl} />
    </>
  );
}
