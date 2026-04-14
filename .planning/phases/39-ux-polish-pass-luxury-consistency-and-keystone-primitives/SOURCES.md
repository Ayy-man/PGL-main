# Phase 39 Sources

This phase exists to close the 242 findings from the 2026-04-14 UX polish audit. All source material lives in `.planning/audits/ux-polish-2026-04-14/`.

## Primary source (read first)

**[../../audits/ux-polish-2026-04-14/README.md](../../audits/ux-polish-2026-04-14/README.md)** — master synthesis:
- 10 keystone fixes with file paths and cascade impact (closes ~60 findings on their own)
- Top 25 cross-ranked picks
- 6 systemic themes (destructive safety, role gating, tenant-theme leak, floating surfaces, loading shape, generic-SaaS tells)
- Suggested 5-PR shipping order — **use this as the plan structure**

## Per-area detail files (granular findings)

| File | Scope | Findings |
|---|---|---|
| [01-super-admin.md](../../audits/ux-polish-2026-04-14/01-super-admin.md) | `/admin/*` — tenants, users, analytics, reports, api-keys, automations | 59 |
| [02-tenant-admin-auth.md](../../audits/ux-polish-2026-04-14/02-tenant-admin-auth.md) | auth, onboarding, team, settings, suspended | 45 |
| [03-agent-workflow.md](../../audits/ux-polish-2026-04-14/03-agent-workflow.md) | search → personas → lists → prospects → exports → dashboard + Assistant read-only | 44 |
| [04-shell-cross-cutting.md](../../audits/ux-polish-2026-04-14/04-shell-cross-cutting.md) | sidebar, top-bar, command palette, toasts, modals, loading/error pages, kbd, mobile | 38 |
| [05-design-system.md](../../audits/ux-polish-2026-04-14/05-design-system.md) | `tailwind.config.ts`, `globals.css`, every `ui/` primitive, typography, gold discipline | 56 |

Each finding is tagged `[MICRO-INTERACTION]` / `[MICRO-ANIMATION]` / `[MICRO-IMPROVEMENT]` with severity (quick-win / medium / significant), exact file + line, current-state description, and a concrete fix. Fixes must reuse existing `src/components/ui/` primitives — no new primitives, no new tokens.

## Planning guidance

When running `/gsd-plan-phase 39`, the 5 PRs in the README's "Suggested shipping order" are the natural plan boundaries:

1. **Plan 39-01** — Keystone primitives (K1–K10). One day, cascades across the app.
2. **Plan 39-02** — Destructive-action safety sweep (theme T1 — 6 surfaces onto `<Confirmation>`).
3. **Plan 39-03** — Assistant read-only role gating (theme T2 — prop-thread `canEdit` across 5 files).
4. **Plan 39-04** — Tenant-theme hex→CSS-var leak fix (theme T3 — 9 primitive files).
5. **Plan 39-05+** — Per-screen polish. Can split further by area file if needed.

Hard constraints for every plan in this phase:
- **No architectural changes.** No new abstractions, no refactors of state management, no new primitives, no new tokens.
- **No new features.** If a finding suggests something that reads as a feature, drop it — this is polish only.
- **Reuse existing primitives.** `shimmer`, `skeleton`, `loader`, `toast`, `toaster`, `confirmation`, `tooltip`, `empty-state`, `wealth-tier-badge`, `enrichment-status-dots`, `breadcrumbs`, `sheet`, `dialog`, `dropdown-menu`, `data-table/*`.
- **Honor the token vocabulary** defined in `tailwind.config.ts` + `src/app/globals.css` + `src/lib/tenant-theme.ts`. Never hard-code hex.
- **Post-demo backlog items stay parked.** The hover-preview-cards + re-enrich versioning items in `memory/project_post_demo_backlog.md` are NOT in scope here.

## Verification hooks for /gsd-plan-phase

- The phase's success criterion is "all 242 findings either closed, explicitly deferred with reason, or re-tagged as backlog". Keep a checklist per detail file.
- Each PR should have a visual-regression pass: open the affected surface in the browser and compare to the fix description. The `gsd-ui-review` command is useful here.
- Tenant-theme leak fix (T3) requires testing with a non-gold tenant (sapphire or emerald) — verify `--gold-*` variable override actually rewrites downstream.
