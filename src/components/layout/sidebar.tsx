import { TenantLogo } from "./tenant-logo";
import { NavItems } from "./nav-items";

interface SidebarProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
}

export function Sidebar({ orgId, tenantName, logoUrl }: SidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <TenantLogo logoUrl={logoUrl} tenantName={tenantName} />
        <div className="flex flex-col">
          <span className="font-serif text-sm font-semibold">
            {tenantName}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <NavItems orgId={orgId} />
      </div>

      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          PGL Luxury Buyer Finder
        </div>
      </div>
    </aside>
  );
}
