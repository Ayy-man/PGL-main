---
phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives
plan: "01"
subsystem: design-system
tags: [ux-polish, primitives, tokens, toast, tooltip, button, badge, checkbox, table, enrichment]
dependency_graph:
  requires: []
  provides: [PHASE-39-K1, PHASE-39-K2, PHASE-39-K3, PHASE-39-K4, PHASE-39-K5, PHASE-39-K6, PHASE-39-K7, PHASE-39-K8, PHASE-39-K9, PHASE-39-K10]
  affects:
    - src/hooks/use-toast.ts
    - src/app/admin/layout.tsx
    - src/app/layout.tsx
    - src/components/ui/button.tsx
    - src/components/ui/toast.tsx
    - src/components/ui/tooltip.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/input.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/enrichment-status-dots.tsx
    - src/app/[orgId]/search/components/prospect-results-table.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/app/not-found.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/table.tsx
tech_stack:
  added: []
  patterns:
    - CSS variable tokens for all gold color references (var(--gold-primary), var(--gold-bg), etc.)
    - Global TooltipProvider at root layout with 250ms delay
    - Floating surface design token --bg-floating-elevated for all overlays
key_files:
  created:
    - src/app/not-found.tsx
  modified:
    - src/hooks/use-toast.ts
    - src/app/admin/layout.tsx
    - src/app/layout.tsx
    - src/components/ui/button.tsx
    - src/components/ui/toast.tsx
    - src/components/ui/tooltip.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/input.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/select.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/enrichment-status-dots.tsx
    - src/app/[orgId]/search/components/prospect-results-table.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/table.tsx
decisions:
  - "Button defaultVariants.variant changed to gold-solid so all unstyled CTAs render gold without per-call changes"
  - "EnrichmentStatusDots sourceStatus=null fallback used in list-member-table since enrichment_source_status is not in ListMember query shape — plan 39-07 will wire the data"
  - "Static page export failures at pnpm build are pre-existing (Supabase auth calls require runtime env vars) — TypeScript compilation passes cleanly"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-14"
  tasks_completed: 10
  files_modified: 17
---

# Phase 39 Plan 01: Keystone Primitive Fixes Summary

All 10 keystone primitive fixes (K1–K10) from the UX polish audit applied atomically. Collectively cascade across ~60 of 242 audit findings without per-screen edits.

## Keystones Shipped

| # | Keystone | Before | After |
|---|----------|--------|-------|
| K1 | Toast timing | TOAST_REMOVE_DELAY=1,000,000ms (16min); TOAST_LIMIT=1 | TOAST_REMOVE_DELAY=5,000ms (5s); TOAST_LIMIT=3 |
| K2 | Admin Toaster mount | No Toaster in admin layout — toasts silently dropped | `<Toaster />` mounted in `src/app/admin/layout.tsx` |
| K3 | Global TooltipProvider | No root provider — every consumer must wrap in TooltipProvider | `<TooltipProvider delayDuration={250}>` wraps `{children}` in root layout |
| K4 | Button default variant | `defaultVariants.variant = "default"` (tan/neutral) | `defaultVariants.variant = "gold-solid"` — ~9 primary CTAs now gold |
| K5 | Floating surface restyle | Toast/Tooltip on `bg-primary` (tan); DropdownMenu on `bg-popover`; toast title in DM Sans | All three on `--bg-floating-elevated`; toast title in Cormorant Garamond (font-serif) |
| K6 | Focus shadow tokenization | `rgba(212,175,55,0.15)` hard-coded in Input/Textarea/Select | `var(--gold-bg-strong)` — tenant-theme cascade safe |
| K7 | Gold variant detokenization | Button + Badge gold/gold-solid used `#d4af37` and `rgba(212,175,55,*)` literals | All replaced with `var(--gold-primary)`, `var(--gold-bg)`, `var(--border-gold)`, etc. |
| K8 | EnrichmentStatusDots animation | `in_progress` state was static dot; search+list used local stubs | `animate-pulse` on in_progress; `animate-pulse opacity-60` on pending; primitive rolled into both tables |
| K9 | 404 page | Next.js default 404 chrome | Branded `src/app/not-found.tsx` — serif "404" h1, gold "Return home" CTA |
| K10 | Checkbox + table selection | Checkbox checked = `bg-primary` (tan); selected row = `bg-muted` (neutral) | Checkbox checked = `var(--gold-primary)`; selected row = `var(--gold-bg)` |

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 54a0444 | K1 | fix: TOAST_REMOVE_DELAY 1_000_000→5_000, TOAST_LIMIT 1→3 |
| 6d892fc | K2 | feat: mount Toaster in admin shell layout |
| 38dd9b0 | K3 | feat: mount TooltipProvider at root with delayDuration=250 |
| f222a0d | K4 | feat: Button defaultVariants.variant -> gold-solid |
| 50dfe93 | K5 | feat: restyle floating surfaces to --bg-floating-elevated; serif toast title |
| 1a541c3 | K6 | fix: Input/Textarea/Select focus shadow -> var(--gold-bg-strong) |
| 331f633 | K7 | fix: Badge + Button gold variants -> var(--gold-*) CSS tokens |
| 33f7b25 | K8 | feat: EnrichmentStatusDots animate-pulse; rollout to search + list tables |
| b0774ad | K9 | feat: create branded 404 page matching global-error chrome |
| f79e0d3 | K10 | feat: Checkbox checked -> gold; TableRow selected -> bg-gold-bg |
| 7176ec8 | fix | remove remaining EnrichmentDot reference in mobile card view |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mobile card view EnrichmentDot reference missed by replace_all**
- **Found during:** Task 8 build verification
- **Issue:** `replace_all` replaced the desktop TableRow usage of `<EnrichmentDot>` but a second identical usage in the mobile card view at line 309 persisted, causing `'EnrichmentDot' is not defined` ESLint error at build
- **Fix:** Targeted edit to replace the second occurrence with `<EnrichmentStatusDots sourceStatus={null} />`
- **Files modified:** `src/app/[orgId]/lists/components/list-member-table.tsx`
- **Commit:** 7176ec8

## Known Stubs

| File | Location | Reason |
|------|----------|--------|
| `src/app/[orgId]/lists/components/list-member-table.tsx` | Line 180, 309 — `sourceStatus={null}` | `ListMember.prospect` type only has `enrichment_status` (single string), not the per-source `enrichment_source_status` JSONB map. The dots primitive renders null (empty) until plan 39-07 wires the query. Intentional — per plan instruction "If enrichment_source_status is not currently fetched by the lists query, fall back to null" |
| `src/app/[orgId]/search/components/prospect-results-table.tsx` | Lines 289–295 — inline type cast | `ApolloPerson` type doesn't expose `enrichment_source_status`; cast to extended type with optional field. Shows "Not enriched" for all search results until the saved-search path populates the field. Same rationale — plan 39-07 scope. |

## Build Status

- TypeScript compilation: **PASS** (`✓ Compiled successfully`)
- Static page export: Pre-existing failures on `/login`, `/admin`, `/onboarding/*` etc. due to Supabase auth calls requiring runtime environment variables at build time. Identical failures exist on the base commit (96754045). Not caused by this plan's changes.

## Manual Verification (Task 11 — Pending)

Task 11 is a `checkpoint:human-verify` — browser spot-checks must be performed after merge:

1. **K1/K2/K5 Toasts:** Fire a toast; confirm 5s auto-dismiss, up to 3 stack, admin routes show toasts, toast title in serif.
2. **K3 TooltipProvider:** Hover any tooltip element; should appear after 250ms.
3. **K4 Button default:** Create List dialog, Settings save, Login sign-in, `/admin/tenants/new` — all CTAs should render gold.
4. **K5 Floating restyle:** Tooltip/toast/dropdown must show dark `--bg-floating-elevated`, not tan `bg-primary`.
5. **K6/K7 Tenant-theme safe:** Switch a test tenant to sapphire theme; focus ring + gold button/badge should use sapphire, not gold.
6. **K8 Enrichment dots:** Search bulk enrich in progress shows pulsing dots; list table renders EnrichmentStatusDots primitive.
7. **K9 404 page:** Navigate to `/does-not-exist-xyz`; branded serif "404" + gold CTA.
8. **K10 Checkbox + row:** Select a prospect row; checkbox fills gold; entire row gets `bg-gold-bg` tint.

## Regression Watch

The Button `defaultVariants.variant = "gold-solid"` change (K4) is the highest regression risk. Any button that was implicitly neutral (variant unset, expected tan) now renders gold. During Task 11 browser verification, flag any buttons that should revert to `variant="default"` or `variant="ghost"`. Those files need explicit `variant="default"` added — scope for plan 39-05 cleanup.

## Threat Flags

None. All edits are UI-layer primitive refactors. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

Files verified to exist:
- src/app/not-found.tsx: FOUND
- src/hooks/use-toast.ts: FOUND (TOAST_REMOVE_DELAY = 5_000, TOAST_LIMIT = 3)
- src/app/admin/layout.tsx: FOUND (import { Toaster }, <Toaster />)
- src/app/layout.tsx: FOUND (TooltipProvider, delayDuration={250})
- src/components/ui/button.tsx: FOUND (variant: "gold-solid" in defaultVariants)
- src/components/ui/toast.tsx: FOUND (--bg-floating-elevated, font-serif)
- src/components/ui/tooltip.tsx: FOUND (--bg-floating-elevated)
- src/components/ui/dropdown-menu.tsx: FOUND (--bg-floating, --gold-bg)
- src/components/ui/input.tsx: FOUND (var(--gold-bg-strong))
- src/components/ui/textarea.tsx: FOUND (var(--gold-bg-strong))
- src/components/ui/select.tsx: FOUND (var(--gold-bg-strong))
- src/components/ui/badge.tsx: FOUND (var(--gold-primary), no rgba literals)
- src/components/ui/enrichment-status-dots.tsx: FOUND (animate-pulse)
- src/components/ui/checkbox.tsx: FOUND (data-[state=checked]:bg-[var(--gold-primary)])
- src/components/ui/table.tsx: FOUND (data-[state=selected]:bg-[var(--gold-bg)])

Commits verified in git log: 54a0444, 6d892fc, 38dd9b0, f222a0d, 50dfe93, 1a541c3, 331f633, 33f7b25, b0774ad, f79e0d3, 7176ec8
