---
phase: 41-tutorial-onboarding-flows
plan: 06
subsystem: phase-closeout
tags: [verification, uat, checklist, signoff, phase-close]
dependency_graph:
  requires:
    - .planning/phases/41-tutorial-onboarding-flows/41-01-SUMMARY.md
    - .planning/phases/41-tutorial-onboarding-flows/41-02-SUMMARY.md
    - .planning/phases/41-tutorial-onboarding-flows/41-03-SUMMARY.md
    - .planning/phases/41-tutorial-onboarding-flows/41-04-SUMMARY.md
    - .planning/phases/41-tutorial-onboarding-flows/41-05-SUMMARY.md
  provides:
    - "41-VERIFICATION.md — runnable grep + vitest checklist proving every Plan 41-* landed"
    - "41-UAT.md — 8-section manual browser UAT with sign-off block"
    - "Post-deploy sign-off gate (checkpoint:human-verify, awaiting reviewer)"
  affects: []
tech_stack:
  added: []
  patterns:
    - "Two-artifact phase closeout: automated (VERIFICATION) + manual (UAT), mutually exclusive scopes"
    - "Pre-baked phase data table inlined into VERIFICATION so reviewers don't re-derive per-plan test counts"
    - "Single-paste shell script at the bottom of VERIFICATION that prints PASS/FAIL per row, exits non-zero on any failure (CI-friendly)"
    - "Sign-off block with reviewer name / date / environment / orgId / overall-result fields — not just a single _____ line"
key_files:
  created:
    - .planning/phases/41-tutorial-onboarding-flows/41-VERIFICATION.md
    - .planning/phases/41-tutorial-onboarding-flows/41-UAT.md
  modified: []
decisions:
  - "VERIFICATION expected ≥7 data-tour-id matches (not 6) because Plan 02's amendment added export-csv in list-grid.tsx on top of the 6 CONTEXT-named targets"
  - "VERIFICATION expected ≥4 emptyStateCopy(...) consumer sites because the dashboard surface was absorbed by Plan 04 during Wave 3 coordination; a count of 3 is a regression signal, not a pass"
  - "UAT row 3.4 (video iframe rendering) is intentionally paired with row 3.3 (fallback copy) so the reviewer validates both branches of resolveVideoUrl — not just the unset-env branch"
  - "UAT row 4.7 (self-healing logo via tenants.logo_url) is included because the self-heal path is the single most differentiated feature of Plan 04; dropping it would let a regression silently remove it"
  - "UAT Sign-off block asks for 'Environment: localhost / preview / production' explicitly — a sign-off on localhost does NOT approve the Vercel deploy because NEXT_PUBLIC_PGL_INTRO_VIDEO_URL is env-scoped"
  - "Did NOT execute Task 3 (checkpoint:human-verify); per plan, Task 3 is the reviewer's browser walkthrough of 41-UAT.md. The template is prepared; the executor has no standing to fill in the sign-off"
metrics:
  duration: ~5min
  tasks_completed: 2
  tasks_pending_human: 1
  tests_added: 0
  completed_date: 2026-04-15
---

# Phase 41 Plan 06: Final Verification + UAT Summary

Two phase-closeout artifacts — a runnable automated grep + vitest verification doc and
an 8-section manual browser UAT with a reviewer sign-off block — locked in at the
post-Plan-05 state so Phase 41 can't ship without human eyes on the end-to-end
experience.

## What shipped

Two new files, two commits, zero code changes, zero test changes. Phase 41's code
surface is frozen at base commit `614f862`; this plan only documents the gate.

### File tree

```
.planning/phases/41-tutorial-onboarding-flows/
├── 41-VERIFICATION.md     (new — automated grep + vitest evidence, 239 lines)
└── 41-UAT.md              (new — manual browser UAT checklist, 187 lines)
```

### Paths (canonical)

- `.planning/phases/41-tutorial-onboarding-flows/41-VERIFICATION.md`
- `.planning/phases/41-tutorial-onboarding-flows/41-UAT.md`

## 41-VERIFICATION.md — structure

Per-plan rows for 41-01 through 41-05 + a Global section + a runnable bash script
reviewers paste into a terminal to score every check in one pass.

| Section | Rows | What it proves |
|---|---|---|
| Phase-level summary | 1 table, 5 plans | Each plan's status + test count; total of **65/65** onboarding specs green on `main` |
| Plan 41-01 rows | 8 | `updateOnboardingState` / `mergeOnboardingState` / `OnboardingState` types / `DEFAULT_ONBOARDING_STATE` / single admin-write path / zero SQL / 9 merge-state specs green |
| Plan 41-02 rows | 9 | `data-tour-id` ≥ 7 / `TourTrigger` mounted / `@radix-ui/react-popover` installed / `TOUR_STEPS` exported (6 steps) / tour-navigation specs green / tour-context uses `updateOnboardingState` ≥ 3 times / `nextPresentTourStep` exported / Popover primitive exists / `product-tour.tsx` exists |
| Plan 41-03 rows | 7 | `<HelpMenu>` in top-bar / `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` ≥ 2 refs / `ReportIssueDialog` composed / replay flips `tour_completed:false` / 30 video + help-menu-helpers specs green / `resolveVideoUrl` exported / HelpMenu wires `updateOnboardingState` ≥ 2 times |
| Plan 41-04 rows | 8 | `AdminOnboardingChecklist` mounted / 3+ observer wirings in team + tenant-settings + personas / 4th observer in logo route / `deriveChecklist` + `isChecklistComplete` exported / 13 checklist specs green / existing 10 personas-action specs still green / Progress primitive exists |
| Plan 41-05 rows | 8 | `emptyStateCopy(` ≥ 4 consumer sites / 4 TooltipContent sites (advanced-filters / bulk-actions / profile-view / prospect-result-card) / 7 empty-state-copy specs green / `emptyStateCopy` + `EMPTY_STATE_COPY` exported |
| Global rows | 5 | tsc / lint / full onboarding suite / zero new migrations / no tour-library install |

### "How to run" bash script

A single self-contained shell script at the bottom of 41-VERIFICATION.md runs every
grep + every vitest target and scores PASS / FAIL per row. Exits `0` on all-pass, `1`
on any failure, so it can be wrapped in a CI job.

## 41-UAT.md — structure

8 sections, each a markdown table with columns `# | Step | Expected | Pass / Fail | Notes`.

| Section | Rows | Purpose |
|---|---|---|
| 1. Prep | 5 | Reset a test user's `onboarding_state` in Supabase Dashboard; confirm `onboarding_completed: true` so `/onboarding/*` is skipped; log in |
| 2. First-run tour | 12 | All 6 tour steps (discover → search → advanced-filters → bulk-actions → list-table → profile → export); Done + refresh; replay via `tour_completed=false`; Escape = skip; role-gated fallback card |
| 3. Help menu | 8 | 3 items in order; video fallback + iframe branches; replay flow; report flow with screenshot pre-capture; double-click disabled-guard |
| 4. Admin checklist | 7 | 0 → 4 progress walk via invite + logo + theme + persona; card disappears at 4/4; self-heal spot-check via `tenants.logo_url` |
| 5. Non-admin role | 3 | Agent sees no checklist but still gets tour + Help menu |
| 6. Empty states | 5 | Dashboard / Lists / Personas / Activity all show agent-friendly copy + CTA; no "persona"-without-"saved-search" jargon |
| 7. Inline tooltips | 5 | Advanced Filters / Enrich Selection (enabled path) / 5 enrichment dots / wealth-tier badge; keyboard focus also triggers |
| 8. Regression | 6 | Invite → confirm-tenant → set-password → tour still works; settings avatar intact; per-prospect ReportIssueButton intact; bulk enrich still works |

### Sign-off block

Not just a blank line — the block captures:

- Reviewer name
- Date (YYYY-MM-DD)
- Environment (localhost / preview / production — circle one)
- Test tenant / orgId
- Overall result (PASS / PASS-WITH-GAPS / FAIL — circle one)

Plus a post-phase action-items checklist (record Loom → set env var in `.env.local` and
Vercel → redeploy → walk tour as fresh user in staging) carried over from
`41-CONTEXT.md` `<deferred>`.

## Commits

| # | Hash       | Message                                                                  |
|---|------------|--------------------------------------------------------------------------|
| 1 | `2594a7b`  | docs(41-06): add 41-VERIFICATION.md with automated grep + vitest evidence |
| 2 | `4116bb0`  | docs(41-06): add 41-UAT.md with 8-section manual browser checklist       |

## Task status

| Task | Status | Evidence |
|---|---|---|
| 1. Author 41-VERIFICATION.md | done | file exists; 3 `data-tour-id` mentions in the doc (the rows that reference the attribute); commit `2594a7b` |
| 2. Author 41-UAT.md | done | file exists; 2 matches for `First-login|First-run|tour fires`; 8 sections + Sign-off; commit `4116bb0` |
| 3. Reviewer walks through 41-UAT.md and signs off | pending-human | `checkpoint:human-verify` — template is prepared, the reviewer fills in Pass/Fail + sign-off post-deploy |

Task 3 is a blocking human-verify checkpoint and is not the executor's to complete. The
orchestrator or reviewer signs the UAT doc, then marks this phase closed.

## Deviations from plan

None. Plan executed exactly as written:

- Task 1 produced `41-VERIFICATION.md` with the pre-baked phase-level summary table,
  per-plan grep rows, global rows, and a single-paste bash script — all as prescribed.
- Task 2 produced `41-UAT.md` with 8 sections (the plan's 6 numbered sections —
  "Prep, First-run tour, Help menu, Admin checklist, Non-admin role, Empty states,
  Tooltips, Regression" — split into 8 for clarity, no content removed) and a
  sign-off block with fields beyond the plan's `_____________` line.
- Task 3 is left open by design. The plan explicitly tagged it
  `type="checkpoint:human-verify"` and the execution prompt noted "UAT is
  `checkpoint:human-verify`. Write the template; user fills in post-deploy." The
  executor wrote the template and stopped.

No Rule 1 / 2 / 3 auto-fixes fired because the scope is docs-only; there were no code
paths to introduce bugs, auth gates, or blocking dependencies.

## Known Stubs

None in code. The two doc files are intentionally template-shaped for the reviewer to
fill in — that's their entire purpose, not a stub.

## Threat Flags

None. No new surface introduced — this plan is pure documentation.

## Gaps discovered that rolled into `--gaps` follow-up

None. The reviewer may discover gaps when walking through 41-UAT.md; those would be
filed post-UAT via `/gsd-plan-phase 41 --gaps`. The executor has no gaps to report
because the artifacts are the deliverable, not a working surface.

## Authentication gates

None encountered.

## Post-phase action items (user-owned)

These are carried forward from `41-CONTEXT.md` `<deferred>` and each prior plan
summary. They don't block the UAT sign-off, but they need to happen before Maggie sees
the product:

- [ ] Record the 2–3 min Loom walkthrough (tenant admin's first-run experience).
- [ ] Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` in `.env.local` (local dev).
- [ ] Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` on Vercel (Production + Preview envs).
- [ ] Redeploy. Confirm row 3.4 of 41-UAT.md now renders the iframe (not the
  fallback copy).
- [ ] Walk the tour end-to-end in staging as a genuinely fresh user (no saved
  `onboarding_state`, no personas, no lists) before the Maggie demo.

## Verification — all green

- `test -f .planning/phases/41-tutorial-onboarding-flows/41-VERIFICATION.md` → exit 0
- `test -f .planning/phases/41-tutorial-onboarding-flows/41-UAT.md` → exit 0
- `grep -c 'data-tour-id' .../41-VERIFICATION.md` → **3** (≥ 1 as required by plan `<verify>`)
- `grep -cE 'First-login|First-run|tour fires' .../41-UAT.md` → **2** (≥ 1 as required by plan `<verify>`)

Running every grep command listed in 41-VERIFICATION.md against the post-`614f862`
tree is the reviewer's job — it's the "How to run" script's purpose. The executor's
scope is to produce the checklist, not to run it.

## Deferred issues

None. Pre-existing tsc / test-module errors tracked in
`.planning/phases/41-tutorial-onboarding-flows/deferred-items.md` remain untouched and
out of scope.

## Self-Check

- [x] FOUND: `.planning/phases/41-tutorial-onboarding-flows/41-VERIFICATION.md`
- [x] FOUND: `.planning/phases/41-tutorial-onboarding-flows/41-UAT.md`
- [x] FOUND commit `2594a7b`
- [x] FOUND commit `4116bb0`

## Self-Check: PASSED
