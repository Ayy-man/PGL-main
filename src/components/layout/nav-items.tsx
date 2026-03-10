"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  List,
  Users,
  Activity,
  BarChart3,
  LayoutDashboard,
  FileDown,
} from "lucide-react";

interface NavItemsProps {
  orgId: string;
  userRole?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  /** If set, only show for these roles */
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",      href: "/",                    icon: LayoutDashboard, exact: true },
  { label: "Lead Discovery", href: "/search",              icon: Search,          exact: false },
  { label: "Personas",       href: "/personas",            icon: Users,           exact: false },
  { label: "Lists",          href: "/lists",               icon: List,            exact: false },
  { label: "Exports",        href: "/exports",             icon: FileDown,        exact: false },
  { label: "Activity",       href: "/dashboard/activity",  icon: Activity,        exact: false },
  { label: "Analytics",      href: "/dashboard/analytics", icon: BarChart3,       exact: false },
  { label: "Team",           href: "/team",                icon: Users,           exact: false, roles: ["tenant_admin", "super_admin"] },
];

export function NavItems({ orgId, userRole }: NavItemsProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  return (
    <nav className="flex flex-col gap-1 px-3">
      {visibleItems.map((item) => {
        const fullHref = item.href === "/" ? `/${orgId}` : `/${orgId}${item.href}`;
        const isActive = item.exact
          ? pathname === fullHref
          : pathname === fullHref || pathname.startsWith(`${fullHref}/`);

        return (
          <Link
            key={item.href}
            href={fullHref}
            className="flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
            style={
              isActive
                ? {
                    background: "var(--gold-bg)",
                    color: "var(--gold-primary)",
                  }
                : {
                    color: "var(--text-secondary-ds)",
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary-ds)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary-ds)";
              }
            }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
