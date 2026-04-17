---
phase: 44
slug: list-search-visibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (ESM-native, already configured — see `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run && pnpm tsc --noEmit && pnpm build` |
| **Estimated runtime** | ~45s (unit tests) + ~40s (tsc) + ~90s (build) |

**Manual QA:** Two-agent + one-admin matrix on a staging tenant per D-03. RLS automation harness is optional per research finding 5 — manual QA is the practical fallback if `set_config('request.jwt.claims')` harness is deferred.

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run <focused test file>` for the file touched in that task
- **After every plan wave:** Run `pnpm vitest run` + `pnpm tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite green + manual QA matrix signed off
- **Max feedback latency:** 45s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 44-01-* | 01 | 1 | VIS-MIGRATION | T-44-01 | Migration idempotent (2x run = no-op); existing dashboard policies dropped before recreate | migration-dryrun + pg_policies assertion | `supabase db reset --local && supabase db push` + `psql -c "\dp lists"` | ❌ W0 | ⬜ pending |
| 44-02-* | 02 | 2 | VIS-TYPES | — | TypeScript compile passes with new `Visibility` type threaded through List + Persona | tsc | `pnpm tsc --noEmit` | ✅ existing | ⬜ pending |
| 44-03-* | 03 | 2 | VIS-ACTIONS | T-44-02 | Server actions reject updates from non-creator non-admin (RLS blocks) | vitest (mock Supabase client) | `pnpm vitest run src/app/[orgId]/lists/__tests__/actions.test.ts src/app/[orgId]/personas/__tests__/actions.test.ts` | ❌ W0 | ⬜ pending |
| 44-04-* | 04 | 3 | VIS-UI-CREATE | — | Creation dialog visibility toggle persists selection into optimistic payload + server insert | vitest (React Testing Library) | `pnpm vitest run src/app/[orgId]/lists/__tests__/create-list-dialog.test.tsx` | ❌ W0 | ⬜ pending |
| 44-05-* | 05 | 3 | VIS-UI-BADGE | — | Badge renders correct icon + tooltip for each visibility state; toggle dropdown gated by creator/admin role | vitest + manual browser spot-check | `pnpm vitest run src/app/[orgId]/lists/__tests__/list-grid.test.tsx` | ❌ W0 | ⬜ pending |
| 44-06-* | 06 | 4 | VIS-ADMIN-WORKSPACE + VIS-USER-REMOVAL | T-44-03 | Admin workspace lists all tenant rows regardless of visibility; `removeTeamMember` reassigns orphaned rows | vitest (mock admin client) + manual QA | `pnpm vitest run src/app/actions/__tests__/team.test.ts` + manual checklist | ❌ W0 | ⬜ pending |

**Legend — threat refs:**
- T-44-01 — broken access control via policy conflict (OWASP A01) — migration must explicitly drop existing policies
- T-44-02 — privilege escalation via client-side-only visibility gate — all authorization via RLS; no parallel client check
- T-44-03 — data orphaning on user removal — reassign hook prevents invisible rows

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/[orgId]/lists/__tests__/actions.test.ts` — stubs for VIS-ACTIONS (createListAction, updateListVisibilityAction)
- [ ] `src/app/[orgId]/personas/__tests__/actions.test.ts` — stubs for VIS-ACTIONS (persona actions mirror)
- [ ] `src/app/[orgId]/lists/__tests__/create-list-dialog.test.tsx` — stubs for VIS-UI-CREATE
- [ ] `src/app/[orgId]/lists/__tests__/list-grid.test.tsx` — stubs for VIS-UI-BADGE (listsOptimisticReducer + badge render)
- [ ] `src/app/[orgId]/personas/__tests__/persona-card.test.tsx` — stubs for VIS-UI-BADGE (persona mirror)
- [ ] `src/app/actions/__tests__/team.test.ts` — stubs for VIS-USER-REMOVAL reassign hook
- [ ] `scripts/rls-smoke-test.sql` (OPTIONAL) — `set_config('request.jwt.claims', ...)` harness for two-agent + admin matrix. If deferred, Manual-Only Verifications table covers this.
- [ ] vitest + React Testing Library — already installed (per `package.json`), no new infrastructure needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent A creates personal list → Agent B can't see it; Agent A toggles to shared → Agent B now sees it | VIS-MIGRATION + VIS-UI-BADGE | Full RLS smoke test requires real Supabase auth sessions; automation would need `set_config('request.jwt.claims')` harness not yet in repo | Log in as two agents in separate browsers on staging tenant; verify visibility across create/toggle/refresh cycles |
| Admin sees all lists + personas across tenant including personal ones | VIS-ADMIN-WORKSPACE | Same — real JWT needed for admin bypass | Log in as `tenant_admin`; navigate to `/team/workspace`; confirm all rows visible regardless of visibility + creator attribution rendered |
| `removeTeamMember` reassigns orphaned lists + personas to acting admin as team_shared | VIS-USER-REMOVAL | Requires tenant with multiple users; Supabase admin client side-effects | Create agent A, agent A creates personal list + personal persona, admin removes agent A, verify rows now have admin as `created_by` and `visibility = 'team_shared'` |
| Sidebar count badges filter correctly per user | VIS-UI-BADGE | RLS on count queries — easiest verified visually | Log in as agent B while agent A has a personal list; confirm sidebar list count does NOT include agent A's personal list |
| Migration idempotency (second run is no-op) | VIS-MIGRATION | Migration replay against same DB | `supabase db reset --local && supabase db push` (expect success); re-run `supabase db push` (expect no-op, no errors) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
