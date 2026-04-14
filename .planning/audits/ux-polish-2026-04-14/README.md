# UX Polish Audit — 2026-04-14

Five parallel audits over the full app. **242 findings total** across micro-interactions, micro-animations, and micro-improvements, tagged + file/line-cited + paired with a concrete fix. No architectural suggestions, no new features — polish only.

## Detail files (read these for the per-screen specifics)

| File | Scope | Findings |
|---|---|---|
| [01-super-admin.md](01-super-admin.md) | `/admin/*` — tenants, users, analytics, reports, api-keys, automations | 59 |
| [02-tenant-admin-auth.md](02-tenant-admin-auth.md) | auth, onboarding, team, settings, suspended | 45 |
| [03-agent-workflow.md](03-agent-workflow.md) | search → personas → lists → prospects → exports → dashboard (core journey + Assistant read-only) | 44 |
| [04-shell-cross-cutting.md](04-shell-cross-cutting.md) | sidebar, top-bar, command palette, toasts, modals, loading/error pages, kbd, mobile, transitions | 38 |
| [05-design-system.md](05-design-system.md) | `tailwind.config.ts`, `globals.css`, every `ui/` primitive, typography ladder, gold discipline, empty-state coverage | 56 |

---

## Keystone fixes — 10 changes that cascade across the whole app

Ship these first. Each is a single edit that silently upgrades many downstream screens. Collectively they close ~60 of the 242 findings.

| # | Keystone change | File(s) | Cascade |
|---|---|---|---|
| K1 | `TOAST_REMOVE_DELAY`: 1,000,000 → 5,000; `TOAST_LIMIT`: 1 → 3 | `src/hooks/use-toast.ts:11-12` | Fixes every toast in the app (they currently never auto-dismiss) |
| K2 | Mount `<Toaster />` in admin shell | `src/app/admin/layout.tsx:30-39` | Unblocks ~8 admin screens that roll their own inline banners |
| K3 | Mount `<TooltipProvider delayDuration={250}>` at root | `src/app/layout.tsx` | Fixes silent tooltip failures everywhere |
| K4 | `Button` `default` variant → `gold-solid` | `src/components/ui/button.tsx:35-38` | Re-colors ~9 primary CTAs (Create List, Save Search, Invite, every auth/onboarding submit) from tan to gold |
| K5 | Restyle Toast + Tooltip + DropdownMenu Content to `--bg-floating-elevated`, drop `bg-primary` | `ui/toast.tsx:27-41`, `ui/tooltip.tsx:22-24`, `ui/dropdown-menu.tsx:67-87` | Every floating surface stops reading as shadcn-default |
| K6 | Input/Textarea/Select focus shadow → `var(--gold-bg-strong)` (not raw rgba) | 3 files | All tenant-rethemify correctly; today `#d4af37` is baked in so sapphire/emerald tenants still get gold focus rings |
| K7 | Badge/Button gold variants → `var(--gold-*)` token-based | `ui/badge.tsx`, `ui/button.tsx` | Fixes 9 primitive files with hard-coded `rgba(212,175,55,*)` hex that break tenant themes |
| K8 | `EnrichmentStatusDots` primitive rollout + `animate-pulse` on in-progress state | primitive + `prospect-results-table.tsx:289`, `list-member-table.tsx:65` | Search + list tables stop rendering static grey stubs; the multi-source intelligence story becomes visible |
| K9 | Create `src/app/not-found.tsx` matching `global-error.tsx` chrome | new file | Prospects hitting a bad tenant URL stop seeing Next.js defaults |
| K10 | Checkbox checked state + Table selected-row state → gold | `ui/checkbox.tsx:16`, `ui/table.tsx:61` | Restores "gold = selected" universal signal in every data table + bulk action |

---

## Top 25 cross-ranked picks

Sorted by impact-to-effort across all five audits. Column tags: **Sev** = severity; **Tag** = [I]nteraction / [A]nimation / [M]icro-improvement.

| # | Finding | Sev | Tag | File |
|---|---|---|---|---|
| 1 | **K1** — toast auto-dismiss (5s) + stack to 3 | significant | M | `src/hooks/use-toast.ts:11-12` |
| 2 | **K4** — Button `default` → `gold-solid` variant | significant | M | `src/components/ui/button.tsx:35-38` |
| 3 | **K2** — mount `<Toaster/>` in admin shell | significant | M | `src/app/admin/layout.tsx` |
| 4 | Replace native `confirm()` on search dismiss + list delete + member remove with `<Confirmation>` | significant | M | `search-content.tsx:785`, `list-grid.tsx:26`, `list-member-table.tsx:157` |
| 5 | Add confirm to persona delete (one click destroys 1000s of enriched prospects) | significant | M | `persona-card-grid.tsx:26` |
| 6 | **K8** — `EnrichmentStatusDots` rollout + pulse on in-progress | significant | A | `ui/enrichment-status-dots.tsx:20-33`, 2 consumers |
| 7 | Native `<select>` → themed `Select` primitive (users/new, reports-table, report-detail, invite-dialog) | significant | M | 4 files |
| 8 | Wrap "Remove member" in `<Confirmation>` with user-name echo | significant | M | `team-member-actions.tsx:128-156` |
| 9 | **K5** — Toast + Tooltip + DropdownMenu restyle to `--bg-floating-elevated` | significant | M | 3 primitive files |
| 10 | **K9** — `src/app/not-found.tsx` | significant | M | new file |
| 11 | Thread `canEdit` through BulkActionsBar + ProspectSlideOver + ListGrid + PersonaCardGrid + Notes (Assistant role sees 403s) | significant | M | 5 files |
| 12 | Confirm destructive SystemActions + mock-mode flip (prevents credit footguns) | significant | M | `admin/system-actions.tsx:127-190`, `api-keys/integration-card.tsx:54-74` |
| 13 | Fix fake `setTimeout(2000)` re-enrich spinner → Supabase Realtime | significant | A | `list-member-table.tsx:182` |
| 14 | **K6** — Input/Textarea/Select focus → `var(--gold-bg-strong)` | significant | M | 3 primitives |
| 15 | **K3** — mount `<TooltipProvider>` at root | medium | M | `src/app/layout.tsx` |
| 16 | **K7** — Badge/Button gold variants → token-based | significant | M | `ui/badge.tsx`, `ui/button.tsx` |
| 17 | Login: handle `?message=password_reset_success` banner | medium | M | `login/page.tsx:26-101` |
| 18 | `<Loader2>` spinners on login/reset/forgot submit buttons | medium | I | 3 files |
| 19 | Team page: parallelize N+1 `admin.auth.admin.getUserById` loop | quick-win | M | `team/page.tsx:62-68` |
| 20 | Verify `/onboarding/set-password` orphan (duplicates confirm-tenant; may be dead after invite rewrite) | medium | M | `onboarding/set-password/page.tsx:68-124` |
| 21 | EmptyState primitive rollout: 7+ raw "No results" sites → `<EmptyState>` | medium | M | see 01 + 05 + 03 details |
| 22 | Add bulk selection + actions bar to list-member-table (500-member lists unusable today) | significant | M | `list-member-table.tsx:186` |
| 23 | Add `loading.tsx` to `/search`, `/personas`, `/prospects/[id]`, `/settings`, `/team` | medium | A | 5 new files |
| 24 | **K10** — Checkbox + Table selected-row state → gold | quick-win | I | `ui/checkbox.tsx:16`, `ui/table.tsx:61` |
| 25 | Resolve user UUIDs → names in activity log + analytics user breakdown | medium | M | `activity-log-viewer.tsx:173`, `dashboard/analytics/page.tsx:214` |

---

## Systemic themes

These are patterns that recurred across audits — worth batching into single PRs rather than one-off fixes.

### T1 — Destructive-action safety (6 surfaces, zero confirmations)
Every confirmed destructive action should route through the existing `<Confirmation isDestructive>` primitive. Current state:
- `confirm()` native browser dialog: search dismiss, list delete, list member remove
- No dialog at all: persona delete, SystemActions, mock-mode flip, API-key rotation
- Inline-text confirm only: "Remove member" in team-member-actions

### T2 — Assistant (read-only) role gating is absent on the write surface
Grep across `src/app/[orgId]/search/*` and `src/app/[orgId]/lists/*` returned zero role checks. Assistants see every write button; they 403 on click. Fix by threading `canEdit` through BulkActionsBar, ProspectSlideOver, ListGrid, PersonaCardGrid, and Notes textarea — with a `<Tooltip>` explaining why it's disabled.

### T3 — Tenant-theme leakage from hard-coded `#d4af37`
`tenant-theme.ts:52-57` rewrites the `--gold-*` CSS variables when a tenant picks sapphire/emerald. But 9 primitive files use hard-coded `rgba(212,175,55,*)` hex, so those tenants still render gold buttons/badges/focus rings. Find-and-replace to `var(--gold-primary)` / `var(--gold-bg-strong)` across: Button, Badge, Input, Textarea, Select, Checkbox, Confirmation (icon), plus two consumers.

### T4 — Floating surfaces still read as shadcn-default
Toast, Tooltip, DropdownMenu, and Dialog overlay all use generic Radix/shadcn neutrals. The product has `--bg-floating` and `--bg-floating-elevated` tokens defined but the primitives don't consume them. Single sweep across the three primitives closes this.

### T5 — Loading shape mismatch
- Admin `loading.tsx` is a generic dashboard skeleton shown for every route, regardless of shape.
- Tenant side has no per-route `loading.tsx` for `/search`, `/personas`, `/prospects/[id]`, `/settings`, `/team`.
- Two fake `setTimeout` spinners (list-member-table re-enrich, one more in search) lie to users about state — Realtime subscription pattern already exists in `profile-view.tsx:243-261` to copy from.

### T6 — "Generic SaaS" tells showing through the luxury veneer
- UUID-slice user IDs visible in activity log + analytics (`a1b2c3d4...`)
- Schema-string role labels visible in team table (`tenant_admin` instead of "Tenant Admin")
- `text-muted-foreground` (resolves ~40%) used for prospect-detail timestamps/metadata; should be `--text-secondary-ds` (~55%)
- Inline `onFocus/onBlur` JS handlers duplicated across onboarding + settings (~120 lines) instead of using the `<Input>` primitive that already has the gold halo
- `SheetTitle` uses DM Sans while `DialogTitle` uses Cormorant — one-line fix in `sheet.tsx:111`

---

## Severity mix

Rough aggregate across all five files:

| Severity | Count |
|---|---|
| significant | ~45 |
| medium | ~90 |
| quick-win | ~95 |
| already-polished callouts | 12 |

**Already-solid callouts** worth not disturbing: `Card`, `EmptyState`, `Skeleton`, `Label`, `DataTablePagination`, `ThemePicker`, `CardTitle`, `DialogTitle`, command palette UX + kbd hints, tenant + admin `page-enter` fadeIn, mobile bottom sheet drag-handle, admin nav unread-reports badge, touch-safe-area handling, exports page, persona library layout.

---

## Suggested shipping order

1. **PR 1: Keystone primitives** (K1–K10) — one day of work, silently upgrades every downstream screen. Merge this before any per-screen polish so the cascade reduces downstream work.
2. **PR 2: Destructive-action safety sweep** (T1) — 6 surfaces onto `<Confirmation>` primitive.
3. **PR 3: Assistant read-only gating** (T2) — prop plumbing across 5 files.
4. **PR 4: Tenant-theme leak fix** (T3) — find-replace hex → CSS vars in 9 primitives.
5. **PR 5–N: Per-screen polish** — work through the five detail files in any order, they're independent.
