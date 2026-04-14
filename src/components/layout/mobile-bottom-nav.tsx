"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  MoreHorizontal,
  Plus,
  List,
  FileDown,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileBottomNavProps {
  orgId: string;
  userRole?: string;
}

export function MobileBottomNav({ orgId, userRole }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close sheets on navigation
  useEffect(() => {
    setMoreOpen(false);
    setQuickOpen(false);
  }, [pathname]);

  // ---------- Tab definitions ----------

  const tabs = [
    { label: "Home", icon: LayoutDashboard, href: `/${orgId}`, exact: true },
    { label: "Search", icon: Search, href: `/${orgId}/search`, exact: false },
    { label: "Searches", icon: Users, href: `/${orgId}/personas`, exact: false },
  ];

  // "More" is active when on any secondary route
  const moreRoutes = ["/lists", "/exports", "/dashboard/activity", "/dashboard/analytics", "/team"];
  const isMoreActive = moreRoutes.some(
    (r) => pathname === `/${orgId}${r}` || pathname.startsWith(`/${orgId}${r}/`)
  );

  // ---------- More sheet items ----------

  const moreItemsBase = [
    {
      label: "Lists",
      href: "/lists",
      icon: List,
      iconBg: "rgba(96,165,250,0.15)",
      iconColor: "rgb(96,165,250)",
    },
    {
      label: "Exports",
      href: "/exports",
      icon: FileDown,
      iconBg: "rgba(74,222,128,0.15)",
      iconColor: "rgb(74,222,128)",
    },
    {
      label: "Activity",
      href: "/dashboard/activity",
      icon: Activity,
      iconBg: "rgba(251,191,36,0.15)",
      iconColor: "rgb(251,191,36)",
    },
    {
      label: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      iconBg: "rgba(192,132,252,0.15)",
      iconColor: "rgb(192,132,252)",
    },
  ];

  const teamItem = {
    label: "Team",
    href: "/team",
    icon: Users,
    iconBg: "rgba(251,113,133,0.15)",
    iconColor: "rgb(251,113,133)",
  };

  const moreItems =
    userRole === "tenant_admin" || userRole === "super_admin"
      ? [...moreItemsBase, teamItem]
      : moreItemsBase;

  // ---------- Quick action items ----------

  const quickActions = [
    {
      label: "Search Prospects",
      description: "Find new wealth prospects",
      icon: Search,
      iconBg: "rgba(96,165,250,0.15)",
      iconColor: "rgb(96,165,250)",
      onAction: () => router.push(`/${orgId}/search`),
    },
    {
      label: "Save Search",
      description: "Define a new prospect segment",
      icon: Users,
      iconBg: "rgba(192,132,252,0.15)",
      iconColor: "rgb(192,132,252)",
      onAction: () => router.push(`/${orgId}/personas?create=true`),
    },
    {
      label: "Export Data",
      description: "Download prospect data as CSV",
      icon: FileDown,
      iconBg: "rgba(74,222,128,0.15)",
      iconColor: "rgb(74,222,128)",
      onAction: () => router.push(`/${orgId}/exports`),
    },
  ];

  // ---------- Render ----------

  return (
    <>
      {/* Fixed bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe"
        style={{
          background: "rgba(8,8,10,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-end justify-around h-14 px-2">
          {/* Primary tab buttons */}
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors duration-200"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className="flex items-center justify-center h-7 w-12 rounded-full transition-colors duration-200"
                  style={isActive ? { background: "rgba(212,175,55,0.12)" } : undefined}
                >
                  <tab.icon
                    className="h-5 w-5 shrink-0"
                    style={{ color: isActive ? "var(--gold-primary)" : "var(--text-secondary-ds)" }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium font-sans"
                  style={{ color: isActive ? "var(--gold-primary)" : "var(--text-secondary-ds)" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* "+" action button */}
          <button
            onClick={() => setQuickOpen(true)}
            className="flex items-center justify-center h-11 w-11 rounded-full shrink-0 mb-0.5 transition-colors duration-200"
            style={{
              border: `1.5px solid ${quickOpen ? "var(--gold-primary)" : "var(--border-default)"}`,
              color: quickOpen ? "var(--gold-primary)" : "var(--text-secondary-ds)",
            }}
            aria-label="Quick actions"
          >
            <Plus className="h-5 w-5 shrink-0" />
          </button>

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors duration-200"
            aria-label="More navigation"
          >
            <div
              className="flex items-center justify-center h-7 w-12 rounded-full transition-colors duration-200"
              style={isMoreActive ? { background: "rgba(212,175,55,0.12)" } : undefined}
            >
              <MoreHorizontal
                className="h-5 w-5 shrink-0"
                style={{ color: isMoreActive ? "var(--gold-primary)" : "var(--text-secondary-ds)" }}
              />
            </div>
            <span
              className="text-[10px] font-medium font-sans"
              style={{ color: isMoreActive ? "var(--gold-primary)" : "var(--text-secondary-ds)" }}
            >
              More
            </span>
          </button>
        </div>
      </div>

      {/* "More" bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px] p-0 [&>button:first-child]:hidden"
          style={{ background: "var(--bg-sidebar)" }}
        >
          <SheetTitle className="sr-only">More navigation</SheetTitle>

          {/* Nav grid */}
          <div className="grid grid-cols-2 gap-3 px-4 pb-6">
            {moreItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(`/${orgId}${item.href}`)}
                className="surface-card flex flex-col gap-3 p-4 text-left"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: item.iconBg }}
                >
                  <item.icon className="h-5 w-5 shrink-0" style={{ color: item.iconColor }} />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary-ds)" }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* "+" Quick Actions bottom sheet */}
      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px] p-0 [&>button:first-child]:hidden"
          style={{ background: "var(--bg-sidebar)" }}
        >
          <SheetTitle className="sr-only">Quick actions</SheetTitle>

          <h2
            className="text-center text-lg font-serif font-semibold pb-3"
            style={{ color: "var(--text-primary-ds)" }}
          >
            Quick Actions
          </h2>

          <div className="pb-6 px-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setQuickOpen(false);
                  action.onAction();
                }}
                className="flex items-center gap-4 w-full px-4 py-4 text-left transition-colors duration-200 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: action.iconBg }}
                >
                  <action.icon className="h-5 w-5 shrink-0" style={{ color: action.iconColor }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-base font-semibold"
                    style={{ color: "var(--text-primary-ds)" }}
                  >
                    {action.label}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary-ds)" }}
                  >
                    {action.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
