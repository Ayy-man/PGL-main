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
        "flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed",
        variant === "error" && "border-destructive/30 bg-destructive/5",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-5 flex h-12 w-12 items-center justify-center rounded-xl",
            variant === "error"
              ? "bg-destructive/10"
              : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              variant === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          />
        </div>
      )}
      <h3
        className={cn(
          "text-sm font-semibold",
          variant === "error" ? "text-destructive" : "text-foreground"
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
