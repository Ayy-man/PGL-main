"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Database,
  Key,
  LayoutDashboard,
  Plug,
  Shield,
  Zap,
} from "lucide-react";

const ADMIN_NAV_PLATFORM = [
  { label: "Command Center",  href: "/admin",            icon: LayoutDashboard, exact: true  },
  { label: "Tenant Registry", href: "/admin/tenants",    icon: Building2,       exact: false },
  { label: "Usage Metrics",   href: "/admin/analytics",  icon: BarChart3,       exact: false },
  { label: "Automations",     href: "/admin/automations", icon: Zap,            exact: false },
  { label: "Issue Reports",   href: "/admin/reports",    icon: AlertTriangle,   exact: false },
];

const ADMIN_NAV_SYSTEM_ACTIVE = [
  { label: "Global API Keys", href: "/admin/api-keys", icon: Key, exact: false },
];

const ADMIN_NAV_SYSTEM_STUBS = [
  { label: "Master Data Schema", icon: Database },
  { label: "Security Policies",  icon: Shield   },
  { label: "Integrations",       icon: Plug     },
];

export function AdminNavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const [openCount, setOpenCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { open?: number };
      setOpenCount(data.open ?? 0);
    } catch {
      // silently ignore — badge stays at previous value
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount(); // immediate fetch on mount
    const interval = setInterval(fetchUnreadCount, 30_000); // 30s polling
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <div className="flex flex-col gap-1">
      {/* Section 1: Platform Control */}
      {!collapsed && (
        <div className="px-3 mb-1 mt-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-ghost)" }}
          >
            Platform Control
          </p>
        </div>
      )}

      {ADMIN_NAV_PLATFORM.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
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
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && item.href === "/admin/reports" && openCount > 0 && (
              <span
                className="ml-auto inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ background: "rgb(220, 38, 38)" }}
                aria-label={`${openCount} open report${openCount === 1 ? "" : "s"}`}
              >
                {openCount > 99 ? "99+" : openCount}
              </span>
            )}
            {collapsed && item.href === "/admin/reports" && openCount > 0 && (
              <span
                className="absolute top-1 right-1 inline-block h-2 w-2 rounded-full"
                style={{ background: "rgb(220, 38, 38)" }}
                aria-label={`${openCount} open reports`}
              />
            )}
          </Link>
        );
      })}

      {/* Divider between sections */}
      <div
        className="my-3 mx-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      />

      {/* Section 2: System Config */}
      {!collapsed && (
        <div className="px-3 mb-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-ghost)" }}
          >
            System Config
          </p>
        </div>
      )}

      {ADMIN_NAV_SYSTEM_ACTIVE.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
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
            {!collapsed && item.label}
          </Link>
        );
      })}

      {ADMIN_NAV_SYSTEM_STUBS.map((item) => (
        <button
          key={item.label}
          onClick={(e) => e.preventDefault()}
          title="Coming soon"
          className="flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm font-medium cursor-default opacity-60 w-full text-left"
          style={{
            color: "var(--text-secondary-ds)",
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
          {!collapsed && item.label}
        </button>
      ))}
    </div>
  );
}
