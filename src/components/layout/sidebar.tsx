"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  userEmail?: string;
  savedSearchCount?: number;
  listsCount?: number;
}

const STORAGE_KEY = "pgl-sidebar-collapsed";

export function Sidebar({ orgId, tenantName, logoUrl, userRole, userName, userInitials, userEmail, savedSearchCount, listsCount }: SidebarProps) {
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

  // Keyboard shortcut: Cmd+\ or Cmd+B
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "\\" || e.key === "b")) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initials = tenantName.charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop sidebar — hidden below lg */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 transition-[width] duration-300 ease-out"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Team header — wrapped in Link to return to dashboard */}
        <Link
          href={`/${orgId}`}
          className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-5"} py-5 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-[8px]`}
        >
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
          <div
            className="flex flex-col min-w-0 transition-opacity duration-150"
            style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
          >
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
        </Link>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <NavItems orgId={orgId} userRole={userRole} collapsed={collapsed} savedSearchCount={savedSearchCount} listsCount={listsCount} />
        </div>

        {/* Footer with user card + collapse toggle */}
        <div className="mt-auto">
          {/* User card — hidden when collapsed (matches admin-sidebar pattern) */}
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
                    {userName || "User"}
                  </p>
                  {userEmail && (
                    <p className="text-xs truncate" style={{ color: "var(--text-ghost)" }}>
                      {userEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-end px-4"} py-3`}>
            <button
              onClick={toggle}
              className="flex items-center justify-center rounded-[6px] p-1.5 cursor-pointer hover:bg-white/[0.08] hover:border-white/[0.15] border border-white/[0.08] bg-white/[0.04] transition-colors"
              style={{
                color: "var(--text-secondary-ds, rgba(232,228,220,0.6))",
              }}
              title={`${collapsed ? "Expand" : "Collapse"} sidebar (Cmd+\\)`}
            >
              <PanelLeft
                className="h-4 w-4"
                style={{
                  transform: collapsed ? "rotate(180deg)" : "none",
                  transition: "transform 200ms ease",
                }}
              />
            </button>
          </div>
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
