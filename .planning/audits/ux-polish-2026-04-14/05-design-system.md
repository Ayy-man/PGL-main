# Design System Consistency Audit

Scope: `src/components/ui/*` primitives + consumer-side typography, CTA and empty-state discipline. Dark-mode is the live theme (confirmed by `globals.css` `.dark` block holding the gold tokens).

---

## Token Vocabulary (from `tailwind.config.ts` + `src/app/globals.css`)

### Fonts
- `--font-sans` = `DM Sans, sans-serif` — use `font-sans`
- `--font-serif` = `Cormorant Garamond, serif` — use `font-serif` (headings, card titles, dialog titles)
- `--font-mono` = `JetBrains Mono, monospace`

### Gold scale (dark mode)
- `--gold-primary` = `#d4af37`
- `--gold-bright` = `#f0d060`
- `--gold-text` = `rgba(212,175,55,0.7)`
- `--gold-bg` = `rgba(212,175,55,0.08)`
- `--gold-bg-strong` = `rgba(212,175,55,0.15)`
- `--border-gold` = `rgba(212,175,55,0.25)`
- `--ring` = `oklch(0.84 0.10 85)` (gold-tuned)
- Tailwind tokens exposed: `bg-gold` (`var(--gold)`), `text-gold-text`, `bg-gold-bg`, `bg-gold-bg-strong`, `border-border-gold`, `text-gold-primary`, `text-gold-bright`
- Button variants available: `gold` (low-opacity fill + border) and `gold-solid` (bright #d4af37 fill + glow)

### Surfaces / text
- `bg-background`, `bg-card`, `bg-popover`, `bg-bg-elevated`, `bg-bg-input-custom`
- `text-foreground`, `text-muted-foreground`, `text-text-tertiary`, `text-text-ghost`
- `border` (default), `border-subtle`, `border-hover`, `border-gold`, `border-sidebar`

### Radii (system intent)
- `rounded-card` = `14px` — Card / Dialog / Sheet
- `rounded-btn` = `8px` — Buttons (explicitly `rounded-[8px]` in variants today)
- `rounded-badge` = `20px` — Badges (only `rounded-full` used today)
- `rounded-lg` = `var(--radius)` = `1rem`
- `rounded-md` = `calc(var(--radius) - 2px)` ≈ 14px
- `rounded-sm` = `calc(var(--radius) - 4px)` ≈ 12px

### Elevations (dark)
- `--card-shadow` = `0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)`
- `--card-shadow-hover` = `0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25)`
- `.glow-gold-sm/.glow-gold/.glow-gold-lg` utilities exist (gold-tinted box-shadow)
- `.heading-glow`, `.text-glow` utilities exist (gold text-shadow)

### Motion
- Most primitives: `transition-all duration-200` or `transition-colors duration-150`
- No shared easing curve (default `ease`).
- `active:scale-[0.97]` on Button only (not on Checkbox, Badge, Tag, etc.)
- `@keyframes shimmer`, `fadeIn`, `stagger-in`, `slide-up`, `scale-check`, `fadeInUp`, `pulse-subtle` defined in `globals.css` — most primitives do NOT consume them.

---

## A. Primitive-level findings

### ui/button.tsx

#### Finding: `default` variant is neutral tan, not gold — so every `<Button>` without an explicit variant renders the un-branded primary color
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/button.tsx:12-13`
- **Current**: `default: "bg-primary text-primary-foreground shadow rounded-[8px] hover:bg-primary/90"` — `--primary` in dark mode is `oklch(0.7392 0.0579 66.7290)` (pale tan), NOT gold.
- **Fix**: Either make `default` alias `gold-solid`, or change consumers to use `variant="gold-solid"` for primary CTAs. Recommended: set `defaultVariants.variant = "gold-solid"`, and rename today's `default` to `neutral`. (See C-1 below for consumer scan.)

#### Finding: Button motion is `transition-all duration-200` but no easing token
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/ui/button.tsx:8`
- **Current**: `transition-all duration-200 active:scale-[0.97]`
- **Fix**: append `ease-out` for consistent deceleration: `transition-all duration-200 ease-out`. Apply same easing to Input / Textarea / Select.

#### Finding: `ghost` variant relies on raw rgba not `bg-bg-elevated` / `border-subtle`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/button.tsx:21`
- **Current**: `bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-foreground/60 rounded-[8px] hover:border-[rgba(255,255,255,0.15)] hover:text-foreground`
- **Fix**: `bg-bg-elevated border border-border-subtle text-foreground/60 rounded-[8px] hover:border-border-hover hover:text-foreground` — uses tokens that rethemify with tenant.

#### Finding: `gold` / `gold-solid` variants hard-code `#d4af37` and `rgba(212,175,55,*)` — bypasses tenant-theme override
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/button.tsx:23-26`
- **Current**: `bg-[rgba(212,175,55,0.1)] ... text-[#d4af37]` and `bg-[#d4af37] text-[#0a0a0a] ... shadow-[0_0_20px_rgba(212,175,55,0.2)]`
- **Fix**: `bg-gold-bg border border-border-gold text-gold-primary font-semibold rounded-[8px] hover:bg-gold-bg-strong` and `bg-gold-primary text-[var(--gold-foreground)] font-bold rounded-[8px] glow-gold hover:bg-gold-bright`. Tenant-theme picker (`tenant-theme.ts:52-57`) overrides exactly these `--gold-*` vars — hard-coded hex won't follow the override, so sapphire/emerald tenants still get gold buttons.

#### Finding: `link` variant lacks focus ring, hover underline only
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/button.tsx:22`
- **Current**: `text-primary underline-offset-4 hover:underline`
- **Fix**: `text-gold-primary underline-offset-4 hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-sm` — ring already inherited from base class but text color should route through gold.

### ui/input.tsx

#### Finding: Hard-coded `rgba(212,175,55,0.15)` in focus shadow — won't follow tenant theme
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/input.tsx:11`
- **Current**: `focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]`
- **Fix**: `focus-visible:shadow-[0_0_0_3px_var(--gold-bg-strong)]` — same visual, theme-aware.

#### Finding: Input uses `bg-transparent` — no resting elevation, feels unfinished against card surfaces
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/input.tsx:11`
- **Current**: `bg-transparent`
- **Fix**: `bg-bg-input-custom` (exposed in tailwind config, maps to `--bg-input`, already defined). Matches card-on-card nesting pattern.

### ui/textarea.tsx

#### Finding: Same hard-coded gold focus shadow as Input
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/textarea.tsx:12`
- **Current**: `focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]`
- **Fix**: `focus-visible:shadow-[0_0_0_3px_var(--gold-bg-strong)]`.

#### Finding: Same transparent bg as Input
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/textarea.tsx:12`
- **Fix**: `bg-bg-input-custom`.

### ui/select.tsx

#### Finding: Same hard-coded gold focus shadow (`SelectTrigger`)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/select.tsx:22`
- **Current**: `focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]`
- **Fix**: `focus:shadow-[0_0_0_3px_var(--gold-bg-strong)]`.

#### Finding: `SelectItem` no hover-gold highlight — uses generic `focus:bg-accent`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/components/ui/select.tsx:121`
- **Current**: `focus:bg-accent focus:text-accent-foreground`
- **Fix**: `focus:bg-gold-bg focus:text-gold-primary` so keyboard-navigated option matches dropdown menu row-hover-gold pattern elsewhere in the app.

#### Finding: `SelectItem` check indicator uses inherited currentColor — should be gold on selected
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/select.tsx:128`
- **Fix**: add `className="h-4 w-4 text-gold-primary"` on `<Check>`.

### ui/checkbox.tsx

#### Finding: Checked state uses neutral `bg-primary` (tan), not gold — breaks the "gold = selected" signal
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/checkbox.tsx:16`
- **Current**: `border-primary ... data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`
- **Fix**: `border-border-subtle data-[state=checked]:bg-gold-primary data-[state=checked]:border-gold-primary data-[state=checked]:text-[var(--gold-foreground)]`.

#### Finding: No hover state — checkbox sits static until clicked
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/checkbox.tsx:16`
- **Fix**: add `hover:border-gold-primary/60` to resting class list.

### ui/label.tsx

#### Finding: Already consistent — minimal primitive, no issues.
- Status: luxury-grade.

### ui/badge.tsx

#### Finding: `default` variant uses neutral `bg-primary`, not gold — saved/active-state badges fall into tan
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/badge.tsx:11-12`
- **Current**: `default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80"`
- **Fix**: swap default to use `bg-gold-bg border-border-gold text-gold-primary` (i.e. make current `gold` variant the default), or force consumers to explicitly choose a variant and rename default to `neutral`.

#### Finding: `success`/`warning`/`info` use hard-coded hex — `--success`, `--warning`, `--info` tokens exist and are unused
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/badge.tsx:19-23`
- **Current**:
  - `success: "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.3)]"`
  - `warning: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]"`
  - `info: "bg-[rgba(96,165,250,0.15)] text-[#60a5fa] border-[rgba(96,165,250,0.3)]"`
- **Fix**:
  - `success: "bg-success-muted text-success border-success/30"`
  - `warning: "bg-warning-muted text-warning border-warning/30"`
  - `info: "bg-info-muted text-info border-info/30"`
- These oklch tokens already exist in `globals.css:51-56`.

#### Finding: `gold` / `gold-solid` hard-code hex — same tenant-theme leak as Button
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/badge.tsx:24-27`
- **Fix**: `gold: "bg-gold-bg text-gold-primary border-border-gold"` and `"gold-solid": "border-transparent bg-gold-primary text-[var(--gold-foreground)] font-bold shadow-[0_0_10px_var(--gold-bg-strong)]"`.

#### Finding: Radius inconsistent with system — tailwind declares `rounded-badge: 20px` but primitive uses `rounded-full`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/badge.tsx:7`
- **Current**: `rounded-full`
- **Fix**: `rounded-badge` (or delete the `badge: 20px` token from `tailwind.config.ts:103` — decide on one. `rounded-full` is fine for pills but `rounded-badge` is defined and unused; pick one and delete the orphan.)

### ui/wealth-tier-badge.tsx

#### Finding: Entire gold scale inlined as hex — won't rethemify, duplicates button hex
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/wealth-tier-badge.tsx:10-37`
- **Current**: four tiers with `rgba(212,175,55,*)` bg/border and `#f0d060 / #d4af37 / #c4a030 / #a08828` text
- **Fix**: use CSS variables — e.g. for $500M+: `{ bg: "var(--gold-bg-strong)", border: "rgba(212,175,55,0.6)", text: "var(--gold-bright)" }`, for $100M+: `{ bg: "var(--gold-bg-strong)", border: "var(--border-gold)", text: "var(--gold-primary)" }`, for $50M+/$30M+: `{ bg: "var(--gold-bg)", border: "var(--border-gold)", text: "var(--gold-text)" }`. The `#c4a030 / #a08828` tints are custom darker shades — if you want to keep the tiered value signal, leave those two hexes (but doc them as `tier-3/tier-4`) and fix only tier-1/tier-2.
- Status rainbow check: all four tiers are gold-family. ✓

### ui/enrichment-status-dots.tsx

#### Finding: Uses `var(--success/info/warning/destructive)` for dot color ✓ but hard-codes glow rgba — glows won't rethemify
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/enrichment-status-dots.tsx:20-32`
- **Current**: `boxShadow: "0 0 6px rgba(34,197,94,0.6)"` etc.
- **Fix**: reuse the existing utility classes from `globals.css:336-347`: `.dot-glow-green`, `.dot-glow-blue`, `.dot-glow-red`, `.dot-glow-amber` — switch from inline style to className. Eliminates the duplicate rgba and lets the utilities become the single source of truth.

### ui/card.tsx

- Uses `.surface-card` utility (gold-tinted hover, themed border) and `font-serif` on CardTitle. Consistent.
- Status: luxury-grade. ✓

### ui/dialog.tsx

#### Finding: `DialogContent` sets inline `style={{ background: "var(--bg-floating)" }}` — can't be overridden by className
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/dialog.tsx:44`
- **Current**: `style={{ background: "var(--bg-floating)", border: "1px solid var(--border-default)" }}`
- **Fix**: move to className — Tailwind arbitrary: `bg-[var(--bg-floating)] border border-[var(--border-default)]`. Inline styles block consumer overrides via `className`.

#### Finding: DialogClose icon hover lacks gold affordance
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/dialog.tsx:48`
- **Current**: `transition-opacity hover:opacity-100`
- **Fix**: add `hover:text-gold-primary` so the close affordance signals interactivity in the luxury palette.

### ui/sheet.tsx

#### Finding: `sheetVariants` uses flat `bg-background` — no floating elevation or border-default (inconsistent with Dialog which uses `--bg-floating`)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/sheet.tsx:34`
- **Current**: `"fixed z-50 gap-4 bg-background p-6 shadow-lg ..."`
- **Fix**: `"fixed z-50 gap-4 bg-[var(--bg-floating)] border-l border-[var(--border-default)] p-6 shadow-2xl ..."` — matches Dialog and matches `.dark` token `--bg-floating: #141416`.

#### Finding: SheetTitle NOT using Cormorant — breaks heading ladder
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/sheet.tsx:111`
- **Current**: `"text-lg font-semibold text-foreground"`
- **Fix**: `"font-serif text-lg sm:text-[22px] font-semibold leading-none tracking-tight text-foreground"` — mirrors `DialogTitle` (`dialog.tsx:92`). Currently sheet titles render in DM Sans, dialog titles render in Cormorant. Same headline hierarchy → inconsistent font.

### ui/dropdown-menu.tsx

#### Finding: Popover content uses generic `bg-popover` — no gold hover on items
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/components/ui/dropdown-menu.tsx:87,103,127`
- **Current**: `focus:bg-accent focus:text-accent-foreground` — accent is a neutral tan, not gold
- **Fix**: `focus:bg-gold-bg focus:text-gold-primary` on `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem` (three locations). Matches `.row-hover-gold` pattern used elsewhere and makes keyboard nav visible.

### ui/tooltip.tsx

#### Finding: Tooltip uses `bg-primary text-primary-foreground` — neutral tan on dark, very low contrast
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/tooltip.tsx:23`
- **Current**: `bg-primary px-3 py-1.5 text-xs text-primary-foreground`
- **Fix**: `bg-[var(--bg-floating-elevated)] border border-[var(--border-default)] px-3 py-1.5 text-xs text-foreground shadow-[var(--card-shadow-hover)]` — reuses the floating-elevated token that already exists (`globals.css:140`) and gives tooltips the same treatment as dialogs/sheets.

### ui/loader.tsx

#### Finding: Hard-coded `rgba(212,175,55,0.6)` / `rgba(212,175,55,0.7)` — no tenant rethemification
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/loader.tsx:33,75`
- **Current**: spinner `border-t-[rgba(212,175,55,0.7)]`, pulse `bg-[rgba(212,175,55,0.6)]`
- **Fix**: spinner `border-t-[var(--gold-text)]`, pulse `bg-[var(--gold-text)]`. Dots variant uses `bg-foreground/40` which is fine.

### ui/shimmer.tsx

#### Finding: Rgba literals throughout — `ShimmerLine`, `ShimmerBlock`, `ShimmerCard` all use raw `rgba(255,255,255,*)`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/shimmer.tsx:45,68,89,95,96`
- **Current**: `bg-[rgba(255,255,255,0.06)]` / `bg-[rgba(255,255,255,0.04)]` / `border-[rgba(255,255,255,0.06)]` / `bg-[rgba(255,255,255,0.08)]`
- **Fix**: `bg-bg-elevated` (`--bg-elevated: rgba(255,255,255,0.04)` already matches) or `bg-border-subtle`, `border-border-subtle`. Removes one more rgba literal site.

#### Finding: Shimmer uses `animate-pulse` not the custom `.shimmer-skeleton` utility in globals.css
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: `src/components/ui/shimmer.tsx:45,68,95,96`
- **Current**: `animate-pulse` (opacity fade)
- **Fix**: `shimmer-skeleton` utility (`globals.css:491-495`) — gives a moving gradient shimmer, which is the luxury affordance. Currently `Skeleton` uses it (`skeleton.tsx:9`) but `Shimmer*` primitives don't — two loading components with different feels.

### ui/skeleton.tsx

- Uses `shimmer-skeleton` + `bg-muted` + `rounded-md`. Consistent.
- Status: luxury-grade. ✓

### ui/empty-state.tsx

- Uses `.surface-card`, `font-serif` title, `var(--gold-bg)` icon backdrop, `var(--gold-muted)` icon color. Consistent.
- Status: luxury-grade. ✓

### ui/confirmation.tsx

#### Finding: Rgba literals instead of tokens (border, bg)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/confirmation.tsx:38,39`
- **Current**: `border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]`, destructive `border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)]`
- **Fix**: `border-border-subtle bg-bg-elevated` and `border-destructive/20 bg-destructive/5`.

#### Finding: ConfirmationIcon uses `text-yellow-400 / text-blue-400 / text-red-400` Tailwind defaults (not warning/info/destructive tokens)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/confirmation.tsx:86-88`
- **Current**:
  - `"bg-[rgba(234,179,8,0.12)] text-yellow-400"`
  - `"bg-[rgba(59,130,246,0.12)] text-blue-400"`
  - `"bg-[rgba(239,68,68,0.12)] text-red-400"`
- **Fix**:
  - `"bg-warning-muted text-warning"`
  - `"bg-info-muted text-info"`
  - `"bg-destructive/15 text-destructive"`
- Same principle as badge `success/warning/info`: tokens exist, don't re-hex.

### ui/breadcrumbs.tsx

- Uses `var(--gold-primary)`, `var(--text-secondary-ds)`, `var(--text-tertiary)`. Consistent — but inline `style={{ color: ... }}` onMouseEnter/Leave instead of CSS classes.
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/breadcrumbs.tsx:40-47`
- **Fix**: replace `onMouseEnter/Leave` with `className="hover:text-gold-primary transition-colors duration-150"`. Less code, no React re-render on hover.

### ui/tag-input.tsx

#### Finding: Hard-coded gold tag chip styling + hard-coded `#1a1a1a` suggestion dropdown bg
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/tag-input.tsx:72-77,117`
- **Current**:
  - chip: `background: "rgba(212,175,55,0.15)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.3)"`
  - dropdown: `background: "#1a1a1a"` (inline)
- **Fix**: chip → `className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-gold-bg-strong text-gold-primary border border-border-gold"`. Dropdown → `bg-[var(--bg-floating-elevated)]` (which IS `#1a1a1e` in the dark tokens — nearly identical but theme-aware).

#### Finding: Suggestion button uses inline `onMouseEnter/Leave` to set hover bg — same anti-pattern as breadcrumbs
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/tag-input.tsx:131-136`
- **Fix**: `className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gold-bg"`.

### ui/toast.tsx

#### Finding: No gold variant for success — success toasts fall to `default: "border bg-background text-foreground"` which is flat
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/ui/toast.tsx:32`
- **Current**: only `default` and `destructive` variants.
- **Fix**: add `success: "border-success/30 bg-success-muted text-foreground"` (tokens exist) so success toasts read gold-adjacent green instead of plain background.

#### Finding: ToastAction uses `hover:bg-secondary` (tan) not gold
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/toast.tsx:65`
- **Fix**: `hover:bg-gold-bg hover:text-gold-primary hover:border-border-gold`.

#### Finding: ToastClose destructive-state uses raw `text-red-300 / text-red-50 / focus:ring-red-400 / focus:ring-offset-red-600`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/toast.tsx:80`
- **Fix**: use `text-destructive-foreground` and `focus:ring-destructive` variants.

### ui/theme-picker.tsx

- Uses inline style for gradient swatches, which is load-bearing (computed per theme). Acceptable.
- Status: luxury-grade. ✓

### ui/logo-upload.tsx

#### Finding: Error text uses raw `oklch(0.62 0.19 22)` (bespoke red) rather than `text-destructive`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/logo-upload.tsx:232`
- **Current**: `style={{ color: "oklch(0.62 0.19 22)" }}`
- **Fix**: `className="mt-2 text-xs text-destructive"`.

### ui/data-table/data-table.tsx

#### Finding: Empty-state cell is raw "No results." text — doesn't use `<EmptyState>` primitive
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/ui/data-table/data-table.tsx:144-152`
- **Current**: `<TableCell ... className="h-24 text-center text-muted-foreground">No results.</TableCell>`
- **Fix**: render `<TableCell colSpan={columns.length} className="p-0"><EmptyState icon={Search} title="No results" description="Try adjusting filters or search terms." /></TableCell>`. Aligns the table-level empty state with list/persona/exports pages.

#### Finding: Row hover override — duplicates TableRow's gold hover, then loses it
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/ui/data-table/data-table.tsx:132`
- **Current**: `className="hover:bg-muted/50 transition-colors"` — overrides TableRow base class which had `hover:bg-[rgba(212,175,55,0.04)]` (see `table.tsx:61`)
- **Fix**: drop the override, or change to `className="row-hover-gold transition-colors"` to keep the gold hover.

### ui/data-table/data-table-pagination.tsx

- Uses `<span className="text-gold">{currentPage}</span>` (gold token) and `variant="outline"` buttons. Consistent.
- Status: luxury-grade. ✓

### ui/table.tsx

- Uses gold `text-[rgba(212,175,55,0.7)]` column headers and gold row hover. Could be tokenized (`text-gold-text`) but already themed.
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/ui/table.tsx:76`
- **Current**: `text-[rgba(212,175,55,0.7)]`
- **Fix**: `text-gold-text` (token maps to same rgba).

---

## B. Typography ladder findings

### State of the ladder
`font-serif` (Cormorant) is applied to H1/H2/H3 consistently across `src/app/**` (23+ hits verified). `Card.CardTitle` and `Dialog.DialogTitle` ship with `font-serif` baked in.

### Outliers

#### B-1. `src/app/suspended/page.tsx:35`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **Current**: `<h1 className="text-2xl font-semibold text-foreground">` — no `font-serif`
- **Fix**: `<h1 className="font-serif text-2xl font-semibold text-foreground">`. Only page-level H1 missing the serif.

#### B-2. `src/components/ui/sheet.tsx:111` (`SheetTitle`)
- Covered in primitive section — SheetTitle lacks `font-serif`. This causes every side-drawer heading (prospect slide-over, filters panel, etc.) to render in DM Sans.

#### B-3. `src/components/ui/confirmation.tsx:109` (`ConfirmationTitle`)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **Current**: `"text-sm font-semibold text-foreground"`
- **Fix**: tight inline confirmation titles are short, so `font-serif` may feel large at `text-sm`. Either bump to `font-serif text-base font-semibold tracking-tight` or accept as a deliberate "small heading" exception. Flag, don't auto-fix.

#### B-4. Heading scale fragmentation
- H1 pages use `text-2xl` (auth) vs `text-3xl` (app pages) vs `text-xl md:text-2xl` (`admin/automations/page.tsx:108`). Three scales for the same role.
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **Fix**: document 2-step ladder in this audit and normalize: `font-serif text-3xl font-bold tracking-tight` for page H1, `font-serif text-xl font-semibold tracking-tight` for section H2. Auth pages can keep `text-2xl` (narrow card context) but call it out.

### No body-text-serif regressions found
Grep across `src/` finds no body copy using `font-serif` — serif discipline is clean on the body side.

---

## C. Gold accent discipline findings

### C-1. Primary CTAs not using gold
Of ~48 `<Button>` variant declarations, only 5 files use `variant="gold"` and submit buttons without a `variant` prop fall through to `default` (tan `bg-primary`). Verified:

- **`src/app/[orgId]/lists/components/create-list-dialog.tsx:95`** — `<Button type="submit" disabled={isSubmitting}>` renders tan, not gold. Primary CTA of the dialog.
- **`src/app/[orgId]/personas/components/persona-form-dialog.tsx:492`** — "Save Search" primary submit, no variant.
- **`src/app/admin/tenants/new/page.tsx:135`** — Create tenant submit, no variant.
- **`src/app/admin/users/new/page.tsx:153`** — Create user submit, no variant.
- **`src/app/[orgId]/settings/page.tsx:109,236`** — Two settings submit buttons, no variant.
- **`src/app/[orgId]/settings/organization/page.tsx:161`** — Org settings submit, no variant.
- **`src/app/onboarding/confirm-tenant/page.tsx:339`** — Confirm tenant submit, no variant.
- **`src/app/onboarding/set-password/page.tsx:116`** — Set password submit, no variant.
- **`src/app/[orgId]/team/invite-dialog.tsx:184`** — Invite team member submit, no variant.

- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **Fix**: either (a) add `variant="gold-solid"` to each submit, or (b) change `button.tsx` `defaultVariants.variant` to `"gold-solid"` and re-audit destructive/cancel cases. (b) is the single biggest leverage point in this audit.

### C-2. Selected/active state inconsistency
- **`Checkbox`** → tan `bg-primary` (primitive issue, covered).
- **`SelectItem`** active → tan `bg-accent` (primitive issue, covered).
- **`DropdownMenuItem`** active → tan `bg-accent` (primitive issue, covered).
- **Table row selected** → `data-[state=selected]:bg-muted` (neutral) at `table.tsx:61`. Selected rows of the data-table don't signal gold; the gold hover signal disappears on click.
  - Fix: change to `data-[state=selected]:bg-gold-bg`.

### C-3. Indigo/blue/emerald leaks in consumers
Only 6 files found:
- `src/app/admin/reports/[id]/report-detail.tsx:81` — `bg-blue-500/10 text-blue-400` for `investigating` status
- `src/app/admin/reports/reports-table.tsx:67` — same
- `src/app/admin/tenants/new/page.tsx:74` — `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` for success notice
- `src/components/ui/confirmation.tsx:87` — blue "info" variant (covered above)
- `src/components/research/research-result-card.tsx:48` — `bg-emerald-500` dot
- `src/components/research/channel-status-bar.tsx:63` — `bg-emerald-500` dot

- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **Fix**: blues → `bg-info-muted text-info`. Emeralds → `bg-success-muted text-success` (oklch success = green-family and tenant-aware).

### C-4. Wealth-tier badges
All four tiers use gold-family hues. ✓ No rainbow risk.

### C-5. Focused input field
Inputs, Textareas, Selects all flash gold via `focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]`. ✓ Consistent — just not tokenized (see primitive fixes).

### C-6. Success toast missing gold/green tint
Covered above (ui/toast.tsx). Currently a success toast looks identical to a neutral one.

---

## D. Empty state coverage findings

### Pages using `<EmptyState>` (good)
- `src/app/[orgId]/lists/[listId]/page.tsx:93` — "No prospects in this list yet"
- `src/app/[orgId]/lists/components/lists-page-client.tsx:40` — "No lists yet"
- `src/app/[orgId]/personas/page.tsx`
- `src/app/[orgId]/exports/components/export-log-client.tsx:216`
- `src/components/dashboard/recent-exports-table.tsx:68`
- `src/app/[orgId]/search/components/search-content.tsx`, `saved-searches-tab.tsx`
- `src/components/dashboard/persona-pill-row.tsx`

### Raw "No X" strings (need `<EmptyState>` or at least a consistent inline pattern)

#### D-1. `src/app/[orgId]/team/page.tsx:135, 216`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **Current**: raw table-cell text "No team members found. Invite your first team member to get started."
- **Fix**: replace with `<EmptyState icon={Users} title="No team members yet" description="Invite your first team member to get started."><Button variant="gold-solid">Invite member</Button></EmptyState>` outside the table, or render inside a colSpan cell with `<EmptyState>`.

#### D-2. `src/components/ui/data-table/data-table.tsx:150`
- Covered in primitive section A — raw "No results." needs `<EmptyState>`.

#### D-3. `src/components/activity/activity-log-viewer.tsx:146`
- **Current**: `<p className="text-muted-foreground">No activity found</p>`
- **Fix**: `<EmptyState icon={ClockIcon} title="No activity yet" description="Actions your team takes will appear here." />`.

#### D-4. `src/components/prospect/timeline-feed.tsx:544`, `src/components/admin/tenant-activity-card.tsx:407,652`, `src/app/[orgId]/personas/components/live-data-stream.tsx:156`
- **Current**: bare "No activity yet" / "No activity found" strings.
- **Fix**: same pattern.

#### D-5. `src/components/admin/platform-pulse-modal.tsx:509`, `src/components/admin/funnel-chart.tsx:72`
- **Current**: bare "No activity data" / "No activity yet. Search and export prospects to see funnel data."
- **Fix**: `<EmptyState>` with a chart-appropriate icon (BarChart3, Activity).

#### D-6. `src/components/charts/usage-chart.tsx:42`
- **Current**: `<p className="text-muted-foreground">No data available for this period</p>`
- **Fix**: `<EmptyState icon={LineChart} title="No data this period" description="Select a wider date range or check back after activity." />`.

#### D-7. `src/components/prospect/lead-owner-select.tsx:214` — "No team members" inside a select
- Acceptable as inline text since it's inside a select dropdown. Leave.

#### D-8. `src/components/layout/command-search.tsx:171` — "No results for {query}"
- Acceptable: cmdk pattern expects terse inline text. Leave (but can tint with `text-muted-foreground` — already is).

#### D-9. `src/components/prospect/research-panel.tsx:310` — long inline "No results found" string
- **Current**: rendered as regular paragraph
- **Fix**: wrap in `<EmptyState icon={SearchX} title="No results" description="Try rephrasing your question..." />`.

#### D-10. `src/components/prospect/add-to-list-dialog-profile.tsx:108`, `src/app/[orgId]/search/components/search-content.tsx:1337`, `src/app/[orgId]/search/components/add-to-list-dialog.tsx:110`
- Dialog-body empty states: "No lists yet" with a CTA button. Already have an icon and button — they're inline mini-empty-states.
- **Fix**: convert to `<EmptyState variant="default" icon={ListPlus} title="No lists yet"><Button variant="gold" size="sm" asChild>...</Button></EmptyState>` for consistency. Three places.

#### D-11. `src/app/[orgId]/exports/components/export-stat-cards.tsx:189`
- Inside a stat card showing "No exports yet" — acceptable as tight stat-card text. Leave.

---

## Top 10 impact-to-effort picks

1. **Button `default` variant → gold-solid (or ship `gold-solid` on every primary CTA).** One-line change at `button.tsx:35-38` flips ~9 submit buttons (C-1) from tan to gold instantly. Highest visible ROI. [MICRO-IMPROVEMENT, significant]
2. **Input/Textarea/Select focus-shadow → `var(--gold-bg-strong)` token.** Three identical edits; all tenant-rethemify immediately instead of locking to `#d4af37`. [MICRO-IMPROVEMENT, significant]
3. **Checkbox checked state → gold.** `checkbox.tsx:16` — restores the "gold = selected" universal signal in bulk actions + tables. [MICRO-IMPROVEMENT, significant]
4. **SheetTitle → `font-serif`.** One line at `sheet.tsx:111` — fixes every side-drawer heading across the app. [MICRO-IMPROVEMENT, significant]
5. **Badge/Button gold variants → token-based (drop hex).** Eliminates tenant-theme leak for every Badge `variant="gold"` and Button `variant="gold"/"gold-solid"`. Requires `var()` substitutions only. [MICRO-IMPROVEMENT, significant]
6. **Badge success/warning/info + Confirmation icon variants → `--success/--warning/--info/--destructive` tokens.** Two files, six replacements, kills all `#22c55e`/`#60a5fa`/`#f59e0b`/`text-yellow-400` leaks. [MICRO-IMPROVEMENT, significant]
7. **DataTable "No results" → `<EmptyState>`.** Also sets the pattern for 6 other raw-text empty states (D-3, D-4, D-5, D-6, D-9). [MICRO-IMPROVEMENT, medium]
8. **Tooltip background → `--bg-floating-elevated`.** One primitive edit; tooltips currently render tan-on-dark at low contrast. [MICRO-IMPROVEMENT, significant]
9. **DropdownMenu item focus → `bg-gold-bg text-gold-primary`.** Three nearly-identical lines in dropdown-menu.tsx, fixes keyboard-nav feedback across every menu in the app. [MICRO-INTERACTION, medium]
10. **Table selected-row state → `bg-gold-bg`.** One line at `table.tsx:61`, rescues gold signal for selected table rows (currently falls to `bg-muted`). [MICRO-INTERACTION, quick-win]
