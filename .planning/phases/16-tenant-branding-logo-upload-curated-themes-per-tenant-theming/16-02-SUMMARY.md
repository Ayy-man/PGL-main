---
phase: "16"
plan: "02"
subsystem: tenant-branding
tags: [logo-upload, file-upload, supabase-storage, drop-zone, api-route]
dependency_graph:
  requires: [supabase-storage, supabase-admin-client]
  provides: [logo-upload-api, logo-upload-component]
  affects: [onboarding, admin-tenant-drawer, sidebar-logo]
tech_stack:
  added: []
  patterns: [multipart-form-upload, drag-and-drop, supabase-storage-upsert]
key_files:
  created:
    - src/app/api/upload/logo/route.ts
    - src/components/ui/logo-upload.tsx
  modified: []
decisions:
  - "Inline super_admin + tenant_admin auth check in Route Handler (consistent with Phase 04 pattern)"
  - "Client-side file validation mirrors server-side for immediate UX feedback"
  - "URL.createObjectURL for instant local preview before upload completes"
  - "oklch(0.62 0.19 22) for error text color — consistent with Phase 14.1-03 destructive action pattern"
metrics:
  duration: "105s"
  completed: "2026-03-09T01:03:32Z"
  tasks: 2
  files_created: 2
  files_modified: 0
---

# Phase 16 Plan 02: Logo Upload API + LogoUpload Component Summary

POST endpoint for multipart logo upload to Supabase Storage with admin/tenant_admin auth, plus reusable drag-and-drop LogoUpload component with live preview and design system styling.

## Task Completion

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create logo upload API route | 9a87aa9 | src/app/api/upload/logo/route.ts |
| 2 | Create LogoUpload component | bc60b64 | src/components/ui/logo-upload.tsx |

## What Was Built

### Task 1: Logo Upload API Route

Created `POST /api/upload/logo` endpoint that:
- Authenticates user via `createClient` / `getUser()` — requires `super_admin` or `tenant_admin` role
- Extracts `tenantId` and `file` from FormData
- Validates file size (2MB max) and MIME type (PNG, JPG, SVG, WebP)
- Maps MIME type to file extension for storage path
- Uploads to Supabase Storage at `general/tenant-logos/{tenantId}.{ext}` with `upsert: true`
- Gets public URL and updates `tenants.logo_url` via admin client
- Returns `{ url: publicUrl }` on success
- Returns 400 (validation), 401 (unauthenticated), 403 (wrong role), 500 (upload/update failure)

### Task 2: LogoUpload Drop Zone Component

Created `"use client"` component with five visual states:
- **Empty:** Dashed border rounded-[14px] box with Upload icon, "Drop logo or click to browse" text, "PNG, JPG, SVG, WebP - Max 2MB" subtext
- **Drag over:** Gold border (`var(--gold-primary)`) and gold background tint (`var(--gold-bg)`)
- **Preview:** Image displayed at max 120px with object-cover, X button (20x20 circle, absolute top-right) to remove
- **Uploading:** Loader2 spinner overlay centered with semi-transparent background
- **Error:** Red text below drop zone with descriptive error message

Props: `tenantId`, `currentUrl`, `onUploaded(url)`, `onRemoved?()`.

Implementation uses hidden file input, FormData POST to `/api/upload/logo`, `URL.createObjectURL` for instant local preview, and design system CSS variables for all colors.

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Inline auth check pattern** - Used inline `super_admin || tenant_admin` role check in Route Handler (consistent with Phase 04 locked decision — no `requireSuperAdmin` helper in Route Handler context)
2. **Client-side validation mirroring** - Duplicated file size and MIME type validation on client side for immediate UX feedback before network round-trip
3. **Local preview before upload** - Used `URL.createObjectURL` to show image preview immediately; replaced with server URL on success, revoked on failure
4. **Error color** - Used `oklch(0.62 0.19 22)` for error text — consistent with Phase 14.1-03 destructive action color pattern

## Verification

- Build passes clean (`pnpm build` exit 0)
- `/api/upload/logo` route appears in build output
- LogoUpload component bundled as client component
- No TypeScript errors, no ESLint errors

## Self-Check: PASSED

- FOUND: src/app/api/upload/logo/route.ts
- FOUND: src/components/ui/logo-upload.tsx
- FOUND: commit 9a87aa9
- FOUND: commit bc60b64
