# Search — Page Override

> Overrides to MASTER.md for the search page (`/[orgId]/search`).
> Only deviations from the Master are documented here.

---

## Layout

| Override            | Value                              | Reason                          |
|---------------------|------------------------------------|---------------------------------|
| Toolbar layout      | `flex items-center justify-between gap-4 flex-wrap` | Persona selector + controls |
| Persona selector    | `w-[320px]`                        | Fixed width for consistency     |
| Results container   | Full width, no max-w constraint    | Tables need horizontal space    |

## Search Results Table

Follows MASTER data table pattern with these specifics:

### Column Widths

| Column    | Min Width     | Notes                          |
|-----------|---------------|--------------------------------|
| Name      | `min-w-[140px]` | Always visible                |
| Title     | `max-w-[200px]` | Truncated with tooltip        |
| Company   | Auto          | Standard                       |
| Location  | Auto          | `text-muted-foreground text-sm` |
| Email     | Auto          | Status badge                   |
| Phone     | Auto          | Icon indicator                 |
| Actions   | Auto          | Ghost button                   |

### Email Status Badges

Use semantic tokens (not hardcoded emerald/yellow):

| Status      | Classes                                               |
|-------------|-------------------------------------------------------|
| Verified    | `bg-success-muted text-success border border-success/30` |
| Guessed     | `bg-warning-muted text-warning border border-warning/30` |
| Unavailable | `variant="destructive"`                               |
| Unknown     | `variant="outline"`                                   |

### Phone Indicator

| Has phone  | Icon    | Color           |
|------------|---------|-----------------|
| Yes        | `Check` | `text-success`  |
| No         | `X`     | `text-muted-foreground/50` |

### Action Button ("Add to List")

```
variant="ghost" text-muted-foreground hover:text-gold cursor-pointer
```

Currently uses inline `oklch(0.84_0.15_84)` — must be replaced with `text-gold` token.

## Pagination

Current page indicator uses inline oklch — replace with `text-gold`.

## Persona Selector

"Manage Personas" link hover uses inline oklch — replace with `hover:text-gold`.

Group labels: `text-xs text-muted-foreground uppercase tracking-wider` (matches MASTER label style).

## Empty States

Three empty state variants on this page:

1. **No persona selected** — Search icon + "Select a persona to search"
2. **No results** — Search icon + "No prospects found"
3. **Error** — AlertCircle icon + error message + "Try Again" button with `border-destructive/30`

All should use the shared `<EmptyState>` component when built.
