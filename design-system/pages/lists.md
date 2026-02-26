# Lists — Page Override

> Overrides to MASTER.md for the lists page (`/[orgId]/lists`).
> Only deviations from the Master are documented here.

---

## Page Header

| Override           | Value                                          | Reason                          |
|--------------------|------------------------------------------------|---------------------------------|
| Title              | H1 "Lists" — standard MASTER `font-serif text-3xl font-bold` | No deviation           |
| Subtitle           | `text-sm text-muted-foreground` with dynamic count (e.g. "3 lists") | Contextual summary    |
| CTA button         | "Create List" — gold variant: `bg-gold text-gold-foreground hover:bg-gold-muted` | Primary action, gold prominence |
| Header layout      | `flex items-center justify-between`            | Title left, button right        |

---

## List Items

Lists render as horizontal full-width cards stacked vertically — not a grid.

### Container

```
flex flex-col gap-3
```

Gap: `12px` between cards.

### Card Structure

```
bg-card border border-border/60 rounded-xl p-6 px-7
flex items-center justify-between
transition-colors
```

| Override        | Value                                     | Reason                          |
|-----------------|-------------------------------------------|---------------------------------|
| Border          | `border-border/60`                        | Subtler than default `border`   |
| Border radius   | `rounded-xl` (12px)                       | Slightly softer than MASTER `rounded-lg` |
| Padding         | `24px 28px` (`p-6 px-7`)                 | Extra horizontal breathing room |
| Layout          | Flex row, `justify-between`, `items-center` | Left content + right actions  |

### Left Side

| Element         | Style                                     |
|-----------------|-------------------------------------------|
| List name       | Cormorant 20px, `font-weight: 600`        |
| Description     | `text-[13px] text-muted-foreground mt-0.5`|

Cormorant is used here for list names to match the dashboard heading treatment. Same one-off font load as the dashboard greeting.

### Right Side

Flex row with `items-center gap-6`.

| Element          | Style                                                  |
|------------------|--------------------------------------------------------|
| Member count     | Cormorant 22px `font-weight: 700 text-gold`           |
| "Members" label  | `text-xs text-muted-foreground` below the count        |
| Updated date     | `text-xs text-muted-foreground`                        |
| Export button    | `variant="ghost"` — `text-muted-foreground hover:text-foreground` |
| View button      | `variant="ghost"` — `text-gold hover:text-gold-muted` with arrow: "View →" |

The member count + label stack vertically (`flex flex-col items-center`). The date, Export, and View sit in a horizontal row beside it.

---

## Empty State

When no lists exist, use the shared `<EmptyState>` component:

```tsx
<EmptyState
  icon={List}
  title="No lists yet"
  description="Create a list to organize your prospects."
>
  <Button className="bg-gold text-gold-foreground hover:bg-gold-muted">
    Create List
  </Button>
</EmptyState>
```
