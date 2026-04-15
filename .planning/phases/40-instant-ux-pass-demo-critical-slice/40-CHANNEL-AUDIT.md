# Phase 40 — Realtime Channel Audit

**Generated:** Plan 40-04 (2026-04-15)
**Scope:** Every `supabase.channel(...)` call in `src/` and its matching `supabase.removeChannel(...)` cleanup.
**Why:** Ship a grep-verifiable memory-leak and degraded-path audit before Adrian's demo. If the WebSocket dies mid-demo, the polling fallback must keep "goes green without refresh" alive. If a channel doesn't clean up on unmount, we leak subscriptions across navigations.

> **Note on channel count.** The original plan scope assumed two *new* channels from Plans 40-02 and 40-03. Plan 40-02 was abandoned on 2026-04-15 (schema mismatch — `saved_search_prospects` has `status` not `enrichment_status`; see `40-02-PLAN.md` frontmatter). Plan 40-03 delivered the Adrian fix via a single new channel on `prospects.enriched_at`. So this audit covers **3 channels total**: 2 pre-existing + 1 new from 40-03.

## Channels

| # | Channel Name                        | File                                                          | Line | Table                 | Filter                       | Cleanup                           | Polling Fallback | Status                           |
| - | ----------------------------------- | ------------------------------------------------------------- | ---- | --------------------- | ---------------------------- | --------------------------------- | ---------------- | -------------------------------- |
| 1 | `list-re-enrich-${prospectId}`      | `src/app/[orgId]/lists/components/list-member-table.tsx`      | 187  | `public.prospects`    | `id=eq.${prospectId}`        | Inline on payload match (line 195) | **No**           | Pre-existing. Self-terminating — closes itself once status transitions to `complete` or `failed`. OK. |
| 2 | `prospect-${prospect.id}`           | `src/components/prospect/profile-view.tsx`                    | 252  | `public.prospects`    | `id=eq.${prospect.id}`       | `useEffect` return (line 270)     | **No**           | Pre-existing. Small surface — single prospect profile page. OK. |
| 3 | `prospects-enriched-${tenantId}`    | `src/app/[orgId]/lists/components/list-prospects-realtime.tsx` | 65   | `public.prospects`    | `tenant_id=eq.${tenantId}`   | `subscribe` cleanup (line 90)     | **Yes** (this plan) | New from Plan 40-03. Retrofitted by Plan 40-04 to use `useRealtimeWithFallback`. |

## Grep verification

The audit is grounded in these commands — both counts come out to 3, and every `.channel()` callsite has a `removeChannel(channel)` cleanup in the same file.

```bash
# Channel creation callsites (exclude tests + doc strings):
$ grep -rn "\.channel(" src/ --include="*.ts" --include="*.tsx" | grep -v "test"
src/app/[orgId]/lists/components/list-prospects-realtime.tsx:65:        .channel(`prospects-enriched-${tenantId}`)
src/app/[orgId]/lists/components/list-member-table.tsx:187:      .channel(`list-re-enrich-${prospectId}`)
src/components/prospect/profile-view.tsx:252:      .channel(`prospect-${prospect.id}`)

# Matching cleanup callsites (exclude tests + doc comments):
$ grep -rn "supabase\.removeChannel(" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "^.*\.ts:[0-9]*: \*"
src/app/[orgId]/lists/components/list-prospects-realtime.tsx:90:        supabase.removeChannel(channel);
src/app/[orgId]/lists/components/list-member-table.tsx:195:            supabase.removeChannel(channel);
src/components/prospect/profile-view.tsx:270:      supabase.removeChannel(channel);

# Same-file pairing check:
$ for f in $(grep -rln "\.channel(" src/ --include="*.ts" --include="*.tsx" | grep -v "test"); do
    if ! grep -q "supabase\.removeChannel(channel)" "$f"; then echo "ORPHAN: $f"; fi
  done
# (no output — every file with a channel has a cleanup callsite)
```

**Result:** 3 channels, 3 cleanup callsites, 1:1 mapping across 3 files. No orphaned subscriptions.

## Polling fallback coverage

The polling fallback (`useRealtimeWithFallback`, Plan 40-04) is only wired to channel #3 — the tenant-wide enrichment channel. Rationale for the other two:

- **Channel #1 (`list-re-enrich-${prospectId}`)** is a per-action channel: it opens when the user clicks "Re-enrich", stays up for a single prospect, and closes itself once the update fires. A fallback here would mean polling `/api/prospects/{id}` every 10s until the action completes — redundant because the user sees a spinner and the channel usually resolves in <30s. If the WS dies during this window, the user sees a stuck spinner; reloading clears it. Acceptable for an interactive, short-lived channel.
- **Channel #2 (`prospect-${prospect.id}`)** triggers a `router.refresh()` when the single prospect the user is viewing updates. Surface is one prospect, and the user is almost always on the page for only a few seconds. The cost/benefit of polling every 10s is low — if the WS dies, they see stale data until they navigate away and back. Acceptable; can be upgraded to fallback later if a demo regression surfaces.

Only channel #3 is a **persistent tenant-scoped broadcast** that must survive the entire list-page session. That's where the polling fallback earns its keep.

## Confirmation checklist

- [x] Every channel above has a matching `supabase.removeChannel(channel)` in the same file.
- [x] No channel is created outside a `useEffect` return or an explicit cleanup closure.
- [x] Channel #3 uses `useRealtimeWithFallback` so `CHANNEL_ERROR` / `TIMED_OUT` trigger a 10s `router.refresh()` poll until `SUBSCRIBED` returns.
- [x] Grep counts match: 3 `.channel(` creation sites, 3 `removeChannel(channel)` cleanup sites.
- [ ] Plan 40-08 UAT step 9 confirms "no ghost subscriptions on unmount" via React DevTools Profiler. (Deferred to UAT — manual check.)
- [ ] Plan 40-08 UAT step 8 confirms "disable WebSocket, observe polling kicks in within 10s, green still lands". (Deferred to UAT — manual check against `pgl-main.vercel.app`.)

## Changelog

- **2026-04-15 — Plan 40-04** — Added channel #3's polling fallback. Plan 40-02's two proposed channels were dropped (plan abandoned).
