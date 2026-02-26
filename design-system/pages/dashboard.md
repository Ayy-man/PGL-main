# Dashboard & Analytics — Page Override

> Overrides to MASTER.md for the tenant dashboard (`/[orgId]/dashboard`), analytics page (`/[orgId]/dashboard/analytics`), and admin dashboard (`/admin`).
> Only deviations from the Master are documented here.

---

## Tenant Dashboard (Home)

The landing page after login. Minimal and focused — the primary CTA is persona-driven search.

### Page Header

| Override           | Value                                          | Reason                          |
|--------------------|------------------------------------------------|---------------------------------|
| Greeting heading   | Cormorant 38px, `font-weight: 600`             | Warmer serif, distinct from Playfair h1 |
| Date subtitle      | `text-sm text-muted-foreground` below greeting | Context without clutter         |

The greeting uses Cormorant instead of Playfair Display — this is the only page that uses Cormorant for a heading. Load via `next/font/google` and apply as a one-off inline style or scoped class.

### Body

No action cards grid. The dashboard body mirrors the search page persona selection view — persona cards are the primary content. If quick stats become available (total searches, prospects found), render them as a single horizontal row of muted stat pills above the persona cards, not as full stat cards.

---

## Analytics Page

Route: `/[orgId]/dashboard/analytics`

### Known Bug

The analytics API route returns HTML (error page) instead of JSON when data is missing. The client-side fetch must guard against this:

```ts
const res = await fetch(url);
const text = await res.text();
try {
  return JSON.parse(text);
} catch {
  return null; // graceful fallback, do not throw
}
```

### Period Toggle

Segmented control with three options: **7d**, **30d**, **90d**.

| Override              | Value                                      | Reason                        |
|-----------------------|--------------------------------------------|-------------------------------|
| Container             | `inline-flex rounded-md border bg-muted p-0.5` | Same as MASTER date range  |
| Active segment        | `bg-gold text-gold-foreground rounded-sm shadow-sm` | Gold active state instead of `bg-card` |
| Inactive segment      | `text-muted-foreground hover:text-foreground cursor-pointer` | Standard                 |

### Stat Cards

4-column grid: `grid grid-cols-2 lg:grid-cols-4 gap-4`

Stats displayed: **Total Searches**, **Prospects Found**, **Lists Created**, **CSV Exports**

| Override        | Value                                     | Reason                          |
|-----------------|-------------------------------------------|---------------------------------|
| Value typography| Cormorant 36px, `font-weight: 700`        | Large display numerals, serif   |
| Active value    | `text-gold`                               | Gold for non-zero data          |
| Zero value      | `text-muted-foreground`                   | Muted when no data              |
| Label           | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | Matches MASTER label style |

### Chart Containers

| Override        | Value                                     | Reason                          |
|-----------------|-------------------------------------------|---------------------------------|
| Background      | Subtle gradient: `bg-gradient-to-br from-card to-card/80` | Depth without breaking palette |
| Border radius   | `14px` (`rounded-[14px]`)                 | Slightly softer than MASTER `rounded-lg` (16px) |
| Padding         | `28px` (`p-7`)                            | More breathing room than default `p-6` |
| Bar fill color  | `var(--gold)` at 70% opacity              | Gold-tinted bars, not chart-1   |

### Density

Same as MASTER dashboard density:
- Card padding: `p-4` for stat cards
- Gap: `gap-4` between cards
- Section gap: `space-y-4`

---

## Admin Dashboard

Route: `/admin`

### Stat Cards

Same card treatment as analytics stat cards above:
- Cormorant 36px values, `font-weight: 700`
- `text-gold` for active data, `text-muted-foreground` for zero
- 4-column grid

### "Coming Soon" Badge

Features not yet available use a gold pill badge:

```
inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold bg-gold/15 text-gold border border-gold/30
```

### Table Improvements

| Override              | Value                                          | Reason                          |
|-----------------------|------------------------------------------------|---------------------------------|
| Header cells          | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` | Slightly smaller than MASTER `text-xs` for denser admin tables |
| Row borders           | `border-b border-border/50`                    | Subtler than default `border-b` |
| Row hover             | `hover:bg-muted/30`                            | Lighter hover than MASTER `hover:bg-muted/50` |

### Empty / Failure State

When a section has no data or an API call fails, do not render raw error text. Use the shared `<EmptyState>` component:

```tsx
<EmptyState
  icon={AlertCircle}
  title="Unable to load data"
  description="Check your connection and try again."
  variant="default"
/>
```

Centered, muted, with no exposed stack traces or raw API responses.
