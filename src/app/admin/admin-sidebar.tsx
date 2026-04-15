"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { AdminNavLinks } from "./admin-nav-links";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const STORAGE_KEY = "pgl-admin-sidebar-collapsed";

interface AdminSidebarProps {
  userInitials: string;
  userEmail: string;
}

export function AdminSidebar({ userInitials, userEmail }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      className="hidden lg:flex sticky top-0 h-screen flex-col transition-[width] duration-200 ease-out"
      style={{
        width: collapsed ? "64px" : "220px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-sidebar)",
      }}
    >
      {/* Admin header — wrapped in Link to admin dashboard */}
      <Link
        href="/admin"
        className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-5"} py-5 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-[8px]`}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-serif font-bold text-sm"
          style={{
            background: "var(--gold-bg, rgba(var(--gold-primary-rgb), 0.08))",
            color: "var(--gold-primary)",
            border: "1px solid var(--border-gold)",
          }}
        >
          P
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground">PGL</span>
            <span
              className="text-[11px] uppercase tracking-wider"
              style={{ color: "var(--gold-text)" }}
            >
              Admin Console
            </span>
          </div>
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto py-2 px-3">
        <AdminNavLinks collapsed={collapsed} />
      </nav>

      {/* Footer */}
      <div className="mt-auto">
        {/* User card — hidden when collapsed */}
        {!collapsed && (
          <div className="px-4 pb-2">
            <div
              className="rounded-[12px] p-3 flex items-center gap-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: "var(--gold-bg-strong)",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--border-gold)",
                }}
              >
                {userInitials}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary-ds)" }}>
                  Super Admin
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-ghost)" }}>
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-5"} py-3`}>
          {!collapsed && (
            <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
              Admin Console
            </p>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="flex items-center justify-center rounded-[6px] p-1.5 transition-colors cursor-pointer"
                style={{
                  color: "var(--text-secondary-ds, rgba(232,228,220,0.6))",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-default, rgba(255,255,255,0.06))",
                }}
              >
                <PanelLeft
                  className="h-4 w-4"
                  style={{
                    transform: collapsed ? "rotate(180deg)" : "none",
                    transition: "transform 200ms ease",
                  }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
