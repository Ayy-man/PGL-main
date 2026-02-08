# PGL Luxury Buyer Finder

## What This Is

A multi-tenant wealth intelligence SaaS platform that identifies ultra-high-net-worth individuals (UHNWI) for real estate prospecting. PGL owns the platform, white-labels and licenses it to real estate teams nationwide. First tenant is The W Team (NYC luxury real estate).

## Core Value

Real estate teams can quickly find and qualify wealthy prospects by searching structured lead databases, enriching profiles with personal contact info and wealth signals, and organizing prospects into actionable lists.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-tenant architecture with RLS-enforced data isolation
- [ ] Role-based access (Super Admin, Tenant Admin, Agent, Assistant)
- [ ] Supabase Auth login with tenant context
- [ ] PGL super admin panel for tenant/user management
- [ ] Tenant branding system (logo, primary/secondary color)
- [ ] Persona Builder — reusable search filter combinations
- [ ] Starter personas seeded for new tenants (Finance Elite, Tech Execs, Startup Founders, BigLaw Partners, Crypto/Web3)
- [ ] Apollo.io integration for structured persona-based people search
- [ ] Search results table with pagination and caching
- [ ] Prospect profile view with consolidated data
- [ ] ContactOut integration for personal email enrichment (lazy, on profile view)
- [ ] Exa.ai integration for enrichment — web presence/news, company data, wealth signals
- [ ] SEC EDGAR integration for insider transaction data (Form 4)
- [ ] Claude AI-generated prospect summaries ("Why Recommended")
- [ ] Named list management (create, view, add/remove prospects)
- [ ] List member status tracking (New, Contacted, Responded, Not Interested)
- [ ] Inline notes on list members
- [ ] CSV export of lists
- [ ] Lookalike Discovery — "Find Similar People" button on profile, AI extracts attributes → generates persona → searches for matches
- [ ] Usage Metrics Dashboard — logins, searches, profiles viewed, exports; tenant admins see team, PGL admin sees all tenants (critical for 6-month renewal proof)
- [ ] Activity logging — 11 action types: login, search_executed, profile_viewed, profile_enriched, add_to_list, remove_from_list, status_updated, note_added, csv_exported, persona_created, lookalike_search
- [ ] Dark theme UI with gold accents, Playfair Display headings, Inter body

### Out of Scope

- Stripe billing integration — not needed for initial launch, PGL handles billing externally
- Email/SMS outreach from within platform — separate tool, not core to prospecting
- Crunchbase integration — Apollo + Exa + SEC provide sufficient data
- Saved search alerts — nice-to-have, defer to v2
- Mobile native app — web-first, PWA for mobile (not native)
- CRM integration (Monday.com, HubSpot) — CSV export only; teams import themselves
- Cold Lead CRM — separate product, not part of this build
- Cross-tenant data sharing — tenants must remain fully isolated
- Real-time chat — high complexity, not core to prospecting workflow

## Context

- **Client:** Phronesis Growth Labs (PGL), owned by Adrian
- **Investment:** $3,100 (Premium tier)
- **Timeline:** 6 weeks
- **First tenant:** The W Team — Maggie Wu (Tenant Admin), Isabelle (Agent), Olivia (Agent), Anne (Assistant/Read Only). Emails TBD, build with placeholders.
- **Brand assets:** W Team logo/colors TBD, build with defaults (dark #0a0a0a, gold #d4af37)
- **Business model:** PGL super admin manages all tenants. Each tenant is a real estate team that gets white-labeled access.
- **API integrations:**
  - Apollo.io — primary structured lead search (personas translate to Apollo filters)
  - Exa.ai — enrichment layer for web presence, news, company data, wealth signals (Adrian newly interested; potential future expansion)
  - ContactOut — personal email enrichment (lazy, on profile view)
  - SEC EDGAR — insider transaction data for public company executives
  - Anthropic Claude (haiku) — AI-generated prospect summaries
- **Database:** Full schema designed with 9 core tables (tenants, users, personas, prospects, sec_transactions, prospect_summaries, lists, list_members, activity_log, usage_metrics_daily) plus RLS policies
- **New routes from kickoff:** `/dashboard/analytics` (tenant metrics), `/admin/analytics` (cross-tenant metrics), `/api/search/lookalike`, `/api/analytics`, `/api/activity`
- **Enrichment strategy:** Lazy enrichment — ContactOut, Exa, SEC, and AI summaries trigger on profile view, not upfront

## Constraints

- **Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + RLS), Vercel hosting — chosen by client
- **AI Model**: Claude 3 Haiku for cost efficiency on prospect summaries
- **Timeline**: 6 weeks total — Foundation (weeks 1-2), Persona + Search (weeks 3-4), Enrich + Ship (weeks 5-6)
- **Budget**: $3,100 — constrains scope to what's specced, no gold-plating
- **Performance**: Search <3s cached / <8s fresh, profile <2s, tables handle 500+ rows, CSV export 1000+ prospects
- **Security**: API keys server-side only, session validation on all routes, RLS for tenant isolation, rate limiting, CORS locked to production domain

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Apollo.io as primary lead source | Structured filters map directly to persona fields, reliable API | — Pending |
| Exa.ai for enrichment (not lead source) | Complements Apollo with web presence, news, company data, wealth signals | — Pending |
| Supabase RLS for tenant isolation | Database-level enforcement is more secure than application-level checks | — Pending |
| Claude Haiku for AI summaries | Cost-efficient for high-volume 2-3 sentence generations | — Pending |
| Lazy enrichment strategy | Reduces API costs by only enriching prospects users actually view | — Pending |
| Dark theme with gold accents | Luxury brand positioning — signals premium product to real estate clients | — Pending |
| Lookalike Discovery in v1 | Adrian loved it; AI-driven persona generation from prospect profile is key differentiator | — Pending |
| Usage Metrics Dashboard in v1 | Critical for 6-month renewal proof; shows ROI to tenant admins | — Pending |
| CRM integration OUT of v1 | CSV export only; teams import to Monday.com/HubSpot themselves | — Pending |

---
*Last updated: 2026-02-08 after kickoff call changes*
