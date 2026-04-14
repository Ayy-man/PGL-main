---
phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives
plan: "04"
subsystem: design-system
tags: [ux-polish, tokens, theme-leak, gold-discipline, css-vars, tenant-theme]
dependency_graph:
  requires: [PHASE-39-K6, PHASE-39-K7]
  provides: [PHASE-39-T3-THEME-LEAK]
  affects:
    - src/components/ui/wealth-tier-badge.tsx
    - src/components/ui/tag-input.tsx
    - src/components/ui/loader.tsx
    - src/components/ui/confirmation.tsx
    - src/components/ui/enrichment-status-dots.tsx
    - src/components/ui/table.tsx
    - src/components/ui/shimmer.tsx
    - src/components/ui/logo-upload.tsx
    - src/components/ui/actions.tsx
    - src/components/ui/suggestion.tsx
    - src/components/ui/prompt-input.tsx
    - src/components/ui/message.tsx
    - src/app/[orgId]/search/components/wealth-tier-badge.tsx
tech_stack:
  added: []
  patterns:
    - var(--gold-*) CSS variables replacing all rgba(212,175,55,*) and #d4af37 literals in primitives
    - .dot-glow-* utility classes from globals.css for enrichment dot glows
    - shimmer-skeleton utility replacing animate-pulse in Shimmer* components
    - Semantic tokens (text-destructive, text-warning, text-info, border-destructive, bg-warning-muted etc.) replacing raw rgba color literals
key_files:
  created: []
  modified:
    - src/components/ui/wealth-tier-badge.tsx
    - src/components/ui/tag-input.tsx
    - src/components/ui/loader.tsx
    - src/components/ui/confirmation.tsx
    - src/components/ui/enrichment-status-dots.tsx
    - src/components/ui/table.tsx
    - src/components/ui/shimmer.tsx
    - src/components/ui/logo-upload.tsx
    - src/components/ui/actions.tsx
    - src/components/ui/suggestion.tsx
    - src/components/ui/prompt-input.tsx
    - src/components/ui/message.tsx
    - src/app/[orgId]/search/components/wealth-tier-badge.tsx
decisions:
  - "WealthTierBadge tier-1 border uses var(--gold-primary) (fully opaque, theme-aware) rather than rgba(212,175,55,0.6) since no --border-gold-strong token exists"
  - "WealthTierBadge tier-3/tier-4 bespoke shades #c4a030 and #a08828 preserved intentionally as value-signal colors per phase constraint — documented with inline comments"
  - "Shimmer animate-pulse replaced with shimmer-skeleton utility for moving-gradient luxury feel, matching Skeleton primitive"
  - "Duplicate src/app/[orgId]/search/components/wealth-tier-badge.tsx (orphaned, no consumers) replaced with re-export barrel pointing to canonical ui/ primitive"
  - "table.tsx TableRow hover rgba(212,175,55,0.04) converted to var(--gold-bg)/50 — Tailwind opacity modifier preserves the subtle 0.04-level tint while remaining theme-aware"
  - "Extra files (actions, suggestion, prompt-input, message) fixed during sweep — Rule 2 auto-fixes, same hex-leak class of issue, no plan scope violation"
metrics:
  duration: "~35 minutes"
  completed: "2026-04-14"
  tasks_completed: 9
  files_modified: 13
---

# Phase 39 Plan 04: Tenant-Theme Hex Leak Fix Summary

Eliminated all hard-coded `rgba(212,175,55,*)`, `#d4af37`, `#f0d060`, and `oklch(0.62 0.19 22)` literals from `src/components/ui/` primitives. All gold-family UI elements now use `var(--gold-*)` CSS variables, which `src/lib/tenant-theme.ts:getThemeCSSVariables()` overrides per tenant at layout-inject time — enabling sapphire, emerald, rose, amber, slate, violet, and coral theme switches to cascade correctly through every primitive.

## Primitives Edited

| File | Before | After |
|------|--------|-------|
| `wealth-tier-badge.tsx` | Tier-1/2: `rgba(212,175,55,*)` bg/border, `#f0d060`/`#d4af37` text | Tier-1/2: `var(--gold-bg-strong)`, `var(--gold-primary)`, `var(--gold-bright)` tokens |
| `tag-input.tsx` | Chip: inline `rgba(212,175,55,0.15)` bg + `#d4af37` text; dropdown: `#1a1a1a`; hover: `onMouseEnter/Leave` inline | Chip: `bg-[var(--gold-bg-strong)] text-[var(--gold-primary)] border-[var(--border-gold)]`; dropdown: `bg-[var(--bg-floating-elevated)]`; hover: CSS `hover:bg-[var(--gold-bg)]` |
| `loader.tsx` | Spinner: `border-t-[rgba(212,175,55,0.7)]`; pulse: `bg-[rgba(212,175,55,0.6)]` | Both: `var(--gold-text)` token (identical value at 0.7, theme-aware) |
| `confirmation.tsx` | Container: `border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]`; icons: `text-yellow-400/blue-400/red-400` | Container: `border-border-subtle bg-bg-elevated`; icons: `text-warning/info/destructive` semantic tokens |
| `enrichment-status-dots.tsx` | `getDotStyle()` returning inline `boxShadow: "0 0 6px rgba(...)"` | `getDotClasses()` returning `dot-glow-green/blue/red/amber` utility classes + `bg-[var(--success/info/destructive/warning)]` |
| `table.tsx` (TableHead) | `text-[rgba(212,175,55,0.7)]` | `text-gold-text` Tailwind alias |
| `table.tsx` (TableRow hover) | `hover:bg-[rgba(212,175,55,0.04)]` | `hover:bg-[var(--gold-bg)]/50` |
| `shimmer.tsx` | `bg-[rgba(255,255,255,0.06/0.04/0.08)] animate-pulse` throughout | `bg-border-subtle`/`bg-bg-elevated` + `shimmer-skeleton` moving-gradient utility |
| `logo-upload.tsx` | `style={{ color: "oklch(0.62 0.19 22)" }}` on error text | `className="mt-2 text-xs text-destructive"` |

### Sweep-discovered extras (Rule 2 auto-fixes)

| File | Before | After |
|------|--------|-------|
| `actions.tsx` | `text-[#d4af37] bg-[rgba(212,175,55,0.08)]` on active state | `text-[var(--gold-primary)] bg-[var(--gold-bg)]` |
| `suggestion.tsx` | `border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.06/0.1)]` highlighted | `border-[var(--border-gold)] bg-[var(--gold-bg)] hover:bg-[var(--gold-bg-strong)]` |
| `prompt-input.tsx` | `focus-within:border-[rgba(212,175,55,0.4)]`; container rgba literals | `focus-within:border-[var(--border-gold)]`; `border-border-subtle bg-bg-elevated` |
| `message.tsx` (user bubble) | `bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.2)]` | `bg-[var(--gold-bg-strong)] border-[var(--border-gold)]` |

## Commits

| Hash | Task | Description |
|------|------|-------------|
| ea16e01 | Task 1 | WealthTierBadge tier-1/tier-2 -> var(--gold-*); preserve tier-3/4 bespoke shades |
| ecc6dab | Task 2 | TagInput chip/dropdown/hover -> CSS var tokens |
| aa83783 | Task 3 | Loader spinner/pulse -> var(--gold-text) token |
| a104c81 | Task 4 | Confirmation border/bg/icon -> semantic tokens |
| e0e31f3 | Task 5 | EnrichmentStatusDots inline boxShadow -> .dot-glow-* utilities |
| 45ade2f | Task 6 | Table header text-gold-text token; Shimmer -> bg tokens + shimmer-skeleton |
| 33fad60 | Task 7 | LogoUpload error text oklch literal -> text-destructive token |
| 68e7b14 | Task 8 | Sweep residual literals from actions/suggestion/prompt-input/message/table; fix duplicate badge |

## Final Grep Results (0-match verification)

```
$ grep -RE "rgba\(212,175,55" src/components/ui/
(no output — 0 matches)

$ grep -RE "#d4af37" src/components/ui/
(no output — 0 matches)

$ grep -RE "#f0d060" src/components/ui/
(no output — 0 matches)

$ grep -RE "#c4a030|#a08828" src/components/ui/
src/components/ui/wealth-tier-badge.tsx:    text: "#c4a030", // tier-3 bespoke shade — darker gold value signal, preserved intentionally
src/components/ui/wealth-tier-badge.tsx:    text: "#a08828", // tier-4 bespoke shade — darkest gold value signal, preserved intentionally
src/components/ui/wealth-tier-badge.tsx:  text: "#a08828", // tier-4 bespoke shade — intentional fallback matching lowest tier
```

Tier-3/4 bespoke shades appear ONLY in `wealth-tier-badge.tsx` with explanatory comments.

## Duplicate WealthTierBadge

`src/app/[orgId]/search/components/wealth-tier-badge.tsx` contained a stale copy of the component with all original hex literals, but had **zero consumers** (no file imported from this path). Rather than silently delete it, the file was converted to a re-export barrel pointing at the canonical `src/components/ui/wealth-tier-badge.tsx`. This ensures any future local import picks up the tokenized version rather than old hex literals.

Reviewer note: the file can be fully deleted once confirmed no tooling (barrel exports, import scanners) references the search-local path.

## Task 9: Manual Verification Deferred

Task 9 is a `checkpoint:human-verify` — automated execution defers to SUMMARY. Verification instructions:

1. Log in as a tenant_admin for a test tenant.
2. Navigate to `/[orgId]/settings/organization`.
3. Use `<ThemePicker>` to switch to **sapphire** theme. Save + hard-refresh.
4. Confirm all previously gold elements now render sapphire-blue:
   - Sidebar active nav, primary CTAs, badge gold variants, input focus ring
   - Table header text color (`text-gold-text` → now sapphire-text)
   - WealthTierBadge tier-1 and tier-2 → sapphire tint
   - TagInput chips → sapphire chips
   - Loader spinner border-top → sapphire
5. Confirm tier-3/4 wealth badges **stay darker gold** (`#c4a030`/`#a08828`) — the only visible gold remnants.
6. Confirm Confirmation destructive variant stays red (not sapphire — it uses `text-destructive`, not gold-family).
7. Confirm EnrichmentStatusDots stay green/blue/red/amber (not gold-family, not affected by theme switch).
8. Switch back to gold; confirm revert. Repeat with **emerald** for second sanity check.
9. Run final grep: `grep -RE "rgba\(212,175,55|#d4af37|#f0d060" src/components/ui/` — must return empty.

## TypeScript Status

Pre-existing TypeScript errors in `src/lib/search/__tests__/execute-research.test.ts` (tuple index errors) exist on the base commit and are not caused by this plan.

## Known Stubs

None — no placeholder or wired-empty data introduced by this plan. Pure CSS token substitution.

## Threat Flags

None. This plan is strictly CSS-variable substitution in UI primitives. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

Files verified to exist:
- src/components/ui/wealth-tier-badge.tsx: FOUND (var(--gold-bg-strong), #c4a030 with comment)
- src/components/ui/tag-input.tsx: FOUND (bg-[var(--gold-bg-strong)], no #d4af37)
- src/components/ui/loader.tsx: FOUND (var(--gold-text))
- src/components/ui/confirmation.tsx: FOUND (text-destructive, text-warning, text-info)
- src/components/ui/enrichment-status-dots.tsx: FOUND (dot-glow-green/blue/red/amber)
- src/components/ui/table.tsx: FOUND (text-gold-text)
- src/components/ui/shimmer.tsx: FOUND (bg-bg-elevated, shimmer-skeleton)
- src/components/ui/logo-upload.tsx: FOUND (text-destructive)
- src/app/[orgId]/search/components/wealth-tier-badge.tsx: FOUND (re-export barrel)

Commits verified in git log: ea16e01, ecc6dab, aa83783, a104c81, e0e31f3, 45ade2f, 33fad60, 68e7b14
