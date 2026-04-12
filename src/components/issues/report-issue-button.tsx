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

  // Open the dialog immediately, capture screenshot in the background.
  // We capture BEFORE the dialog renders by using requestAnimationFrame
  // to grab the frame before the portal mounts. If that races, we still
  // get a usable screenshot (dialog is transparent overlay, main content visible).
  const handleOpen = useCallback(() => {
    // Start capture in background — don't block the dialog from opening
    setCapturing(true);
    captureScreenshot()
      .then((blob) => setCapturedBlob(blob))
      .finally(() => setCapturing(false));
    // Open dialog immediately so the user isn't waiting
    setOpen(true);
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
