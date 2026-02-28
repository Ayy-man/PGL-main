"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminNavLinks } from "./admin-nav-links";

interface AdminMobileSidebarProps {
  userEmail: string;
}

export function AdminMobileSidebar({ userEmail }: AdminMobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="lg:hidden">
      {/* Fixed mobile header bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 px-4"
        style={{
          background: "rgba(8,8,10,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open admin navigation menu"
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif text-sm font-semibold text-foreground">
          PGL Admin
        </span>
      </div>

      {/* Spacer to push content below fixed header */}
      <div className="h-14" />

      {/* Sheet drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="p-0"
          style={{
            width: "220px",
            background: "var(--bg-sidebar)",
            borderRight: "1px solid var(--border-sidebar)",
          }}
        >
          <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            {/* Admin header */}
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif font-bold text-sm"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))",
                    color: "var(--gold-primary)",
                    border: "1px solid var(--border-gold)",
                  }}
                >
                  P
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground">PGL</span>
                  <span
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--gold-text)" }}
                  >
                    Admin Console
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2 px-3">
              <AdminNavLinks />
            </nav>

            {/* Footer */}
            <div className="mt-auto px-5 py-4">
              <p
                className="text-[11px] truncate"
                style={{ color: "var(--text-ghost)" }}
              >
                {userEmail}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
