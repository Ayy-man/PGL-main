# Search — Page Override

> Overrides to MASTER.md for the search page (`/[orgId]/search`).
> Only deviations from the Master are documented here.

---

## Typography Overrides

This page uses a different font pairing from the global system.

| Role | Font | Replaces |
|------|------|----------|
| Headings, names, avatars | Cormorant Garamond | Playfair Display (`font-serif`) |
| Body, labels, subtitles | DM Sans | Inter (`font-sans`) |

Custom sizes are used instead of the Tailwind type scale — see sections below.

---

## Persona Selection View (default state, no results)

### Page Header

| Property | Value | Deviation from Master |
|----------|-------|-----------------------|
| H1 size | 38px, weight 500 | Master: `text-3xl font-bold` |
| H1 tracking | -0.5px | Master: default |
| H1 color | `--text-primary` | — |
| Subtitle | DM Sans, 14px, weight 300, `--text-tertiary` | Master body: `text-sm font-normal` |
| Margin below header | 48px | Master section gap: 24px |

### Persona Cards (replaces dropdown selector)

Grid: `grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`, gap 20px.

Master uses `gap-4` (16px) for grids — this page uses 20px.

#### Card Container

| Property | Value | Deviation from Master |
|----------|-------|-----------------------|
| Background | `--bg-card` gradient | Master: flat `bg-card` |
| Border radius | 14px | Master: `rounded-lg` (16px / 1rem) |
| Padding | 28px | Master: `p-6` (24px) |
| Hover border | `rgba(212,175,55,0.3)` transition | Master: `hover:bg-accent` + `hover:shadow-md` |
| Corner accent | Absolute top-right radial gradient gold glow | No Master equivalent |

#### Card Contents

1. **Name** — Cormorant Garamond, 22px, weight 600. Inline "Starter" badge beside name.
2. **Description** — 13px, weight 300, `--text-secondary`.
3. **Title tags** — flex-wrap chips: 11px, `--bg-elevated` background, `--border-default` border, padding 4px 10px, radius 6px. (Master badges: `rounded-sm px-2.5 py-0.5 text-xs font-semibold` — these are smaller and lighter.)
4. **Bottom row** — left: "~X,XXX matches" estimate; right: "Search →" in gold.

#### Create Persona Card

- Dashed border (no solid border)
- Centered 48px circle with "+" rendered in gold
- "Create Persona" label: 14px, weight 500
- Subtitle: "Custom filter combination", 12px, ghost-opacity

---

## Search Results View

### Results Header

| Element | Spec | Deviation from Master |
|---------|------|-----------------------|
| Back link | "← Back to personas", 12px, `--gold-muted` | No Master back-link pattern |
| H1 | Cormorant Garamond, 34px | Smaller than selection view H1 (38px) |
| Subtitle | Persona description + result count, DM Sans 14px | — |
| Right-side buttons | "Filters" ghost button + "Export CSV" gold button | — |

### Prospect Result Cards (replaces data table)

This page does **not** use the Master data table pattern. Results are a vertical card stack with 12px gap.

#### Card Container

| Property | Value | Deviation from Master |
|----------|-------|-----------------------|
| Layout | Flex row | Master table: row-based |
| Background | `--bg-card` | — |
| Border | 1px `--border-subtle`, radius 12px | Master cards: `rounded-lg` (16px) |
| Padding | 24px 28px | Master cards: `p-6` (24px uniform) |
| Hover | `--bg-card-hover`, `--border-hover` | Master cards: `hover:bg-accent` + `hover:shadow-md` |
| Cursor | `cursor-pointer` (opens slide-over panel) | — |

#### Card Layout — Left Section

Flex row, gap 18px (Master inline gap: 8px).

1. **Avatar** — 48px circle, hue-derived gradient background, initials in Cormorant Garamond 18px. (Master has no avatar pattern.)
2. **Info block:**
   - Name: Cormorant Garamond, 20px, weight 600. Wealth Tier Badge inline (see below).
   - Title · Company: 13px, `--text-secondary`.
   - Location: 12px, `--text-muted`.
   - AI Insight block: gold left border, gold-tinted background, "AI INSIGHT" label in uppercase. (No Master equivalent.)

#### Card Layout — Right Section

Flex column, gap 12px, aligned to card end.

1. **Contact icons** — 28px circles. Gold fill if data available, muted if not. Icons for email, phone, LinkedIn. (Master uses text-based status badges — these are icon-only circles.)
2. **"+ Add to List" button** — small, gold-style. (Master action button: `variant="ghost"` with `hover:text-gold`.)

### Wealth Tier Badges

Custom graduated gold intensity — does **not** use the Master semantic badge system.

| Tier | Background | Border | Text |
|------|-----------|--------|------|
| $500M+ | `rgba(212,175,55,0.25)` | `rgba(212,175,55,0.6)` | `#f0d060` |
| $100M+ | `rgba(212,175,55,0.15)` | `rgba(212,175,55,0.4)` | `#d4af37` |
| $50M+ | `rgba(212,175,55,0.08)` | `rgba(212,175,55,0.25)` | `#c4a030` |
| $30M+ | `rgba(212,175,55,0.05)` | `rgba(212,175,55,0.15)` | `#a08828` |

All tiers: padding 3px 10px, radius 20px (`rounded-full`), 11px weight 600.

These use raw rgba/hex values intentionally — the graduated opacity scale does not map to a single token.

### Pagination

| Property | Value | Deviation from Master |
|----------|-------|-----------------------|
| Layout | Centered flex row, gap 8px | No Master pagination pattern defined |
| Active page | Gold background, gold border, gold text | — |
| Inactive page | `rgba(255,255,255,0.02)` background | — |

---

## Empty States

Three variants (unchanged from previous design):

1. **No persona selected** — Search icon + "Select a persona to search"
2. **No results** — Search icon + "No prospects found"
3. **Error** — AlertCircle icon + error message + "Try Again" button with `border-destructive/30`

All should use the shared `<EmptyState>` component.
