# Phase 33: Tenant Issue Reporting System — Research

**Researched:** 2026-04-10
**Domain:** Supabase Storage + html2canvas/screenshot capture + Next.js 14 multipart upload + admin nav badge polling
**Confidence:** HIGH (all critical claims verified against live codebase or npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Entry points (contextual only):** Prospect dossier page header, List detail page header, Search page (via `SearchContent` client component, top-right of filter bar), Personas list page header. No global topbar button.
- **Context capture:** ALL THREE signals per report — JSON snapshot, deep link (`page_url`), client-rendered screenshot via `html2canvas` dynamic import.
- **Categories:** `incorrect_data`, `missing_data`, `bad_source`, `bug`, `other`.
- **Database schema:** Exact DDL locked (see CONTEXT.md). Migration filename: `20260410_issue_reports.sql`.
- **Storage:** Private bucket `issue-reports`, path `{tenant_id}/{report_id}.png`, user-scoped upload, admin signed-URL read (60-min TTL).
- **Tenant API:** `POST /api/issues/report`, `multipart/form-data`, `req.formData()`, `createClient()` + `auth.getUser()`, zod validation, fire-and-forget `logActivity`.
- **Admin UI:** `/admin/reports` list + `/admin/reports/[id]` detail, mirrors `tenant-table.tsx` and `persona-form-dialog.tsx` patterns.
- **Admin API routes:** GET list, GET detail, PATCH status/notes, GET unread-count. All mirror `src/app/api/admin/tenants/route.ts`.
- **Admin nav:** Add "Issue Reports" to `ADMIN_NAV_PLATFORM` in `admin-nav-links.tsx` with unread badge fetched on mount.
- **Notifications:** In-app badge only. No email, no Slack, no Inngest.
- **Dialog UX:** shadcn Dialog, `useState` + `useTransition`, no react-hook-form. 2-second soft timeout for html2canvas; fall back to `screenshot_path = null`.
- **New dependency:** `html2canvas` dynamic import in `src/lib/issues/capture-screenshot.ts`.
- **Types:** Add `IssueReport`, `IssueCategory`, `IssueStatus`, `TargetType` to `src/types/database.ts`. Add `'issue_reported'` to `ActionType` in `src/lib/activity-logger.ts`.

### Claude's Discretion
- Exact React component file layout inside `src/components/issues/`
- Icon choice for report trigger button (Bug, Flag, or AlertTriangle)
- Exact Tailwind class strings (must match dark-luxury aesthetic in `persona-form-dialog.tsx`)
- Filter UI primitive for admin list filters (Select vs segmented buttons — match existing tenant-table pattern)
- Zod schema field ordering and error message copy
- Default page size for admin list (suggest 25)
- Relative-time formatter (reuse existing pattern if project has one)

### Deferred Ideas (OUT OF SCOPE)
- Tenant-visible history of past reports
- Email / Slack notifications
- GitHub / Linear integration
- Bulk admin actions
- Per-row "report this lead" action inside list members table
- i18n of category labels
</user_constraints>

---

## Summary

Phase 33 is greenfield — zero existing `issue_reports` table, zero `/admin/reports` routes, zero `src/lib/issues/` or `src/components/issues/` directories. The codebase has excellent reference patterns for every required surface, so implementation is primarily a cloning and wiring exercise.

**Critical blocker discovered:** The project's `globals.css` defines every shadcn/design-system color variable using `oklch()` (e.g., `--background: oklch(0.9866 0.0051 67.7649)`). `html2canvas` 1.4.1 — the package named in CONTEXT.md — does not parse `oklch()` and will throw `"Attempting to parse an unsupported color function"` on every screenshot attempt in this codebase. The fix is `html2canvas-pro` (same API, same dynamic-import pattern, 55 KB gzipped vs 46 KB, verified oklch support). This is a one-word name change in the import; zero other code changes required.

**`set_updated_at()` trigger function does NOT exist** in any migration. The CONTEXT.md schema references it — the Phase 33 migration must define it (CREATE OR REPLACE) before the trigger or the migration will fail.

**Primary recommendation:** Use `html2canvas-pro` instead of `html2canvas`, prepend `CREATE OR REPLACE FUNCTION set_updated_at()` to the migration, and follow existing admin polling pattern (60-second `setInterval` with `clearInterval` cleanup) for the unread badge.

---

## Standard Stack

### Core (all already in project — no new installs except screenshot library)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `html2canvas-pro` | 2.0.2 | Client-rendered page screenshots with oklch support | Drop-in replacement for `html2canvas`; same API; handles project's CSS variable color space. See Pitfall 1. |
| `@supabase/supabase-js` | already installed | Storage upload + signed URL for private bucket | Used in all existing upload routes |
| `@radix-ui/react-dialog` | already installed | Report dialog UI | Locked decision; existing pattern in `persona-form-dialog.tsx` |
| `zod` | ^4.3.6 (installed) | Server-side payload validation | Project convention — zod validates API bodies only, never client forms |
| `lucide-react` | already installed | Icons | All admin nav icons use lucide-react |

**Installation (one new package):**
```bash
npm install html2canvas-pro
```

> `html2canvas` (original) must NOT be installed alongside `html2canvas-pro` — name them differently in import to avoid confusion.

### No New Supporting Libraries

All other required primitives are already present: `useToast`, `createClient`, `createAdminClient`, `requireSuperAdmin`, `logActivity`, `@radix-ui/react-dialog`.

---

## Architecture Patterns

### Recommended File Layout

```
supabase/migrations/
└── 20260410_issue_reports.sql          # new migration (set_updated_at fn + table + indexes + RLS comment)

src/
├── types/database.ts                   # ADD: IssueReport, IssueCategory, IssueStatus, TargetType
├── lib/
│   ├── activity-logger.ts              # ADD: 'issue_reported' to ActionType union
│   └── issues/
│       ├── capture-context.ts          # captures page_url, page_path, user_agent, viewport, target snapshot
│       └── capture-screenshot.ts       # dynamic import of html2canvas-pro, 2s timeout, returns Blob | null
├── components/issues/
│   ├── report-issue-button.tsx         # thin wrapper: receives target prop, renders trigger button
│   └── report-issue-dialog.tsx         # full dialog: form state, screenshot capture, POST submit
└── app/
    ├── api/
    │   ├── issues/report/route.ts      # POST: formData() parse, zod, storage upload, DB insert, logActivity
    │   └── admin/reports/
    │       ├── route.ts                # GET list (filters, pagination)
    │       ├── [id]/route.ts           # GET detail + PATCH status/notes
    │       └── unread-count/route.ts   # GET { open: N }
    └── admin/
        ├── admin-nav-links.tsx         # EDIT: add Issue Reports nav entry + badge
        └── reports/
            ├── page.tsx                # server component, requireSuperAdmin, initial fetch
            ├── reports-table.tsx       # client component: table + mobile cards
            └── [id]/
                ├── page.tsx            # server: fetch report + signed URL
                └── report-detail.tsx   # client: status dropdown + notes + save
```

### Pattern 1: Multipart Form-Data in App Router Route Handler

**What:** Parse `multipart/form-data` with `await req.formData()` — no third-party parser needed.

**Evidence:** `src/app/api/upload/logo/route.ts` does exactly this. [VERIFIED: read from codebase]

```typescript
// Source: src/app/api/upload/logo/route.ts (existing pattern)
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const tenantId = formData.get("tenantId") as string | null;
  // ... imperative validation on file size/type
}
```

For the issues route, the `payload` field is a JSON string serialized by the client:
```typescript
// In POST /api/issues/report
const formData = await req.formData();
const payloadRaw = formData.get("payload") as string | null;
const screenshot = formData.get("screenshot") as File | null;

// Parse and validate JSON payload with zod
const parsed = issuePayloadSchema.safeParse(JSON.parse(payloadRaw ?? "{}"));

// Validate screenshot imperatively (not via zod)
if (screenshot) {
  if (screenshot.size > 5 * 1024 * 1024) { /* 400 */ }
  if (!["image/png", "image/jpeg"].includes(screenshot.type)) { /* 400 */ }
}
```

### Pattern 2: Supabase Storage Upload (this project's canonical pattern)

**What:** Two existing routes do uploads (`/api/upload/logo` and `/api/prospects/[prospectId]/photo`). Both use `createAdminClient()` and the public `"general"` bucket with `getPublicUrl()`. [VERIFIED: read from codebase]

**Critical difference for Phase 33:** The `issue-reports` bucket is **private**. The upload CONTEXT says user-scoped client (`createClient()`); admin reads use `createAdminClient()` + `createSignedUrl()`. No existing code in this project uses `createSignedUrl` — it will be net-new. [VERIFIED: grep found zero instances of `createSignedUrl` in `src/`]

**Upload pattern (user-scoped, honors bucket RLS):**
```typescript
// In POST /api/issues/report — user-scoped client, honors bucket INSERT policy
const supabase = await createClient();
const screenshotPath = `${tenantId}/${reportId}.png`;
const { error: uploadError } = await supabase.storage
  .from("issue-reports")
  .upload(screenshotPath, screenshotBuffer, {
    contentType: "image/png",
    upsert: false,
  });
// If upload fails: fall back to screenshotPath = null, continue insert
```

**Signed URL pattern (admin-scoped, for detail page):**
```typescript
// In GET /api/admin/reports/[id] — admin client, generates 60-min signed URL
const admin = createAdminClient();
const { data: signedData } = await admin.storage
  .from("issue-reports")
  .createSignedUrl(report.screenshot_path, 3600); // 3600s = 60 min
const screenshotUrl = signedData?.signedUrl ?? null;
```

### Pattern 3: Admin Super-Admin Gate (exact replica from tenants route)

[VERIFIED: read `src/app/api/admin/tenants/route.ts`]

```typescript
// Source: src/app/api/admin/tenants/route.ts
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();
  // ... query with admin client
}
```

All four admin report routes (`GET list`, `GET detail`, `PATCH`, `GET unread-count`) replicate this pattern exactly.

### Pattern 4: Admin Nav Badge — Polling Pattern

**What:** The admin nav component (`admin-nav-links.tsx`) is a `"use client"` component. It currently has NO badge/count rendering on any nav item. [VERIFIED: read full file — zero `useState`, zero `useEffect`, zero data fetching]

**Existing project polling pattern** (from `src/app/admin/page.tsx`): [VERIFIED]
```typescript
// 60-second background polling — project-standard pattern
useEffect(() => {
  const interval = setInterval(() => fetchUnreadCount(), 30_000); // 30s for nav badge
  return () => clearInterval(interval); // cleanup on unmount
}, [fetchUnreadCount]);
```

**Wiring the badge:**
```typescript
"use client";
import { useState, useEffect, useCallback } from "react";

export function AdminNavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const [openCount, setOpenCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports/unread-count");
      if (res.ok) {
        const data = await res.json();
        setOpenCount(data.open ?? 0);
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount(); // on mount
    const interval = setInterval(fetchUnreadCount, 30_000); // every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // In the "Issue Reports" link render:
  // {openCount > 0 && (
  //   <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">
  //     {openCount > 99 ? "99+" : openCount}
  //   </span>
  // )}
}
```

**SSR safety:** The component is already `"use client"` — no server rendering concern. `fetch` only runs client-side after hydration. The `openCount` initializes to `0` so no hydration mismatch.

### Pattern 5: Dialog Form (clone of `persona-form-dialog.tsx`)

[VERIFIED: read full file]

Key structural elements to replicate:
- `useState` + `useTransition` (no react-hook-form — project rule)
- `const [isPending, startTransition] = useTransition()`
- `const [error, setError] = useState<string | null>(null)`
- Error banner: `<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>`
- Submit button disabled during `isPending`: `disabled={isPending}`
- Controlled `open`/`onOpenChange` with `internalOpen` fallback for uncontrolled use
- `resetForm()` called `onOpenChange` when `next === true` (opening)

### Pattern 6: Relative-Time Formatter

The project has no shared utility — each component inlines its own formatter. [VERIFIED: grep shows `formatRelativeTime` defined locally in 4+ components]

The admin error-feed has the canonical inline pattern:
```typescript
// Source: src/components/admin/error-feed.tsx
function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
```

Inline this function in `reports-table.tsx` — do not extract to shared util (project pattern is per-file).

### Anti-Patterns to Avoid

- **Do NOT use `html2canvas`** (original package) — crashes on oklch colors in this project. Use `html2canvas-pro`.
- **Do NOT use `request.json()`** in the issues report route — the payload is multipart, not JSON. Use `req.formData()`.
- **Do NOT block the response on `logActivity()`** — call as fire-and-forget: `logActivity({...}).catch(() => {})`.
- **Do NOT add zod validation to client-side form fields** — project convention is server-only zod validation. Client uses `useState` with imperative checks.
- **Do NOT import `createAdminClient` in any Client Component** — server-only per project convention.
- **Do NOT use `getPublicUrl()` for the `issue-reports` bucket** — it is private; always use `createSignedUrl`.
- **Do NOT call `html2canvas` while the report dialog is open** — the dialog overlay will be captured. See Pitfall 3.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| oklch-compatible screenshots | Custom CSS color parser | `html2canvas-pro` | Handles all modern color functions; same API as html2canvas |
| Dialog UI | Custom modal | `@radix-ui/react-dialog` (already installed) | Focus trap, portal, escape key, accessibility — existing pattern |
| Super-admin auth check | Custom role guard in routes | `user.app_metadata?.role !== "super_admin"` check (mirror tenants route) | Already tested pattern in production |
| Server-side RLS bypass | Custom service client | `createAdminClient()` | Already handles service role key; never import in client components |
| Signed storage URLs | Custom pre-signed URL generator | `admin.storage.from(...).createSignedUrl(path, ttl)` | Supabase SDK handles signature + expiry |
| Toast notifications | Custom toast | `useToast()` hook (already installed) | Project standard — used in multiple existing components |

---

## Critical Finding: `set_updated_at()` Trigger Function

**FINDING: This function does NOT exist in any migration file.** [VERIFIED: grep across all 8 migration files — zero matches for `set_updated_at`, `trigger`, or `EXECUTE FUNCTION`]

The CONTEXT.md schema includes:
```sql
CREATE TRIGGER issue_reports_updated_at
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

If the migration runs as-is, PostgreSQL will throw: `ERROR: function set_updated_at() does not exist`.

**Resolution:** The Phase 33 migration MUST prepend the function definition:

```sql
-- 20260410_issue_reports.sql
-- Ensure set_updated_at trigger function exists (shared utility)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then the table DDL from CONTEXT.md follows...
CREATE TABLE issue_reports ( ... );
```

Using `CREATE OR REPLACE` is safe — if a future migration adds this function globally, re-running is idempotent.

**Precedent:** Other tables with `updated_at` in this project (`research_sessions`, `platform_config`, `prospect_editing`) do NOT use a trigger — they set `updated_at` manually or rely on `DEFAULT now()` only. The trigger is a net-new pattern introduced in Phase 33.

---

## Critical Finding: html2canvas vs html2canvas-pro

### The Problem

`globals.css` defines ALL shadcn color tokens using `oklch()` color function. [VERIFIED: read file]

```css
:root {
  --background: oklch(0.9866 0.0051 67.7649);
  --foreground: oklch(0.3382 0.0143 62.9371);
  --primary:    oklch(0.5752 0.0488 63.2507);
  /* ... 40+ more oklch() values */
}
```

`html2canvas` 1.4.1 source does NOT contain the string `oklch`. [VERIFIED: searched dist file] It will throw on every screenshot attempt in this codebase.

### The Solution

`html2canvas-pro` 2.0.2 is a fork with identical API that adds oklch support. [VERIFIED: `oklch` found in dist source]

| Metric | html2canvas 1.4.1 | html2canvas-pro 2.0.2 |
|--------|-------------------|-----------------------|
| Minified size | 199 KB | 226 KB |
| Gzipped size | ~46 KB | ~56 KB |
| oklch support | No (crashes) | Yes |
| Drop-in replacement | — | Yes — same import API |
| npm latest | 1.4.1 | 2.0.2 |

The ~10 KB gzip delta is acceptable for a dynamically-imported library.

**Usage in `capture-screenshot.ts`:**
```typescript
// src/lib/issues/capture-screenshot.ts
export async function captureScreenshot(): Promise<Blob | null> {
  try {
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await Promise.race([
      html2canvas(document.body, {
        useCORS: true,         // cross-origin images (LinkedIn/Apollo CDN photos)
        allowTaint: false,     // keep canvas untainted for toBlob()
        logging: false,
        scale: window.devicePixelRatio || 1,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)), // 2s soft timeout
    ]);
    if (!canvas) return null; // timeout fired
    return await new Promise<Blob | null>((resolve) =>
      (canvas as HTMLCanvasElement).toBlob(resolve, "image/png")
    );
  } catch {
    return null; // any error → graceful fallback
  }
}
```

### Screenshot Timing: Dialog Overlay Problem

If `captureScreenshot()` is called while the dialog is open, the dialog overlay covers the page content — the screenshot will show the dialog instead of the dossier/list/search context.

**Recommended approach (close-then-capture):**

The dialog should NOT be open when the screenshot is taken. The submit handler should:
1. Capture the screenshot BEFORE opening the dialog, triggered when the user clicks "Report an issue".
2. Store the Blob in component state; dialog opens with screenshot already captured.

```typescript
// In ReportIssueButton onClick:
const handleOpen = async () => {
  // Capture BEFORE dialog renders
  const blob = await captureScreenshot();
  setScreenshotBlob(blob); // null if capture failed
  setDialogOpen(true);
};
```

This avoids the dialog-in-screenshot problem entirely. The captured screenshot reflects the page state at click time (correct) and the dialog has the blob available when the user clicks Submit.

**Alternative (if pre-capture is not feasible):** Use a `ref` to the underlying page content div (excluding the dialog portal, which renders outside the main tree via a portal). However, pre-capture is simpler and more reliable.

---

## Common Pitfalls

### Pitfall 1: html2canvas oklch Crash
**What goes wrong:** `html2canvas(document.body)` throws `"Attempting to parse an unsupported color function 'oklch'"` — the screenshot errors out, the dialog's catch fires, and `screenshot_path = null` every time.
**Why it happens:** This project uses oklch throughout globals.css; html2canvas 1.4.1 has no oklch parser.
**How to avoid:** Install `html2canvas-pro` instead. Same API, same dynamic import. [CITED: github.com/niklasvh/html2canvas/issues/3269]
**Warning signs:** Console shows "Attempting to parse an unsupported color function" during any screenshot attempt.

### Pitfall 2: Missing `set_updated_at()` Function
**What goes wrong:** Migration fails with `ERROR: function set_updated_at() does not exist` when applying `20260410_issue_reports.sql`.
**Why it happens:** No prior migration defines this function. No other table in the project uses a trigger for `updated_at`.
**How to avoid:** Prepend `CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;` to the migration.
**Warning signs:** Migration fails immediately at `CREATE TRIGGER` line.

### Pitfall 3: Dialog Overlay in Screenshot
**What goes wrong:** Screenshot captures the report dialog itself rather than the underlying page.
**Why it happens:** `html2canvas(document.body)` includes all DOM nodes — including the dialog portal.
**How to avoid:** Capture the screenshot when the user clicks "Report an issue" (BEFORE the dialog opens), store the Blob in state, then open the dialog.
**Warning signs:** Screenshot in admin detail view shows the report dialog form instead of the dossier.

### Pitfall 4: Cross-Origin Images Tainting Canvas
**What goes wrong:** Prospect avatar images loaded from LinkedIn CDN or Apollo CDN cause `SecurityError: Tainted canvases may not be exported` when `canvas.toBlob()` is called.
**Why it happens:** Cross-origin images without CORS headers taint the canvas, blocking data extraction.
**How to avoid:** Pass `useCORS: true` and `allowTaint: false` to html2canvas-pro. Images that can't be loaded CORS will be omitted from the screenshot silently — acceptable.
**Warning signs:** `SecurityError` in console when submitting report on prospect dossier pages.

### Pitfall 5: `createSignedUrl` is New — No Existing Abstraction
**What goes wrong:** Implementer looks for a helper and doesn't find one, then builds one unnecessarily or calls `getPublicUrl` (which returns a non-functional URL for private buckets).
**Why it happens:** All existing storage code uses `getPublicUrl` on the public `"general"` bucket. [VERIFIED: grep confirmed zero instances of `createSignedUrl` in `src/`]
**How to avoid:** Call `admin.storage.from("issue-reports").createSignedUrl(path, 3600)` directly in the detail route — no wrapper needed.
**Warning signs:** Screenshot URL in admin UI returns 400/403 instead of loading.

### Pitfall 6: Tenant Cannot SELECT Own Reports (by design)
**What goes wrong:** Implementer accidentally adds a SELECT RLS policy for tenants or the client form tries to verify submission via a SELECT query.
**Why it happens:** CONTEXT.md explicitly states "Tenant users cannot SELECT any rows from this table" — success feedback is the toast only.
**How to avoid:** Only INSERT policy for tenants. Admin routes use service-role client (bypasses RLS). Verify with: `from('issue_reports').select()` via user-scoped client should return empty/error.
**Warning signs:** Tenant can see their own submitted reports in the console.

### Pitfall 7: `logActivity` Blocks Response
**What goes wrong:** POST response takes 300-500ms longer than expected; if `logActivity` throws, the report endpoint fails.
**Why it happens:** Implementer awaits `logActivity(...)` before `return NextResponse.json(...)`.
**How to avoid:** Fire-and-forget: `logActivity({...}).catch(() => {})` with no `await`. Return the `{ id }` response immediately after the DB insert.
**Warning signs:** Slow POST responses; 500 errors when activity log table is unreachable.

---

## Zod Validation Pattern

**Validate JSON payload field with zod; validate File imperatively:**

```typescript
// src/app/api/issues/report/route.ts
import { z } from "zod";

const issuePayloadSchema = z.object({
  category: z.enum(["incorrect_data", "missing_data", "bad_source", "bug", "other"]),
  description: z.string().min(1).max(5000),
  page_url: z.string().url(),
  page_path: z.string().min(1),
  user_agent: z.string().optional(),
  viewport: z.object({ w: z.number(), h: z.number() }).optional(),
  target_type: z.enum(["prospect", "list", "persona", "search", "none"]).optional(),
  target_id: z.string().uuid().optional(),
  target_snapshot: z.record(z.unknown()).optional(),
});

// In the route handler:
const payloadRaw = formData.get("payload") as string | null;
if (!payloadRaw) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

let payloadParsed: unknown;
try { payloadParsed = JSON.parse(payloadRaw); }
catch { return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }); }

const parsed = issuePayloadSchema.safeParse(payloadParsed);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
}

// Validate screenshot imperatively
const screenshot = formData.get("screenshot") as File | null;
if (screenshot) {
  if (screenshot.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Screenshot exceeds 5MB" }, { status: 400 });
  }
  if (!["image/png", "image/jpeg"].includes(screenshot.type)) {
    return NextResponse.json({ error: "Screenshot must be PNG or JPEG" }, { status: 400 });
  }
}
```

**Note on zod 4.3.6:** `z.instanceof(File)` works in this version [VERIFIED: live test in project's node environment]. However, the recommended pattern is imperative validation for the file field — consistent with how `src/app/api/upload/logo/route.ts` handles it and avoids server-side `File` constructor availability issues in some edge runtime environments.

---

## Admin Nav Badge: Implementation Detail

**Current state of `admin-nav-links.tsx`:** [VERIFIED: read full file]
- `"use client"` directive — yes
- Any `useState` or `useEffect` — NO
- Any data fetching — NO
- Any badge rendering — NO

The component is a pure static render of nav links with `usePathname()` for active state. Adding the badge requires adding React state/effects. Since it's already a client component, this is a one-line addition to imports and straightforward state wiring.

**Important:** The `AdminSidebar` and `AdminMobileSidebar` both render `<AdminNavLinks />`. The badge will appear in both sidebars automatically since they share the same component. The 30-second polling means the badge stays fresh without a full navigation.

---

## Admin Layout: Cross-Tenant Data Access

**Finding:** `src/app/admin/layout.tsx` contains ONLY: [VERIFIED: read file]
1. `requireSuperAdmin()` guard
2. `AdminSidebar`, `AdminMobileSidebar`, `TopBar` layout components
3. `{children}` slot

There is NO cross-tenant prospect viewer, no deep-link to tenant dossiers, no impersonation flow. The admin layout is a shell only.

Conclusion: The CONTEXT.md design decision (snapshot + screenshot substitute for cross-tenant data access) aligns with the existing admin architecture. No conflict.

---

## Greenfield Confirmation: No Duplicate Routes or Tables

Verified no conflicts: [VERIFIED: grep + directory listing]
- No `issue_reports` table in any migration
- No `/admin/reports` directory in `src/app/admin/`
- No `/api/admin/reports` directory in `src/app/api/admin/`
- No `/api/issues/` directory in `src/app/api/`
- No `src/lib/issues/` directory
- No `src/components/issues/` directory
- No `report` or `feedback` keyword hits in admin pages or migrations

Phase 33 is entirely net-new.

---

## Mount Point Reality Check

All four pages where `<ReportIssueButton>` mounts are confirmed to exist: [VERIFIED]

| Page | Path | Server/Client | Mount location |
|------|------|---------------|----------------|
| Prospect dossier | `src/app/[orgId]/prospects/[prospectId]/page.tsx` | Server Component | Header action row — `<ProfileView>` renders the header; button mounts in `page.tsx` before or alongside `ProfileView` |
| List detail | `src/app/[orgId]/lists/[listId]/page.tsx` | Server Component | Page header above `<ListMemberTable>` |
| Search | `src/app/[orgId]/search/page.tsx` → `SearchContent` | Client Component (`"use client"`) | Top-right of filter bar inside `<SearchContent>` |
| Personas | `src/app/[orgId]/personas/page.tsx` | Server Component | Page header above `<PersonasLayout>` |

**Note for Search page:** `SearchContent` is a client component. Mounting `<ReportIssueButton>` there is straightforward — no "client component inside server component" concern.

**Note for Server Component pages:** `<ReportIssueButton>` is a client component (`"use client"`) that uses `useState` and `useTransition`. When mounted inside a Server Component page, it must be imported as a client boundary. This is standard Next.js 14 App Router pattern.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `html2canvas` (oklch crashes) | `html2canvas-pro` (oklch supported) | Drop-in; no API changes |
| Manual `updated_at` in SQL | Trigger function `set_updated_at()` | New pattern for this project — must define function in migration |
| Public storage bucket only | Private bucket + signed URLs | First private bucket in project; `createSignedUrl` is net-new |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `html2canvas-pro` 2.0.2 correctly parses oklch without producing visually wrong colors | html2canvas section | Screenshot colors wrong but not crash; low risk since we verified the string `oklch` exists in its source |
| A2 | 2-second soft timeout is sufficient for most pages (some complex pages with many images may time out) | Capture screenshot pattern | Screenshot submitted as null more often than expected; mitigation: extend to 3s if feedback says so |
| A3 | The `issue-reports` storage bucket needs bucket-level RLS policies configured in Supabase dashboard (not in migration) | Storage section | Upload fails with 403 if bucket policies not configured; this is a manual dashboard step documented in CONTEXT.md |

---

## Open Questions

1. **`screenshot_path` vs full signed URL stored**
   - What we know: CONTEXT.md stores only `screenshot_path` (the storage path string), not a full signed URL. Signed URL is generated fresh at read time.
   - What's unclear: No ambiguity — this is the correct pattern (signed URLs expire; storing the path allows generating fresh ones).
   - Recommendation: Store path only. Confirmed correct.

2. **Prospect dossier page — where exactly in the header does the button mount?**
   - What we know: `page.tsx` imports `<ProfileView>` which renders the full profile. The "header action row" is likely inside `<ProfileView>`.
   - What's unclear: Whether the button goes inside `ProfileView` (requiring a prop) or outside in `page.tsx`.
   - Recommendation: Mount in `page.tsx` next to the `<ProfileView>` component, passing target data as props. This is additive (new button mount only) and doesn't require modifying `ProfileView` internals.

---

## Environment Availability

Step 2.6: All required tools are standard Next.js 14 / Supabase. No external CLI dependencies needed for this phase beyond the existing npm toolchain.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `npm install html2canvas-pro` | Yes | (project uses pnpm lock) | — |
| Supabase Storage (private bucket) | Screenshot storage | Requires manual dashboard setup | — | None — must create bucket before verification |
| `html2canvas-pro` | Screenshot capture | Not yet installed | 2.0.2 (latest) | — |

**Missing dependencies with no fallback:**
- `html2canvas-pro` package — must `npm install html2canvas-pro` in Wave 0

**Manual Supabase dashboard tasks (blocking verification):**
1. Apply migration `20260410_issue_reports.sql`
2. Create private storage bucket named `issue-reports`
3. Configure bucket INSERT policy: authenticated users can upload to `{tenant_id}/*` paths
4. Configure `issue_reports` table RLS: INSERT allowed where `tenant_id = auth.jwt() ->> 'app_metadata' ->> 'tenant_id'`

---

## Validation Architecture

> `nyquist_validation` not set in `.planning/config.json` — treating as enabled per convention.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (configured) |
| Config file | `vitest.config.ts` (root, verified) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |
| Typecheck command | `npx tsc --noEmit` |
| Lint command | `npm run lint` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Command | File Exists? |
|-----|----------|-----------|---------|-------------|
| DB-01 | `issue_reports` table exists with correct columns + indexes | Manual / smoke | Apply migration, verify in Supabase dashboard | N/A — migration |
| DB-02 | `set_updated_at()` trigger fires on UPDATE | Manual | `UPDATE issue_reports SET admin_notes='x' WHERE id=...`, verify `updated_at` changes | N/A — DB |
| API-01 | `POST /api/issues/report` returns 201 with `{ id }` | Manual smoke | curl / form submit | ❌ Wave 0 |
| API-02 | Missing description → 400 | Unit | `vitest`: call handler with mock formData, assert 400 | ❌ Wave 0 |
| API-03 | Description > 5000 chars → 400 | Unit | `vitest`: assert 400 | ❌ Wave 0 |
| API-04 | Screenshot > 5MB → 400 | Unit | `vitest`: assert 400 | ❌ Wave 0 |
| API-05 | Non-super_admin hitting `/api/admin/reports` → 403 | Unit | Mock `app_metadata.role = 'tenant_user'`, assert 403 | ❌ Wave 0 |
| API-06 | PATCH to `resolved` sets `resolved_by` + `resolved_at` | Manual smoke | PATCH via admin UI, verify row in DB | N/A — smoke |
| API-07 | Unread count decrements when status changes from `open` | Manual smoke | Change status, re-fetch badge count | N/A — smoke |
| STORAGE-01 | Screenshot PNG stored at `{tenant_id}/{report_id}.png` | Manual smoke | Submit report with screenshot, verify file in bucket | N/A — smoke |
| STORAGE-02 | Signed URL renders in admin detail view (60-min TTL) | Manual smoke | Open admin detail, verify `<img>` loads | N/A — smoke |
| TENANT-01 | Tenant cannot SELECT from `issue_reports` via user-scoped client | Manual | Run `supabase.from('issue_reports').select()` as tenant user, confirm empty/403 | N/A — RLS |
| SCREENSHOT-01 | `html2canvas-pro` completes without oklch crash | Manual smoke | Open dialog on prospect dossier, confirm screenshot uploads | N/A — browser |
| SCREENSHOT-02 | html2canvas timeout → form still submits with `screenshot_path = null` | Manual | Simulate 3s delay (slow network), verify form submits | N/A — browser |
| TYPES-01 | TypeScript compiles cleanly after adding new types | Automated | `npx tsc --noEmit` — must be zero errors | ❌ Wave 0 adds types |
| LINT-01 | `npm run lint` passes with no new violations | Automated | `npm run lint` | Existing |

### Sampling Rate
- **Per task commit:** `npm run lint && npx tsc --noEmit`
- **Per wave merge:** `npm test -- --run && npm run lint && npx tsc --noEmit`
- **Phase gate:** Full lint + typecheck green + all smoke tests passing before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/issues/report/route.ts` — needs unit tests for zod validation edge cases (API-02, API-03, API-04)
- [ ] `src/app/api/admin/reports/route.ts` — needs unit test for 403 guard (API-05)
- [ ] Vitest environment is `"node"` (confirmed in `vitest.config.ts`) — browser-only APIs (`File`, `FormData`, `fetch`) need mocking in tests. Use `vi.fn()` for `createClient`, `createAdminClient`.

---

## Sources

### Primary (HIGH confidence)
- Live codebase — read directly: `src/app/api/prospects/add-to-list/route.ts`, `src/app/api/admin/tenants/route.ts`, `src/app/admin/admin-nav-links.tsx`, `src/app/admin/tenants/tenant-table.tsx`, `src/app/admin/layout.tsx`, `src/app/[orgId]/personas/components/persona-form-dialog.tsx`, `src/lib/activity-logger.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`, `src/app/api/upload/logo/route.ts`, `src/app/admin/page.tsx`, `src/app/globals.css`
- npm registry: `html2canvas@1.4.1` (199 KB minified / 46 KB gzip), `html2canvas-pro@2.0.2` (226 KB minified / 56 KB gzip), `modern-screenshot@4.6.8`
- Vitest config: `vitest.config.ts` — confirmed `environment: 'node'`, exclude `.claude/**`
- grep audit: confirmed zero `set_updated_at`, `createSignedUrl`, `issue_report`, or `feedback` references anywhere in `src/` or `supabase/migrations/`
- Binary content check: confirmed `oklch` NOT in `html2canvas` dist; confirmed `oklch` IS in `html2canvas-pro` dist

### Secondary (MEDIUM confidence)
- [html2canvas oklch issue #3269](https://github.com/niklasvh/html2canvas/issues/3269) — community-confirmed, multiple reporters
- [html2canvas-pro npm package](https://www.npmjs.com/package/html2canvas-pro) — listed as `html2canvas-pro@2.0.2` on npm registry

### Tertiary (LOW confidence)
- None — all claims in this research were verified against codebase or npm registry.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry and live codebase
- Architecture: HIGH — all patterns verified by reading canonical reference files
- Pitfalls: HIGH — oklch crash verified by binary source inspection; trigger absence verified by grep; signed URL absence verified by grep
- Test mapping: MEDIUM — no existing test for this domain; test structure inferred from `vitest.config.ts` and existing test files

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable stack — no fast-moving dependencies)
