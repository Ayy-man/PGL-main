# Super Admin UX Polish Audit

Scope: `/admin/*` routes only. Reviewed layout + 10 screens. Findings reference primitives already in `src/components/ui/*` (Toaster/useToast, Confirmation, Dialog, Skeleton, Breadcrumbs, EmptyState, Button, Tooltip) and the design tokens in globals (`--gold-primary`, `--border-subtle`, `--text-primary-ds`, `--admin-text-secondary`, `surface-admin-card`, `admin-row-hover`, `page-enter`).

---

## Layout (`src/app/admin/layout.tsx`, sidebar & nav)

### Finding: No `<Toaster />` mounted inside the admin shell
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/app/admin/layout.tsx:30-39`
- **Current**: Main content is just `<TopBar />` + `<main>`. Multiple admin screens roll their own green/red info banners (tenant create, invite user, report detail) because no toast outlet is available. Result: feedback lives *inside* forms, vanishes on route change, and isn't available at all for server-action callers like `TenantStatusToggle` / `UserStatusToggle` (which today `console.error` on failure).
- **Fix**: Import `{ Toaster } from "@/components/ui/toaster"` and mount once at the bottom of the `<div className="flex flex-1 flex-col …">` (or inside `<main>`). Then replace the inline `setSuccess/setError` blocks in `tenants/new/page.tsx`, `users/new/page.tsx`, `tenant-status-toggle.tsx`, `user-status-toggle.tsx`, `reports/[id]/report-detail.tsx` with `toast({ title, description, variant })` from `@/hooks/use-toast`.

### Finding: Sidebar nav items use inline `onMouseEnter/Leave` style mutation instead of CSS `:hover`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/app/admin/admin-nav-links.tsx:91-102, 164-175, 194-199`
- **Current**: Hover color/background is set imperatively on every link via `onMouseEnter / onMouseLeave`. There's no `:focus-visible` state at all — keyboard users tabbing through the sidebar get zero feedback. The style flashes can also drop when the React state re-renders during the 30s polling.
- **Fix**: Replace with a `group` / `hover:` / `focus-visible:` Tailwind ruleset (or a tiny `.admin-nav-link` class in globals). Add `focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)]/40 focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/30` so Tab navigation shows the same gold ring used on buttons. Applies to all three `.map()` blocks.

### Finding: System Config "stubs" are buttons without affordance for disabled
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/admin-nav-links.tsx:183-204`
- **Current**: Stubs render as `<button onClick={(e) => e.preventDefault()}>` with `opacity-60` + `title="Coming soon"`. The browser tooltip is a native one (ugly serif, slow reveal) and there's no visual tag on the row itself.
- **Fix**: Wrap the label span in a styled "Soon" pill (`<span className="ml-auto text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>Soon</span>`) and swap the native `title=` for `<Tooltip>…<TooltipContent>Coming soon</TooltipContent></Tooltip>` from `src/components/ui/tooltip.tsx`. Also set `aria-disabled="true"` and `tabIndex={-1}` so screen readers / keyboard don't stop on them.

### Finding: Sidebar collapse toggle has no tooltip and only a native `title=`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/admin-sidebar.tsx:109-120`
- **Current**: `<button … title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>`. Native title, and the icon does not flip / rotate based on state.
- **Fix**: Replace title with `<Tooltip>` and add `style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}` on the `<PanelLeft />` icon so the affordance direction matches the state.

### Finding: User card in sidebar uses generic `rounded-lg` instead of design-system 14px radius
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/admin-sidebar.tsx:73-79`
- **Current**: `className="rounded-lg p-3 flex items-center gap-3"` with `rgba(255,255,255,0.05)` background. Every other admin card uses `rounded-[14px]` and `surface-admin-card`.
- **Fix**: Change to `rounded-[12px]` (matches the 12px footer elements across admin) and use `var(--bg-elevated)` instead of the raw rgba. Keeps the luxury consistency.

---

## `/admin` (Dashboard)

### Finding: `loading.tsx` skeleton doesn't match the actual dashboard layout
- **Tag**: [MICRO-ANIMATION]
- **Severity**: significant
- **File**: `src/app/admin/loading.tsx:1-14`
- **Current**: Renders a 200px heading bar + five 16px-tall row skeletons. The real page is a 4-col stat grid + full-width tenant table + 2-col bottom grid — none of which is five list rows. Users see a jarring layout shift when `page.tsx` first paints.
- **Fix**: Replace with a layout-matching skeleton: a header row, a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` of four `<Skeleton className="h-[180px] rounded-[14px]" />`, then one `<Skeleton className="h-[360px] rounded-[14px]" />` for the heatmap, then a 2-col grid of two `<Skeleton className="h-[280px] rounded-[14px]" />`. Already-existing `<Skeleton>` from `@/components/ui/skeleton` is fine.

### Finding: Dashboard "Updated Xs ago" ticker has no pause-on-hover / click-to-refresh
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/app/admin/page.tsx:236-242`
- **Current**: The spinning refresh icon + the "Updated 47 min ago" copy are passive — there is no manual refresh button on the whole dashboard, only the automatic 60s poll. Operators running incident response need to force-refresh without waiting a full minute.
- **Fix**: Wrap the header-right block in a `<button>` that calls `fetchAll(true)` and add `hover:bg-[var(--gold-bg)]` + a `<Tooltip>Force refresh</Tooltip>`. Keep the spinner when `isRefreshing`.

### Finding: System Status label is decorative text — no explanation of what drives it
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/page.tsx:224-233`
- **Current**: `<span>OPERATIONAL</span>` with a color. Nothing hints that 10+ 24h errors = INCIDENT and 1-9 = DEGRADED.
- **Fix**: Add a `<Tooltip>` around the status span: `"Operational: <1 error in last 24h · Degraded: 1-9 · Incident: 10+"`. Uses existing `tooltip.tsx`.

### Finding: Pagination buttons on ErrorFeed have no keyboard focus ring and use generic `rounded`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/admin/error-feed.tsx:266-288`
- **Current**: `className="px-3 py-1 rounded text-xs"` — no radius match, no focus-visible, just `disabled:opacity-40`.
- **Fix**: Change to `rounded-[8px]` and add `focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40 focus-visible:outline-none hover:bg-white/[0.08] transition-colors`. Same treatment on the heatmap footer pagination (`src/components/admin/tenant-heatmap.tsx:419-437`).

### Finding: TenantHeatmap "Filter View" / "Provision New Tenant" buttons are non-functional decor
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/admin/tenant-heatmap.tsx:312-341`
- **Current**: Two prominent gold buttons in the heatmap header that have no `onClick` — clicking "Provision New Tenant" does nothing, yet the real CTA on `/admin/tenants` header works. Confuses operator flow. Similarly, the row-action icons ("Impersonate", "View Logs", "Suspend Tenant") at lines 194-212 have no handlers.
- **Fix**: Either wire "Provision New Tenant" to `<Link href="/admin/tenants/new">` (use `asChild` on Button if migrating to primitive) and remove/disable the rest, OR add `disabled` + `cursor-not-allowed` + `<Tooltip>Coming soon</Tooltip>` to flag them as stubs. Silent no-ops are the worst option on a luxury dashboard.

### Finding: ErrorFeed "cursor-pointer" rows are clickable in appearance only
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/admin/error-feed.tsx:63-92, 102-142`
- **Current**: Each error entry has `className="entry-hover flex gap-4 p-4 cursor-pointer"` but no `onClick`. Operator clicks, nothing happens.
- **Fix**: Either remove `cursor-pointer` + `entry-hover` (and drop the implied affordance), or wire an onClick that routes to `/admin/errors/{id}` (detail page exists at `/w-team/admin/errors` per memory). Until the detail route is ready, removing the cursor is the honest fix.

### Finding: "Live Error Feed" header pulse dot is red even when feed is empty (success)
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/components/admin/error-feed.tsx:188-197, 228-237`
- **Current**: Red animated pulse next to "Live" regardless of whether there are errors. A quiet system should pulse green (or at least grey).
- **Fix**: Conditional `background: data?.data.length ? "oklch(0.62 0.19 22)" : "var(--success)"`. Keeps the heartbeat feel without false-alarming during healthy periods.

### Finding: SystemActions dialog "Done" ticks then auto-closes with no toast trace
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/admin/system-actions.tsx:61-71, 169-186`
- **Current**: `handleConfirm` simulates a 1.5s loading → 1.2s "Done" → auto-close. Once the dialog is gone there's zero evidence that the operator rotated master keys. For destructive actions this is exactly the wrong pattern.
- **Fix**: After the action resolves, fire `toast({ title: "Master keys rotated", description: "All users will re-authenticate on next request." })` from `use-toast` and keep the dialog-close behaviour. Pairs with the layout-level Toaster mount above.

### Finding: SystemActions destructive variants don't use the `<Confirmation>` primitive
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/admin/system-actions.tsx:127-190`
- **Current**: "Rotate Master Keys" and "Flush Cache" are marked `variant: "danger"` but confirm from a plain Dialog with no "type DELETE to confirm" friction or visual destructive framing. They immediately run on first click of the red button.
- **Fix**: Replace the inner dialog body with `<Confirmation isDestructive>` + `<ConfirmationIcon variant="destructive">` + `<ConfirmationTitle>` (all from `src/components/ui/confirmation.tsx`), which already applies the destructive border + red icon. Optionally add a text-match input for the two truly-destructive ones.

### Finding: Dashboard polling doesn't pause when tab is hidden
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/page.tsx:177-180`
- **Current**: `setInterval(() => fetchAll(true), 60_000)` runs forever. An operator leaves the tab open overnight and the dashboard hammers `/api/admin/*` endpoints 60 times an hour for nothing.
- **Fix**: Wrap in a `document.visibilityState === "visible"` guard inside the interval callback, or listen to `visibilitychange` and pause/resume the interval. No new deps.

---

## `/admin/tenants` (List)

### Finding: TenantTable has no sticky header — scrolling a long tenant list loses column context
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/tenants/tenant-table.tsx:27-61`
- **Current**: Plain `<thead>`; inside `overflow-x-auto`. On 50+ tenants the header scrolls away.
- **Fix**: Add `className="sticky top-0 z-10"` on `<thead>` and `style={{ background: "var(--bg-elevated)" }}` to preserve the surface. Match the existing `admin-thead` treatment.

### Finding: Status badges use destructive/emerald mix without design-system tokens in one place
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/tenants/tenant-table.tsx:89-97`
- **Current**: Active uses `bg-[var(--success-muted)] text-[var(--success)]`, inactive uses `bg-destructive/10 text-destructive` (Tailwind token, not DS). Mixed vocabulary.
- **Fix**: Swap destructive to the oklch tokens the rest of admin uses: `style={{ background: "color-mix(in oklch, oklch(0.62 0.19 22) 10%, transparent)", color: "oklch(0.62 0.19 22)" }}` — consistent with `system-actions.tsx` / `error-feed.tsx`.

### Finding: Empty state is a single line of grey text
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/tenants/tenant-table.tsx:66-74, 119-123`
- **Current**: `"No tenants found. Create your first tenant to get started."` as a single `<td>` / `<div>` of `text-muted-foreground`. Neither calls out the CTA (`/admin/tenants/new`).
- **Fix**: Replace with `<EmptyState icon={Building2} title="No tenants yet" description="Create your first real-estate team to start onboarding users." ><Button asChild variant="gold"><Link href="/admin/tenants/new"><Plus className="h-4 w-4" /> Create Tenant</Link></Button></EmptyState>`. Primitive already exists at `src/components/ui/empty-state.tsx`.

### Finding: Row hover is subtle + row-click opens drawer, but no cursor tooltip on desktop
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/tenants/tenant-table.tsx:77-82`
- **Current**: `<tr className="admin-row-hover cursor-pointer" onClick={...}>` — nothing hints that click opens a detail drawer (vs. just toggling status, since the toggle button is also on the row).
- **Fix**: Add `title="View tenant details"` (or wrap Name cell in a `<Tooltip>`) and add `focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold-primary)]/40` + `tabIndex={0}` + `onKeyDown` handler for Enter/Space so keyboard users can open the drawer. Currently the only way to open it is mouse-click.

### Finding: No client-side search / filter on the tenants list
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/tenants/page.tsx:8-42`
- **Current**: Server renders every tenant in one shot, no filter bar at all. At 20+ tenants this becomes fiddly.
- **Fix**: Add a small `<input placeholder="Filter tenants…">` above the table inside `TenantTable` (client component) with a `useMemo` filter on `name` / `slug` — no network changes. Use `input.tsx` and the same styling as `reports-table.tsx` filter inputs to stay consistent.

### Finding: `TenantStatusToggle` has no "Activating…"/"Deactivating…" visual cue other than text swap
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/tenants/tenant-status-toggle.tsx:30-42`
- **Current**: Optimistic text flip to `"Updating..."` with `opacity-50`. No spinner icon, no success/failure toast. On failure it silently reverts — the operator has no idea the deactivation didn't land.
- **Fix**: Add `<Loader2 className="h-3 w-3 animate-spin" />` inline while `isPending`. On catch, call `toast({ variant: "destructive", title: "Failed to update tenant", description: err.message })`. On success, fire a neutral success toast.

---

## `/admin/tenants/new`

### Finding: Form inputs are raw `<input>` with `rounded-[8px]` manually styled, ignoring `Input` primitive
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/tenants/new/page.tsx:83-90, 97-105, 115-121`
- **Current**: Hand-rolled `<input className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold-primary)]/50" />` three times. The project has `src/components/ui/input.tsx`.
- **Fix**: Import `{ Input }` and use it. If the ring styling differs from DS, update `Input` once (not three inline copies). Same for the textarea in the report detail.

### Finding: Slug field doesn't auto-derive from Tenant Name
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/app/admin/tenants/new/page.tsx:82-109`
- **Current**: Two independent text fields. Every operator manually types "Acme Real Estate" → "acme-real-estate". Easy to typo; results in 409 slug collisions.
- **Fix**: Add an `onChange` on the name field that setStates a suggested slug (`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")`) only while the slug field is untouched by the user (track a `slugDirty` boolean). Also add inline validation (see next finding).

### Finding: No inline validation for slug pattern — users discover failure on submit
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/tenants/new/page.tsx:97-108`
- **Current**: `pattern="[a-z0-9-]+"` is HTML5-native — error bubbles only on submit, in the OS style, not the DS style.
- **Fix**: Track `slugError` state, validate on `onBlur` ("Use only lowercase letters, numbers, and hyphens"), render it under the field in `text-xs` with `color: var(--destructive)`. Reuse the existing `error && <div>` banner pattern.

### Finding: No unsaved-changes warning on Cancel / route change
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/tenants/new/page.tsx:141-146`
- **Current**: "Cancel" is a plain `<Link href="/admin/tenants">` — if the operator filled in everything and misclicks, no confirm dialog fires.
- **Fix**: If any input has a value, Cancel should open a `<Confirmation isDestructive>` from `confirmation.tsx` ("Discard this new tenant? Your changes will be lost."). Only navigate on confirm.

### Finding: Success banner auto-redirects after 2-3s — too fast to read on slow connections
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/tenants/new/page.tsx:28-40`
- **Current**: `setTimeout(() => router.push("/admin/tenants"), 2000)`. Also a 3s timeout for the warning branch, but operators may miss why the invite failed.
- **Fix**: Replace the inline banner + setTimeout with a persistent toast (mounted toaster per the layout fix) and navigate immediately. Toast survives the route change and remains dismissible.

### Finding: "Brand Theme" label has no description or preview of the active palette
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/tenants/new/page.tsx:127-131`
- **Current**: `<label className="text-sm font-medium">Brand Theme</label>` with no help-text. Every other field has a small `text-xs text-muted-foreground` hint beneath.
- **Fix**: Add `<p className="text-xs text-muted-foreground">This theme colors the tenant's sidebar, buttons, and accents.</p>` under the picker to match the hint pattern used on the slug/admin-email fields.

### Finding: Submit button doesn't show a spinner while pending
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/tenants/new/page.tsx:133-140`
- **Current**: Text-only swap to `"Creating..."`. Applies to the invite-user button too.
- **Fix**: Add `<Loader2 className="h-3.5 w-3.5 animate-spin" />` beside the label when `isPending`. Or migrate to the `Button` primitive and add a `loading` prop extension.

---

## `/admin/users` (List)

### Finding: Users list has no tenant filter or search despite being cross-tenant
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/app/admin/users/page.tsx:8-43`
- **Current**: Server-renders every user across every tenant, no filter controls. The page subtitle literally says *"Manage users across all tenants"* but provides no way to scope by tenant. Unusable at 50+ users.
- **Fix**: Add a client-side filter bar (mirrors `reports-table.tsx`): a tenant `<select>` populated from the joined `tenants.name` set, a role `<select>`, and an email/name search input. Keep the initial server-rendered `users` payload; filter in a `useMemo` on the client.

### Finding: Users list has no "Resend invite" / "Remove" actions — only status toggle
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/app/admin/users/page.tsx:108-113`
- **Current**: Actions column contains only `<UserStatusToggle>`. For invited-but-not-signed-up users there's no UI to resend. Memory confirms `resendInvite` was just fixed (commit `8b68a28`) so the server action exists but isn't wired here.
- **Fix**: Add a `<DropdownMenu>` (primitive at `src/components/ui/dropdown-menu.tsx`) in the actions cell with "Resend invite", "Deactivate/Activate", "Edit role" items. Each fires a server action and a toast.

### Finding: Role pill uses gold tone regardless of role — super_admin/tenant_admin/agent/assistant indistinguishable
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/app/admin/users/page.tsx:90-92, 148-153`
- **Current**: All roles render as `bg-[var(--gold-bg)] text-[var(--gold-primary)]`. A scan-through can't distinguish a super_admin from an assistant.
- **Fix**: Map role → tone: super_admin = gold solid (gold-primary bg, dark text), tenant_admin = gold muted, agent = neutral elevated, assistant = ghost. Add this as a small `<RoleBadge role={user.role} />` component in the file or in `wealth-tier-badge.tsx` neighborhood.

### Finding: Desktop table has no sticky header (same issue as tenants)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/users/page.tsx:48-70`
- **Current**: Plain `<thead>` inside scrollable `<div className="hidden md:block overflow-x-auto">`.
- **Fix**: Same as tenants — `sticky top-0 z-10` on `<thead>` + solid `bg-[var(--bg-elevated)]`.

### Finding: Empty state is one line of muted text
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/users/page.tsx:72-77, 124-127`
- **Current**: `"No users found. Create your first user to get started."` — same anti-pattern as tenants.
- **Fix**: Replace with `<EmptyState icon={UserPlus} title="No users yet" description="Invite your first agent or assistant." ><Button asChild variant="gold"><Link href="/admin/users/new">Invite User</Link></Button></EmptyState>`.

### Finding: Rows are not click-to-open — status toggle is the only interaction
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/users/page.tsx:82-117`
- **Current**: `<tr className="admin-row-hover">` with no onClick. Operator can't drill into user detail (there is no detail page, but at least clicking the email could copy it or link `mailto:`).
- **Fix**: Either (a) wrap the email in a `<CopyButton>` that toasts "Copied to clipboard", or (b) add a "View user" right-aligned action once a detail page exists. For now (a) is the low-effort win — reuse the copy pattern from `reports/[id]/report-detail.tsx:329-333`.

---

## `/admin/users/new`

### Finding: Role `<select>` uses native browser styling on dark theme
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/users/new/page.tsx:109-122, 134-147`
- **Current**: Raw `<select>` elements. On macOS Safari + Chrome Linux, native selects ignore the dark background and render a light dropdown panel — looks broken against the luxury theme. Same issue in `reports-table.tsx:160-192` and `report-detail.tsx:605-617`.
- **Fix**: Replace with the `Select` primitive at `src/components/ui/select.tsx` (shadcn Radix Select). It renders a themed popover. This alone is the single biggest luxury-positioning fix on the admin surface.

### Finding: Tenant dropdown shows plain "Loading tenants..." text instead of a skeleton
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/users/new/page.tsx:128-133`
- **Current**: `{loading ? <div>Loading tenants...</div> : <select>...}` — no shimmer, just a muted string.
- **Fix**: Render `<Skeleton className="h-9 w-full rounded-[8px]" />` from `src/components/ui/skeleton.tsx`. Matches the admin dashboard skeleton vocabulary.

### Finding: Role change from non-super_admin → super_admin doesn't reset/clear hidden tenant_id
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/users/new/page.tsx:124-149`
- **Current**: The tenant block vanishes via `selectedRole !== "super_admin"` conditional but if a user picks a tenant, switches role to super_admin, the hidden stale value never clears on the DOM (form submit still only sends fields currently rendered, so it's functionally OK — but the inverse path, super → agent, reveals an empty required select and users don't realise).
- **Fix**: On role change to a non-super role, add a `useEffect` that scrolls the tenant select into view and briefly pulses its border (`animate-[pulse_0.6s]`) so users notice the new required field.

### Finding: No keyboard shortcut (Cmd+Enter) to submit the invite form
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/users/new/page.tsx:35-49`
- **Current**: Form submit only via the button click.
- **Fix**: Add an `onKeyDown` on the form that checks `(e.metaKey || e.ctrlKey) && e.key === "Enter"` and calls `handleSubmit`. Tiny win for power operators. Same pattern would help `tenants/new`.

### Finding: "Back to Users" link has no focus ring and no breadcrumb context
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/users/new/page.tsx:53-59`
- **Current**: Lone `<Link>` with arrow. The user doesn't know they're at Admin → Users → Invite until they read the H1.
- **Fix**: Replace with `<Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: "Invite" }]} />` from `src/components/ui/breadcrumbs.tsx`. Same fix for `tenants/new` and the `reports/[id]` detail (where `ArrowLeft` currently stands alone).

---

## `/admin/analytics`

### Finding: Entire page is a static "Coming Soon" placeholder with no skeleton animation
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/analytics/page.tsx:1-34`
- **Current**: Renders six dark 112px boxes + one 300px box with `opacity-40` and a gold "Coming Soon" pill. The boxes are totally static; the page looks broken for the 2-3s it takes to wonder why nothing is loading.
- **Fix**: Add `animate-pulse` to each placeholder box (`className="h-28 rounded-xl border bg-card animate-pulse"`). Better yet, switch to `<Skeleton>` from DS. Adds life to a dead page.

### Finding: No ETA or contact-for-info copy on the coming-soon card
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/analytics/page.tsx:15-31`
- **Current**: Just a label "Coming Soon" — no estimate, no "notify me when available", no alternative link to `/admin` dashboard which already has Platform Pulse / API quota / enrichment health.
- **Fix**: Augment with a `<p className="text-xs text-muted-foreground mt-2">In the meantime, see the <Link href="/admin">Command Center</Link> for real-time metrics.</p>` rendered beside the pill. Still ComingSoonCard but with a useful exit.

---

## `/admin/reports` (List)

### Finding: Tenant filter requires explicit "Search" button click — no debounce/Enter-only
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/app/admin/reports/reports-table.tsx:194-219, 144-146`
- **Current**: Status/category selects trigger `fetchRows` automatically (via `useEffect`), but tenant search is explicitly `"applied on button click only"` (comment at line 146). Two different interaction models for the same filter bar is confusing. Status change fires a network call immediately but tenant typing doesn't.
- **Fix**: Add a 300ms debounced effect on `tenantInput` and remove the Search button (or keep it for accessibility but not as the only trigger). Use a small custom `useDebounce` hook or `setTimeout` + cleanup.

### Finding: Filter selects are native, not themed `Select` primitive
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/reports/reports-table.tsx:160-192`
- **Current**: Two `<select>` elements with manual styling — same native-widget-on-dark issue as `users/new`.
- **Fix**: Migrate to `<Select>` from `@/components/ui/select.tsx`.

### Finding: Filter chips don't show "X" to clear active filters
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/reports-table.tsx:159-234`
- **Current**: Operator picks `status=investigating`, `category=bug`, `tenant=Acme`. To clear them all, they must set each back to "All…". No "Clear filters" button, no chip row above the table.
- **Fix**: Add a small "Clear filters" ghost button that appears when `status || category || tenantQuery` is truthy, resetting all three.

### Finding: Loading state sets row text to `"Loading…"` in the empty row — no skeleton
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: `src/app/admin/reports/reports-table.tsx:267-275, 323-326`
- **Current**: When `loading && rows.length === 0` the table body is a single row saying "Loading…". When filtering an existing populated table, the stale rows flash out of existence. No skeleton bridge.
- **Fix**: Keep the previous rows visible and overlay a subtle `opacity-60` + spinner, OR render 5 `<Skeleton>` rows when `loading` (like the `tenant-heatmap.tsx` SkeletonRow pattern).

### Finding: "View" button has no `focus-visible` ring
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/reports-table.tsx:301-313`
- **Current**: Gold-bordered link with `transition-colors`, no `focus-visible:ring-*`.
- **Fix**: Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)]/40`.

### Finding: StatusBadge uses Tailwind colors (`bg-red-500/10 text-red-400`, `bg-blue-500/10`) instead of DS tokens
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/reports-table.tsx:64-82, report-detail.tsx:78-95`
- **Current**: Mixed vocabulary — "resolved" uses DS (`var(--success)`), but "open" and "investigating" use raw Tailwind red/blue. Same map duplicated in both files.
- **Fix**: Extract into `src/components/admin/report-status-badge.tsx` (single source of truth) and use oklch tokens: open → `oklch(0.62 0.19 22)`, investigating → `oklch(0.65 0.13 240)`. Then import from both files.

---

## `/admin/reports/[id]` (Detail)

### Finding: Destructive status transitions (resolved/wontfix/duplicate) skip the `<Confirmation>` primitive
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:335-357, 605-628`
- **Current**: Save button just PATCHes. The in-UI hint at line 619-622 warns about auto-recording resolver+timestamp, and line 623-627 blocks close-with-empty-note — but there's no confirm step before writing.
- **Fix**: When `isClosing === true`, hijack `handleSave` to first open a `<Confirmation>` with `isDestructive` variant: "Close this issue? This cannot be undone without a status rewind." Only then call the PATCH.

### Finding: Target-snapshot `<pre>` block has no copy button
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:444-457`
- **Current**: JSON dump in a `max-h-64` scrollable `<pre>`. Operators debugging it paste the whole thing into Claude Code, but currently have to hand-select.
- **Fix**: Add a `<button>` in the top-right of the SectionCard that `navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))` and toasts "Snapshot copied". Reuse the same copied-state pattern already present at lines 121, 329-333, 395-407.

### Finding: Screenshot has no zoom / lightbox — click-to-enlarge expected but absent
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:466-473`
- **Current**: `<img className="w-full h-auto max-h-[600px] object-contain">` — clipped to 600px, no onClick, no cursor. Tenant bug reports often contain fine text/UI detail.
- **Fix**: Wrap in a `<Dialog>` (primitive exists) that opens to a full-viewport image. Add `cursor-zoom-in` and a small "Open full-size" chip in the corner. Signed URL already 60min TTL so the dialog won't break.

### Finding: Context section toggle only hints expand via chevron — no animation on collapse/expand
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:496-566`
- **Current**: `{contextExpanded && <div>...</div>}` — mount/unmount without transition. The chevron flips but the content pops in.
- **Fix**: Wrap content in a `max-h` transition: `className={cn("overflow-hidden transition-[max-height] duration-300 ease-in-out", contextExpanded ? "max-h-[800px]" : "max-h-0")}` (always mounted). Smooth accordion feel, no new deps.

### Finding: Back link at top has no breadcrumb
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:367-377`
- **Current**: Just `<Link href="/admin/reports"><ArrowLeft /> Back to Issue Reports</Link>`.
- **Fix**: Replace with `<Breadcrumbs items={[...]} />` — gives the report short-id context in the last segment.

### Finding: "Admin notes" textarea has no character counter and no autosave hint
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:637-646`
- **Current**: Plain textarea, no length guidance. Operators write long paragraphs that hit backend limits unseen.
- **Fix**: Add `<p className="text-[10px] text-right" style={{ color: "var(--text-ghost)" }}>{notes.length}/2000</p>` beneath and a soft max on 2000. Clarifies there's no autosave so Save must be pressed.

### Finding: Save button success banner stays persistent with no auto-dismiss
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:584-595`
- **Current**: `success && <div>Changes saved successfully</div>` — never cleared.
- **Fix**: Either auto-dismiss after 3s via `setTimeout` in `handleSave`, or (better) migrate to toast once Toaster is mounted. Banner-forever is the worst of both worlds.

### Finding: Copy full report button says "Copied!" but doesn't announce via `aria-live`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/reports/[id]/report-detail.tsx:395-407`
- **Current**: Button text and color change for 2s, but screen readers don't hear it.
- **Fix**: Wrap the button in a visually-hidden `<span aria-live="polite" className="sr-only">{copied ? "Full report copied to clipboard" : ""}</span>`. Tiny a11y polish.

---

## `/admin/api-keys`

### Finding: Mock-mode toggle has no confirmation despite flipping billing-affecting behaviour
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: `src/components/admin/api-keys/integration-card.tsx:54-74, 160-181`
- **Current**: Clicking the toggle sends `{ apollo_mock_enrichment: !mockOn }` directly. Turning mock OFF starts burning Apollo credits immediately. Memory explicitly warns: `"APOLLO_MOCK_ENRICHMENT=true → fake enrichment for testing. Flip to false when credits renew."` Easy to misclick.
- **Fix**: Wrap the toggle in a `<Confirmation>` that fires on click-with-toggle-off-attempt: "Turn off mock mode? Live Apollo enrichment costs credits." Only on confirm do the PATCH.

### Finding: Toggle failure only `console.error`s — user sees toggle revert silently
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: `src/components/admin/api-keys/integration-card.tsx:68-73`
- **Current**: `catch (err) { console.error("[IntegrationCard] mock toggle failed:", err); }` with no state revert, no toast. Actually — the state IS never updated on failure (since the `setMockOn(next)` only fires on success), so the UI stays stale until refresh.
- **Fix**: Add `toast({ variant: "destructive", title: "Couldn't update mock mode", description: err.message })`. Ensures operator knows to retry.

### Finding: Test connection result is a tiny line that doesn't persist across re-fetches
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/components/admin/api-keys/integration-card.tsx:219-244`
- **Current**: `result` state resets on every `runTest()`. A refresh of the page wipes all test results.
- **Fix**: Add a `latestTestedAt` timestamp alongside the result so the operator sees "Tested 3m ago". Minor — but framing matters here since Apollo credits are scarce.

### Finding: Env var previews use `color: "oklch(0.62 0.19 22)"` (red) for "not set" but no icon / hint
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/components/admin/api-keys/integration-card.tsx:126-136`
- **Current**: When unset, value is `"— not set —"` in red. But required-ness isn't distinguished from optional env vars.
- **Fix**: Add a small `<XCircle className="h-3 w-3" />` icon next to unset values and `<CheckCircle2>` next to set ones. Keeps the scan-density but sharpens the status.

### Finding: Refresh button duplicates the integration-card-level test button label
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/api-keys/page.tsx:77-92`
- **Current**: Page-level "Refresh" uses a gold-tinted ghost. Inline card tests ("Test Connection") use the same gold. Similar visual weight → operator can't tell global vs per-card action.
- **Fix**: Demote page-level Refresh to `variant="ghost"` (the unified ghost on grey) and keep gold exclusively for action-ish per-card CTAs. Or add a subtle `<RotateCw>` icon-only button in the header.

### Finding: Loading state is centered spinner only — no skeleton of the cards
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/api-keys/page.tsx:127-134`
- **Current**: Just `<Loader2 className="animate-spin">` for the full load. Then the entire grid pops in.
- **Fix**: Render 6 card skeletons matching `IntegrationCard`'s dimensions while `loading && !integrations`. Reuse the `animate-pulse` bar pattern already seen in `tenant-heatmap.tsx` SkeletonRow.

---

## `/admin/automations`

### Finding: Refresh button uses imperative hover state with `onMouseEnter/Leave`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/automations/page.tsx:67, 115-127`
- **Current**: `const [refreshHovered, setRefreshHovered] = useState(false)` + two handlers that manipulate inline style. Overkill for a hover.
- **Fix**: Delete the state and handlers; use Tailwind: `className="p-2 rounded-[8px] transition-colors duration-200 text-[var(--text-secondary-ds)] hover:text-[var(--gold-primary)] hover:bg-[var(--gold-bg)]"`. Also add `focus-visible:ring-1 focus-visible:ring-[var(--gold-primary)]/40`.

### Finding: Refresh button has native `title="Refresh"` instead of Tooltip
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: `src/app/admin/automations/page.tsx:124-127`
- **Current**: Native tooltip.
- **Fix**: Replace with `<Tooltip>…<TooltipContent>Refresh</TooltipContent></Tooltip>`.

### Finding: 60s polling doesn't visually separate "stale" from "fresh" data
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: `src/app/admin/automations/page.tsx:84-93`
- **Current**: Data just updates silently. No "Last updated X s ago" indicator like `/admin` has (at page.tsx:239-241).
- **Fix**: Mirror the dashboard pattern: track `lastFetched`, show "Updated 12s ago" in the header. The primitive is literally already written in `src/app/admin/page.tsx:78-82` — extract `formatSecondsAgo` to `src/lib/utils.ts`.

### Finding: Error banner uses same rounded radius but inconsistent padding vs other admin banners
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/automations/page.tsx:131-138`
- **Current**: `rounded-[14px] p-4` (card-size radius) but it's an inline alert. The rest of admin uses `rounded-[8px]` for banners (`reports/[id]/report-detail.tsx:574`, `tenants/new/page.tsx:67`).
- **Fix**: Use `rounded-[8px] border px-4 py-3` to match the destructive-banner pattern already scattered across admin.

### Finding: Polling runs while tab hidden (same issue as dashboard)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: `src/app/admin/automations/page.tsx:90-93`
- **Current**: Unconditional `setInterval`.
- **Fix**: Same `document.visibilityState` guard.

### Finding: AutomationHealthCard skeleton is 2 cards even if the real count is >2
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: `src/app/admin/automations/page.tsx:155-166`
- **Current**: `Array.from({ length: 2 })` hardcoded. When the backend adds a third function it'll layout-shift on first render.
- **Fix**: Render 4 skeleton cards (matches the `md:grid-cols-2` for 2 rows) or read the expected count from a constant.

---

## Top 10 impact-to-effort picks

Sorted by leverage (high-impact, low-effort-first):

1. **Mount `<Toaster />` in admin layout** — `src/app/admin/layout.tsx:30-39`. Unblocks ~8 other findings across every screen (status-toggle failures, tenant-create success, invite-user result, mock-mode toggle, save-report).
2. **Replace native `<select>`s with themed `Select` primitive** — `src/app/admin/users/new/page.tsx:109-147`, `src/app/admin/reports/reports-table.tsx:160-192`, `src/app/admin/reports/[id]/report-detail.tsx:605-617`. Single biggest luxury-positioning fix on the admin surface.
3. **Add tenant/role/name filter to `/admin/users`** — `src/app/admin/users/page.tsx:8-43`. Page is literally titled "all tenants" but has zero scoping; mirror `reports-table.tsx` pattern.
4. **Confirm destructive SystemActions and mock-mode flip** — `src/components/admin/system-actions.tsx:127-190` and `src/components/admin/api-keys/integration-card.tsx:54-74`. Use existing `<Confirmation isDestructive>` primitive. Prevents credit/cache footguns.
5. **EmptyState primitive on all "No X found" strings** — `src/app/admin/tenants/tenant-table.tsx:66-74`, `src/app/admin/users/page.tsx:72-77, 124-127`, `src/app/admin/reports/reports-table.tsx:267-275`. Primitive already exists; mechanical swap.
6. **Layout-accurate dashboard skeleton** — `src/app/admin/loading.tsx:1-14`. First-paint of a dashboard that looks nothing like the real layout is a first-impression killer.
7. **Wire or disable the TenantHeatmap ghost buttons** — `src/components/admin/tenant-heatmap.tsx:194-212, 312-341`. Non-functional CTAs on the command-center dashboard read as broken.
8. **Breadcrumbs primitive on `/admin/tenants/new`, `/admin/users/new`, `/admin/reports/[id]`** — `src/app/admin/tenants/new/page.tsx:50-56`, `src/app/admin/users/new/page.tsx:53-60`, `src/app/admin/reports/[id]/report-detail.tsx:367-377`. Primitive exists; three-file mechanical replacement.
9. **Auto-derive slug from Tenant Name + inline validation** — `src/app/admin/tenants/new/page.tsx:82-109`. Slug collisions are a real support issue; operator-delight win.
10. **Pause 60s polling when tab is hidden** — `src/app/admin/page.tsx:177-180` and `src/app/admin/automations/page.tsx:90-93`. Prevents idle admin tabs from hammering 8+ endpoints per minute across a work week.
