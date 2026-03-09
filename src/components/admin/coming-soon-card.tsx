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
      <div
        className="absolute inset-0 flex items-center justify-center rounded-[14px]"
        style={{ background: "rgba(8,8,10,0.6)" }}
      >
        <span
          className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold"
          style={{
            background: "var(--gold-bg-strong)",
            color: "var(--gold-primary)",
            border: "1px solid var(--border-gold)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
