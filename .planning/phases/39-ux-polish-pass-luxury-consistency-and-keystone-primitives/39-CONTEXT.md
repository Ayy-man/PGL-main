# Phase 39: UX Polish Pass — Luxury Consistency and Keystone Primitives - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** Audit-derived (`.planning/audits/ux-polish-2026-04-14/` — 5-agent audit, 242 findings)

<domain>
## Phase Boundary

**In scope:** Every polish finding in `.planning/audits/ux-polish-2026-04-14/` (5 detail files + master README). Applied across all four roles — PGL Super Admin, Tenant Admin, Agent, Assistant — and the shared shell. Covers three finding categories:

- **[MICRO-INTERACTION]** — hover/focus/press feedback, input reactions, dropdown/tab/accordion motion, card-select states, toggle/checkbox animations, tooltip reveals, drag handles.
- **[MICRO-ANIMATION]** — page/list entrances, skeleton replacing spinner, modal/sheet/toast motion, number counters, shimmer, status-pill transitions, sidebar slide.
- **[MICRO-IMPROVEMENT]** — empty-state guidance, destructive-action confirms, bulk-op undo, keyboard affordances, optimistic UI, sticky headers, inline validation, breadcrumbs, secondary-text contrast, button-loading states, clipboard feedback, search debounce, unsaved-changes warnings.

**Out of scope:**
- Architectural changes (no new state stores, no refactors of data fetching, no new abstractions).
- New features (if a finding reads as a feature, it gets deferred — polish only).
- New primitives or new design tokens (reuse what `src/components/ui/` and `tailwind.config.ts` + `src/app/globals.css` already expose).
- Backlog items parked in memory: `memory/project_post_demo_backlog.md` (hover-preview-cards, re-enrich versioning).
- Work that requires environment/credential changes — flag but do not bundle.

</domain>

<decisions>
## Implementation Decisions

### PR structure (locked — matches audit README's "Suggested shipping order")
Ship Phase 39 as 5 sequential plans, each its own PR. They are ordered deliberately so PR 1 cascades and reduces the scope of PRs 4–5.

1. **Plan 39-01 — Keystone primitives (K1–K10).** One edit each; collectively close ~60 of 242 findings. Merge before anything else.
   - K1: `src/hooks/use-toast.ts:11-12` — `TOAST_REMOVE_DELAY` 1,000,000 → 5,000; `TOAST_LIMIT` 1 → 3.
   - K2: Mount `<Toaster />` in `src/app/admin/layout.tsx:30-39`.
   - K3: Mount `<TooltipProvider delayDuration={250}>` in `src/app/layout.tsx`.
   - K4: `src/components/ui/button.tsx:35-38` — `defaultVariants.variant: 'gold-solid'`.
   - K5: Restyle `src/components/ui/toast.tsx:27-41, 91-100`, `tooltip.tsx:22-24`, `dropdown-menu.tsx:67-87` to `--bg-floating-elevated`; drop `bg-primary`; serif toast title.
   - K6: Input/Textarea/Select focus shadow → `var(--gold-bg-strong)` (3 files; no raw rgba).
   - K7: `ui/badge.tsx` + `ui/button.tsx` gold variants → `var(--gold-*)` tokens (drop hard-coded `rgba(212,175,55,*)` hex).
   - K8: `src/components/ui/enrichment-status-dots.tsx:20-33` — add `animate-pulse` on in-progress state; roll primitive into `prospect-results-table.tsx:289` and `list-member-table.tsx:65` (replace static stubs).
   - K9: Create `src/app/not-found.tsx` matching `global-error.tsx` chrome (serif "404", gold CTA).
   - K10: `ui/checkbox.tsx:16` checked → gold; `ui/table.tsx:61` selected row → `bg-gold-bg`.

2. **Plan 39-02 — Destructive-action safety sweep.** Route every destructive action through existing `<Confirmation isDestructive>`. Surfaces: search dismiss (`search-content.tsx:785`), list delete (`list-grid.tsx:26`), list-member remove (`list-member-table.tsx:157`), persona delete (`persona-card-grid.tsx:26`), SystemActions (`admin/system-actions.tsx:127-190`), mock-mode flip (`api-keys/integration-card.tsx:54-74`), team "Remove member" (`team-member-actions.tsx:128-156`). Native `confirm()` calls are REMOVED, not wrapped.

3. **Plan 39-03 — Assistant read-only role gating.** Thread `canEdit` prop through: `BulkActionsBar`, `ProspectSlideOver`, `ListGrid`, `PersonaCardGrid`, `Notes` textarea. Write-action buttons must render disabled + wrapped in `<Tooltip>` explaining the role restriction. Grep check: zero role guards in `src/app/[orgId]/search/*` and `src/app/[orgId]/lists/*` today.

4. **Plan 39-04 — Tenant-theme hex leak fix.** Find-replace `rgba(212,175,55,*)` / `#d4af37` → `var(--gold-*)` across 9 primitive files. Verification: test with non-gold tenant (sapphire or emerald) that `tenant-theme.ts:52-57` override actually flows through.

5. **Plan 39-05+ — Per-screen polish.** Work through the 5 detail files. Can be one plan per file or grouped, planner's call.

### Primitive reuse (locked)
All fixes reuse existing primitives:
- `shimmer`, `skeleton`, `loader` (loading states)
- `toast`, `toaster` (feedback)
- `confirmation` (destructive actions)
- `tooltip` (reveals, disabled-state explanations)
- `empty-state` (all "No results" text)
- `wealth-tier-badge`, `enrichment-status-dots` (status signals)
- `breadcrumbs` (navigation affordance)
- `sheet`, `dialog`, `dropdown-menu` (overlays)
- `data-table/*` (sorting, pagination, empty)
- `select`, `checkbox`, `input`, `textarea` (form controls)

### Token vocabulary (locked to what exists)
Base fixes only on tokens already defined in `tailwind.config.ts` + `src/app/globals.css` + CSS variables in `src/lib/tenant-theme.ts`. No new `--gold-*` shades, no new elevation tokens, no new radii. Verify variable existence before referencing.

### Commit + PR discipline
- Every plan has atomic per-task commits (GSD default).
- Every plan ends with a manual UI verification pass (open browser, check the before/after).
- `/gsd-ui-review` runs after each plan merges.
- Visual regression: if screenshots exist in `.planning/`, compare; otherwise manual.

### Claude's Discretion
- Within each plan: task ordering, file-edit order, exact task granularity.
- Task count per plan (planner decides based on what fits in context).
- Whether to group small quick-wins within a plan or split.
- Exact class choices where multiple `--gold-*` tokens would work (prefer the most semantic).
- Whether to ship Plan 39-05 as one plan or split by area file (5 files could become 1–5 plans).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit artifacts (primary source)
- `.planning/audits/ux-polish-2026-04-14/README.md` — master synthesis with 10 keystone fixes, Top-25 cross-ranked picks, 6 systemic themes, suggested PR order
- `.planning/audits/ux-polish-2026-04-14/01-super-admin.md` — 59 findings on `/admin/*`
- `.planning/audits/ux-polish-2026-04-14/02-tenant-admin-auth.md` — 45 findings on auth + onboarding + team + settings
- `.planning/audits/ux-polish-2026-04-14/03-agent-workflow.md` — 44 findings on core agent journey + Assistant read-only gaps
- `.planning/audits/ux-polish-2026-04-14/04-shell-cross-cutting.md` — 38 findings on shell (sidebar, top-bar, toasts, loading, kbd)
- `.planning/audits/ux-polish-2026-04-14/05-design-system.md` — 56 findings on tokens, typography, gold discipline, primitive integrity
- `.planning/phases/39-ux-polish-pass-luxury-consistency-and-keystone-primitives/SOURCES.md` — phase-local summary

### Design system source of truth
- `tailwind.config.ts` — color scales, font families, spacing, radii, shadows, durations
- `src/app/globals.css` — CSS variables, base layer, component layer utilities
- `src/lib/tenant-theme.ts:52-57` — per-tenant `--gold-*` override mechanism (critical context for Plan 39-04)

### Role / access model
- `src/lib/auth/rbac.ts` — role definitions and permission checks
- `src/lib/auth/session.ts` — session + role resolution (critical context for Plan 39-03)

### Existing primitive inventory
- `src/components/ui/*` — all 32 primitive files; no new ones will be added in this phase

</canonical_refs>

<specifics>
## Specific Ideas

### Keystone fix file/line map (audit README)
See `decisions` section above — K1–K10 already cite exact files and lines.

### Destructive surfaces (Plan 39-02)
All 6 cited with file:line in decisions. `<Confirmation>` primitive already exists with `isDestructive` prop.

### Role-gated write surfaces (Plan 39-03)
Files to modify:
- `src/components/prospect/bulk-actions-bar.tsx`
- `src/components/prospect/prospect-slide-over.tsx` (or similar path)
- `src/app/[orgId]/lists/components/list-grid.tsx`
- `src/app/[orgId]/personas/components/persona-card-grid.tsx`
- Notes textarea (check `src/components/prospect/` for the file)

### Hex-leak primitive files (Plan 39-04)
Per audit 05-design-system.md, the 9 primitives with hard-coded `rgba(212,175,55,*)`:
- `ui/button.tsx`, `ui/badge.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, `ui/select.tsx`, `ui/checkbox.tsx`, `ui/confirmation.tsx` — plus two consumer surfaces flagged in the same audit file.

### "Already excellent" callouts — DO NOT modify
From the audit: `Card`, `EmptyState`, `Skeleton`, `Label`, `DataTablePagination`, `ThemePicker`, `CardTitle`, `DialogTitle`, command palette, tenant + admin `page-enter` fadeIn, mobile bottom-sheet drag-handle, admin nav unread-reports badge, touch-safe-area handling, exports page, persona library layout. If a task would touch these, reconsider.

### Verification per PR
- **PR 1:** After merge, spot-check every primary CTA across login, Invite dialog, Create List modal, Save Search — all should render gold (not tan). Every toast should auto-dismiss in 5s. Admin layout should stack toasts.
- **PR 2:** Attempt each destructive action — must show a gold-themed confirmation dialog with explicit danger-red CTA; no native browser `confirm()` chrome anywhere.
- **PR 3:** Log in as an Assistant (role test user); every write button on search/lists/personas should be disabled with a tooltip explaining why. No 403 errors on click.
- **PR 4:** Switch a test tenant to sapphire theme in `theme-picker`. All buttons, badges, focus rings, checkboxes should use sapphire, not gold. No bleed-through.
- **PR 5+:** Per-area walkthrough as the relevant role.

</specifics>

<deferred>
## Deferred Ideas

- **Hover-preview cards on prospect rows** — parked in `memory/project_post_demo_backlog.md` (post-Maggie-demo).
- **Re-enrich versioning (BUG-003)** — parked in same backlog.
- **New design tokens / new color shades** — out of scope; use what exists.
- **New primitives** — e.g. a new `Banner` or `PageHeader` primitive, even if it would help. Not this phase.
- **Architectural refactors** — e.g. moving from Supabase RLS to service-role everywhere, migrating to React Server Actions. Not this phase.
- **Findings that require credential/environment changes** — flag for a separate phase.
- **Analytics screens that are "Coming Soon" placeholders** — just the 2 minor findings per audit; skip deeper work.

</deferred>

---

*Phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives*
*Context derived 2026-04-14 from the 5-agent UX audit at `.planning/audits/ux-polish-2026-04-14/`*
