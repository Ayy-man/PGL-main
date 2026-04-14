"use client";

import { useState } from "react";
import { Key, Database, Megaphone, Download, Zap, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";
import { useToast } from "@/hooks/use-toast";

interface ActionConfig {
  icon: typeof Key;
  label: string;
  description: string;
  confirmLabel: string;
  variant: "danger" | "default";
  successTitle: string;
  successDescription: string;
}

const SYSTEM_ACTIONS: ActionConfig[] = [
  {
    icon: Key,
    label: "Rotate Master Keys",
    description:
      "This will rotate all master encryption keys across every tenant. All users will re-authenticate on next request.",
    confirmLabel: "Rotate Keys",
    variant: "danger",
    successTitle: "Master keys rotated",
    successDescription: "All active sessions have been invalidated. Users will re-authenticate on next request.",
  },
  {
    icon: Database,
    label: "Flush Cache (Global)",
    description:
      "Clears all cached data globally including enrichment results, search indexes, and session caches. Cached Apollo responses will be cleared — next search burns credits.",
    confirmLabel: "Flush Cache",
    variant: "danger",
    successTitle: "Cache flushed",
    successDescription: "All cached Apollo responses cleared. Next search will consume credits.",
  },
  {
    icon: Megaphone,
    label: "Broadcast Alert",
    description:
      "Send a system-wide alert banner to all active users across every tenant. Use this for planned maintenance or urgent notices.",
    confirmLabel: "Send Broadcast",
    variant: "default",
    successTitle: "Broadcast sent",
    successDescription: "Alert banner delivered to all active users.",
  },
  {
    icon: Download,
    label: "Export System Logs",
    description:
      "Export the last 30 days of system logs including API calls, enrichment activity, and error traces as a downloadable archive.",
    confirmLabel: "Export Logs",
    variant: "default",
    successTitle: "Export started",
    successDescription: "System logs export has been queued.",
  },
];

export function SystemActions() {
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const selectedAction = SYSTEM_ACTIONS.find((a) => a.label === openAction) ?? null;

  function handleConfirm() {
    if (!selectedAction) return;
    setIsRunning(true);
    // Simulate action — replace with real API calls later
    setTimeout(() => {
      setIsRunning(false);
      setOpenAction(null);
      toast({
        title: selectedAction.successTitle,
        description: selectedAction.successDescription,
      });
    }, 1500);
  }

  return (
    <>
      <div className="surface-admin-card rounded-[14px] overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h3
            className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color: "var(--text-primary-ds)" }}
          >
            <Zap className="h-[18px] w-[18px]" style={{ color: "var(--gold-primary)" }} />
            System Actions
          </h3>
        </div>

        {/* 2x2 Grid */}
        <div className="p-5 grid grid-cols-2 gap-4 flex-1">
          {SYSTEM_ACTIONS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="p-4 rounded-lg flex flex-col items-start gap-2 text-left transition-all cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.30)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) (icon as SVGElement).style.color = "var(--gold-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) (icon as SVGElement).style.color = "var(--admin-text-secondary)";
              }}
              onClick={() => {
                setOpenAction(label);
              }}
            >
              <Icon
                className="h-5 w-5 transition-colors"
                style={{ color: "var(--admin-text-secondary)" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary-ds)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Dialog — single dialog driven by selectedAction */}
      {SYSTEM_ACTIONS.map((action) => (
        <Dialog
          key={action.label}
          open={openAction === action.label}
          onOpenChange={(open) => {
            if (!open && !isRunning) {
              setOpenAction(null);
            }
          }}
        >
          <DialogContent>
            {action.variant === "danger" ? (
              <Confirmation
                isDestructive
                confirmLabel={action.confirmLabel}
                cancelLabel="Cancel"
                onConfirm={handleConfirm}
                onCancel={() => setOpenAction(null)}
                isLoading={isRunning}
              >
                <ConfirmationIcon variant="destructive" />
                <ConfirmationTitle>{action.label}?</ConfirmationTitle>
                <ConfirmationDescription>{action.description}</ConfirmationDescription>
              </Confirmation>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle style={{ color: "var(--text-primary-ds)" }}>
                    <span className="flex items-center gap-2">
                      <action.icon className="h-5 w-5" style={{ color: "var(--gold-primary)" }} />
                      {action.label}
                    </span>
                  </DialogTitle>
                  <DialogDescription
                    className="pt-2"
                    style={{ color: "var(--admin-text-secondary)" }}
                  >
                    {action.description}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2">
                  <button
                    onClick={() => setOpenAction(null)}
                    disabled={isRunning}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-primary-ds)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isRunning}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-70 flex items-center gap-2"
                    style={{
                      background: "var(--gold-primary)",
                      color: "#000",
                    }}
                  >
                    {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                    {action.confirmLabel}
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}
