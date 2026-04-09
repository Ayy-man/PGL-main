---
phase: 33
slug: tenant-issue-reporting-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TBD (planner to confirm — likely vitest or jest based on Next.js 14 project) |
| **Config file** | TBD |
| **Quick run command** | `npm run test -- --run <targeted-file>` (to be finalized by planner) |
| **Full suite command** | `npm run test && npm run lint && npm run typecheck` |
| **Estimated runtime** | ~TBD seconds (planner to measure after Wave 0) |

---

## Sampling Rate

- **After every task commit:** Run quick test command for the files touched
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Populated by planner during PLAN.md creation. Each task in each PLAN.md must have a row here
> with its requirement, automated command, and file existence check.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Planner must ensure Wave 0 establishes:

- [ ] Test harness installed if not present (confirm vitest/jest already configured)
- [ ] `src/components/issues/__tests__/report-issue-dialog.test.tsx` — dialog form state stub
- [ ] `src/lib/issues/__tests__/capture-context.test.ts` — context capture stub
- [ ] `src/lib/issues/__tests__/capture-screenshot.test.ts` — screenshot capture with mocked html2canvas-pro
- [ ] `src/app/api/issues/report/__tests__/route.test.ts` — multipart POST stub
- [ ] `src/app/api/admin/reports/__tests__/route.test.ts` — super_admin gate + filter stub
- [ ] `src/app/api/admin/reports/[id]/__tests__/route.test.ts` — PATCH status transition stub
- [ ] `src/app/api/admin/reports/unread-count/__tests__/route.test.ts` — badge count stub

*If project has no existing test framework configured: Wave 0 MUST install and configure vitest + @testing-library/react before any test stubs land.*

---

## Manual-Only Verifications

Behaviors that cannot be automated and must be verified by hand during `/gsd-verify-work`:

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end tenant submission renders toast | User-visible feedback | Toast UI is browser-only | 1. Log in as tenant. 2. Open prospect dossier. 3. Click "Report an issue". 4. Fill form. 5. Submit. 6. Confirm toast "Thanks — we'll take a look". |
| Screenshot captures page content, not the dialog | Core capture-before-open invariant | Requires visual inspection of actual PNG | 1. Submit report with screenshot checkbox on. 2. Open admin detail view. 3. Verify PNG shows the dossier page, NOT the report dialog overlay. |
| Admin detail screenshot renders via signed URL | Storage + signed URL pattern | Requires real Supabase env + network | 1. Log in as super_admin. 2. Open report detail. 3. Confirm screenshot `<img>` loads successfully. 4. Right-click → Open in new tab → confirm URL is a signed Supabase URL (not public). |
| Tenant A cannot SELECT tenant B reports | RLS policy configured in dashboard | RLS policies live in Supabase dashboard, not migrations | 1. Open browser devtools as tenant. 2. Run `supabase.from('issue_reports').select()` in console. 3. Confirm returns empty array or RLS error. |
| Non-super_admin hitting `/admin/reports` redirects | `requireSuperAdmin()` gate | Next.js middleware/layout redirect | 1. Log in as tenant user. 2. Navigate to `/admin/reports`. 3. Confirm redirect to `/login`. |
| Badge unread count decrements on status change | Client polling + PATCH | Requires 30-60s polling window | 1. Open `/admin/reports` in two tabs. 2. In tab 1, change status open → investigating. 3. In tab 2, wait for next poll interval. 4. Confirm badge count decreased by 1. |
| `html2canvas-pro` handles oklch CSS variables | Core correctness invariant | Requires browser DOM + real CSS | 1. Submit report from dossier page. 2. Confirm no JS error in console. 3. Confirm screenshot renders (not a blank/broken PNG). |
| `html2canvas-pro` timeout fallback | Graceful degradation | Hard to simulate hang | 1. (Manual test) Throw an exception inside the capture helper temporarily. 2. Submit. 3. Confirm row has `screenshot_path = null` and toast still shows success. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
