"use client";

import { useState, useEffect } from "react";
import { NavItems } from "./nav-items";
import { MobileHeader } from "./mobile-sidebar";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface SidebarProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
  userRole?: string;
  userName: string;
  userInitials: string;
}

const STORAGE_KEY = "pgl-sidebar-collapsed";

export function Sidebar({ orgId, tenantName, logoUrl, userRole, userName, userInitials }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const initials = tenantName.charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop sidebar — hidden below lg */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 transition-[width] duration-200 ease-in-out"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Team header */}
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-5"} py-5`}>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-serif font-bold text-base overflow-hidden"
            style={{
              background: "var(--gold-bg-strong)",
              color: "var(--gold-primary)",
              border: "1px solid var(--border-gold)",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={`${tenantName} logo`} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {tenantName}
              </span>
              <span
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "var(--gold-text)" }}
              >
                PGL
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <NavItems orgId={orgId} userRole={userRole} collapsed={collapsed} />
        </div>

        {/* Collapse toggle */}
        <div className={`px-3 py-3 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={toggle}
            className="flex items-center gap-2 rounded-[6px] px-2 py-2 text-xs transition-colors cursor-pointer w-full"
            style={{ color: "var(--text-ghost)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0 mx-auto" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="px-5 py-4">
            <p
              className="text-[11px]"
              style={{ color: "var(--text-ghost)" }}
            >
              Phronesis <span className="ml-1">v1.0</span>
            </p>
          </div>
        )}
      </aside>

      {/* Mobile header — visible below lg */}
      <MobileHeader
        orgId={orgId}
        tenantName={tenantName}
        logoUrl={logoUrl}
        userName={userName}
        userInitials={userInitials}
      />
    </>
  );
}
