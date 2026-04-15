# Phase 41: Tutorial & Onboarding Flows — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** Explore recon with full schema verification (learned from Phase 40 schema-mismatch incident)

<domain>
## Phase Boundary

Ship the first-run experience for real estate agents — Adrian's 2026-04-13 call quote: *"they don't want to spend time understanding crazy interfaces and tools."* Scope is six deliverables per ROADMAP entry, narrowed where recon showed existing infrastructure to reuse.

**Fully new:** product tour engine, tour content (tenant + admin flows), Help button in top bar, overview-video embed, replay-tour entry in settings, admin onboarding checklist, progress persistence.

**Reuse (no re-invention):** existing `EmptyState` primitive already supports CTA via `children` prop — extend content in current 26 usage sites; existing `user.app_metadata.onboarding_completed` flag already drives middleware redirects (we add tour trigger on top, do not replace); existing `ReportIssueButton` remains context-specific — Help button is a new, separate affordance.

**Out of scope:** translating the app, any i18n work, accessibility overhaul beyond keyboard-nav on the tour, mobile-specific tour alternative (mobile users see the same tour — responsive, but not redesigned).

</domain>

<decisions>
## Implementation Decisions

### Tour library choice (LOCKED — hand-roll, not react-joyride)
- No tour library is installed today. Recon confirmed `package.json` has neither `react-joyride`, `driver.js`, nor `shepherd.js`.
- **Decision: hand-roll using the existing shadcn Tooltip/Popover primitives** (both are already `@radix-ui/react-popover`/`react-tooltip` based). Memory confirms `@floating-ui` is a transitive dep via Radix.
- **Why not a library:** (a) 12–50KB gzipped of dead weight for ~6 tour steps, (b) tour content is hard-coded in CONTEXT anyway, (c) our design system's dark luxury styling doesn't match any library's defaults without heavy CSS overrides — we'd end up rewriting their theme layer.
- Tour is a `<ProductTour>` client component rendered once at the top of the layout for tenant pages. Reads current step from Zustand-style local store or simple `useState` in a context provider; advances on user click of Next/Skip/Done buttons inside each step's popover.

### Progress persistence (LOCKED — auth.users.app_metadata, NOT a new DB column)
- The `users` public table does NOT have a `setup_progress` or `onboarding_state` column today (confirmed via `src/types/database.ts:18-28`).
- The `tenants` table lives in the Supabase dashboard, not migrations — cannot verify its columns from code alone, per memory note.
- **Decision: store tour + checklist progress in `auth.users.app_metadata` under a new key `onboarding_state`.** Shape:
  ```ts
  onboarding_state: {
    tour_completed: boolean;
    tour_skipped_at?: string;  // ISO
    admin_checklist: {
      invite_team: boolean;
      upload_logo: boolean;
      pick_theme: boolean;
      create_first_persona: boolean;
    };
  }
  ```
- Why app_metadata: (a) server-trusted and client-readable, (b) same surface as existing `onboarding_completed` flag, (c) zero migrations required, (d) reads don't need a round-trip — it's on the session JWT.
- Writes happen via a new Server Action `updateOnboardingState(partial)` that calls `admin.auth.updateUser(userId, { app_metadata: { ... }})` with service-role client. Same pattern as `onboarding.ts:111-119`.

### Tour trigger (LOCKED)
- On mount of `src/app/[orgId]/layout.tsx`, check `user.app_metadata.onboarding_state?.tour_completed`. If falsy AND `onboarding_completed` is true (user finished password/tenant setup), render `<ProductTour>`.
- Tour CANNOT overlap the existing `/onboarding/*` routes — those are pre-tour. Sequence is: password set → tenant confirm → redirect into `/[orgId]/` → tour fires on first render.
- User can dismiss via Skip button; sets `tour_skipped_at`; does NOT re-fire until "Replay tour" in settings.

### Help button (LOCKED — top-bar right flexbox)
- Insert a `<HelpMenu>` component in `src/components/layout/top-bar.tsx:27` BEFORE the existing settings avatar link.
- `<HelpMenu>` is a `DropdownMenu` (shadcn) with three items:
  1. "Watch intro video" → opens a `Dialog` embedding a Loom or self-hosted MP4
  2. "Replay product tour" → writes `tour_completed: false` to app_metadata and re-renders `<ProductTour>` from step 1
  3. "Report an issue" → delegates to the existing `ReportIssueButton` trigger (reuse, do not duplicate)
- Icon: `CircleHelp` from lucide-react.

### Tour content (LOCKED — tenant flow)
6 steps on the core value journey. Each step is an object `{ target: CSS selector or ref, title, body, placement }`:
1. **Discover** — point at the New Search card on dashboard/search page
2. **New Search** — after click, highlight the NL search bar + advanced filters toggle
3. **Enrich Selection** — after search returns, highlight the bulk action bar's "Enrich Selection" button
4. **List** — after enrichment fires, point at the list-member table with the live enrichment pills (Phase 40 payoff)
5. **Prospect Profile** — click into one row, highlight the profile's enrichment sources + AI summary
6. **Export CSV** — highlight the export button in the list toolbar

Selectors: use `data-tour-id="..."` attributes added sparingly to the target elements. Do NOT rely on class names or structural selectors — those break on refactor.

### Admin onboarding checklist (LOCKED — tenant admin only)
- New `<AdminOnboardingChecklist>` component rendered on the tenant admin dashboard when `onboarding_state.admin_checklist` has any `false` item.
- Progress bar shows `completed / total` (integer counts).
- 4 checklist items map to 4 existing user actions; we observe them:
  - `invite_team` → flips true when `createInvite` action succeeds for the first time
  - `upload_logo` → flips true when tenant's `logo_url` becomes non-null
  - `pick_theme` → flips true when tenant's `theme` differs from default `'gold'` (or explicitly set via ThemePicker)
  - `create_first_persona` → flips true when `createPersonaAction` succeeds for this tenant for the first time
- Each checklist item has a deep-link CTA to its relevant page.
- **Write path:** each observation trigger calls `updateOnboardingState({ admin_checklist: { <key>: true } })` server-side. Idempotent.

### Empty-state tutorials (LOCKED — extend existing EmptyState usages)
- Add CTA children to 4 specific empty states:
  - **Dashboard** (src/app/[orgId]/page.tsx) — when no personas: "Create your first saved search → / " CTA
  - **Lists** (lists-page-client.tsx) — when no lists: "Create your first list" CTA (already CTA'd lightly — tighten copy + add "why" tooltip)
  - **Personas** (personas/page.tsx) — when no personas: "Create your first saved search" CTA
  - **Activity** (activity-log-viewer.tsx) — when no activity: "Complete your first search to see activity here" CTA
- Copy should be real-estate-agent-friendly, not technical. No jargon like "persona" without a tooltip explaining it means "saved search."

### Video embed (LOCKED — deferred content, shippable shell)
- Ship the `Dialog` + video shell with a placeholder URL (e.g., TODO comment pointing to `PGL_INTRO_VIDEO_URL` env var).
- User records the actual 2–3 min Loom post-deploy and sets the env var on Vercel.
- Do NOT block Phase 41 on video content. Plan flags it as a "post-phase action item."

### Tooltip inline help (LOCKED — 4 surfaces only, not every control)
- Add explanatory tooltips (using existing shadcn Tooltip primitive) to exactly these 4 dense controls:
  1. Advanced Filters toggle (search page)
  2. Enrichment status dots (prospect slide-over + profile view)
  3. Bulk actions bar (search results)
  4. Wealth tier badges (result cards)
- Each tooltip is 1–2 sentences max. No walls of text.

### Replay tour (LOCKED)
- "Replay product tour" lives in the Help menu (see Help button decision).
- No separate settings page entry. Reduces surface area.

### Claude's Discretion
- Tour popover exact styling — planner picks from existing Popover variants; must respect dark luxury + gold accents.
- Whether to store tour progress per-tour-step (resume mid-tour) or all-or-nothing — default to all-or-nothing for scope; resume-mid-tour is overkill for 6 steps.
- Admin checklist collapse behavior when complete — either disappears entirely or shows a "Setup complete ✓" celebration card for 24h. Planner picks.
- Tour analytics (did the user skip vs complete?) — capture tour_skipped_at or tour_completed_at and move on. No separate analytics event.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Recon-verified source of truth
- `src/components/ui/empty-state.tsx` — EmptyState primitive (children prop = CTA slot, line 60)
- `src/components/layout/top-bar.tsx` — top bar where Help button slots in (line 27 right flexbox)
- `src/app/actions/onboarding.ts` — existing onboarding Server Action (lines 111-119 show `app_metadata` update pattern)
- `src/middleware.ts:47-63` — existing first-login redirect logic (we extend, do not replace)
- `src/components/auth/session-guard.tsx` — current auth state handling
- `src/types/database.ts:6-28` — Tenant + User TypeScript shapes
- `src/components/issues/report-issue-button.tsx` — existing help-adjacent component (reuse trigger from Help menu)

### Tour targets — pages to add `data-tour-id` attributes to
- `src/app/[orgId]/page.tsx` (dashboard)
- `src/app/[orgId]/search/components/nl-search-bar.tsx` (or wherever the NL input lives)
- `src/app/[orgId]/search/components/advanced-filters-panel.tsx`
- `src/app/[orgId]/search/components/bulk-actions-bar.tsx`
- `src/app/[orgId]/lists/components/list-member-table.tsx`
- `src/components/prospect/profile-view.tsx`
- List toolbar export button (find via grep for `exportCsv` or `Download` icon in list page)

### Empty-state extension targets
- `src/app/[orgId]/page.tsx` — dashboard empty slots
- `src/app/[orgId]/lists/components/lists-page-client.tsx`
- `src/app/[orgId]/personas/page.tsx`
- `src/components/activity/activity-log-viewer.tsx`

### Supabase admin SDK pattern
- See `src/app/actions/onboarding.ts:36` for service-role `auth.admin.updateUser` pattern — mirror for new `updateOnboardingState` action.

### Design system
- `src/components/ui/dropdown-menu.tsx` (Help menu base)
- `src/components/ui/dialog.tsx` (video embed modal)
- `src/components/ui/popover.tsx` (tour step popovers)
- `src/components/ui/tooltip.tsx` (inline help tooltips)
- Memory: Dialog/Sheet backdrop-blur from Phase 39-08

</canonical_refs>

<specifics>
## Specific Ideas

**Tour state shape (client-side):**
```ts
// src/lib/onboarding/tour-state.ts
export type TourStepId = 'discover' | 'search' | 'enrich' | 'list' | 'profile' | 'export';
export interface TourState {
  active: boolean;
  currentStep: TourStepId | null;
  completedSteps: TourStepId[];
}
```

**Server action for persistence:**
```ts
// src/app/actions/onboarding-state.ts
export async function updateOnboardingState(
  partial: Partial<OnboardingState>
): Promise<{ ok: true } | { ok: false; error: string }>;
```

**Help menu component:**
- File: `src/components/layout/help-menu.tsx`
- Props: `{ userId: string; tenantId: string }`
- Internally uses existing DropdownMenu + Dialog primitives.

**Admin checklist shape:**
```ts
// Derived from auth.users.app_metadata + tenant/persona queries
interface AdminChecklistItem {
  key: 'invite_team' | 'upload_logo' | 'pick_theme' | 'create_first_persona';
  label: string;
  complete: boolean;
  ctaHref: string;
}
```

**Progress bar:**
- Use existing `src/components/ui/progress.tsx` if present, else inline with Tailwind classes.

</specifics>

<deferred>
## Deferred Ideas

### Not shipping in Phase 41
- **Interactive in-tour actions** (e.g., "click here to create a list for real") — tour is observational; user clicks real UI after tour ends. No fake-click simulations.
- **Per-role tour variants** — one tour for everyone. Role gating handled by which UI elements are visible (Assistant sees fewer, tour skips missing targets gracefully).
- **Tour on mobile as a separate design** — use same tour with responsive popovers.
- **Analytics dashboard for tour completion rates** — just capture timestamps in app_metadata, query later if needed.
- **A/B testing different tour scripts** — ship one script, iterate post-Maggie feedback.
- **Translations / i18n** — English-only.

### Post-Phase-41 action items (user owns)
- Record the 2–3 min overview video (Loom)
- Set `PGL_INTRO_VIDEO_URL` env var on Vercel
- Walk the tour in staging as a fresh user before Maggie sees it

### Not in 41 OR a future phase
- Onboarding emails (e.g., "finish your setup" drip sequence) — out of scope entirely.
- Zendesk / Intercom / external chat integration — not a Phase 41 concern.

</deferred>

---

*Phase: 41-tutorial-onboarding-flows*
*Context gathered: 2026-04-15 — schema recon completed (learning from Phase 40 schema-mismatch). No DB migrations required; all state in auth.users.app_metadata.*
