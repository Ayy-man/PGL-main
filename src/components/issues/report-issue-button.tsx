"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Flag className="mr-2 h-4 w-4" />
        Report an issue
      </Button>
      <ReportIssueDialog
        open={open}
        onOpenChange={setOpen}
        target={target}
        preCapturedScreenshot={null}
      />
    </>
  );
}
