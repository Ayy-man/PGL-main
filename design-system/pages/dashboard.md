# Dashboard & Analytics — Page Override

> Overrides to MASTER.md for analytics dashboards (`/[orgId]/dashboard/analytics` and `/admin/analytics`).
> Only deviations from the Master are documented here.

---

## Layout

| Override          | Value                                  | Reason                           |
|-------------------|----------------------------------------|----------------------------------|
| Stat cards grid   | `grid grid-cols-2 lg:grid-cols-4 gap-4` | KPI overview at a glance       |
| Chart containers  | `col-span-2` or full width             | Charts need horizontal space    |
| Date range filter | Top-right of header area               | Always accessible               |

## Chart Styling (Recharts)

Use the `--chart-*` tokens from MASTER for all series colors.

| Token       | Recharts Prop          |
|-------------|------------------------|
| `--chart-1` | Primary line/bar fill  |
| `--chart-2` | Secondary series       |
| `--chart-3` | Tertiary series        |
| `--chart-4` | Quaternary series      |
| `--chart-5` | Quinary series         |

### Chart Container

```
bg-card rounded-lg border p-6
```

- Chart title: h3 level (`text-lg font-semibold font-sans`)
- Chart description: `text-sm text-muted-foreground`
- Axis labels: `text-xs text-muted-foreground font-mono`
- Grid lines: `stroke: var(--border)` with low opacity
- Tooltip: `bg-card border shadow-md rounded-md p-3 text-sm`

## Stat Cards (KPI)

```
bg-card rounded-lg border p-6
```

| Element     | Style                                         |
|-------------|-----------------------------------------------|
| Label       | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Value       | `text-2xl font-bold font-mono`                |
| Trend       | `text-xs` + `text-success` (up) or `text-destructive` (down) |
| Icon        | `h-4 w-4 text-muted-foreground` top-right     |

## Date Range Filter

Segmented control or select with options: 7d, 30d, 90d

```
inline-flex rounded-md border bg-muted p-0.5
```

Active segment: `bg-card shadow-sm rounded-sm text-foreground`
Inactive: `text-muted-foreground hover:text-foreground cursor-pointer`

## Density

Dashboards are denser than other pages:
- Card padding: `p-4` (not `p-6`) for stat cards
- Gap: `gap-4` between cards
- Section gap: `space-y-4` (not `space-y-6`)
