---
phase: 33-tenant-issue-reporting-system
plan: 05
type: execute
wave: 4
depends_on: ["33-04"]
files_modified:
  - src/app/admin/admin-nav-links.tsx
autonomous: true
requirements:
  - REQ-33-27  # Add "Issue Reports" link to ADMIN_NAV_PLATFORM array
  - REQ-33-28  # Convert AdminNavLinks to use state/effects for polling
  - REQ-33-29  # Poll /api/admin/reports/unread-count every 30 seconds with cleanup
  - REQ-33-30  # Render red dot / numeric badge on "Issue Reports" entry when open > 0

must_haves:
  truths:
    - "AdminNavLinks imports useState, useEffect, useCallback from React"
    - "AdminNavLinks fetches /api/admin/reports/unread-count on mount"
    - "AdminNavLinks re-fetches every 30000ms via setInterval and cleans up via clearInterval on unmount"
    - "'Issue Reports' link with href '/admin/reports' and AlertTriangle icon is rendered in ADMIN_NAV_PLATFORM section"
    - "When openCount > 0, the 'Issue Reports' link renders a red badge pill showing the count (or '99+' if count > 99)"
    - "When openCount === 0, the link renders without a badge (no stray elements)"
    - "The existing nav items (Command Center, Tenant Registry, Usage Metrics, Automations) render unchanged"
    - "The component still has 'use client' directive and usePathname() active state logic works for the new entry"
  artifacts:
    - path: "src/app/admin/admin-nav-links.tsx"
      provides: "Issue Reports nav entry + unread badge polling"
      contains: "AlertTriangle"
  key_links:
    - from: "src/app/admin/admin-nav-links.tsx"
      to: "/api/admin/reports/unread-count"
      via: "fetch in useEffect with 30s setInterval"
      pattern: "fetch.*admin/reports/unread-count"
    - from: "AdminNavLinks render"
      to: "/admin/reports"
      via: "Link component with href '/admin/reports'"
      pattern: "/admin/reports"
---

<objective>
Add the "Issue Reports" entry to the admin sidebar nav AND wire it to poll the unread-count endpoint, rendering a red badge pill on the link when there are open reports. Convert the previously-static nav component to use React state for polling.

Purpose: Admins need visibility that a report is waiting without having to navigate to `/admin/reports` manually. The badge is the only notification mechanism in v1 (no email, no Slack).

Output: Single file edit to `admin-nav-links.tsx`. The nav now polls every 30 seconds and shows a red pill with the count.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md
@.planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md
@.planning/phases/33-tenant-issue-reporting-system/33-04-SUMMARY.md
@src/app/admin/admin-nav-links.tsx
@src/app/admin/page.tsx

<interfaces>
<!-- Current admin-nav-links.tsx structure (BEFORE this plan): -->
```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, BarChart3, Zap, Key, Database, Shield, Plug } from "lucide-react";

const ADMIN_NAV_PLATFORM = [
  { label: "Command Center",  href: "/admin",            icon: LayoutDashboard, exact: true  },
  { label: "Tenant Registry", href: "/admin/tenants",    icon: Building2,       exact: false },
  { label: "Usage Metrics",   href: "/admin/analytics",  icon: BarChart3,       exact: false },
  { label: "Automations",     href: "/admin/automations", icon: Zap,            exact: false },
];

// Currently has NO useState, NO useEffect, NO data fetching.
// Pure static render with usePathname() for active state.

export function AdminNavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  // ... static render of ADMIN_NAV_PLATFORM + ADMIN_NAV_SYSTEM_ACTIVE + ADMIN_NAV_SYSTEM_STUBS
}
```

<!-- Polling pattern from src/app/admin/page.tsx (canonical): -->
```typescript
useEffect(() => {
  fetchData(); // on mount
  const interval = setInterval(fetchData, 30_000);
  return () => clearInterval(interval);
}, [fetchData]);
```

<!-- From Plan 04: -->
```typescript
// GET /api/admin/reports/unread-count returns { open: N } for super_admin
// Returns 403 for non-super_admin
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add Issue Reports nav entry + wire unread-count polling with 30s interval</name>
  <files>src/app/admin/admin-nav-links.tsx</files>
  <read_first>
    - src/app/admin/admin-nav-links.tsx (FULL current file — 170 lines)
    - src/app/admin/page.tsx (polling pattern reference — useEffect + setInterval + clearInterval)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (Pattern 4 Admin Nav Badge lines 203-249)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Admin navigation LOCKED lines 149-154)
  </read_first>
  <action>
    Edit `src/app/admin/admin-nav-links.tsx` with the following surgical changes:

    **Change 1: Update the imports block at the top of the file.** Replace:
    ```typescript
    "use client";

    import Link from "next/link";
    import { usePathname } from "next/navigation";
    import {
      Building2,
      LayoutDashboard,
      BarChart3,
      Zap,
      Key,
      Database,
      Shield,
      Plug,
    } from "lucide-react";
    ```
    with:
    ```typescript
    "use client";

    import { useCallback, useEffect, useState } from "react";
    import Link from "next/link";
    import { usePathname } from "next/navigation";
    import {
      AlertTriangle,
      BarChart3,
      Building2,
      Database,
      Key,
      LayoutDashboard,
      Plug,
      Shield,
      Zap,
    } from "lucide-react";
    ```

    **Change 2: Add "Issue Reports" to `ADMIN_NAV_PLATFORM`.** Replace:
    ```typescript
    const ADMIN_NAV_PLATFORM = [
      { label: "Command Center",  href: "/admin",            icon: LayoutDashboard, exact: true  },
      { label: "Tenant Registry", href: "/admin/tenants",    icon: Building2,       exact: false },
      { label: "Usage Metrics",   href: "/admin/analytics",  icon: BarChart3,       exact: false },
      { label: "Automations",     href: "/admin/automations", icon: Zap,            exact: false },
    ];
    ```
    with:
    ```typescript
    const ADMIN_NAV_PLATFORM = [
      { label: "Command Center",  href: "/admin",            icon: LayoutDashboard, exact: true  },
      { label: "Tenant Registry", href: "/admin/tenants",    icon: Building2,       exact: false },
      { label: "Usage Metrics",   href: "/admin/analytics",  icon: BarChart3,       exact: false },
      { label: "Automations",     href: "/admin/automations", icon: Zap,            exact: false },
      { label: "Issue Reports",   href: "/admin/reports",    icon: AlertTriangle,   exact: false },
    ];
    ```

    **Change 3: Add polling state + effect at the top of `AdminNavLinks` function.** Replace:
    ```typescript
    export function AdminNavLinks({ collapsed = false }: { collapsed?: boolean }) {
      const pathname = usePathname();

      return (
    ```
    with:
    ```typescript
    export function AdminNavLinks({ collapsed = false }: { collapsed?: boolean }) {
      const pathname = usePathname();
      const [openCount, setOpenCount] = useState(0);

      const fetchUnreadCount = useCallback(async () => {
        try {
          const res = await fetch("/api/admin/reports/unread-count", { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { open?: number };
          setOpenCount(data.open ?? 0);
        } catch {
          // silently ignore — badge stays at previous value
        }
      }, []);

      useEffect(() => {
        fetchUnreadCount(); // immediate fetch on mount
        const interval = setInterval(fetchUnreadCount, 30_000); // 30s polling
        return () => clearInterval(interval);
      }, [fetchUnreadCount]);

      return (
    ```

    **Change 4: Render the badge inside the `ADMIN_NAV_PLATFORM.map(...)` JSX.** The current render is:
    ```typescript
    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-3 ..."
        // ... existing style / mouse handlers ...
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && item.label}
      </Link>
    );
    ```

    Change the trailing `{!collapsed && item.label}` line (inside the Link children) to:
    ```typescript
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {!collapsed && item.href === "/admin/reports" && openCount > 0 && (
          <span
            className="ml-auto inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: "rgb(220, 38, 38)" /* red-600 — hard-coded because nav doesn't use the destructive CSS var */ }}
            aria-label={`${openCount} open report${openCount === 1 ? "" : "s"}`}
          >
            {openCount > 99 ? "99+" : openCount}
          </span>
        )}
        {collapsed && item.href === "/admin/reports" && openCount > 0 && (
          <span
            className="absolute top-1 right-1 inline-block h-2 w-2 rounded-full"
            style={{ background: "rgb(220, 38, 38)" }}
            aria-label={`${openCount} open reports`}
          />
        )}
    ```

    When the sidebar is collapsed, show a small red dot in the top-right corner of the icon. When expanded, show a numeric pill after the label. The collapsed-state absolute positioning requires adding `relative` to the Link's className — check if it's already there, and if not, add `relative` alongside the existing `flex items-center gap-3 rounded-[8px] ...`.

    **Change 5: Add `relative` class to the Link element.** In the className string:
    ```typescript
    className="flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
    ```
    change to:
    ```typescript
    className="relative flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer"
    ```

    **Do NOT modify** the `ADMIN_NAV_SYSTEM_ACTIVE` or `ADMIN_NAV_SYSTEM_STUBS` sections. Only the `ADMIN_NAV_PLATFORM` map needs the badge render. Keep the badge rendering scoped to `item.href === "/admin/reports"` so only that entry shows it.

    **Do NOT extract the badge to a sub-component** — inline is fine and matches the current file's style (single function, no helpers). The file stays under 200 lines after the edit.

    **Do NOT add any imports from the design system badge component** — the raw span pattern above is intentional: the admin nav is styled via CSS vars and inline styles, not via shadcn Badge component (verified by reading the current file).

    The `rgb(220, 38, 38)` hard-coded red is used because the nav's existing style pattern uses inline `style={}` with literal colors (e.g., `rgba(255,255,255,0.02)`). Matching that convention here keeps the diff visually consistent.
  </action>
  <verify>
    <automated>grep -q "AlertTriangle" src/app/admin/admin-nav-links.tsx && grep -q "Issue Reports" src/app/admin/admin-nav-links.tsx && grep -q "/admin/reports" src/app/admin/admin-nav-links.tsx && grep -q "openCount" src/app/admin/admin-nav-links.tsx && grep -q "useEffect" src/app/admin/admin-nav-links.tsx && grep -q "useState" src/app/admin/admin-nav-links.tsx && grep -q "useCallback" src/app/admin/admin-nav-links.tsx && grep -q "/api/admin/reports/unread-count" src/app/admin/admin-nav-links.tsx && grep -q "setInterval(fetchUnreadCount, 30_000)" src/app/admin/admin-nav-links.tsx && grep -q "clearInterval" src/app/admin/admin-nav-links.tsx && grep -q "99+" src/app/admin/admin-nav-links.tsx && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-05.log && ! grep -q "admin-nav-links.tsx" /tmp/tsc-33-05.log</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "AlertTriangle" src/app/admin/admin-nav-links.tsx` passes (new icon import)
    - `grep -q "\"Issue Reports\"" src/app/admin/admin-nav-links.tsx` passes (new nav label)
    - `grep -q "href: \"/admin/reports\"" src/app/admin/admin-nav-links.tsx` passes (new nav href)
    - `grep -q "useState" src/app/admin/admin-nav-links.tsx` passes (new hook import)
    - `grep -q "useEffect" src/app/admin/admin-nav-links.tsx` passes (new hook import)
    - `grep -q "useCallback" src/app/admin/admin-nav-links.tsx` passes (new hook import)
    - `grep -q "openCount" src/app/admin/admin-nav-links.tsx` passes (new state var)
    - `grep -q "fetchUnreadCount" src/app/admin/admin-nav-links.tsx` passes (new callback)
    - `grep -q "/api/admin/reports/unread-count" src/app/admin/admin-nav-links.tsx` passes (new endpoint)
    - `grep -q "setInterval(fetchUnreadCount, 30_000)" src/app/admin/admin-nav-links.tsx` passes (30s polling)
    - `grep -q "clearInterval" src/app/admin/admin-nav-links.tsx` passes (cleanup)
    - `grep -q "99+" src/app/admin/admin-nav-links.tsx` passes (overflow handling)
    - Existing nav entries (`"Command Center"`, `"Tenant Registry"`, `"Usage Metrics"`, `"Automations"`) are still present (grep all 4)
    - Existing `ADMIN_NAV_SYSTEM_ACTIVE` and `ADMIN_NAV_SYSTEM_STUBS` sections unchanged
    - `"use client"` directive still at top of file
    - `npx tsc --noEmit` passes with zero new errors
    - File is still under 220 lines after the edit (approximately)
  </acceptance_criteria>
  <done>Admin nav renders "Issue Reports" link with a live-polling unread badge.</done>
</task>

</tasks>

<verification>
- `grep -c "Issue Reports" src/app/admin/admin-nav-links.tsx` returns 1
- `grep -c "Command Center" src/app/admin/admin-nav-links.tsx` returns 1 (existing entry preserved)
- `grep -c "Tenant Registry" src/app/admin/admin-nav-links.tsx` returns 1 (existing entry preserved)
- `grep -c "Automations" src/app/admin/admin-nav-links.tsx` returns 1 (existing entry preserved)
- `npx tsc --noEmit` is clean
- `npm run lint` is clean
- `npm run build` succeeds
- Manual: visit `/admin`, confirm "Issue Reports" appears in the sidebar with an AlertTriangle icon. With an open report in the DB, the red badge appears. After the status is changed to non-open, the badge disappears on the next 30s poll.
</verification>

<success_criteria>
1. Super admin sees "Issue Reports" entry in the `Platform Control` section of the sidebar with the AlertTriangle icon
2. Clicking the entry navigates to `/admin/reports` (built in Plan 04)
3. When `/api/admin/reports/unread-count` returns `{open: 5}`, a red pill showing `5` appears at the right edge of the "Issue Reports" link
4. When `open > 99`, the badge shows `99+`
5. When `open === 0`, no badge renders (the link shows only icon + label)
6. The badge updates every 30 seconds without requiring a page refresh
7. The `setInterval` is cleaned up via `clearInterval` when the component unmounts
8. The collapsed-sidebar variant shows a small red dot in the icon corner
9. All existing nav entries (Command Center, Tenant Registry, Usage Metrics, Automations, Global API Keys, stubs) render unchanged
10. `usePathname()` active-state logic correctly highlights "Issue Reports" when on `/admin/reports` or a nested route like `/admin/reports/[id]`
</success_criteria>

<output>
After completion, create `.planning/phases/33-tenant-issue-reporting-system/33-05-SUMMARY.md` documenting:
- Final line count of `admin-nav-links.tsx` (should be ~190-220 lines after the edit)
- Polling interval used (30_000ms)
- Whether the collapsed-state dot rendered correctly visually
- Any deviations from the plan (e.g., if the existing className needed additional tweaks to accommodate `relative`)
</output>
