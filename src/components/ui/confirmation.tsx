"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Confirmation Root ---

interface ConfirmationProps extends React.HTMLAttributes<HTMLDivElement> {
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

const Confirmation = React.forwardRef<HTMLDivElement, ConfirmationProps>(
  (
    {
      className,
      onConfirm,
      onCancel,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      isDestructive = false,
      isLoading = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-4 flex flex-col gap-3",
          isDestructive && "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)]",
          className
        )}
        {...props}
      >
        {children}
        <div className="flex items-center justify-end gap-2 pt-1">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
          )}
          {onConfirm && (
            <Button
              variant={isDestructive ? "destructive" : "gold"}
              size="sm"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }
);
Confirmation.displayName = "Confirmation";

// --- ConfirmationIcon ---

interface ConfirmationIconProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "warning" | "info" | "destructive";
}

const ConfirmationIcon = React.forwardRef<HTMLDivElement, ConfirmationIconProps>(
  ({ className, variant = "warning", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          variant === "warning" && "bg-[rgba(234,179,8,0.12)] text-yellow-400",
          variant === "info" && "bg-[rgba(59,130,246,0.12)] text-blue-400",
          variant === "destructive" && "bg-[rgba(239,68,68,0.12)] text-red-400",
          className
        )}
        {...props}
      >
        <AlertTriangle className="h-5 w-5" />
      </div>
    );
  }
);
ConfirmationIcon.displayName = "ConfirmationIcon";

// --- ConfirmationTitle ---

const ConfirmationTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h4
      ref={ref}
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
});
ConfirmationTitle.displayName = "ConfirmationTitle";

// --- ConfirmationDescription ---

const ConfirmationDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-xs text-foreground/60 leading-relaxed", className)}
      {...props}
    />
  );
});
ConfirmationDescription.displayName = "ConfirmationDescription";

export {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
};
