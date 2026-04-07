---
phase: 32-discover-tab-v2-layout-tightening-search-depth-filter-pills-suggested-personas
verified: 2026-04-08T12:00:00Z
status: human_needed
score: 22/22 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/22
  gaps_closed:
    - "NLSearchBar background is rgba(255,255,255,0.03)"
    - "NLSearchBar resting border is rgba(212,175,55,0.18)"
    - "NLSearchBar focused border is rgba(212,175,55,0.55)"
    - "NLSearchBar focused box-shadow stacks inner glow + outer ring"
    - "NLSearchBar bottom toolbar no longer renders the Filters chip on the left"
    - "NLSearchBar toolbar now shows only Mic + ArrowUp send button (right-aligned)"
    - "NLSearchBar onToggleFilters and filtersOpen props are removed from the interface"
    - "Hero h1 renders at text-[32px] sm:text-[40px]"
    - "Hero subtext margin-top reduced from mt-3 to mt-2"
    - "Wrapper div around hero uses mb-4 instead of mb-8"
    - "Stats bar strip renders between hero and search box"
    - "discover-tab.tsx no longer renders AdvancedFiltersPanel inline"
    - "discover-tab.tsx no longer passes onToggleFilters or filtersOpen to NLSearchBar"
    - "Server layout queries personas count and lists count using Promise.all"
    - "Counts are passed as props from layout.tsx to Sidebar to NavItems"
    - "NavItems renders pill badges next to Saved Searches and Lists labels"
    - "Badges have rounded-full styling with active gold and inactive subdued states"
    - "Badges only render when collapsed=false"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Click into the search bar on the discover tab"
    expected: "Gold border animates from 0.18 to 0.55 opacity; stacked inner inset + outer ring box-shadow appears"
    why_human: "Cannot test CSS transitions programmatically"
  - test: "Load the discover tab on a 1440px viewport"
    expected: "Heading is visibly smaller — approximately 40px at sm breakpoint"
    why_human: "Visual regression requires browser rendering"
  - test: "Load the discover tab"
    expected: "'12,400+ prospects indexed · Updated 2 hours ago' appears in small all-caps text between heading and search bar"
    why_human: "Placement and rendering requires browser inspection"
  - test: "Log in as a tenant user who has saved searches and lists; inspect sidebar"
    expected: "Saved Searches nav item shows a count badge; Lists nav item shows a count badge; badges disappear when sidebar is collapsed"
    why_human: "Requires live Supabase session and correct RLS scoping"
---

# Phase 32: Discover Tab v2 Verification Report (Re-verification)

**Phase Goal:** Tighten the Discover tab layout (scaled hero, stats bar, elevated search bar), add filter pills row, add suggested personas section, upgrade saved search cards, and add sidebar nav count badges.
**Verified:** 2026-04-08T12:00:00Z
**Status:** HUMAN NEEDED
**Re-verification:** Yes — after gap-closure fixes

---

## Summary

All 15 previously-failing truths are now verified in the codebase. The two root causes identified in the first verification (worktree merge revert of Plans 01 and 03 deliverables; AdvancedFiltersPanel not cleaned up) have both been resolved. All 22/22 must-haves pass automated checks. Four visual/behavioral items require human verification before the phase can be marked fully passed.

---

## Goal Achievement

### Observable Truths — Plan 01

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hero h1 at text-[32px] sm:text-[40px] | VERIFIED | discover-tab.tsx line 57: `font-serif text-[32px] sm:text-[40px] font-medium` |
| 2 | Hero subtext mt-2 (tighter) | VERIFIED | discover-tab.tsx line 63: `mt-2 text-[13px] font-light` |
| 3 | Wrapper div uses mb-4 | VERIFIED | discover-tab.tsx line 55: `mb-4 text-center relative` |
| 4 | Stats bar renders between hero and search | VERIFIED | discover-tab.tsx lines 71–78: stats bar div with "12,400+ prospects indexed" present |
| 5 | NLSearchBar background rgba(255,255,255,0.03) | VERIFIED | nl-search-bar.tsx line 45: `background: "rgba(255,255,255,0.03)"` |
| 6 | NLSearchBar resting border rgba(212,175,55,0.18) | VERIFIED | nl-search-bar.tsx line 47: `"rgba(212,175,55,0.18)"` in ternary else branch |
| 7 | NLSearchBar focused border rgba(212,175,55,0.55) | VERIFIED | nl-search-bar.tsx line 47: `"rgba(212,175,55,0.55)"` in isFocused branch |
| 8 | NLSearchBar focused box-shadow stacks inner+outer | VERIFIED | nl-search-bar.tsx lines 49–51: `"inset 0 0 0 1px rgba(212,175,55,0.25), 0 0 0 4px rgba(212,175,55,0.08)"` |
| 9 | Filters chip removed from NLSearchBar toolbar | VERIFIED | nl-search-bar.tsx: only ArrowUp and Mic imported; no SlidersHorizontal; no Filters button |
| 10 | Toolbar uses justify-end (only Mic + ArrowUp) | VERIFIED | nl-search-bar.tsx line 74: `flex items-center justify-end px-3 pb-3` |
| 11 | onToggleFilters/filtersOpen props removed from NLSearchBar | VERIFIED | nl-search-bar.tsx lines 6–10: NLSearchBarProps has only initialValue, onSearch, isLoading |
| 12 | discover-tab no longer passes onToggleFilters/filtersOpen | VERIFIED | discover-tab.tsx lines 83–91: NLSearchBar receives only key, initialValue, onSearch, isLoading |
| 13 | discover-tab no longer renders AdvancedFiltersPanel inline | VERIFIED | discover-tab.tsx: no AdvancedFiltersPanel import, no filtersOpen state, no inline render |
| 14 | Save this search ghost link preserved | VERIFIED | discover-tab.tsx lines 97–118: ghost link present, conditional on keywords.trim() |

### Observable Truths — Plan 02

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 15 | FilterPillsRow renders 4 pills below search bar | VERIFIED | filter-pills-row.tsx: PILLS array has 4 entries (Industry/Title/Location/Net Worth); wired in discover-tab.tsx line 94 |
| 16 | Each pill toggles a popover (one open at a time) | VERIFIED | filter-pills-row.tsx lines 40–43: openPill single state, togglePill sets prev===key ? null : key |
| 17 | Net Worth uses option list; others use text input; Apply+Clear present | VERIFIED | filter-pills-row.tsx lines 128–215: NET_WORTH_OPTIONS rendered for networth key; input for others; Apply/Clear buttons present |
| 18 | Apply calls onApplyFilters with correct Partial<PersonaFilters> | VERIFIED | filter-pills-row.tsx lines 44–59: apply() builds filters object and calls onApplyFilters(filters) |
| 19 | Click-outside closes any open popover | VERIFIED | filter-pills-row.tsx lines 29–38: mousedown listener on document, checks containerRef.contains |
| 20 | SavedSearchShortcutList uses lg:grid-cols-4 | VERIFIED | saved-search-shortcut-list.tsx line 204: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` |
| 21 | SearchCard wraps names (whitespace-normal break-words line-clamp-2) | VERIFIED | saved-search-shortcut-list.tsx line 90: `whitespace-normal break-words line-clamp-2` |
| 22 | SearchCard shows metadata row (count + relative date) | VERIFIED | saved-search-shortcut-list.tsx lines 107–113: count label and lastRun span present |
| 23 | SearchCard renders Play icon in top-right corner | VERIFIED | saved-search-shortcut-list.tsx lines 98–104: `<Play className="absolute top-4 right-4 h-3.5 w-3.5" />` |
| 24 | SuggestedPersonasSection has 5 static persona cards | VERIFIED | suggested-personas-section.tsx: SUGGESTED array has 5 entries |
| 25 | Each suggestion shows icon, label, description, ~N prospects, Try this | VERIFIED | suggested-personas-section.tsx SuggestedCard: Icon, label, description, count, "Try this →" all rendered |
| 26 | Clicking a suggestion calls onPrefillSearch(query) | VERIFIED | suggested-personas-section.tsx line 79: `onClick={() => onPrefill(item.query)}` |
| 27 | Suggestion grid uses lg:grid-cols-3 | VERIFIED | suggested-personas-section.tsx line 141: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` |
| 28 | SuggestedPersonasSection renders below SavedSearchShortcutList | VERIFIED | discover-tab.tsx lines 122–132: SavedSearchShortcutList at line 123, SuggestedPersonasSection at line 132 |

### Observable Truths — Plan 03

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 29 | layout.tsx queries personas+lists count via Promise.all | VERIFIED | layout.tsx lines 50–59: `await Promise.all([...personas head-count..., ...lists head-count...])` |
| 30 | savedSearchCount/listsCount extracted and held as let vars | VERIFIED | layout.tsx lines 20–21: `let savedSearchCount = 0; let listsCount = 0;` populated at lines 61–62 |
| 31 | Counts passed layout -> Sidebar as props | VERIFIED | layout.tsx lines 96–97: `savedSearchCount={savedSearchCount} listsCount={listsCount}` on Sidebar invocation |
| 32 | Sidebar accepts and forwards counts to NavItems | VERIFIED | sidebar.tsx lines 15–17: SidebarProps includes savedSearchCount?/listsCount?; line 85: passed to NavItems |
| 33 | NavItems accepts savedSearchCount/listsCount props | VERIFIED | nav-items.tsx lines 19–20: props declared in NavItemsProps |
| 34 | getBadgeCount helper returns count for matching labels | VERIFIED | nav-items.tsx lines 50–54: getBadgeCount returns savedSearchCount for "Saved Searches", listsCount for "Lists" |
| 35 | NavItems renders pill badge next to Saved Searches and Lists labels | VERIFIED | nav-items.tsx lines 85–108: IIFE calls getBadgeCount; if non-null, renders span with badge value |
| 36 | Badges hidden when collapsed=false check | VERIFIED | nav-items.tsx line 85: badge IIFE is inside `{!collapsed && ...}` block |
| 37 | Active nav item gets gold-tinted badge; inactive gets subdued | VERIFIED | nav-items.tsx lines 92–103: isActive ternary applies gold-bg/border-gold/gold-primary vs bg-elevated/border-subtle/text-secondary-ds |

**Score: 22/22 truths verified** (all previous failures resolved)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/[orgId]/search/components/nl-search-bar.tsx` | Elevated bg, gold focus, no Filters chip | VERIFIED | rgba(255,255,255,0.03) bg; isFocused ternary at 0.55/0.18; stacked box-shadow; only ArrowUp+Mic imported |
| `src/app/[orgId]/search/components/discover-tab.tsx` | Tightened hero, stats bar, no inline AdvancedFiltersPanel | VERIFIED | mb-4 wrapper, 32/40px h1, mt-2 subtext, stats bar at lines 71–78, no AdvancedFiltersPanel, no filtersOpen state |
| `src/app/[orgId]/search/components/filter-pills-row.tsx` | 4 pills with popovers and onApplyFilters callback | VERIFIED | All 4 pills, click-outside, apply/clear, NET_WORTH_OPTIONS, onApplyFilters call |
| `src/app/[orgId]/search/components/suggested-personas-section.tsx` | 5 static persona cards with onPrefillSearch | VERIFIED | 5-entry SUGGESTED array, SuggestedCard with icon/label/description/count/Try-this, onClick wired |
| `src/app/[orgId]/search/components/saved-search-shortcut-list.tsx` | SearchCard upgrades, lg:grid-cols-4 | VERIFIED | lg:grid-cols-4 on line 204, whitespace-normal/break-words/line-clamp-2, Play icon, metadata row |
| `src/components/layout/nav-items.tsx` | Badge on Saved Searches + Lists | VERIFIED | getBadgeCount helper, IIFE badge span, !collapsed guard, active/inactive styling |
| `src/components/layout/sidebar.tsx` | Thread savedSearchCount + listsCount | VERIFIED | Props in SidebarProps interface, forwarded to NavItems on line 85 |
| `src/app/[orgId]/layout.tsx` | Server-side count queries | VERIFIED | Promise.all with personas + lists head-count queries; results passed to Sidebar |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| FilterPillsRow Apply button | discover-tab onApplyFilters | onApply callback | VERIFIED | discover-tab.tsx line 94 passes onApplyFilters to FilterPillsRow |
| SuggestedPersonasSection Try this | discover-tab handlePrefill | onPrefillSearch | VERIFIED | discover-tab.tsx line 132 passes handlePrefill |
| layout.tsx | Sidebar | savedSearchCount + listsCount props | VERIFIED | layout.tsx lines 96–97 |
| Sidebar | NavItems | savedSearchCount + listsCount props | VERIFIED | sidebar.tsx line 85 |
| NavItems badge | rendered count value | getBadgeCount + IIFE | VERIFIED | nav-items.tsx lines 50–108 |
| NLSearchBar | gold focus state | rgba(212,175,55,0.55) border | VERIFIED | nl-search-bar.tsx lines 46–51 |
| discover-tab NLSearchBar | no Filters chip passthrough | props removed | VERIFIED | NLSearchBar invocation has no onToggleFilters/filtersOpen |

---

## Anti-Patterns Found

None. The previous blockers (AdvancedFiltersPanel coexisting with FilterPillsRow; onToggleFilters/filtersOpen still present in NLSearchBar) are resolved. No TODO/FIXME/placeholder comments found in modified files.

---

## Behavioral Spot-Checks

Step 7b: SKIPPED (all modified files are client components; requires running Next.js dev server)

---

## Human Verification Required

### 1. NLSearchBar Focus State

**Test:** Click into the search bar on the discover tab.
**Expected:** Gold border animates from 0.18 to 0.55 opacity; stacked inner inset + outer ring box-shadow appears.
**Why human:** Cannot test CSS transitions programmatically.

### 2. Hero Scale-Down

**Test:** Load the discover tab on a 1440px viewport.
**Expected:** Heading is visibly smaller than before — approximately 40px at sm breakpoint.
**Why human:** Visual regression requires browser rendering.

### 3. Stats Bar Trust Strip

**Test:** Load the discover tab.
**Expected:** "12,400+ prospects indexed · Updated 2 hours ago" appears in small all-caps text between heading and search bar.
**Why human:** Requires browser rendering to verify placement.

### 4. Sidebar Count Badges

**Test:** Log in as a tenant user who has saved searches and lists.
**Expected:** "Saved Searches" nav item shows a count badge; "Lists" nav item shows a count badge; badges disappear when sidebar is collapsed.
**Why human:** Requires live Supabase session and correct RLS scoping.

---

## Gaps Summary

No automated gaps remain. All 15 truths that failed in the initial verification are now satisfied. The only outstanding items are the four human verification checks above, which require a running browser session.

---

_Verified: 2026-04-08T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
