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
  Settings,
  Bookmark,
} from "lucide-react";

interface NavItemsProps {
  orgId: string;
  userRole?: string;
  collapsed?: boolean;
  savedSearchCount?: number;
  listsCount?: number;
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
  { label: "Saved Searches",  href: "/personas",            icon: Bookmark,        exact: false },
  { label: "Lists",          href: "/lists",               icon: List,            exact: false },
  { label: "Exports",        href: "/exports",             icon: FileDown,        exact: false },
  { label: "Activity",       href: "/dashboard/activity",  icon: Activity,        exact: false },
  { label: "Analytics",      href: "/dashboard/analytics", icon: BarChart3,       exact: false },
  { label: "Team",           href: "/team",                icon: Users,           exact: false, roles: ["tenant_admin", "super_admin"] },
  { label: "Settings",      href: "/settings",            icon: Settings,        exact: false },
];

export function NavItems({ orgId, userRole, collapsed, savedSearchCount, listsCount }: NavItemsProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  const getBadgeCount = (label: string): number | null => {
    if (label === "Saved Searches" && typeof savedSearchCount === "number") return savedSearchCount;
    if (label === "Lists" && typeof listsCount === "number") return listsCount;
    return null;
  };

  return (
    <nav className={`flex flex-col gap-1 ${collapsed ? "px-2" : "px-3"}`}>
      {visibleItems.map((item) => {
        const fullHref = item.href === "/" ? `/${orgId}` : `/${orgId}${item.href}`;
        const isActive = item.exact
          ? pathname === fullHref
          : pathname === fullHref || pathname.startsWith(`${fullHref}/`);

        return (
          <Link
            key={item.href}
            href={fullHref}
            title={collapsed ? item.label : undefined}
            data-tour-id={item.href === "/search" ? "discover-card" : undefined}
            className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-[8px] ${collapsed ? "px-0 py-3" : "px-3 py-3"} text-sm font-medium ghost-hover transition-[background-color,color] cursor-pointer`}
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
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
            {!collapsed && (() => {
              const badge = getBadgeCount(item.label);
              if (badge === null) return null;
              return (
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={
                    isActive
                      ? {
                          background: "var(--gold-bg)",
                          border: "1px solid var(--border-gold)",
                          color: "var(--gold-primary)",
                        }
                      : {
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary-ds)",
                        }
                  }
                >
                  {badge}
                </span>
              );
            })()}
          </Link>
        );
      })}
    </nav>
  );
}
