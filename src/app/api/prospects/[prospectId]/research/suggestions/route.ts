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
  _request: NextRequest,
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

  const admin = createAdminClient();

  // --- Fetch prospect context ---
  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select(
      "first_name, last_name, full_name, title, company, intelligence_dossier"
    )
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return NextResponse.json(
      { error: "Prospect not found" },
      { status: 404 }
    );
  }

  // Build fallback suggestions using prospect data
  const fallback = [
    `Recent news about ${prospect.first_name ?? "this person"}`,
    `${prospect.company ?? "Company"} latest developments`,
    "Wealth signals and investments",
    "Board memberships and affiliations",
  ];

  // --- Generate via LLM ---
  try {
    const dossier = prospect.intelligence_dossier as
      | Record<string, unknown>
      | null;
    const dossierSummary =
      (dossier?.summary as string | undefined) ?? "No dossier available";

    const personLabel =
      prospect.full_name ??
      `${prospect.first_name ?? ""} ${prospect.last_name ?? ""}`.trim();
    const titleLabel = prospect.title ?? "Unknown title";
    const companyLabel = prospect.company ?? "Unknown company";

    const raw = await chatCompletion(
      "You generate research questions for a luxury real estate agent. Return EXACTLY 4 short questions (under 60 chars each) as a JSON array of strings. No markdown, no explanation.",
      `Prospect: ${personLabel}, ${titleLabel} at ${companyLabel}.\nDossier: ${dossierSummary}`,
      300
    );

    // Strip markdown fences if present
    const cleaned = raw.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const suggestions: string[] = JSON.parse(cleaned);

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ suggestions: fallback });
    }

    return NextResponse.json({
      suggestions: suggestions.slice(0, 4),
    });
  } catch (err) {
    console.error("[suggestions] LLM call or parse failed:", err);
    return NextResponse.json({ suggestions: fallback });
  }
}
