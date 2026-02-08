# Feature Landscape: Luxury Real Estate Prospecting Platform

**Domain:** Wealth intelligence / lead enrichment for luxury real estate (UHNWI targeting)
**Researched:** 2026-02-08
**Overall Confidence:** MEDIUM - Strong data on competitor features, moderate confidence on luxury real estate-specific nuances

---

## Executive Summary

PGL Luxury Buyer Finder competes in the intersection of three markets: wealth intelligence (Wealth-X/Altrata), lead enrichment (Apollo.io/ZoomInfo), and real estate prospecting (Reonomy/PropertyShark). This analysis categorizes features across these competitive landscapes into table stakes (must-have), differentiators (competitive advantage), and anti-features (deliberately avoid).

**Key insight:** Basic lead enrichment and list management are table stakes. AI-powered wealth insights, persona-based filtering, and real-time enrichment are differentiators for the luxury segment. Attempting full property intelligence or automated outreach would be anti-features that dilute focus.

---

## Table Stakes Features

Features users expect from any lead enrichment/prospecting tool. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Contact Search with Filters** | Core functionality in Apollo, ZoomInfo, all competitors | Low | Search API (Apollo) | Filter by job title, location, company, industry |
| **Basic Profile Data** | Expected from all lead enrichment tools | Low | Data provider API | Name, title, company, email, phone, LinkedIn |
| **List Creation & Management** | Standard in all CRMs and prospecting tools | Low | Database, CRUD operations | Create, name, organize, tag lists |
| **Contact Export (CSV)** | Universal expectation for data portability | Low | CSV serialization | UTF-8 encoding critical for international names |
| **Email Verification** | 90%+ deliverability is industry standard | Medium | ContactOut or similar | Prevent bounce rates, validate before export |
| **Phone Number Enrichment** | Expected for outbound prospecting | Medium | ContactOut or similar | Mobile + direct dial preferred |
| **Saved Searches** | Standard feature in all prospecting platforms | Low | Store search criteria | Save filters for re-use |
| **Duplicate Detection** | Prevents list pollution | Low | Matching algorithm | Match on email/phone, not just name |
| **Basic List Filtering** | Must be able to segment lists | Low | Query layer | Filter by data completeness, location, etc. |
| **Data Refresh/Updates** | Contact data decays 30%/year industry-wide | Medium | Scheduled jobs, API polling | Apollo data updates, re-enrichment |
| **Multi-User Access** | Multi-tenant = team collaboration expected | Medium | Auth, permissions system | Role-based access (The W Team has multiple agents) |
| **Data Privacy Compliance** | GDPR/CCPA table stakes for SaaS in 2026 | Medium | Legal controls, data deletion | Especially critical for wealth data |

### Complexity Legend
- **Low:** <1 week implementation, standard patterns
- **Medium:** 1-3 weeks, requires integration or moderate complexity
- **High:** >3 weeks, novel functionality or multiple integrations

---

## Differentiators

Features that set the product apart in the luxury real estate segment. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Dependencies | Competitive Advantage |
|---------|-------------------|------------|--------------|----------------------|
| **Persona-Based Search** | Targets UHNWI buyer types (founder exited, finance exec, inheritance) vs generic job titles | Medium | Apollo filters + custom mapping | **HIGH** - Wealth-X charges premium for wealth segmentation; you automate this |
| **AI Wealth Insights Summary** | Claude synthesizes wealth indicators from Exa/SEC EDGAR into narrative | Medium | Claude API, Exa API, SEC EDGAR parser | **HIGH** - Competitors provide raw data; you provide interpretation |
| **Real-Time Web Enrichment** | Exa pulls fresh press, funding rounds, wealth events vs stale database records | High | Exa API, async processing | **MEDIUM** - More current than Wealth-X's quarterly updates |
| **SEC Filing Analysis** | Auto-extracts insider transactions, stock holdings for public company execs | High | SEC EDGAR API, parsing logic | **HIGH** - Wealth-X/Altrata charge $50K+/year for this; you include it |
| **Wealth Signal Scoring** | Scores contacts 1-10 on "likelihood of $5M+ property purchase" | High | ML model or heuristic scoring | **MEDIUM** - Reduces noise, focuses on high-intent |
| **Property Ownership Cross-Reference** | Links Apollo person → ATTOM property records to show existing portfolio | High | ATTOM API integration | **HIGH** - Unique to real estate; competitors don't do this |
| **Buying Intent Signals** | Identifies life events (IPO, inheritance, job change) that trigger moves | Medium | Exa news monitoring, Apollo signals | **MEDIUM** - ZoomInfo has this for B2B; adapted for real estate |
| **Luxury Market Context** | Shows "10 recent $10M+ sales in target zip" alongside contact | Low-Medium | PropertyShark/ATTOM market data | **LOW** - Nice-to-have context for agents |
| **Net Worth Estimation** | Estimate range ($10-30M, $30-100M, $100M+) based on signals | Medium | Algorithm combining SEC, Apollo, Exa | **MEDIUM** - Wealth-X sells this; you provide rough version |
| **Competitive Set Analysis** | "15 other luxury agents searched this contact" (if multi-tenant data shared) | Medium | Usage analytics, opt-in | **LOW** - Novel but low value for MVP |

### Implementation Priority (MVP Recommendation)
1. **Persona-Based Search** - Core differentiator, medium complexity
2. **AI Wealth Insights Summary** - Signature feature, uses Claude
3. **SEC Filing Analysis** - High value for public company execs (NYC focus)
4. Defer to post-MVP: Real-time web enrichment, property cross-reference (nice-to-have, high complexity)

---

## Anti-Features

Features to explicitly **NOT** build. Common in related domains but wrong for this product.

| Anti-Feature | Why Avoid | What to Do Instead | Competitor That Has This |
|--------------|-----------|-------------------|-------------------------|
| **Full Property Intelligence** | Not competing with Reonomy/ATTOM; stay focused on people, not buildings | Integrate with ATTOM API for targeted property data only (if needed) | Reonomy (54M properties, 100 data points each) |
| **Automated Email Outreach** | Luxury buyers expect white-glove, human touch; automation feels spammy | Export lists for agents to use in their preferred CRM/email tool | Apollo.io, ZoomInfo (email sequences, cadences) |
| **Built-In CRM** | Agents already use Salesforce/LionDesk/follow up boss; don't replace | Focus on export/integration; become feed for their CRM | ZoomInfo OperationsOS, most real estate platforms |
| **Mass Market Lead Gen** | Targeting UHNWI, not high-volume low-quality leads | Emphasize quality (100 perfect matches) over quantity (10,000 contacts) | Zillow, Realtor.com (consumer lead gen) |
| **Property Valuation/AVM** | Not a prop-tech tool; agents have Zillow/MLS for this | Show market context (recent sales) but no valuation | PropertyShark, ATTOM (AVM models) |
| **Social Media Posting** | Real estate marketing, not prospecting | Stay laser-focused on prospect discovery and enrichment | Luxury Presence (social media tools) |
| **Transaction Management** | Post-prospecting phase; out of scope | End at "qualified list export" stage | Real estate transaction platforms (Dotloop, Skyslope) |
| **Public Listing Scraping** | MLS/Zillow data = legal/compliance nightmare | Use ATTOM API for property data if needed | PropStream (web scraping focused) |
| **Predictive Dialing** | Volume play, not luxury approach | Provide phone numbers; agents dial manually | Sales dialers (Mojo, REDX) |
| **Lead Scoring for "Hot Now"** | Luxury sales cycles are 12-24 months; "hot lead" concept doesn't apply | Score on "wealth capacity" not "ready to buy" | Most CRMs (lead scoring based on engagement) |

### Philosophy: "Concierge Intel, Not Commodity Volume"
The anti-feature list reflects a core positioning: PGL Luxury Buyer Finder is intelligence for manual, relationship-driven sales. Not automation for high-volume transactional sales.

---

## Feature Dependencies

Understanding dependencies prevents building features in the wrong order.

```
FOUNDATIONAL LAYER (Must Build First)
├─ Multi-tenant auth & permissions
├─ Apollo.io integration (search)
└─ Contact database schema

ENRICHMENT LAYER (Depends on Foundation)
├─ ContactOut integration (email/phone verification)
├─ Exa integration (web enrichment) → requires contact ID
└─ SEC EDGAR parser → requires contact name/company

AI INSIGHT LAYER (Depends on Enrichment)
└─ Claude API (summary generation) → requires enriched data from Exa + SEC

LIST MANAGEMENT LAYER (Depends on Foundation)
├─ List CRUD operations
├─ Add contacts to lists → requires contact database
├─ Export to CSV → requires list contents
└─ Saved searches → requires search functionality

ADVANCED FEATURES (Depends on Multiple Layers)
├─ Wealth signal scoring → requires enrichment layer data
├─ Property cross-reference → requires ATTOM API + contact database
└─ Persona-based search → requires Apollo filters + custom mapping
```

### Critical Path for MVP
1. Foundation → 2. Apollo search → 3. Enrichment (ContactOut/Exa/SEC) → 4. AI summaries (Claude) → 5. List management → 6. CSV export

---

## Feature Complexity Analysis

### Low Complexity (1-5 days each)
- Saved searches (store JSON filter state)
- CSV export (use standard library, watch UTF-8 encoding)
- Basic list CRUD (standard database operations)
- Duplicate detection (email/phone matching)

### Medium Complexity (1-2 weeks each)
- Email verification via ContactOut (API integration, batch processing)
- Phone enrichment via ContactOut (same as email)
- AI summary generation via Claude (prompt engineering, token management)
- Persona-based search (map luxury personas → Apollo filters)
- Multi-tenant permissions (role-based access control)

### High Complexity (2-4 weeks each)
- Real-time web enrichment via Exa (async processing, caching strategy)
- SEC filing analysis (parse EDGAR XML, extract transactions, calculate holdings)
- Property ownership cross-reference (ATTOM API integration, data matching)
- Wealth signal scoring (heuristic or ML model, requires training data)
- Data refresh scheduling (job queue, rate limiting, conflict resolution)

### Very High Complexity (4+ weeks, consider deferring)
- Buying intent signals from news (NLP, event detection, signal reliability)
- Net worth estimation (multi-source algorithm, accuracy validation)
- Competitive intelligence (usage analytics, privacy considerations)

---

## Competitive Feature Matrix

How PGL stacks up against competitors:

| Feature Category | Apollo.io | ZoomInfo | Wealth-X | Reonomy | PropertyShark | **PGL Luxury Finder** |
|------------------|-----------|----------|----------|---------|---------------|-----------------------|
| **Contact Search** | ✓✓✓ (210M contacts) | ✓✓✓ (260M profiles) | ✓ (3.2M wealthy) | ✗ | ✗ | ✓✓ (via Apollo API) |
| **Email Verification** | ✓✓ (70-80% success) | ✓✓ (174M verified) | ✓ | ✗ | ✗ | ✓✓ (via ContactOut) |
| **Phone Enrichment** | ✓ (direct dial) | ✓✓ (135M verified) | ✓ | ✗ | ✗ | ✓✓ (via ContactOut) |
| **Wealth Intelligence** | ✗ | ✗ | ✓✓✓ (premium) | ✗ | ✗ | ✓✓ (AI-generated) |
| **Property Data** | ✗ | ✗ | ✗ | ✓✓✓ (54M properties) | ✓✓✓ (158M properties) | ✓ (targeted via ATTOM) |
| **AI Insights** | ✗ | ✓ (Copilot) | ✗ | ✗ | ✗ | ✓✓✓ (Claude summaries) |
| **SEC Filing Analysis** | ✗ | ✗ | ✓✓ (premium add-on) | ✗ | ✗ | ✓✓ (built-in) |
| **Persona Search** | ✗ | ✗ | ✓ (manual segmentation) | ✗ | ✗ | ✓✓ (automated) |
| **Real-Time Web Enrichment** | ✗ | ✓ (intent signals) | ✗ | ✗ | ✗ | ✓ (via Exa) |
| **Multi-Tenant SaaS** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓✓ (white-label ready) |

**Legend:** ✓✓✓ = Industry-leading, ✓✓ = Competitive, ✓ = Basic, ✗ = Not offered

### Positioning Insight
PGL sits in a "Goldilocks zone": More focused than generalist tools (Apollo/ZoomInfo), more accessible than enterprise wealth platforms (Wealth-X at $50K+/year), more people-centric than property platforms (Reonomy/PropertyShark).

---

## MVP Feature Prioritization

For MVP (first 8-12 weeks), prioritize features that demonstrate core value with manageable complexity:

### Phase 1: Foundation (Weeks 1-3)
1. Multi-tenant auth (The W Team as first tenant)
2. Apollo.io integration (persona-based search)
3. Contact database schema
4. Basic list creation

**Why:** Can't do anything without these. Prove Apollo integration works.

### Phase 2: Enrichment (Weeks 4-6)
5. ContactOut integration (email/phone verification)
6. Exa integration (web enrichment for top results)
7. SEC EDGAR parsing (basic transaction extraction)

**Why:** Differentiates from raw Apollo data. Shows enrichment value.

### Phase 3: AI Insights (Weeks 7-8)
8. Claude API integration (wealth insight summaries)
9. Prompt engineering for luxury real estate context

**Why:** Signature feature. Turns raw data into actionable intelligence.

### Phase 4: List Management (Weeks 9-10)
10. Add contacts to lists from search results
11. List filtering and segmentation
12. Duplicate detection

**Why:** Can't export what you can't organize.

### Phase 5: Export & Polish (Weeks 11-12)
13. CSV export with enriched data
14. Saved searches for re-use
15. Data refresh for existing lists

**Why:** Delivers value (export to agent's CRM). Ready for The W Team pilot.

### Defer to Post-MVP
- Property ownership cross-reference (high complexity, nice-to-have)
- Wealth signal scoring (requires validation with real users)
- Buying intent signals (complex, unproven value)
- Net worth estimation (legal/accuracy concerns)

---

## Feature Sizing Estimates

Based on research and industry benchmarks:

| Feature | Optimistic | Realistic | Pessimistic | Risk Factors |
|---------|-----------|-----------|-------------|--------------|
| Apollo integration | 3 days | 5 days | 10 days | API rate limits, auth complexity |
| ContactOut integration | 2 days | 4 days | 7 days | Batch processing, error handling |
| Exa integration | 3 days | 7 days | 14 days | Async processing, result quality tuning |
| SEC EDGAR parser | 5 days | 10 days | 20 days | XML parsing, transaction extraction logic |
| Claude summaries | 3 days | 5 days | 8 days | Prompt engineering iterations |
| CSV export | 1 day | 2 days | 5 days | UTF-8 encoding, large file handling |
| Multi-tenant auth | 5 days | 10 days | 15 days | Role-based permissions complexity |
| List management | 3 days | 5 days | 8 days | UI complexity, database design |
| Saved searches | 2 days | 3 days | 5 days | State serialization |
| Property cross-ref | 7 days | 14 days | 28 days | ATTOM API, data matching accuracy |

**Total MVP Estimate:** 27 days (optimistic) → 55 days (realistic) → 100 days (pessimistic)
**Recommended Buffer:** 70 days (14 weeks) to account for unknowns, testing, iteration

---

## Feature Research Confidence Levels

| Area | Confidence | Reason | Validation Needed |
|------|------------|--------|-------------------|
| Table Stakes Features | **HIGH** | Consistent across all competitors; well-documented industry standards | None - proceed with confidence |
| Enrichment APIs | **MEDIUM** | Apollo, ContactOut, Exa documented; SEC EDGAR requires custom parsing | Prototype SEC parser to validate complexity |
| AI Summaries | **HIGH** | Claude API well-documented; prompt engineering straightforward | Test with real wealth data to validate quality |
| Wealth Signal Scoring | **LOW** | No competitor transparency; requires domain expertise to build | Defer to post-MVP; interview luxury agents first |
| Property Cross-Ref | **MEDIUM** | ATTOM API documented; matching logic complexity unknown | Prototype with sample data to validate accuracy |
| Compliance (GDPR/CCPA) | **MEDIUM** | Standard SaaS requirements; wealth data = higher scrutiny | Legal review required before launch |
| User Workflows | **LOW** | Assumptions based on general real estate, not luxury-specific | User research with The W Team critical |

---

## Open Questions for User Research

Features require validation with The W Team before committing:

1. **Persona Definitions:** What specific UHNWI personas do luxury agents target? (founder exited, finance exec, inheritance, divorce, IPO, etc.)
2. **Enrichment Priorities:** Is phone > email? Or vice versa? What data points matter most?
3. **List Size Expectations:** Are they building lists of 50 or 500 contacts? (Affects export UX)
4. **Wealth Thresholds:** What net worth ranges matter? ($5M+, $10M+, $30M+?)
5. **Use Case Workflow:** Do they search → enrich → export daily? Or build master lists monthly?
6. **Integration Needs:** Do they want direct Salesforce/LionDesk integration? Or CSV is sufficient?
7. **Property Context Value:** How valuable is "recent $10M+ sales in target zip" vs raw contact data?

---

## Sources

### Competitor Feature Research
- [Reonomy 2026 Review](https://www.credaily.com/reviews/reonomy-review/)
- [Wealth-X Database Overview](https://altrata.com/products/wealth-x)
- [Apollo.io Full Review 2026](https://lagrowthmachine.com/apollo-io-review/)
- [ZoomInfo 2026: What is It Used For?](https://pipeline.zoominfo.com/sales/what-is-zoominfo)
- [PropertyShark 2026 Review](https://www.credaily.com/reviews/propertyshark-review/)
- [ATTOM Real Estate Data](https://www.attomdata.com/data/)

### Luxury Real Estate & UHNWI Insights
- [Luxury Presence $37M Raise for AI CRM](https://www.businesswire.com/news/home/20260108303360/en/)
- [UHNWI of 2025: More Complex, More Global](https://andsimple.co/insights/the-uhnwi-of-today/)
- [Real Estate Focus: Where UHNWIs Buy](https://luxurysociety.com/en/real-estate-focus-where-the-uhnwis-buy/)

### Lead Enrichment & AI Features
- [Top 12 Lead Enrichment Tools 2026](https://www.warmly.ai/p/blog/lead-enrichment-tools)
- [AI Lead Enrichment: 2026 Guide](https://www.default.com/post/ai-lead-enrichment)
- [Claude API vs ChatGPT API vs Gemini 2026](https://medium.com/@anyapi.ai/claude-api-vs-chatgpt-api-vs-gemini-api-which-ai-api-is-best-for-your-project-dbaf2feaee76)

### Real Estate Prospecting Best Practices
- [Real Estate Prospecting Tools](https://www.vulcan7.com/real-estate-prospecting/)
- [Top Real Estate Marketing Tools 2026](https://www.housingwire.com/articles/real-estate-marketing-tools/)
- [Real Estate Prospecting Anti-Patterns](https://www.discountpropertyinvestor.com/blog/5-real-estate-mistakes-to-avoid-in-2025-before-they-hurt-in-2026)

### Multi-Tenant SaaS Architecture
- [How to Develop Multi-Tenant Real Estate SaaS](https://www.biz4group.com/blog/develop-a-multi-tenant-real-state-saas-application)
- [Real Estate SaaS: Benefits, Types & Costs 2026](https://limeup.io/blog/real-estate-saas/)
- [Beyond the Hype: 8 SaaS Predictions for 2026](https://gtia.org/blog/beyond-the-hype-8-saas-predictions-for-2026)

### Implementation Complexity Research
- [Best Practices for Handling Large CSV Files](https://dromo.io/blog/best-practices-handling-large-csv-files)
- [10 Advanced CSV Import Features](https://www.oneschema.co/blog/advanced-csv-import-features)
- [Top Real Estate Mobile App Features 2026](https://realogixs.com/top-features-every-real-estate-mobile-app-must-have-in-2026)

---

## Appendix: Feature Categorization Methodology

**Table Stakes Criteria:**
- Present in 3+ competitors across different categories
- Users explicitly expect (based on industry reviews/documentation)
- Absence would cause product to feel broken or incomplete

**Differentiator Criteria:**
- Unique to 0-1 competitors, or uniquely implemented
- Directly addresses UHNWI/luxury real estate use case
- Provides competitive advantage (users would choose PGL because of this)

**Anti-Feature Criteria:**
- Common in adjacent markets but wrong for luxury segment
- Would dilute focus or confuse positioning
- Better served by integration/partnership than building in-house

This categorization is opinionated based on PGL's positioning as "luxury real estate prospecting" not "general real estate CRM" or "mass market lead gen."
