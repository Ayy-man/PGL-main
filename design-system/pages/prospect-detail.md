# Prospect Detail — Page Override

> Overrides to MASTER.md for the prospect detail views: slide-over panel (Section 4b) and full profile page (Section 4c).
> Only deviations from the Master are documented here.
> Replaces the previous `prospect-profile.md`.

---

## Color Emphasis

The prospect detail views are the most gold-heavy surfaces in the app. Gold signals wealth and value -- appropriate for the "money view."

| Element                | Token               | Reasoning                        |
|------------------------|----------------------|----------------------------------|
| Prospect name          | `text-foreground`    | Standard -- gold would be garish |
| Currency values        | `text-gold`          | Draws eye to financial data      |
| Wealth signal links    | `text-gold hover:text-gold-muted` | Clickable wealth sources |
| List name links        | `text-gold hover:text-gold-muted` | Navigation emphasis    |
| AI summary border      | `border-gold`        | Distinguishes AI content         |
| Total transaction value| `text-gold font-mono font-semibold` | Financial emphasis  |
| Enrichment progress bar| Gold gradient fill   | Visual wealth indicator          |
| All other text         | Follow MASTER tokens | No gold inflation                |

---

## Section 4b: Slide-Over Panel

Primary interaction for viewing a prospect. Opens from the search results table.

### Panel Container

| Property        | Value                                      | Notes                          |
|-----------------|--------------------------------------------|--------------------------------|
| Width           | `min(480px, 90vw)`                         | 480px desktop, near-full mobile|
| Height          | Full viewport (`h-screen`)                 | Fixed to right edge            |
| Position        | `fixed right-0 top-0`                      | z-index 50                     |
| Background      | `#0d0d10`                                  | Slightly cooler than `--background` for layering distinction |
| Left border     | `1px solid rgba(212,175,55,0.1)`           | Subtle gold edge               |
| Shadow          | `-20px 0 60px rgba(0,0,0,0.5)`            | Deep left-cast shadow          |
| Slide-in        | `translateX(100%)` to `translateX(0)`, 300ms ease-out | MASTER max is 300ms  |
| Slide-out       | `translateX(0)` to `translateX(100%)`, 200ms ease-in  | Faster dismiss       |

### Backdrop

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Background      | `rgba(0,0,0,0.4)`                          |
| Transition      | 200ms fade in/out                          |
| Interaction     | Click to close panel                       |

### Panel Header (sticky)

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Position        | `sticky top-0 z-10`                        |
| Padding         | `20px 28px`                                |
| Background      | `#0d0d10`                                  |
| Close button    | 32px circle, `bg-muted border border-border`, X icon `h-4 w-4` |
| Full profile link| Right-aligned, `text-sm text-gold hover:text-gold-muted cursor-pointer` |

### Panel Sections (top to bottom)

All sections use `px-7` (28px) horizontal padding, `space-y-6` between sections.

#### 1. Identity Block

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Avatar           | 56px round, `rounded-full border-2 border-border`     |
| Name             | Cormorant Garamond 24px, `font-semibold text-foreground` |
| Email            | `text-sm text-muted-foreground`                       |
| Action circles   | 4x 36px circles in a row, `gap-3`                    |
|                  | `bg-muted border border-border rounded-full`          |
|                  | Icons: MessageSquare, Mail, Phone, MoreHorizontal (`h-4 w-4`) |
|                  | `hover:bg-accent hover:text-foreground transition-colors cursor-pointer` |
|                  | Each must have `aria-label`                           |

**Typography deviation:** Name uses Cormorant Garamond at 24px instead of the MASTER serif (Playfair Display). This is specific to the slide-over panel for a lighter, more refined feel at this size. If Cormorant is not loaded, fall back to `font-serif`.

#### 2. Quick Info Grid

| Property         | Value                                                 |
|------------------|-------------------------------------------------------|
| Layout           | 2x2 grid, `rounded-[10px] border border-border bg-card` |
| Cell padding     | `p-4`                                                 |
| Dividers         | 1px `border-border` between cells (inner borders)     |
| Label            | `text-xs text-muted-foreground uppercase tracking-wider` |
| Value            | `text-sm font-medium text-foreground`                 |
| Fields           | Title, Company, Location, Wealth Tier                 |

#### 3. Enrichment Progress

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Header row       | Sparkle icon (`h-4 w-4 text-gold`) + "Enrichment" label + percentage `text-sm text-muted-foreground` |
| Progress bar     | `h-2 rounded-full bg-muted` track                    |
| Bar fill         | `bg-gradient-to-r from-gold-muted to-gold`, width = percentage |
| Source tags       | Row of pills below bar, `text-xs rounded-full px-2 py-0.5` |
| Complete source  | `bg-success-muted text-success border border-success/30` |
| Pending source   | `bg-muted text-muted-foreground border border-border` |
| Failed source    | `bg-destructive/15 text-destructive border border-destructive/30` |

#### 4. AI Summary

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Container        | `border-l-2 border-gold pl-4 py-3`                   |
| Label            | "AI INSIGHT" -- `text-xs font-semibold uppercase tracking-wider text-gold` |
| Body             | `text-sm text-foreground leading-relaxed`             |
| Empty state      | "Generate Summary" button, `variant="outline"` with gold text |
|                  | `border-gold/30 text-gold hover:bg-gold/10 cursor-pointer` |

#### 5. SEC Insider Transactions

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Heading          | `text-sm font-semibold text-foreground` + count badge |
| Count badge      | `text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground` |
| Row limit        | Show 3-5 most recent rows                            |
| Table style      | Follow MASTER data table pattern                      |
| Amounts          | `font-mono text-gold text-right`                      |
| "View All" link  | `text-xs text-gold hover:text-gold-muted cursor-pointer`, bottom of section |

#### 6. Notes

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Heading row      | Section title + "+ Add Note" button                   |
| Add button       | `variant="ghost" text-xs text-gold hover:text-gold-muted cursor-pointer` |
| Note card        | `bg-muted rounded-md p-3 space-y-1`                  |
| Note body        | `text-sm text-foreground`                             |
| Note meta        | `text-xs text-muted-foreground` -- author + relative timestamp |

#### 7. Lists Membership

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Pills            | Horizontal wrap, `flex flex-wrap gap-2`               |
| Pill style       | `text-xs rounded-full px-3 py-1 bg-muted text-foreground border border-border` |
| "+ Add to List"  | Same pill shape, `border-dashed border-gold/30 text-gold hover:bg-gold/10 cursor-pointer` |

### Panel Behavior

| Behavior         | Spec                                                  |
|------------------|-------------------------------------------------------|
| URL state        | `?prospect={id}` query param, supports direct linking |
| Close triggers   | Escape key, backdrop click, X button                  |
| Enrichment       | Triggers enrichment on open for any pending sources   |
| Mobile (<768px)  | Panel expands to full width (`w-screen`)              |
| Scroll           | Panel body scrolls independently, header stays sticky |

---

## Section 4c: Full Prospect Profile Page

Power user deep-dive view. Accessible via "View Full Profile" from the slide-over panel. Route: `/[orgId]/prospects/[prospectId]`.

**Priority: P1 -- build after the slide-over panel is functional.** The "View Full Profile" link can initially scroll the panel to the top as a placeholder.

### Breadcrumb

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Pattern          | `<- Search Results > Marcus Chen`                     |
| Back link        | `text-sm text-muted-foreground hover:text-foreground cursor-pointer` |
| Separator        | `text-muted-foreground/50` chevron                    |
| Current page     | `text-sm text-foreground font-medium`                 |
| Right side       | Last activity timestamp, `text-xs text-muted-foreground` |

### Profile Header

| Property         | Value                                                 |
|------------------|-------------------------------------------------------|
| Padding          | `28px 56px` (`py-7 px-14`)                            |
| Background       | Subtle gradient `bg-gradient-to-b from-card to-background` |
| Border           | `border-b border-border`                              |
| Avatar           | 64px round, `rounded-full border-2 border-border`     |
| Name             | Cormorant Garamond 28px, `font-bold text-foreground`  |
| Title + Company  | `text-sm text-muted-foreground`, joined with centered dot |
| Metadata badges  | Row of `text-xs` badges per MASTER status badge pattern |
| Created date     | `text-xs text-muted-foreground`                       |
| Collaborators    | Right side, overlapping 24px avatar circles, `-ml-2` overlap |
| Action buttons   | Right side, Mail / Phone / MoreHorizontal             |
| Button style     | `border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer` |

**Typography deviation:** Same Cormorant Garamond override as the slide-over panel, at 28px for the larger context.

### Tab Bar

| Property         | Value                                                 |
|------------------|-------------------------------------------------------|
| Position         | `sticky` below header, z-index 10                     |
| Padding          | `0 56px` (`px-14`)                                    |
| Background       | `bg-background`                                       |
| Border           | `border-b border-border`                              |
| Active tab       | `text-foreground font-medium`, 2px `border-gold` bottom underline |
| Inactive tab     | `text-muted-foreground font-normal hover:text-foreground cursor-pointer` |
| Transition       | `transition-colors duration-200`                      |
| Tabs             | Overview, Activity, SEC Filings, Enrichment, Notes, Lists |

### Two-Column Layout

| Property         | Value                                                 |
|------------------|-------------------------------------------------------|
| Container        | `flex gap-8 p-14` (padding 56px)                      |
| Left column      | `w-[340px] shrink-0`                                  |
| Right column     | `flex-1 min-w-0`                                      |

#### Left Column: Activity Timeline

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Vertical line    | `absolute left-4 top-0 bottom-0 w-px bg-border`      |
| Event circle     | 8px, positioned on the line, colored by action type   |
| Circle colors    | Search: `bg-info`, Enrich: `bg-gold`, Note: `bg-muted-foreground`, List: `bg-success` |
| Event content    | Right of line, `pl-8`                                 |
| Event title      | `text-sm text-foreground`                             |
| Event timestamp  | `text-xs text-muted-foreground`                       |

#### Right Column: Tab Content

**Overview Tab**

| Section          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Info grid        | Wide grid, `grid grid-cols-2 md:grid-cols-3 gap-4`   |
| Grid cells       | `bg-card rounded-lg border p-4`, label + value        |
| AI Insight       | Same gold left-border block as slide-over panel       |
| Recent SEC       | Top 5 transactions, follow MASTER data table pattern  |
| Career history   | Vertical list, `space-y-3`, company + role + dates    |

**Activity Tab**

| Column   | Notes                                                  |
|----------|--------------------------------------------------------|
| Time     | `text-xs text-muted-foreground font-mono`              |
| User     | `text-sm text-foreground`                              |
| Action   | Status badge per MASTER pattern                        |
| Details  | `text-sm text-muted-foreground`, truncated with tooltip|

**SEC Filings Tab**

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Full table       | All transactions, sortable columns                    |
| Transaction type | Colored pills -- Purchase: `bg-success-muted text-success`, Sale: `bg-destructive/15 text-destructive`, Grant: `bg-info-muted text-info` |
| Amounts          | `font-mono text-gold text-right`                      |

**Enrichment Tab**

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Layout           | `grid grid-cols-2 md:grid-cols-4 gap-4`               |
| Source card      | `bg-card rounded-lg border p-4`                       |
| Source name      | `text-sm font-semibold`                               |
| Status           | Icon + color + label per enrichment status icons below |
| Data preview     | `text-xs text-muted-foreground`, key fields returned  |
| Refresh button   | Per-source, `variant="ghost"` small                   |

**Notes Tab**

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Layout           | Full width, `space-y-4`                               |
| Add note         | Top of section, textarea + submit button              |
| Note cards       | Same as slide-over panel notes, but wider              |

**Lists Tab**

| Element          | Spec                                                  |
|------------------|-------------------------------------------------------|
| Layout           | `grid grid-cols-2 md:grid-cols-3 gap-4`               |
| List card        | `bg-card rounded-lg border p-4 cursor-pointer hover:bg-accent` |
| List name        | `text-sm font-semibold text-foreground`               |
| Member count     | `text-xs text-muted-foreground`                       |
| Add to list      | Dashed border card, `border-dashed border-gold/30 text-gold hover:bg-gold/10 cursor-pointer` |

---

## Enrichment Status Icons

Shared across both the slide-over panel and full profile page. Status uses icon + color + label (accessibility-compliant):

| Status        | Icon           | Color           | Label           |
|---------------|----------------|-----------------|-----------------|
| Pending       | `Circle`       | `text-muted-foreground` | "Pending" |
| In Progress   | `Loader2` (animate-spin) | `text-info` | "Running"  |
| Complete      | `CheckCircle2` | `text-success`  | "Complete"      |
| Failed        | `XCircle`      | `text-destructive` | "Failed"     |
| Skipped       | `Minus`        | `text-muted-foreground` | "Skipped" |
| Circuit Open  | `Circle`       | `text-warning`  | "Paused"        |

---

## Stale Data Warning

When enrichment data is older than 7 days, show inline on both views:

```
inline-flex items-center gap-2 rounded-md border border-warning/30 bg-warning-muted px-3 py-1.5 text-xs text-warning
```

---

## Tables (Transactions, Memberships)

Follow MASTER data table pattern with these additions:
- Transaction amounts: `text-right font-mono font-semibold text-gold`
- Date columns: `text-xs text-muted-foreground`
- Header cells: `text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-background`

---

## Migration Notes

The following components contain hardcoded `zinc-*` classes that must be replaced with design tokens per MASTER.md Section 2. This applies to both the slide-over panel (new) and the full profile page (refactored from existing profile view):

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
