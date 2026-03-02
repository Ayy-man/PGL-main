# Visual Polish: Stitch Mockup Alignment

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the visual gap between the current app and the stitch mockup designs by upgrading CSS utilities, component variants, and shared primitives.

**Architecture:** Pure CSS/component-level changes to shared primitives in `src/components/ui/`, `src/app/globals.css`, and layout components. No API, data, or routing changes. All tasks are independent and can be parallelized.

**Tech Stack:** Tailwind CSS, CSS custom properties, CVA (class-variance-authority), React forwardRef components.

---

### Task 1: Add Glow Utility Classes to globals.css

**Files:**
- Modify: `src/app/globals.css:215-261` (utilities layer)

**Step 1: Add new CSS utilities after existing `.ambient-glow-bottom` block (after line 261)**

Add these new utility classes inside the existing `@layer utilities` block, before the admin section:

```css
  /* Gold glow effects for premium feel */
  .glow-gold-sm {
    box-shadow: 0 0 10px rgba(212,175,55,0.1);
  }
  .glow-gold {
    box-shadow: 0 0 20px rgba(212,175,55,0.15);
  }
  .glow-gold-lg {
    box-shadow: 0 0 40px rgba(212,175,55,0.10);
  }
  .text-glow {
    text-shadow: 0 0 10px rgba(212,175,55,0.3);
  }
  .text-glow-sm {
    text-shadow: 0 0 6px rgba(212,175,55,0.2);
  }
  .dot-glow-green {
    box-shadow: 0 0 6px rgba(34,197,94,0.6);
  }
  .dot-glow-blue {
    box-shadow: 0 0 6px rgba(96,165,250,0.6);
  }
  .dot-glow-red {
    box-shadow: 0 0 6px rgba(239,68,68,0.6);
  }
  .dot-glow-amber {
    box-shadow: 0 0 6px rgba(245,158,11,0.6);
  }
```

**Step 2: Upgrade `.surface-card:hover` to include glow shadow**

Change the existing hover rule at line 222-225 from:
```css
  .surface-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-hover);
  }
```
To:
```css
  .surface-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-hover);
    box-shadow: 0 0 30px rgba(212,175,55,0.06);
  }
```

**Step 3: Verify app compiles**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/Phronesis-main" && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (or at minimum no CSS errors)

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add gold glow utilities and card hover glow"
```

---

### Task 2: Add Solid Gold Button Variant

**Files:**
- Modify: `src/components/ui/button.tsx:23-24`

**Step 1: Add `gold-solid` variant after existing `gold` variant**

The current `gold` variant (line 23-24) is:
```
gold:
  "bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] font-semibold rounded-[8px] hover:bg-[rgba(212,175,55,0.18)]",
```

Add a new variant after it called `gold-solid`:
```
"gold-solid":
  "bg-[#d4af37] text-[#0a0a0a] font-bold rounded-[8px] shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:bg-[#c4a030] active:scale-[0.97] transition-all duration-150",
```

**Step 2: Verify TypeScript compiles**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/Phronesis-main" && npx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No errors in button.tsx

**Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "style: add gold-solid button variant for bold CTAs"
```

---

### Task 3: Upgrade Table Component with Gold Accents

**Files:**
- Modify: `src/components/ui/table.tsx:22-24` (TableHeader)
- Modify: `src/components/ui/table.tsx:60-62` (TableRow)
- Modify: `src/components/ui/table.tsx:75-77` (TableHead)

**Step 1: Add gold-tinted background to TableHeader**

Change line 23 from:
```tsx
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
```
To:
```tsx
  <thead ref={ref} className={cn("[&_tr]:border-b bg-[rgba(255,255,255,0.03)]", className)} {...props} />
```

**Step 2: Add left-border accent to TableRow**

Change line 60-62 from:
```tsx
      "border-b transition-colors hover:bg-muted/50 focus-within:bg-accent/30 data-[state=selected]:bg-muted",
```
To:
```tsx
      "border-b border-l-[3px] border-l-transparent transition-all duration-150 hover:bg-[rgba(212,175,55,0.04)] hover:border-l-[#d4af37] focus-within:bg-accent/30 data-[state=selected]:bg-muted",
```

**Step 3: Tint TableHead text toward gold**

Change line 76 from:
```tsx
      "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
```
To:
```tsx
      "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-[var(--gold-text)] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
```

**Step 4: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/Phronesis-main" && npx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/ui/table.tsx
git commit -m "style: add gold accents to table (thead bg, row left-border, header text)"
```

---

### Task 4: Add Glow Shadows to Enrichment Status Dots

**Files:**
- Modify: `src/components/ui/enrichment-status-dots.tsx:30-42`

**Step 1: Update getDotColor to return both color and shadow**

Replace the entire `getDotColor` function and the dot rendering. Change the component to:

Replace the `getDotColor` function (approx lines 28-38) with:
```tsx
function getDotStyle(status: SourceStatus): { background: string; boxShadow: string } {
  switch (status) {
    case "complete":
      return { background: "var(--success)", boxShadow: "0 0 6px rgba(34,197,94,0.6)" };
    case "in_progress":
      return { background: "var(--info)", boxShadow: "0 0 6px rgba(96,165,250,0.6)" };
    case "failed":
      return { background: "var(--destructive)", boxShadow: "0 0 6px rgba(239,68,68,0.6)" };
    case "circuit_open":
      return { background: "var(--warning)", boxShadow: "0 0 6px rgba(245,158,11,0.6)" };
    default:
      return { background: "rgba(255,255,255,0.15)", boxShadow: "none" };
  }
}
```

Then update the dot `<div>` to use the new function. Change:
```tsx
style={{ background: getDotColor(status) }}
```
To:
```tsx
style={getDotStyle(status)}
```

**Step 2: Increase dot size from h-2 w-2 to h-2.5 w-2.5**

Change:
```tsx
className="h-2 w-2 rounded-full shrink-0"
```
To:
```tsx
className="h-2.5 w-2.5 rounded-full shrink-0"
```

**Step 3: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/Phronesis-main" && npx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/ui/enrichment-status-dots.tsx
git commit -m "style: add glow shadows to enrichment status dots"
```

---

### Task 5: Add Text Glow to Serif Page Headings (globals.css)

**Files:**
- Modify: `src/app/globals.css` (add to utilities layer)

**Step 1: Add a `.heading-glow` utility class**

Add inside the `@layer utilities` block (with the other glow classes from Task 1):

```css
  .heading-glow {
    text-shadow: 0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(212,175,55,0.05);
  }
```

NOTE: If Task 1 already ran and added glow classes, just append this one after them. If Task 1 hasn't run yet, add it with the Task 1 glow classes.

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add heading-glow utility for serif page titles"
```

---

### Task 6: Add Gold-Solid Badge Variant

**Files:**
- Modify: `src/components/ui/badge.tsx:21-22`

**Step 1: Add `gold-solid` variant after existing `gold` variant**

After the existing `gold` variant line, add:
```
"gold-solid":
  "border-transparent bg-[#d4af37] text-[#0a0a0a] font-bold shadow-[0_0_10px_rgba(212,175,55,0.3)]",
```

**Step 2: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "style: add gold-solid badge variant"
```

---

## Summary of Changes

| Task | File | Change | Impact |
|------|------|--------|--------|
| 1 | globals.css | Add glow utilities + card hover glow | All cards site-wide |
| 2 | button.tsx | Add gold-solid variant | Bold CTA buttons |
| 3 | table.tsx | Gold thead, row left-border, gold header text | All tables site-wide |
| 4 | enrichment-status-dots.tsx | Glow shadows + bigger dots | All enrichment indicators |
| 5 | globals.css | heading-glow utility | Available for all serif headings |
| 6 | badge.tsx | gold-solid variant | Available for premium badges |

**All tasks are independent** — they touch different files (except Tasks 1 & 5 both touch globals.css, so those should be sequenced or combined).

**Parallelization strategy:** Tasks 2, 3, 4, 6 can all run in parallel. Tasks 1 & 5 should be combined into one agent since they modify the same file.
