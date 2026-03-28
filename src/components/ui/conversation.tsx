"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Conversation Root ---

const Conversation = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-4 overflow-y-auto", className)}
      {...props}
    />
  );
});
Conversation.displayName = "Conversation";

// --- ConversationHeader ---

const ConversationHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3",
        className
      )}
      {...props}
    />
  );
});
ConversationHeader.displayName = "ConversationHeader";

// --- ConversationMessages ---

const ConversationMessages = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-1 flex-col gap-6 overflow-y-auto py-4", className)}
      {...props}
    />
  );
});
ConversationMessages.displayName = "ConversationMessages";

// --- ConversationEmpty ---

const ConversationEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 text-center text-foreground/40",
        className
      )}
      {...props}
    />
  );
});
ConversationEmpty.displayName = "ConversationEmpty";

export {
  Conversation,
  ConversationHeader,
  ConversationMessages,
  ConversationEmpty,
};
