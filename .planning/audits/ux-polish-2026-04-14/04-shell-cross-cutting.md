# Shell + Cross-Cutting UX Polish Audit

Date: 2026-04-14. Scope: shell chrome (sidebars, top bar, bottom nav, command palette), global UI primitives (toast, dialog, sheet, dropdown, tooltip, loaders, empty-state, confirmation), `loading.tsx` / `error.tsx` / `not-found.tsx`, keyboard affordances, responsive, page transitions, cross-role consistency (tenant vs admin).

Token vocabulary confirmed from `tailwind.config.ts` + `src/app/globals.css`:
- Fonts: `font-serif` (Cormorant Garamond), `font-sans` (DM Sans), `font-mono` (JetBrains Mono).
- Gold tokens: `--gold-primary` `#d4af37`, `--gold-bright` `#f0d060`, `--gold-text`, `--gold-bg`, `--gold-bg-strong`, `--border-gold`.
- Text tokens: `--text-primary-ds`, `--text-secondary-ds`, `--text-tertiary`, `--text-ghost`.
- Surfaces: `--bg-floating` `#141416`, `--bg-floating-elevated`, `--bg-sidebar` gradient, `--bg-elevated`, `--border-default`, `--border-subtle`, `--border-hover`.
- Radii tokens: `rounded-card` (14px), `rounded-btn` (8px), `rounded-badge` (20px).
- Utility classes already defined: `.surface-card`, `.card-interactive`, `.ghost-hover`, `.page-enter`, `.press-effect`, `.glow-gold`, `.heading-glow`, `.shimmer-skeleton`, `.row-enter`, `.badge-pulse`.

---

## Sidebar (`src/components/layout/sidebar.tsx`)

### Finding: Collapse animation transitions only `width`, causing a pop in child opacity
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/layout/sidebar.tsx:45`
- **Current**: `className="hidden lg:flex flex-col h-screen sticky top-0 transition-[width] duration-200 ease-in-out"` — then `{!collapsed && (<span>...tenant name...</span>)}` at line 69 renders/unmounts with no fade. When collapsing, labels vanish immediately while width is still animating, then the nav-item labels also snap out (nav-items.tsx conditionally renders).
- **Fix**: Add a coordinated fade. In the header block (line 69) and footer text (line 91), keep the nodes mounted but toggle opacity+width: wrap each label span with `className="transition-opacity duration-150" style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}`. Bump sidebar `duration-200` to `duration-300` for a slightly slower, more deliberate luxury feel to match existing shell animations.

### Finding: Sidebar width uses inline style; transition-[width] honored but no cubic-bezier
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/layout/sidebar.tsx:45-51`
- **Current**: `transition-[width] duration-200 ease-in-out` — `ease-in-out` gives a symmetrical curve that feels mechanical; every other luxury shell animation in `globals.css` uses `ease` or `ease-out`.
- **Fix**: Change to `ease-out` to match the `fadeIn` keyframe and `.press-effect` timing elsewhere. Same change in `src/app/admin/admin-sidebar.tsx:32` (`transition-all duration-200` — note: `transition-all` is also broader than needed, swap to `transition-[width] duration-200 ease-out`).

### Finding: Collapse-toggle hover state uses manual `onMouseEnter/Leave` instead of CSS `:hover`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/sidebar.tsx:96-109`
- **Current**: `onMouseEnter={() => setToggleHovered(true)}` drives React state to change inline style — pure re-render cost for a cosmetic hover, and creates a 1-frame delay.
- **Fix**: Replace with a Tailwind group-hover or plain CSS: `className="group flex items-center ... hover:bg-white/[0.08] hover:border-white/[0.15] border border-white/[0.08] bg-white/[0.04] transition-colors"`. Drop the `toggleHovered` state entirely. Admin sidebar at `admin-sidebar.tsx:109-120` avoids this — the tenant sidebar should match.

### Finding: Sidebar toggle has no keyboard shortcut
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/layout/sidebar.tsx:97`
- **Current**: No `Cmd+\` / `Cmd+B` shortcut to collapse/expand.
- **Fix**: Add `useEffect` mirroring the `Cmd+K` pattern in `command-search.tsx:57-66`: listen for `Cmd+\` (VS Code convention) or `Cmd+B` and call `toggle()`. Update `title` attribute (line 106) to show shortcut hint, e.g. `title={\`${collapsed ? "Expand" : "Collapse"} sidebar (⌘\\)\`}`.

### Finding: Sidebar header has no link back to dashboard
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/sidebar.tsx:54-82`
- **Current**: The tenant header (logo + tenant name + "PGL") is a static `<div>`. Convention in luxury products (Linear, Height, Arc) is that clicking the logo returns you to dashboard.
- **Fix**: Wrap the whole header in `<Link href={\`/${orgId}\`}>` with `className="... cursor-pointer hover:bg-white/[0.02] transition-colors rounded-[8px]"`. Same gap on `admin-sidebar.tsx:40-62` — link to `/admin`.

---

## Nav Items (`src/components/layout/nav-items.tsx`)

### Finding: Active nav item has no left gold indicator
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/components/layout/nav-items.tsx:67-83`
- **Current**:
  ```
  style={isActive ? { background: "var(--gold-bg)", color: "var(--gold-primary)" } : { color: "var(--text-secondary-ds)" }}
  ```
  Active state is a gold tint only. Users scanning the rail don't see where they are at a glance — the admin-section-heading utility (`globals.css:452-466`) already demonstrates the gold-bar-on-left pattern the brand uses.
- **Fix**: Add a left accent pill. Make the Link `relative` and when `isActive`, render `<span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--gold-primary)]" aria-hidden />`. This matches the `admin-section-heading::before` pattern and is a small but luxury-positioning signal.

### Finding: "Saved Searches" and "Team" both use the `Users` icon
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/nav-items.tsx:36, 41`
- **Current**:
  ```
  { label: "Saved Searches",  href: "/personas",  icon: Users, ... },
  { label: "Team",            href: "/team",      icon: Users, ... },
  ```
  Visually ambiguous in collapsed sidebar where only the icon is visible (line 85-86 `{!collapsed && item.label}`) — user can't distinguish "Saved Searches" from "Team".
- **Fix**: Swap "Saved Searches" to `Bookmark` (already imported in `command-search.tsx:6`, and it's how saved searches render in that palette — consistent cross-surface). Keep `Users` for Team.

### Finding: Nav hover state uses a Tailwind arbitrary class only for non-active items
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/nav-items.tsx:71-73`
- **Current**:
  ```
  className={`... transition-all duration-200 ... ${!isActive ? " hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--text-primary-ds)]" : ""}`}
  ```
  `transition-all` is overbroad (touches every animatable property), and the hover uses hard-coded `rgba(255,255,255,0.02)` instead of the `--bg-elevated` token.
- **Fix**: Narrow to `transition-[background-color,color]` and replace the hover values with the existing `ghost-hover` utility (globals.css:293-295): `className={cn("... ghost-hover", isActive && "...")}`. Drops the conditional string and reuses tokens.

### Finding: Active state swap has zero transition between routes
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/layout/nav-items.tsx:67-73`
- **Current**: When pathname changes, `isActive` toggles and the inline `style` swaps colors instantly. `transition-all duration-200` on the Link would normally cover it, but because colors go from inline-style to inline-style, the transition is honored only on the CSS cascade — Safari/Chrome handle it, but there's no highlight-travel animation (linear.app uses a sliding active indicator).
- **Fix**: Combined with the left accent pill (above), animate the pill with `layoutId` via `framer-motion` if installed, or simpler: add `transition-opacity` + always render the pill with `opacity: isActive ? 1 : 0`. The fade feels intentional.

---

## Top Bar (`src/components/layout/top-bar.tsx`)

### Finding: Notification bell has no unread indicator and is currently non-functional
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/top-bar.tsx:28-46`
- **Current**: Bell button has `aria-label="Notifications"` but no onClick — it's a dead affordance. Users will click it and nothing happens. No dropdown, no count badge.
- **Fix**: Until notifications ship, either (a) remove the button entirely, or (b) wire it to a minimal "no notifications yet" Popover using existing primitives. Leaving a dead button in the chrome reads as unfinished. Simplest polish fix: add `disabled` + `title="Notifications — coming soon"` and dim further (`opacity: 0.5`).

### Finding: Bell hover uses manual inline-style mutation (same anti-pattern as sidebar toggle)
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/top-bar.tsx:36-43`
- **Current**: `onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; ...}}` — imperative DOM mutation that Tailwind handles via `hover:` selectors for free.
- **Fix**: Replace with `className="... border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary-ds)] hover:text-[var(--text-primary-ds)] transition-colors duration-200"`. Drops 8 lines.

### Finding: No breadcrumbs in the top bar — user loses context on deep pages
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/top-bar.tsx:23-25`
- **Current**: Left side of top bar is only the CommandSearch. A `Breadcrumbs` component already exists at `src/components/ui/breadcrumbs.tsx` with gold-tint hover, but it's never mounted in the shell — pages likely import it ad-hoc. On `/{orgId}/prospects/{id}` the user has no "< Back to Lists" trail.
- **Fix**: The task brief mentions breadcrumbs as a checkpoint. The existing Breadcrumbs primitive is stylistically correct. Either mount a server-rendered breadcrumb slot in the TopBar (requires data plumbing — may be out of "polish only" scope) or confirm per-page adoption via a separate audit. **Polish-only action**: Document that the breadcrumb primitive exists and is unused in the shell; leave the architectural choice to a future phase.

### Finding: Avatar has `cursor-pointer` but no click target
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/top-bar.tsx:48-62`
- **Current**: `<div className="... cursor-pointer" title={userName}>` — looks clickable (pointer cursor), but it's a `<div>` with no handler. Should open user menu / settings.
- **Fix**: Either (a) remove `cursor-pointer` until a menu exists, or (b) wrap in `<Link href={\`/${orgId}/settings\`}>` so at least clicking jumps to account settings. The pointer-but-no-action state is a trust break.

### Finding: Top bar mounted only at `lg` breakpoint (no mobile equivalent for search)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/top-bar.tsx:16`
- **Current**: `className="sticky top-0 z-20 hidden lg:flex h-14 ..."` — on mobile, the user has `MobileHeader` (tenant name only) and `MobileBottomNav` but no way to invoke search. Cmd+K is desktop-only.
- **Fix**: Add a Search icon button to `MobileHeader` (`src/components/layout/mobile-sidebar.tsx:56-67`) that opens the same CommandSearch dialog. The dialog itself already works on mobile via Radix.

---

## Command Palette (`src/components/layout/command-search.tsx`)

### Finding: Dialog open animation uses `slide-in-from-left-1/2` which is contradictory
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/layout/command-search.tsx:270`
- **Current**: `data-[state=open]:slide-in-from-left-1/2` combined with `zoom-in-95` and `fade-in-0` — the palette is horizontally centered with `left-1/2 -translate-x-1/2`; sliding from the left-1/2 side while also zooming causes a slight skew animation.
- **Fix**: Remove both `slide-in-from-left-1/2` and `slide-out-to-left-1/2`. Keep `zoom-in-95 fade-in-0` for a clean scale-up. This also matches the `dialog.tsx:41` pattern but more restrained (the dialog one slides from top-48% which is appropriate for a centered modal; a command palette should just fade-scale).

### Finding: Dialog content has no Esc-affordance hint on the footer for desktop nor explicit close button
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: already polished
- **File**: `src/components/layout/command-search.tsx:320-323`
- **Current**: Footer hint shows `↑↓ navigate | Enter open | Esc close` — this IS polished. Radix closes on Esc by default. **No action needed.**

### Finding: Input has focus delay of 50ms — jittery on fast keypresses
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/command-search.tsx:70-72`
- **Current**: `setTimeout(() => inputRef.current?.focus(), 50);` — the 50ms is there because Radix animates `data-[state=open]` in and pre-animation focus can be consumed. But 50ms is still perceivable; users who Cmd+K+type fast lose keystrokes.
- **Fix**: Use Radix's `onOpenAutoFocus` handler on `DialogPrimitive.Content` instead of `setTimeout`. Pattern: `onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}`. This runs synchronously after the Radix focus-trap is set up and avoids dropped keys.

### Finding: Admin shell gets a STATIC non-functional CommandSearch (no Cmd+K works in /admin)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/layout/command-search.tsx:332-363`
- **Current**:
  ```tsx
  if (!orgId) {
    // Admin layout — render static placeholder (no hooks called)
    return (<div>...Search... Cmd+K kbd</div>);
  }
  ```
  Admin users see a search bar with a `Cmd+K` hint, but pressing Cmd+K literally does nothing — the listener isn't registered. The placeholder text "Search..." implies functionality.
- **Fix**: Either (a) change placeholder to read "Search unavailable" or (b) hide the entire bar in admin via conditional in `TopBar` and remove the `Cmd+K` kbd. Showing a shortcut hint for a dead control is a luxury-positioning violation.

### Finding: Search results highlight uses gold-tint on `idx === activeIndex` but no gold-edge focus ring
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/command-search.tsx:195-204`
- **Current**: Active result has background `rgba(212,175,55,0.08)` — subtle but consistent. No `focus-visible` ring on the button itself, though.
- **Fix**: Add `focus-visible:ring-1 focus-visible:ring-[var(--border-gold)] focus-visible:ring-inset focus:outline-none` to the item button. When users tab (not arrow) into the list, they'll see a ring.

### Finding: Search trigger `<div role="button">` is an anti-pattern
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/command-search.tsx:227-237`
- **Current**:
  ```tsx
  <div className="... cursor-pointer" role="button" tabIndex={0} onKeyDown={...}>
  ```
  Inside a Radix `Trigger asChild` — this works but swallows the native button semantics Radix wants. Screen readers may not announce it as a trigger consistently.
- **Fix**: Use a real `<button type="button">` with `className="... text-left w-full max-w-[320px] cursor-pointer"` and drop the manual `onKeyDown` — Radix Trigger handles Enter/Space on actual buttons.

---

## Toasts (`src/components/ui/toaster.tsx` + `toast.tsx` + `use-toast.ts`)

### Finding: Toast is out-of-the-box shadcn styling — generic, not luxury-positioned
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/toast.tsx:27-41`
- **Current**:
  ```
  "... border bg-background text-foreground ..."
  variants.destructive: "destructive group border-destructive bg-destructive text-destructive-foreground"
  ```
  No gold accent, no `bg-[var(--bg-floating)]`, no serif title, no shadow beyond `shadow-lg`. Default toast looks identical to every shadcn demo on the internet.
- **Fix**: Update the `default` variant to match the floating-surface system:
  ```
  default: "border bg-[var(--bg-floating-elevated)] border-[var(--border-default)] text-[var(--text-primary-ds)] shadow-[var(--shadow-lg)]"
  ```
  Give `ToastTitle` (`toast.tsx:91-100`) a `font-serif font-semibold tracking-[0.015em]` class so it reads like the rest of the brand. Add a gold left-accent bar for the success/info implicit variant (optional — `before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[var(--gold-primary)] before:rounded-r`). Also update the `destructive` variant to use `--destructive` tokens directly rather than Tailwind shortcuts so the dark-mode oklch values apply.

### Finding: Toasts slide in from top on mobile (viewport `top-0`) then reverse to bottom on desktop
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/ui/toast.tsx:12-23`
- **Current**: `className="fixed top-0 ... sm:bottom-0 sm:right-0 sm:top-auto ..."` + `slide-in-from-top-full` (mobile) vs `sm:slide-in-from-bottom-full` (desktop). The mobile top-slide behind a `pb-safe` mobile bottom nav means toasts briefly overlap the mobile header.
- **Fix**: Change mobile to also bottom-anchored, above the bottom nav. Update viewport to `"fixed bottom-0 z-[100] flex max-h-screen w-full flex-col p-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:right-0 sm:p-4 sm:pb-4 md:max-w-[420px]"` and swap `slide-in-from-top-full` → `slide-in-from-bottom-full` on the Toast root. Consistent direction feels intentional.

### Finding: TOAST_REMOVE_DELAY = 1_000_000ms (16 minutes!) — toasts never auto-dismiss
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/hooks/use-toast.ts:12`
- **Current**: `const TOAST_REMOVE_DELAY = 1000000` — default shadcn leftover. Toasts stack and persist across navigation. User-reported stale toasts are inevitable.
- **Fix**: Drop to `5000` (5s) for normal, and set `TOAST_LIMIT = 3` instead of 1. The current limit of 1 means rapid consecutive operations lose feedback (e.g. "Enrich 5 prospects" fires 5 toasts, user sees the last one only). Radix Toast has built-in `duration` per-toast — expose it in the `toast()` helper signature.

### Finding: Toast close button `X` icon is opacity-0 until hover — no always-visible dismiss
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/toast.tsx:79-83`
- **Current**: `"absolute right-1 top-1 ... opacity-0 ... group-hover:opacity-100"` — hidden by default, only reveals on hover. On touch devices (no hover), users can't dismiss a toast except by waiting for auto-dismiss (which currently is 16 min — see above).
- **Fix**: Change `opacity-0` → `opacity-60 hover:opacity-100` so touch users see and can tap.

---

## Modals / Sheets (`src/components/ui/dialog.tsx` + `sheet.tsx`)

### Finding: Dialog close button padding-box is only 28x28px (2-unit square + 20px icon)
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/dialog.tsx:48`
- **Current**: `className="absolute right-3 top-3 rounded-md p-2 opacity-70 ..."` — `p-2` + `h-5 w-5` icon = ~36px tap target. Just under the 44px iOS guideline.
- **Fix**: Bump to `p-2.5` (40px) and `right-2 top-2` for a touch-friendly hit area. Already luxury-correct on the hover state — just size.

### Finding: Sheet uses default `p-6` but mobile bottom sheets in MobileBottomNav override with `p-0`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: already polished
- **File**: `src/components/ui/sheet.tsx:33, 59` + `src/components/layout/mobile-bottom-nav.tsx:218, 261`
- **Current**: Sheet base has `bg-background p-6` which is then overridden by consumers. The mobile sheets override `p-0` and `[&>button:first-child]:hidden` (to hide the default close X). **This is intentional and polished — the bottom sheets use drag handles instead of an X.**
- **Fix**: No action. Optionally, extract a `<DragHandle />` primitive so both sheets in `mobile-bottom-nav.tsx:223-228` and `265-271` share one component.

### Finding: Dialog content width on mobile is `w-[calc(100%-2rem)]` but Sheet bottom is full-width
- **Tag**: already polished — intentional separation
- **File**: `src/components/ui/dialog.tsx:41`
- **Current**: **No action.** Correct.

### Finding: Sheet Content has no drop-shadow glow for luxury feel
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/ui/sheet.tsx:33`
- **Current**: `"fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out ..."` — plain `shadow-lg`. Compare to `dialog.tsx:41` which uses `shadow-2xl` and `background: var(--bg-floating)`.
- **Fix**: Update Sheet base to `"fixed z-50 gap-4 p-6 shadow-2xl ..."` with `style={{ background: "var(--bg-floating)", border: "1px solid var(--border-default)" }}`. Unifies with Dialog.

### Finding: Dialog/Sheet overlay is `bg-black/70` — no backdrop blur
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/ui/dialog.tsx:24` and `src/components/ui/sheet.tsx:24`
- **Current**: Solid 70% black overlay. MobileBottomNav top bar uses `backdrop-filter: blur(12px)` — the rest of the shell is blur-aware but modal overlays aren't.
- **Fix**: Add `backdrop-blur-sm` to both overlays: `"fixed inset-0 z-50 bg-black/60 backdrop-blur-sm ..."`. The small blur reads as luxury without a frame-rate cost.

---

## Tooltip (`src/components/ui/tooltip.tsx`)

### Finding: Tooltip uses `bg-primary` — on dark mode that's the tan/beige token, not gold, not floating-dark
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/tooltip.tsx:22-24`
- **Current**: `"... rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground ..."` — in dark mode `--primary` is `oklch(0.7392 0.0579 66.7290)` (a tan/beige), which looks out-of-place against the near-black UI and clashes with gold accents. Dark tooltips should be `--bg-floating-elevated` with a subtle gold border.
- **Fix**:
  ```
  "... rounded-[8px] bg-[var(--bg-floating-elevated)] border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-primary-ds)] shadow-[var(--shadow-md)] ..."
  ```

### Finding: No `TooltipProvider` mounted at the root — every consumer has to wrap their own
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/layout.tsx:40-58` (absent)
- **Current**: `TooltipProvider` only appears in 2 feature files and `tooltip.tsx`. Consumers that forget to wrap get no tooltip, silently.
- **Fix**: Mount `<TooltipProvider delayDuration={250} skipDelayDuration={500}>` in `src/app/layout.tsx` around `{children}`. The 250ms delay is the luxury-feel sweet spot (Radix default is 700ms — too slow; 0ms — too trigger-happy).

---

## Dropdown Menu (`src/components/ui/dropdown-menu.tsx`)

### Finding: DropdownMenu Content uses `bg-popover text-popover-foreground` — on dark mode the popover token is `#2c2a27`-ish, not the brand `--bg-floating`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/dropdown-menu.tsx:67-72`
- **Current**:
  ```
  "z-50 ... overflow-y-auto ... rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
  ```
  `bg-popover` is `oklch(0.2583 0.0071 67.5039)` — a muted neutral, not the branded `--bg-floating` `#141416`. Dialogs/toasts use `#141416`. Dropdowns should too.
- **Fix**: Replace `bg-popover text-popover-foreground` with explicit `bg-[var(--bg-floating)] text-[var(--text-primary-ds)] border-[var(--border-default)]`. Bump `shadow-md` to `shadow-[var(--shadow-lg)]`. Same fix for `SubContent` at line 50.

### Finding: DropdownMenuItem hover uses `focus:bg-accent focus:text-accent-foreground` — generic Radix default
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/dropdown-menu.tsx:87`
- **Current**: `"... focus:bg-accent focus:text-accent-foreground ..."` — `--accent` is the neutral hover. No gold tint on focus/hover.
- **Fix**: Swap to `"... focus:bg-[var(--gold-bg)] focus:text-[var(--gold-primary)] hover:bg-[var(--gold-bg)] hover:text-[var(--gold-primary)] ..."`. Matches the sidebar active state and the command palette.

### Finding: Radii use `rounded-md` (8px) in dropdown, but tenant sidebar nav uses `rounded-[8px]`
- **Tag**: already consistent (rounded-md = 8px with default tailwind)
- **File**: `src/components/ui/dropdown-menu.tsx:68`
- **Current**: `rounded-md` = 8px via default Tailwind scale. `--radius` is 1rem = 16px, but `md: calc(var(--radius) - 2px)` = 14px. Tailwind's `rounded-md` does NOT use the custom `--radius` token in this project because the `borderRadius.md` token is defined in `tailwind.config.ts:99` as `calc(var(--radius) - 2px)` = 14px.
- **Fix**: Use `rounded-[8px]` explicitly or define a `sm` override. **Sanity-check: Tailwind default `rounded-md` is 6px, but this project overrides `md` to 14px.** So `dropdown-menu.tsx` is currently rendering with 14px radius — NOT matching the 8px sidebar nav or 8px buttons. Change to `rounded-[8px]`.

---

## Empty State (`src/components/ui/empty-state.tsx`)

### Finding: Empty state looks polished
- **Tag**: already polished
- **File**: `src/components/ui/empty-state.tsx`
- **Current**: Uses `surface-card`, serif title, gold-bg icon halo, error variant, children slot for CTAs. Well-composed.
- **Fix**: No action needed. (Optional flourish: add `animate-in fade-in-50 slide-in-from-bottom-2 duration-500` to the root div so empty states gracefully materialize rather than appearing abruptly after data resolves.)

---

## Confirmation (`src/components/ui/confirmation.tsx`)

### Finding: Destructive confirmation uses raw `rgba()` literals instead of `--destructive` tokens
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/confirmation.tsx:38-41, 86-90`
- **Current**:
  ```
  isDestructive && "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)]"
  variant === "destructive" && "bg-[rgba(239,68,68,0.12)] text-red-400"
  ```
  Hardcoded red. The theme has `--destructive` in oklch that adapts per tenant theme.
- **Fix**: Replace with `border-destructive/20 bg-destructive/[0.03]` and `bg-destructive/10 text-destructive`. Uses the Tailwind token already wired.

### Finding: Confirmation is an inline card, not a modal — correct pattern for its use-case, but AlertDialog primitive missing
- **Tag**: already polished for inline-use / [MICRO-IMPROVEMENT] gap for modal destructive flows
- **File**: `src/components/ui/confirmation.tsx`
- **Current**: This file is an inline confirmation (appears in a card). No `AlertDialog` primitive exists for modal destructive actions like "Delete Tenant" or "Wipe Leads". Consumers likely hand-roll them with the `Dialog` primitive.
- **Fix**: Scope-wise, just acknowledge: an `AlertDialog` (Radix provides `@radix-ui/react-alert-dialog`) styled with the destructive-red gradient border and serif title would close this gap. Deferrable to a follow-up phase.

---

## Loader / Shimmer / Skeleton

### Finding: Three primitives for loading — risk of inconsistent usage
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium (guidance, not broken)
- **File**: `src/components/ui/loader.tsx`, `shimmer.tsx`, `skeleton.tsx`
- **Current**: `Skeleton` uses `.shimmer-skeleton` class (correct gold-tinted shimmer). `Shimmer*` uses `animate-pulse` on `bg-[rgba(255,255,255,0.06)]` — NO shimmer gradient; just opacity pulse. `Loader` spinner is gold-bordered. Three primitives for overlapping needs.
- **Fix**: Unify: have `ShimmerLine` and `ShimmerBlock` (currently `animate-pulse`) add the `shimmer-skeleton` class from `globals.css:491-495` so they get the branded gold-tint moving gradient. Right now `Shimmer*` primitives read as half-done.

### Finding: Spinner uses `border-t-[rgba(212,175,55,0.7)]` inline rgba instead of gold token
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/loader.tsx:33`
- **Current**: `border-t-[rgba(212,175,55,0.7)]`
- **Fix**: `border-t-[var(--gold-text)]` (which is `rgba(212,175,55,0.7)`).

---

## Loading Pages (`loading.tsx`)

### Finding: Skeleton coverage only for 4 segments — most tenant routes have no loading.tsx
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: Missing: `src/app/[orgId]/search/loading.tsx`, `src/app/[orgId]/personas/loading.tsx`, `src/app/[orgId]/team/loading.tsx`, `src/app/[orgId]/settings/loading.tsx`, `src/app/[orgId]/prospects/[id]/loading.tsx`
- **Current**: Only `exports`, `lists`, `dashboard/activity`, `dashboard/analytics` have per-segment `loading.tsx`. The tenant root has a generic one. Hot routes like `/search` and `/personas` fall back to the root loading (which renders a dashboard-shaped skeleton — wrong shape).
- **Fix**: Add `loading.tsx` to the 5 segments above, each with shape-appropriate skeletons (e.g. `search/loading.tsx` should show a filter rail + results table skeleton using `ShimmerBlock`). High-leverage polish.

### Finding: Admin loading uses skeleton row + title only — no sidebar/chrome skeleton
- **Tag**: already polished
- **File**: `src/app/admin/loading.tsx`
- **Current**: Shell remains (sidebar persists), content swaps to skeleton. Correct Next.js App Router behavior.
- **Fix**: No action.

---

## Error Pages (`error.tsx`, `global-error.tsx`)

### Finding: Tenant and admin `error.tsx` are near-identical — deduplicate
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/[orgId]/error.tsx`, `src/app/admin/error.tsx`
- **Current**: Both show serif title + message + gold "Try Again" button. Admin version omits the `max-w-md` constraint and the fallback message. Minor divergence.
- **Fix**: Extract a `<ErrorPanel title description onReset />` component (reuses `EmptyState variant="error"` — which already exists!). Both `error.tsx` files become 6-line wrappers. Also add the `error.digest` Error ID display that `global-error.tsx:22-25` shows — currently only visible on catastrophic errors.

### Finding: Global error page uses `font-bold` instead of `font-semibold` for the serif title
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/global-error.tsx:15-17`
- **Current**: `<h2 className="font-serif text-3xl font-bold">` — the Cormorant Garamond serif is loaded only at weights 400-700. The rest of the app uses `font-semibold` (600) on serif headings (see `dialog.tsx:92`, `empty-state.tsx:49`). Mixed weights feel unintentional.
- **Fix**: Change to `font-semibold`.

### Finding: No `not-found.tsx` anywhere
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: Missing: `src/app/not-found.tsx`, `src/app/[orgId]/not-found.tsx`
- **Current**: `[orgId]/layout.tsx:46` calls `notFound()` when tenant is missing — but there's no custom `not-found.tsx`, so users see Next.js's dev-default or blank prod page. Luxury positioning violation.
- **Fix**: Create `src/app/not-found.tsx` with the same chrome-less layout as `global-error.tsx`, serif "404", subdued body, gold "Return home" button pointing to `/`. Optionally also `src/app/[orgId]/not-found.tsx` that preserves the sidebar and shows "Page not found in {tenantName}".

---

## Keyboard Affordances

### Finding: No Enter-to-submit on the CommandSearch input when there's only ONE result
- **Tag**: already polished
- **File**: `src/components/layout/command-search.tsx:130-133`
- **Current**: Enter navigates to `activeIndex` which defaults to 0. Works with one result. **Polished.**
- **Fix**: No action.

### Finding: Focus-visible rings are inconsistent across primitives
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/components/ui/button.tsx:8` uses `focus-visible:ring-1 focus-visible:ring-ring`. `sheet.tsx:67` uses `focus:ring-2 focus:ring-ring`. `dialog.tsx:48` uses `focus:ring-2 focus:ring-ring`. `toast.tsx:65` uses `focus:ring-1 focus:ring-ring`. Nav-items, top-bar bell, breadcrumbs, empty-state — NONE have explicit focus-visible rings (relying on browser default).
- **Fix**: Define one token in `globals.css`: `.focus-ring-gold { @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-root)]; }`. Apply to nav-items Link, top-bar buttons, breadcrumb Links, command-palette result buttons. One consistent gold ring everywhere.

### Finding: Tab order is logical, but modal focus-trap is Radix-default (correct)
- **Tag**: already polished
- **Fix**: No action.

### Finding: No `Cmd+K` hint in the UI for admin users
- **Tag**: duplicate of "Admin shell gets a STATIC non-functional CommandSearch" above.
- **Fix**: see above.

---

## Mobile / Responsive

### Finding: Tenant mobile has NO hamburger drawer — only bottom nav + 5 "More" items
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/layout/mobile-sidebar.tsx` (just a header) vs `src/components/layout/mobile-bottom-nav.tsx` (bottom + More sheet)
- **Current**: Admin has a hamburger-drawer pattern (`admin-mobile-sidebar.tsx` uses Sheet side=left). Tenant has bottom-tabs with a "More" bottom-sheet. **The two mobile UX models feel like different products.**
- **Fix**: This is an architectural decision, not polish — leave it. But at minimum, ensure the "More" sheet on tenant mobile has the same full nav list as desktop (currently: Lists, Exports, Activity, Analytics, Team). Check: yes, parity is there. **No polish action; flag for design review.**

### Finding: MobileBottomNav `+` quick-action button doesn't match the tab style (circle outline vs pill)
- **Tag**: already polished — intentional design choice
- **File**: `src/components/layout/mobile-bottom-nav.tsx:178-187`
- **Current**: `+` button is a circle-bordered FAB-style distinct from the tab buttons. This is an intentional distinction (elevated action).
- **Fix**: No action.

### Finding: Mobile bottom sheets don't support drag-to-dismiss
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/components/layout/mobile-bottom-nav.tsx:215, 258`
- **Current**: Drag handle is rendered (line 223-228, 267-271) but Radix Sheet doesn't wire it to a drag-dismiss gesture — the handle is purely visual. Users see a handle, try to drag, nothing happens.
- **Fix**: Either (a) remove the fake handle and rely on overlay-tap to dismiss, or (b) wire `@radix-ui/react-dialog` with a `vaul` drawer underneath. (b) is arguably beyond polish scope; (a) is quick.

---

## Page Transitions

### Finding: `page-enter` animation is applied on every route inside `<main>` — good, but it re-triggers on every navigation
- **Tag**: already polished
- **File**: `src/app/[orgId]/layout.tsx:108`, `src/app/admin/layout.tsx:35`
- **Current**: `<div className="page-enter p-4 md:p-6 pb-20 lg:pb-6">` — 400ms fadeIn every navigation. Consistent across tenant + admin.
- **Fix**: No action. Note: there's no `<AnimatePresence>` exit animation (pages snap out, fade in). This is acceptable for App Router because the fade-in is the dominant perception. Adding exit animations requires a Client-side router shim — out of polish scope.

### Finding: Sidebar persists during route changes but doesn't highlight the upcoming route with any pending state
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/layout/nav-items.tsx:67`
- **Current**: Click sidebar item → `isActive` is still the OLD route until the new URL commits (which can be 200-500ms on slow networks). User sees no immediate feedback.
- **Fix**: Use Next.js's `useLinkStatus()` (available in Next 14.1+) or track the optimistic clicked href in local state. When clicked, apply a subtle `opacity: 0.6` to the old active item and full gold to the target. Small but premium.

---

## Cross-Role Consistency (Tenant vs Admin)

### Finding: Admin and tenant shells diverge in SEVEN visible ways
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **Files**: see comparison below
- **Current**:
  1. Tenant sidebar border: `"1px solid var(--border-sidebar)"` + `boxShadow: "4px 0 24px rgba(0,0,0,0.3)"` (`sidebar.tsx:49-50`). Admin sidebar: same border, NO boxShadow (`admin-sidebar.tsx:37`).
  2. Tenant sidebar header: tenant logo `rounded-lg` 40x40, brand name + "PGL" eyebrow (`sidebar.tsx:54-82`). Admin sidebar header: "P" initial in a `rounded-full` 36x36, "PGL / Admin Console" (`admin-sidebar.tsx:40-62`). Different shape, different size.
  3. Tenant sidebar footer: `"Phronesis v1.0"` (`sidebar.tsx:92`). Admin sidebar footer: user card + `"Admin Console"` label (`admin-sidebar.tsx:71-107`). User card exists on admin but NOT tenant.
  4. Tenant mobile: bottom-nav + top-header (no drawer). Admin mobile: top hamburger + left drawer.
  5. Tenant uses `NavItems` component (reusable). Admin uses `AdminNavLinks` (separate file) with section headers "Platform Control" / "System Config" + stub links. Different component tree even though active-state styling is identical.
  6. Admin sidebar transition: `transition-all duration-200` (`admin-sidebar.tsx:32`). Tenant: `transition-[width] duration-200 ease-in-out` (`sidebar.tsx:45`). Different properties animated.
  7. Tenant nav uses `inline style={{ background: "var(--gold-bg)" }}` for active. Admin nav uses identical style. **This is the consistent bit.**
- **Fix**: The asymmetries communicate "the admin experience is a separate product." Three concrete fixes:
  - **Add a user card to the tenant sidebar footer** (mirror admin-sidebar.tsx:71-107), replacing the bare "Phronesis v1.0". Users would appreciate seeing who they're logged in as.
  - **Unify the sidebar header shape**: both should be 40x40 `rounded-lg` with tenant logo (or admin "PGL" mark). Pick one.
  - **Factor `NavItems`** into a shared primitive that takes a `sections: NavSection[]` prop, then both `NavItems` and `AdminNavLinks` become thin config wrappers. Bigger refactor — deferrable.

### Finding: Tenant sidebar active state has gold-bg + gold text; admin matches. Correct.
- **Tag**: already polished
- **Fix**: No action.

---

## Top 10 impact-to-effort picks

Ranked by (luxury-positioning impact) / (implementation effort).

1. **Fix `TOAST_REMOVE_DELAY` from 1,000,000ms → 5,000ms and bump `TOAST_LIMIT` from 1 to 3** — `src/hooks/use-toast.ts:11-12`. One-line change. Biggest perceived-quality win; eliminates the "toasts haunt my screen" bug and lets users see multiple async completions. [Significant]
2. **Restyle the default toast to use `--bg-floating-elevated`, serif title, and brand shadow** — `src/components/ui/toast.tsx:27-41, 91-100`. Current toasts look like shadcn demos. ~8 line diff. Huge brand-consistency uplift. [Significant]
3. **Add `not-found.tsx` at `src/app/not-found.tsx`** — brand-match the `global-error.tsx` pattern with serif "404" and gold CTA. Fills a developer-default gap that prospects WILL hit. [Significant]
4. **Mount `<TooltipProvider delayDuration={250}>` in `src/app/layout.tsx`** — fixes silent tooltip failures across the app. 2-line change. [Medium]
5. **Recolor Tooltip to `--bg-floating-elevated` + remove `bg-primary`** — `src/components/ui/tooltip.tsx:22-24`. Current tan tooltip reads as "generic web app". [Medium]
6. **Recolor DropdownMenu Content to `--bg-floating` and active item to gold** — `src/components/ui/dropdown-menu.tsx:67-87`. Removes the generic Radix neutral-popover look. [Medium]
7. **Fix admin CommandSearch placeholder to not show a non-functional `Cmd+K` hint** — `src/components/layout/command-search.tsx:332-362`. Either hide the widget or remove the kbd. Trust-break fix. [Medium]
8. **Add a left gold-accent pill to active nav items** — `src/components/layout/nav-items.tsx:66-84` + `admin-nav-links.tsx:77-123`. Mirrors `.admin-section-heading::before`. Small CSS, big scan-ability boost. [Medium]
9. **Add `loading.tsx` to `/search`, `/personas`, `/prospects/[id]`, `/settings`, `/team`** — shape-appropriate skeletons. Current fallback is a dashboard skeleton (wrong shape). Reduces perceived latency by ~200ms. [Medium]
10. **Swap `Users` icon on "Saved Searches" to `Bookmark` so it's distinguishable from "Team" when collapsed** — `src/components/layout/nav-items.tsx:36`. One-character change. Fixes a real ambiguity. [Quick-win]

Honorable mention (#11): Wrap the sidebar tenant-header in `<Link href={/orgId}>` — industry-standard affordance, 2-line change.

Honorable mention (#12): Unify dialog/sheet overlays with `backdrop-blur-sm` — 1-class change in 2 files, adds luxury depth.
