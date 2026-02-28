"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  BarChart3,
  Key,
  Database,
  Shield,
  Plug,
} from "lucide-react";

const ADMIN_NAV_PLATFORM = [
  { label: "Command Center",  href: "/admin",            icon: LayoutDashboard, exact: true  },
  { label: "Tenant Registry", href: "/admin/tenants",    icon: Building2,       exact: false },
  { label: "Usage Metrics",   href: "/admin/analytics",  icon: BarChart3,       exact: false },
];

const ADMIN_NAV_SYSTEM = [
  { label: "Global API Keys",    icon: Key      },
  { label: "Master Data Schema", icon: Database },
  { label: "Security Policies",  icon: Shield   },
  { label: "Integrations",       icon: Plug     },
];

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {/* Section 1: Platform Control */}
      <div className="px-3 mb-1 mt-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-ghost)" }}
        >
          Platform Control
        </p>
      </div>

      {ADMIN_NAV_PLATFORM.map((item) => {
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

      {/* Divider between sections */}
      <div
        className="my-3 mx-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      />

      {/* Section 2: System Config */}
      <div className="px-3 mb-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-ghost)" }}
        >
          System Config
        </p>
      </div>

      {ADMIN_NAV_SYSTEM.map((item) => (
        <button
          key={item.label}
          onClick={(e) => e.preventDefault()}
          title="Coming soon"
          className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium cursor-default opacity-60 w-full text-left"
          style={{
            color: "var(--text-secondary-ds)",
            borderLeft: "3px solid transparent",
            paddingLeft: "9px",
            background: "transparent",
            border: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
