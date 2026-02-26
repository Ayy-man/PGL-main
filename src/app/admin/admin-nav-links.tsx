"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, LayoutDashboard } from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Tenants", href: "/admin/tenants", icon: Building2, exact: false },
  { label: "Users", href: "/admin/users", icon: Users, exact: false },
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
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-gold/10 text-gold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className={`h-4 w-4 transition-colors duration-150 ${isActive ? "text-gold" : "text-muted-foreground group-hover:text-foreground"}`} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
