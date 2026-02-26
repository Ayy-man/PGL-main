"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  List,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";

interface NavItemsProps {
  orgId: string;
}

const NAV_ITEMS = [
  { label: "Search", href: "/search", icon: Search },
  { label: "Lists", href: "/lists", icon: List },
  { label: "Personas", href: "/personas", icon: Users },
  { label: "Activity", href: "/dashboard/activity", icon: Activity },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

export function NavItems({ orgId }: NavItemsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const fullHref = `/${orgId}${item.href}`;
        const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

        return (
          <Link
            key={item.href}
            href={fullHref}
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
    </nav>
  );
}
