---
phase: 08-lead-search
plan: "07"
status: complete
started: "2026-03-01"
completed: "2026-03-01"
duration_minutes: 3
tasks_completed: 2
files_modified: 1
---

# Plan 08-07 Summary: Implement Bulk Action Handlers

## What Changed

### src/app/[orgId]/search/components/search-content.tsx

**New state:**
- `bulkListDialogOpen`, `bulkMode` ("add" | "enrich"), `isBulkSubmitting`, `bulkSelectedListIds`

**New imports:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from shadcn
- `Checkbox`, `Label` from shadcn
- `useToast` from `@/hooks/use-toast`
- `Loader2` from lucide-react
- `Link` from next/link

**handleBulkAddToList:**
- Opens state-controlled Dialog with list selection checkboxes
- `handleBulkListSubmit` uses `Promise.allSettled` to add all selected prospects to chosen lists via `/api/prospects/upsert`
- Shows success/failure toast with counts
- Clears selection on full success

**handleBulkExport:**
- Client-side CSV generation from in-memory Apollo results
- Headers: Name, Title, Company, Location, Email, LinkedIn URL
- Proper field escaping (commas, quotes, newlines)
- UTF-8 BOM for Excel compatibility
- Browser download via `Blob` + `URL.createObjectURL`
- Toast confirmation with count

**handleBulkEnrich:**
- Reuses same Dialog in "enrich" mode with different messaging
- Title: "Enrich Selection", description: "Save to a list to begin enrichment"
- Submit button: "Save & Enrich"
- Enrichment triggered automatically by existing lazy enrichment pipeline after save

**Bulk list selection Dialog:**
- Rendered before ProspectSlideOver in JSX
- Shows list name, description, member count with checkboxes
- Empty state with link to create first list
- Loading spinner on submit button during bulk operation

## Verification
- `npx tsc --noEmit` passes clean
- `pnpm build` passes clean
- Zero `TODO:` stubs remaining in search-content.tsx
- All three bulk action buttons have real implementations

## Gap Closed
Gap 2 from 08-VERIFICATION.md: All three bulk action handlers (Add to List, Export CSV, Enrich Selection) now perform real operations. No empty stubs remain.
