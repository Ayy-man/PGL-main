"use client";

// Phase 41 — Plan 03
// Top-bar Help affordance: DropdownMenu with three items:
//   1. Watch intro video   → opens embedded <Dialog> (iframe or <video> via pickVideoRenderer)
//   2. Replay product tour → writes { tour_completed: false, tour_skipped_at: null }
//                            to auth.users.app_metadata.onboarding_state, then router.refresh()
//                            so the server layout re-reads the JWT and <TourTrigger> re-fires.
//   3. Report an issue     → opens the existing ReportIssueDialog (composed, NOT duplicated)
//
// Env var (client-readable via NEXT_PUBLIC_ prefix): NEXT_PUBLIC_PGL_INTRO_VIDEO_URL.
// When unset / invalid, the dialog shows a "Video coming soon" fallback.

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, PlayCircle, RotateCcw, Flag } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateOnboardingState } from "@/app/actions/onboarding-state";
import { resolveVideoUrl, pickVideoRenderer } from "@/lib/onboarding/video-url";
import { ReportIssueDialog } from "@/components/issues/report-issue-dialog";
import { captureScreenshot } from "@/lib/issues/capture-screenshot";

export interface HelpMenuProps {
  orgId?: string;
}

export function HelpMenu({ orgId }: HelpMenuProps) {
  const router = useRouter();
  const [videoOpen, setVideoOpen] = React.useState(false);
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [issueBlob, setIssueBlob] = React.useState<Blob | null>(null);
  const [replaying, setReplaying] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);

  // NEXT_PUBLIC_ vars are statically inlined at build time and safe to read
  // from a "use client" component. The helper is pure — it does not read
  // process.env itself, so the inlined value flows through as a plain string.
  const videoRes = resolveVideoUrl({
    NEXT_PUBLIC_PGL_INTRO_VIDEO_URL:
      process.env.NEXT_PUBLIC_PGL_INTRO_VIDEO_URL,
  });

  const handleReplay = React.useCallback(async () => {
    if (replaying) return;
    setReplaying(true);
    try {
      // Clear both flags so a prior skip doesn't keep the tour suppressed.
      // Server action merges via mergeOnboardingState (Plan 01).
      const res = await updateOnboardingState({
        tour_completed: false,
        // tour_skipped_at intentionally omitted — mergeOnboardingState allow-lists
        // known keys and cannot accept `null`, but the tour-render gate in
        // subsequent plans reads `tour_completed` only. Keeping the shape
        // minimal avoids shipping a typed-wider partial than Plan 01 supports.
      });
      if (res.ok) {
        // REQUIRED: the parent layout reads `onboarding_state` from the session
        // JWT server-side. A plain state toggle won't re-fire <TourTrigger>;
        // only a full server re-render picks up the new app_metadata.
        router.refresh();
      }
    } finally {
      setReplaying(false);
    }
  }, [replaying, router]);

  const handleReportIssue = React.useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const blob = await captureScreenshot().catch(() => null);
      setIssueBlob(blob);
    } finally {
      setCapturing(false);
      setIssueOpen(true);
    }
  }, [capturing]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Help"
            className="h-8 w-8 min-h-0 min-w-0"
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setVideoOpen(true);
            }}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Watch intro video
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={replaying}
            onSelect={(e) => {
              e.preventDefault();
              void handleReplay();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {replaying ? "Resetting…" : "Replay product tour"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={capturing}
            onSelect={(e) => {
              e.preventDefault();
              void handleReportIssue();
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            {capturing ? "Capturing page…" : "Report an issue"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Welcome to Phronesis</DialogTitle>
            <DialogDescription>
              A 2-minute walkthrough of the core workflow.
            </DialogDescription>
          </DialogHeader>
          {videoRes.kind === "url" ? (
            pickVideoRenderer(videoRes.url) === "iframe" ? (
              <div className="aspect-video w-full overflow-hidden rounded-md border border-[var(--border-subtle)]">
                <iframe
                  src={videoRes.url}
                  title="Phronesis intro video"
                  className="h-full w-full"
                  allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <video
                src={videoRes.url}
                controls
                className="aspect-video w-full rounded-md border border-[var(--border-subtle)]"
              />
            )
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Video coming soon — check back after the demo.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReportIssueDialog
        open={issueOpen}
        onOpenChange={(next) => {
          setIssueOpen(next);
          if (!next) setIssueBlob(null);
        }}
        target={{
          // TargetType union is "prospect" | "list" | "persona" | "search" | "none".
          // The Help menu is a page-agnostic entry point, so "none" is the right
          // variant — no context-specific snapshot to surface beyond the page URL
          // that captureContext() already attaches.
          type: "none",
          snapshot: orgId ? { orgId, source: "help-menu" } : { source: "help-menu" },
        }}
        preCapturedScreenshot={issueBlob}
      />
    </>
  );
}
