// Phase 33: Captures contextual signals at report time.
// Runs client-side only (uses window.location, navigator, window.innerWidth).
// The returned object is serialized into the JSON payload sent to /api/issues/report.

import type { TargetType } from "@/types/database";

export interface ReportTarget {
  type: TargetType;
  id?: string;
  snapshot: Record<string, unknown>;
}

export interface CapturedContext {
  page_url: string;
  page_path: string;
  user_agent: string;
  viewport: { w: number; h: number };
  target_type: TargetType;
  target_id?: string;
  target_snapshot: Record<string, unknown>;
}

export function captureContext(target: ReportTarget): CapturedContext {
  if (typeof window === "undefined") {
    throw new Error("captureContext() must run in the browser");
  }
  return {
    page_url: window.location.href,
    page_path: window.location.pathname,
    user_agent: navigator.userAgent,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    target_type: target.type,
    target_id: target.id,
    target_snapshot: target.snapshot,
  };
}
