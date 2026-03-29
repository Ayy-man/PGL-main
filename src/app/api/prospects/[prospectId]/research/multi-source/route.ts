import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeResearch } from "@/lib/search/execute-research";
import { researchRateLimiter } from "@/lib/research/research-rate-limit";
import { ApiError, handleApiError } from "@/lib/api-error";

/**
 * POST /api/prospects/[prospectId]/research/multi-source
 *
 * Multi-source intent-routed research endpoint. Accepts { query: string } in
 * the request body, authenticates the user, fetches the prospect, delegates to
 * the multi-channel research pipeline via executeResearch, and returns a
 * ResearchResult with per-channel attribution.
 *
 * Unlike the Phase 25 streaming endpoint at /research, this returns a single
 * JSON payload that the UI can filter and display using the ChannelStatusBar,
 * ChannelFilterChips, and ResearchResultCard components.
 *
 * Returns:
 * - 200: ResearchResult { results, classification, channelStatuses, totalLatencyMs }
 * - 400: Missing or too-short query
 * - 401: Not authenticated
 * - 403: No tenant ID in session
 * - 404: Prospect not found
 * - 500: Internal server error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError("Not authenticated", "UNAUTHORIZED", 401);
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      throw new ApiError("No tenant ID found in session", "FORBIDDEN", 403);
    }

    // Parse and validate request body
    let query: string;
    try {
      const body = await request.json();
      query = body?.query ?? "";
    } catch {
      throw new ApiError(
        "Invalid request body — expected JSON with { query: string }",
        "VALIDATION_ERROR",
        400
      );
    }

    if (!query || query.trim().length < 2) {
      throw new ApiError(
        "Query must be at least 2 characters",
        "VALIDATION_ERROR",
        400
      );
    }

    // --- Rate limit ---
    const { success: rateLimitOk } = await researchRateLimiter.limit(
      `research:${tenantId}`
    );
    if (!rateLimitOk) {
      throw new ApiError(
        "Daily research limit reached. Resets at midnight UTC.",
        "RATE_LIMITED",
        429
      );
    }

    const { prospectId } = await params;

    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select(
        "id, full_name, title, company, location, publicly_traded_symbol, company_cik"
      )
      .eq("id", prospectId)
      .single();

    if (fetchError || !prospect) {
      throw new ApiError("Prospect not found", "NOT_FOUND", 404);
    }

    const result = await executeResearch({
      query: query.trim(),
      prospect: {
        id: prospect.id,
        full_name: prospect.full_name,
        company: prospect.company,
        title: prospect.title,
        publicly_traded_symbol: prospect.publicly_traded_symbol,
        company_cik: prospect.company_cik,
        location: prospect.location,
      },
      tenantId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return handleApiError(error);
    }

    console.error("[research/multi-source] Error:", error);
    return handleApiError(error);
  }
}
