"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface MobileSidebarProps {
  orgId: string;
  tenantName: string;
  logoUrl: string | null;
}

export function MobileSidebar({
  orgId,
  tenantName,
  logoUrl,
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
          aria-label="Open navigation menu"
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif text-sm font-semibold text-foreground">{tenantName}</span>
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
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
