# Phase 40 — Mutating Surface Audit

**Generated:** 2026-04-15 by Plan 40-01
**Source:** Recon agent scan + 40-CONTEXT.md seed table + Plan 40-01 Task 1 admin-route verification
**Purpose:** Enumerate every mutating surface in the app with its chosen instant-UX strategy and the phase in which it ships. Phase 40.1 works directly from this table — filter `Phase = 40.1` for the post-Maggie work queue.

---

## Legend

- **Latency category** (discovery aid for strategy choice):
  - `FAST` — local DB write, no external I/O, typical < 200 ms end-to-end
  - `SLOW` — external API call (Apollo / ContactOut / Exa / LLM), typical 2–30 s
  - `BACKGROUND` — fires an Inngest event and returns immediately; real work completes async (seconds to minutes)
- **Strategy:**
  - `optimistic` — local state update before server response, reconcile on reply, rollback + toast on error
  - `realtime` — Supabase postgres_changes channel pushes server state; UI reconciles on payload
  - `skeleton` — loading placeholder rows/cards replace the "spinner-only" state during SLOW / BACKGROUND calls
  - `none` — no instant-UX treatment planned (already fast, or already handled by existing UI, or low-value)
  - `already done` — surface already had the treatment before Phase 40 started (baseline evidence in Notes)
- **Phase:**
  - `40` — this phase (demo-critical, ships before Maggie demo)
  - `40.1` — post-Maggie rollout (see Phase 40.1 Checklist below)
  - `already done` — no Phase 40 or 40.1 work needed; treatment landed in an earlier phase
  - `—` — deliberately not addressed (architectural / out-of-scope)

---

## Server Actions (13 confirmed mutating functions across 3 files)

| # | Surface | File:Line | Latency | Strategy | Phase | Notes |
|---|---------|-----------|---------|----------|-------|-------|
| 1 | `createListAction` | `src/app/[orgId]/lists/actions.ts:38` | FAST | optimistic | 40 | Plan 40-05. New list appears in `ListGrid` immediately with `pending: true` visual. |
| 2 | `deleteListAction` | `src/app/[orgId]/lists/actions.ts:66` | FAST | optimistic | 40 | Plan 40-05. Disappear immediately + undo toast, restore on rollback or user undo. |
| 3 | `updateMemberStatusAction` | `src/app/[orgId]/lists/actions.ts:84` | FAST | optimistic | 40.1 | High-freq in-table dropdown; mirrors `removeFromListAction` pattern. |
| 4 | `updateMemberNotesAction` | `src/app/[orgId]/lists/actions.ts:102` | FAST | optimistic | 40.1 | Debounce + optimistic text update. |
| 5 | `removeFromListAction` | `src/app/[orgId]/lists/actions.ts:120` | FAST | already done | already done | Baseline: `src/app/[orgId]/lists/components/list-member-table.tsx:142` — canonical optimistic + undo-toast pattern Plans 40-05 and 40-06 mirror. |
| 6 | `addToListAction` | `src/app/[orgId]/lists/actions.ts:139` | FAST | optimistic | 40.1 | Dialog flow; optimistic close + add-to-pending-set. Phase 40 ships the POST `/api/prospects/add-to-list` path (#27) which is the primary trigger; action form remains for legacy flow. |
| 7 | `createPersonaAction` | `src/app/[orgId]/personas/actions.ts:13` | FAST | optimistic | 40.1 | Card appears in persona grid immediately with pending-state stripe. |
| 8 | `updatePersonaAction` | `src/app/[orgId]/personas/actions.ts:95` | FAST | optimistic | 40.1 | Inline field update + rollback on error. |
| 9 | `deletePersonaAction` | `src/app/[orgId]/personas/actions.ts:164` | FAST | optimistic | 40.1 | Remove card + undo toast (mirror list delete). |
| 10 | `createTenantAction` | `src/app/admin/actions.ts:13` | FAST | optimistic | 40.1 | Admin-only. Row appears in tenant table immediately; `inviteUserByEmail` side effect masked by toast. |
| 11 | `toggleTenantStatusAction` | `src/app/admin/actions.ts:60` | FAST | optimistic | 40.1 | Admin-only. Toggle updates immediately, reverts on error. |
| 12 | `createUserAction` | `src/app/admin/actions.ts:88` | FAST | optimistic | 40.1 | Admin-only. Row appears in users table immediately. Email invite side effect (async) is fire-and-forget — surface the eventual result via toast. |
| 13 | `toggleUserStatusAction` | `src/app/admin/actions.ts:164` | FAST | optimistic | 40.1 | Admin-only. Toggle updates immediately, reverts on error. |

---

## Route Handlers — Tenant App (17 confirmed mutating endpoints)

| # | Surface | File:Line | Latency | Strategy | Phase | Notes |
|---|---------|-----------|---------|----------|-------|-------|
| 14 | `POST + DELETE /api/prospects/[id]/tags` | `src/app/api/prospects/[prospectId]/tags/route.ts:110` (POST) + `:197` (DELETE) | FAST | optimistic | 40 | Plan 40-06. Single surface — add/remove tag UI fires both methods against the same pill UI. Partial optimistic today at `profile-view.tsx:242`; tighten rollback UX (exact prior-state restore + error toast) for both verbs in one treatment. |
| 16 | `PATCH /api/prospects/[id]/profile` | `src/app/api/prospects/[prospectId]/profile/route.ts:39` | FAST | optimistic | 40 | Plan 40-06. Inline field edit via `handleFieldSave`; immediate display + rollback on error with toast. |
| 17 | `PATCH /api/prospects/[id]/notes` | `src/app/api/prospects/[prospectId]/notes/route.ts:14` | FAST | optimistic | 40.1 | Debounce + optimistic textarea. |
| 18 | `POST /api/search/[searchId]/dismiss` | `src/app/api/search/[searchId]/dismiss/route.ts:10` | FAST | optimistic | 40 | Plan 40-06. Card disappears from results immediately; undo toast for 5 s (match existing pattern). |
| 19 | `POST /api/apollo/bulk-enrich` | `src/app/api/apollo/bulk-enrich/route.ts:108` | SLOW + BACKGROUND | skeleton | 40 | Plan 40-07. 3–30 s external Apollo call; skeleton rows appear for newly-enriched targets, replaced by real rows on response. Apollo `bulk_match` is capped at 10/request and chunks sequentially — per-row reveal preferred over all-or-nothing swap. |
| 20 | `POST /api/search/[searchId]/extend` | `src/app/api/search/[searchId]/extend/route.ts:5` | SLOW | skeleton | 40 | Plan 40-07. 2–10 s Apollo call; 3–5 skeleton rows at bottom of results, replaced by real rows on response. |
| 21 | `POST /api/prospects/[id]/activity` | `src/app/api/prospects/[prospectId]/activity/route.ts:155` | FAST | optimistic | 40.1 | Custom activity event post. Event appears in timeline immediately; rollback removes row on error. |
| 22 | `PATCH /api/prospects/[id]/activity/[eventId]` | `src/app/api/prospects/[prospectId]/activity/[eventId]/route.ts:48` | FAST | optimistic | 40.1 | Edit activity note. |
| 23 | `DELETE /api/prospects/[id]/activity/[eventId]` | `src/app/api/prospects/[prospectId]/activity/[eventId]/route.ts:116` | FAST | optimistic | 40.1 | Delete activity event + undo toast. |
| 24 | `POST /api/prospects/[id]/signals/mark-seen` | `src/app/api/prospects/[prospectId]/signals/mark-seen/route.ts:10` | FAST | optimistic | 40.1 | Signal dot clears immediately on view; fire-and-forget. |
| 25 | `POST /api/prospects/[id]/research/pin` | `src/app/api/prospects/[prospectId]/research/pin/route.ts:44` | FAST | optimistic | 40.1 | Pin indicator toggles immediately; rollback on error. (Recon seed listed this as `/api/research/pin` — actual path is nested under `prospects/[prospectId]`.) |
| 26 | `POST /api/prospects/[id]/research` (session send server endpoint) | `src/app/api/prospects/[prospectId]/research/route.ts:29` | SLOW | skeleton | already done | The server endpoint itself streams SSE frames (`data-shimmer` → `data-card` → `data-sources`) that Phase 27 already wired to the UI shimmer. No Phase 40 work on the endpoint — the Phase 40 treatment lives on the client wrapper (row #29) which verifies the shimmer still mounts. (Recon seed listed this as `PATCH /api/research/sessions/[id]` — actual mutation path is this POST; `sessions/[sessionId]` route is GET-only.) |
| 27 | `POST /api/search/[searchId]/refresh` | `src/app/api/search/[searchId]/refresh/route.ts:5` | BACKGROUND | realtime | 40.1 | Fires Inngest `refresh-saved-search`; results arrive async. Use the Plan 40-02 `saved_search_prospects` channel to update status pills as rows land. |
| 28 | `POST /api/issues/report` | `src/app/api/issues/report/route.ts:34` | FAST | optimistic | 40.1 | Fire-and-forget post; toast "reported" immediately, error toast if it fails. (Recon seed listed this as `POST /api/issue-reports` — actual path is `/api/issues/report`.) |
| 29 | Research message send (client-side path) | `src/components/prospect/research-panel.tsx` | SLOW | skeleton | 40 | Plan 40-07 verify-only. Client wrapper around #26; ensures the Phase 27 shimmer is still mounted between `onSubmit` and `data-shimmer` SSE frame. |
| 30 | `POST /api/prospects/add-to-list` | `src/app/api/prospects/add-to-list/route.ts:12` | FAST | optimistic | 40.1 | Dialog close + "Added to N lists" toast immediately; the underlying `addToListAction` (#6) is the Server Action equivalent. |

---

## Route Handlers — Admin (4 confirmed mutating endpoints, verified Task 1)

Verification methodology: walked `src/app/api/admin/**/route.ts` (19 files total, enumerated via Glob) and filtered for `POST | PATCH | DELETE | PUT` exports. Results below are the complete admin-mutation surface — the other 15 route files under `/api/admin` are `GET`-only dashboards / reports / listings.

| # | Surface | File:Line | Latency | Strategy | Phase | Notes |
|---|---------|-----------|---------|----------|-------|-------|
| 31 | `POST /api/admin/api-keys/config` | `src/app/api/admin/api-keys/config/route.ts:22` | FAST | optimistic | 40.1 | Admin toggles (e.g., `apollo_mock_enrichment`) flip immediately; rollback on 403/500. Super-admin guarded server-side. |
| 32 | `POST /api/admin/api-keys/test/[integration]` | `src/app/api/admin/api-keys/test/[integration]/route.ts:16` | SLOW | skeleton | 40.1 | "Test connection" action hits external integration (Apollo / ContactOut / Exa / etc.); show inline spinner + skeleton result card while waiting. Not optimistic — result is the whole point. |
| 33 | `PATCH /api/admin/tenants/[id]` | `src/app/api/admin/tenants/[id]/route.ts:78` | FAST | optimistic | 40.1 | Tenant detail drawer (name / theme / logo_url updates); optimistic row-level patch, rollback on error. |
| 34 | `PATCH /api/admin/reports/[id]` | `src/app/api/admin/reports/[id]/route.ts:77` | FAST | optimistic | 40.1 | Issue-report status / admin_notes update; optimistic status-pill + notes update in the admin queue view. |

**Admin routes recon flagged but NOT found on disk:**
- `/api/admin/users/**` — NOT FOUND. Admin user CRUD lives entirely in `src/app/admin/actions.ts` (`createUserAction`, `toggleUserStatusAction` — rows #12, #13). No REST handler exists. Recon false positive.
- `/api/admin/automations/**/route.ts` — exists but is GET-only (`/automations`, `/automations/runs`, `/automations/runs/[id]` — all dashboards). No mutation endpoint. Recon listed this as a candidate but it's read-only today. If an "enable/disable automation" endpoint is added later, add a row here.
- Any bulk `DELETE /api/admin/tenants/[id]` — NOT FOUND. Admin "soft-delete" is `toggleTenantStatusAction` (#11) only.

Net: 4 admin mutation endpoints confirmed present (rows 31–34), ~4 candidates from recon list resolved as false positives (documented above, no row created).

---

## Realtime Channels (4 total — 2 existing + 2 new)

| # | Channel | Table | Filter | Status | Phase | Notes |
|---|---------|-------|--------|--------|-------|-------|
| R1 | `list-re-enrich-${prospectId}` | `prospects` | `id=eq.${prospectId}` | existing | already done | Baseline: `src/app/[orgId]/lists/components/list-member-table.tsx:186`. Per-row subscription on the list members table — Plan 40-02's filter pattern is cloned from this. |
| R2 | `prospect-${prospect.id}` | `prospects` | `id=eq.${prospect.id}` | existing | already done | Baseline: `src/components/prospect/profile-view.tsx:251`. Per-prospect subscription in the slide-over / profile. |
| R3 | `saved-search-enrichment-${tenantId}` | `saved_search_prospects` | `tenant_id=eq.${tenantId}` | **new** | 40 | Plan 40-02. New channel wired on list members page + slide-over when viewing a saved-search-backed prospect. Fires on `UPDATE` to `saved_search_prospects.enrichment_status` (pending → enriched). Requires RLS SELECT policy preflight (Plan 40-02 Task 0). |
| R4 | `prospects-enriched-${tenantId}` | `prospects` | `tenant_id=eq.${tenantId}` + client-side ID reconcile | **new** | 40 | Plan 40-03. Second new channel; fires when `enriched_at` transitions null → timestamp. Filter uses tenant-eq (not `id=in.(...)`) because Realtime filter string cap is ~100 chars — reconcile client-side against currently-rendered IDs. Disjoint from Plan 40-02's file set (wired via `page.tsx`, not `list-member-table.tsx`). |
| P1 | Polling fallback helper (applies to R3 + R4) | N/A — shared utility, not a channel | `setInterval(fetch, 10_000)` on `CHANNEL_ERROR` / `TIMED_OUT` | **new** | 40 | Plan 40-04. Not a mutating surface — shared WebSocket-failure fallback that polls the same endpoint R3/R4 subscribe to, until the page unmounts or connection recovers. Counts as one of the 11 Phase 40 items per CONTEXT `<specifics>` row 11 ("Fallback — polling every 10s if WS fails — shared utility"). |

**Channel cleanup audit (Plan 40-04 scope):**
- R1 — has `useEffect` return callback calling `supabase.removeChannel(channel)`. VERIFIED (Plan 40-04 will re-verify as part of sweep).
- R2 — has `useEffect` return callback calling `supabase.removeChannel(channel)`. VERIFIED.
- R3 — must land with cleanup (Plan 40-02 Task requirement).
- R4 — must land with cleanup (Plan 40-03 Task requirement).
- Polling fallback utility (Plan 40-04) — kicks in on `CHANNEL_ERROR` / `TIMED_OUT` with `setInterval(fetch, 10_000)`; shared helper applies to R3 and R4.

---

## Phase 40 Scope Summary

**11 demo-critical surfaces addressed this phase** (matches `40-CONTEXT.md` `<specifics>` table one-to-one):

| Treatment | Count | Surfaces (row refs) |
|-----------|-------|---------------------|
| Realtime | 2 | R3 (Plan 40-02), R4 (Plan 40-03) |
| Optimistic | 5 | #1 createList, #2 deleteList, #14 tags POST+DELETE (merged row), #16 profile edit, #18 dismiss |
| Skeleton | 3 | #19 bulk-enrich, #20 extend-search, #29 research-send |
| Fallback | 1 | P1 polling utility (Plan 40-04, applies to R3 + R4) |
| **Total** | **11** | |

Additionally Plan 40-08 ships UAT checklist + verification. No new mutating surface is introduced by Plan 40-01 / 40-04 / 40-08 themselves — they produce audit, utility, and verification artifacts only.

---

## Phase 40.1 Checklist

Filter this table for `Phase = 40.1` — that is the complete ordered work queue for the next phase. Do **not** replan those; the strategy column is already decided. Total: **23 rows flagged 40.1** across:

- **Tenant Server Actions (6):** #3 member-status, #4 member-notes, #6 add-to-list, #7 createPersona, #8 updatePersona, #9 deletePersona
- **Admin Server Actions (4):** #10 createTenant, #11 toggleTenantStatus, #12 createUser, #13 toggleUserStatus
- **Tenant Route Handlers (9):** #17 notes PATCH, #21 activity POST, #22 activity PATCH, #23 activity DELETE, #24 signals mark-seen, #25 research pin, #27 search refresh (realtime), #28 issues report, #30 add-to-list POST
- **Admin Route Handlers (4):** #31 api-keys config, #32 api-keys test, #33 tenants PATCH, #34 reports PATCH

Total 40.1 items: 6 + 4 + 9 + 4 = **23 treatment applications** across **~17 distinct surfaces** (some surfaces like activity CRUD pair PATCH + DELETE on the same `[eventId]` route, and the persona set collapses to one "persona CRUD" plan task). Matches CONTEXT's "~17 parked surfaces" estimate once Server Action / route pairs are de-duplicated.

---

## Count Reconciliation

- **Confirmed mutating surfaces rows in this audit:** 33 numbered rows (#1–#13 Server Actions, #14 merged tags row, #16–#30 tenant routes, #31–#34 admin routes — note #15 was merged into #14 so the numbering skips) + 4 realtime channels (R1–R4) + 1 polling-fallback helper (P1) = **38 entries total**.
- **Recon said "28 confirmed":** Recon counted server-action functions + tenant routes + admin routes as 28 without including the 4 admin Server Actions in `src/app/admin/actions.ts` (which recon tagged as "app/admin" not "server actions") and without separately enumerating the 4 admin mutating Route Handlers (rows #31–#34). The 33 numbered rows in this audit are the exploded view — each row is one exported function / handler with its own strategy. Phase 40.1 planner can collapse same-file pairs (e.g., `activity/[eventId]` PATCH + DELETE) into a single plan task where appropriate.
- **11 Phase 40 rows:** R3, R4, P1, #1, #2, #14 (merged tags POST+DELETE), #16, #18, #19, #20, #29 = 11. Matches CONTEXT `<specifics>` exactly: 2 realtime + tags + profile + dismiss + create list + delete list + bulk-enrich + extend + research + polling fallback = 11.
- **`already done` rows (4):** #5 `removeFromListAction` (baseline for optimistic+undo), #26 research server endpoint (baseline SSE shimmer from Phase 27), R1 `list-re-enrich-${prospectId}`, R2 `prospect-${id}`. These are the baseline pattern references — no Phase 40 or 40.1 work.
- **Phase 40.1 rows:** 23 treatment applications across tenant + admin (counted above).
- **Total accounted:** 11 (Phase 40) + 23 (Phase 40.1) + 4 (already done) = 38. Matches the 33 numbered mutation rows + 4 channels + 1 polling helper.

---

## Source-of-Truth Statements

1. Every row in this table has a confirmed file path + method / line number on disk at commit `f8d59ec` (plan base).
2. Every row has a non-blank `Strategy` and a non-blank `Phase` column.
3. Every admin-route candidate flagged as "unverified" in recon has been filesystem-verified (Task 1) and either appears as rows #31–#34 or is explicitly documented in "Admin routes recon flagged but NOT found on disk" above.
4. The 11 Phase-40 rows are a strict subset of `40-CONTEXT.md` `<specifics>` table.
5. No architectural-decision work (per CONTEXT `<deferred>` "Not in Phase 40 OR 40.1") is represented in this audit — `useOptimistic` React 19 migration, custom reconciliation layer, presence indicators, and SSE-fallback are deliberately excluded.

---

*Phase 40.1 planner: start here. Filter `Phase = 40.1`, group by file, plan in waves of disjoint-file sets, mirror the treatment patterns already shipped in Phase 40.*
