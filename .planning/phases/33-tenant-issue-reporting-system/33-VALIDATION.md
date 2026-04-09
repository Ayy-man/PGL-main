---
phase: 33
slug: tenant-issue-reporting-system
status: populated
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-10
updated: 2026-04-10
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (already configured — `vitest.config.ts` at repo root) |
| **Config file** | `vitest.config.ts` (environment: `node`) |
| **Quick run command** | `npm test -- --run <path-pattern>` |
| **Full suite command** | `npm test -- --run && npm run lint && npx tsc --noEmit` |
| **Typecheck** | `npx tsc --noEmit` |
| **Lint** | `npm run lint` |
| **Estimated runtime** | ~30-60s for full suite |

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit` on the touched files + `grep`-based acceptance criteria checks
- **After every plan wave:** Full suite (`npm test -- --run && npm run lint && npx tsc --noEmit`)
- **Before `/gsd-verify-work`:** Full suite must be green + all manual smoke tests passing
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-T1 | 01 | 1 | REQ-33-01, REQ-33-02 | — | Trigger fn defined with plpgsql, table CHECKs enforce enum domains | Static / grep | `grep -q "CREATE OR REPLACE FUNCTION set_updated_at" supabase/migrations/20260410_issue_reports.sql && grep -q "CREATE TABLE issue_reports" supabase/migrations/20260410_issue_reports.sql && grep -q "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260410_issue_reports.sql` | ✅ created in task | ⬜ pending |
| 33-01-T2 | 01 | 1 | REQ-33-03, REQ-33-04 | — | TS types mirror DB CHECK constraints (type narrows to valid enums) | Typecheck | `grep -q "export interface IssueReport" src/types/database.ts && grep -c "issue_reported" src/lib/activity-logger.ts \| grep -q "^2$" && npx tsc --noEmit` | ✅ edit existing | ⬜ pending |
| 33-01-T3 | 01 | 1 | REQ-33-01 | — | Migration applied to live DB; RLS enabled | Manual / CLI | `supabase migration list \| grep -q "20260410_issue_reports"` | N/A (DB state) | ⬜ pending |
| 33-01-T4 | 01 | 1 | REQ-33-05, REQ-33-06 | T-33-01 (cross-tenant read) | RLS INSERT-only, no SELECT for tenants; bucket private | Manual / dashboard | SQL editor: `SELECT polname FROM pg_policy WHERE polrelid = 'issue_reports'::regclass` returns 1 INSERT row; `SELECT name FROM storage.buckets WHERE name = 'issue-reports'` returns 1 row | N/A (dashboard) | ⬜ pending |
| 33-02-T1 | 02 | 2 | REQ-33-07, REQ-33-08, REQ-33-09 | — | No new package pulls html2canvas@1.x (oklch crash); dynamic import keeps bundle lean | Static / grep + typecheck | `grep -q "\"html2canvas-pro\"" package.json && ! grep -q "\"html2canvas\":" package.json && test -f src/lib/issues/capture-context.ts && test -f src/lib/issues/capture-screenshot.ts && grep -q "await import(\"html2canvas-pro\")" src/lib/issues/capture-screenshot.ts && npx tsc --noEmit` | ✅ created in task | ⬜ pending |
| 33-02-T2 | 02 | 2 | REQ-33-12 | T-33-02 (unauth tenant POST), T-33-03 (oversized upload DoS) | User-scoped client honors RLS; zod validates payload; 5MB file cap; fire-and-forget activity log | Unit + static | `vitest src/app/api/issues/report/__tests__/route.test.ts --run` + `grep -q "issuePayloadSchema" src/app/api/issues/report/route.ts && ! grep -q "createAdminClient" src/app/api/issues/report/route.ts && grep -q "\\.catch(() =>" src/app/api/issues/report/route.ts && grep -q "5 \\* 1024 \\* 1024" src/app/api/issues/report/route.ts` | ✅ created in task | ⬜ pending (Wave 0 test file) |
| 33-02-T3 | 02 | 2 | REQ-33-10, REQ-33-11, REQ-33-13, REQ-33-14 | — | Capture-before-open prevents self-leak; no client-side form framework means smaller attack surface | Static / grep + typecheck | `grep -q "captureScreenshot" src/components/issues/report-issue-button.tsx && grep -q "preCapturedScreenshot" src/components/issues/report-issue-dialog.tsx && ! grep -q "react-hook-form" src/components/issues/report-issue-dialog.tsx && grep -q "useTransition" src/components/issues/report-issue-dialog.tsx && grep -q "Thanks — we'll take a look" src/components/issues/report-issue-dialog.tsx && npx tsc --noEmit` | ✅ created in task | ⬜ pending |
| 33-03-T1 | 03 | 3 | REQ-33-15, REQ-33-16 | — | Mount is additive only; no existing auth bypass | Static / grep + typecheck | `grep -q "ReportIssueButton" src/app/\[orgId\]/prospects/\[prospectId\]/page.tsx && grep -q "type: \"prospect\"" src/app/\[orgId\]/prospects/\[prospectId\]/page.tsx && grep -q "ReportIssueButton" src/app/\[orgId\]/lists/\[listId\]/page.tsx && grep -q "type: \"list\"" src/app/\[orgId\]/lists/\[listId\]/page.tsx && npx tsc --noEmit` | ✅ edit existing | ⬜ pending |
| 33-03-T2 | 03 | 3 | REQ-33-17, REQ-33-18 | — | Mount NOT on settings/admin/auth (explicitly forbidden) | Static / grep + negative greps | `grep -q "ReportIssueButton" src/app/\[orgId\]/personas/page.tsx && grep -rq "ReportIssueButton" src/app/\[orgId\]/search/ && ! grep -rq "ReportIssueButton" src/app/\[orgId\]/settings/ && ! grep -rq "ReportIssueButton" src/app/admin/ && npx tsc --noEmit` | ✅ edit existing | ⬜ pending |
| 33-04-T1 | 04 | 2 | REQ-33-19, REQ-33-20, REQ-33-21, REQ-33-22 | T-33-04 (admin endpoint IDOR), T-33-05 (signed URL leakage) | super_admin gate on all routes; signed URL TTL = 3600s (1h); auto-populate resolved_by/resolved_at on state transition | Unit + static | `vitest src/app/api/admin/reports/__tests__ --run` + `grep -q "createSignedUrl" src/app/api/admin/reports/\[id\]/route.ts && grep -q "super_admin" src/app/api/admin/reports/route.ts && grep -q "resolved_by" src/app/api/admin/reports/\[id\]/route.ts && grep -q "\"open\"" src/app/api/admin/reports/unread-count/route.ts && npx tsc --noEmit` | ✅ created in task | ⬜ pending (Wave 0 test files) |
| 33-04-T2 | 04 | 2 | REQ-33-23, REQ-33-24 | — | Server page gated by requireSuperAdmin(); client table only consumes already-authed data | Static / grep + typecheck + build | `grep -q "requireSuperAdmin" src/app/admin/reports/page.tsx && grep -q "\"use client\"" src/app/admin/reports/reports-table.tsx && grep -q "md:hidden" src/app/admin/reports/reports-table.tsx && grep -q "md:table" src/app/admin/reports/reports-table.tsx && npx tsc --noEmit` | ✅ created in task | ⬜ pending |
| 33-04-T3 | 04 | 2 | REQ-33-25, REQ-33-26 | T-33-05 | Screenshot served via ephemeral signed URL only; status transitions audit-logged via resolved_by/at | Static / grep + typecheck | `grep -q "createSignedUrl" src/app/admin/reports/\[id\]/page.tsx && grep -q "method: \"PATCH\"" src/app/admin/reports/\[id\]/report-detail.tsx && grep -q "JSON.stringify" src/app/admin/reports/\[id\]/report-detail.tsx && ! grep -q "react-hook-form" src/app/admin/reports/\[id\]/report-detail.tsx && npx tsc --noEmit` | ✅ created in task | ⬜ pending |
| 33-05-T1 | 05 | 4 | REQ-33-27, REQ-33-28, REQ-33-29, REQ-33-30 | — | Polling ignores errors silently (no info leak); no auth token in URL | Static / grep + typecheck + build | `grep -q "AlertTriangle" src/app/admin/admin-nav-links.tsx && grep -q "Issue Reports" src/app/admin/admin-nav-links.tsx && grep -q "setInterval(fetchUnreadCount, 30_000)" src/app/admin/admin-nav-links.tsx && grep -q "clearInterval" src/app/admin/admin-nav-links.tsx && grep -q "99+" src/app/admin/admin-nav-links.tsx && npx tsc --noEmit` | ✅ edit existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Planner must ensure Wave 0 (as part of Plan 02 / Plan 04 tasks) establishes:

- [x] Test harness already installed (vitest is configured at repo root — no new install needed)
- [ ] `src/app/api/issues/report/__tests__/route.test.ts` — unit tests for 400 cases (missing payload, description > 5000, file > 5MB, invalid category, invalid JSON)
- [ ] `src/app/api/admin/reports/__tests__/route.test.ts` — unit test for 403 non-super_admin gate + 200 super_admin happy path
- [ ] `src/app/api/admin/reports/[id]/__tests__/route.test.ts` — unit test for PATCH resolved transition sets `resolved_by` + `resolved_at`
- [ ] `src/app/api/admin/reports/unread-count/__tests__/route.test.ts` — unit test for 403 + { open: N } shape

**Wave 0 execution note:** These test files do NOT need to be created in a separate pre-task. They can be created inline with their corresponding implementation tasks (Plan 02 Task 2, Plan 04 Task 1) if the executor wants, OR deferred to a follow-up task. The important constraint is that they exist BEFORE `/gsd-verify-work`. If deferred, mark this VALIDATION.md row as `❌ W0` until satisfied.

Vitest environment is `node` — browser APIs (`File`, `FormData`, `fetch`) need mocks:
- Mock `@/lib/supabase/server` → `createClient` returns a mock with `auth.getUser()`, `.from().insert().select().single()`, `.storage.from().upload()`
- Mock `@/lib/supabase/admin` → `createAdminClient` returns a mock with `.from().select().eq().single()`, `.storage.from().createSignedUrl()`
- Mock `@/lib/activity-logger` → `logActivity` as `vi.fn().mockResolvedValue(null)`
- Use `global.FormData` and `global.File` via `vitest/environment` patch or `undici` — vitest@1.x provides `FormData` globally on Node 18+

---

## Manual-Only Verifications

Behaviors that cannot be automated and must be verified by hand during `/gsd-verify-work`:

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end tenant submission renders toast | REQ-33-14 | Toast UI is browser-only | 1. Log in as tenant. 2. Open prospect dossier. 3. Click "Report an issue". 4. Fill form. 5. Submit. 6. Confirm toast `Thanks — we'll take a look`. |
| Screenshot captures page content, not the dialog | REQ-33-10 | Requires visual inspection of actual PNG | 1. Submit report with screenshot checkbox on. 2. Open admin detail view. 3. Verify PNG shows the dossier page, NOT the report dialog overlay. |
| Admin detail screenshot renders via signed URL | REQ-33-20, REQ-33-25 | Requires real Supabase env + network | 1. Log in as super_admin. 2. Open report detail. 3. Confirm screenshot `<img>` loads successfully. 4. Right-click → Open in new tab → confirm URL is a signed Supabase URL (not public). |
| Tenant A cannot SELECT tenant B reports | REQ-33-06 (T-33-01) | RLS policies live in Supabase dashboard, not migrations | 1. Open browser devtools as tenant. 2. Run `await supabase.from('issue_reports').select()` in console. 3. Confirm returns empty array (RLS denies — no matching policy). |
| Non-super_admin hitting `/admin/reports` redirects | REQ-33-23 | Next.js layout redirect via requireSuperAdmin() | 1. Log in as tenant user. 2. Navigate to `/admin/reports`. 3. Confirm redirect to `/login`. |
| Badge unread count decrements on status change | REQ-33-29, REQ-33-30 | Requires 30s polling window | 1. Open `/admin/reports` in two tabs. 2. In tab 1, change status open → investigating. 3. In tab 2, wait for next poll interval (≤30s). 4. Confirm badge count decreased by 1. |
| `html2canvas-pro` handles oklch CSS variables | REQ-33-07 | Requires browser DOM + real CSS | 1. Submit report from dossier page. 2. Confirm no JS error in browser console. 3. Confirm screenshot in admin detail renders actual page colors (not blank/broken). |
| `html2canvas-pro` timeout fallback | REQ-33-09 | Hard to simulate hang | 1. (Dev-only) Throw an exception inside the capture helper temporarily. 2. Submit. 3. Confirm row has `screenshot_path = null` and toast still shows success. |
| Tenant settings/admin/auth pages do NOT show report button | REQ-33-15 to REQ-33-18 (negative) | UI-level verification | 1. Log in as tenant. 2. Visit `/[orgId]/settings`. 3. Confirm no "Report an issue" button. 4. Try auth pages, `/admin/*` as tenant (redirected) — no button visible. |
| PATCH `resolved` transition populates resolved_by/resolved_at | REQ-33-21 | DB-level inspection | 1. Log in as super_admin, open any report. 2. Change status to `resolved`, save. 3. Open Supabase dashboard → `issue_reports` → confirm `resolved_by = <admin user id>` and `resolved_at` is set to ~now(). |
| Screenshot upload failure graceful fallback | REQ-33-12 | Requires simulated upload error | 1. Rename bucket to something else temporarily. 2. Submit report with screenshot. 3. Confirm row inserted with `screenshot_path = null`. 4. Restore bucket name. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers MISSING references (test files for 2 API routes, deferred inline)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Populated by planner on 2026-04-10. Ready for execution.
