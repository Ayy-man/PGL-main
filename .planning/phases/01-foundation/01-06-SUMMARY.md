---
phase: 01-foundation
plan: 06
subsystem: ui
tags: [next.js, react, tailwind, dark-theme, sidebar, layout, typography, lucide-react]

# Dependency graph
requires:
  - phase: 01-01
    provides: "OKLCH color system and TypeScript types"
provides:
  - "Dark theme root layout with Inter and Playfair Display fonts"
  - "Tenant-scoped layout with sidebar navigation"
  - "Loading skeleton components for async states"
  - "Error boundaries at global and tenant route levels"
  - "Responsive sidebar navigation with 5 core nav items"
affects: [02-search, 02-lists, 02-personas, 02-activity, 02-analytics, all UI features]

# Tech tracking
tech-stack:
  added: [next/font/google, lucide-react icons]
  patterns:
    - "Dark theme forced via className='dark' on html element (no flash)"
    - "Font variables --font-sans and --font-serif for typography system"
    - "Tenant branding via CSS custom properties injected per-tenant"
    - "Server component layouts with async params (Next.js 15 pattern)"
    - "Client component error boundaries with useEffect logging"
    - "Loading states with skeleton placeholders"

key-files:
  created:
    - src/app/layout.tsx
    - src/app/global-error.tsx
    - src/app/[orgId]/layout.tsx
    - src/app/[orgId]/page.tsx
    - src/app/[orgId]/loading.tsx
    - src/app/[orgId]/error.tsx
    - src/components/ui/skeleton.tsx
    - src/components/layout/sidebar.tsx
    - src/components/layout/nav-items.tsx
    - src/components/layout/tenant-logo.tsx
  modified: []

key-decisions:
  - "Use Next.js 15 async params pattern (params: Promise<{}>)"
  - "Tenant lookup by slug not UUID (URL readability)"
  - "Playfair Display for headings via font-serif class"
  - "Inter for body text via font-sans class"
  - "5 core navigation items: Search, Lists, Personas, Activity, Analytics"
  - "Tenant branding colors injected via CSS custom properties"

patterns-established:
  - "Root layout with dark class and suppressHydrationWarning"
  - "Global error boundary must include html/body tags"
  - "Tenant layout checks auth, fetches tenant, redirects/notFound if invalid"
  - "Loading.tsx provides skeleton UI during async data fetch"
  - "Error.tsx Client Components with reset callback for retry"
  - "Sidebar component receives tenant data as props from layout"
  - "NavItems uses usePathname for active state highlighting"

# Metrics
duration: 7min
completed: 2026-02-07
---

# Phase 01 Plan 06: UI Shell Summary

**Dark theme UI shell with Inter/Playfair Display typography, tenant-scoped sidebar navigation, loading skeletons, and error boundaries**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-07T21:38:17Z
- **Completed:** 2026-02-07T21:45:17Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Root layout applies dark theme immediately with no flash of light theme
- Tenant layout with sidebar navigation (Search, Lists, Personas, Activity, Analytics)
- Typography system: Playfair Display for headings, Inter for body text
- Loading skeleton components for async data fetch states
- Error boundaries at global and tenant route levels with retry functionality

## Task Commits

Each task was committed atomically:

1. **Task 1: Create root layout, global error, and skeleton component** - `b1a03c4` (feat)
2. **Task 2: Create tenant layout with sidebar navigation and error/loading states** - `0c0a540` (feat)

## Files Created/Modified
- `src/app/layout.tsx` - Root layout with dark theme, Inter/Playfair Display fonts, metadata
- `src/app/global-error.tsx` - Root-level error boundary with html/body tags
- `src/components/ui/skeleton.tsx` - Skeleton loading component using cn() utility
- `src/app/[orgId]/layout.tsx` - Tenant layout fetching tenant by slug, sidebar integration
- `src/app/[orgId]/page.tsx` - Placeholder dashboard with stat cards
- `src/app/[orgId]/loading.tsx` - Loading state with skeleton placeholders
- `src/app/[orgId]/error.tsx` - Tenant route error boundary with console logging
- `src/components/layout/sidebar.tsx` - Sidebar with tenant logo, nav items, footer
- `src/components/layout/nav-items.tsx` - Client component navigation with active state
- `src/components/layout/tenant-logo.tsx` - Logo component with fallback to tenant initial

## Decisions Made

**Typography system:**
- Playfair Display loaded via next/font/google for serif headings
- Inter loaded via next/font/google for sans-serif body text
- CSS variables --font-sans and --font-serif for theme integration
- Removed Geist fonts from Next.js default

**Dark theme enforcement:**
- Force dark mode via className="dark" on html element (not media query)
- suppressHydrationWarning prevents React hydration warning from dark class
- OKLCH color system from 01-01 provides perceptually uniform dark palette

**Tenant branding:**
- Tenant colors injected via CSS custom properties (:root variables)
- Tenant logo with fallback to first letter in gold circle
- Sidebar shows tenant name with font-serif

**Navigation architecture:**
- 5 core nav items (Search, Lists, Personas, Activity, Analytics)
- Active state detection via usePathname (client component)
- lucide-react icons for consistent visual language

**Next.js 15 compatibility:**
- params are Promise<{}> in layouts and pages
- Await params before use: `const { orgId } = await params;`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues. TypeScript compilation passed on all files.

## User Setup Required

None - no external service configuration required. UI shell uses existing Supabase client from 01-02 and OKLCH theme from 01-01.

## Next Phase Readiness

**Ready for feature development:**
- UI shell provides consistent layout for all tenant-scoped pages
- Dark theme with luxury aesthetic (gold accents visible on primary buttons)
- Typography system established (Playfair Display + Inter)
- Loading states and error boundaries handle async/error cases
- Sidebar navigation provides access to 5 core features

**Next phase can:**
- Build Search page under `src/app/[orgId]/search/page.tsx`
- Build Lists page under `src/app/[orgId]/lists/page.tsx`
- Build Personas page under `src/app/[orgId]/personas/page.tsx`
- Build Activity page under `src/app/[orgId]/activity/page.tsx`
- Build Analytics page under `src/app/[orgId]/analytics/page.tsx`
- All pages will render inside this UI shell with sidebar navigation

**Blockers/concerns:**
- None - UI shell is complete and ready for feature pages

---
*Phase: 01-foundation*
*Completed: 2026-02-07*
