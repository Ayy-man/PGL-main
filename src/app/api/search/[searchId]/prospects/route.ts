import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const url = new URL(request.url);
  const includeDismissed = url.searchParams.get("includeDismissed") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  // Validate ownership
  const { data: persona } = await supabase
    .from("personas")
    .select("id, last_refreshed_at, total_apollo_results")
    .eq("id", searchId)
    .eq("tenant_id", tenantId)
    .single();

  if (!persona) {
    return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
  }

  // Load prospects
  let query = supabase
    .from("saved_search_prospects")
    .select("*")
    .eq("saved_search_id", searchId);

  if (!includeDismissed) {
    query = query.in("status", ["active", "enriched"]);
  }

  query = query
    .order("is_new", { ascending: false })
    .order("last_seen_at", { ascending: false });

  const { data: prospects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For enriched rows, override the obfuscated Apollo preview data with real names/details
  // Apollo search returns anonymized names (e.g. "Si***a") — the enriched prospects table has the real data
  const enrichedProspectIds = (prospects ?? [])
    .filter(p => p.prospect_id)
    .map(p => p.prospect_id as string);

  const enrichedDataMap = new Map<string, { first_name: string; last_name: string; full_name: string; title: string | null; company: string | null; linkedin_url: string | null }>();

  if (enrichedProspectIds.length > 0) {
    const { data: enrichedProspects } = await supabase
      .from("prospects")
      .select("id, first_name, last_name, full_name, title, company, linkedin_url")
      .in("id", enrichedProspectIds);

    for (const ep of enrichedProspects ?? []) {
      enrichedDataMap.set(ep.id, ep);
    }
  }

  const mergedProspects = (prospects ?? []).map(p => {
    if (p.prospect_id && enrichedDataMap.has(p.prospect_id)) {
      const enriched = enrichedDataMap.get(p.prospect_id)!;
      const apolloData = (p.apollo_data ?? {}) as Record<string, unknown>;
      return {
        ...p,
        apollo_data: {
          ...apolloData,
          first_name: enriched.first_name,
          last_name: enriched.last_name,
          name: enriched.full_name,
          ...(enriched.title && { title: enriched.title }),
          ...(enriched.company && { organization_name: enriched.company }),
          ...(enriched.linkedin_url && { linkedin_url: enriched.linkedin_url }),
        },
      };
    }
    return p;
  });

  // Count dismissed (always, for the toggle label)
  const { count: dismissedCount } = await supabase
    .from("saved_search_prospects")
    .select("*", { count: "exact", head: true })
    .eq("saved_search_id", searchId)
    .eq("status", "dismissed");

  return NextResponse.json({
    prospects: mergedProspects,
    dismissedCount: dismissedCount ?? 0,
    lastRefreshedAt: persona.last_refreshed_at,
    totalApolloResults: persona.total_apollo_results,
  });
}
