import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLookalikePersona } from "@/lib/enrichment/lookalike";
import type { ApolloFilters } from "@/lib/enrichment/lookalike";
import { searchApollo } from "@/lib/apollo/client";
import { logActivity } from "@/lib/activity-logger";
import type { PersonaFilters } from "@/lib/personas/types";

export const dynamic = "force-dynamic";

/**
 * Maps ApolloFilters from lookalike persona generation to PersonaFilters
 * expected by the rate-limited Apollo client.
 */
function mapApolloFiltersToPersonaFilters(
  filters: ApolloFilters
): PersonaFilters {
  return {
    titles: filters.person_titles,
    seniorities: filters.person_seniorities,
    industries: filters.organization_industry_tag_ids,
    locations: filters.person_locations,
    companySize: filters.organization_num_employees_ranges,
    keywords: filters.q_keywords,
  };
}

/**
 * POST /api/search/lookalike
 *
 * Generate a lookalike persona from a prospect and search Apollo for similar people.
 *
 * Request body:
 * - prospectId: UUID of the prospect to analyze
 * - savePersona: boolean (optional) - Save generated persona for reuse
 *
 * Returns:
 * - 200: { persona, apolloFilters, searchResults, totalResults, savedPersonaId? }
 * - 400: Invalid request
 * - 401: Unauthorized (no session)
 * - 403: No tenant associated
 * - 404: Prospect not found
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { prospectId, savePersona } = body;

    if (!prospectId || typeof prospectId !== "string") {
      return NextResponse.json(
        { error: "Invalid request - prospectId required" },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract tenant ID from app_metadata
    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant associated" },
        { status: 403 }
      );
    }

    // 3. Fetch prospect data from database
    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select(
        `
        id,
        first_name,
        last_name,
        full_name,
        title,
        company,
        linkedin_url,
        contact_data,
        web_data,
        insider_data,
        ai_summary
      `
      )
      .eq("id", prospectId)
      .eq("tenant_id", tenantId)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // 4. Generate lookalike persona
    const prospectData = {
      name: prospect.full_name,
      title: prospect.title,
      company: prospect.company,
      linkedin: prospect.linkedin_url,
      webData: prospect.web_data as Record<string, unknown> | null,
      insiderData: prospect.insider_data as Record<string, unknown> | null,
      ai_summary: prospect.ai_summary,
    };

    const { persona, apolloFilters } = await generateLookalikePersona(prospectData);

    // 5. Search Apollo for similar people (via rate-limited, cached client)
    const personaFilters = mapApolloFiltersToPersonaFilters(apolloFilters);
    const apolloResults = await searchApollo(
      tenantId,
      prospectId, // Use prospectId as persona identifier for caching
      personaFilters,
      1,  // page
      25  // pageSize
    );

    // 6. Save persona if requested
    let savedPersonaId: string | undefined;
    if (savePersona) {
      const adminClient = createAdminClient();

      const { data: savedPersona, error: saveError } = await adminClient
        .from("personas")
        .insert({
          tenant_id: tenantId,
          name: persona.name,
          description: persona.reasoning,
          filters: apolloFilters,
          is_starter: false,
          is_generated: true,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (!saveError && savedPersona) {
        savedPersonaId = savedPersona.id;

        // Log persona creation activity
        await logActivity({
          tenantId,
          userId: user.id,
          actionType: "persona_created",
          targetType: "persona",
          targetId: savedPersonaId,
          metadata: {
            personaName: persona.name,
            generatedFrom: prospectId,
          },
        });
      } else {
        console.error("Failed to save persona:", saveError);
      }
    }

    // 7. Log lookalike search activity
    await logActivity({
      tenantId,
      userId: user.id,
      actionType: "lookalike_search",
      targetType: "prospect",
      targetId: prospectId,
      metadata: {
        generatedPersonaName: persona.name,
        resultCount: apolloResults.people?.length ?? 0,
        saved: !!savedPersonaId,
      },
    });

    // 8. Return results
    return NextResponse.json(
      {
        persona: {
          name: persona.name,
          jobTitles: persona.jobTitles,
          seniority: persona.seniority,
          industries: persona.industries,
          companySize: persona.companySize,
          locations: persona.locations,
          keywords: persona.keywords,
          reasoning: persona.reasoning,
        },
        apolloFilters,
        searchResults: apolloResults.people,
        totalResults: apolloResults.pagination.totalResults,
        savedPersonaId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in lookalike search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
