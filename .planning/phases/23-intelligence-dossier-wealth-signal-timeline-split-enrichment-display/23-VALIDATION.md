---
phase: 23
slug: intelligence-dossier-wealth-signal-timeline-split-enrichment-display
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pnpm build (Next.js compilation) + grep verification |
| **Config file** | next.config.ts |
| **Quick run command** | `pnpm build --no-lint 2>&1 \| tail -5` |
| **Full suite command** | `pnpm build --no-lint` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm build --no-lint 2>&1 | tail -5`
- **After every plan wave:** Run `pnpm build --no-lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 23-01-01 | 01 | 1 | DB migration | grep + build | `grep 'prospect_signals' supabase/migrations/*signal* && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-01-02 | 01 | 1 | Type updates | grep + build | `grep 'IntelligenceDossierData' src/types/database.ts && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-02-01 | 02 | 1 | Dossier generator function | grep + build | `grep 'generateIntelligenceDossier' src/lib/enrichment/claude.ts && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-02-02 | 02 | 1 | Exa event_date fix | grep + build | `grep 'event_date' src/lib/enrichment/exa-digest.ts && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-03-01 | 03 | 2 | Pipeline update | grep + build | `grep 'generate-dossier' src/inngest/functions/enrich-prospect.ts && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-04-01 | 04 | 2 | Dossier component | grep + build | `grep 'IntelligenceDossier' src/components/prospect/intelligence-dossier.tsx && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-04-02 | 04 | 2 | Timeline component | grep + build | `grep 'SignalTimeline' src/components/prospect/signal-timeline.tsx && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-04-03 | 04 | 2 | Signal API routes | grep + build | `grep 'prospect_signals' src/app/api/prospects/*/signals/route.ts && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-05-01 | 05 | 3 | Page signal fetch | grep | `grep 'prospect_signals' src/app/[orgId]/prospects/[prospectId]/page.tsx` | pending |
| 23-05-02 | 05 | 3 | Profile wiring | grep + build | `grep 'IntelligenceDossier' src/components/prospect/profile-view.tsx && pnpm build --no-lint 2>&1 \| tail -5` | pending |
| 23-05-03 | 05 | 3 | Human verify | checkpoint | Visual verification of dossier + timeline rendering | pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dossier prose rendering | Visual layout | Subjective quality | Verify dossier renders as structured prose with section headers |
| Timeline NEW badges | Per-user tracking | Requires auth session | View signals as user A, verify NEW badge clears |
| LLM dossier generation | AI output quality | Non-deterministic | Trigger enrichment, verify dossier JSON structure |
| Signal deduplication | Re-enrichment | Requires re-run | Re-enrich a prospect, verify no duplicate signals |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity (pnpm build in every automated tag)
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
