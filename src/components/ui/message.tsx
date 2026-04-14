"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Message Root ---

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: "user" | "assistant" | "system";
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, role = "assistant", ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-role={role}
        className={cn(
          "group flex gap-3",
          role === "user" && "flex-row-reverse",
          className
        )}
        {...props}
      />
    );
  }
);
Message.displayName = "Message";

// --- MessageAvatar ---

interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
}

const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ className, src, fallback, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-xs font-medium",
          className
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={fallback || "avatar"} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    );
  }
);
MessageAvatar.displayName = "MessageAvatar";

// --- MessageContent ---

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1 max-w-[80%]", className)}
      {...props}
    />
  );
});
MessageContent.displayName = "MessageContent";

// --- MessageBubble ---

interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: "user" | "assistant";
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ className, role = "assistant", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl px-4 py-3 text-sm leading-relaxed",
          role === "user"
            ? "bg-[var(--gold-bg-strong)] border border-[var(--border-gold)] text-foreground ml-auto"
            : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-foreground/90",
          className
        )}
        {...props}
      />
    );
  }
);
MessageBubble.displayName = "MessageBubble";

// --- MessageTimestamp ---

const MessageTimestamp = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("text-[11px] text-foreground/40 px-1", className)}
      {...props}
    />
  );
});
MessageTimestamp.displayName = "MessageTimestamp";

export {
  Message,
  MessageAvatar,
  MessageContent,
  MessageBubble,
  MessageTimestamp,
};
