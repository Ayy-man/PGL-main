---
phase: 31-discover-tab-polish
reviewed: 2026-04-07T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/[orgId]/search/components/nl-search-bar.tsx
  - src/app/[orgId]/search/components/discover-tab.tsx
  - src/app/[orgId]/search/components/saved-search-shortcut-list.tsx
  - src/app/[orgId]/search/components/search-sidebar-rail.tsx
  - src/lib/enrichment/edgar.ts
findings:
  critical: 0
  high: 3
  medium: 3
  low: 3
  info: 2
  total: 11
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-04-07
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed covering the Discover tab UI rewrite (NL search bar, discover layout, saved-search card grid, sidebar rail) and a bug fix in the EDGAR enrichment module. The UI components are clean and well-structured. The main concerns are: a URL construction bug in the EFTS fallback path of `edgar.ts` that silently fetches the wrong endpoint, a variable shadowing issue in the same file that reduces maintainability and risks future confusion, and a prop-sync gap in `discover-tab.tsx` where externally-updated `keywords` do not re-seed the search bar. The UI components are otherwise low-risk.

---

## High Issues

### HR-01: EFTS XML URL constructed incorrectly when `href` is an absolute path

**File:** `src/lib/enrichment/edgar.ts:538-541`
**Issue:** The code matches the first `.xml` `href` from the SEC filing index HTML and concatenates it onto `indexUrl` directly. SEC EDGAR index pages commonly return absolute paths (e.g. `href="/Archives/edgar/data/0001234567/000123.../form4.xml"`). When that happens, `xmlUrl = indexUrl + xmlFileName` produces a double-path URL like `https://www.sec.gov/Archives/.../000123.../Archives/.../form4.xml`, which returns a 404. The `enrichEdgarByName` fallback silently skips every filing in that case, returning `found: false`.

```typescript
// CURRENT (broken when href is absolute):
const xmlMatch = indexHtml.match(/href="([^"]+\.xml)"/i);
if (!xmlMatch) continue;
const xmlFileName = xmlMatch[1];
const xmlUrl = `${indexUrl}${xmlFileName}`;

// FIX — handle absolute paths:
const xmlMatch = indexHtml.match(/href="([^"]+\.xml)"/i);
if (!xmlMatch) continue;
const xmlFileName = xmlMatch[1];
const xmlUrl = xmlFileName.startsWith('/')
  ? `https://www.sec.gov${xmlFileName}`
  : `${indexUrl}${xmlFileName}`;
```

---

### HR-02: Variable shadowing — `ownerMatches` declared twice in the same scope

**File:** `src/lib/enrichment/edgar.ts:231,239`
**Issue:** `ownerMatches` is first declared as `const ownerMatches = Array.from(xml.matchAll(...))` (an array), then immediately re-declared inside the same `try` block as `const ownerMatches = ownerNames.some(...)` (a boolean). TypeScript accepts this because the second declaration is inside an inner block, but they are in the same logical scope and the naming collision is misleading — the boolean `ownerMatches` shadows the array. A reader or future editor could easily confuse the two.

```typescript
// CURRENT:
const ownerMatches = Array.from(xml.matchAll(ownerRegex));   // line 231: string[][]
// ...
const ownerMatches = ownerNames.some(on => { ... });          // line 239: boolean

// FIX — rename for clarity:
const ownerNameMatches = Array.from(xml.matchAll(ownerRegex));
for (const m of ownerNameMatches) {
  ownerNames.push(m[1].trim().toLowerCase());
}
// ...
const isOwnerMatch = ownerNames.some(on => { ... });
if (!isOwnerMatch) return [];
```

---

### HR-03: `keywords` prop change does not re-seed the search bar

**File:** `src/app/[orgId]/search/components/discover-tab.tsx:35,73-75`
**Issue:** `prefillValue` is initialised once from the `keywords` prop via `useState(keywords)`. If the parent component updates `keywords` (e.g. back-navigation, URL-based state restore), `prefillValue` remains stale and the `NLSearchBar` continues to show the old text. The `NLSearchBar` is keyed on `prefillValue`, so it only remounts when `handlePrefill` is called internally — not when `keywords` changes externally.

```typescript
// CURRENT — stale after external update:
const [prefillValue, setPrefillValue] = useState(keywords);

// FIX — sync when keywords prop changes (useEffect):
const [prefillValue, setPrefillValue] = useState(keywords);

useEffect(() => {
  setPrefillValue(keywords);
}, [keywords]);
```

---

## Medium Issues

### MR-01: `handleAutoResize` reads `scrollHeight` before the DOM reflects the new value

**File:** `src/app/[orgId]/search/components/nl-search-bar.tsx:33-36`
**Issue:** `handleChange` sets React state via `setValue` and immediately calls `handleAutoResize()`. Because React state updates are asynchronous, `textarea.scrollHeight` is measured against the DOM that still holds the previous value. The resize therefore lags one keystroke behind.

```typescript
// FIX — read scrollHeight from the event target directly (already has the new value):
const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setValue(e.target.value);
  // Resize immediately using the event target, not the ref
  const textarea = e.target;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(Math.max(textarea.scrollHeight, 56), 200) + "px";
};
```

---

### MR-02: `SuggestionCard` is a no-op when `onPrefill` is undefined

**File:** `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx:107`
**Issue:** `SuggestionCard` accepts `onPrefill?: (query: string) => void` (optional). When the parent does not pass `onPrefillSearch`, clicking any suggestion card silently does nothing. There is no visual indication to the user that the card is non-interactive. The parent (`SavedSearchShortcutList`) always receives `onPrefillSearch` as optional, so this can reach users.

```typescript
// FIX — disable or hide cards when onPrefill is absent,
// or make onPrefillSearch required in SavedSearchShortcutListProps:
interface SavedSearchShortcutListProps {
  // ...
  onPrefillSearch: (query: string) => void; // make required
}
```

---

### MR-03: `SearchCard` description/keywords not shown — count label is the only text

**File:** `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx:45-87`
**Issue:** The `SearchCard` renders the persona name and count label only. The `Persona` type likely includes a description or keywords field (comparable to `SuggestionCard.description`). Without it, all cards look nearly identical if count is zero or unknown. This is a logic gap — either the description should be rendered or the intent to omit it should be documented.

```typescript
// FIX — if Persona has a description/keywords field, render it:
<span className="text-[12px] font-light" style={{ color: "var(--text-secondary-ds)" }}>
  {persona.description ?? persona.keywords ?? ""}
</span>
```

---

## Low Issues

### LR-01: Missing `type="button"` on sidebar rail toggle button

**File:** `src/app/[orgId]/search/components/search-sidebar-rail.tsx:43-58`
**Issue:** The collapse toggle `<button>` does not have `type="button"`. If `SearchSidebarRail` is ever rendered inside a `<form>` element, this button would submit the form by default. The pattern is already used correctly everywhere else in the changed files.

```typescript
// FIX:
<button
  type="button"
  onClick={onToggleCollapse}
  // ...
>
```

---

### LR-02: Inline `onMouseEnter`/`onMouseLeave` style mutations — fragile hover pattern

**File:** `src/app/[orgId]/search/components/discover-tab.tsx:104-109`, `src/app/[orgId]/search/components/search-sidebar-rail.tsx:48-55,116-126`
**Issue:** Hover effects are applied by directly mutating `e.currentTarget.style` in event handlers. This works but breaks if the element is focussed (keyboard navigation does not trigger these handlers), and is inconsistent with Tailwind utility usage elsewhere. It also means the hover state is not reset if the cursor leaves during a re-render.

```typescript
// FIX — use Tailwind hover variants or a hover state boolean (already done in SearchCard):
className="... hover:text-[var(--gold-primary)]"
// or a simple boolean:
const [hovered, setHovered] = useState(false);
```

---

### LR-03: `COMPANY_ALIASES` values for JPMorgan and Wells Fargo contain double spaces

**File:** `src/lib/enrichment/edgar.ts:85,89`
**Issue:** The alias values `'jpmorgan chase  co'` and `'wells fargo  co'` each contain two consecutive spaces. After `normalizeCompanyName` collapses whitespace (`replace(/\s+/g, ' ')`), these become `'jpmorgan chase co'` and `'wells fargo co'`. The SEC legal entity names are `JPMorgan Chase & Co` and `Wells Fargo & Company`. The `&` is stripped by the stopword regex, leaving `jpmorgan chase co` and `wells fargo company`. The double-space values work by accident after normalization, but the source strings are misleading and one of them (`wells fargo  co` vs `wells fargo company`) may still not match after normalization depending on which stopwords fire.

```typescript
// FIX — align alias values with what normalizeCompanyName produces:
'jpmorgan': 'jpmorgan chase co',   // & stripped, single space
'jp morgan': 'jpmorgan chase co',
'wells fargo': 'wells fargo',      // "company" and "co" are both stopwords
```

---

## Info

### IN-01: `console.log` left in production path for LLM canonicalization

**File:** `src/lib/enrichment/edgar.ts:191`
**Issue:** `console.log(\`[Edgar] LLM canonicalized...\`)` fires on every successful LLM-assisted CIK lookup. This is an enrichment server path that may run inside Inngest workers, so the log will appear in production logs for every invocation. Consider using a debug-gated logger or removing the log.

```typescript
// FIX — guard behind an env flag or remove:
if (process.env.NODE_ENV === 'development') {
  console.log(`[Edgar] LLM canonicalized "${companyName}" → "${llmName}" → matched "${entry.title}"`);
}
```

---

### IN-02: `Mic` button renders with no accessible label on its disabled state

**File:** `src/app/[orgId]/search/components/nl-search-bar.tsx:103-116`
**Issue:** The mic button has `aria-label="Voice search (coming soon)"` which is good. However, the `disabled` attribute alone does not communicate to screen readers *why* it is disabled. The current label already includes "(coming soon)" which is sufficient — this is an observation rather than a defect. The `disabled` prop also prevents keyboard focus (correct behaviour for a feature not yet available).

No code change needed; noted for completeness.

---

_Reviewed: 2026-04-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
