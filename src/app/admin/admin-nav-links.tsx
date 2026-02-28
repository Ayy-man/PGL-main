"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, LayoutDashboard, BarChart3 } from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin",           icon: LayoutDashboard, exact: true },
  { label: "Tenants",   href: "/admin/tenants",   icon: Building2,       exact: false },
  { label: "Users",     href: "/admin/users",     icon: Users,           exact: false },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3,       exact: false },
];

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer"
            style={
              isActive
                ? {
                    background: "var(--gold-bg)",
                    color: "var(--gold-primary)",
                    borderLeft: "3px solid var(--gold-primary)",
                    paddingLeft: "9px",
                  }
                : {
                    color: "var(--text-secondary-ds)",
                    borderLeft: "3px solid transparent",
                    paddingLeft: "9px",
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
    </div>
  );
}
