---
phase: 43
plan: 04
subsystem: prospect-profile-ui
tags: [ui, wealth-tier, profile-header, slide-over, d-07]
requires:
  - auto_wealth_tier DB columns (Plan 43-01)
  - prospect row fetch APIs returning auto_wealth_tier* fields
provides:
  - manual-then-auto fallback for Wealth Tier in the profile header
  - manual-then-auto fallback for Wealth Tier in the search slide-over
  - Sparkles indicator + HTML title tooltip when auto tier is displayed
affects:
  - src/components/prospect/profile-header.tsx
  - src/components/prospect/prospect-slide-over.tsx
tech-stack:
  added: []
  patterns:
    - Pattern 4 Option b (wrap container with HTML title attribute, not a custom tooltip)
    - Non-invasive reuse of existing InlineEditField primitive (D-07)
key-files:
  created: []
  modified:
    - src/components/prospect/profile-header.tsx
    - src/components/prospect/prospect-slide-over.tsx
decisions:
  - Reuse existing InlineEditField as black box; no new component or prop
  - HTML title attribute on wrapping div for reasoning tooltip (non-invasive)
  - Sparkles icon sized h-3 w-3 shrink-0, colored var(--gold-primary)
  - Sparkles only rendered when manual is null AND auto is set
  - originalValue on the InlineEditField set to autoTier so the "edited" tooltip still surfaces the auto value when a user overrides it
metrics:
  duration_seconds: 141
  tasks_completed: 2
  files_modified: 2
  completed_date: "2026-04-16"
---

# Phase 43 Plan 04: UI Wire-Through (Auto Wealth Tier Display) Summary

**One-liner:** Wired `auto_wealth_tier` into `profile-header.tsx` and `prospect-slide-over.tsx` with Sparkles indicator + HTML title tooltip (Pattern 4 Option b) — surfacing the Phase 43 estimator without a new component.

## What Changed

### `src/components/prospect/profile-header.tsx` (+49 / -20 lines)

1. **Imports:** Added `Sparkles` to the `lucide-react` named imports.
2. **Prospect interface:** Added four optional Phase 43 fields directly below `manual_wealth_tier?: string | null;`:
   ```ts
   auto_wealth_tier?: string | null;
   auto_wealth_tier_confidence?: string | null;
   auto_wealth_tier_reasoning?: string | null;
   auto_wealth_tier_estimated_at?: string | null;
   ```
3. **Wealth Tier block:** Replaced the single `InlineEditField` wrapper with an IIFE that:
   - Derives `manualTier`, `autoTier`, `isAutoDisplayed`, and `reasoning`
   - Wraps the container `<div>` with `title={isAutoDisplayed ? reasoning : undefined}`
   - Renders a `<Sparkles className="h-3 w-3 shrink-0" style={{ color: "var(--gold-primary)" }} aria-label="Auto-estimated wealth tier" />` when `isAutoDisplayed`
   - Passes `value={resolveField(manualTier, autoTier)}`, `originalValue={autoTier}`, and preserves the five existing `options` (ultra_high / very_high / high / emerging / unknown)
   - Preserves all current behavior when both manual and auto are null (placeholder "Set wealth tier...")

### `src/components/prospect/prospect-slide-over.tsx` (+18 / -3 lines)

1. **Imports:** `Sparkles` was already in the existing `lucide-react` import — no change needed.
2. **`EnrichedData` interface:** Added two lines immediately after `manual_wealth_tier: string | null;`:
   ```ts
   auto_wealth_tier: string | null;
   auto_wealth_tier_reasoning: string | null;
   ```
3. **Derivations (around line 123):**
   ```ts
   const displayWealthTier =
     enrichedData?.manual_wealth_tier ||
     enrichedData?.auto_wealth_tier ||
     null;
   const isAutoWealthTier =
     !enrichedData?.manual_wealth_tier && !!enrichedData?.auto_wealth_tier;
   const autoWealthTierReasoning = enrichedData?.auto_wealth_tier_reasoning ?? undefined;
   ```
4. **Render:** Wrapped `<p>` with `title={isAutoWealthTier ? autoWealthTierReasoning : undefined}`, converted to `inline-flex items-center gap-1`, and added a `<Sparkles className="h-3 w-3 shrink-0" aria-label="Auto-estimated wealth tier" />` before a `<span>{displayWealthTier}</span>` block when `isAutoWealthTier` is true.

## Sparkles Icon Placement

| Location                       | Size       | Color                     | Shown when                                                |
| ------------------------------ | ---------- | ------------------------- | --------------------------------------------------------- |
| profile-header Wealth Tier row | `h-3 w-3`  | `var(--gold-primary)`     | `manual_wealth_tier` null AND `auto_wealth_tier` not null |
| slide-over tier line           | `h-3 w-3`  | inherits `--gold-primary` | same condition                                            |

No Sparkles renders when (a) manual is set, or (b) both manual and auto are null.

## Tooltip Mechanism

Per Plan 04 Pattern 4 Option (b): **HTML `title` attribute on the wrapping `<div>` / `<p>`.** No custom tooltip component was introduced. React escapes the attribute value automatically — no XSS risk from LLM-emitted `auto_wealth_tier_reasoning` strings (threat T-43-10 mitigated).

Profile header uses `title` on the outer `<div>` wrapper; slide-over uses `title` directly on the tier `<p>`. Both gate the attribute on `isAutoDisplayed` / `isAutoWealthTier` so no empty tooltip appears on manual values.

## Deviations from Plan

None — both tasks executed exactly as written in the plan's `<action>` blocks. No auto-fixes, no architectural changes, no authentication gates.

Note: `src/components/prospect/prospect-slide-over.tsx` already had `Sparkles` in its `lucide-react` import statement (line 4, used elsewhere for the preview-state "Enrich & Save" card), so Edit 1 of Task 2 was a no-op in practice — the Sparkles import was already present and simply reused.

## Must-Haves Verification

| truth                                                                                                                   | result |
| ----------------------------------------------------------------------------------------------------------------------- | ------ |
| profile-header.tsx resolves manual first then auto_wealth_tier                                                          | PASS — `resolveField(manualTier, autoTier)` at line 264 |
| When auto is displayed, container has `title` attribute with reasoning                                                  | PASS — `title={isAutoDisplayed ? reasoning : undefined}` |
| Sparkles icon renders alongside value when auto is displayed                                                            | PASS — `{isAutoDisplayed && (<Sparkles ... aria-label="Auto-estimated wealth tier" />)}` |
| When manual set, no Sparkles, no tooltip                                                                                | PASS — both gated on `isAutoDisplayed` which requires `!manualTier` |
| When both null, placeholder renders                                                                                     | PASS — InlineEditField `placeholder="Set wealth tier..."` preserved |
| Prospect interface in profile-header.tsx extended with auto_wealth_tier* fields                                         | PASS — 4 fields added (lines 57-60) |
| prospect-slide-over.tsx EnrichedData extended with auto_wealth_tier + auto_wealth_tier_reasoning                        | PASS — 2 fields added in EnrichedData |
| displayWealthTier resolves to manual ?? auto ?? null                                                                    | PASS — `enrichedData?.manual_wealth_tier \|\| enrichedData?.auto_wealth_tier \|\| null` |
| Slide-over shows Sparkles + title tooltip with reasoning when auto is displayed                                         | PASS — isAutoWealthTier-gated Sparkles + autoWealthTierReasoning in title |
| `pnpm tsc --noEmit` exits 0                                                                                             | PASS for our files (no new errors in profile-header.tsx or prospect-slide-over.tsx); pre-existing errors in `src/lib/search/__tests__/execute-research.test.ts` are out of scope |

## Artifacts & Links

- `src/components/prospect/profile-header.tsx` provides Wealth Tier InlineEditField wired to auto fallback + reasoning tooltip + Sparkles — contains `auto_wealth_tier` (7 occurrences)
- `src/components/prospect/prospect-slide-over.tsx` provides slide-over tier display wired to auto fallback — contains `auto_wealth_tier` (5 occurrences)
- Key link: `prospect.auto_wealth_tier` → `InlineEditField value` via `resolveField(manualTier, autoTier)` (matched pattern `resolveField\(manualTier, autoTier\)`)
- Key link: `prospect.auto_wealth_tier_reasoning` → HTML `title` attribute on container div via `title={isAutoDisplayed ? reasoning : undefined}` (matched pattern `auto_wealth_tier_reasoning`)

## Manual-Verification Notes (for Plan 06 UAT checklist)

**Test case matrix — open a prospect dossier and verify each combination:**

| `manual_wealth_tier` | `auto_wealth_tier`   | Expected profile-header render                                                                            |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| null                 | null                 | Placeholder "Set wealth tier..." in muted text. No Sparkles, no hover tooltip.                             |
| null                 | `ultra_high`         | Label "Ultra-High ($50M+)" with gold Sparkles on the left. Hover shows `auto_wealth_tier_reasoning` text. |
| `high`               | null                 | Label "High ($5-10M)". No Sparkles. No reasoning tooltip. Amber "edited" dot still applies if appropriate. |
| `high`               | `ultra_high`         | Label "High ($5-10M)" (manual wins). No Sparkles. No reasoning tooltip. `originalValue={autoTier}` feeds the "Original: ultra_high" hover on the amber dot so users can see the auto estimate they overrode. |

**Slide-over tests (open from search results):**

| `manual_wealth_tier` | `auto_wealth_tier`   | Expected slide-over render                                                          |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| null                 | null                 | Tier line absent (falsy check on `displayWealthTier`).                              |
| null                 | `very_high`          | Small gold Sparkles + "very_high" text in gold. Hover shows reasoning tooltip.      |
| `emerging`           | null                 | "emerging" text in gold. No Sparkles. No reasoning tooltip.                         |
| `emerging`           | `very_high`          | "emerging" text (manual wins). No Sparkles. No reasoning tooltip.                   |

**Edge cases to confirm manually in Plan 06:**

- Double-click to edit on profile-header when `isAutoDisplayed` — the select should open with the auto value pre-selected (via `value={resolveField(manualTier, autoTier)}`). Save with a different value → Sparkles disappears, amber "edited" dot appears, reasoning tooltip goes away.
- Clear a manual override back to empty via inline edit → if auto exists, Sparkles + tooltip should reappear.
- Hover behavior on touch devices: `title` attribute is a desktop-only UX. Acceptable for now (mobile UAT already covered by Phase 17). No regressions expected since the Sparkles still signals "auto" visually.

## Self-Check: PASSED

- [x] `src/components/prospect/profile-header.tsx` modified — verified via `grep -c "auto_wealth_tier"` returns 7
- [x] `src/components/prospect/prospect-slide-over.tsx` modified — verified via `grep -c "auto_wealth_tier"` returns 5
- [x] Task 1 commit `66b441e` exists — `git log` confirmed
- [x] Task 2 commit `9ed7ee6` exists — `git log` confirmed
- [x] No new hardcoded hex colors in diff — `git diff | grep '^+' | grep '#[0-9a-fA-F]'` returns nothing
- [x] No `titleTooltip` prop introduced — `grep -c "titleTooltip"` returns 0 on profile-header
