---
phase: 33-tenant-issue-reporting-system
plan: 03
type: execute
wave: 3
depends_on: ["33-02"]
files_modified:
  - src/app/[orgId]/prospects/[prospectId]/page.tsx
  - src/app/[orgId]/lists/[listId]/page.tsx
  - src/app/[orgId]/personas/page.tsx
  - src/app/[orgId]/search/search-content.tsx  # or similar — confirm exact path during Task 1
autonomous: true
requirements:
  - REQ-33-15  # Mount <ReportIssueButton> on prospect dossier header
  - REQ-33-16  # Mount <ReportIssueButton> on list detail header
  - REQ-33-17  # Mount <ReportIssueButton> on search filter bar (via SearchContent client)
  - REQ-33-18  # Mount <ReportIssueButton> on personas list header

must_haves:
  truths:
    - "Clicking 'Report an issue' on the prospect dossier page opens the dialog with target.type='prospect' and target.snapshot containing name/title/company/linkedin"
    - "Clicking 'Report an issue' on the list detail page opens the dialog with target.type='list' and target.snapshot containing list name + member count"
    - "Clicking 'Report an issue' on the search page opens the dialog with target.type='search' and target.snapshot containing the current search query/filters"
    - "Clicking 'Report an issue' on the personas list page opens the dialog with target.type='persona' (list-level) or target.type='none' and target.snapshot = { scope: 'personas_index' }"
    - "None of the existing page layouts regress — the button is additive and does not displace existing headers"
    - "Button is NOT mounted on tenant settings, org admin pages, login/auth pages"
  artifacts:
    - path: "src/app/[orgId]/prospects/[prospectId]/page.tsx"
      provides: "ReportIssueButton mounted in header with prospect snapshot"
      contains: "ReportIssueButton"
    - path: "src/app/[orgId]/lists/[listId]/page.tsx"
      provides: "ReportIssueButton mounted in list header"
      contains: "ReportIssueButton"
    - path: "src/app/[orgId]/personas/page.tsx"
      provides: "ReportIssueButton mounted in personas header"
      contains: "ReportIssueButton"
  key_links:
    - from: "prospect dossier page"
      to: "ReportIssueButton target"
      via: "target={{ type: 'prospect', id: prospect.id, snapshot: { name, title, company, linkedin_url } }}"
      pattern: "type: ['\"]prospect['\"]"
    - from: "list detail page"
      to: "ReportIssueButton target"
      via: "target={{ type: 'list', id: list.id, snapshot: { name, member_count } }}"
      pattern: "type: ['\"]list['\"]"
---

<objective>
Mount `<ReportIssueButton>` (from Plan 02) on four tenant pages: prospect dossier, list detail, personas index, and search page. Each mount passes the appropriate target snapshot shape so admins see what the tenant saw.

Purpose: The button component is useless until it's actually placed on the pages where tenants would want to report issues. This plan wires it into the four locked mount points from CONTEXT.md.

Output: Each target page renders the button with the right target payload.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md
@.planning/phases/33-tenant-issue-reporting-system/33-02-SUMMARY.md
@src/components/issues/report-issue-button.tsx
@src/lib/issues/capture-context.ts
@src/app/[orgId]/prospects/[prospectId]/page.tsx
@src/app/[orgId]/lists/[listId]/page.tsx
@src/app/[orgId]/personas/page.tsx
@src/app/[orgId]/search/page.tsx

<interfaces>
<!-- From Plan 02: -->
```typescript
// src/components/issues/report-issue-button.tsx
export interface ReportIssueButtonProps {
  target: ReportTarget;
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

// src/lib/issues/capture-context.ts
export interface ReportTarget {
  type: TargetType;  // 'prospect' | 'list' | 'persona' | 'search' | 'none'
  id?: string;
  snapshot: Record<string, unknown>;
}
```

<!-- Mount pattern: Server Component page imports the client component and renders it directly: -->
```typescript
import { ReportIssueButton } from "@/components/issues/report-issue-button";

// inside the page's header JSX:
<ReportIssueButton
  target={{
    type: "prospect",
    id: prospect.id,
    snapshot: {
      name: prospect.name,
      title: prospect.title,
      company: prospect.company,
      linkedin_url: prospect.linkedin_url,
    },
  }}
/>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Mount ReportIssueButton on prospect dossier + list detail pages</name>
  <files>src/app/[orgId]/prospects/[prospectId]/page.tsx, src/app/[orgId]/lists/[listId]/page.tsx</files>
  <read_first>
    - src/app/[orgId]/prospects/[prospectId]/page.tsx (full file — locate the header action row where the button mounts)
    - src/app/[orgId]/lists/[listId]/page.tsx (full file — locate the page header above the member table)
    - src/components/issues/report-issue-button.tsx (from Plan 02 — verify the prop shape)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Entry point placement LOCKED lines 36-44)
  </read_first>
  <action>
    **Prospect dossier page (`src/app/[orgId]/prospects/[prospectId]/page.tsx`):**

    1. Add the import at the top:
       ```typescript
       import { ReportIssueButton } from "@/components/issues/report-issue-button";
       ```

    2. Locate the page's header section (the area rendered above or alongside `<ProfileView>`). Mount the button in the header action row passing the prospect snapshot:
       ```tsx
       <ReportIssueButton
         target={{
           type: "prospect",
           id: prospect.id,
           snapshot: {
             name: prospect.name ?? null,
             title: prospect.title ?? null,
             company: prospect.company ?? null,
             linkedin_url: prospect.linkedin_url ?? null,
             email: prospect.email ?? null,
           },
         }}
       />
       ```
       The exact prospect variable name depends on what the page already uses — match whatever holds the current prospect row (could be `prospect`, `data`, `dossier.prospect`, etc.). Read the file first to confirm.

    3. If the page uses `params: Promise<{...}>` (Next 15 async params pattern) and awaits to get prospectId, the ReportIssueButton goes AFTER the data fetch so it has access to the prospect data. Do NOT mount it in a loading boundary where the prospect is undefined.

    4. If the prospect data is fetched inside `<ProfileView>` and NOT available in `page.tsx`, then fetch the minimum fields needed for the snapshot (name, title, company, linkedin_url, email) in `page.tsx` itself — use the same server-side Supabase client pattern the rest of the file uses, or pass the button mount down into ProfileView as a child. Prefer fetching in page.tsx to keep the diff additive.

    **List detail page (`src/app/[orgId]/lists/[listId]/page.tsx`):**

    1. Add the same import.

    2. Mount the button in the page header area (above or beside the list title, alongside existing header actions):
       ```tsx
       <ReportIssueButton
         target={{
           type: "list",
           id: list.id,
           snapshot: {
             name: list.name ?? null,
             description: list.description ?? null,
             member_count: memberCount ?? null,
           },
         }}
       />
       ```
       Match the variable name the existing file uses for the list row and member count. Read the file first.

    3. Both pages are Server Components — importing a client component (`ReportIssueButton` has `"use client"`) is a standard Next.js 14 pattern and requires no boundary change.

    4. Keep the diff additive — do NOT refactor the existing header layout. Add the button to the existing action row (usually a flex row at the top with title + existing buttons like Export, Edit).

    5. The ReportIssueButton uses the `ghost` variant by default which matches existing header action buttons across the admin and tenant pages. If the existing header actions use a different variant (e.g., `secondary`), pass `variant="secondary"` to match visually.
  </action>
  <verify>
    <automated>grep -q "ReportIssueButton" src/app/\[orgId\]/prospects/\[prospectId\]/page.tsx && grep -q "type: \"prospect\"" src/app/\[orgId\]/prospects/\[prospectId\]/page.tsx && grep -q "ReportIssueButton" src/app/\[orgId\]/lists/\[listId\]/page.tsx && grep -q "type: \"list\"" src/app/\[orgId\]/lists/\[listId\]/page.tsx && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-03-t1.log && ! grep -q "src/app/\[orgId\]/prospects\|src/app/\[orgId\]/lists" /tmp/tsc-33-03-t1.log</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/[orgId]/prospects/[prospectId]/page.tsx` contains `import { ReportIssueButton }`
    - `src/app/[orgId]/prospects/[prospectId]/page.tsx` contains `<ReportIssueButton` JSX with `type: "prospect"`
    - Prospect snapshot includes at minimum: `name`, `title`, `company`, `linkedin_url` fields
    - `src/app/[orgId]/lists/[listId]/page.tsx` contains `import { ReportIssueButton }`
    - `src/app/[orgId]/lists/[listId]/page.tsx` contains `<ReportIssueButton` JSX with `type: "list"`
    - List snapshot includes at minimum: `name` field
    - No existing imports removed from either file
    - No existing props/types renamed in either file
    - `npx tsc --noEmit` passes with zero new errors on both files
  </acceptance_criteria>
  <done>Both pages render the button in their header and pass correctly-shaped target snapshots.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Mount ReportIssueButton on personas list page + search page (via SearchContent client component)</name>
  <files>src/app/[orgId]/personas/page.tsx, src/app/[orgId]/search/page.tsx (or src/app/[orgId]/search/search-content.tsx — confirm during task)</files>
  <read_first>
    - src/app/[orgId]/personas/page.tsx (full file — find the page header)
    - src/app/[orgId]/search/page.tsx (to determine if it's server or client; per research it wraps SearchContent)
    - List `src/app/[orgId]/search/` to find the SearchContent client component file
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (Mount Point Reality Check lines 568-579)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Entry point placement LOCKED lines 36-44)
  </read_first>
  <action>
    **Personas list page (`src/app/[orgId]/personas/page.tsx`):**

    1. Add the import:
       ```typescript
       import { ReportIssueButton } from "@/components/issues/report-issue-button";
       ```

    2. Mount in the page header next to existing actions (e.g., "Create persona" button):
       ```tsx
       <ReportIssueButton
         target={{
           type: "persona",
           snapshot: {
             scope: "personas_index",
             persona_count: personas?.length ?? 0,
           },
         }}
       />
       ```
       Note: no `id` field — this is a list-level report, not about a specific persona.

    **Search page (`src/app/[orgId]/search/page.tsx` → SearchContent client component):**

    1. First, list the search directory to find the client component:
       ```bash
       ls src/app/[orgId]/search/
       ```
       The CONTEXT.md states the mount goes into `SearchContent` which is a client component. Verify which file holds that component. Likely candidates: `src/app/[orgId]/search/search-content.tsx`, `src/app/[orgId]/search/components/search-content.tsx`, or similar.

    2. If the found file has `"use client"` at the top, mount the button directly inside it. If the found file is a server component, mount it in the child client component instead.

    3. Add the import in that file:
       ```typescript
       import { ReportIssueButton } from "@/components/issues/report-issue-button";
       ```

    4. Mount in the top-right of the filter bar (or the header row above the results):
       ```tsx
       <ReportIssueButton
         target={{
           type: "search",
           snapshot: {
             query: searchQuery ?? null,
             filters: currentFilters ?? null,
             result_count: results?.length ?? 0,
           },
         }}
       />
       ```
       Match the actual variable names from the file (could be `query`, `searchTerm`, `filters`, `activeFilters`, etc.). Read the file first.

    5. The search page target has no `id` (there's no entity being inspected — just a query). Use `type: "search"` to convey scope.

    6. Keep all diffs additive. Do NOT refactor the filter bar layout. Add the button to the existing action area or append it to the flex row that contains the existing header elements.

    **Do NOT mount the button on:**
    - `src/app/[orgId]/settings/*`
    - `src/app/admin/*` (admin pages have their own flows)
    - `src/app/login`, `src/app/signup`, `/onboarding/*`
    - Any page inside `src/app/[orgId]/team/` or similar

    This is explicitly forbidden per CONTEXT.md Entry point placement LOCKED rules.
  </action>
  <verify>
    <automated>grep -q "ReportIssueButton" src/app/\[orgId\]/personas/page.tsx && grep -q "type: \"persona\"" src/app/\[orgId\]/personas/page.tsx && (grep -rq "ReportIssueButton" src/app/\[orgId\]/search/ && grep -rq "type: \"search\"" src/app/\[orgId\]/search/) && ! grep -rq "ReportIssueButton" src/app/\[orgId\]/settings/ 2>/dev/null && ! grep -rq "ReportIssueButton" src/app/admin/ 2>/dev/null && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-03-t2.log && ! grep -q "src/app/\[orgId\]/personas\|src/app/\[orgId\]/search" /tmp/tsc-33-03-t2.log</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/[orgId]/personas/page.tsx` contains `<ReportIssueButton` with `type: "persona"`
    - Personas snapshot contains `scope: "personas_index"` marker (list-level distinguisher)
    - At least one file inside `src/app/[orgId]/search/` contains `<ReportIssueButton` with `type: "search"`
    - Search snapshot has no `id` field (search reports are query-level, not entity-level)
    - Search mount file has `"use client"` directive OR is wrapped in a client component boundary
    - `src/app/[orgId]/settings/` does NOT contain `ReportIssueButton` (grep must return zero)
    - `src/app/admin/` does NOT contain `ReportIssueButton` (grep must return zero — admin pages are explicitly forbidden mount sites)
    - `npx tsc --noEmit` passes with zero new errors on modified files
  </acceptance_criteria>
  <done>All four tenant pages render the button with correct targets. Forbidden pages (settings, admin, auth) remain untouched.</done>
</task>

</tasks>

<verification>
- Four grep hits for `ReportIssueButton` across the four mount points (prospects/[id], lists/[id], personas, search/*)
- Zero grep hits for `ReportIssueButton` in `src/app/[orgId]/settings/`, `src/app/admin/`, `src/app/login/`, `src/app/signup/`, `/onboarding/`
- `npx tsc --noEmit` is clean
- `npm run lint` is clean
- `npm run build` succeeds (verifies server/client component boundaries are correct)
</verification>

<success_criteria>
1. Tenant on prospect dossier sees "Report an issue" button in header
2. Tenant on list detail page sees the button in the list header
3. Tenant on personas index sees the button in the header
4. Tenant on search results sees the button in the filter/header bar
5. Clicking the button captures a screenshot and opens the dialog with the correct target snapshot
6. The button is absent from tenant settings, admin pages, and auth pages
</success_criteria>

<output>
After completion, create `.planning/phases/33-tenant-issue-reporting-system/33-03-SUMMARY.md` documenting:
- Exact file paths that were modified (confirm the search page's SearchContent client component path)
- The exact variable name used for each snapshot field (since the prospect/list variable names vary)
- Any deviations from the assumed header layouts
</output>
