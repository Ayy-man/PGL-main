# Phase 21: Depth & Polish — Visual Refinement Pass - Research

**Researched:** 2026-03-27
**Domain:** CSS animation, micro-interactions, dark-luxury design system polish
**Confidence:** HIGH

---

## Summary

Phase 21 is a visual refinement pass that adds physical depth, micro-interactions, and luxury cues to the existing dark-themed app. The foundational CSS work has already been done by quick task `260327-usu`: all CSS utility classes (`surface-card` dual-shadow, `surface-card-featured`, `row-hover-lift`, `press-effect`, `card-glow`, `row-enter`, `badge-pulse`, `badge-pulse-urgent`, noise overlay) are defined in `globals.css` and the reduced-motion guard is already in place.

The remaining work is almost entirely **wiring**—applying the already-defined CSS classes to components that currently lack them—plus a small set of enhancements (backdrop-blur on elevated surfaces, broader `surface-card-featured` usage, enrichment processing spinner polish). No new CSS utility classes need to be invented.

The phase also requires a verification pass: checking hover states, performance (noise overlay GPU impact), responsive behavior, and a grepping audit for inconsistent `box-shadow` values hardcoded outside the CSS variable/utility system.

**Primary recommendation:** This phase is CSS-wiring work. Each task should be scoped to a single page or component group. No new dependencies. No backend changes.

---

## What Is Already Done (quick task 260327-usu — commit 4211252)

| Deliverable | Status | Location |
|---|---|---|
| Dual-shadow on `.surface-card` and `.card-interactive` | DONE | `globals.css` line 271 |
| Gold crown line `.surface-card-featured` (::after pseudo-element) | DONE | `globals.css` line 495 |
| Noise grain SVG overlay | DONE | `globals.css` line 544, `layout.tsx` |
| Staggered row entrance `.row-enter` + `fadeInUp` keyframe | DONE | `globals.css` line 526 |
| Card gold glow `.card-glow` | DONE | `globals.css` line 521 |
| Click press feedback `.press-effect` | DONE | `globals.css` line 515 |
| Sidebar shadow `4px 0 24px rgba(0,0,0,0.3)` | DONE | `sidebar.tsx` inline style |
| Row hover lift `.row-hover-lift` (CSS + hover guard) | DONE | `globals.css` line 510, 411 |
| Status badge pulse `.badge-pulse` / `.badge-pulse-urgent` | DONE | `globals.css` line 532 |
| `prefers-reduced-motion` guard (covers all `*`, `*::before`, `*::after`) | DONE | `globals.css` line 256 |

**Applied to components so far:**
- `list-member-table.tsx`: `row-hover-lift press-effect row-enter` on desktop TableRows (with 30ms stagger)
- `wealth-signals.tsx`: `card-glow press-effect row-enter` on each signal card (with 60ms stagger)
- `profile-header.tsx`: `surface-card-featured` on the profile card; old manual gold div removed
- `member-status-select.tsx`: `badge-pulse` on the "New" status badge

---

## What Remains (Gaps to Fill)

### Gap 1: Row enter / hover lift not applied broadly

`.row-enter` and `.row-hover-lift` + `.press-effect` are wired only to list-member-table rows. The following interactive row/card contexts still lack them:

| Component | File | Gap |
|---|---|---|
| Search result cards (ProspectResultCard) | `src/app/[orgId]/search/components/prospect-result-card.tsx` | Uses inline `useState` hover — no `card-glow` or `row-enter`; hover shadow uses `--card-shadow-hover` but no gold glow |
| Search results table rows (desktop) | `src/app/[orgId]/search/components/search-results-table.tsx` | No `row-hover-lift press-effect row-enter` on `<tr>` data rows |
| List grid cards | `src/app/[orgId]/lists/components/list-grid.tsx` | Has `animate-stagger-in` but not `card-glow` or `press-effect` |
| Activity feed entries | `src/components/dashboard/activity-feed.tsx` | No `row-enter` or `row-hover-lift` |
| Export log table rows | `src/app/[orgId]/exports/components/export-log-client.tsx` | No `row-hover-lift press-effect row-enter` |
| Admin tenant heatmap rows | `src/components/admin/tenant-heatmap.tsx` | No `row-hover-lift` or `row-enter` |
| Admin automation runs table rows | `src/components/admin/automation-runs-table.tsx` | Likely no `row-hover-lift row-enter` |

### Gap 2: `surface-card-featured` used on only 1 component

The spec calls for a gold crown line on featured cards: **stat cards, active persona, selected prospect** (max 2-3 per page). Currently only `profile-header.tsx` uses `surface-card-featured`. Missing:

| Component | Rationale |
|---|---|
| Active/selected persona card in `persona-card.tsx` | Gold crown when selected |
| Stat cards on Dashboard (`metrics-cards.tsx`) | Featured status cards |
| PlatformPulse card in admin | Featured summary card |

Note: The spec says max 2-3 per page — do NOT blanket-apply to all surface-cards. Use sparingly.

### Gap 3: Backdrop blur on elevated surfaces

Backdrop blur (`backdrop-blur-sm` or `backdrop-blur-md`) is absent from:
- `sheet.tsx` — SheetOverlay uses `bg-black/80` with no blur
- `dropdown-menu.tsx` — DropdownMenuContent uses `bg-popover` with no blur
- `popover.tsx` — Uses `bg-popover` with no blur
- Slide-over panels (prospect-slide-over)

This is Phase 4b from the spec. Tailwind `backdrop-blur-sm` (`backdrop-filter: blur(4px)`) is the correct utility. The elevated surface itself should use a semi-transparent dark background so the blur is visible: `bg-[var(--bg-elevated)]/90` with `backdrop-blur-md` is the pattern.

**Caution:** `backdrop-filter` triggers GPU compositing — test performance on mobile.

### Gap 4: ProspectResultCard hover doesn't include gold glow

`prospect-result-card.tsx` manages hover state via React `useState` + inline styles. On hover, `boxShadow` becomes `var(--card-shadow-hover)` but does **not** add the gold glow (`0 0 20px rgba(212,175,55,0.06)`). Two options:
1. Add the gold glow layer to the existing hover inline style (consistent with current pattern for this component)
2. Migrate to CSS class approach using `card-glow` (simpler, preferred for new components)

Option 1 is lower risk since this component already uses the `useState` hover pattern deliberately (it manages multi-property selection state).

### Gap 5: Circuit breaker state animation polish

The `enrichment-health-chart.tsx` already uses `animate-pulse` on the `half-open` dot (line 164). The spec called for "circuit breaker state animations" but the implementation is already there. This gap may be closed — **verify visually** rather than re-implementing.

### Gap 6: Enrichment processing spinner consistency

`enrichment-status.tsx` uses `Loader2` with `animate-spin` for `in_progress` state. `enrichment-tab.tsx` also uses `Loader2`. The spec calls for an "enrichment processing spinner" — this is already implemented. Verify the Loader2 spin is `animate-spin` (it is) and the color is correct (`text-info`).

### Gap 7: Inconsistent box-shadow values audit

The spec calls for grepping for inconsistent `box-shadow` values. Key concern: some components use hardcoded `rgba()` box-shadow values outside the CSS variable system instead of utility classes. This needs a grep audit as part of the verification plan.

---

## Architecture Patterns

### Established Pattern: CSS utility class wiring

All depth/animation utilities are defined globally in `globals.css`. The pattern is:
1. Apply the CSS class name in the component JSX `className`
2. For staggered animations, add `style={{ animationDelay: \`${index * 30}ms\` }}`
3. Never use inline `boxShadow` or `transform` for effects that already have a utility class

```tsx
// Source: globals.css + list-member-table.tsx (established pattern)
<TableRow
  key={member.id}
  className="row-hover-lift press-effect row-enter"
  style={{ animationDelay: `${i * 30}ms` }}
>
```

### Established Pattern: Card glow on standalone clickable cards

For card-shaped clickable containers that are not data table rows:
```tsx
// Source: globals.css + wealth-signals.tsx (established pattern)
<div
  className="card-glow press-effect row-enter surface-card rounded-[14px] p-4"
  style={{ animationDelay: `${index * 60}ms` }}
>
```

### Established Pattern: Featured crown line

Apply `surface-card-featured` alongside `surface-card` only on selected/primary/hero cards. Max 2-3 per page:
```tsx
// Source: profile-header.tsx (established pattern)
<div className="surface-card surface-card-featured rounded-[14px] p-6 ...">
```

### Anti-Pattern: Inline hover state via useState when CSS utility exists

`ProspectResultCard` uses `useState` + inline style for hover. This was built before `card-glow` existed. For Phase 21, the correct approach for **new** components is to use `card-glow` CSS utility. For existing `useState` hover components, add the gold glow to the existing inline style to maintain consistency without a full refactor.

### Pattern: Backdrop blur on elevated surfaces

```tsx
// Tailwind pattern for elevated surfaces with blur
className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)]"
```

For shadcn Sheet overlay (dark dim layer):
```tsx
// SheetOverlay: add backdrop-blur-sm
className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm ..."
```

For DropdownMenuContent and PopoverContent — add `backdrop-blur-sm` to the content class, and ensure background uses a semi-transparent token rather than opaque `bg-popover`. In this dark app, `bg-[var(--bg-elevated)]` is the correct elevated surface color.

---

## Standard Stack

No new libraries needed. Everything is pure CSS + Tailwind.

| Tool | Version | Status | Purpose |
|---|---|---|---|
| Tailwind CSS | v3 (already installed) | Installed | `backdrop-blur-*`, animation utilities |
| `globals.css` utility layer | n/a | Already built | All depth/animation classes |
| lucide-react | Already installed | Installed | `Loader2` for enrichment spinner |

**Installation:** None needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---|---|---|
| GPU-friendly animation | Custom JS animation loop | CSS `transform` / `opacity` only (already correct) |
| Reduced motion | Per-component JS checks | The existing `@media (prefers-reduced-motion: reduce)` blanket rule in `globals.css` |
| Staggered animation | setTimeout JS loops | CSS `animation-delay` via inline `style={{ animationDelay }}` |
| Backdrop blur | Custom SVG filters | Tailwind `backdrop-blur-sm` / `backdrop-blur-md` |
| Gold glow shadow | Custom shadow variables | `card-glow` CSS class |

---

## Common Pitfalls

### Pitfall 1: border-image incompatible with border-radius

**What goes wrong:** Using CSS `border-image` for gradient borders causes `border-radius` to be ignored — the card loses its rounded corners.
**Why it happens:** CSS spec: `border-image` replaces the border rendering, which bypasses `border-radius`.
**How to avoid:** Use `::after` pseudo-element with a gradient background instead (already done for `surface-card-featured`). This is an established decision from quick task 260327-usu.
**Warning signs:** If border corners appear sharp on rounded cards.

### Pitfall 2: z-index conflict with noise-overlay

**What goes wrong:** The noise overlay is at `z-index: 9999`. Any new fixed-position UI (modals, tooltips, toasts) below z-index 9999 will appear below the noise. Since `pointer-events: none` is set, clicks pass through — but visual stacking may be wrong.
**How to avoid:** Shadcn Radix portals use their own z-index (typically 50). The noise overlay must remain at the top of the stacking context. Do not lower it below z-index 50.
**Current state:** This is already working correctly per build verification.

### Pitfall 3: Applying row-enter to server components

**What goes wrong:** `row-enter` starts at `opacity: 0` and animates in. If applied to a server component, the element will briefly be invisible on hydration until React hydrates the client.
**How to avoid:** `row-enter` is safe on client components. For server-rendered lists, prefer `animate-stagger-in` (starts visible, just slides) or accept the brief invisible state.

### Pitfall 4: backdrop-blur performance on mobile

**What goes wrong:** `backdrop-filter: blur()` creates a new GPU compositing layer for every element that uses it. Many blurred elements on screen simultaneously (e.g., multiple open dropdowns) can tank frame rate on lower-end mobile.
**How to avoid:** Apply backdrop-blur only to 1 elevated surface at a time (sheets, modals, popovers — these are mutually exclusive). Do not add backdrop-blur to always-visible elements like the sidebar.
**Warning signs:** Jank when scrolling with a dropdown open on mobile.

### Pitfall 5: card-glow vs surface-card hover shadow conflict

**What goes wrong:** `surface-card:hover` sets `box-shadow: var(--card-shadow-hover)`. If a card also has `card-glow`, the `card-glow:hover` sets a different `box-shadow` (with the gold glow appended). These are separate CSS rules — whichever is more specific or later in the cascade wins.
**How to avoid:** `card-glow` should be applied to cards that are NOT plain `surface-card` (or where the gold glow is intentional on hover). The `wealth-signals.tsx` pattern is correct — those cards use `card-glow` without relying on `surface-card:hover`. For `surface-card` elements that also need gold glow, combine both classes and understand the `card-glow:hover` rule will win (it's more specific in the hover-only media query).
**Current globals.css state:** `card-glow:hover` is inside `@media (hover: hover)` at line 419. It will override `surface-card:hover` (line 370) for elements that have both classes because `card-glow:hover` appears later in the file.

### Pitfall 6: Over-applying surface-card-featured

**What goes wrong:** Using the gold crown line on every card makes it meaningless and clutters the visual hierarchy.
**How to avoid:** Maximum 2-3 featured cards per page, only on truly primary/selected/hero cards. The spec is explicit about this limit.

### Pitfall 7: Transition conflict on press-effect

**What goes wrong:** `.press-effect:active` sets `transition: transform 0.08s ease`. If the parent already has a transition on `all` (which `.row-hover-lift` does: `transition: all 0.15s ease`), the more specific `:active` transition wins on active — but only for transform. The `transition: all` on hover may still fire for other properties.
**How to avoid:** This is the established pattern and works correctly — no action needed. Documenting for awareness.

---

## Code Examples

### Staggered row entrance (table row pattern)

```tsx
// Source: globals.css + list-member-table.tsx (verified working)
{members.map((member, i) => (
  <TableRow
    key={member.id}
    className="row-hover-lift press-effect row-enter"
    style={{
      animationDelay: `${i * 30}ms`,
      background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
    }}
  >
    ...
  </TableRow>
))}
```

### Staggered card entrance (card grid pattern)

```tsx
// Source: globals.css + wealth-signals.tsx (verified working)
{signals.map((signal, index) => (
  <div
    key={index}
    className="card-glow press-effect row-enter rounded-[8px] p-4"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    ...
  </div>
))}
```

### Backdrop blur on sheet overlay

```tsx
// Pattern: shimmer shadcn SheetOverlay to add backdrop-blur
// src/components/ui/sheet.tsx — SheetOverlay
<SheetPrimitive.Overlay
  className={cn(
    "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    className
  )}
  {...props}
  ref={ref}
/>
```

### Backdrop blur on dropdown/popover content

```tsx
// Pattern: add backdrop-blur to DropdownMenuContent
// Note: bg-popover should remain for shadcn compatibility; add backdrop-blur alongside
className="... bg-popover backdrop-blur-sm ..."
```

### ProspectResultCard gold glow addition (inline style pattern)

```tsx
// Current: boxShadow: isHovered ? "var(--card-shadow-hover)" : "var(--card-shadow)"
// Proposed: add gold glow layer to hover shadow
boxShadow: isHovered
  ? "var(--card-shadow-hover), 0 0 20px rgba(212, 175, 55, 0.06)"
  : "var(--card-shadow)",
```

### surface-card-featured on selected/active persona card

```tsx
// Persona card — only when selected/active
<div
  className={cn(
    "surface-card rounded-[14px] p-7",
    isSelected && "surface-card-featured"
  )}
>
```

---

## Verification Checklist (Phase 5 from spec)

The planner must include a verification plan covering:

1. **Hover states** — all interactive rows/cards show hover feedback visually
2. **Staggered entrance** — rows animate in sequence on page load (not all at once)
3. **Gold crown line** — visible on featured cards only (max 2-3 per page)
4. **Noise overlay** — visible as a subtle texture (0.4 opacity) and does not block clicks
5. **Sidebar shadow** — right-facing depth shadow visible
6. **Badge pulse** — "New" status badges pulse; "urgent" status pulses faster
7. **Reduced motion** — all animations skipped when `prefers-reduced-motion: reduce` is set
8. **Responsive** — hover lifts and card glows do not cause horizontal overflow at 375px
9. **Performance** — noise overlay does not degrade scroll performance (GPU compositing layer check)
10. **Box-shadow consistency** — grep audit: `grep -rn "box-shadow" src/` should show only CSS variable references and utility class definitions, not scattered hardcoded `rgba()` values in component files

**Grep audit command:**
```bash
grep -rn "box-shadow\|boxShadow" src/ --include="*.tsx" | grep -v "node_modules" | grep "rgba\|rgb(" | grep -v "globals.css"
```

---

## Scope Boundaries

Items that are explicitly OUT of scope for Phase 21:

| Out of Scope | Reason |
|---|---|
| Phase 18 (Mobile Bottom Nav) | Separate planned phase, unrelated |
| New business logic or API changes | Phase 21 is CSS/visual only |
| New component creation | Only wiring existing classes to existing components |
| Changing existing hover patterns in AdminHeatmap or non-tenant pages that use `admin-row-hover` | These already have their own hover system; do not duplicate with `row-hover-lift` |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 21 is CSS/visual polish with no external dependencies. All changes are in `src/` CSS and TSX files.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (key absent) — treated as enabled.

However, Phase 21 is pure CSS/visual work. There are no behavioral requirements that map to automated unit tests. All validation is visual/manual.

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest (already installed) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | Notes |
|----|----------|-----------|-------------------|-------|
| VIS-01 | Build passes clean | smoke | `pnpm build` | Mandatory gate |
| VIS-02 | No new TS/lint errors | smoke | `pnpm build` | Covered by build |
| VIS-03 | `prefers-reduced-motion` disables animations | visual-manual | n/a | Requires OS setting toggle |
| VIS-04 | Hover states do not cause layout shift | visual-manual | n/a | Viewport visual check |
| VIS-05 | Staggered animations fire on render | visual-manual | n/a | Browser dev tools |
| VIS-06 | No horizontal overflow at 375px | visual-manual | n/a | Browser responsive mode |

**Note:** All Phase 21 requirements are visual and cannot be automated. The gate is: `pnpm build` exits 0 with zero new TypeScript/ESLint errors.

### Wave 0 Gaps

None — existing test infrastructure (Vitest, build verification) covers all automated checks for this phase. No new test files needed.

---

## Open Questions

1. **ProspectResultCard: refactor to CSS class vs. add gold glow to inline style?**
   - What we know: The component uses `useState` + inline styles for selection and hover state simultaneously. Migrating to CSS class would require decoupling selection state from hover state.
   - What's unclear: Whether the selection state styling (gold border/background) conflicts with `card-glow` hover.
   - Recommendation: Add gold glow to the existing inline hover style (lowest risk, consistent with Phase 05 pattern of using inline styles for CSS variable gradients when Tailwind cannot apply them).

2. **How many components need backdrop-blur?**
   - What we know: `sheet.tsx`, `dropdown-menu.tsx`, `dialog.tsx` (already has `backdrop-blur-md` on overlay) are the primary elevated surfaces.
   - What's unclear: Whether `popover.tsx` is used widely enough to warrant blur (it may not be visible in practice).
   - Recommendation: Scope to Sheet overlay + DropdownMenuContent only. Skip Popover — it is not a visually prominent elevated surface in this app.

3. **Should search results table rows get `row-enter` stagger?**
   - What we know: The search results are rendered as a table with many rows potentially (up to 50 per page).
   - What's unclear: Performance with 50 staggered animations firing simultaneously (50 rows × 30ms = 1.5s total stagger window).
   - Recommendation: Apply `row-enter` with stagger but cap the delay at 300ms maximum (`Math.min(i * 30, 300)`) to avoid long waits on large result sets.

---

## Sources

### Primary (HIGH confidence)

- `src/app/globals.css` — Direct inspection of all defined utility classes and their current state
- `260327-usu-SUMMARY.md` and `260327-usu-PLAN.md` — Authoritative record of what quick task built
- `src/app/[orgId]/lists/components/list-member-table.tsx` — Verified wiring example
- `src/components/prospect/wealth-signals.tsx` — Verified wiring example
- `src/components/prospect/profile-header.tsx` — Verified `surface-card-featured` usage
- `src/components/ui/sheet.tsx` — Verified absence of backdrop-blur
- `src/components/ui/dropdown-menu.tsx` — Verified absence of backdrop-blur
- `src/components/admin/enrichment-health-chart.tsx` — Verified circuit breaker `animate-pulse` is already present

### Secondary (MEDIUM confidence)

- Tailwind CSS documentation (backdrop-blur utilities, transform utilities) — standard Tailwind v3 API
- CSS backdrop-filter MDN — browser support is universal in modern browsers; Safari supported since v9

### Tertiary (LOW confidence)

- Performance impact of noise overlay — not benchmarked, but SVG `feTurbulence` filter at 256x256 tiled is a known low-overhead pattern

---

## Metadata

**Confidence breakdown:**
- Already-done audit: HIGH — direct file inspection confirms all CSS classes and wiring
- Gap identification: HIGH — direct grep of component files
- Backdrop-blur pattern: HIGH — standard Tailwind utility
- Performance claims: MEDIUM — CSS compositing behavior is well-documented but not benchmarked in this specific app

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (30 days — stable CSS domain)
