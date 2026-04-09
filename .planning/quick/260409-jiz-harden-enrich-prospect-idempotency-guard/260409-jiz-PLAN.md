---
phase: quick/260409-jiz-harden-enrich-prospect-idempotency-guard
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/inngest/functions/enrich-prospect.ts
autonomous: true
requirements:
  - QUICK-260409-jiz-01  # concurrent-trigger idempotency guard
  - QUICK-260409-jiz-02  # batched prospect_signals inserts

must_haves:
  truths:
    - "A second Inngest trigger for the same prospectId within the idempotency retention window is suppressed by Inngest before any ContactOut/Exa/SEC credits are spent."
    - "Exa digested signals for a single enrichment run are written to prospect_signals in ONE Supabase insert call, not one call per signal."
    - "SEC EFTS-only branch writes its signals to prospect_signals in ONE Supabase insert call per run."
    - "SEC EDGAR CIK branch writes its transaction signals to prospect_signals in ONE Supabase insert call per run."
    - "A failure in any of the three batch inserts logs a single error and does NOT throw out of its parent step.run — enrichment proceeds to the next source as before."
    - "The existing enrichment_source_status payloads for exa/sec are unchanged (same keys, same values, same order of updateSourceStatus calls)."
  artifacts:
    - path: "src/inngest/functions/enrich-prospect.ts"
      provides: "enrichProspect Inngest function with idempotency key and batched signal inserts"
      contains: "idempotency:"
  key_links:
    - from: "inngest.createFunction config"
      to: "event.data.prospectId"
      via: "idempotency CEL expression"
      pattern: "idempotency:\\s*\"event\\.data\\.prospectId\""
    - from: "digestedSignals (exa branch)"
      to: "supabase.from(\"prospect_signals\").insert(signalRows)"
      via: "single batched insert"
      pattern: "insert\\(signalRows\\)"
    - from: "secSignalRows (CIK branch)"
      to: "supabase.from(\"prospect_signals\").insert(secSignalRows)"
      via: "single batched insert"
      pattern: "insert\\(secSignalRows\\)"
---

<objective>
Harden `src/inngest/functions/enrich-prospect.ts` against two review findings without refactoring anything else in the file:

1. **Concurrent-trigger double-charge:** The current step 0 dedup guard at lines 108-150 only catches the case where a PRIOR run already wrote `status: 'enriched'` to `saved_search_prospects`. If a second Inngest trigger for the same `prospectId` arrives while the first run is still executing (or before either has written any row), BOTH runs will call ContactOut → Exa → SEC EDGAR and double-charge external API credits. Fix: add Inngest's top-level `idempotency` key on the function config so duplicate events for the same `prospectId` are suppressed by Inngest itself, before any step runs.

2. **N+1 signal inserts:** Three places in the file loop single-row inserts into `prospect_signals` (lines ~323-329 for Exa, ~426-442 for SEC EFTS, ~519-525 for SEC CIK). This is N+1 on the DB and leaves partial rows if the loop crashes mid-way. Fix: collect rows into an array (already partially done for Exa and SEC CIK via `signalRows` / `secSignalRows`) and do a single batched insert per source, preserving existing duplicate-error tolerance and per-source error isolation.

Purpose: Prevent credit double-charging on concurrent triggers and reduce DB round-trips / partial-insert risk during signal writes, with zero behavioral change to enrichment semantics or source status tracking.

Output: A single modified file, `src/inngest/functions/enrich-prospect.ts`, that compiles cleanly and passes `pnpm lint`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/inngest/functions/enrich-prospect.ts
@package.json

<interfaces>
<!-- Inngest SDK 3.52.6 function config — confirmed via node_modules/inngest/types.d.ts -->
<!-- `idempotency` is a top-level string field on inngest.createFunction options, -->
<!-- sibling to `id`, `retries`, `concurrency`, `onFailure`. It takes a CEL-like -->
<!-- expression over the event payload. -->

inngest.createFunction options (from inngest@3.52.6 types.d.ts line 1206 + 1358 + 1418):
```typescript
{
  id: string;
  name?: string;
  retries?: number;
  concurrency?: ConcurrencyOption | ConcurrencyOption[];
  idempotency?: string;  // CEL expression over event payload
  batchEvents?: { ... };
  rateLimit?: { ... };
  onFailure?: (ctx) => Promise<void>;
}
```

Usage for this file: `idempotency: "event.data.prospectId"`

Supabase batch insert signature (already used elsewhere in the file, e.g. the `prospects` update pattern):
```typescript
const { error } = await supabase
  .from("prospect_signals")
  .insert(rowsArray);  // accepts an array of rows — this IS the batched form
```

DigestedSignal row shape (already constructed at lines 311-321 — do NOT change):
```typescript
{
  prospect_id: string;
  tenant_id: string;
  category: string;
  headline: string;
  summary: string;
  source_url: string | null;
  event_date: string | null;
  raw_source: "exa" | "sec-edgar";
  is_new: boolean;
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add idempotency key to enrichProspect function config</name>
  <files>src/inngest/functions/enrich-prospect.ts</files>
  <behavior>
    - Inngest suppresses duplicate `prospect/enrich.requested` events sharing the same `event.data.prospectId` within the retention window, BEFORE any step runs.
    - A second trigger for the same prospectId arriving while the first run is in-flight does NOT execute ContactOut, Exa, or SEC steps (zero additional external API credits).
    - Single-trigger behavior is unchanged: normal enrichment runs exactly as today.
    - TypeScript compiles cleanly (`idempotency` is a recognized top-level option in inngest@3.52.6 per types.d.ts line 1206, 1358, 1418).
  </behavior>
  <action>
In `src/inngest/functions/enrich-prospect.ts`, modify ONLY the first argument object passed to `inngest.createFunction` (currently at lines 60-89). Add a new property `idempotency: "event.data.prospectId"` as a sibling to `id`, `retries`, `concurrency`, and `onFailure`. Place it immediately after the `concurrency` line for readability.

Exact change — the opening of `createFunction` must go from:

```typescript
export const enrichProspect = inngest.createFunction(
  {
    id: "enrich-prospect",
    retries: 3,
    concurrency: [{ limit: 5 }], // Max 5 concurrent enrichments to manage API rate limits
    onFailure: async ({ error, event }) => {
```

to:

```typescript
export const enrichProspect = inngest.createFunction(
  {
    id: "enrich-prospect",
    retries: 3,
    concurrency: [{ limit: 5 }], // Max 5 concurrent enrichments to manage API rate limits
    // Suppress duplicate triggers for the same prospectId within the retention window.
    // Prevents double-charging ContactOut/Exa/SEC credits when two enrich events for
    // the same prospect arrive concurrently (the existing step-0 dedup only catches
    // AFTER a prior run has already written `enriched` to saved_search_prospects).
    idempotency: "event.data.prospectId",
    onFailure: async ({ error, event }) => {
```

Do NOT:
- Touch `retries`, `concurrency`, or `onFailure`.
- Remove or modify the existing step-0 `check-duplicate-enrichment` block at lines 108-150 — it handles a different case (re-trigger AFTER a prior completed run in a different saved search, where the retention window has likely expired).
- Rename variables or reorder other options.
- Add any other Inngest config options.

SDK version check already done: `package.json` shows `"inngest": "^3.52.6"` and `node_modules/inngest/types.d.ts` line 1206 defines `idempotency: z.ZodOptional&lt;z.ZodString&gt;` on the function config schema, with the inferred type showing `idempotency?: string | undefined` at lines 1358 and 1418. The preferred path is available — do NOT use the fallback row-level claim approach.
  </action>
  <verify>
    <automated>pnpm lint 2>&amp;1 | tee /tmp/pgl-lint-task1.log &amp;&amp; grep -n 'idempotency:\s*"event\.data\.prospectId"' src/inngest/functions/enrich-prospect.ts &amp;&amp; pnpm exec tsc --noEmit 2>&amp;1 | tee /tmp/pgl-tsc-task1.log</automated>
  </verify>
  <done>
    - `idempotency: "event.data.prospectId"` appears exactly once in `src/inngest/functions/enrich-prospect.ts`, inside the first argument of `inngest.createFunction`, between `concurrency` and `onFailure`.
    - `pnpm lint` passes with no new errors or warnings attributable to this file.
    - `pnpm exec tsc --noEmit` passes (idempotency key is type-checked as a valid inngest@3.52.6 option).
    - The existing step-0 `check-duplicate-enrichment` block is untouched (byte-for-byte identical at lines 108-150).
    - `concurrency: [{ limit: 5 }]`, `retries: 3`, and `onFailure` are unchanged.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Batch prospect_signals inserts in all three source branches</name>
  <files>src/inngest/functions/enrich-prospect.ts</files>
  <behavior>
    - Exa branch writes all digested signals in ONE `.insert(signalRows)` call instead of a per-row loop.
    - SEC EFTS-only branch (when `effectiveCik` is null but name search succeeds) writes all transactions in ONE `.insert(eftsSignalRows)` call.
    - SEC EDGAR CIK branch writes all transactions in ONE `.insert(secSignalRows)` call (removing the existing inner loop).
    - For each branch, a duplicate-key error on the batch is logged once (not re-thrown), matching the prior per-row behavior of ignoring error messages containing `"duplicate"`.
    - For each branch, a non-duplicate error is logged once with a descriptive prefix (`[enrich] exa signal batch insert error:`, `[enrich] SEC EFTS signal batch insert error:`, `[enrich] SEC signal batch insert error:`) and does NOT throw out of the enclosing `step.run` callback — source status and downstream steps are unaffected.
    - The ROWS written are byte-for-byte identical to today — only the call shape changes.
  </behavior>
  <action>
Make three surgical edits inside the existing `step.run` callbacks. Do NOT move code between steps, do NOT change `updateSourceStatus` calls, do NOT change `logProspectActivity` calls, do NOT alter the row objects.

---

**Edit A — Exa branch (currently lines 322-329):**

Replace:
```typescript
          // Insert signals — ignore duplicates (partial unique index on source_url)
          for (const row of signalRows) {
            await supabase.from("prospect_signals").insert(row).then(({ error: insertErr }) => {
              if (insertErr && !insertErr.message.includes("duplicate")) {
                console.error("[enrich] signal insert error:", insertErr.message);
              }
            });
          }
```

With:
```typescript
          // Batched insert — single round-trip, ignore duplicates (partial unique index on source_url).
          // Failure here is logged once and swallowed so the rest of the enrichment continues.
          const { error: exaSignalInsertErr } = await supabase
            .from("prospect_signals")
            .insert(signalRows);
          if (exaSignalInsertErr && !exaSignalInsertErr.message.includes("duplicate")) {
            console.error("[enrich] exa signal batch insert error:", exaSignalInsertErr.message);
          }
```

---

**Edit B — SEC EFTS-only branch (currently lines 426-442):**

Replace:
```typescript
            for (const tx of eftsResult.transactions) {
              await supabase.from("prospect_signals").insert({
                prospect_id: prospectId,
                tenant_id: tenantId,
                category: "sec_filing",
                headline: `${tx.transactionType} ${tx.shares.toLocaleString()} shares ($${tx.totalValue.toLocaleString()})`,
                summary: `SEC Form 4: ${tx.transactionType} of ${tx.shares.toLocaleString()} shares at $${tx.pricePerShare.toFixed(2)}/share, total value $${tx.totalValue.toLocaleString()}. Filed ${tx.filingDate}.`,
                source_url: null,
                event_date: tx.filingDate || null,
                raw_source: "sec-edgar",
                is_new: true,
              }).then(({ error: insertErr }) => {
                if (insertErr && !insertErr.message.includes("duplicate")) {
                  console.error("[enrich] SEC EFTS signal insert error:", insertErr.message);
                }
              });
            }
```

With:
```typescript
            // Batched insert — single round-trip. Row shape unchanged from the prior per-row loop.
            const eftsSignalRows = eftsResult.transactions.map((tx) => ({
              prospect_id: prospectId,
              tenant_id: tenantId,
              category: "sec_filing",
              headline: `${tx.transactionType} ${tx.shares.toLocaleString()} shares ($${tx.totalValue.toLocaleString()})`,
              summary: `SEC Form 4: ${tx.transactionType} of ${tx.shares.toLocaleString()} shares at $${tx.pricePerShare.toFixed(2)}/share, total value $${tx.totalValue.toLocaleString()}. Filed ${tx.filingDate}.`,
              source_url: null,
              event_date: tx.filingDate || null,
              raw_source: "sec-edgar",
              is_new: true,
            }));
            const { error: eftsSignalInsertErr } = await supabase
              .from("prospect_signals")
              .insert(eftsSignalRows);
            if (eftsSignalInsertErr && !eftsSignalInsertErr.message.includes("duplicate")) {
              console.error("[enrich] SEC EFTS signal batch insert error:", eftsSignalInsertErr.message);
            }
```

Note: Preserve the enclosing `if (eftsResult.found && eftsResult.transactions.length > 0) { ... }` guard — it already ensures the array is non-empty before constructing/inserting rows.

---

**Edit C — SEC EDGAR CIK branch (currently lines 518-526):**

Replace:
```typescript
          if (secSignalRows.length > 0) {
            for (const row of secSignalRows) {
              await supabase.from("prospect_signals").insert(row).then(({ error: insertErr }) => {
                if (insertErr && !insertErr.message.includes("duplicate")) {
                  console.error("[enrich] SEC signal insert error:", insertErr.message);
                }
              });
            }
          }
```

With:
```typescript
          if (secSignalRows.length > 0) {
            // Batched insert — single round-trip.
            const { error: secSignalInsertErr } = await supabase
              .from("prospect_signals")
              .insert(secSignalRows);
            if (secSignalInsertErr && !secSignalInsertErr.message.includes("duplicate")) {
              console.error("[enrich] SEC signal batch insert error:", secSignalInsertErr.message);
            }
          }
```

---

**Hard constraints for all three edits:**
- Do NOT wrap the batch insert in an extra try/catch — it sits inside an existing `try { ... } catch (error) { ... }` that already marks the source as failed and returns. An unhandled throw from the insert would flow into that catch, which is WRONG for this task. Using the destructured `{ error }` pattern (not awaited `.then` chains, not throws) keeps failures out of the outer catch AND out of the step retry path, matching the prior per-row behavior exactly.
- Do NOT change the `signalRows` / `secSignalRows` construction (Edits A and C). Only the insert call shape changes.
- Do NOT consolidate the three inserts into a helper function — keep each branch self-contained for minimal diff.
- Do NOT change the error-message-includes-`"duplicate"` filter. Supabase returns a duplicate-key error with `"duplicate"` in `.message` for conflicts on the partial unique index on `source_url`; preserving this filter keeps the "ignore dupes" semantic identical.
  </action>
  <verify>
    <automated>pnpm lint 2>&amp;1 | tee /tmp/pgl-lint-task2.log &amp;&amp; pnpm exec tsc --noEmit 2>&amp;1 | tee /tmp/pgl-tsc-task2.log &amp;&amp; grep -c 'supabase.from("prospect_signals").insert' src/inngest/functions/enrich-prospect.ts &amp;&amp; grep -n 'exa signal batch insert error\|SEC EFTS signal batch insert error\|SEC signal batch insert error' src/inngest/functions/enrich-prospect.ts</automated>
  </verify>
  <done>
    - Exactly THREE `supabase.from("prospect_signals").insert(...)` calls remain in the file (one per branch: Exa, SEC EFTS, SEC CIK). Verify with `grep -c` above — expect `3`.
    - Zero `for (const ... of signalRows)` / `for (const tx of eftsResult.transactions)` loops around `prospect_signals` inserts remain in the file.
    - The three distinct error log prefixes are present exactly once each: `[enrich] exa signal batch insert error:`, `[enrich] SEC EFTS signal batch insert error:`, `[enrich] SEC signal batch insert error:`.
    - `pnpm lint` passes.
    - `pnpm exec tsc --noEmit` passes.
    - Every other line of `src/inngest/functions/enrich-prospect.ts` outside the three edit sites and the Task 1 `idempotency` addition is byte-for-byte unchanged (`git diff --stat` shows ONLY `src/inngest/functions/enrich-prospect.ts` modified, and `git diff` shows only the four intended hunks).
    - All existing `updateSourceStatus` calls for `"exa"` and `"sec"` remain in place with identical payloads and ordering.
  </done>
</task>

</tasks>

<verification>
Final gate on the whole plan (run after both tasks complete):

```bash
# 1. Lint + typecheck clean
pnpm lint
pnpm exec tsc --noEmit

# 2. Exactly one idempotency key
grep -cE 'idempotency:\s*"event\.data\.prospectId"' src/inngest/functions/enrich-prospect.ts
# expect: 1

# 3. Exactly three prospect_signals insert calls (Exa, SEC EFTS, SEC CIK)
grep -cE 'supabase\.from\("prospect_signals"\)\.insert' src/inngest/functions/enrich-prospect.ts
# expect: 3

# 4. Zero per-row loops around prospect_signals inserts
grep -cE 'for \([^)]*\).*\{[^}]*prospect_signals' src/inngest/functions/enrich-prospect.ts
# expect: 0

# 5. Single file touched
git diff --stat src/inngest/functions/enrich-prospect.ts
git status --porcelain | grep -v 'src/inngest/functions/enrich-prospect.ts\|.planning/quick/260409-jiz'
# expect: no other modified files
```

Smoke-check semantics (human-readable diff review — not a blocker, just sanity):
- Re-read the diff. Confirm that:
  - The step-0 `check-duplicate-enrichment` block (lines 108-150 in the original) is unchanged.
  - Every `await updateSourceStatus(prospectId, "exa", ...)` and `await updateSourceStatus(prospectId, "sec", ...)` call is unchanged (count, order, payload).
  - `logProspectActivity` calls are unchanged.
  - Row construction for `signalRows` (Exa, lines ~311-321) and `secSignalRows` (SEC CIK, lines ~507-517) is byte-for-byte identical to before.
  - The new `eftsSignalRows` array (Edit B) produces rows whose fields exactly match the prior inline object literal.
</verification>

<success_criteria>
- `src/inngest/functions/enrich-prospect.ts` contains `idempotency: "event.data.prospectId"` as a top-level option on the `inngest.createFunction` config.
- All three `prospect_signals` insert sites use a single batched `.insert(rowsArray)` call with a destructured `{ error }` check and a source-specific log prefix.
- `pnpm lint` and `pnpm exec tsc --noEmit` both pass.
- No other files are modified.
- Behavior-wise: a concurrent duplicate trigger for the same `prospectId` is suppressed by Inngest before step 0 runs; a single duplicate-key error on a signal batch is logged once and swallowed (enrichment continues); a non-duplicate error is logged once with the new batch prefix and also swallowed.
- Existing enrichment semantics (source status tracking, per-source error isolation, activity logging, step ordering) are untouched.
</success_criteria>

<output>
After completion, create `.planning/quick/260409-jiz-harden-enrich-prospect-idempotency-guard/260409-jiz-SUMMARY.md` summarizing:
- The exact diff applied (idempotency key + three batched inserts)
- Confirmation of SDK version compatibility
- `pnpm lint` + `pnpm exec tsc --noEmit` results
- Any deviation from this plan (there should be none)
</output>
