import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "error";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center text-center py-20 px-6",
        variant === "error" && "border-destructive/30",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-full",
          )}
          style={{
            background: variant === "error" ? "rgba(239,68,68,0.1)" : "var(--gold-bg)",
          }}
        >
          <Icon
            className="h-8 w-8"
            style={{
              color: variant === "error" ? "rgb(239,68,68)" : "var(--gold-muted)",
            }}
          />
        </div>
      )}
      <h3
        className={cn(
          "font-serif text-[22px] font-semibold text-foreground",
          variant === "error" && "text-destructive"
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-[13px] text-muted-foreground max-w-[400px] mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
