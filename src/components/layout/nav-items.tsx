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
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
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
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
