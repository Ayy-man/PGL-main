import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion } from "@/lib/ai/openrouter";

/**
 * POST /api/prospects/[prospectId]/research/suggestions
 *
 * Generates 4 contextual research suggestion pills for the empty-session state.
 * Uses a fast Claude call with prospect name + title + company + existing dossier.
 * Falls back to 4 generic suggestions if the LLM call fails or parsing fails.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  const { prospectId } = await params;

  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  // Parse optional body params
  let count = 4;
  let exclude: string[] = [];
  try {
    const body = await request.json();
    if (body?.count && typeof body.count === "number") count = Math.min(body.count, 6);
    if (Array.isArray(body?.exclude)) exclude = body.exclude;
  } catch {
    // No body or invalid JSON — use defaults
  }

  const admin = createAdminClient();

  // --- Fetch prospect context ---
  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select(
      "first_name, last_name, full_name, title, company, location, publicly_traded_symbol, intelligence_dossier, web_data, insider_data"
    )
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return NextResponse.json(
      { error: "Prospect not found" },
      { status: 404 }
    );
  }

  const personLabel =
    prospect.full_name ??
    `${prospect.first_name ?? ""} ${prospect.last_name ?? ""}`.trim();
  const titleLabel = prospect.title ?? "";
  const companyLabel = prospect.company ?? "";
  const locationLabel = prospect.location ?? "";
  const ticker = prospect.publicly_traded_symbol ?? "";

  // Build fallback suggestions using prospect data
  const fallbackPool = [
    `${personLabel} net worth and assets`,
    companyLabel ? `${companyLabel} latest news` : `${personLabel} recent news`,
    ticker ? `${ticker} stock performance and insider activity` : `${personLabel} investments`,
    `${personLabel} board positions and affiliations`,
    companyLabel ? `${companyLabel} funding rounds` : `${personLabel} career history`,
    `${personLabel} real estate and property holdings`,
  ].filter((s) => !exclude.some((ex) => s.toLowerCase().includes(ex.toLowerCase())));

  // --- Generate via LLM ---
  try {
    const dossier = prospect.intelligence_dossier as Record<string, unknown> | null;
    const dossierSummary = (dossier?.summary as string | undefined) ?? "";

    // Build rich context from all available data
    const contextParts = [`Person: ${personLabel}`];
    if (titleLabel) contextParts.push(`Title: ${titleLabel}`);
    if (companyLabel) contextParts.push(`Company: ${companyLabel}`);
    if (locationLabel) contextParts.push(`Location: ${locationLabel}`);
    if (ticker) contextParts.push(`Public ticker: ${ticker}`);
    if (dossierSummary) contextParts.push(`Intel summary: ${dossierSummary}`);

    const excludeClause = exclude.length > 0
      ? `\n\nDo NOT generate queries similar to these (already used): ${JSON.stringify(exclude)}`
      : "";

    const raw = await chatCompletion(
      `You generate web research queries about a specific person for a wealth intelligence platform.

Return EXACTLY ${count} short search queries (under 55 chars each) as a JSON array of strings. These are things you'd type into Google/Exa to learn about this person. They must be in the THIRD PERSON — researching someone, not asking them questions.

Good patterns:
- "[Name] net worth [year]"
- "[Company] funding valuation"
- "[Name] board memberships"
- "[Company] SEC filings"
- "[Name] philanthropy donations"
- "[Name] real estate property"
- "[Name] [Company] executive compensation"
- "[Name] interview keynote"

NEVER generate 2nd-person questions like "What inspires you?" or "How do you envision...?" — those are useless for web search.

Return ONLY a JSON array. No markdown fences, no explanation.${excludeClause}`,
      contextParts.join("\n"),
      200
    );

    // Strip markdown fences if present
    const cleaned = raw.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const suggestions: string[] = JSON.parse(cleaned);

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return NextResponse.json({ suggestions: fallbackPool.slice(0, count) });
    }

    return NextResponse.json({
      suggestions: suggestions.slice(0, count),
    });
  } catch (err) {
    console.error("[suggestions] LLM call or parse failed:", err);
    return NextResponse.json({ suggestions: fallbackPool.slice(0, count) });
  }
}
