---
phase: 26
slug: targeted-multi-source-search-intent-routed-channels-sec-attom-news-proxycurl-faa-crunchbase
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-29
---

# Phase 26 — Validation Strategy

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

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Upstash Redis, opossum circuit breaker, OpenRouter LLM, and SEC EDGAR integration already present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Intent classification accuracy | LLM routing | Non-deterministic | Query "stock sales" → verify SEC fires. Query "property" → verify ATTOM fires. |
| Multi-channel parallel execution | Promise.allSettled | Timing-dependent | Check Tool component shows parallel status per channel |
| Graceful degradation | Missing API keys | Env-dependent | Remove GNEWS key, verify Exa-only results still appear |
| Channel filter chips | UI interaction | Click behavior | Click "SEC" chip → only SEC results shown |
| Cache labels | Visual | Timing | Re-run same query → "Cached" label appears |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
