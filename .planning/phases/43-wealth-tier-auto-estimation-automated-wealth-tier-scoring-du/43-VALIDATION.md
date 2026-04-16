---
phase: 43
slug: wealth-tier-auto-estimation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (existing — see `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- --run src/lib/enrichment/wealth-tier.test.ts` |
| **Full suite command** | `pnpm test -- --run` |
| **Estimated runtime** | ~20 seconds for wealth-tier suite; ~45 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green AND `pnpm build` clean AND migration applied locally against Supabase dev DB
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 1 | phase-goal | T-43-01 | Migration applies cleanly, 4 columns added | smoke | `supabase db push && psql -c "\d prospects" \| grep auto_wealth_tier` | ❌ W0 | ⬜ pending |
| 43-01-02 | 01 | 1 | phase-goal | — | Types include 4 new fields | typecheck | `pnpm tsc --noEmit` | ❌ W0 | ⬜ pending |
| 43-02-01 | 02 | 2 | phase-goal | T-43-02 | estimateWealthTier returns valid enum | unit | `pnpm test -- --run src/lib/enrichment/wealth-tier.test.ts` | ❌ W0 | ⬜ pending |
| 43-02-02 | 02 | 2 | phase-goal | T-43-02 | SEC cash $50M+ → ultra_high, high confidence | unit | same | ❌ W0 | ⬜ pending |
| 43-02-03 | 02 | 2 | phase-goal | T-43-02 | Thin-data partner at law firm → high/medium conf | unit | same | ❌ W0 | ⬜ pending |
| 43-02-04 | 02 | 2 | phase-goal | T-43-01 | JSON parse failure returns {tier:unknown, status:failed} | unit | same | ❌ W0 | ⬜ pending |
| 43-02-05 | 02 | 2 | phase-goal | T-43-03 | Fenced JSON output stripped successfully | unit | same | ❌ W0 | ⬜ pending |
| 43-02-06 | 02 | 2 | phase-goal | T-43-04 | Invalid tier string defaults to unknown | unit | same | ❌ W0 | ⬜ pending |
| 43-03-01 | 03 | 3 | phase-goal | — | Inngest step insertion preserves existing step order | typecheck | `pnpm tsc --noEmit` | ✅ | ⬜ pending |
| 43-03-02 | 03 | 3 | phase-goal | — | forceRefreshKey re-runs wealth-tier step | integration | manual Inngest dev trigger | ✅ | ⬜ pending |
| 43-04-01 | 04 | 4 | phase-goal | — | profile-header falls back to auto when manual null | manual | Vercel preview smoke test | ✅ | ⬜ pending |
| 43-04-02 | 04 | 4 | phase-goal | — | Slide-over renders auto tier with reasoning tooltip | manual | Vercel preview smoke test | ✅ | ⬜ pending |
| 43-05-01 | 05 | 5 | phase-goal | — | Build clean, no type errors, no lint regressions | build | `pnpm build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/enrichment/wealth-tier.test.ts` — new test file with 6 fixtures covering scoring rubric branches
- [ ] Existing `vitest.config.ts` — no changes; wealth-tier tests just colocate with existing enrichment helpers
- [ ] Supabase dev DB migration — `supabase db push` after `supabase/migrations/20260417_auto_wealth_tier.sql` lands

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI auto-fallback on profile-header | phase-goal D-07 | Inline edit component renders in Vercel preview; requires a real prospect with `manual_wealth_tier: null` and `auto_wealth_tier: 'high'` | 1. Pick a prospect in a Vercel preview. 2. Ensure `manual_wealth_tier` is null in DB. 3. Load profile page. 4. Confirm auto tier label shows with reasoning tooltip on hover. |
| Slide-over preview auto tier | phase-goal D-07 | Same rendering context | In search results, click a lead → slide-over opens → verify auto tier badge appears |
| Inngest pipeline re-enrichment | phase-goal D-08 | Requires live Inngest run against Supabase | POST `/api/prospects/{id}/enrich?force=true` → watch Inngest dashboard → verify `wealth_tier` source status transitions pending → complete |
| Dossier hint consistency | phase-goal specifics | Optional check that `wealth_assessment` text aligns with `auto_wealth_tier` value | Trigger re-enrichment, inspect both fields in prospect row, confirm no contradiction (e.g., tier ultra_high but dossier says "limited wealth signals") |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (wave 4 UI tasks are manual — acceptable per convention for Vercel-preview UI)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
