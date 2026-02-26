---
phase: 05-ui-revamp
plan: "04"
subsystem: search
tags: [ui, search, persona-cards, prospect-cards, wealth-badges, design-system]
dependency_graph:
  requires: ["05-01", "05-02"]
  provides: ["PersonaCard", "ProspectResultCard", "WealthTierBadge", "card-based-search-flow"]
  affects: ["src/app/[orgId]/search"]
tech_stack:
  added: []
  patterns:
    - "Persona card grid with repeat(auto-fill, minmax(340px, 1fr)) layout"
    - "Hue-derived avatar gradients from name hash"
    - "AddToListDialog embedded inside ProspectResultCard with button trigger"
    - "onMouseEnter/onMouseLeave for CSS variable hover states (Tailwind hover: cannot reference CSS custom property values)"
    - "Skeleton card animation with animate-pulse for loading state"
key_files:
  created:
    - src/app/[orgId]/search/components/persona-card.tsx
    - src/app/[orgId]/search/components/prospect-result-card.tsx
    - src/app/[orgId]/search/components/wealth-tier-badge.tsx
  modified:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/search/page.tsx
decisions:
  - "AddToListDialog embedded inside ProspectResultCard with Button trigger — avoids duplicate state management and keeps click separation clean via e.stopPropagation() on right section"
  - "ProspectResultCard accepts lists and orgId props directly — simpler than lifting dialog state to SearchContent"
  - "WealthTier derived heuristically from job title — production would use enrichment data; heuristic provides immediate visual value"
  - "page.tsx header removed — SearchContent owns its own page header in both views (persona selection and results)"
  - "handleProspectClick no-op with eslint-disable comment — slide-over wired in Plan 06"
metrics:
  duration: "~5 min"
  completed: "2026-02-26"
  tasks_completed: 2
  files_modified: 5
---

# Phase 5 Plan 04: Search Page Rebuild — Persona Card Grid + Prospect Card Stack Summary

Rebuilt the search page from dropdown+table to persona card grid + prospect result card stack using graduated gold wealth tier badges, hue-derived avatars, and inline AddToList dialog.

## What Was Built

### Task 1: Three New Components

**WealthTierBadge** (`wealth-tier-badge.tsx`):
- Four-tier graduated gold intensity system: $500M+, $100M+, $50M+, $30M+
- Raw rgba values intentionally — approved exception to no-inline-hex rule (graduated opacity scale cannot map to a single token)
- Inline span with rounded-full shape, 11px semibold text

**PersonaCard** (`persona-card.tsx`):
- Container: `button` element, 14px radius, 28px padding
- onMouseEnter/Leave swap `--bg-card-gradient` to `--bg-card-hover` and border to `rgba(212,175,55,0.3)`
- Gold corner accent: absolute top-right radial gradient
- Cormorant Garamond 22px name, inline "Starter" label in `--gold-text`
- Filter tags extracted from persona.filters (titles, seniorities, industries), max 5 shown
- Footer: active filter count (left) + "Search →" gold link (right)

**CreatePersonaCard** (exported from `persona-card.tsx`):
- Dashed border `border-muted-foreground/30`, no solid background
- 48px gold circle with centered "+" in `--gold-primary`
- Routes to `/[orgId]/personas/new`

**ProspectResultCard** (`prospect-result-card.tsx`):
- Horizontal flex layout: 48px hue-derived avatar + info block (left) + contact icons + AddToList button (right)
- Avatar: `hsl(hue, 40%, 30%)` to `hsl(hue, 50%, 20%)` gradient from name charCode sum % 360
- Cormorant Garamond 20px name + WealthTierBadge inline
- Title · Company in 13px muted, location in 12px ghost
- AI Insight block when `prospect.headline` available: gold left border + gold-bg tint
- Contact icons: 28px circles — gold-bg/border-gold when data present, muted when unavailable
- AddToListDialog embedded with Button trigger, `e.stopPropagation()` on right section prevents card click

### Task 2: SearchContent Orchestration

**search-content.tsx** fully rewritten rendering layer:
- **No persona selected**: 38px Cormorant header + `repeat(auto-fill, minmax(340px, 1fr))` persona card grid
- **Persona selected**: 34px results header with back-to-personas button, result count, Filters/Export CSV buttons
- **Loading**: 4 skeleton cards with `animate-pulse`
- **Empty**: EmptyState with Search icon
- **Results**: vertical card stack with 12px gap, ProspectResultCard per result
- **Pagination**: centered flex with gold-bg-strong active page indicator
- `useSearch` hook, URL state (nuqs), pagination logic — completely unchanged

**page.tsx**: removed duplicate header — SearchContent owns all page headers now. SearchFallback updated to match persona card grid skeleton shape.

## Verification

All checks pass:
- `persona-card.tsx`, `prospect-result-card.tsx`, `wealth-tier-badge.tsx` — exist
- `search-content.tsx` — imports PersonaCard, ProspectResultCard; useSearch still used; SearchResultsTable removed
- `npx next build` — compiles without errors (only pre-existing img warnings in sidebar.tsx, out of scope)
- TypeScript: `tsc --noEmit` — no errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] ProspectResultCard needed lists/orgId props for AddToListDialog**
- **Found during:** Task 2 integration
- **Issue:** Plan spec showed `onAddToList` callback prop, but `AddToListDialog` requires `prospect`, `lists`, `orgId`, and `trigger` props — a callback alone cannot open the dialog
- **Fix:** Changed `ProspectResultCard` to accept `lists` and `orgId` props directly, embed `AddToListDialog` with Button trigger and `e.stopPropagation()` on right section
- **Files modified:** `prospect-result-card.tsx`, `search-content.tsx`

**2. [Rule 1 - Bug] ESLint unused variable error on `_prospectId`**
- **Found during:** Task 2 build verification
- **Issue:** `next build` failed with `@typescript-eslint/no-unused-vars` on `_prospectId` parameter (underscore prefix wasn't sufficient for this ESLint config)
- **Fix:** Added `// eslint-disable-next-line @typescript-eslint/no-unused-vars` comment above the handler
- **Files modified:** `search-content.tsx`

**3. [Rule 3 - Blocking Issue] Next.js build ENOENT on stale .next cache**
- **Found during:** Task 2 build verification (second attempt)
- **Issue:** `pages-manifest.json` missing from stale `.next` directory caused build to fail
- **Fix:** `rm -rf .next` then clean rebuild succeeded
- **Files modified:** None (cache only)

## Self-Check: PASSED

Files verified:
- FOUND: src/app/[orgId]/search/components/persona-card.tsx
- FOUND: src/app/[orgId]/search/components/prospect-result-card.tsx
- FOUND: src/app/[orgId]/search/components/wealth-tier-badge.tsx
- FOUND: src/app/[orgId]/search/components/search-content.tsx
- FOUND: src/app/[orgId]/search/page.tsx

Commits verified:
- FOUND: 43749d6 — feat(05-04): create PersonaCard, ProspectResultCard, and WealthTierBadge components
- FOUND: 8d3ea68 — feat(05-04): rewire SearchContent to persona card grid and prospect result card stack
