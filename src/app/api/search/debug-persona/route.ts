import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/debug-persona?id={uuid}
 *
 * Temporary debug endpoint — shows raw persona filters from DB
 * and what Apollo params they translate to. Remove after debugging.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const personaId = request.nextUrl.searchParams.get("id");

  if (personaId) {
    // Show one persona's raw data
    const { data, error } = await supabase
      .from("personas")
      .select("id, name, filters")
      .eq("id", personaId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Persona not found", details: error }, { status: 404 });
    }

    return NextResponse.json({
      persona: data,
      filters_analysis: analyzeFilters(data.filters),
    });
  }

  // Show all personas for tenant
  const { data, error } = await supabase
    .from("personas")
    .select("id, name, filters")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    personas: data?.map((p) => ({
      id: p.id,
      name: p.name,
      filters: p.filters,
      issues: analyzeFilters(p.filters),
    })),
  });
}

function analyzeFilters(filters: Record<string, unknown>) {
  const issues: string[] = [];

  if (filters.companySize && Array.isArray(filters.companySize)) {
    const cs = filters.companySize as string[];
    const allPureNumbers = cs.every((s: string) => /^\d+$/.test(s));
    if (allPureNumbers) {
      issues.push(`companySize is broken — individual numbers: [${cs.join(", ")}]. Should be comma-paired like "51,200"`);
    }
    cs.forEach((s: string) => {
      if (s.includes("-") && !s.includes(",")) {
        issues.push(`companySize "${s}" uses dash format — should be "${s.replace("-", ",")}"`);
      }
    });
  }

  if (!filters.titles && !filters.seniorities && !filters.industries && !filters.locations && !filters.companySize && !filters.keywords) {
    issues.push("No filters set at all — search will be too broad or empty");
  }

  if (issues.length === 0) issues.push("OK — no obvious issues");

  return issues;
}
