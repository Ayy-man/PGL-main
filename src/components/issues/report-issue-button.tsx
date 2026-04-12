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

  // Capture screenshot THEN open dialog with a tiny delay.
  // html2canvas clones the DOM synchronously at invocation, so we start the
  // capture first, then open the dialog 100ms later — enough for the DOM clone
  // to complete before the dialog overlay darkens the page. The user sees the
  // dialog almost instantly (100ms is imperceptible) but gets a clean screenshot.
  const handleOpen = useCallback(() => {
    setCapturing(true);
    const capturePromise = captureScreenshot();
    // Delay dialog open so html2canvas clones the clean (no-overlay) DOM first
    setTimeout(() => setOpen(true), 100);
    capturePromise
      .then((blob) => setCapturedBlob(blob))
      .finally(() => setCapturing(false));
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
