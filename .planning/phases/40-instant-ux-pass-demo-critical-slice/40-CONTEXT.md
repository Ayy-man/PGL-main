# Phase 40: Instant UX Pass — Demo-Critical Slice — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** Explore agent full-app mutating-surface audit + Apr 13 call transcript + `list-member-table.tsx` realtime precedent

<domain>
## Phase Boundary

Ship the instant-UX improvements Maggie will notice in her first 2–3 weeks. Scope is reduced from the full 28-surface audit to the **11 highest-impact surfaces** (see Decisions). The full audit artifact (`40-AUDIT.md`) is still produced in Plan 01 so Phase 40.1 has a checklist for the post-Maggie rollout. Adrian's literal complaint on the 2026-04-13 call was: *"you have to refresh the browser for it to show green"* — the Realtime scope directly closes that.

**Out of this phase's scope** (parked in Phase 40.1): admin CRUD, persona CRUD, list-member status/notes, add-to-list, prospect notes PATCH, activity log, signals mark-seen, research pin, research session patch, refresh-saved-search, issue report POST. 17 surfaces total. Phase 40.1 works from the audit doc.

</domain>

<decisions>
## Implementation Decisions

### Plan 01 — Audit document (LOCKED)
Produce `40-AUDIT.md` listing all 28 confirmed mutating surfaces from the recon pass, each with a chosen strategy (`optimistic` / `realtime` / `skeleton` / `none`) and a phase assignment (`40` or `40.1`). This is the handoff artifact for 40.1. Source table from the recon output is authoritative starting point; verify the ~8 unverified admin routes before committing.

### Plan 02 — Supabase Realtime: saved_search_prospects (LOCKED)
New channel subscribed on the list members page and the prospect slide-over when viewing a saved-search-backed prospect. Fires on `UPDATE` to `saved_search_prospects` where `tenant_id=eq.<current_tenant>`. UI updates the enrichment status pill from pending → enriched when `enrichment_status='enriched'` lands on the pushed row. Mirror the existing pattern at `src/app/[orgId]/lists/components/list-member-table.tsx:186`:
```ts
const supabase = createClient();
const channel = supabase.channel(`saved-search-enrichment-${tenantId}`)
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "saved_search_prospects", filter: `tenant_id=eq.${tenantId}` }, (payload) => { /* update UI */ })
  .subscribe();
return () => { supabase.removeChannel(channel); };
```

### Plan 03 — Supabase Realtime: prospects.enriched_at (LOCKED)
Second channel on `UPDATE prospects` filtered by the set of prospect IDs currently rendered (use `id=in.(...)` filter or subscribe without filter and reconcile client-side — planner picks based on the filter string length limit in Realtime). Fires when `enriched_at` transitions from null → timestamp. UI updates: enrichment status dot, last-enriched timestamp, and any visible enriched fields (photo_url, title, etc.).

### Plan 04 — Polling fallback + channel cleanup (LOCKED)
If the Realtime WebSocket connection fails or reports `CHANNEL_ERROR`/`TIMED_OUT`, fall back to a `setInterval(fetch, 10_000)` poll of the same data until the page unmounts or connection recovers. Every channel MUST have a `useEffect` return callback that calls `supabase.removeChannel(channel)` — memory leak check on unmount via React DevTools.

### Plan 05 — Optimistic mutations: lists (LOCKED — 2 surfaces)
- `createListAction` — new list appears in `ListGrid` immediately with a `pending: true` visual state (dimmed or spinner), reconciles on server response. Mirror the existing remove-optimistic-with-undo pattern in `src/app/[orgId]/lists/components/list-member-table.tsx:142`.
- `deleteListAction` — list disappears from grid immediately with undo toast; restore on rollback or user undo.

### Plan 06 — Optimistic mutations: search + tags + profile (LOCKED — 3 surfaces)
- `dismissSearchProspect` — prospect card disappears from search results immediately, undo toast fires for N seconds.
- `addProspectTag` / `removeProspectTag` — already partially optimistic at `src/components/prospect/profile-view.tsx:242`; tighten rollback UX (toast on error + restore exact prior state).
- `updateProspectProfile` (inline field edit via `handleFieldSave`) — field displays new value immediately, rollback to prior value on error with toast.

### Plan 07 — Skeleton states (LOCKED — 3 surfaces)
- `bulk-enrich` response path — after "Enrich Selection" fires, the newly-targeted list rows show skeleton placeholders using existing `Skeleton` primitive (per memory Phase 14-polish: `rounded-[14px]` for card shapes, `rounded-lg` for row shapes). Replaces spinner-only state.
- `extendSavedSearch` (Apollo "Load More") — 3–5 skeleton rows appear at bottom of results immediately; replaced by real rows on response.
- Research message send — existing shimmer card from Phase 27 stays; verify it still fires on the streaming fetch path. No new work unless regressed.

### Plan 08 — UAT + verification (LOCKED)
Manual browser checklist against `pgl-main.vercel.app`:
1. Open list members page; trigger re-enrichment on one member; confirm green without refresh.
2. Send a batch to a list (bulk-enrich); confirm skeleton → live rows without refresh.
3. Create a list; confirm immediate appearance.
4. Delete a list; confirm immediate removal + undo toast.
5. Dismiss a search prospect; confirm immediate removal.
6. Add/remove a tag; confirm immediate toggle.
7. Edit an inline profile field with bad input; confirm rollback.
8. Network tab: kill WS; confirm polling kicks in within 10s; confirm green still eventually lands.
9. Network tab: navigate away during active channel; confirm `removeChannel` called (no ghost subscriptions).

### Error / rollback UX (LOCKED)
- Every optimistic failure fires a toast with the error message and restores the prior state.
- Use existing `useToast` + `ToastAction` for undo affordances (pattern from Phase 39 and `list-member-table.tsx`).
- Never leave the UI in an inconsistent state — either the optimistic write is confirmed, rolled back with notice, or the whole page errors gracefully.

### RLS safety (LOCKED)
- Realtime channels subscribe via the same anon Supabase client the rest of the app uses. RLS policies on `saved_search_prospects` and `prospects` already scope reads by `tenant_id`. Confirm the policies allow SELECT for `authenticated` on `UPDATE` events (Supabase Realtime requires SELECT policy to replay row data).
- If any policy blocks replay, document it as a blocker in the plan and escalate — do NOT disable RLS or use service-role client on the client side.

### Test strategy (LOCKED — verified 2026-04-15)
- `@testing-library/react` is **NOT installed** in `package.json`. React is pinned at `^18`.
- Every test task across Plans 40-02 through 40-06 MUST use the **pure-helper fallback**: extract the state-transition or event-handler logic into a pure function (e.g., `reduceSavedSearchPayload(state, payload) => nextState` or `optimisticReducer(state, action) => nextState`). Test that function with Vitest directly.
- **Do NOT add `@testing-library/react` as a dep** to unblock a test — flag to the user in-plan instead.
- No component tests, no `render()`, no `fireEvent`, no `jsdom` DOM testing. Vitest node environment only.
- If a surface genuinely cannot be made pure-testable (e.g., a useEffect subscription cleanup), ship a shallow integration test that just mocks `createClient()` and asserts `channel.unsubscribe()`/`removeChannel` was called — but do not reach into the DOM.

### Claude's Discretion
- Exact filter string for Plan 03 (`id=in.(...)` vs unfiltered with client-side reconcile) — depends on how many prospect IDs render at once. Planner decides based on max list size (probably <200).
- Whether to extract a `useRealtimeChannel` hook or inline the channel code per usage — planner's call; at 2 channels the hook may be premature.
- Undo toast duration (5s? 10s?) — match existing pattern.
- Whether skeleton row count is adaptive (matches expected result count) or fixed — planner picks a reasonable default.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Realtime + optimistic patterns (copy these)
- `src/app/[orgId]/lists/components/list-member-table.tsx:186` — the realtime channel pattern to mirror
- `src/app/[orgId]/lists/components/list-member-table.tsx:142` — the optimistic-with-undo-toast pattern for list ops
- `src/components/prospect/profile-view.tsx:242` — existing optimistic tag state
- `src/components/prospect/profile-view.tsx:251` — second existing Realtime subscription (on `prospects` table)
- `src/components/auth/session-guard.tsx` — auth realtime pattern (tangentially useful)

### Supabase client (read when wiring channels)
- `src/lib/supabase/client.ts` (or wherever `createClient()` lives) — client factory
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime/postgres-changes — filter string syntax

### In-scope handlers (the 11 surfaces)
Realtime: `saved_search_prospects`, `prospects` tables
Optimistic: `lists/actions.ts` (create, delete), `search/[searchId]/dismiss/route.ts`, `prospects/[id]/tags/route.ts`, `prospects/[id]/profile/route.ts`
Skeleton: `apollo/bulk-enrich/route.ts` callers, `search/[searchId]/extend/route.ts` callers, research panel

### Design system
- `src/components/ui/skeleton.tsx` — Skeleton primitive
- `src/components/ui/toast.tsx` + `src/hooks/use-toast.ts` — toast + ToastAction for undo
- Phase 14-polish memory: `rounded-[14px]` for card skeletons, `rounded-lg` for rows

### Phase 40 audit recon output
Preserved in the 40-AUDIT.md deliverable from Plan 01. Seed table:
- 28 confirmed mutating surfaces across 3 Server Actions files + 16 Route Handlers
- 20 FAST (local DB, <200ms) / 5 SLOW (external API) / 3 BACKGROUND (Inngest)
- 2 Realtime subscriptions exist today (both on `prospects`), neither on `saved_search_prospects`
- 2 optimistic patterns exist today (remove-from-list, tags)

</canonical_refs>

<specifics>
## Specific Ideas

**The 11 in-scope surfaces:**

| # | Strategy | Surface | File | Why |
|---|----------|---------|------|-----|
| 1 | Realtime | `saved_search_prospects.enrichment_status` channel | list members page + slide-over | Adrian's literal complaint |
| 2 | Realtime | `prospects.enriched_at` channel | list members page + slide-over | Same flow, different table |
| 3 | Optimistic | `createListAction` | lists/actions.ts:38 | High-frequency |
| 4 | Optimistic | `deleteListAction` | lists/actions.ts:66 | High-frequency + undo pattern exists |
| 5 | Optimistic | `dismissSearchProspect` | search/[searchId]/dismiss/route.ts | Most-frequent search action |
| 6 | Optimistic | `addProspectTag` / `removeProspectTag` | prospects/[id]/tags/route.ts | Partial optimistic today, finish it |
| 7 | Optimistic | `updateProspectProfile` (inline field edit) | prospects/[id]/profile/route.ts | Feels laggy during demo |
| 8 | Skeleton | bulk-enrich newly-added rows | after /api/apollo/bulk-enrich | 3–30s external call |
| 9 | Skeleton | extend search "Load More" | after /api/search/[id]/extend | 2–10s Apollo call |
| 10 | Skeleton | research message send | research panel | verify Phase 27 shimmer still fires |
| 11 | Fallback | polling every 10s if WS fails | shared utility | Any realtime surface |

**Existing realtime filter pattern (for reference):**
```ts
filter: `id=eq.${prospectId}`
```

**For tenant-scoped subscriptions:**
```ts
filter: `tenant_id=eq.${tenantId}`
```

**Realtime filter max length is ~100 chars** — `id=in.(uuid1,uuid2,...)` fails beyond ~3 UUIDs. For the prospects channel, prefer `tenant_id=eq.<x>` and reconcile client-side (only apply updates for IDs currently rendered).

</specifics>

<deferred>
## Deferred Ideas

### Phase 40.1 (post-Maggie, ~17 surfaces)
- Admin CRUD: `createTenantAction`, `toggleTenantStatusAction`, admin API key routes, admin user mgmt, admin automation routes
- Tenant-app polish: `updateMemberStatusAction`, `updateMemberNotesAction`, `addToListAction`, `createPersonaAction`, `updatePersonaAction`, `deletePersonaAction`, `updateProspectNotes` (PATCH)
- Activity log: `createProspectActivity` (custom events)
- Signals: `markSignalsSeen`
- Research: `pinResearchNote`, `updateResearchSession`, `refreshSavedSearch`
- Issue reports: `issueReport` POST

### Not in Phase 40 OR 40.1 (too architectural)
- `useOptimistic` from React 19 migration — current app is on React 18. Evaluate in a separate upgrade phase.
- Custom reconciliation layer (SWR-like) — out of scope; rely on server response + `revalidatePath`.
- Presence indicators ("someone else is viewing this prospect") — separate feature, not a UX speed concern.
- Server-sent events fallback instead of polling — overengineering; 10s poll is fine.

</deferred>

---

*Phase: 40-instant-ux-pass-demo-critical-slice*
*Context gathered: 2026-04-15 — Explore audit recon pre-baked, planner can skip surface enumeration*
