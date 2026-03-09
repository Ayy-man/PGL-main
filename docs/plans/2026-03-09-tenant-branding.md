# Tenant Branding — Logo Upload, Curated Themes, Per-Tenant Theming — COMPLETE

**Status:** Implemented and deployed (Phase 16, 8 plans)
**Date:** 2026-03-09

## Overview

Replaced free-form hex color inputs with 8 curated pre-paired color themes that override CSS variables at the layout level. Added logo upload to Supabase Storage. Logos display in sidebar, login page, and drawer. Admin pages always use Gold theme.

## Theme System

### 8 Curated Themes

| Theme | Main Color | Accent Color |
|-------|-----------|-------------|
| Gold | #d4af37 | #f0d060 |
| Sapphire | #4A7BF7 | #7BA3FF |
| Emerald | #34D399 | #6EE7B7 |
| Rose | #F472B6 | #FBCFE8 |
| Amber | #F59E0B | #FCD34D |
| Slate | #94A3B8 | #CBD5E1 |
| Violet | #8B5CF6 | #C4B5FD |
| Coral | #FB7185 | #FDA4AF |

### CSS Variable Override

Per-tenant theming works by injecting a `<style>` tag in `src/app/[orgId]/layout.tsx` that overrides 6 CSS variables:

| Variable | Source |
|----------|--------|
| `--gold-primary` | theme.main |
| `--gold-bright` | theme.accent |
| `--gold-text` | main @ 70% opacity |
| `--gold-bg` | main @ 8% opacity |
| `--gold-bg-strong` | main @ 15% opacity |
| `--border-gold` | main @ 25% opacity |

Admin pages (`/admin/*`) are unaffected — always use the default Gold theme.

### Theme Config

`src/lib/tenant-theme.ts` exports:
- `TENANT_THEMES` — map of all 8 themes with label, main, accent
- `TenantTheme` — union type
- `getThemeCSSVariables(theme)` — returns CSS variable overrides
- `isValidTheme(value)` — type guard
- `hexToRgba(hex, alpha)` — helper for opacity calculations

## Logo Upload

### Upload Flow
1. User drops/selects image in `LogoUpload` component
2. Client validates: 2MB max, PNG/JPG/SVG/WebP only
3. POST to `/api/upload/logo` with FormData (tenantId + file)
4. Server validates auth (super_admin or tenant_admin), size, MIME type
5. Uploads to Supabase Storage: `general/tenant-logos/{tenantId}.{ext}` (upsert)
6. Updates `tenants.logo_url` with public URL
7. Returns URL for immediate display

### Logo Display
- **Sidebar:** 36x36 rounded square, fallback to initial circle tinted with tenant theme
- **Login page:** Tenant logo shown when arriving from tenant context
- **Drawer header:** Shows logo or gold initial circle

## Database Changes

| Change | Details |
|--------|---------|
| Added `theme` column | `text`, default `'gold'`, on `tenants` table |
| Dropped `primary_color` | Replaced by curated theme system |
| Dropped `secondary_color` | Replaced by curated theme system |

Migration: `supabase/migrations/20260309_tenant_theme.sql`

## Components Created

| Component | Purpose |
|-----------|---------|
| `src/lib/tenant-theme.ts` | Theme map, CSS variable generator, type guard |
| `src/components/ui/theme-picker.tsx` | 8 gradient swatches with glow selection, keyboard accessible |
| `src/components/ui/logo-upload.tsx` | Drag-and-drop upload with preview, 5 visual states |
| `src/app/api/upload/logo/route.ts` | POST endpoint for Supabase Storage upload |

## Pages Updated

| Page | Change |
|------|--------|
| `src/app/[orgId]/layout.tsx` | `<style>` tag injection with tenant theme CSS variables |
| `src/app/admin/tenants/new/page.tsx` | ThemePicker replaces hex color inputs |
| `src/app/onboarding/confirm-tenant/page.tsx` | ThemePicker + LogoUpload replace hex/URL inputs |
| `src/components/admin/tenant-detail-drawer.tsx` | ThemePicker + LogoUpload in drawer header |
| `src/app/(auth)/login/page.tsx` | Tenant-aware login with logo + themed button |
| `src/middleware.ts` | Passes tenant slug to login via `x-tenant-slug` header |
| `src/app/actions/admin.ts` | `createTenant` uses `theme` field instead of color fields |
| `src/app/actions/onboarding.ts` | `confirmTenantOnboarding` uses `theme` field |
| `src/app/api/onboarding/tenant/route.ts` | Returns `theme` instead of color fields |
| `src/app/api/admin/tenants/[id]/route.ts` | PATCH supports `theme` and `logo_url` fields |
