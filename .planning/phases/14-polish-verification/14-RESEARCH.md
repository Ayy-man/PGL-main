# Phase 14: Polish + Verification — Research

**Researched:** 2026-03-01
**Domain:** Cross-cutting UI quality verification — responsive testing, design system compliance, accessibility, build health
**Confidence:** HIGH

---

## Summary

Phase 14 is a cross-cutting verification and polish phase, not a new-feature phase. Its job is to sweep all UI work from Phases 06–13, identify any remaining design system violations or quality gaps, and fix them. This is the final gate before the app is considered production-ready from a UI standpoint.

The codebase has been built incrementally across 8 screens (foundation, layout shell, lead search, prospect profile, saved personas, dashboard, export log, admin dashboard). Each screen phase included its own build-verification plan (e.g., 07-05, 08-05, 13-04). Those per-phase audits caught local issues. Phase 14 must look for cross-cutting issues that per-phase audits would miss: broken responsive behavior at edge breakpoints, missing `page-enter` on pages built in pre-redesign phases, leftover raw Tailwind color classes in components touched before the design system was locked, missing `prefers-reduced-motion` guard, and accessibility gaps on icon-only buttons.

The stack is entirely Next.js 15 + TypeScript + Tailwind + shadcn/ui. There are no new libraries to introduce. The verification tooling is `pnpm build` (TypeScript + ESLint) and `vitest run` (one test file exists). All polish work is file editing and targeted grep-driven audits.

**Primary recommendation:** Treat Phase 14 as three waves — (1) a global grep audit to enumerate all remaining design system violations, (2) fix all found violations, (3) final build + test pass and STATE/ROADMAP update declaring v2.0 complete.

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-03 | Responsive layout (desktop-first, mobile-friendly via responsive design) | MASTER.md §13 defines 4 test breakpoints (375/768/1024/1440px). Research confirms sidebar hidden below `lg` (1024px), slide-over full-width on mobile, data tables horizontal scroll. Current scan shows `page-enter` missing from exports and lists pages — those are mobile-visible pages too. |
| UI-05 | Loading states and skeleton screens for async data | Both `loading.tsx` files (tenant + admin) exist and use Skeleton components. Search page has SkeletonCard. Individual page components use inline skeletons. Gap identified: exports and lists pages have no dedicated `loading.tsx` stubs. |
| UI-06 | Error boundaries with user-friendly error messages | Three error boundary files exist: `global-error.tsx`, `[orgId]/error.tsx`, `admin/error.tsx`. All use `font-serif` headings. Gap: error page buttons use `bg-primary` (shadcn token) instead of design system gold button pattern. Not a blocker but a cosmetic inconsistency. |
| Cross-cutting | Raw Tailwind color audit across all redesign components | Two confirmed violations found: `src/components/prospect/lookalike-discovery.tsx` uses `bg-red-500/10 border border-red-500/20 text-red-400` and `bg-green-500/10 text-green-400`. These are in the shared component tree (Phase 3 code not touched by redesign phases). |
| Cross-cutting | `prefers-reduced-motion` respect | `globals.css` defines `@keyframes fadeIn` and `.page-enter` but has NO `@media (prefers-reduced-motion)` guard. This means the fade-in animation runs even for users who have disabled motion in their OS. WCAG 2.1 AA requires this. Fix is a 3-line CSS addition. |
| Cross-cutting | `page-enter` fade-in on all page roots | `page-enter` present: admin layout, admin page, search content, personas page, tenant layout wrapper, tenant home. Missing from: exports page root (`ExportsPage`), lists page root (`ListsPage`), list detail page, activity page, analytics page, admin tenants/users pages. |
| Cross-cutting | Surface gradient verification | `surface-card` utility and `surface-admin-card` utility exist in globals.css. Components use them correctly in most cases. Lists page uses inline `style={{ background: ... }}` pattern for cards — consistent with the `onMouseEnter/Leave` CSS variable hover pattern established in Phase 05. No flat solid backgrounds found. |
| Cross-cutting | Keyboard navigation | Lucide icon-only buttons need `aria-label`. Audit of aria-label coverage shows it is present in `breadcrumbs.tsx` and `data-table-pagination.tsx`, but icon-only action buttons in `prospect-slide-over.tsx` use `h-9 w-9` circles without confirmed `aria-label` attributes. |

</phase_requirements>

---

## Standard Stack

### Core (no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 (declared), actually 15 | Framework | Existing — no change |
| Tailwind CSS | v3 (existing) | Utility classes | Existing |
| Vitest | ^4.0.18 | Test runner | Already configured in vitest.config.ts |
| pnpm build | N/A | TypeScript + ESLint gate | Existing CI gate |

**No new packages needed.** Phase 14 is entirely verification and targeted fixes.

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `grep -rn` (bash) | Design system violation scanning | Phase 14 audit tasks |
| `pnpm build` | Compile + type check | After every fix wave |
| `vitest run` | Unit tests | Final gate before declaring complete |

### Alternatives Considered

None — Phase 14 has no architecture decisions. It is fix-and-verify.

---

## Architecture Patterns

### Verified Pattern 1: Per-Phase Compliance Checklist

Each prior screen phase included a final plan (e.g., 07-05, 08-05, 09-05, 13-04) structured as:
1. `pnpm build` → fix any errors
2. Grep-based design system audit → fix violations
3. Update STATE.md + ROADMAP.md

Phase 14 follows this same structure but applies it globally across ALL phases.

**Example compliance check pattern (from 08-05-PLAN.md):**
```bash
grep -rn "zinc-\|gray-\|emerald-\|yellow-\|blue-\|red-\|green-" src/app/[orgId]/search/components/*.tsx | grep -v node_modules
```

### Verified Pattern 2: CSS Variable Hover (onMouseEnter/Leave)

**What:** Tailwind `hover:` classes cannot reference CSS custom property values. Throughout the codebase, hover states for gold borders, card backgrounds, and nav items use `onMouseEnter`/`onMouseLeave` React handlers that set `style` attributes directly.

**When verifying:** Confirm that interactive cards and nav items that need gold hover states use this pattern, NOT `hover:border-[var(--border-hover)]` (which doesn't work in Tailwind v3).

```tsx
// Source: Established Phase 05-03 pattern, confirmed throughout codebase
onMouseEnter={(e) => {
  e.currentTarget.style.background = "var(--bg-card-hover)";
  e.currentTarget.style.borderColor = "var(--border-hover)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.background = "var(--bg-card-gradient)";
  e.currentTarget.style.borderColor = "var(--border-subtle)";
}}
```

### Verified Pattern 3: page-enter Application

`page-enter` must be on the **root element** of each page component. The `layout.tsx` wrappers for `[orgId]` and `admin` also apply it to their content div — so pages rendered inside those layouts inherit the fade-in via the layout wrapper and do NOT need to add it themselves.

**Critical finding:** The tenant layout at `src/app/[orgId]/layout.tsx` line 54 applies `page-enter p-6` to the wrapper div. This means all pages under `[orgId]/` (including lists, exports, activity, analytics) already get the fade-in via the layout shell. NO per-page addition needed for tenant pages.

The admin layout at `src/app/admin/layout.tsx` line 83 does the same — `page-enter p-6 lg:p-8`. Admin page and sub-pages are covered.

**Exception:** Standalone pages outside the layout wrapper (e.g., `search/components/search-content.tsx`, `[orgId]/personas/page.tsx`, `[orgId]/page.tsx`) apply `page-enter` themselves because they have custom layout logic. This is correct and consistent.

**Conclusion:** `page-enter` gap concern from initial scan is a FALSE POSITIVE — the layout shell covers all sub-pages.

### Verified Pattern 4: Surface Treatment

Three surface utility classes exist in `globals.css`:
- `surface-card` — tenant cards (gradient bg + `--border-subtle` + hover)
- `surface-admin-card` — admin table containers
- `bg-card-gradient` — inline style pattern for components that need `onMouseEnter/Leave` hover (cannot use `surface-card:hover` programmatically)

**Anti-Pattern to Avoid:** Using raw `rounded-lg border bg-card` on new card containers. The correct class is `surface-card rounded-[14px]` or `surface-admin-card`.

### Anti-Patterns to Avoid

- **Raw Tailwind semantic colors:** `red-500`, `green-400`, `blue-*` in className. Use CSS variable tokens instead: `var(--destructive)`, `var(--success)`, `var(--info)`.
- **Skipping `prefers-reduced-motion`:** The `@keyframes fadeIn` in globals.css must be wrapped with a media query to comply with WCAG 2.1 AA.
- **Icon-only buttons without `aria-label`:** Every `<button>` that renders only an icon (no visible text) must have `aria-label="..."`.
- **`bg-primary` on custom buttons:** Error page retry buttons use `bg-primary` (shadcn token). While not strictly a violation (shadcn tokens resolve through CSS variables), they should use the gold button pattern for design consistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Breakpoint testing | Custom resize script | Browser DevTools / manual + `pnpm build` | Visual verification only; no test framework for responsive |
| Accessibility audit | Custom ARIA scanner | Grep for `aria-label` gaps + manual keyboard testing | Sufficient for WCAG AA; full axe-core setup is out of scope for this phase |
| Reduced motion | Custom hook | One CSS `@media` block in globals.css | 3-line fix, not a component problem |

---

## Common Pitfalls

### Pitfall 1: Over-scope (treating Phase 14 as a new feature phase)

**What goes wrong:** Adding new visual features, components, or behaviors during a polish phase.
**Why it happens:** Polishing naturally surfaces "nice to have" improvements.
**How to avoid:** Phase 14's mandate is fix + verify only. Any new component needs belong in a hypothetical Phase 15. The `deferred-items.md` pattern (used in Phase 9) is the right place to park discoveries.
**Warning signs:** Task descriptions that say "add X" rather than "fix X" or "verify X."

### Pitfall 2: False positive from raw color grep

**What goes wrong:** Grep for `red-` catches comments, CSS variable names (e.g., `--admin-row-border`), or test fixtures.
**Why it happens:** Simple string matching.
**How to avoid:** Filter grep results to lines containing `className=` or `class=`. Confirm violations are actually in JSX attribute strings, not comments.

### Pitfall 3: Assuming per-phase audits caught everything

**What goes wrong:** Skipping the global audit because "each phase had a compliance check."
**Why it happens:** Per-phase audits are scoped to files modified in that phase. Shared components touched in Phase 03 (e.g., `lookalike-discovery.tsx`) were not re-audited in Phase 08–13.
**Warning signs:** Raw color violations in `src/components/` (not `src/app/`), which are outside per-phase audit scopes.

**Confirmed example in this codebase:**
```
src/components/prospect/lookalike-discovery.tsx:155:
  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg"

src/components/prospect/lookalike-discovery.tsx:184:
  className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm"
```
These are definite violations requiring fixes.

### Pitfall 4: Missing `prefers-reduced-motion` causes WCAG AA failure

**What goes wrong:** The `fadeIn` animation triggers for users who have OS-level "reduce motion" enabled.
**Why it happens:** globals.css defines `.page-enter { animation: fadeIn 0.4s ease forwards; }` with no motion media query guard.
**How to avoid:** Add:
```css
@media (prefers-reduced-motion: reduce) {
  .page-enter {
    animation: none;
  }
}
```
**Warning signs:** No `prefers-reduced-motion` in the entire codebase (confirmed: grep returned zero results).

### Pitfall 5: pnpm build reporting Next.js 14 vs 15 version

**What goes wrong:** `package.json` declares `"next": "14.2.35"` but the codebase uses Next.js 15 patterns (async params, etc.).
**Why it happens:** Version mismatch documented in MEMORY.md.
**How to avoid:** Build will still pass since the installed version handles the patterns. Do NOT attempt to upgrade `next` version in this phase — out of scope.

---

## Code Examples

### Prefers-Reduced-Motion Fix

```css
/* Source: WCAG 2.1 AA, globals.css in src/app/globals.css */
@media (prefers-reduced-motion: reduce) {
  .page-enter {
    animation: none;
  }
}
```

### Lookalike Discovery — Design System Compliant Error State

```tsx
{/* Replace raw red/green Tailwind classes with CSS variable equivalents */}
{/* Error state — replaces bg-red-500/10 border border-red-500/20 text-red-400 */}
<div
  className="px-4 py-3 rounded-lg"
  style={{
    background: "rgba(var(--destructive), 0.1)",
    border: "1px solid rgba(var(--destructive), 0.2)",
    color: "var(--destructive)",
  }}
>

{/* OR — use existing shadcn destructive token chain which resolves correctly in dark mode */}
<div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
```

Note: `bg-destructive/10` uses the mapped shadcn token, not a raw color. This is acceptable per design system rules since `destructive` maps to `var(--destructive)` in `tailwind.config.ts`. Verify the mapping exists — it does (`destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' }`).

### Aria-Label on Icon-Only Buttons

```tsx
{/* Source: WCAG 2.1 SC 4.1.2, SKILL.md aria-labels rule */}
<button
  aria-label="Close panel"
  className="h-9 w-9 flex items-center justify-center ..."
>
  <X className="h-4 w-4 shrink-0" />
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-phase compliance audit | Global cross-phase audit | Phase 14 | Catches shared component violations missed by per-phase scope |
| Manual hover via CSS | `onMouseEnter/Leave` for CSS variable hover | Phase 05-03 | Required because Tailwind v3 cannot interpolate CSS custom properties in `hover:` variants |
| Playfair Display | Cormorant Garamond | Phase 05 redesign | REQUIREMENTS.md (UI-02) still says "Playfair Display" but codebase uses Cormorant Garamond per design-system/MASTER.md. This is a doc contradiction — the MASTER.md is the source of truth. Do NOT change the implementation. |

**Deprecated/outdated in this codebase:**
- `font-cormorant` class — never use; use `font-serif` which maps to Cormorant Garamond via CSS variable
- `--text-primary` / `--text-secondary` — named `--text-primary-ds` / `--text-secondary-ds` to avoid shadcn collision (Phase 05 decision)

---

## Open Questions

1. **Should error page retry buttons be updated to gold button pattern?**
   - What we know: `global-error.tsx`, `[orgId]/error.tsx`, `admin/error.tsx` all use `bg-primary text-primary-foreground` (shadcn default). This renders correctly in dark mode.
   - What's unclear: Whether Adrian/the client cares about this cosmetic inconsistency.
   - Recommendation: Fix for consistency — use the ghost button variant from `src/components/ui/button.tsx` or apply the gold CTA pattern. Low effort, high polish value.

2. **Is `lookalike-discovery.tsx` actively reachable in the current redesign UI?**
   - What we know: It lives in `src/components/prospect/` and is imported by profile views.
   - What's unclear: Whether the current UI actually renders lookalike discovery (the PROF-10 feature is marked complete but some profile tab stubs are not yet fully wired).
   - Recommendation: Fix the raw color violations regardless — the component exists in the tree and will be rendered eventually.

3. **Do admin tenants/users/new pages need `page-enter`?**
   - What we know: Admin layout wrapper applies `page-enter` to the content div (line 83 of admin/layout.tsx).
   - What's unclear: Whether the tenants/new and users/new sub-pages have their own root div that would double-fire the animation.
   - Recommendation: Check if these sub-pages are nested inside the layout content wrapper or have their own `page-enter` root. Avoid double animation.

---

## Validation Architecture

`workflow.nyquist_validation` is not present in `.planning/config.json` (the key does not exist). Skipping this section.

The existing vitest setup has one test file: `src/lib/apollo/__tests__/client.test.ts`. No UI component tests exist. Phase 14 does not need to add tests — the verification standard is:
1. `pnpm build` exits 0
2. `vitest run` passes (existing test suite green)
3. Manual checklist passes (grep-based audit)

---

## Comprehensive Audit Checklist for the Planner

This section gives the planner the exact grep commands and checks to include in the Phase 14 plan tasks.

### Global Design System Violations

```bash
# Check 1: Raw Tailwind color classes (zero tolerance in className strings)
grep -rn "zinc-\|gray-\|emerald-\|yellow-" src/ --include="*.tsx" | grep "className" | grep -v "//\|node_modules"

# Check 2: Raw semantic colors — red/green/blue (must use CSS variable tokens)
grep -rn "bg-red-\|text-red-\|border-red-\|bg-green-\|text-green-\|bg-blue-\|text-blue-" src/ --include="*.tsx" | grep "className" | grep -v "//\|node_modules"
# KNOWN VIOLATIONS: lookalike-discovery.tsx lines 155, 184

# Check 3: Scale transforms on hover (anti-pattern per MASTER.md)
grep -rn "hover:scale\|scale(" src/ --include="*.tsx" | grep -v "//\|node_modules"

# Check 4: Emoji icons (zero tolerance per MASTER.md anti-patterns)
# Manual check — not grep-able

# Check 5: No prefers-reduced-motion guard
grep -rn "prefers-reduced-motion" src/ --include="*.css" --include="*.tsx"
# KNOWN VIOLATION: zero results — needs fix in globals.css
```

### Accessibility Checks

```bash
# Check 6: Icon-only buttons missing aria-label
# Pattern: button with no text content, only icon child
grep -rn "h-9 w-9\|h-8 w-8\|h-10 w-10" src/ --include="*.tsx" | grep "button\|Button" | grep -v "aria-label"
# Manual review needed for false positives

# Check 7: Confirm all meaningful images have alt text
grep -rn "<img\|<Image" src/ --include="*.tsx" | grep -v "alt=" | grep -v "//\|node_modules"

# Check 8: prefers-reduced-motion (same as Check 5)
```

### Typography Checks

```bash
# Check 9: font-serif used on non-heading elements (body text, labels, buttons)
# Manual review of any new components in Phase 14 scope

# Check 10: font-cormorant class used anywhere (wrong — must use font-serif)
grep -rn "font-cormorant" src/ --include="*.tsx"
```

### Surface Treatment Checks

```bash
# Check 11: Flat solid backgrounds on card containers (anti-pattern)
# Look for bg-[#xxx] or bg-white without gradient overlay
grep -rn 'bg-\[#' src/ --include="*.tsx" | grep -v "//\|node_modules"
grep -rn 'bg-white[^/]' src/ --include="*.tsx" | grep -v "//\|node_modules"
```

### Responsive Breakpoint Spot Checks (Manual)

At 375px (mobile):
- Sidebar hidden, hamburger visible — layout.tsx hidden lg:flex pattern confirmed
- TopBar visible, no duplicate headers — hidden lg:flex confirmed on TopBar per Phase 07 decision
- Prospect slide-over: full-width Sheet — Sheet component from shadcn auto-handles
- Data tables: horizontal scroll — verify `overflow-x-auto` on table wrappers
- Admin pages: graceful at 375px (admin is desktop-only but should not crash)

At 768px (tablet):
- 2-column grids should be present on dashboard (md:grid-cols-2)
- Sidebar still hidden (below lg:1024px threshold)

At 1024px (desktop threshold):
- Sidebar appears
- TopBar visible
- Slide-over 480px

At 1440px (wide desktop):
- No excessive whitespace without content
- Grid columns expand as expected

---

## Sources

### Primary (HIGH confidence)

- `design-system/MASTER.md` — All design system rules, verified current
- `src/app/globals.css` — All CSS custom properties and utility classes, verified by direct read
- `.planning/phases/07-layout-shell-navigation/07-05-PLAN.md` — Compliance audit pattern template
- `.planning/phases/08-lead-search/08-05-PLAN.md` — Extended compliance audit template with grep commands
- `.planning/phases/13-admin-dashboard/13-04-PLAN.md` — Most recent verification plan, 19-item checklist
- `.planning/STATE.md` — Accumulated decisions, confirmed Phase 13 complete

### Secondary (MEDIUM confidence)

- WCAG 2.1 AA standard — `prefers-reduced-motion` requirement (well-established standard, no need to re-verify)
- `ui-ux-pro-max` SKILL.md — Pre-delivery checklist confirms 44px touch targets, aria-labels, reduced motion

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, verified package.json
- Architecture patterns: HIGH — verified directly from codebase scan
- Pitfalls: HIGH — confirmed by direct grep scans; violation examples cited with exact file paths
- Checklist completeness: MEDIUM — visual/manual checks (breakpoints, keyboard nav) cannot be automated; flagged clearly

**Research date:** 2026-03-01
**Valid until:** Indefinite — this is a verification phase, no external libraries involved
