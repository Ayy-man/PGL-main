"use client";

import { useState, useEffect } from "react";
import { NavItems } from "./nav-items";
import { MobileHeader } from "./mobile-sidebar";
import { PanelLeft } from "lucide-react";

interface SidebarProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
  userRole?: string;
  userName: string;
  userInitials: string;
  savedSearchCount?: number;
  listsCount?: number;
}

const STORAGE_KEY = "pgl-sidebar-collapsed";

export function Sidebar({ orgId, tenantName, logoUrl, userRole, userName, userInitials, savedSearchCount, listsCount }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);

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
          <NavItems orgId={orgId} userRole={userRole} collapsed={collapsed} savedSearchCount={savedSearchCount} listsCount={listsCount} />
        </div>

        {/* Footer with collapse toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"} py-4`}>
          {!collapsed && (
            <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
              Phronesis <span className="ml-1">v1.0</span>
            </p>
          )}
          <button
            onClick={toggle}
            onMouseEnter={() => setToggleHovered(true)}
            onMouseLeave={() => setToggleHovered(false)}
            className="flex items-center justify-center rounded-[6px] p-1.5 transition-colors cursor-pointer"
            style={{
              color: "var(--text-secondary-ds, rgba(232,228,220,0.6))",
              background: toggleHovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${toggleHovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
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
