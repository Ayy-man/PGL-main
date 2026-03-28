---
phase: 25
slug: exa-research-scrapbook
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-29
---

# Phase 25 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or project default) |
| **Quick run command** | `npx next build --no-lint 2>&1 | tail -5` |
| **Full suite command** | `npm run build && npm run lint` |
| **Unit test command** | `npx vitest run tests/research-*.test.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx next build --no-lint 2>&1 | tail -5`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | DB schema | migration | `cat supabase/migrations/*research*` | Plan 01 T1 | pending |
| 25-01-03 | 01 | 1 | Wave 0 tests | unit | `npx vitest run tests/research-*.test.ts` | Plan 01 T3 | pending |
| 25-02-01 | 02 | 1 | API lib functions | build + unit | `npx vitest run tests/research-rate-limit.test.ts tests/research-digest.test.ts` | Plan 01 T3 | pending |
| 25-03-01 | 03 | 2 | API routes | build | `npx next build --no-lint` | N/A | pending |
| 25-04-01 | 04 | 2 | UI components | build | `npx next build --no-lint` | N/A | pending |
| 25-05-01 | 05 | 3 | Integration | manual + build | Browser test + `npx next build --no-lint` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] Install shadcn AI components (message, conversation, prompt-input, etc.) -- Plan 01 Task 1
- [x] Verify components compile with existing Next.js/Tailwind setup -- Plan 01 Task 1
- [x] Database migration file created -- Plan 01 Task 1
- [x] Unit test scaffolds created: research-rate-limit.test.ts, research-digest.test.ts, research-pin.test.ts -- Plan 01 Task 3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming UX phases | Multi-phase stream | Requires browser rendering | Open Research tab, type query, verify reasoning->tool->shimmer->cards->sources sequence |
| Pin to Dossier | Pin flow | Requires UI interaction | Pin a card as signal, switch to Dossier, verify it appears with NEW badge |
| Gold styling | Design system | Visual verification | Screenshot comparison against design spec |
| Rate limiting | 100/day/tenant | Requires sustained load | Send 101 queries, verify friendly notice on 101st |
| Activity log dedup | Tab open logging | Timing-dependent | Open Research tab, verify POST fires; reopen within 1min, verify no duplicate |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (3 test files in Plan 01 Task 3)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (revision iteration 2)
