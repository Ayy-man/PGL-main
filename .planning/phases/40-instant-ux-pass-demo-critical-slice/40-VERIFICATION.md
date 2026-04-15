# Phase 40 — Verification

**Run:** 2026-04-15 by Plan 40-08 (Task 1)
**Base commit:** `84a65ab` (head of phase-40 work)
**Executed in:** worktree `agent-aca5af19` against a fully-populated `node_modules/`

---

## Plan Coverage

| Plan | Surface | Tests | Status |
|------|---------|-------|--------|
| 40-01 | Mutating-surface audit | n/a (docs-only) | SUMMARY present, `40-AUDIT.md` produced (38 entries) |
| 40-02 | `saved_search_prospects` realtime | n/a | **ABANDONED** — `40-02-PLAN.md` frontmatter `status: ABANDONED` (schema mismatch; Adrian fix delivered by 40-03) |
| 40-03 | `prospects.enriched_at` realtime | 11/11 | SUMMARY present, 4 commits |
| 40-04 | Polling fallback + channel audit | 13/13 | SUMMARY present, 3 commits |
| 40-05 | Optimistic lists create/delete | 17/17 | SUMMARY present, 5 commits (incl. scope-expansion glue) |
| 40-06 | Optimistic dismiss/tags/profile | 28/28 | SUMMARY present, 7 commits |
| 40-07 | Skeletons bulk-enrich/extend/research-verify | 16/16 | SUMMARY present, 4 commits |

**Plans executed: 7 of 8 planned (1 abandoned).**
**Total new automated tests introduced in Phase 40: 85/85 passing.**

- [x] 40-01 — `40-AUDIT.md` exists with ≥ 28 rows (actual: 38 entries across 4 tables + Amendments section)
- [x] 40-02 — ABANDONED; replacement surface (prospects channel) delivered by 40-03
- [x] 40-03 — `prospects-enriched` channel + reducer tests pass
- [x] 40-04 — `useRealtimeWithFallback` hook + `40-CHANNEL-AUDIT.md` exist; tests pass
- [x] 40-05 — `ListGrid` optimistic create + delete + 17 reducer tests
- [x] 40-06 — dismiss + tags + profile-edit optimistic + 28 reducer tests
- [x] 40-07 — skeletons for bulk-enrich + extend-search + research shimmer verified

---

## Automated

### Phase-40 test files (new in this phase)

Command:
```
pnpm exec vitest run \
  src/lib/realtime/__tests__/prospects-enriched-handler.test.ts \
  src/lib/realtime/__tests__/with-polling-fallback.test.ts \
  'src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx' \
  'src/app/[orgId]/search/components/__tests__/dismiss.optimistic.test.tsx' \
  src/components/prospect/__tests__/tags.optimistic.test.tsx \
  src/components/prospect/__tests__/profile-edit.optimistic.test.tsx \
  src/components/ui/__tests__/skeleton-row.test.tsx
```

Result:
```
✓ src/components/prospect/__tests__/profile-edit.optimistic.test.tsx   (6 tests)
✓ src/components/prospect/__tests__/tags.optimistic.test.tsx           (11 tests)
✓ src/components/ui/__tests__/skeleton-row.test.tsx                    (16 tests)
✓ src/app/[orgId]/search/components/__tests__/dismiss.optimistic.test.tsx  (11 tests)
✓ src/lib/realtime/__tests__/prospects-enriched-handler.test.ts        (11 tests)
✓ src/lib/realtime/__tests__/with-polling-fallback.test.ts             (13 tests)
✓ src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx (17 tests)

 Test Files  7 passed (7)
      Tests  85 passed (85)
```

Per-plan contribution:

| Plan | Test file | Tests |
|------|-----------|-------|
| 40-03 | `src/lib/realtime/__tests__/prospects-enriched-handler.test.ts` | 11 |
| 40-04 | `src/lib/realtime/__tests__/with-polling-fallback.test.ts` | 13 |
| 40-05 | `src/app/[orgId]/lists/components/__tests__/list-grid.optimistic.test.tsx` | 17 |
| 40-06 | `src/app/[orgId]/search/components/__tests__/dismiss.optimistic.test.tsx` | 11 |
| 40-06 | `src/components/prospect/__tests__/tags.optimistic.test.tsx` | 11 |
| 40-06 | `src/components/prospect/__tests__/profile-edit.optimistic.test.tsx` | 6 |
| 40-07 | `src/components/ui/__tests__/skeleton-row.test.tsx` | 16 |
| **Total** | | **85** |

### Full suite (for context)

Command: `pnpm exec vitest run`

Result:
```
 Test Files  1 failed | 13 passed (14)
      Tests  22 failed | 158 passed (180)
```

**Pass rate on Phase 40 scope: 85/85 (100%).** The 22 failures are all in `src/inngest/functions/__tests__/enrich-prospect.test.ts` and are pre-existing (root cause: `supabase.rpc is not a function` — mock Supabase client missing an `rpc` stub). Confirmed out-of-scope and logged in `.planning/phases/40-instant-ux-pass-demo-critical-slice/deferred-items.md` under "Pre-existing test failures (enrich-prospect)" by Plan 40-06 discovery (stash-pop verified against base `085482b`).

### Build

Command: `pnpm exec next build`

Result: **Exit code 0.** Full compile + type-check + static-prerender succeeded in this worktree at commit `84a65ab`.

Historical note: Plans 40-03, 40-04, 40-06, and 40-07 all logged `next build` prerender failures on 14 auth/admin/onboarding pages (`TypeError: Cannot read properties of undefined (reading 'trim')`) caused by `process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()` at module scope in `src/lib/supabase/client.ts` when no local `.env.local` is present. That failure was reproducible on the base commit before any Phase 40 work (confirmed by stash-pop tests in Plans 40-03, 40-06, 40-07 — see `deferred-items.md` "Pre-existing build-time prerender errors"). In the current worktree env the build produces exit 0 because the env vars are present. No Phase-40 code regresses the build.

---

## Channel-cleanup grep contract

Commands as specified by the plan, adjusted to match how the channels are actually written (chained calls — `supabase` and `.channel()` are on different lines in every callsite, so the plan's original `supabase.*\.channel(` regex returns 0 even though channels exist). I ran both the plan's original pattern and the adjusted pattern and documented both:

```
$ grep -rn "supabase.*\.channel(" src/ --include="*.ts" --include="*.tsx" | wc -l
0   # plan's original pattern — misses all 3 callsites due to chained call style

$ grep -rn "\.channel(" src/ --include="*.ts" --include="*.tsx" | wc -l
3   # actual supabase.channel(...) callsites
```

Actual callsites:

```
src/components/prospect/profile-view.tsx:253:       .channel(`prospect-${prospect.id}`)
src/app/[orgId]/lists/components/list-member-table.tsx:203:  .channel(`list-re-enrich-${prospectId}`)
src/app/[orgId]/lists/components/list-prospects-realtime.tsx:65: .channel(`prospects-enriched-${tenantId}`)
```

Cleanup:

```
$ grep -rn "removeChannel" src/ --include="*.ts" --include="*.tsx"
src/app/[orgId]/lists/components/list-prospects-realtime.tsx:39: * Cleanup: `supabase.removeChannel(channel)` runs on unmount (the cleanup
src/app/[orgId]/lists/components/list-prospects-realtime.tsx:90:        supabase.removeChannel(channel);
src/app/[orgId]/lists/components/list-member-table.tsx:215:            supabase.removeChannel(channel);
src/components/prospect/profile-view.tsx:271:      supabase.removeChannel(channel);
src/lib/realtime/with-polling-fallback.ts:105: * cleanup function MUST call `supabase.removeChannel(channel)` — the hook
src/lib/realtime/with-polling-fallback.ts:117:   *   runs `supabase.removeChannel(channel)`.
```

Of those 6 hits: **3 are actual call-site invocations** (one per channel, all in `useEffect` return callbacks) and 3 are documentation comments. The invocations:

```
src/app/[orgId]/lists/components/list-prospects-realtime.tsx:90   supabase.removeChannel(channel);
src/app/[orgId]/lists/components/list-member-table.tsx:215        supabase.removeChannel(channel);
src/components/prospect/profile-view.tsx:271                      supabase.removeChannel(channel);
```

**1:1 pairing confirmed: 3 channels ↔ 3 `removeChannel` call-sites, co-located in the same file.** Matches `40-CHANNEL-AUDIT.md`.

### Realtime filter string audit

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `supabase .channel(` callsite count | ≥ 3 | 3 | PASS |
| `supabase.removeChannel` call invocations | ≥ channel count | 3 | PASS (1:1) |
| `tenant_id=eq` Realtime filter strings | ≥ 1 (Plan 40-03) | 1 in `list-prospects-realtime.tsx:72` (+ 2 comment refs) | PASS |
| `id=eq.` Realtime filter strings | ≥ 2 (pre-existing R1 + R2) | 2 (`list-member-table.tsx:206`, `profile-view.tsx:260`) | PASS |
| `id=in.(` in any Realtime filter string (banned per ~100-char cap) | 0 | 0 | PASS (3 hits are all inline comments documenting why it is banned) |
| `saved_search_prospects` DB-query references (non-realtime) | n/a (docs purposes) | 6 refs (routes + inngest + helpers); 0 in realtime channels | PASS — no orphaned subscriber after 40-02 abandonment |
| `useRealtimeWithFallback` wrapping of new channel | 1 (`list-prospects-realtime.tsx`) | 1 (imported + called at line 59) | PASS |

### Channel inventory

| # | Channel | Table | Filter | File | Wrapped with fallback? | Cleanup? |
|---|---------|-------|--------|------|------------------------|----------|
| 1 | `list-re-enrich-${prospectId}` | `prospects` | `id=eq.${prospectId}` | `src/app/[orgId]/lists/components/list-member-table.tsx:203` | No (short-lived per-row) | Yes, line 215 |
| 2 | `prospect-${prospect.id}` | `prospects` | `id=eq.${prospect.id}` | `src/components/prospect/profile-view.tsx:253` | No (slide-over scope, small surface) | Yes, line 271 |
| 3 | `prospects-enriched-${tenantId}` | `prospects` | `tenant_id=eq.${tenantId}` | `src/app/[orgId]/lists/components/list-prospects-realtime.tsx:65` | **Yes** (via `useRealtimeWithFallback`, 10s `router.refresh()` poll on `CHANNEL_ERROR`/`TIMED_OUT`) | Yes, line 90 |

Channels #1 and #2 are the pre-existing baselines (already working before Phase 40). Channel #3 is the new Phase 40 addition that closes Adrian's "refresh to see green" complaint. See `40-CHANNEL-AUDIT.md` for the full per-channel audit.

---

## Abandoned plan disclosure

**Plan 40-02 (`saved_search_prospects` realtime) — ABANDONED.**

Documented in:
- `40-02-PLAN.md` frontmatter (`status: ABANDONED`)
- `40-AUDIT.md` "Amendments" section (2026-04-15 — Plan 40-02 abandoned; 11 → 10 in-scope surfaces for Phase 40)
- `40-04-SUMMARY.md` deviation #1 (retrofit scope reduced from 3 files → 1 file accordingly)

**Rationale (paraphrased from the Amendments section):**
1. `saved_search_prospects` has no `enrichment_status` column — it has `status` with values `active` / `dismissed` / `enriched`.
2. The list-members page pill Adrian complained about reads `member.prospect.enrichment_status`, which is sourced from the `prospects` table, not `saved_search_prospects`.
3. Plan 40-03's `prospects` channel (R4 = `prospects-enriched-${tenantId}`) delivers the actual live-pill-flip Adrian asked for.

**Consequence for Phase 40 scope:** 11 → 10 in-scope surfaces. Remaining 10: R4 (40-03) + P1 (40-04) + #1 createList + #2 deleteList + #14 tags + #16 profile edit + #18 dismiss + #19 bulk-enrich + #20 extend + #29 research-verify (all 40-05 / 40-06 / 40-07).

**Future work parked in Phase 40.1:** a separate `saved_search_prospects` UPDATE subscription for the saved-search-results page (different surface from the list-members page; would flip the result-card "enriched" badge live when a user bulk-enriches from another tab). Recaptured in the Amendments section; not shipping in Phase 40.

---

## Sign-off

Automated checks: **PASS.**

- 85/85 new Phase 40 tests passing.
- `pnpm build` exit 0 at `84a65ab` (pre-existing `.trim()` prerender bug does not reproduce in this worktree environment; unrelated to Phase 40 scope when it does).
- Channel-cleanup grep contract: 3 channels, 3 cleanup call-sites, 1:1 paired and co-located.
- No `id=in.(...)` Realtime filter strings (~100-char cap respected across all 3 channels).
- New tenant-wide channel is wrapped in `useRealtimeWithFallback` with a 10s `router.refresh()` polling fallback on `CHANNEL_ERROR` / `TIMED_OUT`.
- No orphaned references to the abandoned Plan 40-02 `saved_search_prospects` realtime surface.

Manual UAT handoff: see `40-UAT.md` (9-step browser checklist against `https://pgl-main.vercel.app`; `checkpoint:human-verify` per Plan 40-08 Task 3).

---

*Generated: 2026-04-15 · Plan 40-08 Task 1 · Phase 40 · base commit `84a65ab`*
