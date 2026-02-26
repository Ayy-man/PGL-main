# Phase 5: UI Revamp — Apply Design System - Research

**Researched:** 2026-02-26
**Domain:** CSS custom properties, Next.js font loading, Tailwind token migration, shadcn/ui theming, component refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Color System
- All colors defined as CSS custom properties in globals.css
- Components use Tailwind token classes only — never raw Tailwind colors or inline hex/rgba
- Replace all `zinc-*`, `gray-*`, `emerald-*`, `yellow-*` with CSS variable tokens
- Background: `--bg-root: #08080a` (near-black), surfaces use gradient overlays, never flat solid colors
- Gold accent: `--gold-primary: #d4af37` — for emphasis and wealth signals, do not overuse
- Text hierarchy: `--text-primary: #e8e4dc`, secondary at 50% opacity, tertiary at 40%, muted at 25%
- All new colors must be CSS variables first, then mapped in tailwind.config.ts

#### Typography
- Headings (h1-h3, card titles): Cormorant Garamond (`font-serif`), loaded via Google Fonts
- Body/UI (buttons, labels, nav, forms): DM Sans (`font-sans`)
- Code/Data: JetBrains Mono (`font-mono`)
- Type scale: h1=38px/500, h2=34px/500, h3=22px/600, body=13px/400, caption=12px, label=11px uppercase
- Cormorant Garamond is for h1/h2/h3/card titles ONLY — never for body, labels, or buttons

#### Surface Treatment
- Every card/panel uses `--bg-card` gradient at rest, transitions to `--bg-card-hover` on hover
- Borders: `--border-subtle` at rest, `--border-hover` (gold-tinted) on hover
- Never flat solid color for any surface — always gradient or transparent overlay
- Elevated surfaces (popovers, dropdowns) use `--bg-elevated` with backdrop blur

#### Border Radius
- Cards/panels: 14px
- Buttons/inputs: 8px
- Badges/pills: 20px (fully rounded)
- Avatars: 50%

#### Interaction States
- Two button variants: Ghost (secondary) and Gold (primary)
- All interactive elements: `transition: all 0.2s ease`, never exceed 300ms
- Every clickable element must have `cursor-pointer`
- Focus states: visible ring on all focusable elements, gold-tinted for inputs

#### Sidebar (220px)
- Gradient background, gold accent line on right edge
- Team header: 36px icon with gold gradient
- Nav items: 8px radius, active = gold bg + text + left-border accent
- Footer: app name + version in ghost text

#### Top Bar (56px, sticky)
- Semi-transparent with backdrop blur
- Left: Command palette search (320px, Cmd+K badge)
- Right: Notification bell + user avatar dropdown

#### Icons
- Lucide React ONLY — no Heroicons, Font Awesome, or emojis
- Sizes: xs=3.5, sm=4, md=5, lg=8
- Always `shrink-0` in flex containers

#### Ambient Background
- Two fixed radial gradients (gold-tinted, very subtle) on root element
- Top-right and bottom-left positioned, pointer-events none

#### Custom Scrollbar
- 6px width, gold-tinted thumb, transparent track

#### Page Transitions
- Every page mounts with fadeIn animation (0.4s ease)

### Claude's Discretion
- Order of component refactoring (which pages first)
- How to structure the CSS variable definitions in globals.css
- Whether to create shared utility components for common patterns
- Migration strategy (big bang vs incremental per page)

### Deferred Ideas (OUT OF SCOPE)
- Full prospect profile page (P1 — build after slide-over panel is functional)
- Light mode support (explicitly out of scope — forced dark)
- Per-tenant theming (CSS variables defined but not connected to tenant config)
</user_constraints>

---

## Summary

This phase is a pure front-end refactoring effort with zero backend changes. The design system (MASTER.md + four page-specific overrides) is already fully specified — research found no gaps in design intent. The codebase is well-structured but built on a conflicting baseline: the token system in `globals.css` and `tailwind.config.ts` uses OKLCH values for shadcn-standard tokens (`--background`, `--foreground`, `--card`, etc.) while the design system spec uses new semantic variables (`--bg-root`, `--bg-card`, `--border-subtle`, `--gold-primary`) that do not yet exist. Unifying these two systems is the central engineering challenge.

The current codebase is approximately 60-70% there already. Most pages use design-system-compliant tokens (`text-gold`, `text-muted-foreground`, `bg-card`, `font-serif`). The remaining work is: (1) adding missing CSS variables to globals.css with the correct dark-mode hex values from the spec, (2) replacing the six Recharts inline hex strings and ~20 raw color class instances spread across admin components, (3) swapping Inter/Playfair Display font loading for DM Sans/Cormorant Garamond, (4) rebuilding the Search page from a data table to a card stack + persona card grid, (5) rebuilding the Lists page from a 3-column grid to a horizontal-card stack, (6) implementing the slide-over prospect panel (new component), and (7) applying ambient background, custom scrollbar, page transitions, and top bar globally.

**Primary recommendation:** Execute the migration in four waves — (1) globals.css token additions + font swap + tailwind.config.ts mappings, (2) layout shell (sidebar, top bar, ambient bg, scrollbar), (3) page-by-page component rebuilds, (4) global polish (transitions, empty states, button variants). Never touch API routes or lib/ files — pure TSX/CSS changes only.

---

## Standard Stack

### Core
| Library | Version (from package.json) | Purpose | Why Standard |
|---------|---------------------------|---------|--------------|
| Tailwind CSS | v3 (via existing config) | Utility-first CSS, CSS variable token system | Already installed, config maps vars to classes |
| next/font/google | Built into Next.js 15 | Font loading with automatic variable injection | Avoids layout shift, subsetting, display swap |
| tailwindcss-animate | Already installed | `animate-*` classes for page transitions | Already a dependency |
| Lucide React | Already installed | Icon library (only allowed source) | Already used everywhere |
| shadcn/ui (new-york style) | Already installed | Base component primitives | Already configured via components.json |
| Radix UI primitives | Already installed (via shadcn) | Dialog, Sheet, Dropdown, Select | Already powering existing components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cn` (clsx + tailwind-merge) | Already in `@/lib/utils` | Conditional class merging | Every component that takes className prop |
| Recharts | Already installed | Chart rendering — requires CSS variable workaround | Admin charts: must use `var(--gold)` in style props |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties in globals.css | Tailwind `theme()` function | CSS vars are runtime-themeable; `theme()` is build-time only. CSS vars required by the spec |
| `next/font/google` for Cormorant + DM Sans | Google Fonts `<link>` tag | `next/font` avoids FOUT, handles subsetting, injects CSS variable automatically — always prefer |
| Rebuilding components from scratch | Wrapping existing shadcn primitives | Wrap first, rebuild only if shadcn base conflicts with spec styling |

**Installation:** No new packages needed. All dependencies are already present.

---

## Architecture Patterns

### Current Codebase Structure (Relevant to This Phase)
```
src/
├── app/
│   ├── globals.css              # CSS variables (OKLCH format) — needs new tokens added
│   ├── layout.tsx               # Font loading — swap Inter/Playfair → DM Sans/Cormorant
│   ├── (auth)/layout.tsx        # Login shell — update sidebar/header styling
│   ├── [orgId]/
│   │   ├── layout.tsx           # Tenant shell — add ambient bg, top bar
│   │   ├── page.tsx             # Dashboard — update card styles, font sizes
│   │   ├── search/page.tsx      # Search — MAJOR REBUILD (table → card grid)
│   │   ├── lists/page.tsx       # Lists — UPDATE LAYOUT (grid → horizontal cards)
│   │   └── prospects/[id]/page.tsx  # Prospect profile page
│   └── admin/layout.tsx         # Admin shell — update sidebar gradient treatment
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx          # UPDATE — gradient bg, gold accent line, 220px width
│   │   ├── nav-items.tsx        # UPDATE — active left-border accent, 8px radius
│   │   └── mobile-sidebar.tsx   # UPDATE — mirrors desktop sidebar
│   ├── prospect/
│   │   └── profile-view.tsx     # UPDATE — slide-over panel layout, Cormorant name
│   └── ui/
│       ├── button.tsx           # UPDATE — add Ghost and Gold variants to CVA
│       ├── card.tsx             # UPDATE — gradient bg, 14px radius
│       ├── dialog.tsx           # UPDATE — gradient bg, Cormorant title
│       ├── empty-state.tsx      # UPDATE — 64px gold icon circle, Cormorant heading
│       └── badge.tsx            # UPDATE — 20px radius, semantic variants
```

### Pattern 1: CSS Variable Token Addition (globals.css)

**What:** Add new semantic variables to the `.dark` block without removing existing OKLCH-based shadcn tokens. The design system's new variables supplement the existing token map.

**When to use:** Any variable named in MASTER.md that does not already exist in globals.css.

**Example:**
```css
/* In globals.css — add inside .dark { } block */
/* Backgrounds (from MASTER.md Section 3) */
--bg-root: #08080a;
--bg-sidebar: linear-gradient(180deg, #0d0d10 0%, #0a0a0d 100%);
--bg-card: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
--bg-card-hover: linear-gradient(145deg, rgba(212,175,55,0.04) 0%, rgba(255,255,255,0.02) 100%);
--bg-elevated: rgba(255,255,255,0.03);
--bg-input: rgba(255,255,255,0.02);

/* Borders */
--border-subtle: rgba(255,255,255,0.05);
--border-default: rgba(255,255,255,0.06);
--border-hover: rgba(212,175,55,0.15);
--border-gold: rgba(212,175,55,0.25);
--border-sidebar: rgba(212,175,55,0.08);

/* Gold */
--gold-primary: #d4af37;
--gold-bright: #f0d060;
--gold-text: rgba(212,175,55,0.7);
--gold-muted: rgba(212,175,55,0.5);
--gold-bg: rgba(212,175,55,0.08);
--gold-bg-strong: rgba(212,175,55,0.15);

/* Text */
--text-primary: #e8e4dc;
--text-secondary: rgba(232,228,220,0.5);
--text-tertiary: rgba(232,228,220,0.4);
--text-muted: rgba(255,255,255,0.25);
--text-ghost: rgba(255,255,255,0.15);

/* Global animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: fadeIn 0.4s ease forwards; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.25); }
```

**Critical note on OKLCH vs hex:** The existing tokens (`--background`, `--foreground`, `--card`, `--border`, etc.) use OKLCH and are already mapped in tailwind.config.ts. The new design-system variables use hex/rgba. Both can coexist in the same `.dark` block — do not convert OKLCH to hex or vice versa. The Tailwind mappings for the new variables go in tailwind.config.ts under `extend.colors`.

### Pattern 2: tailwind.config.ts Extension for New Variables

**What:** Map the new CSS variables to Tailwind class names so components can use `bg-bg-card` etc.

**Example:**
```typescript
// In tailwind.config.ts — extend the existing colors object
extend: {
  colors: {
    // ... existing tokens unchanged ...
    'bg-root': 'var(--bg-root)',
    'bg-sidebar': 'var(--bg-sidebar)',
    'bg-card-hover': 'var(--bg-card-hover)',
    'bg-elevated': 'var(--bg-elevated)',
    'bg-input': 'var(--bg-input)',
    'border-subtle': 'var(--border-subtle)',
    'border-default-custom': 'var(--border-default)',  // avoid clash with Tailwind's border-default
    'border-hover': 'var(--border-hover)',
    'border-gold': 'var(--border-gold)',
    'border-sidebar': 'var(--border-sidebar)',
    'text-primary-custom': 'var(--text-primary)',      // avoid clash with text-primary
    'text-secondary-custom': 'var(--text-secondary)',
    'text-tertiary': 'var(--text-tertiary)',
    'text-ghost': 'var(--text-ghost)',
    'gold-primary': 'var(--gold-primary)',
    'gold-bright': 'var(--gold-bright)',
    'gold-text': 'var(--gold-text)',
    'gold-bg': 'var(--gold-bg)',
    'gold-bg-strong': 'var(--gold-bg-strong)',
  },
  // Also add border radius tokens for the spec values:
  borderRadius: {
    'card': '14px',
    'btn': '8px',
    'badge': '20px',
  },
  // Page transition animation:
  animation: {
    'page-enter': 'fadeIn 0.4s ease forwards',
  },
  keyframes: {
    fadeIn: {
      from: { opacity: '0', transform: 'translateY(8px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
  },
}
```

**IMPORTANT naming clash awareness:** Tailwind's `text-primary` and `text-secondary` are not Tailwind core utilities — they're user-defined. The existing tailwind.config.ts maps `primary` and `secondary` as color groups, so `text-primary` already maps to `var(--primary)` (the shadcn accent color). The design system's `--text-primary: #e8e4dc` conflicts with this. Resolution: map the design system text variables to `foreground` equivalents using the existing OKLCH `--foreground` token which is already `oklch(0.9122 0.0240 73.5976)` — visually similar to `#e8e4dc`. This avoids introducing a clash. The `--text-primary` variable is still useful for raw `style=` props in Recharts.

### Pattern 3: Font Swap in Root Layout

**What:** Replace `Inter` and `Playfair_Display` imports with `DM_Sans` and `Cormorant_Garamond`. Both fonts inject into the same CSS variables (`--font-sans`, `--font-serif`) — the downstream `font-sans` and `font-serif` Tailwind classes continue to work unchanged.

```typescript
// src/app/layout.tsx — replace existing font imports
import { DM_Sans, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Body:
className={`${dmSans.variable} ${cormorant.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
```

**Impact:** All `font-serif` classes throughout the codebase automatically render Cormorant Garamond instead of Playfair Display. No className changes needed in page files — only the font import in `layout.tsx` changes. This is the highest-leverage, lowest-blast-radius change in the entire phase.

**Note on JetBrains Mono:** It's already referenced in globals.css as `--font-mono` but not loaded in layout.tsx. Adding it closes this gap. The existing `font-mono` utility class will then work correctly.

### Pattern 4: Button Variants Extension

**What:** The design system specifies two button variants (Ghost and Gold). The current `button.tsx` uses shadcn CVA. Add `gold` variant to the cva config.

```typescript
// In src/components/ui/button.tsx — add to variants object:
variants: {
  variant: {
    // ... existing variants ...
    gold: "bg-gradient-to-r from-gold to-gold-muted text-gold-foreground border border-gold/25 hover:from-gold-muted hover:to-gold font-semibold transition-all duration-200 cursor-pointer",
    ghost: "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-foreground/60 hover:border-[rgba(255,255,255,0.15)] hover:text-foreground transition-all duration-200 cursor-pointer",
  }
}
```

**Recharts special case:** Recharts `Tooltip` contentStyle, `LabelList` style, and `Cell` fill must use raw values (no Tailwind classes) because they are JS style objects not className strings. Replace the hardcoded hex strings in `funnel-chart.tsx` with CSS variable references:
```typescript
contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
// LabelList style:
style={{ fill: "var(--muted-foreground)", fontSize: "12px" }}
style={{ fill: "var(--foreground)", fontSize: "13px", fontWeight: "600" }}
```
Note: `var()` in JS style objects works at runtime because the browser resolves CSS variables. This replaces the hardcoded `#18181b`, `#3f3f46`, `#f4f4f5`, `#a1a1aa` values.

### Pattern 5: Sidebar Gradient Implementation

**What:** The sidebar needs gradient background + gold right-edge accent line. Currently it uses `bg-card` flat color.

```tsx
// src/components/layout/sidebar.tsx
<aside
  className="hidden lg:flex h-screen flex-col sticky top-0"
  style={{
    width: "220px",
    background: "var(--bg-sidebar)",
    borderRight: "1px solid var(--border-sidebar)",
  }}
>
```

**Why `style=` for gradients:** Tailwind's `bg-gradient` utilities don't support CSS variables as gradient endpoints without v4's arbitrary support. Using inline `style` is the correct approach for gradient backgrounds that reference CSS vars. This is a known limitation of Tailwind v3.

### Pattern 6: Card Surface Treatment

**What:** Every card needs the gradient background from `--bg-card`, not the flat `bg-card` value.

**Current state:** `bg-card` resolves to `oklch(0.2583 0.0071 67.5039)` — a flat dark color, not a gradient. The spec requires `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`.

**Strategy:** Override the shadcn `Card` component's base class, or add a wrapper utility class in globals.css:
```css
/* In globals.css @layer utilities */
.surface-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.surface-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
```
Apply `.surface-card` to card containers instead of relying on the shadcn `<Card>` component's default background. The shadcn `Card` can still be used as a structural wrapper, but its `bg-card` className should be overridden.

### Pattern 7: Search Page — Persona Card Grid (Major Rebuild)

**What:** The search page currently shows a persona dropdown selector + data table. The design system replaces this with a card grid for persona selection and a vertical card stack for results.

**Current:** `persona-selector.tsx` uses a `<Select>` dropdown. `search-results-table.tsx` uses the reusable `<DataTable>`.

**Target:**
- Persona selection: `grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`, gap 20px. Each card: `--bg-card` gradient, 14px radius, 28px padding, gold corner accent, Cormorant name at 22px/600.
- Results: Vertical flex stack with 12px gap. Each prospect card: flex row, 48px avatar, Cormorant name, contact icon circles (28px), wealth tier badge.

**File impact:** The existing `search-results-table.tsx` is replaced (not deleted — table logic remains useful for other pages). New files: `persona-card.tsx`, `prospect-result-card.tsx`, `wealth-tier-badge.tsx`. The `search-content.tsx` orchestrator updates to render cards instead of the table.

### Anti-Patterns to Avoid

- **Using `bg-card` for gradient surfaces:** `bg-card` maps to a flat OKLCH color. Always use `style={{ background: "var(--bg-card)" }}` or the `.surface-card` utility for gradient surfaces.
- **Adding `font-cormorant` class:** The font variable is `--font-serif`. Always use `font-serif` class — never a custom `font-cormorant` class name.
- **Inline rgba/hex in className strings:** `className="bg-[rgba(212,175,55,0.08)]"` defeats the variable system. Use Tailwind arbitrary properties with CSS vars: `className="bg-[var(--gold-bg)]"` — or preferably define a named Tailwind token.
- **Modifying lib/, API routes, or database code:** This phase is 100% visual. If you find yourself editing anything in `src/lib/`, `src/app/api/`, or `src/inngest/` — stop.
- **Touching existing OKLCH token values:** Do not change `--background`, `--foreground`, `--card`, `--border` etc. OKLCH values. Only add new variables, never modify existing ones. The existing tokens are used by shadcn primitives.
- **Scale transforms on hover:** Never `hover:scale-*`. Use border-color and background transitions only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-over panel | Custom absolute-positioned div with JS | shadcn `<Sheet>` component | Already installed, handles keyboard, focus trap, ARIA, animation |
| Dialog/modal | Custom overlay | shadcn `<Dialog>` | Radix primitive handles all accessibility |
| Backdrop blur on top bar | Custom JS scroll listener | CSS `backdrop-filter: blur(12px)` with `sticky` | Pure CSS, no JS needed |
| Wealth tier badge | Custom component per tier | Single `WealthTierBadge` component with tier prop | One component, four visual states via prop |
| Font loading | `<link>` Google Fonts tag in `<head>` | `next/font/google` | Automatic optimization, no FOUT, subsetting |
| Page fade-in | Framer Motion | `animate-page-enter` Tailwind class with CSS keyframe | No new dependency, 0.4s ease exactly matches spec |
| Avatar initials gradient | Custom CSS | Inline `style` with hue-derived `hsl()` | Needs per-name color — computed in JS from name hash |

**Key insight:** The slide-over prospect panel is the only genuinely new component. Everything else is a styling migration of existing components. Build the slide-over using `<Sheet>` (already installed) with the sizing and styling overrides from `prospect-detail.md`.

---

## Common Pitfalls

### Pitfall 1: CSS Variable Gradient Not Working in Tailwind bg- Classes
**What goes wrong:** `className="bg-bg-card"` renders a flat color if `--bg-card` is a `linear-gradient()`. Tailwind maps CSS variable references as color values (hex/rgb/oklch), not as arbitrary CSS values. A CSS variable containing a gradient cannot be used as a Tailwind `bg-*` color.
**Why it happens:** Tailwind generates `background-color: var(--bg-card)` — note `background-color`, not `background`. Gradients require the `background` shorthand property.
**How to avoid:** Use `style={{ background: "var(--bg-card)" }}` for gradient surfaces. For hover, use a CSS class in globals.css (`@layer utilities`) that sets the `background` property directly, or use the `.surface-card` utility pattern.
**Warning signs:** Cards appear as flat dark squares instead of showing subtle glass-like depth.

### Pitfall 2: `--font-serif` in globals.css References Playfair Display After Font Swap
**What goes wrong:** globals.css has hardcoded `--font-serif: Playfair Display, serif` in both `:root` and `.dark` blocks. Even after updating `layout.tsx` to load Cormorant Garamond, if the `--font-serif` string in globals.css is not updated, the font-stack fallback will still say "Playfair Display" — which may be cached by the browser.
**How to avoid:** After swapping fonts in `layout.tsx`, also update the globals.css `--font-sans` and `--font-serif` fallback strings in both `:root` and `.dark` blocks to match the new fonts.
**Warning signs:** Headings look different than expected on first load before the Google Font is fetched.

### Pitfall 3: Existing `--radius: 1rem` Conflicts with Card Radius Spec
**What goes wrong:** The existing tailwind.config.ts maps `rounded-lg` to `var(--radius)` which is `1rem` (16px). The design system specifies 14px for cards. If shadcn `Card` component uses `rounded-lg`, it will be 16px not 14px.
**How to avoid:** Either change `--radius` to `14px` (impacts all rounded-lg throughout the app — likely acceptable since this is a full redesign), or add a new `rounded-card` token mapped to `14px` and use it explicitly on card containers. Changing `--radius` is the cleaner approach since the spec wants 14px everywhere for panels/cards.
**Warning signs:** Cards look slightly more rounded than the design spec.

### Pitfall 4: Recharts Style Props Cannot Use Tailwind Classes
**What goes wrong:** Recharts `contentStyle`, `LabelList style`, and `Cell fill` props are plain JS objects. They cannot use Tailwind class names or arbitrary utilities. Any attempt to pass a Tailwind token string fails.
**How to avoid:** Use `"var(--gold)"`, `"var(--foreground)"`, `"var(--muted-foreground)"` strings directly in those style objects. CSS variables resolve correctly at runtime in inline styles.
**Warning signs:** Chart tooltip or labels appear with wrong colors, or show raw CSS variable strings instead of colors.

### Pitfall 5: Search Page Rebuild Breaks `useSearch` Hook
**What goes wrong:** The `search-results-table.tsx` currently consumes data from `useSearch` hook via `SearchResultsTable`. When rebuilding to cards, developers may be tempted to restructure the data flow. The `useSearch` hook and `SearchContent` orchestrator should not change — only the rendering layer changes.
**How to avoid:** Keep `useSearch` hook, `search-content.tsx` orchestrator, and `add-to-list-dialog.tsx` unchanged. Only replace `search-toolbar.tsx` (persona selector section) and `search-results-table.tsx` (results rendering). The persona card grid replaces the `<PersonaSelector>` dropdown only.
**Warning signs:** Search stops working, URL state breaks, pagination disappears.

### Pitfall 6: `text-primary` Tailwind Class Name Conflict
**What goes wrong:** The design system references `--text-primary` as a CSS variable name. If mapped in tailwind.config.ts as `text-primary: 'var(--text-primary)'`, it collides with the existing `primary` color group which already maps `text-primary` to `var(--primary)` (the accent color).
**How to avoid:** Do not add a `text-primary` key to tailwind.config.ts colors. The existing `text-foreground` (maps to `--foreground`) already represents the design system's `--text-primary` visually. Use `text-foreground` for primary text. The `--text-primary` variable is only needed for raw style prop usage in Recharts.

### Pitfall 7: `nyquist_validation` Not in config.json
**What goes wrong:** The `.planning/config.json` does not have a `workflow.nyquist_validation` key — only `workflow.research`, `workflow.plan_check`, `workflow.verifier`. Since the key is absent (not false), treat it as disabled.
**How to avoid:** Skip the Validation Architecture section in RESEARCH.md and PLAN.md. No test infrastructure changes are needed for this visual-only phase.

---

## Code Examples

Verified patterns from design system spec and codebase analysis:

### Ambient Background (add to root layout or tenant layout)
```tsx
// In src/app/[orgId]/layout.tsx — add after <html> root
<>
  {/* Ambient glow — decorative only */}
  <div
    style={{
      position: "fixed", top: "-200px", right: "-200px",
      width: "600px", height: "600px",
      background: "radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%)",
      pointerEvents: "none", zIndex: 0,
    }}
    aria-hidden="true"
  />
  <div
    style={{
      position: "fixed", bottom: "-150px", left: "-150px",
      width: "400px", height: "400px",
      background: "radial-gradient(circle, rgba(212,175,55,0.02) 0%, transparent 70%)",
      pointerEvents: "none", zIndex: 0,
    }}
    aria-hidden="true"
  />
  {/* Main layout */}
  <div className="relative z-10 flex min-h-screen">
    ...
  </div>
</>
```

### Slide-Over Panel Using shadcn Sheet
```tsx
// src/components/prospect/prospect-slide-over.tsx (NEW FILE)
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface ProspectSlideOverProps {
  open: boolean;
  onClose: () => void;
  prospectId: string | null;
}

export function ProspectSlideOver({ open, onClose, prospectId }: ProspectSlideOverProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        style={{
          width: "min(480px, 90vw)",
          background: "#0d0d10",
          borderLeft: "1px solid rgba(212,175,55,0.1)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
        className="p-0 overflow-y-auto"
      >
        {/* Panel header — sticky */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{ background: "#0d0d10" }}
        >
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Prospect Detail
          </h2>
          {/* Close button rendered by Sheet primitive */}
        </div>
        {/* Panel body with 28px horizontal padding */}
        <div className="px-7 space-y-6 pb-10">
          {prospectId && <ProspectPanelBody prospectId={prospectId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Persona Selection Card
```tsx
// src/app/[orgId]/search/components/persona-card.tsx (NEW FILE)
interface PersonaCardProps {
  persona: Persona;
  onSelect: (personaId: string) => void;
}

export function PersonaCard({ persona, onSelect }: PersonaCardProps) {
  return (
    <button
      onClick={() => onSelect(persona.id)}
      className="relative overflow-hidden rounded-[14px] p-7 text-left transition-all duration-200 cursor-pointer"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-card-hover)";
        e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
    >
      {/* Corner gold accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(212,175,55,0.06) 0%, transparent 70%)" }}
      />
      <h3 className="font-serif text-[22px] font-semibold text-foreground leading-tight">
        {persona.name}
      </h3>
      <p className="mt-2 text-[13px] font-light text-muted-foreground">
        {persona.description}
      </p>
      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">~{persona.estimated_matches?.toLocaleString()} matches</span>
        <span className="text-sm font-medium text-gold">Search →</span>
      </div>
    </button>
  );
}
```

### Wealth Tier Badge
```tsx
// src/app/[orgId]/search/components/wealth-tier-badge.tsx (NEW FILE)
type WealthTier = "$500M+" | "$100M+" | "$50M+" | "$30M+";

const TIER_STYLES: Record<WealthTier, { bg: string; border: string; text: string }> = {
  "$500M+": { bg: "rgba(212,175,55,0.25)", border: "rgba(212,175,55,0.6)", text: "#f0d060" },
  "$100M+": { bg: "rgba(212,175,55,0.15)", border: "rgba(212,175,55,0.4)", text: "#d4af37" },
  "$50M+":  { bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.25)", text: "#c4a030" },
  "$30M+":  { bg: "rgba(212,175,55,0.05)", border: "rgba(212,175,55,0.15)", text: "#a08828" },
};

export function WealthTierBadge({ tier }: { tier: WealthTier }) {
  const s = TIER_STYLES[tier];
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {tier}
    </span>
  );
}
```
**Note:** The design system explicitly states these wealth tier badges use raw rgba values intentionally — the graduated opacity scale does not map to a single token. This is the one approved exception to the "no inline hex/rgba" rule.

### Nav Item with Active Left-Border Accent
```tsx
// Active nav item pattern — update nav-items.tsx
<Link
  className={cn(
    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer relative",
    isActive
      ? "text-gold"
      : "text-muted-foreground hover:text-foreground"
  )}
  style={isActive ? {
    background: "var(--gold-bg)",
    borderLeft: "2px solid var(--gold-primary)",
    paddingLeft: "10px",  // compensate for 2px border
  } : {}}
>
```

### Empty State (Updated for Design System)
```tsx
// Update src/components/ui/empty-state.tsx
<div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-[14px] border-dashed border"
     style={{ background: "var(--bg-card)" }}>
  {Icon && (
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
         style={{ background: "var(--gold-bg-strong)" }}>
      <Icon className="h-7 w-7 text-gold" />
    </div>
  )}
  <h3 className="font-serif text-[22px] font-semibold text-foreground">{title}</h3>
  {description && (
    <p className="mt-2 text-[13px] text-muted-foreground max-w-[400px] leading-relaxed">{description}</p>
  )}
  {children && <div className="mt-6">{children}</div>}
</div>
```

---

## Migration Scope — Complete File Inventory

### Files with CONFIRMED raw Tailwind colors (must fix)
| File | Issue | Fix |
|------|-------|-----|
| `src/components/admin/tenant-heatmap.tsx` | `text-red-400`, `text-emerald-400` | Replace with `text-destructive`, `text-success` |
| `src/components/admin/error-feed.tsx` | Likely has raw colors (confirmed in file list) | Audit and replace |
| `src/components/prospect/lookalike-discovery.tsx` | `bg-red-500/10 text-red-400`, `bg-green-500/10 text-green-400` | Replace with destructive/success tokens |
| `src/components/ui/dialog.tsx` | `gray-*` (shadcn default) | Minor — already uses semantic tokens mostly |
| `src/components/ui/table.tsx` | `gray-*` | Minor update |
| `src/components/ui/toast.tsx` | raw Tailwind colors in variants | Update to semantic tokens |
| `src/components/ui/select.tsx` | raw Tailwind in focus states | Update to gold-tinted focus |
| `src/app/admin/tenants/page.tsx` | `bg-green-500/10 text-green-500`, `bg-red-500/10 text-red-500` | Replace with success/destructive tokens |
| `src/app/admin/tenants/tenant-status-toggle.tsx` | raw colors | Replace |
| `src/app/admin/users/user-status-toggle.tsx` | raw colors | Replace |
| `src/app/admin/users/page.tsx` | raw colors | Replace |
| `src/app/admin/users/new/page.tsx` | raw colors | Replace |
| `src/app/admin/tenants/new/page.tsx` | raw colors | Replace |
| `src/app/admin/analytics/page.tsx` | `border-red-900 bg-red-950 text-red-300` | Replace with `border-destructive/30 bg-destructive/15 text-destructive` |
| `src/components/admin/funnel-chart.tsx` | `style={{ fill: "#a1a1aa" }}`, inline hex in contentStyle | Replace with CSS variable references |

### Files that need STRUCTURAL CHANGES (not just color swaps)
| File | Change Type |
|------|-------------|
| `src/app/layout.tsx` | Font swap: Inter/Playfair → DM Sans/Cormorant |
| `src/app/globals.css` | Add all new CSS variable tokens + scrollbar + animations |
| `tailwind.config.ts` | Map new CSS variables to Tailwind classes |
| `src/components/layout/sidebar.tsx` | Gradient bg, 220px width, gold right-edge, footer |
| `src/components/layout/nav-items.tsx` | Active left-border accent, 8px radius |
| `src/app/[orgId]/layout.tsx` | Add ambient background gradients, top bar shell |
| `src/app/admin/layout.tsx` | Gradient sidebar, consistent with tenant sidebar |
| `src/app/[orgId]/page.tsx` | Dashboard redesign: Cormorant greeting, stat pills, persona cards |
| `src/app/[orgId]/search/page.tsx` | Add persona card grid markup |
| `src/app/[orgId]/search/components/search-content.tsx` | Switch between persona grid / results cards |
| `src/app/[orgId]/search/components/search-results-table.tsx` | Replace with prospect result cards |
| `src/app/[orgId]/search/components/persona-selector.tsx` | Replace dropdown with card grid |
| `src/app/[orgId]/lists/page.tsx` | Switch from `<ListGrid>` to horizontal card stack |
| `src/app/[orgId]/lists/components/list-grid.tsx` | Full redesign: 3-col grid → horizontal cards, Cormorant names |
| `src/components/prospect/profile-view.tsx` | Slide-over panel layout, Cormorant name, gold indicators |
| `src/components/ui/button.tsx` | Add `gold` and update `ghost` CVA variants |
| `src/components/ui/card.tsx` | Override to gradient surface |
| `src/components/ui/empty-state.tsx` | 64px gold icon circle, Cormorant heading, gradient bg |
| `src/components/ui/badge.tsx` | 20px radius for pills |
| `src/components/charts/metrics-cards.tsx` | Cormorant 36px values, gold for non-zero data |
| `src/components/charts/usage-chart.tsx` | Gold bar fill |
| `src/components/charts/date-range-filter.tsx` | Gold active segment |

### New Files to Create
| File | Purpose |
|------|---------|
| `src/app/[orgId]/search/components/persona-card.tsx` | Single persona card in the search grid |
| `src/app/[orgId]/search/components/prospect-result-card.tsx` | Single prospect result card (replaces table row) |
| `src/app/[orgId]/search/components/wealth-tier-badge.tsx` | Graduated gold wealth tier badge |
| `src/components/prospect/prospect-slide-over.tsx` | Slide-over panel wrapping shadcn Sheet |

### Files with NO changes needed (verified clean)
- All `src/lib/` files — backend logic, zero UI
- All `src/app/api/` routes — server logic only
- All `src/inngest/` functions — background jobs
- `src/middleware.ts` — routing only
- `src/hooks/` — non-visual hooks

---

## Current State Assessment

### What Is Already Correct (Do Not Touch)
- `text-gold`, `bg-gold`, `border-gold/XX` usage — these already use the design token correctly
- `text-muted-foreground`, `text-foreground`, `bg-card` — semantic tokens already in use
- `font-serif` classes — already applied correctly, just the wrong font loaded
- `cursor-pointer` on interactive elements — largely done throughout
- `transition-colors duration-150/200` — already present on most interactive elements
- `font-mono` on data/currency values — already used in `wealth-signals.tsx`
- Lucide React icons — exclusively used, no Heroicons or emojis found

### What Is Wrong / Missing
1. **Fonts:** Inter and Playfair Display are loaded — must swap to DM Sans and Cormorant Garamond
2. **Background root:** Current dark mode `--background` is `oklch(0.2193...)` ≈ #121212, not `#08080a` — needs `--bg-root` variable and body override
3. **Sidebar:** Flat `bg-card` background, not gradient. Width is 256px (`w-64`), not 220px. No gold right-edge line. No footer.
4. **Card surfaces:** All cards use flat `bg-card` — no gradient. No hover transition to gold-tinted gradient.
5. **Search page:** Uses dropdown selector + data table. Needs card grid + prospect result cards.
6. **Lists page:** Uses 3-column grid (`md:grid-cols-2 lg:grid-cols-3`). Needs full-width horizontal card stack.
7. **Prospect panel:** No slide-over panel exists — only a full-page profile view. `profile-view.tsx` needs to become a slide-over.
8. **Top bar:** No top bar component exists anywhere — this is a new component.
9. **Ambient background:** Not implemented anywhere.
10. **Custom scrollbar:** Not implemented.
11. **Page transitions:** Not implemented.
12. **Button variants:** No `gold` variant in `button.tsx` CVA (gold is applied as ad-hoc classes in login page).
13. **Empty states:** Current `EmptyState` component uses flat muted bg, small icon, small heading — needs upgrade to 64px gold circle, Cormorant 22px heading.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playfair Display + Inter | Cormorant Garamond + DM Sans | This phase | More refined serif; DM Sans has better optical size at small (13px) body text |
| Flat solid `bg-card` | Gradient glass surface | This phase | Glass-like depth without heavy backdrop-filter performance cost |
| Data table for search results | Card stack | This phase | Aligns with luxury UX pattern — avoids spreadsheet aesthetic |
| 3-column list grid | Horizontal card stack | This phase | Easier scanability for named entities |

**Deprecated:**
- `Playfair_Display` import in layout.tsx: replaced by `Cormorant_Garamond`
- `Inter` import in layout.tsx: replaced by `DM_Sans`
- Raw zinc/gray/green/red Tailwind classes: replaced by semantic token classes

---

## Open Questions

1. **Top Bar — does it exist as a layout requirement?**
   - What we know: The design system specifies a top bar at 56px with command palette search and user avatar. The current `[orgId]/layout.tsx` has no top bar — only `<Sidebar>` and `<main>`.
   - What's unclear: Building the full top bar (with working Cmd+K command palette and user avatar dropdown) is medium-complexity. The planner must decide if this is in scope for this phase or deferred.
   - Recommendation: Build the top bar shell (correct height, backdrop blur, layout) without the working Cmd+K functionality. Cmd+K is a separate feature, not a styling concern.

2. **`--background` vs `--bg-root`: should the body background change?**
   - What we know: The spec says `--bg-root: #08080a`. The current `--background` is `oklch(0.2193...)` ≈ #222. The difference is significant — the spec is much darker.
   - What's unclear: Changing `--background` breaks all existing shadcn component backgrounds. Setting `--bg-root` separately and applying to `body` is safer.
   - Recommendation: Set `body { background: var(--bg-root); }` in globals.css without changing `--background`. This achieves the spec value while preserving shadcn component theming.

3. **List deletion confirm dialog:** Currently uses `window.confirm()` in `list-grid.tsx`. Design system requires a proper Dialog. Out of scope for this phase — leave as-is.

4. **`prospect-detail.md` Section 4c (Full Profile Page):** Marked as P1 (deferred). The existing `src/app/[orgId]/prospects/[prospectId]/page.tsx` renders `<ProfileView>` — this gets minimal styling only. The slide-over is the priority.

---

## Recommended Migration Order (Claude's Discretion)

Based on dependency analysis and blast radius:

**Wave 1 — Foundation (no visual regressions possible):**
1. `globals.css` — add all new CSS variables, scrollbar, page-enter animation
2. `tailwind.config.ts` — map new variables to Tailwind classes, add border-radius tokens
3. `src/app/layout.tsx` — font swap only (no className changes needed downstream)

**Wave 2 — Layout Shell (affects every page):**
4. `sidebar.tsx` + `nav-items.tsx` — gradient, 220px, gold accent, active indicator
5. `admin/layout.tsx` — mirror sidebar treatment
6. `[orgId]/layout.tsx` — add ambient background gradients, add top bar shell
7. `globals.css` — body background override to `--bg-root`

**Wave 3 — Component Library (building blocks for pages):**
8. `button.tsx` — add gold variant, update ghost variant
9. `card.tsx` — gradient surface override
10. `empty-state.tsx` — 64px gold icon, Cormorant heading
11. `badge.tsx` — 20px radius
12. Raw color fixes: `lookalike-discovery.tsx`, `tenant-heatmap.tsx`, admin pages
13. Recharts inline style fixes: `funnel-chart.tsx`, `usage-chart.tsx`

**Wave 4 — Page Rebuilds (highest visual impact):**
14. Dashboard (`[orgId]/page.tsx`) — Cormorant greeting, stat pills, persona card style
15. Lists page — horizontal card stack, Cormorant list names, gold member count
16. Search page — persona card grid + prospect result cards (biggest change)
17. Slide-over panel — new `ProspectSlideOver` using shadcn Sheet

**Wave 5 — Polish:**
18. `metrics-cards.tsx` — Cormorant values
19. Admin pages — consistent card treatment
20. `profile-view.tsx` — minimal slide-over styling upgrades
21. Verify page transitions (`page-enter` class on each page root)

---

## Sources

### Primary (HIGH confidence)
- `design-system/MASTER.md` — Complete design specification, all color values and component patterns verified directly from source
- `design-system/pages/*.md` — Page-specific overrides verified directly from source
- `src/app/globals.css` — Current CSS variable state verified via file read
- `tailwind.config.ts` — Current Tailwind token map verified via file read
- `src/app/layout.tsx` — Current font loading verified via file read
- All component files referenced — inspected directly

### Secondary (MEDIUM confidence)
- Project memory (MEMORY.md) — Current project state context
- `next/font/google` API — Training knowledge that `DM_Sans`, `Cormorant_Garamond`, `JetBrains_Mono` are available as named exports. Confidence MEDIUM — package name casing must be verified at implementation time from Next.js docs if import fails.

### Tertiary (LOW confidence)
- Tailwind v3 CSS variable gradient limitation — Based on training knowledge that `background-color` vs `background` distinction prevents gradient CSS variables from working in `bg-*` classes. Should be verified by testing `className="bg-[var(--bg-card)]"` at implementation time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in package.json / codebase
- Architecture: HIGH — all current files directly inspected, patterns verified from both spec and codebase
- Pitfalls: MEDIUM-HIGH — CSS variable gradient limitation based on training knowledge, should be spot-checked
- Migration scope: HIGH — every affected file directly inspected and categorized

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — stable domain, no fast-moving dependencies)
