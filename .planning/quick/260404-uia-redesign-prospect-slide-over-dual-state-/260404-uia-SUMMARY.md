---
quick_task: 260404-uia
title: Redesign Prospect Slide-Over Dual State
completed: "2026-04-03"
duration: ~5min
tasks_completed: 2
files_modified: 2
commit: 613199d
---

# Quick Task 260404-uia: Redesign Prospect Slide-Over Dual State Summary

**One-liner:** Prospect slide-over now renders a minimal preview state for unenriched Apollo results and a full contact/info state for enriched prospects, replacing all dead/unused UI sections.

## What Was Done

### Task 1 — Rewrite prospect-slide-over.tsx

Replaced the monolithic 548-line component with a clean 200-line dual-state implementation:

**Preview state** (`_enriched === false`):
- Avatar with "?" initials (identity obfuscated)
- Blurred name placeholder block
- 2-cell grid showing only Title and Company
- Gold-bordered "Enrich & Save" CTA card explaining what enrichment unlocks
- No "View Full Profile" link (prospect not in DB yet)

**Enriched state** (`_enriched === true`):
- Avatar with real initials, full name displayed
- Email button (mailto: link, only rendered when email exists)
- Phone button (tel: link, only rendered when phone exists)
- 4-cell grid: Title, Company, Location, Email
- "View Full Profile" link in header

**Removed entirely:**
- Dead action buttons (Chat, More) with no handlers
- AI Insight section
- Notes section and `notes` prop
- Lists Membership section and `listMemberships` prop
- Enrichment Progress bar and source tags
- SEC Insider Transactions section
- All unused interfaces: `Transaction`, `Note`, `ListMembership`, `SourceStatus`
- All unused helpers: `getEnrichmentPercentage`, `getSourceTagStyle`, `EnrichmentIcon`, `formatCurrency`, `formatRelativeDate`
- Unused lucide imports: `MessageSquare`, `MoreHorizontal`, `Sparkles`, `Circle`, `CheckCircle2`, `XCircle`, `Minus`
- Unused fields on Prospect interface: `wealth_tier`, `ai_summary`, `enrichment_source_status`, `insider_data`
- Added to Prospect interface: `phone: string | null`, `_enriched: boolean`

### Task 2 — Update slideOverProspect mapping in search-content.tsx

- Added `_enriched: selectedProspect._enriched === true`
- Added `phone: selectedProspect.phone_numbers?.[0]?.raw_number ?? null`
- Removed `ai_summary`, `enrichment_source_status`, `insider_data` from mapping

## Files Modified

| File | Change |
|------|--------|
| `src/components/prospect/prospect-slide-over.tsx` | Full rewrite — 548 → ~200 lines |
| `src/app/[orgId]/search/components/search-content.tsx` | Updated slideOverProspect mapping |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The "Enrich & Save" CTA intentionally directs the user to use the table's "Enrich Selection" button rather than providing an inline action — this is by design per the plan requirements.

## Self-Check: PASSED

- `src/components/prospect/prospect-slide-over.tsx` — exists, verified
- `src/app/[orgId]/search/components/search-content.tsx` — exists, verified
- Commit `613199d` — verified present in git log
- TypeScript errors pre-existing in unrelated test file only — no errors in modified files
