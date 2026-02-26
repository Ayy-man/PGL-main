# Phase 5: UI Revamp — Apply Design System - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning
**Source:** Design system documentation (design-system/MASTER.md + page overrides)

<domain>
## Phase Boundary

This phase transforms the entire UI from its current state (raw Tailwind colors, Playfair Display/Inter fonts, flat surfaces) to match the comprehensive design system documented in `design-system/MASTER.md`. Every page, component, and interaction state must conform to the dark luxury aesthetic with gold accents, layered glass surfaces, and the Cormorant Garamond + DM Sans font pairing.

**In scope:** All existing pages and components — sidebar, top bar, dashboard, search, lists, prospect detail (slide-over + full profile), admin dashboard, analytics, settings, empty states, data tables, dialogs, badges.

**Out of scope:** New features, new pages, backend changes, API changes. This is purely visual/CSS/component refactoring.

</domain>

<decisions>
## Implementation Decisions

### Color System
- All colors defined as CSS custom properties in globals.css
- Components use Tailwind token classes only — never raw Tailwind colors or inline hex/rgba
- Replace all `zinc-*`, `gray-*`, `emerald-*`, `yellow-*` with CSS variable tokens
- Background: `--bg-root: #08080a` (near-black), surfaces use gradient overlays, never flat solid colors
- Gold accent: `--gold-primary: #d4af37` — for emphasis and wealth signals, do not overuse
- Text hierarchy: `--text-primary: #e8e4dc`, secondary at 50% opacity, tertiary at 40%, muted at 25%
- All new colors must be CSS variables first, then mapped in tailwind.config.ts

### Typography
- Headings (h1-h3, card titles): Cormorant Garamond (`font-serif`), loaded via Google Fonts
- Body/UI (buttons, labels, nav, forms): DM Sans (`font-sans`)
- Code/Data: JetBrains Mono (`font-mono`)
- Type scale: h1=38px/500, h2=34px/500, h3=22px/600, body=13px/400, caption=12px, label=11px uppercase
- Cormorant Garamond is for h1/h2/h3/card titles ONLY — never for body, labels, or buttons

### Surface Treatment
- Every card/panel uses `--bg-card` gradient at rest, transitions to `--bg-card-hover` on hover
- Borders: `--border-subtle` at rest, `--border-hover` (gold-tinted) on hover
- Never flat solid color for any surface — always gradient or transparent overlay
- Elevated surfaces (popovers, dropdowns) use `--bg-elevated` with backdrop blur

### Border Radius
- Cards/panels: 14px
- Buttons/inputs: 8px
- Badges/pills: 20px (fully rounded)
- Avatars: 50%

### Interaction States
- Two button variants: Ghost (secondary) and Gold (primary)
- All interactive elements: `transition: all 0.2s ease`, never exceed 300ms
- Every clickable element must have `cursor-pointer`
- Focus states: visible ring on all focusable elements, gold-tinted for inputs

### Sidebar (220px)
- Gradient background, gold accent line on right edge
- Team header: 36px icon with gold gradient
- Nav items: 8px radius, active = gold bg + text + left-border accent
- Footer: app name + version in ghost text

### Top Bar (56px, sticky)
- Semi-transparent with backdrop blur
- Left: Command palette search (320px, Cmd+K badge)
- Right: Notification bell + user avatar dropdown

### Icons
- Lucide React ONLY — no Heroicons, Font Awesome, or emojis
- Sizes: xs=3.5, sm=4, md=5, lg=8
- Always `shrink-0` in flex containers

### Ambient Background
- Two fixed radial gradients (gold-tinted, very subtle) on root element
- Top-right and bottom-left positioned, pointer-events none

### Custom Scrollbar
- 6px width, gold-tinted thumb, transparent track

### Page Transitions
- Every page mounts with fadeIn animation (0.4s ease)

### Claude's Discretion
- Order of component refactoring (which pages first)
- How to structure the CSS variable definitions in globals.css
- Whether to create shared utility components for common patterns
- Migration strategy (big bang vs incremental per page)

</decisions>

<specifics>
## Specific Ideas

### Page-Specific Overrides (from design-system/pages/)
- **Dashboard:** Cormorant greeting heading at 38px/600, persona cards as primary content, stat pills (not full cards)
- **Search:** Persona selection cards (340px min, 20px gap, corner gold accent), prospect result cards (not tables), wealth tier badges with graduated gold intensity
- **Lists:** Full-width horizontal cards, Cormorant for list names (20px/600), member count in Cormorant 22px gold
- **Prospect Detail:** Slide-over panel (480px, slide from right), full profile page with tab bar, activity timeline, gold-heavy for wealth signals

### Migration Map (from prospect-detail.md)
| Current | Replace with |
|---------|-------------|
| `bg-zinc-950` | `bg-background` |
| `bg-zinc-900` | `bg-card` |
| `border-zinc-800` | `border` |
| `text-zinc-100/300` | `text-foreground` |
| `text-zinc-400/500` | `text-muted-foreground` |
| `hover:bg-zinc-700/850` | `hover:bg-accent` |
| `#f4d47f` / `#d4af37` | `text-gold` / `border-gold` |
| `text-green-500` | `text-success` |
| `text-red-500` | `text-destructive` |
| `text-blue-400` | `text-info` |
| `text-orange-500` | `text-warning` |

</specifics>

<deferred>
## Deferred Ideas

- Full prospect profile page (P1 — build after slide-over panel is functional)
- Light mode support (explicitly out of scope — forced dark)
- Per-tenant theming (CSS variables defined but not connected to tenant config)

</deferred>

---

*Phase: 05-ui-revamp*
*Context gathered: 2026-02-26 from design system documentation*
