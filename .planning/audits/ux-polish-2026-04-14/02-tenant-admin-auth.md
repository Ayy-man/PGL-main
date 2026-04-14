# Tenant Admin + Auth UX Polish Audit

Scope: auth (login/forgot/reset), onboarding (confirm-tenant/set-password), tenant team + settings + organization, suspended. Dark / gold / Cormorant Garamond primitives under `src/components/ui/`.

---

## /login — `src/app/(auth)/login/page.tsx`

### Finding: Generic error block, no auto-focus on email, no icon treatment
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/(auth)/login/page.tsx:152-157
- **Current**: `{error && (<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>)}`
- **Fix**: Prepend a `<AlertCircle className="h-4 w-4" />` and wrap in `flex items-start gap-2` — matches existing confirmation/toast language. Add `autoFocus` on the email `<Input>` (line 161) so the form is keyboard-ready the moment the page paints (luxury feel = no wasted click).

### Finding: Button label flicker — no spinner, text replaces itself ("Sign in" -> "Signing in...")
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/(auth)/login/page.tsx:205, 215
- **Current**: `{loading ? "Signing in..." : "Sign In"}`
- **Fix**: Reuse `Loader2` from lucide with `animate-spin`, keep the label stable: `{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Signing in" : "Sign in"}`. Prevents layout shift and feels like premium software.

### Finding: Custom inline-style themed button diverges from Button variants
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/(auth)/login/page.tsx:195-206
- **Current**: Raw `<button>` with inline `style={{ background: TENANT_THEMES[branding.theme].main ... }}` when tenant theme is not gold — no hover state, no active scale, no focus ring. Default variant has all of these baked in.
- **Fix**: Use `<Button>` with inline style override ONLY for the background. Reuse CVA for radii/transition/active-scale: `<Button type="submit" disabled={loading} size="lg" className="w-full text-white" style={{ background: TENANT_THEMES[branding.theme].main }}>...`. Restores hover + `active:scale-[0.97]` parity with gold theme.

### Finding: Password field has no "show/hide eye" toggle
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/(auth)/login/page.tsx:183-192
- **Current**: Plain `<Input type="password" />`.
- **Fix**: Wrap in a relative container, add an `<Eye/EyeOff>` icon button right-aligned that toggles type between `password` and `text`. Reduces mistyped password frustration, expected in modern SaaS.

### Finding: Branding "N" fallback avatar — brittle gradient string, no subtle entrance
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/(auth)/login/page.tsx:106-134
- **Current**: Appears instantly once fetch completes; no transition from default PGL mark -> tenant mark.
- **Fix**: Wrap the branding block in `transition-opacity duration-300` and gate opacity on `branding !== null` so the swap fades in rather than hard-pops. If branding fetch fails silently, users never see a jarring flash.

### Finding: No `message=password_reset_success` handling despite reset page redirecting there
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/(auth)/login/page.tsx:26-101
- **Current**: `reset-password/page.tsx:79` does `router.push("/login?message=password_reset_success")` but LoginForm never reads `searchParams.get("message")`.
- **Fix**: Add a `const message = searchParams.get("message")` and render a success banner above the error slot: `{message === "password_reset_success" && <div className="rounded-lg bg-[var(--success-muted)] border border-[var(--success)]/20 px-4 py-3 text-sm text-[var(--success)]">Password updated. Sign in with your new password.</div>}`. Broken promise today.

---

## /forgot-password — `src/app/(auth)/forgot-password/page.tsx`

### Finding: No button spinner, label flicker
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/(auth)/forgot-password/page.tsx:125
- **Current**: `{loading ? "Sending..." : "Send Reset Link"}`
- **Fix**: Same pattern as login: `<Loader2 className="h-4 w-4 animate-spin" />` + fixed label. Keep layout stable.

### Finding: Success state is plain text — missing celebratory icon / luxury confirmation pattern
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/(auth)/forgot-password/page.tsx:44-77
- **Current**: Just H1 + paragraph + border-card note.
- **Fix**: Prepend a gold-tinted check icon circle mirroring the pattern in `empty-state.tsx`: `<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--gold-bg)" }}><Mail className="h-6 w-6" style={{ color: "var(--gold-primary)" }} /></div>`. Signals "we did the thing" in a way that feels intentional.

### Finding: "try again" is a bare `<button>` with no hover underline, no focus ring
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/(auth)/forgot-password/page.tsx:59-67
- **Current**: `<button onClick={...} className="text-gold hover:underline">try again</button>`
- **Fix**: Add `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40 rounded underline-offset-2 transition-colors` — matches the `/login` forgot-password link style for consistency.

---

## /reset-password — `src/app/(auth)/reset-password/page.tsx`

### Finding: Verifying state uses bare spinner div, not existing Loader primitive
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/(auth)/reset-password/page.tsx:98-100
- **Current**: `<div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />`
- **Fix**: Swap for `<Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--gold-primary)" }} />` or the shared `<Loader>` primitive from `src/components/ui/loader.tsx`. Keeps motion language unified.

### Finding: No inline password match validation — user finds out on submit
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/(auth)/reset-password/page.tsx:144-156
- **Current**: "Passwords do not match" only surfaces post-submit at line 60.
- **Fix**: Show an inline hint under the confirm field the moment `confirmPassword.length > 0 && confirmPassword !== password`: `<p className="text-xs text-destructive">Passwords do not match</p>`. Also disable the submit button when mismatch is detected — prevents a round-trip of frustration.

### Finding: No password strength meter despite 8-char minimum being the only signal
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/(auth)/reset-password/page.tsx:131-141
- **Current**: Bare password input.
- **Fix**: Add a 3-segment strength bar below the field, colored with `var(--destructive)` / amber / `var(--success)` using existing theme vars, driven by length + mix heuristics. Positions PGL as serious about security without adding a new dep.

### Finding: No spinner on submit
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/(auth)/reset-password/page.tsx:165
- **Current**: `{loading ? "Updating..." : "Update Password"}`
- **Fix**: Prepend `<Loader2 className="h-4 w-4 animate-spin" />`.

---

## (auth) layout — `src/app/(auth)/layout.tsx`

### Finding: Brand panel has zero motion — reads as static
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/(auth)/layout.tsx:9-29
- **Current**: Three stacked blocks with no entrance.
- **Fix**: Wrap each of the three children (logo, headline, footer) in `motion.div` with staggered `opacity/translateY` fades, OR add a plain CSS `animate-in fade-in slide-in-from-bottom-2 duration-500` + delay classes. Very cheap, instantly feels considered.

### Finding: No ambient glow on auth pages — onboarding already has this
- **Tag**: [MICRO-ANIMATION]
- **Severity**: medium
- **File**: src/app/(auth)/layout.tsx:7
- **Current**: `<div className="flex min-h-screen bg-background">` — flat.
- **Fix**: Mirror `onboarding/layout.tsx:11-13` — inject `<div className="ambient-glow-top" /><div className="ambient-glow-bottom" />` behind the form panel. Auth is the very first surface a tenant admin sees; luxury parity with onboarding is essential.

### Finding: Brand panel headline and tagline missing luxury letter-spacing / leading treatment
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/(auth)/layout.tsx:15-25
- **Current**: `font-serif text-3xl font-bold leading-tight tracking-tight` — heavy, tight, generic editorial.
- **Fix**: Soften to `font-serif text-[34px] font-semibold leading-[1.15] tracking-[-0.01em]` and let the `<br/>` breathe more with `mt-1` on the gold span. Add `italic` accent to "Luxury Real Estate" or a thin gold underline beneath to earn the "luxury" positioning. Currently it reads as "SaaS for real estate", not "Wealth Intelligence."

---

## /onboarding/confirm-tenant — `src/app/onboarding/confirm-tenant/page.tsx`

### Finding: Duplicated inline `onFocus/onBlur` style muting across every input — should be CSS
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/onboarding/confirm-tenant/page.tsx:171-179, 206-214, 286-294, 325-333
- **Current**: Five fields each wire the same 8-line `onFocus/onBlur` handler manually. No focus ring transition, no keyboard-only focus distinction, risk of desync with theme vars.
- **Fix**: Drop to the existing `<Input>` primitive (which already has `focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]`) or — if custom styling is truly required — hoist the focus ring into a single class in `globals.css`: `.input-gold-focus:focus-visible { border-color: var(--gold-primary); box-shadow: 0 0 0 2px rgba(212,175,55,0.25); }`. Removes ~80 lines, guarantees consistency.

### Finding: No slug auto-generation from org name
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/onboarding/confirm-tenant/page.tsx:44-47, 192-215
- **Current**: Name and slug are independent inputs; user types both.
- **Fix**: While `slug` remains untouched by the user, auto-fill from name: `useEffect(() => { if (!slugTouched) setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }, [name, slugTouched])`. Show a subtle "auto" pill beside the label until user edits slug. Saves time on the very first screen.

### Finding: Slug field lacks URL preview context
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/onboarding/confirm-tenant/page.tsx:192-219
- **Current**: Bare input + "Lowercase letters, numbers, and hyphens only" helper.
- **Fix**: Mirror `organization/page.tsx:131` behavior: show `app.pgl.com/<strong>{slug || "your-org"}</strong>` as the helper line. First-run user knows exactly what they're configuring.

### Finding: No inline password-match validation (same bug as reset-password)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/onboarding/confirm-tenant/page.tsx:301-335
- **Current**: Mismatch only caught server-side after submit.
- **Fix**: Inline red hint + disable submit when `confirmPassword && confirmPassword !== password`.

### Finding: Submit button uses bare native `<button>` with `transition-opacity` only — no active scale, no spinner
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/onboarding/confirm-tenant/page.tsx:338-349
- **Current**: Custom button recreates `variant="gold"` but drops `active:scale-[0.97]`, focus ring, spinner.
- **Fix**: `<Button type="submit" disabled={submitting} variant="gold" size="lg" className="w-full mt-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Confirming" : "Confirm & Get Started"}</Button>`.

### Finding: Loading skeleton is hand-rolled, bypasses `<Skeleton>` primitive
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/onboarding/confirm-tenant/page.tsx:88-117
- **Current**: `animate-pulse` divs with inline rgba backgrounds.
- **Fix**: Replace with existing `<Skeleton className="h-8 w-40" />` — it already uses `shimmer-skeleton` class for a gold-tinted shimmer sweep (see `src/components/ui/skeleton.tsx:9`). Onboarding skeleton should feel more premium than a flat grey pulse.

### Finding: Fetch-error state dead-ends with no recovery path
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/onboarding/confirm-tenant/page.tsx:120-126
- **Current**: `<p className="text-sm text-destructive">{fetchError}</p>` — no retry button, no support link.
- **Fix**: Use `<EmptyState variant="error" icon={AlertCircle} title="Couldn't load your organization" description={fetchError}><Button variant="gold" size="sm" onClick={() => window.location.reload()}>Try again</Button></EmptyState>`.

### Finding: No unsaved-changes warning when user navigates away mid-form
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/onboarding/confirm-tenant/page.tsx:17-55
- **Current**: Dirty state unwarned.
- **Fix**: Add `useEffect(() => { const handler = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty])`. Critical on a first-impression screen where losing data reads as "broken product".

---

## /onboarding/set-password — `src/app/onboarding/set-password/page.tsx`

### Finding: Dead route — duplicates password-setting already done in `/onboarding/confirm-tenant`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: src/app/onboarding/set-password/page.tsx:1-127
- **Current**: Entire page exists. `confirm-tenant/page.tsx:262-335` also collects `password` + `confirm_password`. `grep` shows only `src/app/api/auth/callback/route.ts` links to it. Meanwhile the recent commits (`8b68a28`, `2f4c25d`) rewrote the invite flow so that invited users land on the Supabase invite redirect, not on a separate "set password" screen.
- **Fix**: Verify against `inviteTeamMember` / `confirmTenantOnboarding` actions. If this route is orphaned (no callback lands here post-rewrite), delete it. If still used for agent/assistant first-login, it is missing: the luxury auth shell, the ambient glow, the org logo, and it uses the raw `<Button>` instead of `variant="gold-solid"` (line 115-122) — the screen feels like dev-default shadcn versus the polished `confirm-tenant`. Either delete or bring to parity with the brand panel treatment.

### Finding: Lacks auth-layout brand panel treatment — inconsistent onboarding experience
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/onboarding/set-password/page.tsx:68-124
- **Current**: Plain centered card. No tenant logo, no "Welcome to {orgName}" hero typography treatment, no gold accent framing.
- **Fix**: If kept, wrap contents in the same two-panel layout as `(auth)/layout.tsx` OR at least add the ambient glow divs + a logo block fetched from tenant. Pair with onboarding's `surface-card rounded-[14px]` style so both onboarding routes feel like siblings.

### Finding: Submit button uses arbitrary brand color classes instead of `variant="gold-solid"`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/onboarding/set-password/page.tsx:115-122
- **Current**: `<Button ... className="w-full bg-[var(--gold-primary)] text-black hover:bg-[var(--gold-bright)]">`
- **Fix**: Use the existing variant: `<Button type="submit" disabled={loading} variant="gold-solid" size="lg" className="w-full">`. Gets the gold glow shadow + active scale for free.

---

## /suspended — `src/app/suspended/page.tsx`

### Finding: Uses `bg-primary` — off-brand for luxury (reads as generic shadcn blue/purple)
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/suspended/page.tsx:44-49
- **Current**: `<button ... className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Sign Out</button>`
- **Fix**: Use `<Button variant="outline" size="lg" className="w-full">Sign Out</Button>`. Destructive state page should NOT use primary gold CTA treatment — outline/ghost matches the "this is a dead-end, contact admin" tone.

### Finding: No support-contact CTA — user stuck
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/suspended/page.tsx:37-41
- **Current**: Copy says "contact your administrator or support team" but no `mailto:` link.
- **Fix**: Add a `<a href="mailto:support@phronesis.dev" className="text-gold hover:underline text-sm">Contact support</a>` line below the sign-out button. Removes a dead-end.

### Finding: Generic SVG icon with inline path — inconsistent with lucide elsewhere
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/suspended/page.tsx:18-32
- **Current**: Hand-rolled warning SVG.
- **Fix**: `import { AlertOctagon } from "lucide-react"` + `<AlertOctagon className="h-8 w-8 text-destructive" />`. Matches the rest of the app.

### Finding: No entrance animation — dead-end page feels abrupt
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/suspended/page.tsx:16-17
- **Current**: `<div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-lg">`
- **Fix**: Add `animate-in fade-in zoom-in-95 duration-300` so the page doesn't snap in hard.

---

## /[orgId]/team — `src/app/[orgId]/team/page.tsx`

### Finding: N+1 admin API calls inside a synchronous for-loop — every user triggers `admin.auth.admin.getUserById`
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: significant
- **File**: src/app/[orgId]/team/page.tsx:62-68
- **Current**:
  ```ts
  for (const member of teamMembers) {
    const { data: authData } = await admin.auth.admin.getUserById(member.id);
    if (authData?.user && !authData.user.last_sign_in_at) pendingUserIds.add(member.id);
  }
  ```
- **Fix**: Parallelize with `Promise.all(teamMembers.map(m => admin.auth.admin.getUserById(m.id)))`, or better — page is server-rendered so latency directly gates Time-to-Interactive. With 15+ members this is an easy multi-second stall with no skeleton. At minimum: `await Promise.all(...)`. Considered polish because the perceived-performance tax on this page is brutal.

### Finding: Empty-state is a `<tr><td colspan=6>` with plain text — generic database-admin feel
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/page.tsx:129-138, 214-217
- **Current**: `No team members found. Invite your first team member to get started.`
- **Fix**: Use `<EmptyState icon={Users} title="No team members yet" description="Invite your first agent or assistant to collaborate on saved searches and enrichment." ><InviteDialog orgId={orgId} /></EmptyState>` — exactly the primitive's intended use. First-time admin sees polish instead of an empty table skeleton.

### Finding: Role badge is hardcoded gold for every role — no visual differentiation
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/page.tsx:160-164, 238-242
- **Current**: `<span className="inline-flex items-center rounded-full bg-[var(--gold-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--gold-primary)]">{member.role}</span>`
- **Fix**: Differentiate: tenant_admin -> gold, agent -> blue tint (`bg-blue-500/10 text-blue-400`), assistant -> subtle (`bg-muted text-muted-foreground`). Scannability jumps dramatically on 20-row tables.

### Finding: Role text is raw snake_case ("tenant_admin") instead of display form
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/page.tsx:163, 241
- **Current**: `{member.role}` renders literal `tenant_admin`.
- **Fix**: Helper `roleLabel(role) => ({ tenant_admin: "Admin", agent: "Agent", assistant: "Assistant", super_admin: "Super Admin" })[role] ?? role`. Customer-facing labels must never show the schema.

### Finding: No sticky table header on long team lists
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/page.tsx:88-127
- **Current**: `<thead className="admin-thead">` — scrolls out of view.
- **Fix**: Add `sticky top-0 z-10 bg-[var(--bg-elevated)] backdrop-blur` on the `<thead>` styles. Industry-standard for admin tables.

### Finding: Row has no hover lift / cursor signal despite being the primary interaction target
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/page.tsx:140-147
- **Current**: `className="admin-row-hover"` — behavior depends entirely on CSS class, can't verify polish from here. But actions live inline on each row; there's no row-level invitation to click.
- **Fix**: If `.admin-row-hover` only changes bg, add a subtle `transition-colors duration-150`. Confirm the "Last Active" column has a tooltip with the full ISO date on hover (currently just "5m ago" with no underlying timestamp surface).

### Finding: `updated_at` used as "Last Active" proxy — misleading when toggling status
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/page.tsx:51, 186, 260
- **Current**: "Last Active" column uses `updated_at`, which bumps every time an admin toggles status. Not actually last sign-in.
- **Fix**: Query `auth.users.last_sign_in_at` from the same admin loop that computes pending (you already have it at line 64). Pass it into rows. Labels will finally be accurate.

### Finding: No search / filter bar for teams >20
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/page.tsx:70-82
- **Current**: Heading + invite CTA, no search input.
- **Fix**: Add a small search `<Input>` aligned right of the heading (before the Invite button), filtering by name/email/role with `useMemo`. Keeps admin from scrolling on agencies with 30+ members.

### Finding: Page has no loading state — server-rendered, but if RLS lags user stares at blank
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/page.tsx:26-69
- **Current**: Pure RSC; no `loading.tsx`.
- **Fix**: Add `src/app/[orgId]/team/loading.tsx` rendering `<Skeleton>` rows (6-8 bars, mixed widths) inside the same surface-card shell. With the current N+1 getUserById calls this is especially visible.

---

## /[orgId]/team invite-dialog — `src/app/[orgId]/team/invite-dialog.tsx`

### Finding: Invite trigger uses manual mouse-state hover color swap instead of CSS `:hover`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/team/invite-dialog.tsx:79-94, 31
- **Current**: `const [triggerHovered, setTriggerHovered] = useState(false);` + JS `onMouseEnter/Leave` to swap bg. Re-renders on hover, does not handle keyboard focus.
- **Fix**: Use existing Button primitive: `<Button variant="gold" size="default" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" /> Invite Team Member</Button>`. Kills the state + rerenders and gains `focus-visible` and `active:scale-[0.97]` automatically.

### Finding: Role `<select>` is a native browser dropdown — breaks luxury dark theme
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/team/invite-dialog.tsx:168-180
- **Current**: `<select>` styled to match, but its dropdown list is still native browser chrome (white on macOS, grey on Windows).
- **Fix**: Use `src/components/ui/select.tsx` Radix primitive. Gets dark-themed popover, keyboard nav, option highlight states, consistent focus ring. Critical — this is the one dropdown on the invite flow.

### Finding: Role descriptions missing — admin doesn't know difference between agent and assistant
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/invite-dialog.tsx:168-180
- **Current**: Two naked options, no explainer.
- **Fix**: After the `<Select>`, render a contextual helper `<p className="text-xs text-muted-foreground">{role === "agent" ? "Can create searches and enrich leads" : "Can view searches and assist agents — no billing."}</p>`. Admin makes an informed choice.

### Finding: Submit button recreates gold-bg-strong variant, loses spinner + active scale
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/invite-dialog.tsx:183-194
- **Current**: Inline-styled raw button.
- **Fix**: `<Button type="submit" disabled={submitting} variant="gold" size="lg" className="w-full mt-2">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "Sending" : "Send Invitation"}</Button>`.

### Finding: No post-invite toast confirmation from this surface
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/invite-dialog.tsx:59-63
- **Current**: On success, closes dialog + calls `router.refresh()` — user just sees table re-flicker with no confirmation.
- **Fix**: Pull in `const { toast } = useToast()` and fire `toast({ title: "Invitation sent", description: `${email} will receive an email shortly.` })` before closing. Matches pattern used in `team-member-actions.tsx:44`.

### Finding: Dialog close button missing cancel button inside footer
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/invite-dialog.tsx:182-195
- **Current**: Only "Send Invitation" submit. Closing requires clicking outside / Escape / the X icon.
- **Fix**: Wrap submit in flex footer with a left-aligned `<Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>`. Standard dialog pattern.

### Finding: Email field lacks format validation hint
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/invite-dialog.tsx:120-131
- **Current**: HTML5 `type="email"` only — hint shows up as ugly browser tooltip.
- **Fix**: Add onBlur inline check: if `email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)` show `<p className="text-xs text-destructive">Enter a valid email address</p>` under the field. Luxury != browser defaults.

---

## /[orgId]/team team-member-actions — `src/app/[orgId]/team/team-member-actions.tsx`

### Finding: Inline-confirm destructive "Remove" pattern is cramped, easy to misclick
- **Tag**: [MICRO-INTERACTION]
- **Severity**: significant
- **File**: src/app/[orgId]/team/team-member-actions.tsx:128-156
- **Current**: Clicking "Remove" morphs into a mini inline "Confirm / Cancel" pair in the same 8-pixel row as other controls. No warning copy, no user-name echo, no destructive color confirm on hover.
- **Fix**: Use the shared `<Dialog>` or `<Confirmation>` primitive from `src/components/ui/confirmation.tsx`:
  ```tsx
  <Dialog open={showConfirmRemove} onOpenChange={setShowConfirmRemove}>
    <DialogContent>
      <Confirmation
        isDestructive
        confirmLabel="Remove member"
        onConfirm={handleRemove}
        onCancel={() => setShowConfirmRemove(false)}
        isLoading={actionPending}
      >
        <ConfirmationIcon variant="destructive" />
        <ConfirmationTitle>Remove {memberEmail}?</ConfirmationTitle>
        <ConfirmationDescription>Their saved searches will be preserved. They lose access immediately and must be re-invited to return.</ConfirmationDescription>
      </Confirmation>
    </DialogContent>
  </Dialog>
  ```
  Requires passing `memberEmail` in as prop.

### Finding: Inline-confirm revoke button has no confirmation at all
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/team-member-actions.tsx:102-109
- **Current**: `<button onClick={handleRevoke}>Revoke</button>` — one click, no confirm.
- **Fix**: Gate with the same `<Confirmation>` dialog. Revoking an invite silently is surprising — invites are sent externally, revoking should confirm.

### Finding: Role-change `<select>` has no confirmation and no visual acknowledgement
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/team/team-member-actions.tsx:112-125
- **Current**: Native select, change triggers server action immediately with a toast. But the select briefly shows the new value even if the action fails (no optimistic rollback).
- **Fix**: (a) Replace with Radix `<Select>` for theming. (b) Track pending state and revert select value on `result.error` — currently just toasts the error but leaves dropdown showing the wrong role until router.refresh. (c) Add a brief confirm: "Change Jane Doe to Assistant?" via `<Confirmation>`.

### Finding: Resend button has no loading state, can be double-clicked
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/team-member-actions.tsx:91-101
- **Current**: `disabled={actionPending}` but no visual spinner on the button itself; user can't tell which action is loading when multiple rows are visible.
- **Fix**: Replace label with `{actionPending ? "Resending..." : "Resend"}` at minimum, or add a row-local pending flag so only the clicked row's button dims. Otherwise every row's buttons dim simultaneously (bug: `actionPending` is a shared `useTransition`).

### Finding: No "copy invite link" affordance for manual delivery fallback
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/team-member-actions.tsx:88-110
- **Current**: Pending invites only show Resend / Revoke.
- **Fix**: Add a "Copy invite link" icon-button using `<Tooltip>`. Useful when the invite email lands in spam (known case per recent commit `8b68a28`).

---

## /[orgId]/team user-status-toggle — `src/app/[orgId]/team/user-status-toggle.tsx`

### Finding: Deactivate/Activate has no confirmation — destructive by nature
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/team/user-status-toggle.tsx:38-54
- **Current**: One click instantly deactivates a user (they lose access). Optimistic UI flips the pill, server action runs, rollback on error.
- **Fix**: Gate deactivation behind `<Confirmation>` dialog: "Deactivate Jane Doe? They will be signed out of all sessions." Activation can stay one-click.

### Finding: "Updating..." label causes button width jump
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/team/user-status-toggle.tsx:48-52
- **Current**: Text swaps between "Deactivate" (10 chars) and "Updating..." (11 chars) — width shifts.
- **Fix**: Reserve `min-w-[96px] justify-center` on the button and replace label with `<Loader2 className="h-3 w-3 animate-spin" />` during pending.

---

## /[orgId]/settings — `src/app/[orgId]/settings/page.tsx`

### Finding: Same duplicated inline `onFocus/onBlur` pattern as confirm-tenant — spread over 3 inputs
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/settings/page.tsx:90-95, 153-158, 184-189, 217-222
- **Current**: JS handlers setting `borderColor` on focus.
- **Fix**: Delete handlers and use the `<Input>` primitive — it already has `focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]`.

### Finding: Profile and password forms auto-reset on success — destroys user's context
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/settings/page.tsx:28, 45
- **Current**: `form.reset()` after success wipes the Display Name input. User can't confirm what they just saved.
- **Fix**: For profile, DO NOT reset — leave the saved value visible; the success pill is confirmation enough. For password form, reset is correct (security). Split behavior.

### Finding: Success message is plain text, no icon, no fade-out
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/page.tsx:102-106, 229-233
- **Current**: `<p className="text-sm" style={{ color: "var(--success)" }}>Profile updated successfully.</p>` — persists until next submit.
- **Fix**: Use `useToast` consistent with `organization/page.tsx:73`, OR keep inline but add `Check` icon + `animate-in fade-in` and `setTimeout` auto-dismiss after 3s. Mixing toast (org settings) vs inline (account settings) is inconsistent across the admin surface.

### Finding: Password fields lack show/hide toggle, no strength meter on new password
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/settings/page.tsx:140-223
- **Current**: Three plain password inputs.
- **Fix**: Same Eye/EyeOff pattern as login fix. Strength meter on `new_password` (reuse same component created for reset-password).

### Finding: No breadcrumbs despite dashboard layouts having them on comparable depth routes
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/page.tsx:50-59
- **Current**: Page opens directly with `<h1>Settings</h1>`.
- **Fix**: `<Breadcrumbs items={[{ label: "Dashboard", href: `/${orgId}` }, { label: "Settings" }]} />` — primitive exists at `src/components/ui/breadcrumbs.tsx`.

### Finding: No unsaved-changes guard on either form
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/page.tsx:16-48
- **Current**: Navigating away silently loses changes.
- **Fix**: Track dirty state per form; `beforeunload` listener if either is dirty.

### Finding: Submit buttons not using Button primitive, lack active-scale / spinner
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/page.tsx:108-118, 235-245
- **Current**: Raw `<button>` with inline `style={{ background: "var(--gold-primary)", color: "var(--bg-base)" }}`.
- **Fix**: `<Button type="submit" disabled={profilePending} variant="gold-solid">{profilePending && <Loader2 className="h-4 w-4 animate-spin" />}{profilePending ? "Saving" : "Save changes"}</Button>`.

---

## /[orgId]/settings/organization — `src/app/[orgId]/settings/organization/page.tsx`

### Finding: Loading state uses bare div spinner in muted-foreground instead of gold
- **Tag**: [MICRO-ANIMATION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/organization/page.tsx:83-89
- **Current**: `<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />`
- **Fix**: Use `<Skeleton>` rows matching the final two-card layout (cards, labels, inputs) for a proper content skeleton. Reading "organization settings" via a grey spinner reads as unpolished. Alternatively `<Loader2 className="h-6 w-6 animate-spin text-gold" />` at minimum.

### Finding: Logo upload + Theme picker have no "unsaved state" visual — user uploads a logo, it persists immediately while org name/slug waits for Save
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: medium
- **File**: src/app/[orgId]/settings/organization/page.tsx:143-157
- **Current**: `<LogoUpload>` auto-persists on upload. `<ThemePicker>` + name + slug require Save click. Mixed commit model confuses users.
- **Fix**: Document this behavior with a helper line `<p className="text-xs text-muted-foreground">Logo is saved immediately on upload.</p>` under the logo, and a dirty indicator (gold dot) on the Save Changes button when name/slug/theme have unsaved diffs.

### Finding: Slug change triggers redirect with no toast warning — URL bar changes mid-action
- **Tag**: [MICRO-INTERACTION]
- **Severity**: medium
- **File**: src/app/[orgId]/settings/organization/page.tsx:76-78
- **Current**: `if (result.slug && result.slug !== orgId) { router.push(`/${result.slug}/settings/organization`); }` — one toast "Settings updated" then URL silently rewrites.
- **Fix**: If slug changed, widen the toast: `toast({ title: "Settings updated", description: \`Your workspace URL is now app.pgl.com/${result.slug}\` })`. Prevents "wait, did I break the link I shared?"

### Finding: No "Danger zone" — tenant admin can never leave/delete org, no account deletion path
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win (polish, not feature)
- **File**: src/app/[orgId]/settings/organization/page.tsx:138-158
- **Current**: Only branding + general sections.
- **Fix**: Add a visually-subdued "Contact support to delete this organization" disclaimer at the bottom, mailto linked. Sets expectation without implementing the feature. Polish, not functionality.

### Finding: Save button uses bespoke Tailwind gold class instead of `variant="gold-solid"`
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/organization/page.tsx:160-166
- **Current**: `<Button type="submit" disabled={isPending} className="bg-[var(--gold-primary)] text-black hover:bg-[var(--gold-bright)]">{isPending ? "Saving..." : "Save Changes"}</Button>`
- **Fix**: `<Button type="submit" disabled={isPending} variant="gold-solid" size="lg">{isPending && <Loader2 className="h-4 w-4 animate-spin" />}{isPending ? "Saving" : "Save Changes"}</Button>`.

### Finding: No page-level `unsaved changes` warning
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/organization/page.tsx:15-171
- **Current**: Changing name/slug/theme then clicking sidebar exits silently discards edits.
- **Fix**: `beforeunload` guard when state diverges from loaded tenant.

### Finding: Slug regex strip is destructive-on-keystroke — user can't type a space and replace later
- **Tag**: [MICRO-INTERACTION]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/organization/page.tsx:126-128
- **Current**: `setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))` — caret can jump when middle characters are stripped.
- **Fix**: Allow full input, validate `onBlur`, surface inline error if invalid. Typing "my org" should show a preview of `my-org` not silently eat spaces.

### Finding: No breadcrumbs
- **Tag**: [MICRO-IMPROVEMENT]
- **Severity**: quick-win
- **File**: src/app/[orgId]/settings/organization/page.tsx:96-104
- **Current**: H1 only.
- **Fix**: `<Breadcrumbs items={[{ label: "Dashboard", href: `/${orgId}` }, { label: "Settings", href: `/${orgId}/settings` }, { label: "Organization" }]} />`.

---

## Top 10 impact-to-effort picks

1. **Login/reset/forgot: add `<Loader2>` spinners + stop label flicker** (src/app/(auth)/login/page.tsx:205; reset-password:165; forgot-password:125). Three one-line swaps, massive perceived-quality jump on every first-use session.
2. **Team page: wrap "Remove member" in `<Confirmation>` dialog with user-name echo** (team-member-actions.tsx:128-156). Current inline confirm is misclick-prone and destructive. Use existing primitive.
3. **Team page: N+1 `admin.auth.admin.getUserById` inside for-loop — `Promise.all` it** (team/page.tsx:62-68). Single-line fix, cuts page TTFB by seconds on larger teams.
4. **`/onboarding/set-password` is likely orphaned after invite rewrite** — verify and delete, OR bring to parity with confirm-tenant's luxury shell (set-password/page.tsx:68-124). High signal — the invite flow was just rewritten and this screen looks like dev-default shadcn.
5. **(auth) layout: add ambient-glow divs + staggered fade-in** (src/app/(auth)/layout.tsx:7). First screen every admin sees — currently flat vs onboarding which has premium glow. Two lines of markup.
6. **Invite dialog: replace native `<select>` with Radix `<Select>`** (invite-dialog.tsx:168-180). Native dropdown is the single biggest luxury-positioning slip in the tenant admin surface.
7. **Login: handle `?message=password_reset_success`** (login/page.tsx:26-101). Broken promise today — reset flow redirects with the param but login ignores it. Success banner costs ~6 lines.
8. **Team: `<EmptyState>` primitive instead of generic `<td colspan>`** (team/page.tsx:129-138). First-time admin's first team-page impression.
9. **Role display + color differentiation**: map `tenant_admin`/`agent`/`assistant` to human labels and distinct badge colors (team/page.tsx:160-164). Admins currently see schema strings.
10. **Remove duplicated `onFocus/onBlur` JS handlers, use `<Input>` primitive** (confirm-tenant lines 171/206/286/325; settings lines 90/153/184/217). Kills ~120 lines, guarantees focus-ring consistency with the rest of the app, gains the subtle gold shadow halo.

---

## Luxury positioning — recurring slippage flags
- Raw `bg-primary` / `bg-[var(--gold-primary)]` + Tailwind gold classes on buttons instead of the pre-built `variant="gold" | "gold-solid"` — recurs in: settings, organization settings, onboarding/set-password, suspended. Variants have the gold-glow shadow + active-scale baked in.
- Native `<select>` survives in invite-dialog + team-member-actions. Native browser dropdown chrome breaks the dark theme immediately.
- Inline JS `onFocus/onBlur` to paint focus rings (onboarding/confirm-tenant, settings) — inconsistent with the gold halo on `<Input>`.
- `text-muted-foreground` + plain-text success messages (settings, forgot-password success) — not toast, no icon. Feels like a framework demo rather than polished product.
- Schema-string role labels (`tenant_admin`) visible in team table — never in luxury SaaS.
