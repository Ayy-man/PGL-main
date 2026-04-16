import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/openrouter";
import { parseQueryRateLimiter } from "@/lib/rate-limit/limiters";

export const maxDuration = 30;

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a search query parser for a lead generation platform. Convert natural language queries into structured Apollo.io search filters.

Return ONLY valid JSON with this structure (omit fields that aren't mentioned in the query):
{
  "person_name": "a specific person's name if the query is searching for a particular individual (e.g. 'Andrew Kantor', 'Elon Musk')",
  "organization_names": ["array of specific company names mentioned, e.g. 'Jane Street', 'Goldman Sachs'"],
  "titles": ["array of job titles"],
  "seniorities": ["from ONLY: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern"],
  "industries": ["use ONLY these Apollo industry names: Financial Services, Banking, Insurance, Investment Management, Private Equity, Venture Capital, Real Estate, Technology, Software, Information Technology, Healthcare, Pharmaceuticals, Biotechnology, Manufacturing, Retail, E-Commerce, Telecommunications, Energy, Oil & Gas, Mining, Construction, Automotive, Aerospace & Defense, Media & Entertainment, Hospitality, Legal Services, Consulting, Education, Government, Nonprofit, Transportation & Logistics, Computer Software, Internet, Hospital & Health Care, Marketing & Advertising, Accounting, Human Resources, Staffing & Recruiting, Food & Beverages, Consumer Goods, Mechanical or Industrial Engineering, Civil Engineering, Electrical & Electronic Manufacturing, Chemicals, Textiles, Plastics, Environmental Services, Utilities, Renewables & Environment, Warehousing, Aviation & Aerospace, Defense & Space, Luxury Goods & Jewelry, Sporting Goods, Wine & Spirits, Farming, Fishery, Dairy, Tobacco, Packaging & Containers, Glass, Ceramics & Concrete, Paper & Forest Products, Printing, Publishing, Writing & Editing, Libraries, Museums & Institutions, Fine Art, Performing Arts, Recreational Facilities & Services, Gambling & Casinos, Leisure, Travel & Tourism, Airlines & Aviation, Maritime, Railroad Manufacture, Shipbuilding, Military, Judiciary, Legislative Office, Political Organization, Public Policy, Public Safety, International Affairs, Think Tanks, Philanthropy, Civic & Social Organization, Religious Institutions, Research, Veterinary, Security & Investigations, Law Enforcement, Capital Markets, Investment Banking, Fund-Raising, Program Development, Events Services, Design, Graphic Design, Architecture & Planning, Industrial Design, Animation, Apparel & Fashion, Cosmetics, Furniture, Health, Wellness & Fitness, Sports, Music, Broadcast Media, Motion Pictures & Film, Photography, Semiconductors, Nanotechnology, Computer Networking, Computer Hardware, Information Services, Computer Games, Online Media, Computer & Network Security, Wireless, Consumer Electronics"],
  "locations": ["array of locations — city, state, or country"],
  "companySize": ["from ONLY: 1,10 | 11,20 | 21,50 | 51,100 | 101,200 | 201,500 | 501,1000 | 1001,2000 | 2001,5000 | 5001,10000 | 10001,"],
  "keywords": "remaining search terms as a single string"
}

Rules:
- If the query is primarily a person's name (e.g. "Andrew Kantor", "find Elon Musk", "John Smith at Goldman"), extract the name into person_name. A person name can be combined with organization_names (e.g. "John Smith at Goldman Sachs" → person_name: "John Smith", organization_names: ["Goldman Sachs"]).
- If the user mentions specific companies by name, extract them into organization_names. Don't put company names into keywords — use organization_names instead.
- Map natural language to the EXACT Apollo enum values listed above
- "C-level", "C-suite", "executive" → seniority "c_suite"
- "VP", "vice president" → seniority "vp"
- "senior leadership" → seniorities ["c_suite", "vp", "director"]
- "startup" → companySize ["1,10", "11,20"]
- "enterprise", "large company" → companySize ["1001,2000", "2001,5000", "5001,10000", "10001,"]
- "mid-size", "mid-market" → companySize ["201,500", "501,1000"]
- Industry mapping examples: "biotech" → "Biotechnology", "tech" → "Technology", "fintech" → "Financial Services", "pharma" → "Pharmaceuticals", "SaaS" → "Computer Software", "AI" → "Information Technology", "crypto" → "Financial Services", "health" → "Healthcare", "law" → "Legal Services", "ad tech" → "Marketing & Advertising"
- NEVER use informal/abbreviated industry names — always use the exact name from the list
- Only include fields the user actually mentioned or implied
- If the query is very short or vague, put it in "keywords" and leave other fields empty

CRITICAL — WEALTH / NET-WORTH PHRASES ARE NOT APOLLO-SEARCHABLE:
Apollo does NOT expose net worth, wealth, or income as filterable fields. These are enrichment-time signals (computed AFTER search from SEC filings, property records, web presence). If you put wealth phrases into "keywords", Apollo searches job titles and company descriptions for the literal text (e.g. "worth $5M+") and returns ZERO matches. Examples of phrases to DROP ENTIRELY — do NOT put them in keywords, do NOT put them in any field:
- "worth $5M+", "worth over $10M", "net worth $X", "$5M+ net worth"
- "HNW", "UHNW", "high-net-worth", "ultra-high-net-worth"
- "wealthy", "rich", "affluent", "millionaire", "billionaire"
- "high-income", "top 1%", "top earners"

Rule: strip all such phrases and return only the remaining searchable structure (title, industry, location, seniority, company size). The platform enriches wealth signals automatically post-search — users get wealth data without having to put it in the search.

CRITICAL — FUNDING STAGE / BUSINESS EVENT PHRASES ARE NOT APOLLO-SEARCHABLE:
Apollo does NOT filter by funding round, exit status, acquisition, or any time-bounded business event. Nobody's LinkedIn title contains the literal text "series B fundraising" or "IPO" — so putting these in keywords returns ZERO matches. Drop them ENTIRELY. Examples to DROP:
- "raising series A/B/C/D", "just raised", "recently funded", "post-Series X"
- "pre-IPO", "IPO experience", "going public", "newly public"
- "acquired by X", "post-acquisition", "recently exited", "exited founders"
- "profitable", "cash-flow positive", "pre-revenue", "bootstrapped"

These are signals a user should discover AFTER enrichment (Exa web search surfaces news, SEC filings surface IPO status). Do NOT try to search for them.

CRITICAL — BE CONSERVATIVE. When in doubt, LEAVE FIELDS EMPTY rather than guess.
- Do NOT infer companySize from words like "startup" or "founders" — only set it when the user EXPLICITLY says a size ("100+ employees", "small company", "enterprise"). Empty companySize returns more (better) results than a narrow range.
- Do NOT pack extra noise into "keywords". Use keywords only for genuine free-text modifiers the user typed (specific product, specific skill, specific language). If nothing clearly belongs, omit keywords entirely.
- Do NOT invent titles beyond 2-4 close variants. Too many titles narrow results.
- Fewer well-chosen filters beats many aggressive ones.

Examples:

User: "tech founders in SF raising series B"
Output: {"titles":["Founder","Co-Founder","CEO"],"seniorities":["founder","c_suite"],"industries":["Technology","Computer Software"],"locations":["San Francisco, California"]}
(the "raising series B" phrase is dropped; NO companySize — "founders" alone doesn't imply size; NO keywords — "series B" is not a searchable person attribute)

User: "tech founders in Miami worth $5M+"
Output: {"titles":["Founder","Co-Founder","CEO"],"seniorities":["founder","c_suite"],"industries":["Technology","Computer Software"],"locations":["Miami, Florida"]}
(the "worth $5M+" phrase is dropped entirely — do not add to keywords)

User: "UHNW real estate investors in NYC"
Output: {"titles":["Investor","Managing Partner","Principal"],"industries":["Real Estate","Private Equity"],"locations":["New York"]}
(the "UHNW" phrase is dropped)

User: "managing directors at bulge bracket banks in New York"
Output: {"titles":["Managing Director","Executive Director","Senior Managing Director"],"seniorities":["c_suite","vp","director"],"industries":["Investment Banking","Capital Markets","Financial Services"],"locations":["New York"]}

User: "C-suite biotech executives in Boston with IPO experience"
Output: {"titles":["CEO","CFO","COO","CTO"],"seniorities":["c_suite"],"industries":["Biotechnology","Pharmaceuticals"],"locations":["Boston, Massachusetts"]}
(the "with IPO experience" phrase is dropped — IPO status is not Apollo-searchable)

User: "VP of sales at SaaS companies with 500+ employees"
Output: {"titles":["VP of Sales","Vice President of Sales","Head of Sales"],"seniorities":["vp","director"],"industries":["Computer Software","Internet"],"companySize":["501,1000","1001,2000","2001,5000","5001,10000","10001,"]}
(companySize set because user EXPLICITLY said "500+ employees")

User: "Andrew Kantor"
Output: {"person_name":"Andrew Kantor"}

User: "find John Smith at Goldman Sachs"
Output: {"person_name":"John Smith","organization_names":["Goldman Sachs"]}

User: "employees at Tesla"
Output: {"organization_names":["Tesla"]}

User: "Elon Musk"
Output: {"person_name":"Elon Musk"}`;

const VALID_SENIORITIES = new Set([
  "owner", "founder", "c_suite", "partner", "vp", "head",
  "director", "manager", "senior", "entry", "intern",
]);

const VALID_INDUSTRIES = new Set([
  "Financial Services", "Banking", "Insurance", "Investment Management",
  "Private Equity", "Venture Capital", "Real Estate", "Technology",
  "Software", "Information Technology", "Healthcare", "Pharmaceuticals",
  "Biotechnology", "Manufacturing", "Retail", "E-Commerce",
  "Telecommunications", "Energy", "Oil & Gas", "Mining", "Construction",
  "Automotive", "Aerospace & Defense", "Media & Entertainment",
  "Hospitality", "Legal Services", "Consulting", "Education",
  "Government", "Nonprofit", "Transportation & Logistics",
  "Computer Software", "Internet", "Hospital & Health Care",
  "Marketing & Advertising", "Accounting", "Human Resources",
  "Staffing & Recruiting", "Food & Beverages", "Consumer Goods",
  "Mechanical or Industrial Engineering", "Civil Engineering",
  "Electrical & Electronic Manufacturing", "Chemicals", "Textiles",
  "Plastics", "Environmental Services", "Utilities",
  "Renewables & Environment", "Warehousing", "Aviation & Aerospace",
  "Defense & Space", "Luxury Goods & Jewelry", "Sporting Goods",
  "Wine & Spirits", "Farming", "Fishery", "Dairy", "Tobacco",
  "Packaging & Containers", "Glass, Ceramics & Concrete",
  "Paper & Forest Products", "Printing", "Publishing",
  "Writing & Editing", "Libraries", "Museums & Institutions",
  "Fine Art", "Performing Arts", "Recreational Facilities & Services",
  "Gambling & Casinos", "Leisure, Travel & Tourism",
  "Airlines & Aviation", "Maritime", "Railroad Manufacture",
  "Shipbuilding", "Military", "Judiciary", "Legislative Office",
  "Political Organization", "Public Policy", "Public Safety",
  "International Affairs", "Think Tanks", "Philanthropy",
  "Civic & Social Organization", "Religious Institutions", "Research",
  "Veterinary", "Security & Investigations", "Law Enforcement",
  "Capital Markets", "Investment Banking", "Fund-Raising",
  "Program Development", "Events Services", "Design", "Graphic Design",
  "Architecture & Planning", "Industrial Design", "Animation",
  "Apparel & Fashion", "Cosmetics", "Furniture",
  "Health, Wellness & Fitness", "Sports", "Music", "Broadcast Media",
  "Motion Pictures & Film", "Photography", "Semiconductors",
  "Nanotechnology", "Computer Networking", "Computer Hardware",
  "Information Services", "Computer Games", "Online Media",
  "Computer & Network Security", "Wireless", "Consumer Electronics",
]);

const VALID_COMPANY_SIZES = new Set([
  "1,10", "11,20", "21,50", "51,100", "101,200",
  "201,500", "501,1000", "1001,2000", "2001,5000",
  "5001,10000", "10001,",
]);

/**
 * POST /api/search/parse-query
 *
 * Takes natural language text and returns structured PersonaFilters
 * using AI to extract intent.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  let query = "";

  try {
    const body = await request.json();
    query = body.query;

    console.info("[parse-query] ── Received ──", { query, wordCount: query?.trim().split(/\s+/).length });

    if (query && query.length > 1000) {
      console.warn("[parse-query] Query too long:", query.length);
      return NextResponse.json(
        { error: "Query too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      console.warn("[parse-query] Empty query, returning 400");
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[parse-query] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.info("[parse-query] User:", user.email);

    // Rate limit by tenant — 20 requests per minute (H4: prevent cost amplification)
    const tenantId = user.app_metadata?.tenant_id;
    if (tenantId) {
      const { success, reset } = await parseQueryRateLimiter.limit(`tenant:${tenantId}`);
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        console.warn("[parse-query] Rate limited tenant:", tenantId);
        return NextResponse.json(
          { error: "Too many parse requests. Try again shortly." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
    }

    // Single-word queries — check if it looks like a name (capitalized) or just a keyword
    const wordCount = query.trim().split(/\s+/).length;
    const trimmed = query.trim();
    const looksLikeName = wordCount === 1 && /^[A-Z][a-z]+$/.test(trimmed);
    if (wordCount <= 1 && !looksLikeName) {
      console.info(`[parse-query] Single-word query, skipping LLM -> keywords only (${Date.now() - start}ms)`);
      return NextResponse.json({
        filters: { keywords: trimmed },
        parsed: false,
      });
    }

    // Call AI to parse NL → structured filters
    console.info("[parse-query] Calling OpenRouter for NL parsing...");
    const llmStart = Date.now();

    const response = await chatCompletion(SYSTEM_PROMPT, query.trim(), 1000);

    const llmMs = Date.now() - llmStart;
    console.info(`[parse-query] AI response received (${llmMs}ms)`, {
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.text.trim();
    console.info("[parse-query] Raw LLM output:", jsonStr);

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const filters = JSON.parse(jsonStr);

    // Validate seniorities against Apollo enum (M12: strip invalid values)
    if (Array.isArray(filters.seniorities)) {
      const original = filters.seniorities.length;
      filters.seniorities = filters.seniorities.filter((s: string) => VALID_SENIORITIES.has(s));
      if (filters.seniorities.length === 0) delete filters.seniorities;
      if (filters.seniorities?.length !== original) {
        console.warn("[parse-query] Filtered invalid seniorities:", original - (filters.seniorities?.length ?? 0));
      }
    }
    // Validate industries against Apollo enum (M12: strip invalid values)
    if (Array.isArray(filters.industries)) {
      const original = filters.industries.length;
      filters.industries = filters.industries.filter((s: string) => VALID_INDUSTRIES.has(s));
      if (filters.industries.length === 0) delete filters.industries;
      if (filters.industries?.length !== original) {
        console.warn("[parse-query] Filtered invalid industries:", original - (filters.industries?.length ?? 0));
      }
    }
    // Validate companySize against Apollo enum (D-07: was unchecked before)
    if (Array.isArray(filters.companySize)) {
      const original = filters.companySize.length;
      filters.companySize = filters.companySize.filter((s: string) => VALID_COMPANY_SIZES.has(s));
      if (filters.companySize.length === 0) delete filters.companySize;
      if (filters.companySize?.length !== original) {
        console.warn("[parse-query] Filtered invalid companySize:", original - (filters.companySize?.length ?? 0));
      }
    }

    const totalMs = Date.now() - start;

    console.info(`[parse-query] ── Parse complete (${totalMs}ms, LLM: ${llmMs}ms) ──`, {
      query,
      filters,
      fieldCount: Object.keys(filters).length,
    });

    return NextResponse.json({ filters, parsed: true });
  } catch (error) {
    const totalMs = Date.now() - start;
    console.error(`[parse-query] ── Failed (${totalMs}ms) ──`, {
      query,
      error: error instanceof Error ? error.message : error,
    });

    // Fallback: return raw query as keywords
    return NextResponse.json({
      filters: { keywords: query?.trim() ?? "" },
      parsed: false,
    });
  }
}
