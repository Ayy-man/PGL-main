"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

// --- Sources Root ---

const Sources = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
});
Sources.displayName = "Sources";

// --- SourcesLabel ---

const SourcesLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "text-[11px] font-medium uppercase tracking-wider text-foreground/40",
        className
      )}
      {...props}
    />
  );
});
SourcesLabel.displayName = "SourcesLabel";

// --- SourcesList ---

const SourcesList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
});
SourcesList.displayName = "SourcesList";

// --- SourceItem ---

interface SourceItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  favicon?: string;
  title?: string;
}

const SourceItem = React.forwardRef<HTMLAnchorElement, SourceItemProps>(
  ({ className, favicon, title, children, href, ...props }, ref) => {
    const displayTitle = title || (href ? new URL(href).hostname : children);
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-xs text-foreground/60 transition-colors hover:border-[rgba(255,255,255,0.15)] hover:text-foreground/90",
          className
        )}
        {...props}
      >
        {favicon && (
          <img
            src={favicon}
            alt=""
            className="h-3.5 w-3.5 rounded-sm object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <span className="max-w-[160px] truncate">{displayTitle as React.ReactNode}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
      </a>
    );
  }
);
SourceItem.displayName = "SourceItem";

export { Sources, SourcesLabel, SourcesList, SourceItem };
