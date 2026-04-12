"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { captureContext, type ReportTarget } from "@/lib/issues/capture-context";
import type { IssueCategory } from "@/types/database";

const CATEGORIES: Array<{ value: IssueCategory; label: string; description: string }> = [
  { value: "incorrect_data", label: "Incorrect data", description: "Wrong title, company, LinkedIn, etc." },
  { value: "missing_data", label: "Missing data", description: "Not enough info or missing enrichment" },
  { value: "bad_source", label: "Bad source", description: "Broken link or wrong citation" },
  { value: "bug", label: "Bug", description: "Page crashed, button didn't work, wrong state" },
  { value: "other", label: "Something else", description: "Free-form feedback" },
];

export interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  target: ReportTarget;
  preCapturedScreenshot: Blob | null;
}

export function ReportIssueDialog({
  open,
  onOpenChange,
  target,
  preCapturedScreenshot,
}: ReportIssueDialogProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState<IssueCategory>("incorrect_data");
  const [description, setDescription] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetForm = useCallback(() => {
    setCategory("incorrect_data");
    setDescription("");
    setIncludeScreenshot(true);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (description.trim().length < 1) {
        setError("Description is required.");
        return;
      }
      if (description.length > 5000) {
        setError("Description must be 5000 characters or less.");
        return;
      }

      startTransition(async () => {
        try {
          const ctx = captureContext(target);
          const payload = {
            category,
            description: description.trim(),
            page_url: ctx.page_url,
            page_path: ctx.page_path,
            user_agent: ctx.user_agent,
            viewport: ctx.viewport,
            target_type: ctx.target_type,
            target_id: ctx.target_id,
            target_snapshot: ctx.target_snapshot,
          };

          const formData = new FormData();
          formData.append("payload", JSON.stringify(payload));
          if (includeScreenshot && preCapturedScreenshot) {
            formData.append("screenshot", preCapturedScreenshot, "screenshot.png");
          }

          const res = await fetch("/api/issues/report", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string; details?: string; code?: string };
            const msg = [body.error, body.details, body.code].filter(Boolean).join(" — ");
            console.error("[ReportIssueDialog] Submit failed:", res.status, body);
            setError(msg || `Failed to submit report (${res.status}). Please try again.`);
            return;
          }

          toast({
            title: "Thanks — we'll take a look",
            description: "Your report was sent to the team.",
          });
          resetForm();
          onOpenChange(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unexpected error");
        }
      });
    },
    [category, description, includeScreenshot, preCapturedScreenshot, target, toast, resetForm, onOpenChange]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. We&apos;ll capture the page context so the team can investigate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Category</legend>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/50"
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={category === c.value}
                    onChange={() => setCategory(c.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect instead?"
              rows={5}
              maxLength={5000}
              required
            />
            <div className="text-xs text-muted-foreground">
              {description.length} / 5000
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-screenshot"
              checked={includeScreenshot}
              onCheckedChange={(v) => setIncludeScreenshot(v === true)}
              disabled={!preCapturedScreenshot}
            />
            <Label htmlFor="include-screenshot" className="text-sm">
              Include a screenshot of the page
              {!preCapturedScreenshot && (
                <span className="ml-1 text-xs text-muted-foreground">(capture unavailable)</span>
              )}
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
