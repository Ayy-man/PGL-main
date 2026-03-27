---
phase: 22
slug: lead-profile-editing-inline-edit-tags-photo-upload-lead-owner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 22 — Validation Strategy

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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | DB migration | grep | `grep 'manual_display_name' src/types/database.ts` | N/A | pending |
| 22-01-02 | 01 | 1 | Type updates | grep | `grep 'manual_title' src/lib/prospects/types.ts` | N/A | pending |
| 22-02-01 | 02 | 1 | InlineEditField | grep | `grep 'InlineEditField' src/components/prospect/inline-edit-field.tsx` | N/A | pending |
| 22-03-01 | 03 | 2 | PATCH API | grep | `grep 'manual_' src/app/api/prospects/\\[prospectId\\]/profile/route.ts` | N/A | pending |
| 22-04-01 | 04 | 3 | Profile wiring | grep | `grep 'InlineEditField' src/components/prospect/profile-header.tsx` | N/A | pending |
| 22-05-01 | 05 | 4 | Build passes | build | `pnpm build --no-lint` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Supabase Storage bucket exists, TagInput exists, activity logger exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline edit UX | Pencil → input → save flow | Interactive UI behavior | Click pencil on name field, edit, press Enter, verify gold flash + value persists on refresh |
| Avatar upload | Photo upload/URL paste | File upload interaction | Click avatar, upload image, verify preview + storage |
| Tag autocomplete | Type → suggestions | Interactive dropdown | Add tag, verify autocomplete shows existing tags |
| RLS isolation | Tenant A edits invisible to B | Multi-tenant security | Edit field as Tenant A, check Tenant B cannot see change |
| Optimistic UI | Save feedback | Timing-dependent | Edit field, verify immediate UI update before server response |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
