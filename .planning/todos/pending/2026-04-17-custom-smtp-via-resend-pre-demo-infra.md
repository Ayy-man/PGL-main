---
created: 2026-04-17T13:22:42.650Z
title: Custom SMTP via Resend — pre-demo infrastructure blocker
area: auth
files:
  - src/app/actions/team.ts:64
  - src/app/actions/team.ts:248
  - src/app/actions/team.ts:256
  - src/app/actions/admin.ts:79
  - src/app/actions/admin.ts:166
  - src/app/(auth)/forgot-password/page.tsx:25
---

## Problem

Supabase's built-in email sender is rate-limited to ~4 emails/hour, which we
hit multiple times during invite-flow testing on 2026-04-17 ("Failed to send
invitation: email rate limit exceeded"). The app caught it cleanly — not a
code bug. With Maggie's demo approaching, we need custom SMTP lifted to Resend
so the invite flow isn't capped. Supabase with custom SMTP defaults to 30/hr
(still bumpable in dashboard).

Test API call confirmed Resend works end-to-end from this project's Vercel
deploy (HTTP 200, message ID `1694cff5-7691-4946-877a-1836250b774b` delivered
to `techadmin@phronesisgrowthlabs.com` using the `onboarding@resend.dev`
sandbox sender).

## Solution

All dashboard work — **zero code changes**. All 6 existing email call sites
already go through Supabase Auth and will auto-switch once SMTP is
reconfigured in the Supabase dashboard.

### Sequence

1. **Sender domain.** Pick and verify ownership:
   - `phronesisgrowthlabs.com` — preferred if PGL team owns it (Adrian likely);
     confirm ownership and get DNS access
   - New purchase via Cloudflare Registrar (~$10/yr) if not:
     `phronesis.app`, `phronesis.ai`, or `trypgl.com`

2. **Verify domain in Resend.** Add 2 DNS records (SPF TXT + DKIM TXT);
   DMARC optional but recommended post-verification. Resend marks "failed"
   after 72h without detection.

3. **Rotate exposed API key.** `re_2LZPTAxE_PxgCaew14843AXgsCEPoeK15` was
   pasted in the chat transcript on 2026-04-17 during testing — delete and
   regenerate in Resend dashboard before production use.

4. **Paste SMTP creds into Supabase.** Project Settings → Authentication →
   Emails → SMTP Settings:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend` (literal string, not your email)
   - Password: new rotated API key
   - Sender email: `noreply@<verified-domain>`
   - Sender name: `Phronesis` (or similar)

5. **Raise Supabase auth rate limit.** Auth → Rate Limits — bump from 30/hr
   default to demo-safe (100/hr suggested for Maggie's onboarding day).

6. **Customize Supabase email templates.** Auth → Email Templates — replace
   default Supabase copy on Invite / Confirm / Reset with PGL-branded
   subjects and body.

### Verified scope (no code edits needed)

Grep on 2026-04-17 confirmed all 6 email-sending call sites route through
Supabase Auth — switching SMTP in the dashboard auto-covers all of them:

- `src/app/actions/team.ts:64` — tenant admin invites agent/assistant
- `src/app/actions/team.ts:248` — resend invite link
- `src/app/actions/team.ts:256` — magic link fallback
- `src/app/actions/admin.ts:79` — super admin creates tenant + invites admin
- `src/app/actions/admin.ts:166` — super admin invites user directly
- `src/app/(auth)/forgot-password/page.tsx:25` — password reset

No Resend / Nodemailer / SendGrid / Postmark / Mailgun packages in
`package.json`. No transactional emails outside auth. No env vars to add.

### Done when

- Invite flow on `pgl-main.vercel.app` can send >10 invites in a minute
  without hitting rate limit
- Test invite email arrives from `noreply@<domain>` (not from the
  `onboarding@resend.dev` sandbox)
- Rotated API key stored only in Supabase dashboard (and local/Vercel env
  vars if anything else ever needs it)
