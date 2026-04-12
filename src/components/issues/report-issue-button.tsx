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

  // Capture screenshot fully BEFORE opening the dialog. The button shows
  // "Capturing..." briefly (~1-2s) so the user knows it's working. This
  // guarantees html2canvas renders the clean page without the dialog overlay.
  const handleOpen = useCallback(async () => {
    // Screenshot capture disabled — html2canvas-pro can't render oklch() colors,
    // producing misleading images. The report captures URL + viewport + context instead.
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
        {capturing ? "Capturing page..." : "Report an issue"}
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
