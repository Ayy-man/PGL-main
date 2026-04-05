---
phase: 28
slug: saved-search-incremental-refresh-dismiss-and-delete
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test runner configured in project |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` (type-check only) |
| **Full suite command** | `npx tsc --noEmit && npx next build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npx next build`
- **Before `/gsd-verify-work`:** Full build must pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | DB schema | T-28-01 | RLS tenant scoping on saved_search_prospects | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | DB schema | — | personas table columns added | manual | verify via Supabase dashboard | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | Refresh diff | — | new person gets is_new=true | manual | n/a (no unit test infra) | ❌ W0 | ⬜ pending |
| 28-02-02 | 02 | 2 | Refresh diff | — | dismissed person stays dismissed | manual | n/a | — | ⬜ pending |
| 28-02-03 | 02 | 2 | Refresh diff | — | dismissed person resurfaces on job change | manual | n/a | — | ⬜ pending |
| 28-03-01 | 03 | 3 | Dismiss actions | T-28-02 | bulk dismiss validates saved_search_id ownership | type-check | `npx tsc --noEmit` | — | ⬜ pending |
| 28-04-01 | 04 | 3 | UI badges | — | NEW badge renders for is_new=true rows | manual | visual inspection | — | ⬜ pending |
| 28-04-02 | 04 | 3 | UI show dismissed | — | toggle shows/hides dismissed rows | manual | visual inspection | — | ⬜ pending |
| 28-05-01 | 05 | 4 | Enrichment sync | T-28-01 | cross-search update scoped to org/tenant | type-check | `npx tsc --noEmit` | — | ⬜ pending |
| 28-06-01 | 06 | 4 | Dup guard | — | skip enrichment if prospect_id already exists | manual | verify via enrichment flow | — | ⬜ pending |
| 28-07-01 | 07 | 5 | UI rename | — | no "Persona" visible in UI strings | manual | grep UI strings | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test framework exists in the project. Per researcher findings, spec deferred TESTING.md approach. No Wave 0 test stubs needed — validation is TypeScript type-checking + manual verification.

*Existing build infrastructure (tsc + next build) covers all automated verification for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Refresh diff algorithm correctness | DB + refresh logic | No test runner | Create a saved search, run refresh, verify NEW badges appear for new people and dismissed stay suppressed |
| Dismissed person resurfaces on job change | Refresh logic | No test runner | Manually change `apollo_data.title` in DB and re-run refresh, verify it resurfaces |
| Enrichment sync across searches | Inngest hook | No test runner | Enrich from one search, verify second search shows status=enriched |
| Duplicate enrichment guard | Enrichment route | No test runner | Attempt to enrich already-enriched person, verify pipeline skips |
| Show dismissed toggle | UI | Visual | Enable toggle, verify dismissed rows appear dimmed with Undo button |
| Last refreshed timestamp | UI | Visual | Run refresh, verify timestamp updates to "just now" |
| Bulk dismiss confirmation | UI | Visual | Select multiple rows, click Dismiss Selected, verify confirmation dialog shows count |
| UI rename complete | Strings | grep | `grep -r "Persona\b" src/ --include="*.tsx" --include="*.ts"` — only code-level names should remain |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (tsc) or manual verification steps
- [ ] Sampling continuity: tsc runs after every wave
- [ ] Wave 0: N/A (no test infra)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (tsc)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
