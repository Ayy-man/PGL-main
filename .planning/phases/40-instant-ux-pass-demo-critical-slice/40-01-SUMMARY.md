---
phase: 40-instant-ux-pass-demo-critical-slice
plan: 01
subsystem: planning-artifact
tags: [audit, handoff, phase-40.1, mutating-surfaces, realtime, optimistic, skeleton]
requires: []
provides:
  - ".planning/phases/40-instant-ux-pass-demo-critical-slice/40-AUDIT.md"
  - "handoff-checklist-for-phase-40.1"
affects: []
tech-stack:
  added: []
  patterns:
    - "per-phase audit doc as handoff artifact (first use in PGL planning)"
key-files:
  created:
    - ".planning/phases/40-instant-ux-pass-demo-critical-slice/40-AUDIT.md"
  modified: []
decisions:
  - "Merged POST+DELETE tags rows into a single surface — mirrors CONTEXT which counts them as one instant-UX surface"
  - "Demoted server research POST endpoint (row #26) to `already done` — Phase 27 SSE shimmer already handles it; the Phase 40 treatment is verify-only on the client wrapper (row #29)"
  - "Added P1 polling-fallback helper as an explicit audit row (not just a footnote) so CONTEXT's 11-surface count reconciles exactly"
  - "Resolved recon's 8 unverified admin candidates: 4 real (rows #31–#34), 4 false positives (no /api/admin/users routes; automations endpoints are GET-only); documented in Admin section"
  - "Included admin Server Actions (createTenant/toggleTenantStatus/createUser/toggleUserStatus) — recon missed these because they live in src/app/admin/actions.ts not under api/admin"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-15"
  tasks: 2
  files: 1
---

# Phase 40 Plan 01: Mutating Surface Audit — Summary

**One-liner:** Produced `40-AUDIT.md` — a 38-entry table of every mutating surface in the app with latency category, instant-UX strategy, file:line reference, and Phase 40 / 40.1 assignment. Hand-off checklist for Phase 40.1 planner is now ready.

---

## What Was Built

A single Markdown artifact at `.planning/phases/40-instant-ux-pass-demo-critical-slice/40-AUDIT.md` (161 lines). Structure:

- **Legend** — defines latency categories (FAST / SLOW / BACKGROUND) and strategies (optimistic / realtime / skeleton / none / already done)
- **Server Actions table** — 13 rows across `lists/actions.ts`, `personas/actions.ts`, `admin/actions.ts`
- **Tenant-App Route Handlers table** — 17 rows from `/api/prospects/**`, `/api/search/**`, `/api/apollo/**`, `/api/issues/**`
- **Admin Route Handlers table** — 4 rows (the complete admin-mutation surface, verified via Task 1)
- **Realtime Channels table** — 4 rows (R1–R4) + polling helper (P1)
- **Phase 40 Scope Summary** — breakdown of the 11 demo-critical surfaces by treatment
- **Phase 40.1 Checklist** — 23 treatment applications for the next phase, grouped by category
- **Count Reconciliation** — explains how 33 numbered rows + 4 channels + 1 helper = 38 total, and how the 11 Phase-40 rows map 1:1 to CONTEXT `<specifics>`
- **Source-of-Truth Statements** — 5 invariants the audit guarantees

## Task Breakdown

### Task 1 — Verify unverified admin routes on disk

Walked `src/app/api/admin/**/route.ts` (19 files total) and enumerated all exported HTTP methods. Admin candidates resolved:

| Candidate | Status | Outcome |
|-----------|--------|---------|
| `/api/admin/tenants/[id]` PATCH | **confirmed** | Row #33 |
| `/api/admin/api-keys/config` POST | **confirmed** | Row #31 |
| `/api/admin/api-keys/test/[integration]` POST | **confirmed** | Row #32 |
| `/api/admin/reports/[id]` PATCH | **confirmed** | Row #34 |
| `/api/admin/users/**/route.ts` | **NOT FOUND** | Admin user CRUD is Server Actions only (`createUserAction`, `toggleUserStatusAction` — rows #12, #13) |
| `/api/admin/automations/**` mutation | **NOT FOUND** | Automation routes exist but are all GET-only (dashboards) |
| `/api/admin/tenants/[id]` DELETE | **NOT FOUND** | Soft-delete happens via `toggleTenantStatusAction` (#11) |
| Any other `/api/admin/**` mutation | none | Exhaustive walk confirmed only the 4 above |

### Task 2 — Write 40-AUDIT.md with full 28+ surface table

Shipped. Final counts: 11 Phase=40, 23 Phase=40.1, 4 already-done, for 38 total entries across 4 tables. Every row has non-blank Strategy and Phase columns. Every file:line reference was verified on disk at base commit `f8d59ec`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Worktree `.planning/` did not contain phase 40 files**
- **Found during:** Task start (before Task 1)
- **Issue:** This worktree's branch (`worktree-agent-a0619a86`) is based on a pre-phase-40 commit. Plan file `40-01-PLAN.md` and `40-CONTEXT.md` did not exist in the worktree filesystem; only reachable via `git show f8d59ec:<path>`.
- **Fix:** Read the plan + CONTEXT + ROADMAP Phase 40/40.1 entries via `git show` against base commit `f8d59ec`. Created the phase directory fresh via `mkdir -p` before writing the audit.
- **Files modified:** `.planning/phases/40-instant-ux-pass-demo-critical-slice/` (created), `40-AUDIT.md` (new)
- **Commit:** `f314bd0`
- **Note:** Not a bug in the plan — a consequence of executing in a detached worktree. No code change.

**2. [Clarification, not a deviation] Merged tags POST+DELETE into one row**
- **Found during:** Post-draft review when `| 40 |` count was 12 instead of 11
- **Decision:** CONTEXT `<specifics>` counts `addProspectTag / removeProspectTag` as a single surface. The plan seed used `POST/DELETE /api/prospects/[id]/tags` as one row. I originally split them; merged back to match CONTEXT. This is an alignment with the plan, not a deviation.

**3. [Clarification, not a deviation] Demoted research server POST endpoint to `already done`**
- **Found during:** Same review pass
- **Decision:** CONTEXT specifies the research work is "verify-only" — the Phase 27 SSE shimmer already exists. Treating the server route as Phase 40 work double-counted; the canonical Phase 40 row is #29 (client wrapper where the shimmer mount is verified). Server endpoint #26 is the Phase 27 baseline = `already done`.

**4. [Clarification, not a deviation] Added polling fallback (P1) as an explicit audit row**
- **Found during:** Same review pass
- **Decision:** CONTEXT `<specifics>` row 11 is "Fallback — polling every 10s if WS fails — shared utility". It's one of the 11 Phase 40 items. Including it as an audit row (rather than only mentioning in a summary footnote) makes the `| 40 |` count reconcile exactly.

### Authentication Gates

None — this plan produces a documentation artifact only.

### Architectural Questions

None — no code changes proposed, and the strategy choices per row are inherited from CONTEXT `<decisions>` (LOCKED) and the plan's seed table.

## Verification Results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `40-AUDIT.md` exists | yes | yes | ✅ |
| Line count | > 120 | 161 | ✅ |
| Phase = 40 rows | exactly 11 | 11 | ✅ |
| Phase = 40.1 rows | ≥ 17 | 23 | ✅ |
| Blank Strategy column | 0 rows | 0 | ✅ |
| Blank Phase column | 0 rows | 0 | ✅ |
| Every Phase-40 row in CONTEXT `<specifics>` | yes | yes (one-to-one verified) | ✅ |
| Every "verify path" resolved | yes | yes (no TODO cells) | ✅ |
| ~8 recon admin candidates addressed | 8 addressed | 4 confirmed rows + 4 documented false positives = 8 | ✅ |
| Contains header `\| Surface \| File \| Strategy \| Phase \|` | yes | yes (4 separate tables, all include these columns) | ✅ |

Every plan-level `must_haves.truths` checks out.

## Handoff Notes for Phase 40.1 Planner

1. Open `40-AUDIT.md` — filter for `Phase = 40.1`. That is your complete ordered work queue (23 treatment applications across ~17 distinct surfaces).
2. Group by file before wave planning. The Server Action files (`lists/actions.ts`, `personas/actions.ts`, `admin/actions.ts`) are heavy hitters — plan disjoint-file waves to avoid collisions the way Plans 40-02 + 40-03 did.
3. All strategy choices are already decided in column `Strategy`. **Do not replan them.** If you disagree with a choice, escalate via a Rule 4 checkpoint before starting.
4. Admin routes (rows #31–#34) require super_admin server-side guards — check that Phase 42's `requireWriteRole()` pattern applies (or the existing inline `user.app_metadata?.role !== "super_admin"` checks are sufficient for the admin-only routes).
5. The realtime polling fallback (P1) from Plan 40-04 is the shared helper — reuse it for row #27 (`/api/search/[searchId]/refresh`) which is the only 40.1 `realtime`-strategy surface.

## Self-Check: PASSED

- `40-AUDIT.md` exists: **FOUND** (`.planning/phases/40-instant-ux-pass-demo-critical-slice/40-AUDIT.md`, 161 lines)
- Commit `f314bd0` exists: **FOUND** (`git log --oneline` top of branch)
- All 11 Phase-40 rows present with non-blank Strategy + Phase: **VERIFIED** via grep
- All 23 Phase-40.1 rows present: **VERIFIED** via grep
- Admin route verification complete (Task 1): **VERIFIED** — 4 confirmed + 4 documented false positives = 8 candidates addressed

No missing artifacts. No stale references. No TODO cells in the Notes column.
