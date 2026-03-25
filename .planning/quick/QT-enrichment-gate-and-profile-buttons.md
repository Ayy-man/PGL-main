# Quick Task: Enrichment Gate + Fix Profile Buttons

## Goal
1. Stop obfuscated/un-enriched Apollo leads from reaching lists
2. Fix broken profile page buttons (Add to List, Globe icon)

## Part 1: Enrichment Gate

### 1A. Mark results as enriched or not
- `src/lib/apollo/types.ts` — Add `_enriched?: boolean` to `ApolloPerson`
- `src/lib/apollo/client.ts` — Set `_enriched: true` on bulk-enriched results, `_enriched: false` on fallback

### 1B. Client-side UI indicator
- `src/app/[orgId]/search/components/prospect-results-table.tsx` — Show "Preview Only" badge for un-enriched prospects

### 1C. Block add-to-list for un-enriched
- `src/app/[orgId]/search/components/search-content.tsx` — Filter out `_enriched === false` prospects from bulk add-to-list, warn user
- `src/app/api/prospects/upsert/route.ts` — Server-side guard: reject names containing `***`

## Part 2: Fix Profile Buttons

### 2A. Add to List dialog (profile page)
- Create `src/components/prospect/add-to-list-dialog-profile.tsx` — Dialog for existing DB prospect (uses addToListAction server action, fetches lists client-side)
- `src/app/[orgId]/prospects/[prospectId]/page.tsx` — Pass lists data to ProfileView
- `src/components/prospect/profile-view.tsx` — Wire Add to List with new dialog

### 2B. Fix Globe icon
- `src/components/prospect/profile-header.tsx` — Remove broken Globe button (no website URL data in DB)
