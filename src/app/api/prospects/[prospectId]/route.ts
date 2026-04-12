import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/api-error";

/**
 * GET /api/prospects/[prospectId]
 *
 * Returns enriched prospect data for the quick-view panel.
 * Selects only the fields needed by the slide-over — not the full row.
 *
 * Access: Authenticated users (RLS enforces tenant scoping)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { prospectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { data: prospect, error } = await supabase
      .from("prospects")
      .select(
        `
        id,
        full_name,
        first_name,
        last_name,
        title,
        company,
        location,
        work_email,
        personal_email,
        work_phone,
        personal_phone,
        linkedin_url,
        enrichment_status,
        enriched_at,
        contact_data,
        intelligence_dossier,
        manual_wealth_tier
      `
      )
      .eq("id", prospectId)
      .single();

    if (error || !prospect) {
      throw new ApiError("Prospect not found", "NOT_FOUND", 404);
    }

    return NextResponse.json(prospect);
  } catch (err) {
    return handleApiError(err);
  }
}
