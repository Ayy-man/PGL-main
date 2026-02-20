# Prospect Profile — Page Override

> Overrides to MASTER.md for the prospect profile view (`/[orgId]/prospects/[prospectId]`).
> Only deviations from the Master are documented here.

---

## Color Emphasis

The prospect profile is the most gold-heavy page in the app. Gold signals wealth and value — appropriate for the "money view."

| Element                | Token               | Reasoning                        |
|------------------------|----------------------|----------------------------------|
| Prospect name (h1)     | `text-foreground`    | Standard — gold would be garish  |
| Currency values         | `text-gold`          | Draws eye to financial data      |
| Wealth signal links     | `text-gold hover:text-gold-muted` | Clickable wealth sources |
| List name links         | `text-gold hover:text-gold-muted` | Navigation emphasis    |
| AI summary border       | `border-gold`        | Distinguishes AI content         |
| Total transaction value | `text-gold font-mono font-semibold` | Financial emphasis  |
| All other text          | Follow MASTER tokens | No gold inflation                |

## Layout

| Override          | Value                          | Reason                           |
|-------------------|--------------------------------|----------------------------------|
| Header layout     | `flex items-start justify-between gap-6` | Name + actions side by side |
| Contact grid      | `grid md:grid-cols-2 gap-6`    | Work vs personal contact split   |
| Enrichment grid   | `grid grid-cols-2 md:grid-cols-4 gap-4` | 4 sources at a glance  |
| Sections          | `space-y-8` (not `space-y-6`)  | More breathing room between dense sections |

## Enrichment Status Icons

Status uses icon + color + label (accessibility-compliant):

| Status        | Icon           | Color           | Label           |
|---------------|----------------|-----------------|-----------------|
| Pending       | `Circle`       | `text-muted-foreground` | "Pending" |
| In Progress   | `Loader2` (animate-spin) | `text-info` | "Running"  |
| Complete      | `CheckCircle2` | `text-success`  | "Complete"      |
| Failed        | `XCircle`      | `text-destructive` | "Failed"     |
| Skipped       | `Minus`        | `text-muted-foreground` | "Skipped" |
| Circuit Open  | `Circle`       | `text-warning`  | "Paused"        |

## Stale Data Warning

When enrichment data is older than 7 days:

```
inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning-muted px-3 py-1.5 text-xs text-warning
```

## Tables (Transactions, Memberships)

Follow MASTER data table pattern with these additions:
- Transaction amounts: `text-right font-mono font-semibold text-gold`
- Date columns: `text-xs text-muted-foreground`
- Header cells: `text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-background`

## Quick Action Buttons

Profile uses outline-style buttons (not primary fill):

```
border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer
```

This keeps the visual weight on the data, not the actions.

---

## Migration Notes

The current `profile-view.tsx`, `enrichment-status.tsx`, and `wealth-signals.tsx` hardcode `zinc-*` classes throughout. These must be replaced with design tokens per MASTER.md Section 2.

Key replacements:
| Current                    | Replace with               |
|----------------------------|----------------------------|
| `bg-zinc-950`              | `bg-background`            |
| `bg-zinc-900`              | `bg-card`                  |
| `border-zinc-800`          | `border`                   |
| `text-zinc-100`            | `text-foreground`          |
| `text-zinc-300`            | `text-foreground`          |
| `text-zinc-400`            | `text-muted-foreground`    |
| `text-zinc-500`            | `text-muted-foreground`    |
| `hover:bg-zinc-700`        | `hover:bg-accent`          |
| `hover:bg-zinc-850`        | `hover:bg-accent`          |
| `#f4d47f`                  | `text-gold`                |
| `#d4af37`                  | `text-gold-muted` or `border-gold` |
| `text-green-500`           | `text-success`             |
| `text-red-500`             | `text-destructive`         |
| `text-blue-400`            | `text-info`                |
| `text-orange-500`          | `text-warning`             |
| `bg-orange-950/50`         | `bg-warning-muted`         |
| `border-orange-800`        | `border-warning/30`        |
