---
phase: 21
slug: depth-polish-visual-refinement-pass
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pnpm build (Next.js compilation) + grep verification |
| **Config file** | next.config.ts |
| **Quick run command** | `pnpm build --no-lint 2>&1 | tail -5` |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | CSS wiring | grep | `grep -c 'surface-card-featured\|row-enter\|card-glow\|press-effect' src/components/**/*.tsx` | N/A | pending |
| 21-01-02 | 01 | 1 | Backdrop blur | grep | `grep -c 'backdrop-blur\|backdrop-filter' src/components/ui/sheet.tsx` | N/A | pending |
| 21-02-01 | 02 | 2 | Build passes | build | `pnpm build --no-lint` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. This is a CSS-wiring phase — no new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual depth perception | Surface depth | Subjective visual quality | Check cards at /dashboard — should feel "lifted" with visible shadow |
| Hover interactions | Interaction feedback | Requires pointer device | Hover over prospect rows, clickable cards — verify lift + glow |
| Staggered entrance | Motion | Timing-dependent | Load prospect list — rows should cascade in over ~300ms |
| Noise overlay | Texture | Barely perceptible | Compare with/without — page should feel "warmer" with overlay |
| Responsive | Layout | Multi-breakpoint | Test at 375px, 768px, 1024px, 1440px — no overflow |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
