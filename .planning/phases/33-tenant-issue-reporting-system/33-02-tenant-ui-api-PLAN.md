---
phase: 33-tenant-issue-reporting-system
plan: 02
type: execute
wave: 2
depends_on: ["33-01"]
files_modified:
  - package.json
  - src/lib/issues/capture-context.ts
  - src/lib/issues/capture-screenshot.ts
  - src/components/issues/report-issue-button.tsx
  - src/components/issues/report-issue-dialog.tsx
  - src/app/api/issues/report/route.ts
autonomous: true
requirements:
  - REQ-33-07  # html2canvas-pro dependency (NOT html2canvas)
  - REQ-33-08  # capture-context.ts: page_url, page_path, user_agent, viewport, target snapshot
  - REQ-33-09  # capture-screenshot.ts: dynamic import html2canvas-pro, 2s soft timeout, Blob|null
  - REQ-33-10  # ReportIssueButton: capture screenshot BEFORE opening dialog
  - REQ-33-11  # ReportIssueDialog: shadcn Dialog + useState + useTransition, no react-hook-form
  - REQ-33-12  # POST /api/issues/report: multipart formData, zod payload, storage upload, fire-and-forget logActivity
  - REQ-33-13  # 5-category radio group + description textarea (1-5000 chars) + screenshot checkbox (default on)
  - REQ-33-14  # Success toast "Thanks — we'll take a look" via useToast

must_haves:
  truths:
    - "html2canvas-pro@2.0.2 is a dependency in package.json (NOT html2canvas)"
    - "captureContext() returns { page_url, page_path, user_agent, viewport: {w,h}, target }"
    - "captureScreenshot() dynamically imports html2canvas-pro, captures document.body, returns Blob | null within 2s"
    - "ReportIssueButton captures screenshot BEFORE opening the dialog (not from within the dialog)"
    - "ReportIssueDialog uses shadcn Dialog + useState + useTransition (zero react-hook-form imports)"
    - "POST /api/issues/report accepts multipart/form-data, validates JSON payload via zod, uploads screenshot to issue-reports bucket, inserts row, returns {id} 201"
    - "Missing description returns 400, description > 5000 chars returns 400, screenshot > 5MB returns 400"
    - "Screenshot upload failure does NOT block insert — screenshot_path = null fallback"
    - "logActivity is called fire-and-forget (no await)"
  artifacts:
    - path: "src/lib/issues/capture-context.ts"
      provides: "captureContext(target) returning CapturedContext shape"
      min_lines: 30
    - path: "src/lib/issues/capture-screenshot.ts"
      provides: "captureScreenshot() returning Promise<Blob | null>"
      min_lines: 25
    - path: "src/components/issues/report-issue-button.tsx"
      provides: "<ReportIssueButton target={...}/> client component"
      min_lines: 40
    - path: "src/components/issues/report-issue-dialog.tsx"
      provides: "<ReportIssueDialog> with form state"
      min_lines: 120
    - path: "src/app/api/issues/report/route.ts"
      provides: "POST handler"
      min_lines: 80
  key_links:
    - from: "src/components/issues/report-issue-button.tsx"
      to: "src/lib/issues/capture-screenshot.ts"
      via: "captureScreenshot() called in onClick BEFORE setOpen(true)"
      pattern: "captureScreenshot\\(\\)"
    - from: "src/components/issues/report-issue-dialog.tsx"
      to: "/api/issues/report"
      via: "fetch POST with FormData containing payload JSON + optional screenshot Blob"
      pattern: "fetch.*api/issues/report"
    - from: "src/app/api/issues/report/route.ts"
      to: "issue_reports table + issue-reports bucket + logActivity"
      via: "createClient() user-scoped insert + storage upload + fire-and-forget activity log"
      pattern: "from\\(['\"]issue_reports['\"]\\)"
---

<objective>
Build the tenant-side reporting surface: capture helpers, button trigger, dialog form, and the POST API route. All user-scoped (RLS honored); no admin concerns.

Purpose: Tenants need a reusable way to submit structured reports with contextual signals (JSON snapshot, deep link, screenshot). This plan delivers the entire tenant path. Plan 03 mounts the button on specific pages; this plan builds the button itself.

Output: `html2canvas-pro` installed, 2 lib helpers, 2 React components, 1 API route. Ready for Plan 03 to mount.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md
@.planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md
@.planning/phases/33-tenant-issue-reporting-system/33-01-SUMMARY.md
@src/app/api/prospects/add-to-list/route.ts
@src/app/api/upload/logo/route.ts
@src/app/[orgId]/personas/components/persona-form-dialog.tsx
@src/lib/supabase/server.ts
@src/lib/activity-logger.ts
@src/types/database.ts
@src/hooks/use-toast.ts
@src/components/ui/dialog.tsx

<interfaces>
<!-- The IssueReport type already exists in src/types/database.ts after Plan 01: -->
```typescript
export type IssueCategory = "incorrect_data" | "missing_data" | "bad_source" | "bug" | "other";
export type TargetType = "prospect" | "list" | "persona" | "search" | "none";

// The ReportIssueButton will accept a target prop:
export interface ReportIssueButtonProps {
  target: {
    type: TargetType;
    id?: string;  // undefined for 'search' / 'none'
    snapshot: Record<string, unknown>;  // frozen key fields captured at report time
  };
  className?: string;
  variant?: "default" | "ghost" | "outline";
}
```

<!-- Canonical add-to-list route pattern (from src/app/api/prospects/add-to-list/route.ts): -->
```typescript
// Auth + tenant extraction:
const supabase = await createClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const tenantId = user.app_metadata?.tenant_id as string | undefined;
if (!tenantId) {
  return NextResponse.json({ error: "No tenant context" }, { status: 403 });
}

// Fire-and-forget activity log:
logActivity({ tenantId, userId: user.id, actionType: "...", targetType: "...", targetId: "...", metadata: {} })
  .catch(() => { /* ignore */ });
```

<!-- logActivity signature (from src/lib/activity-logger.ts): -->
```typescript
export async function logActivity(params: {
  tenantId: string;
  userId: string;
  actionType: ActionType;  // includes 'issue_reported' after Plan 01
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void | null>;
```

<!-- useToast signature (from src/hooks/use-toast.ts): -->
```typescript
const { toast } = useToast();
toast({ title: "Thanks — we'll take a look", description: "...", variant: "default" });
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install html2canvas-pro + create capture-context.ts + capture-screenshot.ts helpers</name>
  <files>package.json, src/lib/issues/capture-context.ts, src/lib/issues/capture-screenshot.ts</files>
  <read_first>
    - package.json (see current dependency format)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (lines 347-425 — html2canvas-pro vs html2canvas finding, capture-screenshot.ts sample code)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (context capture LOCKED section lines 44-49)
  </read_first>
  <action>
    **Step 1: Install the dependency.** Run:
    ```bash
    pnpm add html2canvas-pro@2.0.2
    ```
    (The project uses pnpm per `pnpm-lock.yaml`.) If the install fails due to network/registry issues, surface the error — do NOT substitute html2canvas@1.4.1 (it crashes on oklch colors — see RESEARCH Pitfall 1).

    **Step 2: Create `src/lib/issues/capture-context.ts`** with EXACTLY:

    ```typescript
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
    ```

    **Step 3: Create `src/lib/issues/capture-screenshot.ts`** with EXACTLY:

    ```typescript
    // Phase 33: Client-side page screenshot helper.
    // Uses html2canvas-pro (NOT html2canvas) because the project's globals.css
    // defines all color tokens using oklch() which html2canvas 1.4.1 cannot parse.
    // See 33-RESEARCH.md "Critical Finding: html2canvas vs html2canvas-pro".
    //
    // The 2-second soft timeout is an intentional trade-off: on slow/complex pages
    // the screenshot is dropped (screenshot_path = null) rather than blocking the user.

    export async function captureScreenshot(): Promise<Blob | null> {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return null;
      }
      try {
        const { default: html2canvas } = await import("html2canvas-pro");
        const canvas = await Promise.race([
          html2canvas(document.body, {
            useCORS: true,
            allowTaint: false,
            logging: false,
            scale: window.devicePixelRatio || 1,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        if (!canvas) return null;
        return await new Promise<Blob | null>((resolve) =>
          (canvas as HTMLCanvasElement).toBlob(resolve, "image/png")
        );
      } catch {
        return null;
      }
    }
    ```

    Both files must be client-safe (`typeof window === "undefined"` guards). The screenshot file uses a dynamic `import()` so the html2canvas-pro bundle is NOT included in the tenant's main bundle — it only loads when a user clicks the report button.
  </action>
  <verify>
    <automated>grep -q "\"html2canvas-pro\"" package.json && test -f src/lib/issues/capture-context.ts && test -f src/lib/issues/capture-screenshot.ts && grep -q "captureContext" src/lib/issues/capture-context.ts && grep -q "captureScreenshot" src/lib/issues/capture-screenshot.ts && grep -q "html2canvas-pro" src/lib/issues/capture-screenshot.ts && ! grep -q "from [\"']html2canvas[\"']" src/lib/issues/capture-screenshot.ts && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-02-t1.log && ! grep -q "src/lib/issues/" /tmp/tsc-33-02-t1.log</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` contains `"html2canvas-pro"` in dependencies (exact string)
    - `package.json` does NOT contain `"html2canvas":` (without the `-pro` suffix)
    - `src/lib/issues/capture-context.ts` exists and exports `captureContext` function + `CapturedContext`, `ReportTarget` interfaces
    - `src/lib/issues/capture-screenshot.ts` exists and exports `captureScreenshot` function
    - `capture-screenshot.ts` uses dynamic import: `await import("html2canvas-pro")`
    - `capture-screenshot.ts` does NOT contain `from "html2canvas"` (without the `-pro` suffix)
    - `capture-screenshot.ts` contains the 2000ms timeout pattern: `setTimeout(() => resolve(null), 2000)`
    - `capture-screenshot.ts` passes `useCORS: true, allowTaint: false`
    - `npx tsc --noEmit` passes with zero new errors in `src/lib/issues/`
  </acceptance_criteria>
  <done>Both helpers exist, html2canvas-pro is installed, typecheck is clean.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create POST /api/issues/report route handler (multipart, zod, storage upload, fire-and-forget logActivity)</name>
  <files>src/app/api/issues/report/route.ts</files>
  <read_first>
    - src/app/api/prospects/add-to-list/route.ts (FULL file — canonical tenant POST pattern to mirror)
    - src/app/api/upload/logo/route.ts (formData parsing pattern for multipart)
    - src/lib/activity-logger.ts (logActivity signature)
    - src/lib/supabase/server.ts (createClient function)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (Zod Validation Pattern lines 475-520, Pattern 2 Storage Upload lines 152-181)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Tenant API LOCKED section lines 118-128)
  </read_first>
  <action>
    Create `src/app/api/issues/report/route.ts` with EXACTLY the following structure (adjust whitespace/style to match project conventions from add-to-list/route.ts):

    ```typescript
    import { NextResponse } from "next/server";
    import { z } from "zod";
    import { createClient } from "@/lib/supabase/server";
    import { logActivity } from "@/lib/activity-logger";
    import type { IssueReport } from "@/types/database";

    export const dynamic = "force-dynamic";

    const issuePayloadSchema = z.object({
      category: z.enum([
        "incorrect_data",
        "missing_data",
        "bad_source",
        "bug",
        "other",
      ]),
      description: z.string().min(1).max(5000),
      page_url: z.string().url(),
      page_path: z.string().min(1),
      user_agent: z.string().optional(),
      viewport: z
        .object({ w: z.number(), h: z.number() })
        .optional(),
      target_type: z
        .enum(["prospect", "list", "persona", "search", "none"])
        .optional(),
      target_id: z.string().uuid().optional(),
      target_snapshot: z.record(z.unknown()).optional(),
    });

    const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_SCREENSHOT_TYPES = ["image/png", "image/jpeg"];

    export async function POST(request: Request) {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const tenantId = user.app_metadata?.tenant_id as string | undefined;
      if (!tenantId) {
        return NextResponse.json({ error: "No tenant context" }, { status: 403 });
      }

      // Parse multipart/form-data
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return NextResponse.json(
          { error: "Invalid multipart body" },
          { status: 400 }
        );
      }

      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string" || !payloadRaw) {
        return NextResponse.json(
          { error: "Missing payload field" },
          { status: 400 }
        );
      }

      let payloadParsed: unknown;
      try {
        payloadParsed = JSON.parse(payloadRaw);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON payload" },
          { status: 400 }
        );
      }

      const validation = issuePayloadSchema.safeParse(payloadParsed);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid request",
            details: validation.error.issues,
          },
          { status: 400 }
        );
      }
      const payload = validation.data;

      // Validate optional screenshot file
      const screenshotField = formData.get("screenshot");
      const screenshot =
        screenshotField && typeof screenshotField !== "string"
          ? (screenshotField as File)
          : null;

      if (screenshot) {
        if (screenshot.size > MAX_SCREENSHOT_BYTES) {
          return NextResponse.json(
            { error: "Screenshot exceeds 5MB" },
            { status: 400 }
          );
        }
        if (!ALLOWED_SCREENSHOT_TYPES.includes(screenshot.type)) {
          return NextResponse.json(
            { error: "Screenshot must be PNG or JPEG" },
            { status: 400 }
          );
        }
      }

      // Insert row first WITHOUT screenshot_path to get the generated id,
      // then upload screenshot using that id, then UPDATE screenshot_path.
      // Rationale: we need the row id for the storage path.
      const insertRow = {
        tenant_id: tenantId,
        user_id: user.id,
        category: payload.category,
        description: payload.description,
        page_url: payload.page_url,
        page_path: payload.page_path,
        user_agent: payload.user_agent ?? null,
        viewport: payload.viewport ?? null,
        target_type: payload.target_type ?? "none",
        target_id: payload.target_id ?? null,
        target_snapshot: payload.target_snapshot ?? null,
        screenshot_path: null as string | null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("issue_reports")
        .insert(insertRow)
        .select("id")
        .single();

      if (insertError || !inserted) {
        return NextResponse.json(
          { error: "Failed to create report", details: insertError?.message },
          { status: 500 }
        );
      }
      const reportId = inserted.id as string;

      // Upload screenshot if provided; fall back to null on failure
      let screenshotPath: string | null = null;
      if (screenshot) {
        try {
          const path = `${tenantId}/${reportId}.png`;
          const arrayBuffer = await screenshot.arrayBuffer();
          const { error: uploadError } = await supabase.storage
            .from("issue-reports")
            .upload(path, arrayBuffer, {
              contentType: "image/png",
              upsert: false,
            });
          if (!uploadError) {
            screenshotPath = path;
            await supabase
              .from("issue_reports")
              .update({ screenshot_path: path })
              .eq("id", reportId);
          }
        } catch {
          // swallow — screenshot is optional, report already inserted
        }
      }

      // Fire-and-forget activity log (must NOT block response)
      logActivity({
        tenantId,
        userId: user.id,
        actionType: "issue_reported",
        targetType: "issue_report",
        targetId: reportId,
        metadata: { category: payload.category, screenshot: screenshotPath !== null },
      }).catch(() => {
        /* ignore */
      });

      return NextResponse.json({ id: reportId }, { status: 201 });
    }
    ```

    Critical invariants:
    1. The handler MUST use `req.formData()`, not `req.json()` — the payload is multipart.
    2. The handler MUST call `createClient()` (user-scoped, honors RLS), not `createAdminClient()`.
    3. `logActivity` MUST be fire-and-forget (`.catch(() => {})` with NO `await`) per RESEARCH Pitfall 7.
    4. Screenshot upload failures MUST NOT cause the response to fail — the row is already inserted. Fall back to `screenshot_path = null`.
    5. The insert uses the user-scoped client so the RLS INSERT policy (configured in dashboard by Plan 01 Task 4) enforces `tenant_id = auth.jwt tenant_id`.
  </action>
  <verify>
    <automated>test -f src/app/api/issues/report/route.ts && grep -q "createClient" src/app/api/issues/report/route.ts && ! grep -q "createAdminClient" src/app/api/issues/report/route.ts && grep -q "request.formData" src/app/api/issues/report/route.ts && grep -q "issuePayloadSchema" src/app/api/issues/report/route.ts && grep -q "\"issue-reports\"" src/app/api/issues/report/route.ts && grep -q "actionType: \"issue_reported\"" src/app/api/issues/report/route.ts && grep -q "\\.catch(() =>" src/app/api/issues/report/route.ts && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-02-t2.log && ! grep -q "src/app/api/issues" /tmp/tsc-33-02-t2.log</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/issues/report/route.ts` exists
    - Contains `export const dynamic = "force-dynamic"`
    - Contains `export async function POST`
    - Contains `await request.formData()` (NOT `request.json()`)
    - Contains `createClient` import from `@/lib/supabase/server` (NOT `createAdminClient`)
    - Does NOT contain any import of `createAdminClient` (grep must return zero)
    - Contains zod schema with all 5 categories as enum: `incorrect_data`, `missing_data`, `bad_source`, `bug`, `other`
    - Contains `description` max length of `5000`
    - Contains 5MB file size guard (`5 * 1024 * 1024`)
    - Contains `image/png` and `image/jpeg` allowed types
    - Contains `supabase.storage.from("issue-reports").upload(...)`
    - Contains `actionType: "issue_reported"`
    - Contains fire-and-forget pattern: `logActivity(...).catch(() =>`  (no `await` on logActivity)
    - Returns `{ id }` with status 201 on success
    - `npx tsc --noEmit` passes with zero new errors
  </acceptance_criteria>
  <done>API route compiles, handles all error cases, uses user-scoped client, fire-and-forget activity log.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create ReportIssueButton + ReportIssueDialog client components (capture-before-open pattern)</name>
  <files>src/components/issues/report-issue-button.tsx, src/components/issues/report-issue-dialog.tsx</files>
  <read_first>
    - src/app/[orgId]/personas/components/persona-form-dialog.tsx (FULL file — clone the useState/useTransition/error-banner structure, no react-hook-form)
    - src/components/ui/dialog.tsx (verify shadcn Dialog primitives exported: Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
    - src/hooks/use-toast.ts (useToast hook signature)
    - src/lib/issues/capture-context.ts (from Task 1 — ReportTarget, CapturedContext, captureContext)
    - src/lib/issues/capture-screenshot.ts (from Task 1 — captureScreenshot)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (Screenshot Timing: Dialog Overlay Problem lines 403-425, Pattern 5 Dialog Form lines 251-263)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Dialog UX LOCKED section lines 160-167)
  </read_first>
  <action>
    **Create `src/components/issues/report-issue-button.tsx`** (the trigger):

    ```typescript
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
    ```

    **Create `src/components/issues/report-issue-dialog.tsx`** (the form):

    ```typescript
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
                const body = await res.json().catch(() => ({}));
                setError(body.error ?? "Failed to submit report. Please try again.");
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
    ```

    Critical invariants from RESEARCH + CONTEXT:
    1. NO `react-hook-form` import anywhere — use `useState` + `useTransition` only.
    2. Screenshot is captured in `ReportIssueButton.handleOpen()` BEFORE `setOpen(true)` — not inside the dialog.
    3. The dialog receives `preCapturedScreenshot: Blob | null` as a prop — it never calls `captureScreenshot()` itself.
    4. Error banner matches persona-form-dialog: `rounded-md bg-destructive/10 p-3 text-sm text-destructive`.
    5. Submit button label: `"Sending..."` (pending) vs `"Send report"` (idle).
    6. Success toast uses exact copy: `"Thanks — we'll take a look"`.
    7. If the project's ui/textarea or ui/checkbox components have different names/paths, update imports to match (run `ls src/components/ui/` to confirm).
  </action>
  <verify>
    <automated>test -f src/components/issues/report-issue-button.tsx && test -f src/components/issues/report-issue-dialog.tsx && grep -q "\"use client\"" src/components/issues/report-issue-button.tsx && grep -q "\"use client\"" src/components/issues/report-issue-dialog.tsx && grep -q "captureScreenshot" src/components/issues/report-issue-button.tsx && grep -q "setCapturedBlob" src/components/issues/report-issue-button.tsx && ! grep -q "react-hook-form" src/components/issues/report-issue-dialog.tsx && grep -q "useTransition" src/components/issues/report-issue-dialog.tsx && grep -q "useState" src/components/issues/report-issue-dialog.tsx && grep -q "Thanks — we'll take a look" src/components/issues/report-issue-dialog.tsx && grep -q "/api/issues/report" src/components/issues/report-issue-dialog.tsx && grep -q "preCapturedScreenshot" src/components/issues/report-issue-dialog.tsx && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-02-t3.log && ! grep -q "src/components/issues" /tmp/tsc-33-02-t3.log</automated>
  </verify>
  <acceptance_criteria>
    - Both component files exist
    - Both start with `"use client"`
    - `report-issue-button.tsx` calls `captureScreenshot()` BEFORE `setOpen(true)` in `handleOpen`
    - `report-issue-button.tsx` passes `preCapturedScreenshot={capturedBlob}` to the dialog
    - `report-issue-dialog.tsx` does NOT contain any `react-hook-form` import (grep must return zero)
    - `report-issue-dialog.tsx` uses `useState` + `useTransition` (both present)
    - `report-issue-dialog.tsx` contains all 5 category values: `incorrect_data`, `missing_data`, `bad_source`, `bug`, `other`
    - `report-issue-dialog.tsx` posts to `/api/issues/report` via `fetch`
    - `report-issue-dialog.tsx` contains the exact success toast copy: `Thanks — we'll take a look`
    - `report-issue-dialog.tsx` contains the error banner pattern: `rounded-md bg-destructive/10`
    - `report-issue-dialog.tsx` disables the submit button when `isPending`
    - `npx tsc --noEmit` passes with zero new errors in `src/components/issues/`
  </acceptance_criteria>
  <done>Both components compile, follow the capture-before-open pattern, use the project's dialog form convention.</done>
</task>

</tasks>

<verification>
- `pnpm add html2canvas-pro@2.0.2` succeeded — `package.json` updated
- `grep "html2canvas-pro" package.json` passes
- `! grep "\"html2canvas\":" package.json` passes (no old package)
- All 5 files exist: `capture-context.ts`, `capture-screenshot.ts`, `route.ts`, `report-issue-button.tsx`, `report-issue-dialog.tsx`
- Zero `react-hook-form` imports in any new file
- `npx tsc --noEmit` is clean
- `npm run lint` is clean
</verification>

<success_criteria>
1. Tenant can import `<ReportIssueButton target={...} />` from `@/components/issues/report-issue-button` (Plan 03 uses this)
2. Clicking the button captures a screenshot via html2canvas-pro, stores the Blob, then opens the dialog
3. Submitting the form POSTs multipart data to `/api/issues/report`, which inserts a row and uploads the screenshot to `issue-reports/{tenant_id}/{report_id}.png`
4. Success toast appears, dialog closes, form resets
5. Failure modes handled: invalid category (400), description too long (400), screenshot too big (400), screenshot upload fail (row still inserted with screenshot_path = null)
</success_criteria>

<output>
After completion, create `.planning/phases/33-tenant-issue-reporting-system/33-02-SUMMARY.md` documenting:
- html2canvas-pro version installed
- All 5 files created with line counts
- Any deviations from CONTEXT.md patterns (expected: none)
- Any ui primitive imports that differed from what was assumed (e.g., if the project doesn't have `ui/checkbox` and a raw input was used instead)
</output>
