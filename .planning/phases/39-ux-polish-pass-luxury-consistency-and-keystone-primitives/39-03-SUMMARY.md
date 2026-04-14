---
phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives
plan: "03"
subsystem: role-gating
tags: [ux-polish, rbac, assistant-role, canEdit, tooltip, read-only]
dependency_graph:
  requires: [PHASE-39-K3]
  provides: [PHASE-39-T2-ROLE-GATING]
  affects:
    - src/app/[orgId]/search/page.tsx
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/search/components/bulk-actions-bar.tsx
    - src/app/[orgId]/lists/page.tsx
    - src/app/[orgId]/lists/components/lists-page-client.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/app/[orgId]/personas/page.tsx
    - src/app/[orgId]/personas/components/personas-layout.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
    - src/app/[orgId]/personas/components/persona-card.tsx
    - src/components/prospect/prospect-slide-over.tsx
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/notes-tab.tsx
tech_stack:
  added: []
  patterns:
    - canEdit = ROLE_PERMISSIONS[role].canEdit derived in server components via app_metadata.role
    - Conditional Tooltip wrapping disabled buttons: {canEdit ? <Button> : <Tooltip><TooltipTrigger><span tabIndex={0}><Button disabled></span></TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>}
    - readOnly={!canEdit} on textareas; helper text "Notes are read-only for your role." rendered when !canEdit
    - Default canEdit=true on all client components for backward compatibility
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/page.tsx
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/search/components/bulk-actions-bar.tsx
    - src/app/[orgId]/lists/page.tsx
    - src/app/[orgId]/lists/components/lists-page-client.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/app/[orgId]/personas/page.tsx
    - src/app/[orgId]/personas/components/personas-layout.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
    - src/app/[orgId]/personas/components/persona-card.tsx
    - src/components/prospect/prospect-slide-over.tsx
    - src/components/prospect/profile-view.tsx
    - src/components/prospect/notes-tab.tsx
decisions:
  - "canEdit derived via ROLE_PERMISSIONS[role].canEdit (existing type in src/types/auth.ts) — consistent with prospect profile page pattern already in use"
  - "Task 6 Step 0: canEdit already plumbed into profile-view.tsx from prospects/[prospectId]/page.tsx — existing correct implementation confirmed, no upstream fix needed"
  - "notes-tab.tsx updated even though it is currently a stub (not imported by profile-view) — the plan requires readOnly per the spec, and the file will be wired in a future plan"
  - "PersonasLayout added as intermediate thread in the chain (page -> layout -> grid) — plan omitted this level but it was required to compile"
  - "Server-side authz gap flagged in Threat Flags section — client gate is UX, server side missing role checks in actions.ts/route.ts is pre-existing, not introduced by this plan"
metrics:
  duration: "~6 minutes"
  completed: "2026-04-15"
  tasks_completed: 7
  files_modified: 13
---

# Phase 39 Plan 03: Assistant Read-Only Role Gating Summary

`canEdit` prop threaded through all 5 write-action surfaces (BulkActionsBar, ProspectSlideOver, ListGrid, PersonaCardGrid, Notes). Assistants now see disabled write buttons with explanatory tooltips instead of hitting 403 errors on click.

## Gated Surfaces — Before / After

| Surface | File | Before | After |
|---------|------|--------|-------|
| BulkActionsBar | `search/components/bulk-actions-bar.tsx` | All write buttons always enabled; assistant clicks → 403 | Add to List, Enrich, Dismiss disabled + per-action tooltips when `!canEdit`; Export CSV always enabled |
| ProspectSlideOver | `components/prospect/prospect-slide-over.tsx` | Enrich, Add to List, Re-enrich always enabled | All 3 write CTAs disabled + tooltips (enriched state: Add to List + Re-enrich; preview state: Enrich This Prospect) |
| ListGrid | `lists/components/list-grid.tsx` | Delete button always enabled | Delete disabled + tooltip when `!canEdit`; Export always enabled |
| ListsPageClient | `lists/components/lists-page-client.tsx` | Create List dialog always accessible (header + empty state) | Both Create List triggers replaced with disabled Button + tooltip when `!canEdit` |
| PersonaCard | `personas/components/persona-card.tsx` | Edit + Delete buttons always enabled | Edit and Delete both disabled + tooltips when `!canEdit` |
| Profile Notes | `components/prospect/profile-view.tsx` | Notes textarea always editable; Save always clickable | `readOnly={!canEdit}` on textarea; Save Note disabled + tooltip; helper text shown |

## Commit Log

| Hash | Task | Description |
|------|------|-------------|
| ae152ee | Task 1 | feat(39-03): thread canEdit from search page.tsx into SearchContent + BulkActionsBar + SlideOver props |
| 939a916 | Task 2 | feat(39-03): BulkActionsBar - disable Add to List/Enrich/Dismiss + tooltip for assistant role |
| ee99158 | Task 3 | feat(39-03): ProspectSlideOver - canEdit prop gates Enrich/Add-to-List/Re-enrich CTAs |
| eddef44 | Task 4 | feat(39-03): Lists page - thread canEdit through page.tsx -> ListsPageClient -> ListGrid |
| 321d263 | Task 5 | feat(39-03): Personas page - thread canEdit through page.tsx -> Layout -> CardGrid -> PersonaCard |
| b385f4e | Task 6 | feat(39-03): profile-view + notes-tab - gate textarea readOnly and Save button for assistant role |

## Task 6 Step 0 Pre-Check Result

Branch taken: **existing plumbing confirmed — proceeded directly to Steps A/B.**

`canEdit` was already present in `profile-view.tsx` (line 138 as `canEdit?: boolean` prop) and correctly sourced from `src/app/[orgId]/prospects/[prospectId]/page.tsx` (line 58: `const canEdit = ROLE_PERMISSIONS[role]?.canEdit ?? false;` passed at line 359). Audit finding line 330 was correct about the prop existing in `ProfileHeader` but the notes textarea itself had no gating — that was the actual gap closed by Task 6.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] PersonasLayout intermediate layer added**
- **Found during:** Task 5 implementation
- **Issue:** The plan specified `page.tsx -> PersonaCardGrid` but the actual component hierarchy is `page.tsx -> PersonasLayout -> PersonaCardGrid`. PersonasLayout had no `canEdit` prop so the value was silently lost.
- **Fix:** Added `canEdit?: boolean` to `PersonasLayoutProps` and forwarded to `PersonaCardGrid`.
- **Files modified:** `src/app/[orgId]/personas/components/personas-layout.tsx`
- **Commit:** 321d263

## Task 7: Manual Verification Deferred

Task 7 is a `checkpoint:human-verify`. Per the automated checkpoint policy, automated checks ran; browser spot-checks are deferred.

### Automated verification results

- `canEdit` grep audit across all 11 plan-required files → **all 11 FOUND** (no MISSING lines)
- `npx tsc --noEmit` → **only pre-existing 6 errors** in `src/lib/search/__tests__/execute-research.test.ts` (same errors as base commit c2dc841, none from this plan)

### Manual spot-checks to perform in browser

1. **Search / BulkActionsBar (`/[orgId]/search`):** Log in as assistant. Select prospects. Add to List, Enrich Selection, Dismiss Selected should be greyed/disabled with tooltips. Export CSV should still work.
2. **ProspectSlideOver (`/[orgId]/search`, click a prospect row):** Enrich, Add to List, Re-enrich buttons should all be disabled with tooltips.
3. **Lists (`/[orgId]/lists`):** Create List trigger (header + empty state) should be a disabled button with tooltip. Each list card Delete should be disabled with tooltip.
4. **Personas (`/[orgId]/personas`):** Each persona card's Edit and Delete buttons should be disabled with tooltips.
5. **Prospect Profile (`/[orgId]/prospects/[id]`):** Notes textarea should be read-only (typing does nothing). Save Note button should be disabled with tooltip. Helper text "Notes are read-only for your role." should appear.
6. **Server-side sanity check (CRITICAL):** Open devtools Network tab while logged in as assistant. Directly call a write endpoint (e.g. `POST /api/prospects/upsert` or POST to a Server Action for list delete). **Expected: 403 Forbidden. Actual: see Threat Flags — server-side role checks are NOT implemented in these routes.**
7. **Non-regression:** Log in as agent or tenant_admin — all previously-disabled buttons should be enabled. No tooltips from this plan should appear.

## Known Stubs

None. All `canEdit` gating is wired to real ROLE_PERMISSIONS from `src/types/auth.ts`. No placeholder data flows to UI.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: missing-server-authz | `src/app/[orgId]/lists/actions.ts` | `createListAction`, `deleteListAction`, `removeFromListAction` do not check user role — rely only on tenant_id match + Supabase RLS. An assistant with a valid session can call these and succeed if RLS does not block by role. Pre-existing gap, NOT introduced by this plan. |
| threat_flag: missing-server-authz | `src/app/[orgId]/personas/actions.ts` | `createPersonaAction`, `updatePersonaAction`, `deletePersonaAction` check auth + tenant but not role. Same pre-existing gap. |
| threat_flag: missing-server-authz | `src/app/api/apollo/bulk-enrich/route.ts` | No role check found. An assistant could trigger bulk enrichment (credit burn) by calling this endpoint directly. Pre-existing gap. |
| threat_flag: missing-server-authz | `src/app/api/prospects/[prospectId]/notes/route.ts` | No role check found. An assistant could PATCH notes directly bypassing the disabled UI. Pre-existing gap. |

**Recommended follow-up:** Add `requireRole('agent')` (or equivalent `canEdit` check via `checkPermission`) to all write Server Actions and API route handlers before treating the client-side gate as the sole UX enhancement. A standalone security hardening plan should cover these 4+ endpoints.

## Self-Check: PASSED

Files verified to contain `canEdit`:
- src/app/[orgId]/search/page.tsx: FOUND
- src/app/[orgId]/search/components/search-content.tsx: FOUND
- src/app/[orgId]/search/components/bulk-actions-bar.tsx: FOUND
- src/app/[orgId]/lists/page.tsx: FOUND
- src/app/[orgId]/lists/components/lists-page-client.tsx: FOUND
- src/app/[orgId]/lists/components/list-grid.tsx: FOUND
- src/app/[orgId]/personas/page.tsx: FOUND
- src/app/[orgId]/personas/components/persona-card-grid.tsx: FOUND
- src/app/[orgId]/personas/components/persona-card.tsx: FOUND
- src/components/prospect/prospect-slide-over.tsx: FOUND
- src/components/prospect/profile-view.tsx: FOUND

Notes-tab (bonus): FOUND (readOnly in notes-tab.tsx)

Commits verified in git log: ae152ee, 939a916, ee99158, eddef44, 321d263, b385f4e
