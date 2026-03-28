---
phase: 25
slug: exa-research-scrapbook
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if installed) or manual verification |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx next build --no-lint 2>&1 | tail -5` |
| **Full suite command** | `npm run build && npm run lint` |
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
| 25-01-01 | 01 | 1 | DB schema | migration | `cat supabase/migrations/*research*` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 1 | API routes | build | `npx next build --no-lint` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 2 | UI components | build | `npx next build --no-lint` | ❌ W0 | ⬜ pending |
| 25-04-01 | 04 | 3 | Streaming | manual | Browser test | N/A | ⬜ pending |
| 25-05-01 | 05 | 3 | Pin flow | manual | Browser test + DB check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install shadcn AI components (message, conversation, prompt-input, etc.)
- [ ] Verify components compile with existing Next.js/Tailwind setup
- [ ] Database migration file created

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming UX phases | Multi-phase stream | Requires browser rendering | Open Research tab, type query, verify reasoning→tool→shimmer→cards→sources sequence |
| Pin to Dossier | Pin flow | Requires UI interaction | Pin a card as signal, switch to Dossier, verify it appears with NEW badge |
| Gold styling | Design system | Visual verification | Screenshot comparison against design spec |
| Rate limiting | 100/day/tenant | Requires sustained load | Send 101 queries, verify friendly notice on 101st |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
