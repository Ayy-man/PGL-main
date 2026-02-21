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
        "flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed rounded-xl",
        variant === "error" && "border-destructive/30 bg-destructive/5",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
            variant === "error"
              ? "bg-destructive/10"
              : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              variant === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          />
        </div>
      )}
      <h3
        className={cn(
          "text-base font-semibold",
          variant === "error" ? "text-destructive" : "text-foreground"
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
