"use client";

import { useState, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface MobileSidebarProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
  userRole?: string;
}

export function MobileSidebar({
  orgId,
  tenantName,
  logoUrl,
  userRole,
}: MobileSidebarProps) {
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
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between px-4 pl-safe"
        style={{
          background: "rgba(8,8,10,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <span className="font-serif text-sm font-semibold text-foreground">{tenantName}</span>
        <div className="flex items-center gap-2">
          <Link
            href={`/${orgId}/search`}
            className="flex items-center justify-center h-10 w-10 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary-ds)" }}
            aria-label="Search prospects"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="h-11 w-11"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Spacer to push content below fixed header */}
      <div className="h-14" />

      {/* Sheet drawer with gradient background and gold accent */}
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
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarContent
              orgId={orgId}
              tenantName={tenantName}
              logoUrl={logoUrl}
              userRole={userRole}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
