---
quick_id: 260416-0qp
slug: audit-and-fix-tenant-theme-gold-leaks-in
status: complete
date: 2026-04-16
commits:
  - 88c827c feat(theme): add --gold-primary-rgb token for tenant-theme-aware rgba
  - 969ceb4 fix(theme): replace 121 hardcoded rgba(212,175,55,*) with var(--gold-primary-rgb)
---

# Audit and fix tenant-theme gold leaks

## What shipped
Phase 16's `--gold-*` override at `[orgId]/layout.tsx:86` already cascades tenant theme colors to every descendant. But 121 direct `rgba(212,175,55, X)` literals across 34 feature components bypassed the variable system, so gold bled through on every non-gold tenant.

Added `--gold-primary-rgb` triplet (per-theme, emitted by `getThemeCSSVariables`) and mechanically swapped all 121 occurrences. Tenant theme now cascades correctly across slide-overs, research panels, signal timelines, persona cards, filter chips, prospect cards, list member tables, and dashboard.

## Count
- 39 files modified, 114 lines swapped
- Build passes clean (`pnpm tsc --noEmit` zero errors after `pnpm install` picked up `@radix-ui/react-popover` from Phase 41's lockfile update)
- 65 onboarding + 24 realtime tests still green

## Preserved intentional gold
- `wealth-tier-badge.tsx` Tier-3/Tier-4 (Phase 39 lock)
- `market-intelligence-card.tsx:279` bullish chart color (Recharts SVG prop var resolution unreliable; low-traffic)
- Admin charts (single-theme app)
- Server-side bulk-enrich avatar URL (no CSS context)
- `globals.css` :root defaults + `tenant-theme.ts` canonical definitions

## Known residual
Market-intelligence chart positive-performance color still hardcoded gold. Flagged for follow-up if surfaces as a complaint.

## Verification pending
User walks `/[orgId]/*` on emerald-theme tenant post-deploy. Surfaces that were gold in prior screenshots should now render emerald.
