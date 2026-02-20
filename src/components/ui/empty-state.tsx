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
        "flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg",
        variant === "error" && "border-destructive/30",
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-8 w-8 mb-3",
            variant === "error"
              ? "text-destructive"
              : "text-muted-foreground/50"
          )}
        />
      )}
      <p
        className={cn(
          "text-lg font-semibold",
          variant === "error" ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {title}
      </p>
      {description && (
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
