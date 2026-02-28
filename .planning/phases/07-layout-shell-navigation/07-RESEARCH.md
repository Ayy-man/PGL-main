# Phase 7: Layout Shell + Navigation — Research

**Researched:** 2026-03-01
**Domain:** Next.js App Router layout composition, client/server component boundaries, responsive sidebar navigation
**Confidence:** HIGH

---

## Summary

Phase 7 implements the persistent app shell that wraps every authenticated page: a 220px sidebar, a 56px sticky TopBar, and a scrollable main content area. This shell exists in two variants — one for tenant users (`/[orgId]/...`) and one for the PGL super admin (`/admin/...`). Both layouts are already structurally present in the codebase from Phases 1–5 and the v2.0 Phase 0 (Phase 6) foundation work. The task is not to build from scratch but to refactor and complete what exists: integrate the Phase 6 `TopBar` component into both layouts, update the tenant nav items to match the redesign's route structure, add a "Dashboard" home route, wire in user data (name/initials/avatar) from the Supabase session, and polish the admin sidebar to match mockup specs.

The stitch mockups use two very different layout patterns: tenant screens (`crm_sync_team_export_log`, `outreach_campaign_orchestrator`) use a sidebar-with-top-bar pattern that closely matches what is already built. The admin screen (`executive_strategy_dashboard_2`) uses a 256px fixed sidebar with a distinct admin header — the real app uses 220px and the existing admin layout already matches this. The most meaningful design delta between stitch mockups and the current codebase is: (1) the nav items need a "Dashboard" entry at the top, and the label "Lead Discovery" is used in stitch vs. "Search" currently; (2) the TopBar component built in Phase 6 is not yet wired into either layout (the tenant layout still uses inline header markup; the admin layout has only a plain text label); (3) the admin sidebar currently has only 3 items (Dashboard, Tenants, Users) but Phase 13 will need more — for Phase 7, we match what routes already exist.

**Primary recommendation:** Replace the inline header markup in both layouts with the Phase 6 `TopBar` component, update `NavItems` to match the redesign label set, create a `/[orgId]/` home page as "Dashboard", and add a hamburger toggle to the admin sidebar for mobile parity. No new dependencies needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 App Router | 15.x | Layout composition, nested layouts, route groups | Project standard — already in use |
| React | 18.x | Server + Client components | Project standard |
| Tailwind CSS | 3.x | Utility styling via CSS variables | Project standard |
| Lucide React | Latest | Nav icons (Lucide is the only icon source per MASTER.md) | MASTER.md mandates Lucide; no alternatives |
| shadcn Sheet | Already installed | Mobile sidebar slide-over (already in MobileSidebar) | Already used; no new install needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/navigation` `usePathname` | Built-in | Active nav state detection in Client Components | Required for all nav link active states |
| `next/link` | Built-in | Client-side navigation | All nav links |
| `@/lib/supabase/server` | Project lib | Session read in Server Components | Getting user name/initials for TopBar in layout |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS variable inline styles for hover | Tailwind hover classes | Tailwind cannot reference CSS custom property values at runtime; onMouseEnter/Leave is the established project pattern (STATE.md decision from Phase 05-03) |
| Custom mobile drawer | shadcn Sheet | Sheet already used in MobileSidebar; consistent with project decision SA-06 "shadcn Sheet used for slide-over panel" |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── [orgId]/
│   │   ├── layout.tsx            ← EDIT: wire TopBar, pass user data
│   │   └── page.tsx              ← EDIT or CREATE: Dashboard home page
│   └── admin/
│       ├── layout.tsx            ← EDIT: wire TopBar, add mobile sidebar
│       └── admin-nav-links.tsx   ← EDIT: expand nav items if needed
├── components/
│   └── layout/
│       ├── top-bar.tsx           ← EXISTS (Phase 6): wire in, may need user prop
│       ├── sidebar.tsx           ← EXISTS: update SidebarContent if needed
│       ├── nav-items.tsx         ← EDIT: update labels + add Dashboard
│       └── mobile-sidebar.tsx    ← EXISTS: already complete
```

### Pattern 1: Server Layout Passes User to Client TopBar

The tenant and admin layouts are Server Components that fetch user data from Supabase. The `TopBar` is a Client Component (needs `useState`). Pass user data as props from layout to TopBar.

**What:** Server Component layout fetches user session, extracts name/initials/role, passes to `<TopBar>` as props.
**When to use:** Any time a client component at the shell level needs auth data.

```typescript
// src/app/[orgId]/layout.tsx (Server Component)
const { data: { user } } = await supabase.auth.getUser();
const userName = user?.user_metadata?.full_name ?? user?.email ?? "User";
const userInitials = userName.charAt(0).toUpperCase();

return (
  // ...
  <TopBar
    userName={userName}
    userInitials={userInitials}
  />
);
```

TopBar is already typed to accept `userName`, `userInitials`, `avatarUrl` — no interface change needed.

### Pattern 2: NavItems Active State via usePathname

NavItems is already a Client Component using `usePathname`. The active state pattern uses `onMouseEnter`/`onMouseLeave` for CSS variable hover (established project pattern — cannot use Tailwind hover: for CSS custom properties).

```typescript
// src/components/layout/nav-items.tsx
"use client";
import { usePathname } from "next/navigation";

const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

// Active: gold-bg background, gold-primary color, gold left border
// Inactive: text-secondary-ds color, transparent left border
// Hover: rgba(255,255,255,0.02) bg, text-primary-ds color (via onMouseEnter/Leave)
```

### Pattern 3: Mobile Admin Sidebar

The tenant layout already has `MobileSidebar` (using Sheet). The admin layout currently has NO mobile support — it relies on `hidden lg:flex` which means admin is unusable on mobile. Phase 7 should add mobile handling to the admin layout.

The admin sidebar is structurally simpler (no tenant branding data needed). A lightweight approach: add a hamburger button to the admin TopBar that controls a Sheet-based drawer, using the same pattern as MobileSidebar.

### Pattern 4: Dashboard Home Route

Currently `src/app/[orgId]/page.tsx` exists. This maps to `/[orgId]/` — the root tenant route. Phase 7 should ensure nav item "Dashboard" links to `/${orgId}/` (root page) and the existing page renders the dashboard design (this is Phase 11's concern for content, but Phase 7 ensures the route and nav link work correctly).

### Anti-Patterns to Avoid

- **Duplicating layout markup inline:** The tenant layout currently has inline `<header>` markup that duplicates the TopBar component. Replace it with `<TopBar>` — don't keep both.
- **Fetching user in NavItems:** NavItems is a Client Component. It cannot call `supabase.auth.getUser()` server-side. User data must be passed as props from the Server Component layout.
- **Using Tailwind hover classes for CSS variable colors:** `hover:text-[var(--gold-primary)]` does not work with Tailwind v3 and CSS custom properties. Use the `onMouseEnter`/`onMouseLeave` pattern already established in NavItems and AdminNavLinks.
- **Hardcoding tenant-specific colors in sidebar:** The sidebar uses design system tokens (`--bg-sidebar`, `--border-sidebar`). Do not switch to inline hex or Tailwind raw color classes.
- **Scale transforms on hover:** MASTER.md anti-pattern — use border/opacity transitions only.
- **Emojis as icons:** All nav items use Lucide SVGs, never emojis or Material Symbols (stitch uses Material Symbols but the project uses Lucide).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile sidebar drawer | Custom position:fixed overlay | shadcn Sheet (already in MobileSidebar) | Handles focus trap, Escape key, backdrop, accessibility |
| Active nav link detection | Custom URL comparison logic | `usePathname()` from next/navigation | Built-in, reactive to navigation |
| Font loading | Manual @import in CSS | `next/font/google` (already in root layout) | Automatic subsetting, FOUT prevention, already configured |

**Key insight:** The shell is almost entirely built. The work is integration and cleanup, not construction.

---

## Common Pitfalls

### Pitfall 1: TopBar as Server vs. Client Component

**What goes wrong:** Attempting to use `useState` (for search input) in a Server Component context, or wrapping a client component in `"use server"`.
**Why it happens:** The TopBar needs `useState` for the search input — it must be `"use client"`. The layout that contains it is a Server Component. This is fine — you pass props down.
**How to avoid:** Keep `"use client"` at top of `top-bar.tsx`. In the layout (Server Component), import TopBar and pass user data as serializable props (strings only, no functions or class instances).
**Warning signs:** "useState can only be used in a Client Component" error at build time.

### Pitfall 2: Ambient Glow Divs Duplicated

**What goes wrong:** The root `layout.tsx` already renders `.ambient-glow-top` and `.ambient-glow-bottom`. The tenant layout (`[orgId]/layout.tsx`) ALSO renders them. This doubles the glow decorations.
**Why it happens:** Copy-paste from the global layout pattern into the tenant layout.
**How to avoid:** The tenant and admin layouts should NOT include ambient glow divs — those are already in the root layout. Remove the duplicate `ambient-glow-top` / `ambient-glow-bottom` divs from `[orgId]/layout.tsx` and `admin/layout.tsx` during Phase 7 refactor.
**Warning signs:** Double gold glow intensity in the page background.

### Pitfall 3: z-index Conflicts Between TopBar and Sidebar

**What goes wrong:** The sticky TopBar and the sticky Sidebar compete for z-index. Sheet modals (mobile sidebar) need to be above the TopBar.
**Why it happens:** Multiple sticky/fixed elements with similar z-index values.
**How to avoid:** Follow the established z-index ladder:
- Ambient glow: `z-0` (behind everything)
- Content layer: `z-10` (relative)
- Desktop sidebar (sticky): inside z-10 layer, no explicit z needed
- TopBar (sticky): `z-20` (current value in tenant layout) or `z-30` (in tenant layout for header)
- Sheet overlay/modal: shadcn handles internally (typically z-50)
**Warning signs:** Sidebar scrolling content visible under TopBar, or Sheet appearing behind TopBar.

### Pitfall 4: Admin Layout Missing Mobile Support

**What goes wrong:** The admin sidebar uses `hidden lg:flex` — on screens < 1024px the sidebar is invisible and there's no hamburger button. The admin header has no menu toggle.
**Why it happens:** Admin mobile was deprioritized in earlier phases.
**How to avoid:** Add a mobile hamburger+Sheet pattern to the admin layout, similar to `MobileSidebar`. This can be a new `AdminMobileSidebar` component or inline Sheet in the admin layout.
**Warning signs:** Admin routes completely broken on mobile/tablet.

### Pitfall 5: Nav Label Mismatch with Route Map

**What goes wrong:** Stitch mockups use labels like "Lead Discovery", "Export Log", "Team", "Settings" that don't map 1:1 to existing routes.
**Why it happens:** Stitch mockups were designed with a different nav structure than what was built in Phases 1–3.
**How to avoid:** Map stitch labels to actual routes (see Route Mapping section below). Ignore stitch labels that refer to unbuilt features; keep labels that route to real pages. Do not create stub/dead routes.
**Warning signs:** 404 errors when clicking nav items.

### Pitfall 6: Async params in Next.js 15

**What goes wrong:** Accessing `params.orgId` synchronously in the layout causes a build error.
**Why it happens:** Next.js 15 made `params` a Promise.
**How to avoid:** Always `await params` before destructuring (already correct in current `[orgId]/layout.tsx`).

```typescript
// CORRECT (Next.js 15)
const { orgId } = await params;

// WRONG — will error in Next.js 15
const { orgId } = params;
```

---

## Code Examples

### Wiring TopBar into Tenant Layout

```typescript
// src/app/[orgId]/layout.tsx
import { TopBar } from "@/components/layout/top-bar";

export default async function TenantLayout({ children, params }) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ... tenant fetch ...

  const userName = user?.user_metadata?.full_name ?? user?.email ?? "";
  const userInitials = userName.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg-root)" }}>
      {/* Ambient glows are in root layout — do NOT add them here */}
      <div className="relative z-10 flex flex-1">
        <Sidebar orgId={orgId} tenantName={tenant.name} logoUrl={tenant.logo_url} />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar userName={userName} userInitials={userInitials} />
          <main className="flex-1 overflow-y-auto">
            <div className="page-enter">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
```

### Updated Tenant Nav Items (matching redesign + existing routes)

```typescript
// src/components/layout/nav-items.tsx
import { LayoutDashboard, Search, List, Users, FileDown } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/",                  icon: LayoutDashboard, exact: true },
  { label: "Lead Discovery",  href: "/search",            icon: Search,          exact: false },
  { label: "Personas",        href: "/personas",          icon: Users,           exact: false },
  { label: "Lists",           href: "/lists",             icon: List,            exact: false },
  { label: "Export Log",      href: "/dashboard/activity",icon: FileDown,        exact: false },
];
```

Note: "Export Log" concept maps to the activity/exports existing route. "Analytics" can stay or be merged — see Open Questions.

### Admin Nav Items (existing + Phase 13 additions deferred)

```typescript
// For Phase 7 — only add items that have real routes
const ADMIN_NAV = [
  { label: "Command Center", href: "/admin",          icon: LayoutDashboard, exact: true },
  { label: "Tenants",        href: "/admin/tenants",  icon: Building2,       exact: false },
  { label: "Users",          href: "/admin/users",    icon: Users,           exact: false },
  { label: "Analytics",      href: "/admin/analytics",icon: BarChart3,       exact: false },
];
```

The stitch admin mockup shows "Platform Control" and "System Config" section headers — defer these to Phase 13 which rebuilds the full admin dashboard.

---

## Route Mapping: Stitch to Real Routes

This is the critical translation table. Stitch mockups use fictitious names; below is what maps to real Next.js routes.

### Tenant Routes (`/[orgId]/...`)

| Stitch Label | Real Route | Notes |
|---|---|---|
| Dashboard | `/${orgId}/` | Root page; `page.tsx` exists but may be minimal |
| Lead Discovery / Lead Search | `/${orgId}/search` | Existing search page |
| Personas / Campaigns | `/${orgId}/personas` | Existing personas page |
| Export Log | `/${orgId}/dashboard/activity` | Activity log = closest to "export log" concept |
| Analytics | `/${orgId}/dashboard/analytics` | Existing analytics page |
| Lists | `/${orgId}/lists` | Existing lists page — not in stitch nav but must be accessible |
| Settings | No route exists yet | Do NOT add to nav in Phase 7 (no page) |
| Team | No route exists yet | Do NOT add to nav in Phase 7 (no page) |

**Recommendation:** 5 nav items for tenant: Dashboard, Lead Discovery, Personas, Lists, Activity. The "Export Log" stitch concept is spread across Activity + Lists in the real app. Keep both.

### Admin Routes (`/admin/...`)

| Stitch Label | Real Route | Notes |
|---|---|---|
| Command Center / Dashboard | `/admin` | Existing admin home |
| Tenant Registry / Tenants | `/admin/tenants` | Existing tenants list |
| Usage Metrics | `/admin/analytics` | Existing analytics |
| Users (not in stitch) | `/admin/users` | Existing, keep it |
| Global API Keys | No route | Defer to Phase 13 |
| Master Data Schema | No route | Defer to Phase 13 |
| Security Policies | No route | Defer to Phase 13 |
| Integrations | No route | Defer to Phase 13 |

---

## What Already Exists vs. What Needs Work

### Already Built and Correct

| Component | File | Status |
|---|---|---|
| Sidebar desktop | `src/components/layout/sidebar.tsx` | Complete — 220px, gradient bg, gold accent border, team header |
| Sidebar nav items | `src/components/layout/nav-items.tsx` | Labels need update; active state logic correct |
| Mobile sidebar | `src/components/layout/mobile-sidebar.tsx` | Complete — Sheet-based, closes on navigate |
| TopBar component | `src/components/layout/top-bar.tsx` | Complete — needs wiring into layouts |
| Admin nav links | `src/app/admin/admin-nav-links.tsx` | Correct pattern; may need Analytics link added |
| Font loading | `src/app/layout.tsx` | Complete — DM Sans, Cormorant, JetBrains Mono |
| Ambient glows | `src/app/layout.tsx` | Present in root layout |

### Needs Work in Phase 7

| Task | File | Change |
|---|---|---|
| Wire TopBar | `src/app/[orgId]/layout.tsx` | Replace inline `<header>` with `<TopBar>` component; pass user name/initials from session |
| Wire TopBar (admin) | `src/app/admin/layout.tsx` | Replace bare `<header>` span with `<TopBar>` or admin-specific variant |
| Remove duplicate ambient glows | `src/app/[orgId]/layout.tsx` + `src/app/admin/layout.tsx` | Delete the duplicate ambient glow divs (root layout handles them) |
| Update nav labels | `src/components/layout/nav-items.tsx` | Add "Dashboard" link, rename "Search" to "Lead Discovery", consider dropping "Activity"/"Analytics" for single "Export Log" or keep both |
| Add Analytics to admin nav | `src/app/admin/admin-nav-links.tsx` | Add Analytics entry pointing to `/admin/analytics` |
| Admin mobile sidebar | `src/app/admin/layout.tsx` or new component | Add hamburger + Sheet for admin on mobile |
| Dashboard home page | `src/app/[orgId]/page.tsx` | Verify it exists and renders something (content is Phase 11; Phase 7 just ensures the route and nav link work) |

---

## Design System Compliance Checklist

From MASTER.md — verify during implementation:

- [ ] Sidebar background: `var(--bg-sidebar)` (gradient, never flat)
- [ ] Sidebar right border: `var(--border-sidebar)` (gold-tinted)
- [ ] Nav active state: `var(--gold-bg)` background + `var(--gold-primary)` text + 3px gold left border
- [ ] Nav inactive hover: `rgba(255,255,255,0.02)` bg + `var(--text-primary-ds)` text (via onMouseEnter)
- [ ] Team header icon: 36px gold gradient circle
- [ ] TopBar height: 56px (h-14 in Tailwind)
- [ ] TopBar background: `rgba(8,8,10,0.8)` + `backdrop-filter: blur(12px)`
- [ ] TopBar bottom border: `var(--border-subtle)`
- [ ] All icons: Lucide only, `h-4 w-4 shrink-0`
- [ ] Mobile breakpoint: sidebar hidden below `lg` (1024px), hamburger shown
- [ ] Page content: `page-enter` class for fade-in animation
- [ ] No raw Tailwind color classes in new markup
- [ ] No scale transforms on hover

---

## Branding Name Clarification

The stitch mockups use several fictitious product names that should NOT appear in the real app:

| Stitch Name | Real App Name |
|---|---|
| LuxLeads | PGL (Phronesis Growth Labs) |
| Elite Discovery | Lead Discovery |
| LUXELIBRARY | Personas |
| LUX UHNW INTELLIGENCE | PGL |
| PGL ADMIN | PGL Admin Console (already correct in admin layout) |
| Command Center | Admin Dashboard |

The tenant sidebar header shows the **tenant name** (e.g., "The W Team") with "PGL" as the subtitle. This is already correct in `sidebar.tsx`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Next.js `params` synchronous | `params` is a Promise, must be awaited | Next.js 15 | Already handled in codebase; do not regress |
| CSS variable hover via Tailwind | onMouseEnter/Leave handlers | Phase 05-03 | Established pattern; use consistently in all new nav code |
| Separate admin client | `createAdminClient()` for service role | Phase 1 | Admin layout uses this for auth check |

---

## Open Questions

1. **Nav item set for tenants: 5 or 6 items?**
   - What we know: Stitch shows 4-5 items (Dashboard, Lead Discovery, Export Log, Team, Settings). Real routes cover: Dashboard, Search, Personas, Lists, Activity, Analytics.
   - What's unclear: Whether to collapse Activity + Analytics into one "Reports" link, or keep them separate.
   - Recommendation: Keep 6 items (Dashboard, Lead Discovery, Personas, Lists, Activity, Analytics) for Phase 7. Phase 11 (Dashboard) will clarify if any consolidation makes sense.

2. **TopBar in admin layout: same component or separate?**
   - What we know: The admin stitch mockup shows a different top bar (no search input, just page title + system status + notification + settings icon).
   - What's unclear: Whether to create `AdminTopBar` or add conditional props to `TopBar`.
   - Recommendation: For Phase 7, wire in the existing `TopBar` to admin with `userName` props. Phase 13 (Admin Dashboard) can refine to an admin-specific header if needed.

3. **Ambient glow duplication: root vs. layout?**
   - What we know: Root `layout.tsx` already renders ambient glows. Tenant and admin layouts ALSO render them (confirmed by reading the files).
   - Recommendation: Remove duplicates from child layouts. The root layout glows are sufficient and render on every page.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase reading — `src/components/layout/sidebar.tsx`, `src/components/layout/nav-items.tsx`, `src/components/layout/mobile-sidebar.tsx`, `src/components/layout/top-bar.tsx` — current implementation state
- Direct codebase reading — `src/app/[orgId]/layout.tsx`, `src/app/admin/layout.tsx` — current layout structure
- `design-system/MASTER.md` — authoritative design token and component spec
- `stitch/crm_sync_team_export_log/code.html` — sidebar + nav structure reference (LuxLeads mockup)
- `stitch/executive_strategy_dashboard_2/code.html` — admin sidebar structure reference
- `.planning/phases/06-ui-redesign-foundation/06-SUMMARY.md` — Phase 6 deliverables and what's next
- `.planning/STATE.md` — accumulated decisions including CSS variable hover pattern

### Secondary (MEDIUM confidence)

- `stitch/outreach_campaign_orchestrator/code.html` — personas page layout reference (top-bar only, no sidebar)
- `stitch/executive_strategy_dashboard_1/code.html` — tenant dashboard reference (top-bar navigation variant)

### Tertiary (LOW confidence)

- None — all findings grounded in direct codebase reading

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — derived from direct reading of existing code files
- Pitfalls: HIGH — most identified from existing code patterns and STATE.md decisions
- Route mapping: HIGH — derived from reading actual file structure

**Research date:** 2026-03-01
**Valid until:** Stable — no fast-moving external dependencies; valid until Next.js major version bump or design system changes
