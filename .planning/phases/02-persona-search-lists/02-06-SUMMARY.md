---
phase: 02-persona-search-lists
plan: 06
type: execute
status: complete
subsystem: search-integration
tags: [prospects, lists, deduplication, upsert, apollo, dialog, ui]

one_liner: "Prospect upsert with email/LinkedIn deduplication and Add to List dialog for saving Apollo search results to lists"

dependency_graph:
  requires: [02-03, 02-04, 02-05]
  provides:
    - prospect_upsert_pattern
    - add_to_list_dialog
    - search_to_list_bridge
  affects: [02-07, 03-01]

tech_stack:
  added: []
  patterns:
    - upsert_with_deduplication
    - idempotent_list_operations
    - multi_select_dialog

key_files:
  created:
    - src/lib/prospects/types.ts
    - src/lib/prospects/queries.ts
    - src/app/api/prospects/upsert/route.ts
    - src/app/(dashboard)/[orgId]/search/components/add-to-list-dialog.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/toast.tsx
    - src/components/ui/toaster.tsx
    - src/hooks/use-toast.ts
  modified:
    - src/app/(dashboard)/[orgId]/search/components/search-results-table.tsx
    - src/app/(dashboard)/[orgId]/search/components/search-content.tsx
    - src/app/(dashboard)/[orgId]/search/page.tsx
    - src/app/layout.tsx

decisions:
  - what: "Use work_email as primary dedup key, linkedin_url as fallback"
    why: "Aligns with database schema and matches real-world uniqueness patterns"
    alternatives: "Could use apollo_id but that doesn't help with manual imports"

  - what: "Map Apollo fields to prospects table schema at query layer"
    why: "Keeps API responses clean and centralizes field mapping logic"
    alternatives: "Could map in API route but would repeat logic"

  - what: "Promise.allSettled for multi-list adds with ignore-duplicate logic"
    why: "Idempotent operation - treat 'already in list' as success"
    alternatives: "Could pre-check membership but adds unnecessary queries"

  - what: "Column definition as function createColumns(lists, orgId)"
    why: "TanStack Table columns need closure over lists for AddToListDialog"
    alternatives: "Could use context but columns definition is cleaner"

metrics:
  duration: 16 minutes
  completed: 2026-02-08
---

# Phase 02 Plan 06: Search-to-Lists Integration Summary

## What Was Built

Connected search results to list management with prospect deduplication and a multi-list add dialog. Users can now save Apollo prospects to lists with one click.

### Task 1: Prospect Infrastructure

**Files:** `src/lib/prospects/types.ts`, `src/lib/prospects/queries.ts`, `src/app/api/prospects/upsert/route.ts`

Created the prospect types and upsert pattern:

- **Prospect and UpsertProspectInput interfaces** aligned with database schema (work_email, work_phone, personal_email, personal_phone)
- **upsertProspect** with smart deduplication:
  - Primary: deduplicate by `(tenant_id, work_email)` if email exists
  - Fallback: deduplicate by `(tenant_id, linkedin_url)` if LinkedIn URL exists
  - Plain insert if neither exists (no dedup possible)
- **upsertProspectFromApollo** maps Apollo API fields to prospect schema (location string concatenation, phone extraction)
- **POST /api/prospects/upsert** route:
  - Validates request with Zod schema (prospect + listIds array)
  - Upserts prospect from Apollo data
  - Adds to multiple lists with Promise.allSettled (idempotent)
  - Treats "already in list" errors as success

### Task 2: Add to List Dialog

**Files:** `add-to-list-dialog.tsx`, updated search components and page

Built the user-facing integration:

- **AddToListDialog component:**
  - Multi-list selection with checkboxes
  - Shows list details (name, description, member count)
  - Empty state with "Create your first list" link
  - Loading state during submission
  - Success/error toast notifications
- **SearchResultsTable refactor:**
  - Column definition as function: `createColumns(lists, orgId)`
  - Actions column now renders AddToListDialog (removed disabled stub)
- **Search page updates:**
  - Fetches both personas and lists in parallel
  - Passes lists and orgId through SearchContent → SearchResultsTable
- **Root layout:** Added Toaster component for toast notifications
- **shadcn components:** Installed checkbox and toast components

## Architectural Decisions

### Deduplication Strategy

**Decision:** Use work_email as primary key, linkedin_url as secondary

The database has two unique constraints:
- `UNIQUE NULLS NOT DISTINCT (tenant_id, work_email)`
- `UNIQUE NULLS NOT DISTINCT (tenant_id, linkedin_url)`

Our upsert logic:
1. If work_email exists → onConflict: "tenant_id,work_email"
2. Else if linkedin_url exists → onConflict: "tenant_id,linkedin_url"
3. Else → regular insert (no dedup)

This handles:
- Same person from multiple Apollo searches (deduped by email)
- LinkedIn profiles without emails (deduped by URL)
- Anonymous prospects (inserted as-is)

### Idempotent List Operations

**Decision:** Treat "Prospect already in list" as success in multi-list add

When adding to multiple lists:
```typescript
const addResults = await Promise.allSettled(
  listIds.map((listId) => addProspectToList(...))
);

const successfulAdds = addResults.filter((result) => {
  if (result.status === "fulfilled") return true;
  if (result.status === "rejected") {
    return result.reason?.message?.includes("already in list");
  }
  return false;
}).length;
```

Benefits:
- User can spam "Add to List" without errors
- Selecting same list twice doesn't fail
- Simplifies UI logic (no pre-check needed)

### Column Factory Pattern

**Decision:** Define columns as `createColumns(lists, orgId)` function

TanStack Table's columns definition is static, but we need to pass dynamic data (lists, orgId) to AddToListDialog in the actions cell.

Solution: Column definition function that closes over lists and orgId:
```typescript
function createColumns(lists: List[], orgId: string): ColumnDef<ApolloPerson>[] {
  return [
    // ... other columns
    {
      id: "actions",
      cell: ({ row }) => (
        <AddToListDialog
          prospect={row.original}
          lists={lists}
          orgId={orgId}
          trigger={<Button>Add to List</Button>}
        />
      ),
    },
  ];
}
```

Called in component: `const columns = createColumns(lists, orgId);`

## Technical Implementation Notes

### Field Mapping: Apollo → Prospects Table

Apollo API returns different field names than our database schema:

| Apollo Field | Prospects Field | Mapping Logic |
|--------------|-----------------|---------------|
| `email` | `work_email` | Direct |
| `phone_numbers[0]` | `work_phone` | Extract first phone, prefer sanitized |
| `city, state, country` | `location` | Concatenate with ", " |
| `organization_name` | `company` | Direct |
| `id` | `apollo_id` | Direct |
| N/A | `personal_email` | Set to null (enrichment later) |
| N/A | `personal_phone` | Set to null (enrichment later) |

The `upsertProspectFromApollo` function centralizes this mapping.

### Database Schema Alignment

**IMPORTANT:** The plan specified `email`, `phone`, etc., but the actual database schema uses:
- `work_email` / `personal_email` (split for enrichment tracking)
- `work_phone` / `personal_phone` (same reason)
- `full_name` (generated column from first_name + last_name)
- `location` (single text field, not separate city/state/country)

Implementation follows the **actual schema**, not the plan's field names. This is correct behavior (Rule 1 - bug fix to align with reality).

### Toast Notifications

Added shadcn toast system:
- `src/hooks/use-toast.ts` - React hook for showing toasts
- `src/components/ui/toaster.tsx` - Portal component for rendering toasts
- `src/components/ui/toast.tsx` - Toast UI component
- Added `<Toaster />` to root layout for global access

AddToListDialog uses `useToast()` hook for success/error feedback.

## Deviations from Plan

None - plan executed exactly as written, with one clarification:

**Schema Alignment:** Plan specified field names like `email`, `phone`, `name` but database uses `work_email`, `work_phone`, `first_name/last_name/full_name`. Implementation correctly uses actual database schema fields. This is not a deviation - it's adapting to the existing database design (Rule 1 auto-fix for correctness).

## Testing Notes

### Manual Testing Required

Since this involves UI interactions and API calls:

1. **Upsert deduplication:**
   - Add same prospect from search twice → should update, not duplicate
   - Add prospect with email, then same LinkedIn URL without email → should deduplicate

2. **Add to List dialog:**
   - Click "Add to List" on search result → dialog opens
   - Select multiple lists → submit → success toast shows
   - Close and reopen → selections reset
   - Try with no lists → shows "Create your first list" link

3. **Multi-list add:**
   - Add prospect to 3 lists at once → should succeed for all
   - Add same prospect to same list again → should be idempotent (no error)

### TypeScript Verification

Ran `pnpm tsc --noEmit` - zero errors. All type definitions compile correctly.

## Files Changed

**Created (12 files):**
- `src/lib/prospects/types.ts` - Prospect interfaces
- `src/lib/prospects/queries.ts` - Upsert with deduplication
- `src/app/api/prospects/upsert/route.ts` - API endpoint
- `src/app/(dashboard)/[orgId]/search/components/add-to-list-dialog.tsx` - Dialog UI
- `src/components/ui/checkbox.tsx` - shadcn checkbox
- `src/components/ui/toast.tsx` - shadcn toast
- `src/components/ui/toaster.tsx` - shadcn toaster
- `src/hooks/use-toast.ts` - useToast hook

**Modified (4 files):**
- `src/app/(dashboard)/[orgId]/search/components/search-results-table.tsx` - Wire AddToListDialog
- `src/app/(dashboard)/[orgId]/search/components/search-content.tsx` - Pass lists and orgId
- `src/app/(dashboard)/[orgId]/search/page.tsx` - Fetch lists
- `src/app/layout.tsx` - Add Toaster component

## Next Phase Readiness

**Ready for Phase 2 Plan 7:** E2E verification checkpoint

**Blockers:** None

**Concerns:** None - integration is complete and type-safe

**Capabilities Unlocked:**
- Users can save Apollo search results to lists
- Prospects are deduplicated automatically
- Multi-list addition in one action
- Foundation for enrichment pipeline (personal_email, personal_phone fields ready)

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 3f438b7 | feat(02-06): create prospect types, upsert queries, and upsert API route | types.ts, queries.ts, route.ts |
| 739482a | feat(02-06): create Add to List dialog and wire to search results | add-to-list-dialog.tsx, search-results-table.tsx, search-content.tsx, page.tsx, layout.tsx, checkbox.tsx, toast.tsx, toaster.tsx, use-toast.ts |

---

*Duration: 16 minutes | Completed: 2026-02-08*
