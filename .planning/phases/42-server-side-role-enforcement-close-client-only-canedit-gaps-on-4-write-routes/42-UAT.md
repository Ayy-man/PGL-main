# Phase 42 — UAT (User Acceptance Testing) Checklist

**Status:** DEFERRED — template below is ready for the tester to fill in post-deploy.
**Plan reference:** `42-05-PLAN.md` Task 2 (`checkpoint:human-verify`)
**Artifacts proven-via automation so far:** `42-VERIFICATION.md` (all 7 grep/vitest/tsc checks green on base commit `83ce67e`, verification commit `4f22789`).

---

## Why this file exists

Unit tests (38 across 4 files) pin the guard behavior at the function-call layer. UAT closes the gap between "guard is imported" and "guard fires in a real deployed Next.js request cycle with real Supabase cookies." It also verifies the user-visible surface when a guard fires — unit tests can't observe what the browser does with a NEXT_REDIRECT digest or a 403 JSON body.

Run this checklist against the live Vercel deployment (`https://pgl-main.vercel.app`) after the next push to `main`, OR against `pnpm dev` locally if you prefer pre-deploy verification.

---

## Setup

**You need two test users in the same dev tenant:**

| Role | How to create |
|------|---------------|
| `agent` (or higher) | If you already have a dev account, that is probably an agent (or admin). Check `app_metadata.role` in Supabase dashboard → Authentication → Users → click user → View JSON. |
| `assistant` | In Supabase dashboard, edit a user's `app_metadata` to set `"role": "assistant"`. **Record the original role value so you can restore it after the test.** |

Same tenant is important because the guard redirects to `/{tenantId}` — cross-tenant redirects won't fire the path this test is exercising.

**Browser prep:**
- Chrome/Firefox with DevTools open (Console + Network tabs visible).
- Sign in as the **assistant** user first.

---

## What the user will actually see

Two different surfaces depending on handler type — this is locked by Phase 42-01's Pattern A vs Pattern B split:

### Server Actions (9 of 11 handlers)

When `requireRole("agent")` rejects an assistant, it calls `redirect(/{tenantId})` which throws `NEXT_REDIRECT`. Next.js's Server Action framework **intercepts the digest** and performs a **client-side navigation to the tenant root**. The user does NOT see an error toast, a 403 status, or a JSON body — the browser just navigates.

Testing surface: "did the page URL change to `/{tenantId}` after clicking the button?"

**DevTools Network tab evidence:**
- The Server Action POST request to `/{orgId}/...` or `/{orgId}/personas` returns HTTP `200` with a Next.js RPC response that includes a `Location: /{tenantId}` redirect directive (visible in the response payload as a serialized `redirect` action).
- No 403 is surfaced — the 403-contract in CONTEXT.md only applies to Route Handlers.

### Route Handlers (2 of 11 handlers)

When the inline `hasMinRole(role, "agent")` check fails, the handler returns `NextResponse.json({ error, message }, { status: 403 })`. This IS a visible 403 with a JSON body.

Testing surface: "did `fetch(...)` return `{ status: 403, body: { error: 'Forbidden', message: 'Your role does not permit this action' } }`?"

---

## Part A — Assistant role (expect blocked)

**Pre-check:** Confirm logged in as assistant.
```js
// Run in DevTools Console on any /{orgId}/... page:
document.cookie.includes("sb-") // should be true (Supabase auth cookie)
```

### A.1 Server Actions (spot-check at least one per file — 4 total)

For each: navigate to the page, open DevTools → Elements, find the target button, remove its `disabled` attribute (temporarily), click, then observe whether the browser navigates to `/{tenantId}`.

- [ ] **`createListAction`** — page: `/{orgId}/lists`. Button: "Create list" or "New list". Remove `disabled`, fill the name field, click. **Expected:** browser navigates to `/{tenantId}` (tenant root). DB: no new list row inserted for this tenant.
- [ ] **`deleteListAction`** — page: `/{orgId}/lists`. Button: a list row's "Delete". Remove `disabled`, click. **Expected:** browser navigates to `/{tenantId}`. DB: the list still exists (query `lists` table for its id).
- [ ] **`createPersonaAction`** — page: `/{orgId}/personas`. Button: "New persona" or "Create persona". Remove `disabled`, submit form. **Expected:** browser navigates to `/{tenantId}`. DB: no new persona row.
- [ ] **`deletePersonaAction`** — page: `/{orgId}/personas`. Button: persona row's "Delete". Remove `disabled`, click. **Expected:** browser navigates to `/{tenantId}`. DB: the persona still exists.

**Coverage note:** Phase scope has 9 Server Actions total (6 lists + 3 personas). The 4 above cover:
- Both file paths (lists + personas) — each file's guard is either a chokepoint (lists) or inlined (personas), and spot-checking one action per file proves the per-file guard works.
- Both create and delete semantics.

The remaining 5 Server Actions (`updateMemberStatusAction`, `updateMemberNotesAction`, `removeFromListAction`, `addToListAction`, `updatePersonaAction`) flow through the same guards already spot-checked and are unit-tested in 42-02/03 (19 + 10 tests). Re-spot-checking each adds no confidence beyond what the unit tests already pin.

### A.2 Route Handlers (fire via DevTools Console — 2 total)

These return real 403s; paste each snippet into the Console on a logged-in page.

- [ ] **`POST /api/apollo/bulk-enrich`** — expect `{ status: 403, body: { error: "Forbidden", message: "Your role does not permit this action" } }`.
  ```js
  await fetch("/api/apollo/bulk-enrich", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ apolloIds: ["test-id-1"] }),
  }).then(r => r.json().then(b => ({ status: r.status, body: b })));
  ```

- [ ] **`PATCH /api/prospects/<any-real-id>/notes`** — expect `{ status: 403, body: { error: "Forbidden", message: "Your role does not permit this action" } }`. Replace `REAL_PROSPECT_ID` with any prospect visible in your tenant.
  ```js
  await fetch("/api/prospects/REAL_PROSPECT_ID/notes", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ notes: "bypass attempt" }),
  }).then(r => r.json().then(b => ({ status: r.status, body: b })));
  ```

---

## Part B — Agent role (expect success)

1. Log out. Restore the test user's `app_metadata.role` to `"agent"` (or higher) via Supabase dashboard, OR log in as a different user who already has `agent`.
2. Run the same 4 Server Action spot-checks — expect each to **succeed** (row created, row deleted, etc., page updates accordingly).
3. Run the same 2 Route Handler fetches — expect:

- [ ] All 4 Server Action spot-checks succeed (buttons were originally enabled; DB rows change as expected).
- [ ] **`POST /api/apollo/bulk-enrich`** returns `{ status: 200, body: { people: [...], count: 1, mock: true } }`. (`mock: true` is expected if `APOLLO_MOCK_ENRICHMENT=true` on Vercel — which per MEMORY.md is the expected dev setting.)
- [ ] **`PATCH /api/prospects/REAL_PROSPECT_ID/notes`** returns `{ status: 200, body: { notes: "bypass attempt" } }`. (Expect the notes to actually be persisted — query the `prospects` table to confirm.)

---

## Part C — No session (expect 401 preserved — regression check)

Open an **Incognito / private window** (no Supabase cookies). Run the two Route Handler fetches:

- [ ] **`POST /api/apollo/bulk-enrich`** → `{ status: 401, body: { error: "Unauthorized" } }`
- [ ] **`PATCH /api/prospects/REAL_PROSPECT_ID/notes`** → `{ status: 401, body: { error: "Unauthorized" } }` OR `{ status: 401, body: { error: "Tenant ID not found" } }` (either acceptable — the handler returns 401 on both no-user and no-tenant, see 42-04-PLAN `<interfaces>`).

This confirms the new 403 branch did NOT accidentally short-circuit the pre-existing 401 branches. 401 and 403 must remain distinct.

---

## Results Table (fill in after running)

### Part A — Assistant (expect blocked)

| # | Endpoint | Trigger | Observed status / surface | Observed body | ✓/✗ |
|---|----------|---------|---------------------------|---------------|-----|
| 1 | `createListAction` | Server Action | | (N/A — client-side nav) | |
| 2 | `deleteListAction` | Server Action | | (N/A) | |
| 3 | `createPersonaAction` | Server Action | | (N/A) | |
| 4 | `deletePersonaAction` | Server Action | | (N/A) | |
| 5 | `POST /api/apollo/bulk-enrich` | Route Handler | | | |
| 6 | `PATCH /api/prospects/:id/notes` | Route Handler | | | |

### Part B — Agent (expect success)

| # | Endpoint | Trigger | Observed status | Notes | ✓/✗ |
|---|----------|---------|-----------------|-------|-----|
| 1 | `createListAction` | Server Action | | | |
| 2 | `deleteListAction` | Server Action | | | |
| 3 | `createPersonaAction` | Server Action | | | |
| 4 | `deletePersonaAction` | Server Action | | | |
| 5 | `POST /api/apollo/bulk-enrich` | Route Handler | | `mock: true` expected | |
| 6 | `PATCH /api/prospects/:id/notes` | Route Handler | | `notes` echoed back | |

### Part C — No session (expect 401)

| # | Endpoint | Trigger | Observed status | Observed body | ✓/✗ |
|---|----------|---------|-----------------|---------------|-----|
| 1 | `POST /api/apollo/bulk-enrich` | Route Handler (incognito) | | | |
| 2 | `PATCH /api/prospects/:id/notes` | Route Handler (incognito) | | | |

---

## Sign-off

**Tester:** _(fill in)_
**Date:** _(fill in)_
**Dev tenant slug:** _(fill in)_
**Assistant test user email:** _(fill in)_
**Agent test user email:** _(fill in)_

- [ ] Part A — all 6 rows ✓ (4 redirects + 2 403s)
- [ ] Part B — all 6 rows ✓ (success on every path)
- [ ] Part C — both rows 401 (preserved)

**If ANY row is ✗:** record the failing endpoint and the observed response below, then reopen the corresponding plan (02 / 03 / 04) for a follow-up. Do not check off the phase.

### Failures

_(fill in, one row per failure, or "none")_

| Endpoint | Observed | Expected | Filed as |
|----------|----------|----------|----------|

---

## Post-UAT cleanup

- [ ] Restore the assistant test user's `app_metadata.role` back to its original value in Supabase dashboard.
- [ ] Commit this completed UAT record (`chore(42-05): record UAT spot-check for phase 42`) so the audit trail is in git.

## Caveat on `APOLLO_MOCK_ENRICHMENT`

Per `MEMORY.md`, `APOLLO_MOCK_ENRICHMENT=true` is the current Vercel setting — `bulk-enrich` returns fake enriched people without burning Apollo credits. If this flag is flipped back to `false` before running UAT, the agent-path bulk-enrich check WILL burn real credits (~1 credit per apolloId). Set the apolloIds array to a single real id to minimize cost, OR temporarily flip the flag back to `true` for testing.
