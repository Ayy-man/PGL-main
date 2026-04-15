# Phase 40 — UAT

**Target:** https://pgl-main.vercel.app
**Run by:** _______________ on _______________
**Result:** ☐ pass / ☐ fail

---

## Prerequisites

- Logged in as a tenant user with at least one saved search backed by active prospects.
- At least one existing list (for delete step) OR permission to create/delete a disposable one.
- Browser DevTools open — Network tab (with WS filter ready) + Console visible.
- Expected commit deployed to Vercel: `84a65ab` or later (head of Phase 40 work). Confirm via Vercel dashboard → Deployments before starting.

**Background — what this phase delivered (Adrian's demo cut):**

- Live enrichment pill flip on list-members page (Plan 40-03) — the direct fix for "you have to refresh the browser for it to show green".
- Optimistic create/delete on lists (Plan 40-05).
- Optimistic dismiss on search (Plan 40-06).
- Tightened optimistic tag rollback with destructive toast (Plan 40-06).
- Optimistic inline profile field edits with rollback (Plan 40-06).
- Skeleton rows during re-enrichment on list-members (Plan 40-07).
- Skeleton rows during search "Load More" (Plan 40-07).
- 10s polling fallback when realtime WS fails (Plan 40-04).

**Not in this phase (Phase 40.1 scope per `40-AUDIT.md`):** admin CRUD, persona CRUD, list-member status/notes, add-to-list, prospect notes PATCH, activity log, signals mark-seen, research pin, research session patch, refresh-saved-search, issue report POST, and the replacement saved-search-results page `saved_search_prospects.status` subscription (the Plan 40-02 successor surface).

---

## Steps

### 1. Realtime enrichment green-without-refresh (Adrian's literal complaint)

**Covered by:** Plan 40-03 (`prospects-enriched-${tenantId}` realtime channel) + Plan 40-07 (skeleton row during re-enrich)

- **Do:** Open a list members page (`/<orgId>/lists/<listId>`). Click the re-enrich action on one member whose enrichment status pill is currently "Not enriched" or stale.
- **Expect:**
  - The row flips to skeleton cells immediately (mobile: `rounded-[14px]` card; desktop: `rounded-lg` row cells).
  - Within ~3–30s (depends on Apollo/ContactOut/Exa latency), the skeleton clears and the enrichment status pill transitions to "Enriched" (green) **without pressing Cmd+R or any browser refresh**.
  - The enriched name / title / company fields populate in place.
- **Result:** ☐ pass / ☐ fail

### 2. Bulk-enrich skeleton → live rows

**Covered by:** Plan 40-07 (skeleton rows on bulk-enrich flow) + Plan 40-03 (realtime channel fills them)

- **Do:** From a saved search, select 3–5 prospects and click "Enrich Selection" into a list. (Or: navigate to the target list and watch rows arrive.)
- **Expect:**
  - New rows appear on the list with shimmer-skeleton placeholders immediately as the bulk-enrich request completes the `saved_search_prospects` upsert.
  - Within ~5–30s, placeholders flip to real enriched data without refresh (driven by the `prospects-enriched-${tenantId}` channel; falls back to `router.refresh()` if WS is degraded).
- **Result:** ☐ pass / ☐ fail

### 3. Create list — immediate appearance

**Covered by:** Plan 40-05 (optimistic `createListAction` via `ListGridOptimisticHandle`)

- **Do:** On the Lists page, click "Create List", fill in a name, submit.
- **Expect:**
  - The dialog closes immediately on submit (optimistic dispatch).
  - The new list card appears in the `ListGrid` IMMEDIATELY with a dimmed (`opacity-50`) visual and a gold `Loader2` spinner next to the name; action buttons (export / delete / view) are disabled (`pointer-events-none`, `aria-busy`).
  - Within ~500ms, the pending visual reconciles to a normal card.
  - On failure (force one via DevTools by blocking the POST): the card disappears, the dialog re-opens with your typed name preserved, and a destructive toast shows the error.
- **Result:** ☐ pass / ☐ fail

### 4. Delete list — immediate removal + undo

**Covered by:** Plan 40-05 (optimistic `deleteListAction` with snapshot-restore reducer)

- **Do:** Click Delete on a list. Confirm the delete dialog.
- **Expect:**
  - Card disappears from the grid IMMEDIATELY.
  - A toast with an "Undo" button appears for ~5s (mirrors the `list-member-table.tsx:142` undo pattern).
- **Do:** Click Undo within the toast window.
- **Expect:** Card reappears in its previous position in the grid. (Note: this is a visual-only undo — the server delete has already fired. A subsequent `revalidatePath` or navigation away/back will flush the card if the server actually deleted. This is documented in `list-grid.tsx` as a deferred server-side undelete; acceptable for the demo flow.)
- **Result:** ☐ pass / ☐ fail

### 5. Dismiss a search prospect — immediate removal

**Covered by:** Plan 40-06 Task 1 (`runOptimisticDismiss` + undo toast)

- **Do:** On a saved-search results page, click dismiss on a prospect card.
- **Expect:**
  - Card disappears IMMEDIATELY.
  - Undo toast appears with the server's error message populated if the dismiss actually failed, or a plain success with "Undo" action if it succeeded.
- **Do:** Click Undo within the toast window.
- **Expect:** Card reappears and a POST `{ action: "undo" }` fires to the same dismiss endpoint.
- **Result:** ☐ pass / ☐ fail

### 6. Add/remove a tag — immediate toggle + destructive rollback

**Covered by:** Plan 40-06 Task 2 (`computeTagDiff` + `applyTagDiff` with per-tag surgical revert + destructive toast)

- **Do:** On a prospect profile (slide-over or full page), add a new tag.
- **Expect:** Tag chip appears IMMEDIATELY. Stays after server round-trip.
- **Do:** Remove the tag.
- **Expect:** Chip disappears IMMEDIATELY.
- **Do (error path):** Use DevTools to block the POST `/api/prospects/[id]/tags` request (or force it to return 400). Try adding a tag.
- **Expect:** Chip appears then disappears with a destructive toast showing the per-tag error message. A concurrent tag added at the same time is NOT clobbered — surgical revert only affects the failing tag.
- **Result:** ☐ pass / ☐ fail

### 7. Inline profile edit — rollback on bad input

**Covered by:** Plan 40-06 Task 3 (`runFieldSave` + destructive toast on save failure)

- **Do:** On a prospect profile, edit an inline field (e.g., Title or Email) with intentionally invalid input — OR use DevTools to block PATCH `/api/prospects/[id]/profile`.
- **Expect:**
  - The field displays the new value briefly (optimistic commit).
  - On server rejection, the field rolls back to the prior value and a destructive toast fires titled "Failed to save <Label>" with the thrown error's message.
  - If the save succeeds, no toast is shown (silent commit).
- **Result:** ☐ pass / ☐ fail

### 8. Polling fallback when WebSocket dies

**Covered by:** Plan 40-04 (`useRealtimeWithFallback` with 10s `router.refresh()` poll on `CHANNEL_ERROR` / `TIMED_OUT`)

- **Do:** Open DevTools → Network tab. Filter to `WS`. Identify the active Supabase Realtime WebSocket. Kill it (right-click → "Block request URL" on the `/realtime/v1/websocket?...` URL, then reload the Lists detail page; or disconnect by going offline/online in the Network conditions panel).
- **Expect:**
  - Within 10s of the WS reporting `CHANNEL_ERROR` or `TIMED_OUT`, a `fetch` to the page's server component (i.e., a `router.refresh()` RSC payload request) fires on a 10s interval.
  - Console shows no uncaught errors related to the dead channel (the controller only disposes the interval on `SUBSCRIBED` recovery or unmount).
- **Do:** With the WS still blocked, trigger a re-enrich on a list member.
- **Expect:** Green still eventually lands (within one poll interval after enrichment completes — the polled `router.refresh()` re-fetches enriched fields from the SSR boundary).
- **Result:** ☐ pass / ☐ fail

### 9. Channel cleanup — no ghost subscriptions

**Covered by:** Plan 40-04 (every channel has a `useEffect` cleanup calling `supabase.removeChannel(channel)`)

- **Do:** Navigate TO a list members page (channels subscribe), open DevTools Console, then navigate AWAY (e.g., back to the Lists index, or to a Search page).
- **Expect:**
  - Console shows no "channel not closed" / "subscription leak" warnings from Supabase Realtime.
  - React DevTools Profiler (or a `console.log` added during local testing) shows the cleanup function ran — the channel was removed on unmount.
- **Alt verification (repeatable anytime):**
  ```
  $ grep -rn "removeChannel" src/ --include="*.ts" --include="*.tsx" \
      | grep -v " \* " | wc -l          # expected: ≥ 3 (one per channel)
  $ grep -rn "\.channel(" src/ --include="*.ts" --include="*.tsx" \
      | grep -v "test\|__tests__" | wc -l   # expected: 3
  ```
  Passes at commit `84a65ab`: 3 channels ↔ 3 `removeChannel` invocations, co-located per file. See `40-VERIFICATION.md` Channel Inventory and `40-CHANNEL-AUDIT.md` for the full audit.
- **Result:** ☐ pass / ☐ fail

---

## Sign-off

- **Tester name:** _______________
- **Date:** _______________
- **Overall:** ☐ ship / ☐ block

---

## Blockers (if any)

(list each failing step with: step #, what you saw vs what was expected, network tab details, console errors)

1. 
2. 
3. 

---

*Plan 40-08 · checkpoint:human-verify · Phase 40 is ready to mark complete in ROADMAP.md when all 9 steps are ticked pass and the tester signs "ship".*
