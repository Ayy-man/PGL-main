---
phase: 33-tenant-issue-reporting-system
plan: "02"
subsystem: tenant-issue-reporting
tags: [html2canvas-pro, screenshot-capture, report-dialog, api-route, form-state]
dependency_graph:
  requires: ["33-01"]
  provides: ["ReportIssueButton", "ReportIssueDialog", "POST /api/issues/report"]
  affects: ["tenant-pages (Plan 03 mounts the button)"]
tech_stack:
  added: ["html2canvas-pro@2.0.2"]
  patterns: ["capture-before-open screenshot", "multipart/form-data POST", "fire-and-forget logActivity", "useState+useTransition dialog form"]
key_files:
  created:
    - src/lib/issues/capture-context.ts
    - src/lib/issues/capture-screenshot.ts
    - src/app/api/issues/report/route.ts
    - src/components/issues/report-issue-button.tsx
    - src/components/issues/report-issue-dialog.tsx
  modified:
    - package.json (added html2canvas-pro@2.0.2)
    - pnpm-lock.yaml
decisions:
  - "Used z.record(z.string(), z.unknown()) — zod v4 requires 2 args, not 1"
  - "capture-before-open: captureScreenshot() called in onClick before setOpen(true)"
  - "All UI primitives available: dialog, button, textarea, label, checkbox"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 2
---

# Phase 33 Plan 02: Tenant UI + API Summary

One-liner: Tenant issue reporting surface — html2canvas-pro capture helpers, capture-before-open dialog trigger, and multipart POST route with fire-and-forget activity logging.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install html2canvas-pro + capture helpers | 6916dbd | package.json, capture-context.ts, capture-screenshot.ts |
| 2 | POST /api/issues/report route handler | 6f15c3f | src/app/api/issues/report/route.ts |
| 3 | ReportIssueButton + ReportIssueDialog components | 791effe | report-issue-button.tsx, report-issue-dialog.tsx |

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| src/lib/issues/capture-context.ts | 36 | captureContext() — returns page_url, page_path, user_agent, viewport, target fields |
| src/lib/issues/capture-screenshot.ts | 31 | captureScreenshot() — dynamic import html2canvas-pro, 2s soft timeout, returns Blob|null |
| src/app/api/issues/report/route.ts | 180 | POST handler — multipart, zod validation, storage upload, fire-and-forget logActivity |
| src/components/issues/report-issue-button.tsx | 64 | Trigger button — capture-before-open pattern |
| src/components/issues/report-issue-dialog.tsx | 211 | Dialog form — 5 categories, textarea, screenshot checkbox, success toast |

## html2canvas-pro Version

Installed: `html2canvas-pro@2.0.2`

Rationale: This project's `globals.css` defines all shadcn color tokens using `oklch()`. The plain `html2canvas@1.4.1` has no oklch parser and crashes on every capture. `html2canvas-pro` is a maintained fork with identical API that adds oklch support. Loaded via dynamic `import()` so it is NOT included in the main tenant bundle.

## UI Primitive Imports

All shadcn UI primitives required by the dialog were already available:
- `src/components/ui/dialog.tsx` — Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter (all exported)
- `src/components/ui/button.tsx` — Button
- `src/components/ui/textarea.tsx` — Textarea
- `src/components/ui/label.tsx` — Label
- `src/components/ui/checkbox.tsx` — Checkbox

No substitutions were needed. No new UI dependencies added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 z.record() requires two arguments**
- **Found during:** Task 2 (TypeScript typecheck after writing route.ts)
- **Issue:** Plan specified `z.record(z.unknown())` but the project uses zod v4.3.6. In zod v4, `z.record()` requires both a key schema and a value schema: `z.record(keyType, valueType)`. Single-arg form was removed.
- **Fix:** Changed to `z.record(z.string(), z.unknown())` — semantically identical, compatible with zod v4.
- **Files modified:** src/app/api/issues/report/route.ts
- **Commit:** 6f15c3f (fixed inline before commit)

## Known Stubs

None. All components are fully wired:
- `ReportIssueButton` calls real `captureScreenshot()` and renders real `ReportIssueDialog`
- `ReportIssueDialog` POSTs to real `/api/issues/report` endpoint
- API route inserts into real `issue_reports` table and uploads to `issue-reports` storage bucket
- `logActivity` is called fire-and-forget with `issue_reported` action type

The button is not yet mounted on any page — that is Plan 03's responsibility.

## Threat Flags

None. The new endpoint `/api/issues/report`:
- Requires authenticated user (returns 401 if not authed)
- Requires tenant context from JWT (returns 403 if missing)
- Uses user-scoped `createClient()` — RLS enforces tenant isolation
- No new public endpoints introduced
- Screenshot upload uses authenticated storage path scoped to `{tenant_id}/{report_id}`

## Self-Check: PASSED

All created files verified present:
- FOUND: src/lib/issues/capture-context.ts
- FOUND: src/lib/issues/capture-screenshot.ts
- FOUND: src/app/api/issues/report/route.ts
- FOUND: src/components/issues/report-issue-button.tsx
- FOUND: src/components/issues/report-issue-dialog.tsx

All commits verified:
- 6916dbd — feat(33-02): install html2canvas-pro@2.0.2 + create capture-context/screenshot helpers
- 6f15c3f — feat(33-02): create POST /api/issues/report route handler
- 791effe — feat(33-02): create ReportIssueButton + ReportIssueDialog client components

TypeScript: zero new errors in any `src/lib/issues/`, `src/app/api/issues/`, or `src/components/issues/` file.
