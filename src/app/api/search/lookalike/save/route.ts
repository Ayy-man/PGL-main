import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/search/lookalike/save
 *
 * Save a previously generated lookalike persona without re-running the search.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectId, persona } = body;

    if (!prospectId || !persona?.name) {
      return NextResponse.json(
        { error: "Invalid request - prospectId and persona required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant associated" },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    const { data: savedPersona, error: saveError } = await adminClient
      .from("personas")
      .insert({
        tenant_id: tenantId,
        name: persona.name,
        description: persona.reasoning || null,
        filters: {
          titles: persona.jobTitles,
          seniorities: persona.seniority?.split(", ") || [],
          industries: persona.industries,
          companySize: persona.companySize?.split(", ") || [],
          locations: persona.locations,
          keywords: persona.keywords?.join(" OR ") || "",
        },
        is_starter: false,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Failed to save persona:", saveError);
      return NextResponse.json(
        { error: "Failed to save persona" },
        { status: 500 }
      );
    }

    await logActivity({
      tenantId,
      userId: user.id,
      actionType: "persona_created",
      targetType: "persona",
      targetId: savedPersona.id,
      metadata: {
        personaName: persona.name,
        generatedFrom: prospectId,
      },
    });

    return NextResponse.json({ personaId: savedPersona.id });
  } catch (error) {
    console.error("Error saving lookalike persona:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
