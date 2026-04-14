---
phase: 39-ux-polish-pass-luxury-consistency-and-keystone-primitives
plan: "02"
subsystem: ux-safety
tags: [ux-polish, destructive-actions, confirmation, dialog, native-confirm-removal]
dependency_graph:
  requires: [PHASE-39-K1, PHASE-39-K2]
  provides: [PHASE-39-T1-DESTRUCTIVE-SWEEP]
  affects:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
    - src/app/[orgId]/personas/components/persona-card.tsx
    - src/components/admin/system-actions.tsx
    - src/components/admin/api-keys/integration-card.tsx
    - src/app/[orgId]/team/team-member-actions.tsx
    - src/app/[orgId]/team/page.tsx
tech_stack:
  added: []
  patterns:
    - Dialog-gated destructive confirmation via <Confirmation isDestructive> + pendingItem state pattern
    - All destructive flows: setPendingItem(item) on click, handleConfirmAction() on Dialog confirm
    - Optimistic rollback preserved in all confirm handlers
decisions:
  - "Dismiss dialog body upgraded to Confirmation isDestructive (was plain DialogHeader/Footer) to match luxury brand"
  - "SystemActions danger variants use Confirmation isDestructive; default variants retain original DialogHeader/Footer"
  - "Mock-mode toggle ON (safe direction) requires no confirmation; toggle OFF (credit burn risk) requires Confirmation"
  - "TeamMemberActions revoke also gated (previously no confirm at all - medium finding from audit 02)"
  - "persona-card.tsx window.confirm removed so grid's Dialog is the single source of confirmation truth"
  - "memberEmail prop added to TeamMemberActions and passed from both page.tsx call sites (desktop + mobile)"
key_files:
  created: []
  modified:
    - src/app/[orgId]/search/components/search-content.tsx
    - src/app/[orgId]/lists/components/list-grid.tsx
    - src/app/[orgId]/lists/components/list-member-table.tsx
    - src/app/[orgId]/personas/components/persona-card-grid.tsx
    - src/app/[orgId]/personas/components/persona-card.tsx
    - src/components/admin/system-actions.tsx
    - src/components/admin/api-keys/integration-card.tsx
    - src/app/[orgId]/team/team-member-actions.tsx
    - src/app/[orgId]/team/page.tsx
metrics:
  duration: "~60 minutes"
  completed: "2026-04-14"
  tasks_completed: 8
  files_modified: 9
---

# Phase 39 Plan 02: Destructive-Action Safety Sweep Summary

Every destructive surface now routes through `<Confirmation isDestructive>` inside a modal `<Dialog>`. All 3 native `confirm()` call-sites removed. 4 previously-unconfirmed destructive actions gained first-time confirmations. 1 inline cramped confirm replaced with modal. 1 additional `window.confirm` found and removed during verification (Rule 1 auto-fix).

## Destructive Surfaces — Before / After

| Surface | File | Before | After |
|---------|------|--------|-------|
| Search prospect dismiss | `search-content.tsx` | `confirm("Dismiss this prospect?")` native dialog | `setPendingDismissIds([id]); setDismissDialogOpen(true)` → existing Dialog upgraded to `<Confirmation isDestructive>` |
| List delete | `list-grid.tsx` | `confirm("Are you sure you want to delete this list?")` native dialog | `handleRequestDelete(list)` → Dialog + `<Confirmation isDestructive>` with list name echo |
| List member remove | `list-member-table.tsx` | `confirm("Remove this prospect from the list?")` native dialog | `handleRequestRemove(memberId, name)` → Dialog + `<Confirmation isDestructive>` with prospect name echo |
| Persona delete | `persona-card-grid.tsx` | No confirmation at all — immediate delete on click | `handleRequestDeletePersona(id)` → Dialog + `<Confirmation isDestructive>` with persona name echo |
| Admin SystemActions (Rotate Keys, Flush Cache) | `system-actions.tsx` | Plain `DialogHeader` + custom button styling, no destructive framing | `<Confirmation isDestructive>` with `ConfirmationIcon variant="destructive"` + success toast on completion |
| Mock-mode toggle OFF | `integration-card.tsx` | Direct PATCH on toggle click, `console.error` on failure | Toggle OFF opens `<Confirmation isDestructive>`; toggle ON proceeds directly; catch fires destructive toast |
| Team member Remove | `team-member-actions.tsx` | Inline cramped `showConfirmRemove` toggle with no user-name echo | Modal Dialog + `<Confirmation isDestructive>` with email echoed in title |
| Team member Revoke invite | `team-member-actions.tsx` | No confirmation (direct `revokeInvite` call) | Modal Dialog + `<Confirmation isDestructive>` with email echoed in title |

## Counts

- **native `confirm()` call-sites removed:** 3 (search dismiss, list delete, list member remove)
- **`window.confirm` call-sites removed:** 1 (persona-card.tsx — see Deviations)
- **Newly-confirmed destructive actions (first-time):** 4 (persona delete, SystemActions danger variants, mock-mode-off, team-revoke)
- **Inline-confirm patterns replaced with modal:** 1 (team-member-actions showConfirmRemove)
- **Files modified:** 9 (7 plan targets + persona-card.tsx auto-fix + team/page.tsx memberEmail prop)

## Commits

| Hash | Task | Description |
|------|------|-------------|
| f48d39e | Task 1 | fix(39-02): search dismiss - remove confirm(), route through Confirmation dialog |
| 92b0b39 | Task 2 | fix(39-02): list delete - remove confirm(), add Dialog + Confirmation |
| 24f0e72 | Task 3 | fix(39-02): list member remove - remove confirm(), add Dialog + Confirmation |
| 3ab7529 | Task 4 | fix(39-02): persona delete - add Dialog + Confirmation (previously no confirm) |
| 0efab6a | Task 5 | fix(39-02): SystemActions - wrap danger variants in Confirmation isDestructive, add toast |
| dfc96aa | Task 6 | fix(39-02): mock-mode toggle OFF - gate with Confirmation, fix catch toast |
| d505a07 | Task 7 | fix(39-02): team member remove/revoke - replace inline confirm with modal Confirmation |
| 9428567 | Rule 1 | fix(39-02): remove window.confirm from persona-card.tsx (Rule 1 - Bug) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] window.confirm in persona-card.tsx blocking grid's Dialog**
- **Found during:** Task 8 verification grep (`grep -rE 'window\.confirm|confirm\(' src/`)
- **Issue:** `persona-card.tsx` `handleDelete()` had its own `window.confirm` guard that fired before calling `onDelete(persona.id)`. This meant the grid's Dialog-gated flow was never reached — the native confirm fired first on every delete click.
- **Fix:** Removed the `window.confirm` from `PersonaCard.handleDelete`. The card now simply calls `onDelete?.(persona.id)` directly. `PersonaCardGrid` owns the confirmation via Dialog state.
- **Files modified:** `src/app/[orgId]/personas/components/persona-card.tsx`
- **Commit:** 9428567

**2. [Rule 2 - Missing functionality] Revoke invite confirmation added**
- **Found during:** Task 7 reading of team-member-actions.tsx
- **Issue:** The Revoke button (pending invite rows) fired `revokeInvite()` directly with no confirmation dialog — medium severity finding from audit 02 (lines 407-410).
- **Fix:** Added `pendingRevoke` state and Dialog + `<Confirmation isDestructive>` for the Revoke flow, mirroring the Remove flow.
- **Files modified:** `src/app/[orgId]/team/team-member-actions.tsx`
- **Commit:** d505a07 (bundled with Task 7)

**3. [Rule 2 - Missing functionality] memberEmail prop plumbed through page.tsx**
- **Found during:** Task 7 implementation
- **Issue:** `team-member-actions.tsx` needed the member's email to echo in confirmation titles, but it wasn't a prop. `page.tsx` already fetches `email` in the users query.
- **Fix:** Added `memberEmail?: string` prop to `TeamMemberActionsProps`; passed `member.email ?? undefined` at both call sites (desktop table + mobile card list) in `page.tsx`.
- **Files modified:** `src/app/[orgId]/team/team-member-actions.tsx`, `src/app/[orgId]/team/page.tsx`
- **Commit:** d505a07 (bundled with Task 7)

## Task 8: Manual Verification Deferred

Task 8 is a `checkpoint:human-verify`. Per the automated checkpoint policy, automated checks ran; browser spot-checks are deferred for the orchestrator to bundle.

### Automated verification results

- `grep -rE 'window\.confirm|^\s*confirm\(' src/app/ src/components/` → **0 matches** (CLEAN)
- `grep -l 'from "@/components/ui/confirmation"' [all 7 target files]` → **all 7 returned**
- `npx tsc --noEmit` → **only pre-existing errors** in `src/lib/search/__tests__/execute-research.test.ts` (same 6 errors as base commit, none from this plan)

### Manual spot-checks to perform in browser

1. **Search dismiss:** `/[orgId]/search` → saved-search mode → click dismiss icon on prospect row → expect themed Dialog with destructive framing (no browser native box).
2. **List delete:** `/[orgId]/lists` → click trash icon on a list card → expect Dialog with list name in title → Cancel no-ops; Confirm deletes.
3. **List member remove:** `/[orgId]/lists/[id]` → click trash on a member row → expect Dialog with prospect name → Cancel no-ops; Confirm removes.
4. **Persona delete:** `/[orgId]/personas` → click Delete on persona card → expect first-time Dialog with persona name → Cancel no-ops; Confirm deletes.
5. **Admin SystemActions Rotate Keys / Flush Cache:** `/admin` → click each → expect `<Confirmation isDestructive>` (red icon, red border) not plain dialog → Confirm fires toast.
6. **Mock-mode flip OFF:** `/admin/api-keys` → flip Apollo mock toggle OFF → expect Confirmation dialog warning about credit burn → Cancel reverts; Confirm sends PATCH.
7. **Team member Remove:** `/[orgId]/team` → click Remove → expect modal with email in title → Cancel dismisses; Confirm removes.
8. **Team member Revoke:** pending invite row → click Revoke → expect modal Dialog → Cancel dismisses; Confirm revokes.

## Known Stubs

None. All confirmation dialogs are wired to the actual server actions (optimistic + rollback preserved). No placeholder data flows to UI.

## Threat Flags

None. All edits are client-side confirmation UI wrapping existing server actions. No new network endpoints, auth paths, or trust boundary changes. Server-side authorization checks are untouched.

## Self-Check: PASSED

Files verified to exist:
- src/app/[orgId]/search/components/search-content.tsx: FOUND (Confirmation import, setDismissDialogOpen)
- src/app/[orgId]/lists/components/list-grid.tsx: FOUND (Confirmation import, isDestructive, pendingDeleteList)
- src/app/[orgId]/lists/components/list-member-table.tsx: FOUND (Confirmation import, isDestructive, pendingRemoveMember)
- src/app/[orgId]/personas/components/persona-card-grid.tsx: FOUND (Confirmation import, isDestructive, pendingDeletePersona)
- src/app/[orgId]/personas/components/persona-card.tsx: FOUND (window.confirm removed)
- src/components/admin/system-actions.tsx: FOUND (Confirmation import, isDestructive, useToast)
- src/components/admin/api-keys/integration-card.tsx: FOUND (Confirmation import, isDestructive, pendingDisableMock)
- src/app/[orgId]/team/team-member-actions.tsx: FOUND (Confirmation import, isDestructive, pendingRemove, pendingRevoke)
- src/app/[orgId]/team/page.tsx: FOUND (memberEmail prop at both call sites)

Commits verified: f48d39e, 92b0b39, 24f0e72, 3ab7529, 0efab6a, dfc96aa, d505a07, 9428567
