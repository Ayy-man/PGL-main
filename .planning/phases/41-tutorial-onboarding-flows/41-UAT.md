# Phase 41 — Manual User Acceptance Testing (UAT)

**Purpose:** Human reviewer walks through every user-facing surface Phase 41 introduced
in a real browser (Vercel preview or `localhost:3000`) and marks each step Pass / Fail
with notes. This is the gate that blocks Phase 41 from being declared shipped.

**Target reviewer:** A tenant admin or agent account in a non-production tenant. The
prep section walks you through setting up a fresh test user.

**Time required:** ~25–30 minutes for a clean run. Double that if you hit failures and
need to capture reproduction notes.

**Where to run:** Either `pgl-main.vercel.app` (preview / prod deploy) or a local
`pnpm dev` (or `npm run dev`) against the same Supabase project. The Vercel path is
preferred because `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` (Plan 03) is only meaningful after
deploy.

---

## 1. Prep (do once before starting)

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 1.1 | In Supabase Dashboard → Authentication → Users, pick or create a test user in the tenant you want to use. | User row visible. | | |
| 1.2 | Open the user's JSON (⋮ → "View user") and **remove the `onboarding_state` key from `app_metadata`** entirely (leave `tenant_id`, `role`, and `onboarding_completed` in place). | `app_metadata` now lacks `onboarding_state`. | | |
| 1.3 | Confirm `app_metadata.onboarding_completed === true` for this user so the `/onboarding/*` pre-tour password/tenant flow is bypassed. If it's `false`, set it to `true`. | `onboarding_completed: true` visible in JSON. | | |
| 1.4 | If testing the admin checklist (section 4), confirm `app_metadata.role === "tenant_admin"`. For the non-admin section (5), use a second user with `role === "agent"`. | Both users ready. | | |
| 1.5 | Log out any existing browser session. Log in as the test user. | Redirects to `/{orgId}/` dashboard. | | |

If any of 1.1–1.5 fails: stop. The UAT can't proceed without a fresh user.

---

## 2. First-run tour (Plan 41-02)

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 2.1 | On the first dashboard render after login, a coachmark popover appears. | Popover is visible anchored to the "Download New List" / Discover card (gold Button on the dashboard) and the rest of the page is still interactive. | | |
| 2.2 | Step counter reads "Step 1 of 6" or equivalent. | Copy: "Start here: Discover leads" (or similar — see TOUR_STEPS array). | | |
| 2.3 | Click **Next**. | Popover re-anchors on the search page's NL input (`data-tour-id="nl-search-bar"`). Navigation handled by the tour OR by you clicking the CTA — either works. | | |
| 2.4 | Click **Next** again. | Popover re-anchors on the advanced-filters toggle (`data-tour-id="advanced-filters-toggle"`). | | |
| 2.5 | Click **Next**. | Popover re-anchors on the bulk-actions bar (`data-tour-id="bulk-actions-bar"`) — may require running a search first so the bar renders. | | |
| 2.6 | Click **Next**. | Popover re-anchors on the list-member table (`data-tour-id="list-member-table"`) — may require opening any list. | | |
| 2.7 | Click **Next**. | Popover re-anchors on the Enrichment Status card in a prospect profile (`data-tour-id="profile-summary"`) — may require clicking into any prospect. | | |
| 2.8 | Click **Next**. | Popover re-anchors on the per-list Export button (`data-tour-id="export-csv"`) on the lists page. | | |
| 2.9 | Click **Done**. | Popover closes. Refresh the page. Tour does **not** re-appear. | | |
| 2.10 | In Supabase Dashboard, set the user's `app_metadata.onboarding_state.tour_completed = false`. Log out and back in. | Tour fires again starting from the first present step. | | |
| 2.11 | Press **Escape** mid-tour (any step). | Popover closes (skip-equivalent). Refresh — tour does **not** re-fire (`tour_skipped_at` recorded). | | |
| 2.12 | Reset `tour_completed = false` again. Log in as an agent (or a role whose menu lacks `/team`). Navigate to a page where one of the named tour targets is absent. | Tour either advances gracefully to the next present step (via `nextPresentTourStep`) OR renders the fallback bottom-right card — **not** a blank popover hovering at 0,0. | | |

---

## 3. Help menu (Plan 41-03)

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 3.1 | On any tenant page, locate the top bar. | `CircleHelp` icon Button visible, sized to match the settings avatar (`h-8 w-8`), positioned before the avatar link. | | |
| 3.2 | Click the Help icon. | Dropdown opens with three items, in order: 1) Watch intro video, 2) Replay product tour, 3) Report an issue. | | |
| 3.3 | Click **Watch intro video** with `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` **unset** on the current environment. | Dialog opens showing the fallback: "Video coming soon — check back after the demo." (or similar copy per `help-menu.tsx`). | | |
| 3.4 | Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` on Vercel (Production or Preview) to a Loom or YouTube URL. Redeploy. Return to this page. Click Watch intro video. | Dialog opens with an `<iframe>` (Loom/YouTube/Vimeo) OR `<video>` (direct .mp4/.webm/.mov) embed rendering the URL. | | |
| 3.5 | Click **Replay product tour**. | Label briefly swaps to "Resetting…" while `updateOnboardingState({ tour_completed: false })` fires, then the page refreshes and the tour fires from the first present step. | | |
| 3.6 | Click **Report an issue**. | Label briefly swaps to "Capturing page…" while `captureScreenshot()` resolves, then the existing `<ReportIssueDialog>` opens with a pre-captured screenshot attached. | | |
| 3.7 | Inside the Report dialog, fill in a test report and submit. | Existing POST `/api/issues/report` fires; the dialog's own success state appears. No new report flow introduced by Phase 41. | | |
| 3.8 | Double-click the Watch-intro-video item or Report-an-issue item rapidly. | No stacked dialogs / flicker — the `disabled` state blocks the second click until the first resolves. | | |

---

## 4. Admin checklist — as `tenant_admin` (Plan 41-04)

For this section, be signed in as a user with `app_metadata.role === "tenant_admin"`
whose `admin_checklist` in `onboarding_state` is all-false (or absent).

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 4.1 | Navigate to the tenant dashboard (`/{orgId}/`). | `AdminOnboardingChecklist` card visible with the progress bar at **0 of 4** and 4 items: Invite your team, Upload your logo, Pick your theme, Create your first saved search. | | |
| 4.2 | Click the "Invite your team" deep link. Invite a teammate via the standard invite flow. | Invite submits successfully. Reload the dashboard. Item 1 ticks off; progress bar reads **1 of 4**. | | |
| 4.3 | Click the "Upload your logo" deep link (Settings → Organization). Upload any PNG/JPG. | Upload succeeds (logo preview updates). Reload the dashboard. Item 2 ticks off; progress bar reads **2 of 4**. | | |
| 4.4 | Navigate to the theme picker (Settings → Branding or equivalent). Change theme away from the default `gold` (e.g., `slate`, `emerald`, any non-gold option). Save. | Save succeeds. Reload the dashboard. Item 3 ticks off; progress bar reads **3 of 4**. | | |
| 4.5 | Navigate to Personas → Create a persona (saved search). Use the existing create flow and save. | Persona creates successfully. Reload the dashboard. Item 4 ticks off. | | |
| 4.6 | After all 4 items are complete, reload the dashboard. | Checklist card **disappears entirely**. No celebration row lingers (per CONTEXT decision). | | |
| 4.7 | Self-healing spot-check: in Supabase Dashboard, reset `admin_checklist.upload_logo = false` on the user's `app_metadata` but keep `tenants.logo_url` populated. Reload. | Checklist card stays hidden (item 2 self-heals from the observed `tenants.logo_url`). | | |

---

## 5. Non-admin role — as `agent` (Plan 41-04 role gate)

Switch to the second test user whose `role === "agent"` and who has a fresh (empty)
`onboarding_state`.

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 5.1 | Log in as the agent user. Land on `/{orgId}/`. | No `AdminOnboardingChecklist` card anywhere on the dashboard. | | |
| 5.2 | Product tour still fires on first login for the agent (tour is global, checklist is admin-only). | Popover appears on step 1 as in section 2. | | |
| 5.3 | Help menu still visible in the top bar (global affordance). | CircleHelp icon present; dropdown works identically to section 3. | | |

---

## 6. Empty states (Plan 41-05 + Plan 04 dashboard)

Use a fresh tenant (or one with no personas, no lists, no activity — easiest to spin up
a new tenant for this). Sign in as any user for that tenant.

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 6.1 | Dashboard with zero personas. | `EmptyState` shows "Welcome — create your first saved search" (or similar title) + a body explaining saved searches + a CTA button "New saved search" linking to `/{orgId}/personas`. | | |
| 6.2 | Navigate to `/{orgId}/lists` with zero lists. | `EmptyState` shows a "Create your first list" title + body + the existing `CreateListDialog` trigger (same behavior as the header button). | | |
| 6.3 | Navigate to `/{orgId}/personas` with zero personas. | `EmptyState` shows "Create your first saved search" + CTA button routing to `/{orgId}/search` (not back to `/personas`). Copy uses "saved search" — **not** the word "persona" in isolation. | | |
| 6.4 | Navigate to the Activity tab / page with zero rows. | `EmptyState` shows "Start a search" (or "Complete your first search to see activity here") + CTA button linking to `/{orgId}/search`. | | |
| 6.5 | Agent-friendly copy spot-check: read each of the 4 empty-state bodies above. | No jargon like "persona" used without the phrase "saved search" nearby. No words like "enrichment pipeline" or "Apollo" in the copy. | | |

---

## 7. Inline tooltips (Plan 41-05)

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 7.1 | On the search page, hover the **Advanced Filters** toggle (the button that opens the filter drawer). | Tooltip appears: "Narrow results by industry, title, location, wealth tier, and more." (or similar 1-sentence copy). | | |
| 7.2 | Run a search, select at least one prospect, then hover the **Enrich Selection** button in the bulk actions bar (enabled state, not the disabled assistant-role state). | Tooltip appears explaining credit cost and what enrichment fetches (email, phone, wealth signals, news). | | |
| 7.3 | Open any prospect profile. Hover each enrichment status dot — there are 5 sources: ContactOut, Exa, SEC, Market, Claude. | Each dot renders its own distinct tooltip (5 different 1-sentence copies). No generic "enrichment status" shared text. | | |
| 7.4 | Find a prospect card that has a wealth tier badge rendered (requires enriched data — may need to run an enrichment first). Hover the badge. | Tooltip appears: "Estimated net worth. Tier is derived from public filings, company ownership, and observed signals." (or similar). | | |
| 7.5 | Keyboard focus (Tab-to) each of the above 4 controls. | Tooltip shows on focus as well as hover — matches shadcn Tooltip default behavior. | | |

---

## 8. Regression (sanity check — make sure Phase 41 didn't break prior flows)

| # | Step | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| 8.1 | Invite a new user via `/team`. Have them click the magic link. | Existing `/onboarding/confirm-tenant` + `/onboarding/set-password` routes still work. Tenant confirmed, password set, user lands on `/{orgId}/`. | | |
| 8.2 | Confirm that first-login flow after password set triggers the tour (for the new invitee). | Tour fires on their first dashboard render. (Tests the full sequence: invite → confirm → password → tour.) | | |
| 8.3 | In the top bar, click the settings avatar link. | Still navigates to `/{orgId}/settings` — no regression from the HelpMenu insertion. | | |
| 8.4 | On any prospect detail page, find and click the existing `ReportIssueButton` (not the Help-menu one). | Existing per-prospect report flow still fires as before. | | |
| 8.5 | Run a search, select prospects, click Enrich Selection. | Apollo bulk-enrich pipeline still works end-to-end. Phase 41 added a tooltip to the button; the button itself is unchanged. | | |
| 8.6 | Open DevTools → Network. Navigate around. | No unexpected calls to onboarding endpoints mid-render (reads are session-JWT-based, not fetch). Observer writes fire only after their triggering action (invite, logo upload, theme save, persona create). | | |

---

## Post-UAT failure handling

If any row above fails:

1. Capture a screenshot + the network log around the failure.
2. Note the row number (e.g., 2.3, 4.5) and the actual vs. expected behavior.
3. File the gap via `/gsd-plan-phase 41 --gaps` — the orchestrator will spawn a
   corrective plan rather than re-running this UAT from scratch.
4. Re-run **only** the affected section after the fix lands; sections that previously
   passed don't need to be re-walked unless the fix touched their code path.

If all rows pass:

1. Fill in the Sign-off block below.
2. Proceed to the post-phase action items (section below Sign-off).

---

## Sign-off

I have walked through sections 2–8 of this UAT checklist against a real browser
session. All rows marked Pass (or Fail with notes captured above). Phase 41 is approved
for release.

**Reviewer name:** `_______________________________________`

**Date (YYYY-MM-DD):** `_______________________________________`

**Environment:** (circle one) &nbsp;&nbsp; localhost:3000 &nbsp;/&nbsp; preview &nbsp;/&nbsp; production

**Test tenant / orgId:** `_______________________________________`

**Overall result:** (circle one) &nbsp;&nbsp; PASS &nbsp;/&nbsp; PASS-WITH-GAPS &nbsp;/&nbsp; FAIL

---

## Post-phase action items (user-owned, separate from UAT pass/fail)

These are carry-overs from `41-CONTEXT.md` `<deferred>` and the individual plan
summaries. They don't block UAT sign-off, but they need to happen before Maggie sees
the product:

- [ ] Record the 2–3 min Loom walkthrough (tenant admin's first-run experience).
- [ ] Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` in `.env.local` (local dev).
- [ ] Set `NEXT_PUBLIC_PGL_INTRO_VIDEO_URL` on Vercel (Production + Preview envs).
- [ ] Redeploy. Repeat row 3.4 above to confirm the iframe now renders (not the
  fallback copy).
- [ ] Walk the tour end-to-end in the staging environment as a genuinely fresh user
  (no saved `onboarding_state`, no personas, no lists) before the Maggie demo so the
  first impression matches what Maggie will see.
