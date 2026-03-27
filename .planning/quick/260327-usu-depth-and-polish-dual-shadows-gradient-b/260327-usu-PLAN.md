---
phase: quick
plan: 260327-usu
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/app/layout.tsx
  - src/components/layout/sidebar.tsx
  - src/app/[orgId]/lists/components/list-member-table.tsx
  - src/components/prospect/wealth-signals.tsx
  - src/components/prospect/profile-view.tsx
  - src/components/prospect/profile-header.tsx
  - src/app/[orgId]/lists/components/member-status-select.tsx
autonomous: true
requirements: [visual-refinement]
must_haves:
  truths:
    - "Cards show dual-shadow depth (inset highlight + outer shadow)"
    - "Featured profile card displays gold crown line at top"
    - "Table rows animate in with staggered fade-up on render"
    - "Clickable cards glow gold on hover"
    - "Active elements depress slightly on click"
    - "Noise grain texture overlays the entire viewport"
    - "Sidebar casts a shadow to the right"
    - "Reduced motion preference disables all animations"
  artifacts:
    - path: "src/app/globals.css"
      provides: "All new CSS utility classes"
      contains: "surface-card-featured"
    - path: "src/app/layout.tsx"
      provides: "Noise overlay div"
      contains: "noise-overlay"
  key_links:
    - from: "src/app/globals.css"
      to: "src/app/[orgId]/lists/components/list-member-table.tsx"
      via: "row-hover-lift, press-effect, row-enter classes"
      pattern: "row-hover-lift|press-effect|row-enter"
    - from: "src/app/globals.css"
      to: "src/components/prospect/profile-header.tsx"
      via: "surface-card-featured class"
      pattern: "surface-card-featured"
---

<objective>
Visual refinement pass: add depth, polish, and interaction feedback across the app using CSS utility classes.

Purpose: Elevate the dark luxury aesthetic with dual shadows, gradient borders, gold crown lines, staggered entrance animations, noise texture, click feedback, and sidebar depth.
Output: Enhanced globals.css with new utility classes, noise overlay in root layout, classes applied to key components.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/globals.css
@src/app/layout.tsx
@src/components/layout/sidebar.tsx
@src/app/[orgId]/lists/components/list-member-table.tsx
@src/components/prospect/wealth-signals.tsx
@src/components/prospect/profile-view.tsx
@src/components/prospect/profile-header.tsx
@src/app/[orgId]/lists/components/member-status-select.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CSS utility classes to globals.css + noise overlay to root layout + sidebar shadow</name>
  <files>src/app/globals.css, src/app/layout.tsx, src/components/layout/sidebar.tsx</files>
  <action>
**globals.css** — Add the following new utility classes inside the existing `@layer utilities { ... }` block (after the existing `.animate-count-fade` rule, before the closing `}`):

1. **Enhanced surface-card** — UPDATE the existing `.surface-card` rule to use dual shadows. Replace its `box-shadow` line with:
   ```
   box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 24px rgba(0, 0, 0, 0.4);
   ```
   Also add a gradient border. Replace `border: 1px solid var(--border-default);` with:
   ```
   border: 1px solid transparent;
   border-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)) 1;
   ```
   IMPORTANT: Since `border-image` doesn't work with `border-radius`, use an alternative approach. Keep `border: 1px solid var(--border-default);` and instead layer the dual shadow only. The gradient border effect will be approximated by the existing border + the inset shadow highlight. So the final surface-card should be:
   ```css
   .surface-card {
     background: var(--bg-card-gradient);
     border: 1px solid var(--border-default);
     border-radius: 14px;
     box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 24px rgba(0, 0, 0, 0.4);
     transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
   }
   ```
   Do the same for `.card-interactive` (same shadow update).

2. **Gold crown line for featured cards** — Add new class:
   ```css
   .surface-card-featured {
     position: relative;
   }
   .surface-card-featured::after {
     content: "";
     position: absolute;
     top: 0;
     left: 0;
     right: 0;
     height: 1px;
     background: linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.3) 50%, transparent 100%);
     border-radius: 14px 14px 0 0;
   }
   ```
   NOTE: Using ::after pseudo-element because `border-image` doesn't work with `border-radius`.

3. **Row hover lift** — Add:
   ```css
   .row-hover-lift {
     transition: all 0.15s ease;
   }
   ```
   And inside the existing `@media (hover: hover) { ... }` block, add:
   ```css
   .row-hover-lift:hover {
     background: var(--bg-card-hover, rgba(255,255,255,0.03));
     transform: translateY(-1px);
     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
   }
   ```

4. **Click press effect** — Add:
   ```css
   .press-effect:active {
     transform: scale(0.995);
     transition: transform 0.08s ease;
   }
   ```

5. **Gold edge-glow on hover** — Add the base transition outside the `@media (hover: hover)` block:
   ```css
   .card-glow {
     transition: box-shadow 0.25s ease, border-color 0.25s ease;
   }
   ```
   And inside `@media (hover: hover)`:
   ```css
   .card-glow:hover {
     box-shadow:
       inset 0 1px 0 rgba(255, 255, 255, 0.04),
       0 4px 24px rgba(0, 0, 0, 0.4),
       0 0 20px rgba(212, 175, 55, 0.06);
     border-color: var(--border-hover, rgba(255,255,255,0.1));
   }
   ```

6. **Staggered row entrance** — Add as a new keyframe (OUTSIDE the `@layer utilities` block, near other keyframes):
   ```css
   @keyframes fadeInUp {
     from { opacity: 0; transform: translateY(8px); }
     to { opacity: 1; transform: translateY(0); }
   }
   ```
   And the utility class inside `@layer utilities`:
   ```css
   .row-enter {
     animation: fadeInUp 0.3s ease forwards;
     opacity: 0;
   }
   ```

7. **Status badge pulse** — Add keyframe (OUTSIDE `@layer utilities`, near other keyframes):
   ```css
   @keyframes pulse-subtle {
     0%, 100% { opacity: 1; }
     50% { opacity: 0.7; }
   }
   ```
   And utility classes inside `@layer utilities`:
   ```css
   .badge-pulse { animation: pulse-subtle 2s ease-in-out infinite; }
   .badge-pulse-urgent { animation: pulse-subtle 1s ease-in-out infinite; }
   ```

8. **Noise grain overlay CSS** — Add OUTSIDE `@layer utilities` (at the end of the file):
   ```css
   .noise-overlay {
     position: fixed;
     inset: 0;
     background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E");
     opacity: 0.4;
     mix-blend-mode: overlay;
     pointer-events: none;
     z-index: 9999;
   }
   ```

The existing `@media (prefers-reduced-motion: reduce)` block already covers all animations and transitions with `0.01ms !important` — no changes needed there since it already handles `*`, `*::before`, and `*::after`.

**layout.tsx** — Add the noise overlay div. Inside the `<body>` element, add as the FIRST child (before `<NuqsAdapter>`):
```tsx
<div className="noise-overlay" aria-hidden="true" />
```

**sidebar.tsx** — Add sidebar shadow to the desktop `<aside>` element. In the `style` prop of the aside, add `boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)"`. The style prop should become:
```tsx
style={{
  width: "220px",
  background: "var(--bg-sidebar)",
  borderRight: "1px solid var(--border-sidebar)",
  boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
}}
```
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && grep -c "surface-card-featured\|row-hover-lift\|press-effect\|card-glow\|row-enter\|badge-pulse\|noise-overlay\|fadeInUp\|pulse-subtle" src/app/globals.css && grep -c "noise-overlay" src/app/layout.tsx && grep -c "boxShadow.*4px 0 24px" src/components/layout/sidebar.tsx</automated>
  </verify>
  <done>globals.css contains all 9 new CSS utilities (surface-card-featured, row-hover-lift, press-effect, card-glow, row-enter, badge-pulse, badge-pulse-urgent, noise-overlay, surface-card dual shadow). layout.tsx renders noise overlay div. Sidebar has rightward shadow.</done>
</task>

<task type="auto">
  <name>Task 2: Apply CSS utility classes to components</name>
  <files>src/app/[orgId]/lists/components/list-member-table.tsx, src/components/prospect/wealth-signals.tsx, src/components/prospect/profile-view.tsx, src/components/prospect/profile-header.tsx, src/app/[orgId]/lists/components/member-status-select.tsx</files>
  <action>
**list-member-table.tsx** — In the desktop `<TableBody>`, each `<TableRow>` (line ~171-174) currently has only a `style` prop. Add CSS classes for row animation and interaction:
- Change the TableRow to: `<TableRow key={member.id} className="row-hover-lift press-effect row-enter" style={{ animationDelay: \`${i * 30}ms\`, background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}>`
- This adds staggered entrance animation (30ms per row), hover lift, and press feedback.

**wealth-signals.tsx** — On each signal card div (line ~143, the `<div key={index}` inside the `.map`):
- Add `card-glow press-effect row-enter` to the existing className.
- Add `style={{ animationDelay: \`${index * 60}ms\` }}` merged with the existing style prop. The full style becomes:
  ```tsx
  style={{
    animationDelay: `${index * 60}ms`,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--border-default, rgba(255,255,255,0.06))",
  }}
  ```

**profile-header.tsx** — The profile card div (line ~63) currently has `className="surface-card rounded-[14px] p-6 flex flex-col items-center text-center relative overflow-hidden"`. Add `surface-card-featured` to the class list:
- `className="surface-card surface-card-featured rounded-[14px] p-6 flex flex-col items-center text-center relative overflow-hidden"`
- The existing `<div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: "rgba(212,175,55,0.12)" }}>` on lines 65-69 can be REMOVED since `surface-card-featured::after` now provides the gold crown line with a gradient (transparent to gold to transparent) which is more polished. Remove that entire div (lines 65-69).

**member-status-select.tsx** — For the "New" status badge pulse, we need to add the `badge-pulse` class to the Badge when status is "new". In the `<SelectValue>` section (line ~56), wrap the Badge conditionally:
- Change line 56-58 from:
  ```tsx
  <Badge variant={STATUS_CONFIG[status].variant}>
    {STATUS_CONFIG[status].label}
  </Badge>
  ```
  To:
  ```tsx
  <Badge variant={STATUS_CONFIG[status].variant} className={status === "new" ? "badge-pulse" : ""}>
    {STATUS_CONFIG[status].label}
  </Badge>
  ```

**profile-view.tsx** — The `surface-card` divs already exist and will automatically pick up the new dual-shadow from the updated globals.css rule. No additional changes needed for profile-view since the card glow is primarily for clickable standalone cards (wealth signals, not the static dossier panels).
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && grep -c "row-hover-lift\|press-effect\|row-enter" src/app/[orgId]/lists/components/list-member-table.tsx && grep -c "card-glow\|press-effect\|row-enter" src/components/prospect/wealth-signals.tsx && grep -c "surface-card-featured" src/components/prospect/profile-header.tsx && grep -c "badge-pulse" src/app/[orgId]/lists/components/member-status-select.tsx && pnpm build 2>&1 | tail -5</automated>
  </verify>
  <done>List member table rows have staggered entrance + hover lift + press feedback. Wealth signal cards have gold glow + press + staggered entrance. Profile header has gold crown line via surface-card-featured. "New" status badges pulse. Build passes clean.</done>
</task>

</tasks>

<verification>
1. `pnpm build` exits 0 with no new errors
2. `grep -r "row-hover-lift\|press-effect\|row-enter\|card-glow\|surface-card-featured\|badge-pulse\|noise-overlay" src/` confirms classes are defined and used
3. All existing `.surface-card` elements automatically get the enhanced dual-shadow from the updated CSS rule
</verification>

<success_criteria>
- globals.css has all new CSS utility classes (dual shadow, gold crown, row hover lift, press effect, card glow, row enter, badge pulse, noise overlay)
- Root layout renders noise grain overlay div
- Sidebar has rightward depth shadow
- List member table rows animate in with stagger and have hover/press feedback
- Wealth signal cards have gold glow hover and staggered entrance
- Profile header card has gold crown gradient line
- "New" status badges pulse subtly
- `pnpm build` passes clean
- Reduced motion media query already covers all new animations (existing rule handles `*`)
</success_criteria>

<output>
After completion, create `.planning/quick/260327-usu-depth-and-polish-dual-shadows-gradient-b/260327-usu-SUMMARY.md`
</output>
