"use client";

import { useState, useCallback } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureScreenshot } from "@/lib/issues/capture-screenshot";
import { ReportIssueDialog } from "./report-issue-dialog";
import type { ReportTarget } from "@/lib/issues/capture-context";

export interface ReportIssueButtonProps {
  target: ReportTarget;
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ReportIssueButton({
  target,
  className,
  variant = "ghost",
  size = "sm",
}: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturing, setCapturing] = useState(false);

  // CRITICAL: capture BEFORE opening dialog, otherwise the dialog overlay
  // is visible in the screenshot. See 33-RESEARCH.md Pitfall 3.
  const handleOpen = useCallback(async () => {
    setCapturing(true);
    try {
      const blob = await captureScreenshot();
      setCapturedBlob(blob);
    } finally {
      setCapturing(false);
      setOpen(true);
    }
  }, []);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpen}
        disabled={capturing}
      >
        <Flag className="mr-2 h-4 w-4" />
        Report an issue
      </Button>
      <ReportIssueDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setCapturedBlob(null);
        }}
        target={target}
        preCapturedScreenshot={capturedBlob}
      />
    </>
  );
}
