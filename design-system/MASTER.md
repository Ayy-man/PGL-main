# Phronesis Design System — MASTER

> PGL Luxury Buyer Finder. Wealth intelligence SaaS for UHNWI real estate prospecting.
> Dark luxury aesthetic with warm neutrals, gold accents, and layered glass-like surfaces.

---

## 1. Design Direction

| Attribute     | Value                                                                  |
|---------------|------------------------------------------------------------------------|
| **Mood**      | Confident, premium, data-rich, understated luxury                      |
| **Style**     | Dark luxury with warm neutrals, gold accents, layered glass-like surfaces |
| **Audience**  | NYC luxury real estate agents — UHNWI prospecting at $500-1,000/month  |
| **Density**   | Medium — data cards + slide-over panels, not marketing fluff           |
| **Motion**    | Subtle. 200-300ms transitions. Page mount fade-in (0.4s). No bouncing. |
| **Reference** | PLan CRM dark theme aesthetic                                          |

### Anti-patterns (never do)

- Emojis as icons — use Lucide SVGs exclusively
- Flat solid background colors — every surface uses gradient overlays
- Raw Tailwind color classes (`zinc-*`, `gray-*`, `emerald-*`) — use CSS variables only
- Light mode — the app is forced dark (`<html class="dark">`)
- Scale transforms on hover — use border/opacity transitions only
- Card layouts for prospect search results — use table with columns (Prospect, Wealth Tier, Title & Company, Enrichment, Actions)

---

## 2. Typography

### Font Stack

| Role | Font | Variable | Tailwind Class |
|------|------|----------|----------------|
| Headings (h1-h3, card titles, page titles) | Cormorant Garamond | `--font-serif` | `font-serif` |
| Body / UI (buttons, labels, nav, table cells, forms) | DM Sans | `--font-sans` | `font-sans` |
| Code/Data | JetBrains Mono | `--font-mono` | `font-mono` |

### Google Fonts Import

```
https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap
```

### Type Scale

| Level | Size | Weight | Font | Tracking | Usage |
|-------|------|--------|------|----------|-------|
| **h1** | 38px | 500 | `font-serif` | letter-spacing -0.5px | Page titles |
| **h2** | 34px | 500 | `font-serif` | default | Section headings |
| **h3** | 22px | 600 | `font-serif` | default | Card titles |
| **h4** | 15px | 500 | `font-sans` | default | Subsection headings |
| **body** | 13px | 400 | `font-sans` | default | Default body text |
| **caption** | 12px | 400 | `font-sans` | default | Timestamps, metadata |
| **label** | 11px / 10px | 600 | `font-sans` | uppercase, tracking 1px | Section labels, table headers |
| **data** | 13px | 500 | `font-mono` | default | Currency, numbers, IDs |

### Rules

1. `font-serif` (Cormorant Garamond) is for h1, h2, h3, and card titles only — never for body text, labels, or buttons
2. Always use `font-serif` in class, never `font-cormorant` — the latter bypasses the variable system
3. Body text line-height: `leading-relaxed` (1.625) for readability
4. Max line length: `max-w-prose` (65ch) for long-form text blocks

---

## 3. Color System

All colors are defined as CSS custom properties in `globals.css`. Components use Tailwind token classes only — never raw Tailwind colors or inline hex/rgba values.

### Backgrounds

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-root` | `#08080a` | Page background (near-black) |
| `--bg-sidebar` | `linear-gradient(180deg, #0d0d10 0%, #0a0a0d 100%)` | Sidebar panel |
| `--bg-card` | `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)` | Card/surface background |
| `--bg-card-hover` | `linear-gradient(145deg, rgba(212,175,55,0.04) 0%, rgba(255,255,255,0.02) 100%)` | Card hover state |
| `--bg-elevated` | `rgba(255,255,255,0.03)` | Elevated surfaces (popovers, tooltips) |
| `--bg-input` | `rgba(255,255,255,0.02)` | Input field backgrounds |

### Borders

| Variable | Value | Usage |
|----------|-------|-------|
| `--border-subtle` | `rgba(255,255,255,0.05)` | Lightest border (dividers, separators) |
| `--border-default` | `rgba(255,255,255,0.06)` | Default border for cards and panels |
| `--border-hover` | `rgba(212,175,55,0.15)` | Hover state border (gold-tinted) |
| `--border-gold` | `rgba(212,175,55,0.25)` | Explicit gold border (active states, emphasis) |
| `--border-sidebar` | `rgba(212,175,55,0.08)` | Sidebar right-edge accent line |

### Gold Accent

The gold accent is the signature color of the product. Used for emphasis and wealth signals — do not overuse.

| Variable | Value | Usage |
|----------|-------|-------|
| `--gold-primary` | `#d4af37` | Primary gold — active links, wealth signals, CTA text |
| `--gold-bright` | `#f0d060` | Bright gold — sparingly for high emphasis moments |
| `--gold-text` | `rgba(212,175,55,0.7)` | Gold text at readable contrast |
| `--gold-muted` | `rgba(212,175,55,0.5)` | Subdued gold — secondary labels, hover states |
| `--gold-bg` | `rgba(212,175,55,0.08)` | Gold background tint — active nav items, selected states |
| `--gold-bg-strong` | `rgba(212,175,55,0.15)` | Stronger gold background — badges, emphasis blocks |

### Text

| Variable | Value | Usage |
|----------|-------|-------|
| `--text-primary` | `#e8e4dc` | Primary text — headings, body, interactive labels |
| `--text-secondary` | `rgba(232,228,220,0.5)` | Secondary text — descriptions, helper text |
| `--text-tertiary` | `rgba(232,228,220,0.4)` | Tertiary text — timestamps, captions |
| `--text-muted` | `rgba(255,255,255,0.25)` | Muted text — placeholder, disabled |
| `--text-ghost` | `rgba(255,255,255,0.15)` | Ghost text — watermarks, version labels |

### Rules

1. **Never use raw Tailwind color classes** (`zinc-*`, `gray-*`, `emerald-*`, `yellow-*`)
2. **Never use inline hex/rgba** in JSX className strings or style attributes
3. **All surfaces use gradient backgrounds**, never flat solid colors
4. **All new colors must be CSS variables** first, then mapped in `tailwind.config.ts`
5. **Gold is for emphasis and wealth signals** — do not overuse it

---

## 4. Surface Treatment

Every card, panel, and container follows the layered glass-like surface treatment. No flat solid backgrounds anywhere in the application.

| State | Background | Border |
|-------|-----------|--------|
| **Rest** | `--bg-card` (gradient) | `--border-subtle` |
| **Hover** | `--bg-card-hover` (gold-tinted gradient) | `--border-hover` |
| **Active / Selected** | `--gold-bg` | `--border-gold` |

### Rules

1. Every card/panel uses `--bg-card` gradient at rest, transitions to `--bg-card-hover` on hover
2. Borders are `--border-subtle` at rest, `--border-hover` on hover
3. Never use a flat solid color for any surface — always a gradient or transparent overlay
4. Elevated surfaces (popovers, dropdowns) use `--bg-elevated` with backdrop blur

---

## 5. Border Radius

| Element | Radius | Usage |
|---------|--------|-------|
| Cards and panels | `14px` | All card containers, slide-over panels |
| Buttons | `8px` | All button variants |
| Inputs | `8px` | Text inputs, selects, textareas |
| Badges and pills | `20px` (fully rounded) | Status badges, tag pills |
| Avatars | `50%` | User avatars, team icons |

---

## 6. Shadows

Dark mode shadows use deep opacity for a realistic layered effect.

| Level | Usage | Description |
|-------|-------|-------------|
| **Subtle** | Cards at rest | Barely visible lift, maintains surface layering |
| **Medium** | Popovers, dropdowns | Clear elevation above the surface below |
| **Heavy** | Dialogs, modals | Strong elevation with blur on the backdrop |

### Rules

1. Cards get subtle shadow elevation
2. Popovers and dropdowns get medium shadow
3. Dialogs get heavy shadow with backdrop blur
4. All shadows use deep opacity values appropriate for dark backgrounds

---

## 7. Icons

### Library

Lucide React — the only icon source. No Heroicons, no Font Awesome, no emojis.

```tsx
import { Search, List, Users } from "lucide-react"
```

### Size Scale

| Size | Class | Usage |
|------|-------|-------|
| **xs** | `h-3.5 w-3.5` | Inline with text (sort indicators, inline labels) |
| **sm** | `h-4 w-4` | Default — nav items, buttons, table cells |
| **md** | `h-5 w-5` | Standalone icons, action buttons |
| **lg** | `h-8 w-8` | Empty states, feature highlights |

### Rules

1. Icons are always `shrink-0` inside flex containers
2. Icon color inherits from parent text color — don't set explicit colors unless semantic (status icons)
3. Always pair icon-only buttons with `aria-label`
4. Never use emojis as icons

---

## 8. Interaction States

### Buttons — Two Variants

#### Ghost (Secondary)

| Property | Value |
|----------|-------|
| Background | `rgba(255,255,255,0.03)` |
| Border | `rgba(255,255,255,0.08)` |
| Color | `rgba(232,228,220,0.6)` |
| Hover | Border brightens |
| Small variant | padding `8px 14px`, font-size `12px` |

#### Gold (Primary)

| Property | Value |
|----------|-------|
| Background | Linear gradient gold |
| Border | `rgba(212,175,55,0.25)` |
| Color | `#d4af37` |
| Weight | 600 |
| Hover | Gradient intensifies |
| Small variant | padding `8px 18px`, font-size `12px` |

### Hover States

| Element | Hover Effect |
|---------|-------------|
| Cards | Background transitions to `--bg-card-hover`, border to `--border-hover` |
| Links | Color transitions to gold (`--gold-primary`) |
| Table rows | Background `rgba(255,255,255,0.02)` |
| Nav items (inactive) | Background `rgba(255,255,255,0.02)`, color `--text-primary` |

### Transitions

All interactive elements: `transition: all 0.2s ease`

Never exceed 300ms. Never use bounce or spring easing.

### Focus States

All focusable elements must have visible focus indicators:

- Default: visible ring on all focusable elements
- Inputs: gold-tinted focus ring
- Buttons: ring with offset
- Keyboard navigation must be fully supported

### Disabled States

- `pointer-events: none` + `opacity: 0.5`
- `cursor: not-allowed` on form elements

### Cursor

| Element | Cursor |
|---------|--------|
| Buttons | `cursor-pointer` |
| Links | `cursor-pointer` |
| Clickable cards | `cursor-pointer` |
| Nav items | `cursor-pointer` |
| Disabled elements | `cursor-not-allowed` |
| Non-interactive text | default |

**Rule: Every clickable element must have `cursor-pointer`.** Do not rely on browser defaults.

---

## 9. Component Patterns

### Sidebar (220px)

- Gradient background (`--bg-sidebar`), gold accent line on right edge (`--border-sidebar`)
- **Team header:** 36px icon with gold gradient, tenant name at 14px weight 600, subtitle at 11px uppercase gold
- **Nav items:** 8px border-radius
  - Active: gold background (`--gold-bg`), gold text (`--gold-primary`), gold left-border accent
  - Inactive: muted text (`--text-secondary`), hover brightens
- **Footer:** App name + version in ghost text (`--text-ghost`)

### Top Bar (56px, sticky)

- Semi-transparent background with `backdrop-filter: blur`
- **Left:** Command palette search input (320px width, includes `Cmd+K` badge)
- **Right:** Notification bell icon + user avatar dropdown

### Breadcrumbs

- Pattern: `<< Parent > Current Page`
- Parent link: 13px, muted (`--text-secondary`), clickable, hover to gold
- Current page: 13px, `--text-primary`
- Optional right side: last activity timestamp in caption style

### Prospect Cards (Search Results)

Prospect search results are displayed as **horizontal cards**, not table rows.

- **Layout:** Avatar (48px) + info block + right action area
- **AI Insight block:** Gold left border (`--border-gold`), slightly elevated background
- **Wealth tier badges:** Graduated gold intensity based on tier level
- **Contact availability icons:** 28px circles, gold fill if data available, muted if unavailable
- Each card follows the standard surface treatment (gradient bg, subtle border, hover transition)

### Prospect Slide-Over Panel (480px)

Slides in from the right edge when a prospect card is clicked.

- **Trigger:** Click on prospect card
- **Backdrop:** Semi-transparent overlay, click or Escape to close
- **Width:** 480px on desktop (`lg`+), full-width on mobile
- **URL state:** Synced via query param (`?prospect=<id>`)
- **Sections (top to bottom):**
  1. Identity header (avatar, name, title, company)
  2. Quick info grid (location, net worth, age, etc.)
  3. Enrichment progress indicators
  4. AI-generated summary
  5. SEC filings / public records
  6. Notes
  7. List membership

### Empty States

- **Container:** Gradient card with 80px vertical padding
- **Icon:** 64px gold-tinted circle with Lucide icon inside
- **Heading:** Cormorant Garamond, 22px, `--text-primary`
- **Body:** 13px, `--text-secondary`, max-width 400px, centered
- **CTA (optional):** Gold button variant

```tsx
import { EmptyState } from "@/components/ui/empty-state";

<EmptyState
  icon={Search}
  title="No prospects found"
  description="Try adjusting your persona criteria or expanding your search radius"
>
  <Button variant="gold">Adjust Filters</Button>
</EmptyState>
```

### Data Tables

- **Header:** 11px uppercase, tracking 1px, `--text-tertiary`
- **Rows:** Subtle bottom border (`--border-subtle`), hover background `rgba(255,255,255,0.02)`
- **Currency values:** `font-mono`, gold text (`--gold-text`), right-aligned
- **Sort indicators:** `h-3.5 w-3.5`, muted at rest, bright when active

### Status Badges

```
inline-flex items-center rounded-[20px] px-2.5 py-0.5 text-xs font-semibold
```

Badges use graduated gold intensity or semantic colors depending on context. Always include icon + color + label (never color alone).

### Dialogs

- **Overlay:** Dark backdrop with blur
- **Content:** `--bg-card` gradient, `--border-default`, heavy shadow, `14px` border-radius
- **Title:** Cormorant Garamond, 22px, weight 600
- **Close:** Top-right X icon with `sr-only` label

---

## 10. Ambient Background

Two fixed radial gradients on the root element, positioned behind all content. These create the subtle warm atmosphere of the app.

```css
/* Pointer-events: none — purely decorative */
.ambient-glow-top {
  position: fixed;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.ambient-glow-bottom {
  position: fixed;
  bottom: -150px;
  left: -150px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(212,175,55,0.02) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
```

These gradients are subtle and should not compete with content. They provide a warm depth to the root background.

---

## 11. Scrollbar

Custom scrollbar styling for the application. Applied globally.

```css
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(212,175,55,0.15);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(212,175,55,0.25);
}
```

---

## 12. Page Transitions

Every page mounts with a fade-in animation. This provides a polished feel without being distracting.

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: fadeIn 0.4s ease forwards;
}
```

Apply `.page-enter` (or the equivalent Tailwind `animate-` class) to the root element of every page component.

---

## 13. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Default | < 640px | Mobile: single column, sidebar hidden, slide-over full-width |
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets: 2-column grids |
| `lg` | 1024px | Desktop: sidebar visible, slide-over 480px |
| `xl` | 1280px | Wide desktop: expanded data grids |

### Rules

1. Sidebar collapses on mobile (< 1024px) — hamburger menu toggle
2. Prospect slide-over panel is full-width on mobile, 480px on desktop
3. Data tables should scroll horizontally on mobile, not wrap
4. Test at: 375px, 768px, 1024px, 1440px

---

## 14. Accessibility

### Minimum Requirements

| Rule | Standard |
|------|----------|
| Text contrast | 4.5:1 (WCAG AA) |
| Large text contrast | 3:1 (WCAG AA) |
| Touch targets | 44x44px minimum |
| Focus indicators | Visible ring on all interactive elements |
| Alt text | All meaningful images |
| Aria labels | All icon-only buttons |
| Keyboard nav | Tab order matches visual order |
| Reduced motion | Respect `prefers-reduced-motion` |

### Color is Never the Only Indicator

Status must be communicated through **icon + color + label**, not color alone. Example: enrichment status uses icon shape (check, X, spinner) + color + text label.

---

## 15. File Structure

```
design-system/
  MASTER.md              <- This file. Global source of truth.
  pages/
    search.md            <- Persona cards + prospect result cards
    prospect-detail.md   <- Slide-over panel + full profile page
    dashboard.md         <- Tenant home, analytics charts, admin dashboard
    lists.md             <- Full-width list cards, Cormorant typography
```

Page-specific files document what **differs** from this Master. If a page follows the Master exactly, it does not need an override file.
