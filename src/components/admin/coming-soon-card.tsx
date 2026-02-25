"use client";

import type { ReactNode } from "react";

interface ComingSoonCardProps {
  children: ReactNode;
  label?: string;
}

export function ComingSoonCard({
  children,
  label = "Coming Soon",
}: ComingSoonCardProps) {
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-lg">
        <span className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
