# Phronesis Design System — MASTER

> PGL Luxury Buyer Finder. Wealth intelligence SaaS for luxury real estate teams.
> Dark luxury aesthetic. Authority without excess.

---

## 1. Design Direction

| Attribute     | Value                                              |
|---------------|----------------------------------------------------|
| **Mood**      | Confident, premium, data-rich, understated         |
| **Style**     | Dark luxury with warm neutrals and gold accents    |
| **Audience**  | NYC luxury real estate agents (The W Team)         |
| **Density**   | Medium — data tables + cards, not marketing fluff  |
| **Motion**    | Subtle. 150-300ms transitions. No bouncing.        |

### Anti-patterns (never do)

- Emojis as icons — use Lucide SVGs exclusively
- Neon or saturated accent colors — the palette is warm and muted
- Layout-shifting hover effects (scale transforms on cards)
- Light mode — the app is forced dark (`<html class="dark">`)
- Gratuitous animation — no parallax, no scroll-triggered reveals

---

## 2. Color Tokens

All colors are defined as CSS custom properties in `globals.css` using OKLCH.
Components must use Tailwind token classes (`bg-card`, `text-muted-foreground`), never raw Tailwind colors (`bg-zinc-900`, `text-gray-400`) or inline hex/oklch values.

### Core Palette (Dark Mode — active)

| Token                  | OKLCH Value                       | Usage                          |
|------------------------|-----------------------------------|--------------------------------|
| `--background`         | `oklch(0.2193 0.0050 67.5651)`    | Page background                |
| `--foreground`         | `oklch(0.9122 0.0240 73.5976)`    | Primary text                   |
| `--card`               | `oklch(0.2583 0.0071 67.5039)`    | Card/surface background        |
| `--card-foreground`    | `oklch(0.9122 0.0240 73.5976)`    | Card text                      |
| `--primary`            | `oklch(0.7392 0.0579 66.7290)`    | Primary actions, links, focus  |
| `--primary-foreground` | `oklch(0.2193 0.0050 67.5651)`    | Text on primary background     |
| `--secondary`          | `oklch(0.3382 0.0143 62.9371)`    | Secondary surfaces             |
| `--muted`              | `oklch(0.2838 0.0093 67.4395)`    | Muted backgrounds              |
| `--muted-foreground`   | `oklch(0.6702 0.0318 67.2402)`    | Secondary/helper text          |
| `--accent`             | `oklch(0.3167 0.0113 67.4014)`    | Hover backgrounds, nav active  |
| `--accent-foreground`  | `oklch(0.7392 0.0579 66.7290)`    | Text on accent background      |
| `--border`             | `oklch(0.3382 0.0143 62.9371)`    | All borders                    |
| `--input`              | `oklch(0.2838 0.0093 67.4395)`    | Input backgrounds              |
| `--ring`               | `oklch(0.7392 0.0579 66.7290)`    | Focus rings                    |
| `--destructive`        | `oklch(0.4349 0.0921 21.6004)`    | Errors, delete actions         |

### Gold Accent (NEW — must be added to globals.css)

The gold accent is the signature color of the product. Currently hardcoded as inline hex values (`#f4d47f`, `#d4af37`). Must be tokenized.

| Token               | Value                             | Usage                          |
|----------------------|-----------------------------------|--------------------------------|
| `--gold`             | `oklch(0.84 0.10 85)`            | Highlight text, active links, currency values, wealth signals |
| `--gold-foreground`  | `oklch(0.15 0.01 67)`            | Text on gold background (rare) |
| `--gold-muted`       | `oklch(0.72 0.08 85)`            | Hover state for gold links, secondary gold |

Tailwind mapping: `text-gold`, `hover:text-gold-muted`, `border-gold`

### Semantic Status Colors (NEW — must be added to globals.css)

Status indicators must use tokens, not raw Tailwind colors.

| Token               | Value                             | Usage                          |
|----------------------|-----------------------------------|--------------------------------|
| `--success`          | `oklch(0.72 0.17 155)`           | Verified, complete, available  |
| `--success-muted`    | `oklch(0.72 0.17 155 / 0.15)`    | Success badge backgrounds      |
| `--warning`          | `oklch(0.80 0.15 85)`            | Guessed, pending, caution      |
| `--warning-muted`    | `oklch(0.80 0.15 85 / 0.15)`     | Warning badge backgrounds      |
| `--info`             | `oklch(0.70 0.12 250)`           | In progress, informational     |
| `--info-muted`       | `oklch(0.70 0.12 250 / 0.15)`    | Info badge backgrounds          |

Tailwind mapping: `text-success`, `bg-success-muted`, `border-success`, etc.

### Chart Colors

| Token       | Usage              |
|-------------|-------------------|
| `--chart-1` | Primary data line  |
| `--chart-2` | Secondary series   |
| `--chart-3` | Tertiary series    |
| `--chart-4` | Quaternary series  |
| `--chart-5` | Quinary series     |

### Rules

1. **Never use raw Tailwind color classes** (`zinc-*`, `gray-*`, `emerald-*`, `yellow-*`)
2. **Never use inline hex/oklch** in JSX className strings
3. **All new colors must be CSS variables** first, then mapped in `tailwind.config.ts`
4. Gold is for emphasis and wealth signals — do not overuse it

---

## 3. Typography

### Font Stack

| Role      | Font             | Variable       | Tailwind Class |
|-----------|------------------|----------------|----------------|
| Headings  | Playfair Display | `--font-serif` | `font-serif`   |
| Body      | Inter            | `--font-sans`  | `font-sans`    |
| Code/Data | JetBrains Mono   | `--font-mono`  | `font-mono`    |

### Type Scale

| Level     | Size        | Weight     | Font         | Tracking        | Usage                        |
|-----------|-------------|------------|--------------|-----------------|------------------------------|
| **h1**    | `text-3xl`  | `font-bold`     | `font-serif` | default         | Page titles                  |
| **h2**    | `text-xl`   | `font-semibold` | `font-serif` | default         | Section headings             |
| **h3**    | `text-lg`   | `font-semibold` | `font-sans`  | default         | Card titles, dialog titles   |
| **h4**    | `text-base` | `font-semibold` | `font-sans`  | default         | Subsection headings          |
| **body**  | `text-sm`   | `font-normal`   | `font-sans`  | `tracking-normal` | Default body text          |
| **caption** | `text-xs` | `font-medium`   | `font-sans`  | default         | Timestamps, metadata         |
| **label** | `text-xs`   | `font-semibold` | `font-sans`  | `uppercase tracking-wider` | Section labels, table headers |
| **data**  | `text-sm`   | `font-medium`   | `font-mono`  | default         | Currency, numbers, IDs       |

### Rules

1. `font-serif` (Playfair) is for h1 and h2 only — never for body text or labels
2. Always use `font-serif` in class, never `font-playfair` — the latter bypasses the variable system
3. Body text line-height: `leading-relaxed` (1.625) for readability
4. Max line length: `max-w-prose` (65ch) for long-form text blocks
5. Letter spacing in dark mode is slightly wider (`0.025em`) — this is handled by the CSS variable

---

## 4. Spacing

Base unit: `--spacing: 0.25rem` (4px)

### Layout Spacing

| Context            | Value         | Tailwind       |
|--------------------|---------------|----------------|
| Page padding       | 24px / 32px   | `p-6 lg:p-8`  |
| Section gap        | 24px          | `space-y-6`    |
| Card padding       | 24px          | `p-6`          |
| Card header/content gap | 6px      | `space-y-1.5`  |
| Grid gap           | 16px          | `gap-4`        |
| Inline element gap | 8px           | `gap-2`        |
| Button icon gap    | 8px           | `gap-2`        |

### Container Widths

| Context       | Value          |
|---------------|----------------|
| Content max   | `max-w-7xl`    |
| Prose max     | `max-w-prose`  |
| Sidebar width | `w-64` (256px) |

### Rules

1. Use Tailwind spacing scale — never arbitrary pixel values
2. Consistent section spacing: `space-y-6` between major sections
3. Consistent card padding: `p-6` everywhere

---

## 5. Shadows

Custom shadow scale defined in globals.css. Use these via Tailwind's `shadow-*` utilities.

| Level       | Usage                                    |
|-------------|------------------------------------------|
| `shadow-2xs`| Subtle lift (badges, tags)               |
| `shadow-xs` | Minor lift                               |
| `shadow-sm` | Default card elevation                   |
| `shadow`    | Standard elevation (cards, containers)    |
| `shadow-md` | Raised elements (dropdowns, popovers)    |
| `shadow-lg` | Prominent elements (dialogs, modals)     |
| `shadow-xl` | Maximum emphasis (floating action bars)  |

### Rules

1. Use the custom shadow scale (defined in globals.css), not Tailwind defaults
2. Dark mode shadows are deeper and more opaque — this is handled automatically
3. Cards use `shadow` (default level)
4. Popovers/dropdowns use `shadow-md`
5. Dialogs use `shadow-lg`

---

## 6. Border Radius

| Token       | Value                      | Usage                |
|-------------|----------------------------|----------------------|
| `rounded-lg`| `var(--radius)` = 1rem     | Cards, containers    |
| `rounded-md`| `calc(var(--radius) - 2px)`| Buttons, inputs      |
| `rounded-sm`| `calc(var(--radius) - 4px)`| Badges, tags         |
| `rounded-full` | 9999px                  | Avatars, pills       |

---

## 7. Icons

### Library

Lucide React — the only icon source. No Heroicons, no Font Awesome, no emojis.

```tsx
import { Search, List, Users } from "lucide-react"
```

### Size Scale

| Size    | Class        | Usage                                   |
|---------|--------------|------------------------------------------|
| **xs**  | `h-3.5 w-3.5` | Inline with text (sort indicators)     |
| **sm**  | `h-4 w-4`   | Default — nav items, buttons, table cells |
| **md**  | `h-5 w-5`   | Standalone icons, action buttons         |
| **lg**  | `h-8 w-8`   | Empty states, feature highlights         |

### Rules

1. Icons are always `shrink-0` inside flex containers
2. Icon color inherits from parent text color — don't set explicit colors unless semantic (status icons)
3. Always pair icon-only buttons with `aria-label`
4. Never use emojis as icons

---

## 8. Interaction States

### Cursor

| Element               | Cursor           |
|-----------------------|------------------|
| Buttons               | `cursor-pointer` |
| Links                 | `cursor-pointer` |
| Clickable cards       | `cursor-pointer` |
| Nav items             | `cursor-pointer` |
| Disabled elements     | `cursor-not-allowed` |
| Non-interactive text  | default          |

**Rule: Every clickable element must have `cursor-pointer`.** Do not rely on browser defaults.

### Hover States

| Element          | Hover Effect                                |
|------------------|---------------------------------------------|
| Buttons          | Background/opacity shift per variant        |
| Links            | `hover:text-gold` (gold highlight)          |
| Cards (clickable)| `hover:bg-accent` + `hover:shadow-md`       |
| Table rows       | `hover:bg-muted/50`                         |
| Nav items        | `hover:bg-accent/50 hover:text-foreground`  |

### Transitions

All interactive elements: `transition-colors duration-200`

For elevation changes: `transition-all duration-200`

Never exceed 300ms. Never use bounce/spring easing.

### Focus States

All focusable elements must have visible focus indicators:
- Default: `focus-visible:ring-1 focus-visible:ring-ring`
- Inputs: `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`
- Buttons: `focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1`
- Table rows: `focus-within:bg-accent/30` (NEW — must be added)

### Disabled States

- `disabled:pointer-events-none disabled:opacity-50`
- `disabled:cursor-not-allowed` on form elements

---

## 9. Component Patterns

### Cards

```
bg-card text-card-foreground rounded-lg border shadow
```

- Header: `p-6 space-y-1.5`
- Content: `p-6 pt-0`
- Title: `text-lg font-semibold` (h3 level, sans-serif)
- Description: `text-sm text-muted-foreground`

### Empty States

Shared component: `src/components/ui/empty-state.tsx`

```tsx
import { EmptyState } from "@/components/ui/empty-state";

<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your filters"
  variant="default" // or "error"
>
  <Button>Optional action</Button>
</EmptyState>
```

- Icon: `h-8 w-8 text-muted-foreground/50 mb-3`
- Title: `text-lg font-semibold`
- Description: `text-sm text-muted-foreground/70 max-w-sm`
- Variants: `default` (dashed border) and `error` (destructive border)

### Status Badges

```
inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold
```

| Status      | Background          | Text            | Border             |
|-------------|--------------------|-----------------|--------------------|
| Verified    | `bg-success-muted`  | `text-success`  | `border-success/30` |
| Guessed     | `bg-warning-muted`  | `text-warning`  | `border-warning/30` |
| Failed      | `bg-destructive/15` | `text-destructive` | `border-destructive/30` |
| In Progress | `bg-info-muted`     | `text-info`     | `border-info/30`   |
| Pending     | `bg-muted`          | `text-muted-foreground` | `border`  |

### Data Tables

- Container: `rounded-md border`
- Header: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
- Rows: `border-b hover:bg-muted/50 transition-colors cursor-pointer` (if clickable)
- Cells: `p-2 text-sm`
- Currency values: `font-mono text-gold text-right`
- Sort indicators: `h-3.5 w-3.5 opacity-50` (unsorted), full opacity (sorted)

### Dialogs

- Overlay: `bg-black/80`
- Content: `bg-card border shadow-lg rounded-lg`
- Title: `text-lg font-semibold`
- Close: top-right X icon with `sr-only` label

### Navigation (Sidebar)

- Container: `h-screen w-64 bg-card border-r border-border`
- Active item: `bg-accent text-accent-foreground rounded-md`
- Inactive item: `text-muted-foreground hover:bg-accent/50 hover:text-foreground rounded-md transition-colors`
- Icon + label: `h-4 w-4` icon + `text-sm font-medium`
- Mobile: Must collapse to hamburger menu (NOT YET IMPLEMENTED)

---

## 10. Accessibility

### Minimum Requirements

| Rule                | Standard         |
|---------------------|------------------|
| Text contrast       | 4.5:1 (WCAG AA)  |
| Large text contrast | 3:1 (WCAG AA)    |
| Touch targets       | 44x44px minimum   |
| Focus indicators    | Visible ring on all interactive elements |
| Alt text            | All meaningful images |
| Aria labels         | All icon-only buttons |
| Keyboard nav        | Tab order matches visual order |
| Reduced motion      | Respect `prefers-reduced-motion` |

### Color is Never the Only Indicator

Status must be communicated through **icon + color + label**, not color alone.
Example: enrichment status uses icon shape (check, X, spinner) + color + text label.

---

## 11. Responsive Breakpoints

| Breakpoint | Width    | Behavior                         |
|------------|----------|----------------------------------|
| Default    | < 640px  | Mobile: single column, sidebar hidden |
| `sm`       | 640px    | Small tablets                    |
| `md`       | 768px    | Tablets: 2-column grids          |
| `lg`       | 1024px   | Desktop: 3-column grids, sidebar visible |
| `xl`       | 1280px   | Wide desktop                     |
| `2xl`      | 1536px   | Ultra-wide                       |

### Rules

1. Mobile-first is ideal but the app is currently desktop-first — maintain consistency
2. Sidebar must collapse on mobile (< 1024px)
3. Data tables should scroll horizontally on mobile, not wrap
4. Test at: 375px, 768px, 1024px, 1440px

---

## 12. Tenant Theming

Tenants can customize branding via `--tenant-primary` and `--tenant-secondary` CSS variables set in the org layout.

**Current status: DEFINED BUT UNUSED.** These variables are set in `[orgId]/layout.tsx` but no component references them. Either:
- Wire them into the sidebar logo area and primary buttons, OR
- Remove the dead code

When implemented, tenant colors should only affect:
- Sidebar logo/header area
- Primary CTA buttons (optional)
- NOT the core palette (background, card, text, borders stay constant)

---

## 13. File Structure

```
design-system/
  MASTER.md              <- This file. Global source of truth.
  pages/                 <- Page-specific overrides (only deviations from Master)
    prospect-profile.md  <- Gold-heavy, wealth signal emphasis
    dashboard.md         <- Chart-focused, denser layout
    search.md            <- Table-heavy, pagination patterns
```

Page override files only document what **differs** from this Master. If a page follows the Master exactly, it does not need an override file.

---

## 14. Migration Checklist

Issues identified in the design critique. Checked items are completed.

- [x] Add `--gold`, `--gold-muted`, `--gold-foreground` to `globals.css`
- [x] Add `--success`, `--warning`, `--info` (+ muted variants) to `globals.css`
- [x] Map new tokens in `tailwind.config.ts`
- [x] Replace all `zinc-*` classes in prospect components with design tokens
- [x] Replace all inline `oklch()` values in JSX with token classes
- [x] Replace hardcoded `emerald-*`, `yellow-*` badge colors with semantic tokens
- [x] Add `cursor-pointer` to all interactive elements globally (button base + nav)
- [x] Replace `font-playfair` with `font-serif` everywhere
- [x] Add `focus-within:bg-accent/30` to table rows for keyboard nav
- [x] Extract reusable `<EmptyState>` component (`src/components/ui/empty-state.tsx`)
- [x] Migrate charts, activity, lookalike, and analytics components to tokens
- [x] Build responsive sidebar (collapsible on mobile)
- [x] Remove dead tenant theming CSS variables from layout
- [x] Verify all icon sizes follow the 4-tier scale (xs/sm/md/lg)
